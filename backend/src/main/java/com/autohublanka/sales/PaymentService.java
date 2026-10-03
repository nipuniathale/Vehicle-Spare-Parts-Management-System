package com.autohublanka.sales;

import com.autohublanka.common.FileTypes;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.notification.NotificationService;
import com.autohublanka.sales.dto.BankTransferRejectRequest;
import com.autohublanka.sales.dto.CardPaymentRequest;
import com.autohublanka.sales.dto.PaymentRequest;
import com.autohublanka.sales.dto.PaymentResponse;
import com.autohublanka.sales.payment.PaymentDetails;
import com.autohublanka.sales.payment.PaymentProcessor;
import com.autohublanka.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderService orderService;

    private final PaymentProcessor paymentProcessor;
    private final InvoiceRepository invoiceRepository;
    private final NotificationService notifications;
    private final CurrentUser currentUser;
    private final BankSlipRepository bankSlipRepository;

    public PaymentService(PaymentRepository paymentRepository, OrderService orderService,
                          PaymentProcessor paymentProcessor, InvoiceRepository invoiceRepository,
                          NotificationService notifications, CurrentUser currentUser,
                          BankSlipRepository bankSlipRepository) {
        this.paymentRepository = paymentRepository;
        this.orderService = orderService;
        this.paymentProcessor = paymentProcessor;
        this.invoiceRepository = invoiceRepository;
        this.notifications = notifications;
        this.currentUser = currentUser;
        this.bankSlipRepository = bankSlipRepository;
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findAll() {
        return paymentRepository.findAllForList().stream().map(PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findByOrder(Long orderId) {
        orderService.getAccessibleOrder(orderId);
        return paymentRepository.findByOrderIdOrderByIdDesc(orderId).stream().map(PaymentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse findById(Long id) {
        return PaymentResponse.from(getPayment(id));
    }

    /** Customer pays a CARD order online - paid with the card STRATEGY, then the invoice is generated automatically. */
    public PaymentResponse payByCard(Long orderId, CardPaymentRequest card) {
        Order order = orderService.getAccessibleOrder(orderId);
        Payment payment = paymentRepository.findFirstByOrderIdOrderByIdDesc(orderId)
                .filter(p -> p.getStatus() == PaymentStatus.PENDING || p.getStatus() == PaymentStatus.FAILED)
                .orElseGet(() -> newPayment(order, PaymentMethod.CARD));
        payment.setMethod(PaymentMethod.CARD);
        return PaymentResponse.from(paymentProcessor.complete(payment, PaymentDetails.card(card)));
    }

    public static final long MAX_SLIP_BYTES = 5L * 1024 * 1024;

    /**
     * Customer has transferred the money to the store's bank account and uploads the bank slip
     * (photo or PDF, max 5 MB) - the transfer reference is optional. Uploading again replaces the slip.
     * The payment stays PENDING until sales staff check the bank account and confirm it.
     */
    public PaymentResponse uploadBankSlip(Long orderId, MultipartFile file, String reference) {
        Order order = orderService.getAccessibleOrder(orderId);
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ConflictException("This order was cancelled");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ConflictException("This order is already paid");
        }
        Payment payment = paymentRepository.findFirstByOrderIdOrderByIdDesc(orderId)
                .filter(p -> p.getMethod() == PaymentMethod.BANK_TRANSFER && p.getStatus() == PaymentStatus.PENDING)
                .orElseThrow(() -> new BusinessException("Order #" + orderId + " is not paid by bank transfer"));

        String ref = Text.clean(reference);
        if (ref != null && !ref.matches("^[A-Za-z0-9/ -]{4,40}$")) {
            throw new BusinessException("Reference must be 4-40 letters, digits, spaces, '-' or '/'");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Please add a photo or PDF of the bank slip");
        }
        if (file.getSize() > MAX_SLIP_BYTES) {
            throw new BusinessException("The bank slip must be 5 MB or smaller");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("The bank slip could not be read. Please try again.");
        }
        String type = FileTypes.imageOrPdf(bytes);
        if (type == null) {
            throw new BusinessException("The bank slip must be a JPG, PNG, WEBP or GIF photo, or a PDF");
        }

        BankSlip slip = bankSlipRepository.findByPaymentId(payment.getId()).orElseGet(BankSlip::new);
        slip.setPaymentId(payment.getId());
        slip.setContentType(type);
        slip.setFileName(fileName(file.getOriginalFilename()));
        slip.setData(bytes);
        bankSlipRepository.save(slip);

        payment.setBankReference(ref);
        payment.setSlipUrl("/api/payments/" + payment.getId() + "/slip?v=" + System.currentTimeMillis());
        payment.setTransferSubmittedAt(LocalDateTime.now());
        payment.setNote("Customer uploaded the bank slip" + (ref == null ? "" : " (ref " + ref + ")") + " - waiting for confirmation");
        notifications.bankTransferSubmitted(payment);
        return PaymentResponse.from(payment);
    }

    /** The uploaded slip - for the customer who owns the order and for staff. */
    @Transactional(readOnly = true)
    public BankSlip getBankSlip(Long paymentId) {
        Payment payment = getPayment(paymentId);
        orderService.getAccessibleOrder(payment.getOrder().getId()); // customers: only their own orders
        return bankSlipRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> NotFoundException.of("Bank slip for payment", paymentId));
    }

    private static String fileName(String original) {
        if (original == null || original.isBlank()) {
            return "bank-slip";
        }
        String name = original.replaceAll("[^A-Za-z0-9._ -]", "_").trim();
        return name.length() > 150 ? name.substring(name.length() - 150) : name;
    }

    /** Sales staff found the money in the bank account -> paid with the bank transfer STRATEGY, invoice generated. */
    public PaymentResponse confirmBankTransfer(Long id) {
        Payment payment = getPendingTransfer(id);
        return PaymentResponse.from(paymentProcessor.complete(payment, PaymentDetails.confirmedBy(currentUser.get().getFullName())));
    }

    /** Sales staff could not find the transfer - the details are cleared so the customer can send them again. */
    public PaymentResponse rejectBankTransfer(Long id, BankTransferRejectRequest request) {
        Payment payment = getPendingTransfer(id);
        if (payment.getSlipUrl() == null) {
            throw new BusinessException("The customer has not uploaded the bank slip yet");
        }
        String reason = request.reason().trim();
        bankSlipRepository.deleteByPaymentId(payment.getId());
        payment.setBankReference(null);
        payment.setSlipUrl(null);
        payment.setTransferSubmittedAt(null);
        payment.setNote("Transfer not found: " + reason);
        notifications.bankTransferRejected(payment, reason.endsWith(".") ? reason : reason + ".");
        return PaymentResponse.from(payment);
    }

    private Payment getPendingTransfer(Long id) {
        Payment payment = getPayment(id);
        if (payment.getMethod() != PaymentMethod.BANK_TRANSFER) {
            throw new BusinessException("Payment #" + id + " is not a bank transfer");
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ConflictException("Payment #" + id + " is already " + payment.getStatus());
        }
        return payment;
    }

    /** Staff records a payment manually (e.g. bank transfer, re-try after a failed payment). */
    public PaymentResponse create(PaymentRequest request) {
        Order order = orderService.getOrder(request.orderId());
        if (order.getPaymentStatus() == PaymentStatus.PAID && request.status() == PaymentStatus.PAID) {
            throw new ConflictException("Order #" + order.getId() + " is already paid");
        }
        boolean hasPending = paymentRepository.findByOrderIdOrderByIdDesc(order.getId()).stream()
                .anyMatch(p -> p.getStatus() == PaymentStatus.PENDING);
        if (hasPending) {
            throw new ConflictException("Order #" + order.getId() + " already has a PENDING payment. Update that one instead.");
        }
        Payment payment = newPayment(order, request.method());
        applyStatus(payment, order, request);
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    public PaymentResponse update(Long id, PaymentRequest request) {
        Payment payment = getPayment(id);
        if (!payment.getOrder().getId().equals(request.orderId())) {
            throw new BusinessException("A payment cannot be moved to another order");
        }
        payment.setMethod(request.method());
        applyStatus(payment, payment.getOrder(), request);
        return PaymentResponse.from(paymentRepository.save(payment));
    }

    /** Physical delete. A PAID payment must be marked REFUNDED first. */
    public void delete(Long id) {
        Payment payment = getPayment(id);
        if (payment.getStatus() == PaymentStatus.PAID) {
            throw new ConflictException("A PAID payment cannot be deleted. Mark it REFUNDED first.");
        }
        if (invoiceRepository.existsByPaymentId(id)) {
            throw new ConflictException("This payment has an invoice and is kept as a financial record. "
                    + "Delete the whole order instead (only finished orders can be deleted).");
        }
        Order order = payment.getOrder();
        bankSlipRepository.deleteByPaymentId(id);
        paymentRepository.delete(payment);
        paymentRepository.flush();

        order.setPaymentStatus(paymentRepository.findFirstByOrderIdOrderByIdDesc(order.getId())
                .map(Payment::getStatus)
                .orElse(PaymentStatus.PENDING));
    }

    private void applyStatus(Payment payment, Order order, PaymentRequest request) {
        if (request.status() == PaymentStatus.PAID && order.getStatus() == OrderStatus.CANCELLED) {
            throw new BusinessException("A cancelled order cannot be marked as paid");
        }
        if (request.status() == PaymentStatus.REFUNDED && payment.getPaidAt() == null) {
            throw new BusinessException("Only a payment that was PAID can be refunded");
        }
        payment.setNote(Text.clean(request.note()));
        boolean becomesPaid = request.status() == PaymentStatus.PAID && payment.getStatus() != PaymentStatus.PAID;
        if (becomesPaid) {
            if (payment.getTransactionId() == null) {
                payment.setTransactionId("MAN-" + UUID.randomUUID().toString().substring(0, 13).toUpperCase());
            }
            if (payment.getOrder() == null) {
                payment.setOrder(order);
            }
            paymentProcessor.markPaid(payment); // -> invoice generated + customer notified
            return;
        }
        payment.setStatus(request.status());
        order.setPaymentStatus(request.status());
    }

    private Payment newPayment(Order order, PaymentMethod method) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(order.getTotalAmount());
        payment.setMethod(method);
        return payment;
    }

    private Payment getPayment(Long id) {
        return paymentRepository.findById(id).orElseThrow(() -> NotFoundException.of("Payment", id));
    }
}
