package com.autohublanka.sales;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.MovementType;
import com.autohublanka.inventory.StockService;
import com.autohublanka.marketing.Coupon;
import com.autohublanka.marketing.CouponService;
import com.autohublanka.marketing.Discount;
import com.autohublanka.marketing.PricingService;
import com.autohublanka.marketing.price.BasePrice;
import com.autohublanka.marketing.price.CouponDecorator;
import com.autohublanka.marketing.price.Price;
import com.autohublanka.notification.NotificationService;
import com.autohublanka.sales.dto.CheckoutRequest;
import com.autohublanka.sales.dto.OrderLineRequest;
import com.autohublanka.sales.dto.OrderResponse;
import com.autohublanka.sales.dto.OrderStatusRequest;
import com.autohublanka.sales.dto.OrderUpdateRequest;
import com.autohublanka.sales.dto.StaffOrderRequest;
import com.autohublanka.sales.payment.PaymentDetails;
import com.autohublanka.sales.payment.PaymentProcessor;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.settings.SettingsService;
import com.autohublanka.support.FeedbackRepository;
import com.autohublanka.support.ReviewRepository;
import com.autohublanka.support.RmaRepository;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final BankSlipRepository bankSlipRepository;
    private final InvoiceRepository invoiceRepository;
    private final SparePartRepository sparePartRepository;
    private final CartService cartService;
    private final StockService stockService;
    private final PricingService pricingService;
    private final CouponService couponService;
    private final ReviewRepository reviewRepository;
    private final FeedbackRepository feedbackRepository;
    private final RmaRepository rmaRepository;
    private final CurrentUser currentUser;
    private final UserRepository userRepository;
    private final PaymentProcessor paymentProcessor;
    private final SettingsService settingsService;
    private final NotificationService notifications;

    public OrderService(OrderRepository orderRepository,
                        PaymentRepository paymentRepository,
                        BankSlipRepository bankSlipRepository,
                        InvoiceRepository invoiceRepository,
                        SparePartRepository sparePartRepository,
                        CartService cartService,
                        StockService stockService,
                        PricingService pricingService,
                        CouponService couponService,
                        ReviewRepository reviewRepository,
                        FeedbackRepository feedbackRepository,
                        RmaRepository rmaRepository,
                        CurrentUser currentUser,
                        UserRepository userRepository,
                        PaymentProcessor paymentProcessor,
                        SettingsService settingsService,
                        NotificationService notifications) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.bankSlipRepository = bankSlipRepository;
        this.invoiceRepository = invoiceRepository;
        this.sparePartRepository = sparePartRepository;
        this.cartService = cartService;
        this.stockService = stockService;
        this.pricingService = pricingService;
        this.couponService = couponService;
        this.reviewRepository = reviewRepository;
        this.feedbackRepository = feedbackRepository;
        this.rmaRepository = rmaRepository;
        this.currentUser = currentUser;
        this.userRepository = userRepository;
        this.paymentProcessor = paymentProcessor;
        this.settingsService = settingsService;
        this.notifications = notifications;
    }

    // ---------------------------------------------------------------- read

    @Transactional(readOnly = true)
    public List<OrderResponse> findAll() {
        return orderRepository.findAllForList().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> findMine() {
        return orderRepository.findByCustomerIdOrderByCreatedAtDesc(currentUser.get().getId()).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse findById(Long id) {
        return toResponse(getAccessibleOrder(id));
    }

    // ---------------------------------------------------------------- create

    /**
     * Customer checkout: Buy now (sparePartId + quantity) or the whole cart (no sparePartId).
     * Everything runs in one transaction: a failure leaves stock, coupon and cart untouched.
     */
    public OrderResponse checkout(CheckoutRequest request) {
        User customer = currentUser.get();

        Map<SparePart, Integer> lines = new LinkedHashMap<>();
        Cart cart = null;
        if (request.sparePartId() != null) {
            if (request.quantity() == null) {
                throw new BusinessException("Quantity is required for Buy Now");
            }
            lines.put(findPart(request.sparePartId()), request.quantity());
        } else {
            cart = cartService.myCart();
            if (cart.getItems().isEmpty()) {
                throw new BusinessException("Your cart is empty");
            }
            for (CartItem cartItem : cart.getItems()) {
                lines.put(cartItem.getSparePart(), cartItem.getQuantity());
            }
        }

        Order order = placeOrder(customer, lines, request.deliveryAddress(), request.contactPhone(),
                request.couponCode(), request.note(), request.paymentMethod(), null);

        // phone and address are asked at checkout (not at registration) - keep them for next time if wanted
        if (request.saveDetails() == null || request.saveDetails()) {
            customer.setPhone(request.contactPhone().trim());
            customer.setAddress(request.deliveryAddress().trim());
        }
        if (cart != null) {
            cart.getItems().clear();
        }
        return toResponse(order);
    }

    /** Sales staff place an order for a registered customer (phone / walk-in order). */
    public OrderResponse createForCustomer(StaffOrderRequest request) {
        User customer = userRepository.findById(request.customerId())
                .filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> NotFoundException.of("Customer", request.customerId()));
        if (!customer.isActive()) {
            throw new BusinessException(customer.getFullName() + "'s account is deactivated");
        }

        Map<SparePart, Integer> lines = new LinkedHashMap<>();
        for (OrderLineRequest line : request.items()) {
            SparePart part = findPart(line.sparePartId());
            if (lines.containsKey(part)) {
                throw new BusinessException("'" + part.getName() + "' is added twice - combine the quantities");
            }
            lines.put(part, line.quantity());
        }

        Order order = placeOrder(customer, lines, request.deliveryAddress(), request.contactPhone(),
                request.couponCode(), request.note(), request.paymentMethod(), currentUser.get());
        if (customer.getPhone() == null) {
            customer.setPhone(request.contactPhone().trim());
        }
        if (customer.getAddress() == null) {
            customer.setAddress(request.deliveryAddress().trim());
        }
        return toResponse(order);
    }

    /**
     * The one place where orders are made (customer checkout and staff orders share it):
     * prices with today's discounts, coupon, stock deduction, PENDING payment, sales staff notified.
     */
    private Order placeOrder(User customer, Map<SparePart, Integer> lines, String address, String phone,
                             String couponCode, String note, PaymentMethod method, User placedBy) {
        Map<Long, Discount> discounts = pricingService.runningDiscounts();

        Order order = new Order();
        order.setCustomer(customer);
        order.setPlacedBy(placedBy);
        order.setDeliveryAddress(address.trim());
        order.setContactPhone(phone.trim());
        order.setNote(Text.clean(note));
        lines.forEach((part, quantity) -> order.addItem(newLine(part, quantity, discounts.get(part.getId()))));

        BigDecimal subtotal = order.getItems().stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discount = BigDecimal.ZERO;

        if (Text.clean(couponCode) != null) {
            Coupon coupon = couponService.findUsable(couponCode, subtotal);
            // DECORATOR: order subtotal wrapped with the coupon
            discount = new CouponDecorator(new BasePrice(subtotal, "Order subtotal"), coupon).getSaving();
            order.setCouponCode(coupon.getCode());
            couponService.markUsed(coupon);
        }

        order.setSubtotal(subtotal);
        order.setDiscountAmount(discount);
        order.setTotalAmount(subtotal.subtract(discount));
        orderRepository.save(order);

        for (OrderItem item : order.getItems()) {
            stockService.recordSystemMovement(item.getSparePart(), MovementType.SALE, item.getQuantity(),
                    "ORDER-" + order.getId(), "Sold to " + customer.getFullName());
        }
        paymentProcessor.open(order, method);
        notifications.orderPlaced(order, placedBy == null ? customer : placedBy);
        return order;
    }

    private SparePart findPart(Long id) {
        return sparePartRepository.findById(id).orElseThrow(() -> NotFoundException.of("Spare part", id));
    }

    private OrderItem newLine(SparePart part, int quantity, Discount discount) {
        CartService.checkSellable(part);
        int max = settingsService.current().maxQuantityPerItem();
        if (quantity > max) {
            throw new BusinessException("You can order at most " + max + " of one item ('" + part.getName() + "')");
        }
        int available = stockService.availableQuantity(part.getId());
        if (quantity > available) {
            throw new BusinessException("Only " + available + " unit(s) of '" + part.getName() + "' are in stock");
        }
        OrderItem item = new OrderItem();
        item.setSparePart(part);
        item.setQuantity(quantity);
        item.setListPrice(part.getPrice());
        item.setUnitPrice(Price.forPart(part, discount).getAmount()); // DECORATOR: base price + running discount
        return item;
    }

    // ---------------------------------------------------------------- update

    /** Delivery details can be changed until the order ships (customers only while PLACED). */
    public OrderResponse updateDetails(Long id, OrderUpdateRequest request) {
        Order order = getAccessibleOrder(id);
        boolean customer = currentUser.isCustomer();

        if (customer && order.getStatus() != OrderStatus.PLACED) {
            throw new ConflictException("You can only change an order before it is processed");
        }
        if (order.getStatus() != OrderStatus.PLACED && order.getStatus() != OrderStatus.PROCESSING) {
            throw new ConflictException("Delivery details cannot be changed once the order is " + order.getStatus());
        }

        order.setDeliveryAddress(request.deliveryAddress().trim());
        order.setContactPhone(request.contactPhone().trim());
        order.setNote(Text.clean(request.note()));
        return toResponse(order);
    }

    /** Staff moves the order through PLACED -> PROCESSING -> SHIPPED -> DELIVERED (or CANCELLED). */
    public OrderResponse changeStatus(Long id, OrderStatusRequest request) {
        Order order = getOrder(id);
        OrderStatus next = request.status();

        if (!order.getStatus().canMoveTo(next)) {
            throw new ConflictException("An order that is " + order.getStatus() + " cannot be changed to " + next);
        }
        if ((next == OrderStatus.SHIPPED || next == OrderStatus.DELIVERED) && order.getPaymentStatus() != PaymentStatus.PAID) {
            boolean bankTransfer = paymentRepository.findFirstByOrderIdOrderByIdDesc(id)
                    .map(p -> p.getMethod() == PaymentMethod.BANK_TRANSFER).orElse(false);
            if (bankTransfer) {
                throw new ConflictException("Order #" + id + " is paid by bank transfer. Confirm the transfer in Payments before it is "
                        + next.name().toLowerCase() + ".");
            }
        }
        if (next == OrderStatus.CANCELLED) {
            cancel(order);
        } else {
            order.setStatus(next);
        }

        if (next == OrderStatus.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());
            // cash on delivery is collected by the courier -> paid with the cash-on-delivery STRATEGY
            paymentRepository.findFirstByOrderIdOrderByIdDesc(id).ifPresent(payment -> {
                if (payment.getMethod() == PaymentMethod.CASH_ON_DELIVERY && payment.getStatus() == PaymentStatus.PENDING) {
                    paymentProcessor.complete(payment, PaymentDetails.none());
                }
            });
        }
        notifications.orderStatusChanged(order);
        return toResponse(order);
    }

    /** Customer cancels their own order before it is processed. */
    public OrderResponse cancelMine(Long id) {
        Order order = getAccessibleOrder(id);
        if (order.getStatus() != OrderStatus.PLACED) {
            throw new ConflictException("Only orders that are still PLACED can be cancelled. Please contact us.");
        }
        cancel(order);
        notifications.orderStatusChanged(order);
        return toResponse(order);
    }

    private void cancel(Order order) {
        for (OrderItem item : order.getItems()) {
            stockService.recordSystemMovement(item.getSparePart(), MovementType.RETURN, item.getQuantity(),
                    "ORDER-" + order.getId(), "Order cancelled - stock returned");
        }
        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());

        paymentRepository.findFirstByOrderIdOrderByIdDesc(order.getId()).ifPresent(payment -> {
            if (payment.getStatus() == PaymentStatus.PAID) {
                payment.setStatus(PaymentStatus.REFUNDED);
                payment.setNote("Refunded because the order was cancelled");
                order.setPaymentStatus(PaymentStatus.REFUNDED);
            } else if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setStatus(PaymentStatus.FAILED);
                payment.setNote("Order cancelled before payment");
                order.setPaymentStatus(PaymentStatus.FAILED);
            }
        });
    }

    // ---------------------------------------------------------------- delete

    /**
     * Physical delete of a finished order (CANCELLED or DELIVERED) with everything that belongs to it:
     * items, payments, invoice, reviews and return/warranty claims. Feedback is kept but unlinked.
     * Active orders must be cancelled first so the stock is returned.
     */
    public void delete(Long id) {
        Order order = getOrder(id);
        if (order.getStatus() != OrderStatus.CANCELLED && order.getStatus() != OrderStatus.DELIVERED) {
            throw new ConflictException("Order #" + id + " is " + order.getStatus()
                    + ". Cancel it first (this returns the stock), then delete it.");
        }

        rmaRepository.deleteAll(rmaRepository.findByOrder(id));
        reviewRepository.deleteByOrder(id);
        feedbackRepository.detachOrder(id);
        invoiceRepository.deleteByOrderId(id);
        bankSlipRepository.deleteByOrderId(id);
        paymentRepository.deleteByOrderId(id);
        orderRepository.flush();
        orderRepository.delete(order);
    }

    // ---------------------------------------------------------------- helpers

    /** Customers can only see their own orders; staff can see all. */
    Order getAccessibleOrder(Long id) {
        Order order = getOrder(id);
        if (currentUser.isCustomer() && !order.getCustomer().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Order", id);
        }
        return order;
    }

    Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> NotFoundException.of("Order", id));
    }

    OrderResponse toResponse(Order order) {
        PaymentMethod method = paymentRepository.findFirstByOrderIdOrderByIdDesc(order.getId())
                .map(Payment::getMethod).orElse(null);
        String invoiceNumber = invoiceRepository.findByOrderId(order.getId())
                .map(Invoice::getInvoiceNumber).orElse(null);
        return OrderResponse.from(order, method, invoiceNumber);
    }
}
