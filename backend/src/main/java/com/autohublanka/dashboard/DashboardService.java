package com.autohublanka.dashboard;

import com.autohublanka.catalog.CategoryRepository;
import com.autohublanka.catalog.FitmentRepository;
import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.catalog.VehicleRepository;
import com.autohublanka.dashboard.DashboardDtos.Ending;
import com.autohublanka.dashboard.DashboardDtos.InOut;
import com.autohublanka.dashboard.DashboardDtos.InventorySummary;
import com.autohublanka.dashboard.DashboardDtos.MarketingSummary;
import com.autohublanka.dashboard.DashboardDtos.Overview;
import com.autohublanka.dashboard.DashboardDtos.Point;
import com.autohublanka.dashboard.DashboardDtos.ProcurementSummary;
import com.autohublanka.dashboard.DashboardDtos.SalesSummary;
import com.autohublanka.dashboard.DashboardDtos.SupportSummary;
import com.autohublanka.dashboard.DashboardDtos.Trend;
import com.autohublanka.inventory.Inventory;
import com.autohublanka.inventory.InventoryRepository;
import com.autohublanka.inventory.InventoryService;
import com.autohublanka.inventory.StockMovement;
import com.autohublanka.inventory.StockMovementRepository;
import com.autohublanka.inventory.StockMovementService;
import com.autohublanka.marketing.CampaignStatus;
import com.autohublanka.marketing.CouponService;
import com.autohublanka.marketing.DiscountService;
import com.autohublanka.marketing.PromotionService;
import com.autohublanka.marketing.dto.CouponResponse;
import com.autohublanka.marketing.dto.DiscountResponse;
import com.autohublanka.marketing.dto.PromotionResponse;
import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderRepository;
import com.autohublanka.procurement.PurchaseOrderService;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.procurement.PurchaseRequestService;
import com.autohublanka.procurement.PurchaseRequestStatus;
import com.autohublanka.procurement.SupplierRepository;
import com.autohublanka.procurement.dto.PurchaseRequestResponse;
import com.autohublanka.sales.InvoiceRepository;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.OrderItem;
import com.autohublanka.sales.OrderRepository;
import com.autohublanka.sales.OrderService;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.sales.PaymentService;
import com.autohublanka.sales.PaymentStatus;
import com.autohublanka.sales.dto.OrderResponse;
import com.autohublanka.sales.dto.PaymentResponse;
import com.autohublanka.support.FeedbackService;
import com.autohublanka.support.ReviewService;
import com.autohublanka.support.RmaService;
import com.autohublanka.support.RmaStatus;
import com.autohublanka.support.dto.ReviewResponse;
import com.autohublanka.support.dto.RmaResponse;
import com.autohublanka.user.Role;
import com.autohublanka.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Numbers, chart data and "needs attention" lists for the dashboards.
 * Lists reuse the normal service responses so the frontend already knows their shape.
 */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int MONTHS = 6;
    private static final int WEEKS = 4;
    private static final Set<PurchaseOrderStatus> OPEN_PO = EnumSet.of(
            PurchaseOrderStatus.PENDING, PurchaseOrderStatus.CONFIRMED,
            PurchaseOrderStatus.SHIPPED, PurchaseOrderStatus.PARTIALLY_RECEIVED);
    private static final Set<RmaStatus> OPEN_CLAIM = EnumSet.of(RmaStatus.REQUESTED, RmaStatus.APPROVED);

    private final OrderRepository orderRepository;
    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final SparePartRepository sparePartRepository;
    private final CategoryRepository categoryRepository;
    private final VehicleRepository vehicleRepository;
    private final FitmentRepository fitmentRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    private final StockMovementService movementService;
    private final PurchaseRequestService requestService;
    private final PurchaseOrderService purchaseOrderService;
    private final PromotionService promotionService;
    private final DiscountService discountService;
    private final CouponService couponService;
    private final ReviewService reviewService;
    private final FeedbackService feedbackService;
    private final RmaService rmaService;

    public DashboardService(OrderRepository orderRepository, InventoryRepository inventoryRepository,
                            StockMovementRepository movementRepository, SparePartRepository sparePartRepository,
                            CategoryRepository categoryRepository, VehicleRepository vehicleRepository,
                            FitmentRepository fitmentRepository, SupplierRepository supplierRepository,
                            PurchaseOrderRepository purchaseOrderRepository, InvoiceRepository invoiceRepository,
                            UserRepository userRepository, OrderService orderService, PaymentService paymentService,
                            InventoryService inventoryService, StockMovementService movementService,
                            PurchaseRequestService requestService, PurchaseOrderService purchaseOrderService,
                            PromotionService promotionService, DiscountService discountService,
                            CouponService couponService, ReviewService reviewService,
                            FeedbackService feedbackService, RmaService rmaService) {
        this.orderRepository = orderRepository;
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
        this.sparePartRepository = sparePartRepository;
        this.categoryRepository = categoryRepository;
        this.vehicleRepository = vehicleRepository;
        this.fitmentRepository = fitmentRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.paymentService = paymentService;
        this.inventoryService = inventoryService;
        this.movementService = movementService;
        this.requestService = requestService;
        this.purchaseOrderService = purchaseOrderService;
        this.promotionService = promotionService;
        this.discountService = discountService;
        this.couponService = couponService;
        this.reviewService = reviewService;
        this.feedbackService = feedbackService;
        this.rmaService = rmaService;
    }

    // ---------------------------------------------------------------- admin overview (with charts)

    public Overview overview() {
        List<Order> orders = orderRepository.findAll();
        List<ReviewResponse> reviews = reviewService.findAll();
        return new Overview(
                paidRevenue(orders),
                revenueTrend(orders),
                orders.size(),
                orderCountTrend(orders),
                sparePartRepository.count(),
                inventoryRepository.findLowStock().size(),
                userRepository.countByRole(Role.CUSTOMER),
                requestService.findAll().stream().filter(r -> r.status() == PurchaseRequestStatus.PENDING).count(),
                reviews.size(),
                rmaService.findAll().stream().filter(r -> OPEN_CLAIM.contains(r.status())).count(),
                salesByMonth(orders),
                countByStatus(orders, Order::getStatus, OrderStatus.values()),
                topCategories(orders),
                stockInOut(),
                orderService.findAll().stream().limit(5).toList(),
                inventoryService.findAll(true).stream().limit(5).toList(),
                reviews.stream().limit(4).toList()
        );
    }

    // ---------------------------------------------------------------- per-function summaries

    public InventorySummary inventory() {
        List<Inventory> stock = inventoryRepository.findAllWithPart();
        long units = stock.stream().mapToLong(Inventory::getQuantity).sum();
        BigDecimal value = stock.stream()
                .map(i -> i.getSparePart().getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> unitsByCategory = stock.stream().collect(Collectors.groupingBy(
                i -> i.getSparePart().getCategory().getName(), Collectors.summingLong(Inventory::getQuantity)));

        return new InventorySummary(
                categoryRepository.count(),
                sparePartRepository.count(),
                sparePartRepository.findAll().stream().filter(SparePart::isActive).count(),
                vehicleRepository.count(),
                fitmentRepository.count(),
                units,
                value,
                stock.stream().filter(Inventory::isLowStock).count(),
                stock.stream().filter(i -> i.getQuantity() == 0).count(),
                stockInOut(),
                top(unitsByCategory, 6),
                inventoryService.findAll(true).stream().limit(8).toList(),
                movementService.findAll(null).stream().limit(8).toList()
        );
    }

    public ProcurementSummary procurement() {
        List<PurchaseRequestResponse> requests = requestService.findAll();
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll();
        YearMonth thisMonth = YearMonth.now();

        Map<String, BigDecimal> spend = emptyMonths();
        orders.stream()
                .filter(o -> o.getStatus() != PurchaseOrderStatus.CANCELLED && o.getStatus() != PurchaseOrderStatus.DECLINED)
                .forEach(o -> spend.computeIfPresent(monthKey(o.getCreatedAt()), (k, v) -> v.add(o.getTotalAmount())));

        return new ProcurementSummary(
                supplierRepository.count(),
                supplierRepository.findAll().stream().filter(s -> s.isActive()).count(),
                requests.stream().filter(r -> r.status() == PurchaseRequestStatus.PENDING).count(),
                requests.stream().filter(r -> r.status() == PurchaseRequestStatus.APPROVED).count(),
                orders.stream().filter(o -> OPEN_PO.contains(o.getStatus())).count(),
                orders.stream().filter(o -> o.getStatus() == PurchaseOrderStatus.RECEIVED).count(),
                orders.stream()
                        .filter(o -> YearMonth.from(o.getCreatedAt()).equals(thisMonth))
                        .filter(o -> o.getStatus() != PurchaseOrderStatus.CANCELLED && o.getStatus() != PurchaseOrderStatus.DECLINED)
                        .map(PurchaseOrder::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                countByStatus(orders, PurchaseOrder::getStatus, PurchaseOrderStatus.values()),
                toPoints(spend),
                requests.stream().filter(r -> r.status() == PurchaseRequestStatus.PENDING).toList(),
                requests.stream().filter(r -> r.status() == PurchaseRequestStatus.APPROVED).toList(),
                purchaseOrderService.findAll().stream().filter(o -> OPEN_PO.contains(o.status())).limit(8).toList()
        );
    }

    public SalesSummary sales() {
        List<Order> orders = orderRepository.findAll();
        List<OrderResponse> orderList = orderService.findAll();
        List<PaymentResponse> unpaid = paymentService.findAll().stream()
                .filter(p -> p.status() == PaymentStatus.PENDING)
                .toList();

        return new SalesSummary(
                paidRevenue(orders),
                revenueTrend(orders),
                orders.size(),
                count(orders, o -> o.getStatus() == OrderStatus.PLACED),
                count(orders, o -> o.getStatus() == OrderStatus.PROCESSING),
                count(orders, o -> o.getStatus() == OrderStatus.SHIPPED),
                count(orders, o -> o.getStatus() == OrderStatus.DELIVERED),
                count(orders, o -> o.getStatus() == OrderStatus.CANCELLED),
                unpaid.size(),
                unpaid.stream().map(PaymentResponse::amount).reduce(BigDecimal.ZERO, BigDecimal::add),
                invoiceRepository.count(),
                userRepository.countByRole(Role.CUSTOMER),
                salesByMonth(orders),
                countByStatus(orders, Order::getStatus, OrderStatus.values()),
                topCategories(orders),
                orderList.stream()
                        .filter(o -> o.status() == OrderStatus.PLACED || o.status() == OrderStatus.PROCESSING)
                        .sorted(Comparator.comparing(OrderResponse::createdAt))
                        .limit(8).toList(),
                unpaid.stream().limit(8).toList(),
                orderList.stream().limit(6).toList()
        );
    }

    public MarketingSummary marketing() {
        List<PromotionResponse> promotions = promotionService.findAll();
        List<DiscountResponse> discounts = discountService.findAll();
        List<CouponResponse> coupons = couponService.findAll();
        List<Order> orders = orderRepository.findAll();

        Map<String, BigDecimal> discountByMonth = emptyMonths();
        orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .forEach(o -> discountByMonth.computeIfPresent(monthKey(o.getCreatedAt()),
                        (k, v) -> v.add(o.getDiscountAmount() == null ? BigDecimal.ZERO : o.getDiscountAmount())));

        Map<String, Long> usage = coupons.stream()
                .filter(c -> c.usedCount() > 0)
                .collect(Collectors.toMap(CouponResponse::code, c -> (long) c.usedCount(), Long::sum));

        LocalDate today = LocalDate.now();
        List<Ending> ending = new ArrayList<>();
        promotions.stream().filter(p -> p.status() == CampaignStatus.ACTIVE)
                .forEach(p -> addEnding(ending, "Promotion", p.title(), p.endDate(), today));
        discounts.stream().filter(d -> d.status() == CampaignStatus.ACTIVE)
                .forEach(d -> addEnding(ending, "Discount", d.name(), d.endDate(), today));
        coupons.stream().filter(c -> c.status() == CampaignStatus.ACTIVE)
                .forEach(c -> addEnding(ending, "Coupon", c.code(), c.endDate(), today));
        ending.sort(Comparator.comparing(Ending::endDate));

        return new MarketingSummary(
                countByStatus(promotions, PromotionResponse::status, CampaignStatus.values()),
                countByStatus(discounts, DiscountResponse::status, CampaignStatus.values()),
                countByStatus(coupons, CouponResponse::status, CampaignStatus.values()),
                coupons.stream().mapToLong(CouponResponse::usedCount).sum(),
                orders.stream().filter(o -> o.getStatus() != OrderStatus.CANCELLED && o.getDiscountAmount() != null)
                        .map(Order::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                top(usage, 6),
                toPoints(discountByMonth),
                promotions.stream().filter(p -> p.status() == CampaignStatus.ACTIVE).toList(),
                discounts.stream().filter(d -> d.status() == CampaignStatus.ACTIVE).toList(),
                coupons.stream().filter(c -> c.status() == CampaignStatus.ACTIVE).toList(),
                ending
        );
    }

    public SupportSummary support() {
        List<ReviewResponse> reviews = reviewService.findAll();
        List<RmaResponse> claims = rmaService.findAll();
        var feedback = feedbackService.findAll();

        List<Point> ratings = new ArrayList<>();
        for (int stars = 5; stars >= 1; stars--) {
            int s = stars;
            ratings.add(new Point(stars + " star", BigDecimal.valueOf(reviews.stream().filter(r -> r.rating() == s).count())));
        }

        YearMonth thisMonth = YearMonth.now();
        return new SupportSummary(
                reviews.size(),
                feedback.size(),
                reviews.stream().filter(r -> YearMonth.from(r.createdAt()).equals(thisMonth)).count(),
                claims.stream().filter(r -> OPEN_CLAIM.contains(r.status())).count(),
                reviews.stream().mapToInt(ReviewResponse::rating).average().stream().boxed().findFirst().orElse(null),
                ratings,
                countByStatus(claims, RmaResponse::status, RmaStatus.values()),
                reviews.stream().limit(8).toList(),
                feedback.stream().limit(8).toList(),
                claims.stream().filter(r -> OPEN_CLAIM.contains(r.status())).limit(8).toList()
        );
    }

    // ---------------------------------------------------------------- helpers

    private static BigDecimal paidRevenue(List<Order> orders) {
        return orders.stream().filter(o -> o.getPaymentStatus() == PaymentStatus.PAID)
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Sales (all orders that were not cancelled) this month vs last month. */
    private static Trend revenueTrend(List<Order> orders) {
        return new Trend(salesIn(orders, YearMonth.now()), salesIn(orders, YearMonth.now().minusMonths(1)));
    }

    private static Trend orderCountTrend(List<Order> orders) {
        YearMonth now = YearMonth.now();
        return new Trend(
                BigDecimal.valueOf(count(orders, o -> YearMonth.from(o.getCreatedAt()).equals(now))),
                BigDecimal.valueOf(count(orders, o -> YearMonth.from(o.getCreatedAt()).equals(now.minusMonths(1)))));
    }

    private static BigDecimal salesIn(List<Order> orders, YearMonth month) {
        return orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED && YearMonth.from(o.getCreatedAt()).equals(month))
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<Point> salesByMonth(List<Order> orders) {
        Map<String, BigDecimal> months = emptyMonths();
        orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .forEach(o -> months.computeIfPresent(monthKey(o.getCreatedAt()), (k, v) -> v.add(o.getTotalAmount())));
        return toPoints(months);
    }

    /** Units sold per category (orders that were not cancelled), top five. */
    private static List<Point> topCategories(List<Order> orders) {
        Map<String, Long> units = orders.stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .flatMap(o -> o.getItems().stream())
                .collect(Collectors.groupingBy(i -> i.getSparePart().getCategory().getName(),
                        Collectors.summingLong(OrderItem::getQuantity)));
        return top(units, 5);
    }

    /** Units in vs units out for each of the last four 7-day weeks. */
    private List<InOut> stockInOut() {
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);
        List<StockMovement> movements = movementRepository.findAll();
        List<InOut> weeks = new ArrayList<>();
        for (int w = WEEKS - 1; w >= 0; w--) {
            LocalDate start = today.minusDays(w * 7L + 6);
            LocalDate end = today.minusDays(w * 7L);
            long in = 0;
            long out = 0;
            for (StockMovement m : movements) {
                LocalDate day = m.getCreatedAt().toLocalDate();
                if (day.isBefore(start) || day.isAfter(end)) {
                    continue;
                }
                if (m.getType().isIncoming()) {
                    in += m.getQuantity();
                } else {
                    out += m.getQuantity();
                }
            }
            weeks.add(new InOut(start.format(fmt) + " – " + end.format(fmt), in, out));
        }
        return weeks;
    }

    private static void addEnding(List<Ending> list, String kind, String name, LocalDate end, LocalDate today) {
        if (end == null) {
            return;
        }
        long days = ChronoUnit.DAYS.between(today, end);
        if (days <= 7) {
            list.add(new Ending(kind, name, end, days));
        }
    }

    private static <T> long count(List<T> list, Predicate<T> filter) {
        return list.stream().filter(filter).count();
    }

    /** Count per enum value, in the enum's own order (zero counts included, so colours stay fixed). */
    private static <T, E extends Enum<E>> Map<String, Long> countByStatus(List<T> list, Function<T, E> status, E[] values) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (E value : values) {
            counts.put(value.name(), 0L);
        }
        list.forEach(item -> counts.merge(status.apply(item).name(), 1L, Long::sum));
        return counts;
    }

    private static List<Point> top(Map<String, Long> values, int limit) {
        return values.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(limit)
                .map(e -> new Point(e.getKey(), BigDecimal.valueOf(e.getValue())))
                .toList();
    }

    /** The last six months (oldest first) with zero values, keyed "2026-04". */
    private static Map<String, BigDecimal> emptyMonths() {
        Map<String, BigDecimal> months = new LinkedHashMap<>();
        YearMonth now = YearMonth.now();
        for (int i = MONTHS - 1; i >= 0; i--) {
            months.put(now.minusMonths(i).toString(), BigDecimal.ZERO);
        }
        return months;
    }

    private static String monthKey(LocalDateTime time) {
        return YearMonth.from(time).toString();
    }

    private static List<Point> toPoints(Map<String, BigDecimal> months) {
        return months.entrySet().stream()
                .map(e -> new Point(YearMonth.parse(e.getKey()).getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH), e.getValue()))
                .toList();
    }
}
