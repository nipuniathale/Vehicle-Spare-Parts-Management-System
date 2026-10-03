package com.autohublanka.report;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.inventory.Inventory;
import com.autohublanka.inventory.InventoryRepository;
import com.autohublanka.inventory.StockMovement;
import com.autohublanka.inventory.StockMovementRepository;
import com.autohublanka.inventory.dto.InventoryResponse;
import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderItem;
import com.autohublanka.procurement.PurchaseOrderRepository;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.procurement.PurchaseRequest;
import com.autohublanka.procurement.PurchaseRequestRepository;
import com.autohublanka.procurement.PurchaseRequestStatus;
import com.autohublanka.procurement.Supplier;
import com.autohublanka.procurement.SupplierRepository;
import com.autohublanka.report.ReportDtos.CategoryRow;
import com.autohublanka.report.ReportDtos.CustomerRow;
import com.autohublanka.report.ReportDtos.InventoryReport;
import com.autohublanka.report.ReportDtos.MovementRow;
import com.autohublanka.report.ReportDtos.PartRow;
import com.autohublanka.report.ReportDtos.PaymentRow;
import com.autohublanka.report.ReportDtos.Period;
import com.autohublanka.report.ReportDtos.Point;
import com.autohublanka.report.ReportDtos.PurchaseReport;
import com.autohublanka.report.ReportDtos.SalesReport;
import com.autohublanka.report.ReportDtos.StockCategoryRow;
import com.autohublanka.report.ReportDtos.SupplierRow;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.OrderItem;
import com.autohublanka.sales.OrderRepository;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.sales.Payment;
import com.autohublanka.sales.PaymentRepository;
import com.autohublanka.sales.PaymentStatus;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Business reports for the administrator, for any date range (by default the last 30 days). */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private static final int MAX_DAYS = 366 * 3;

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final SupplierRepository supplierRepository;

    public ReportService(OrderRepository orderRepository,
                         PaymentRepository paymentRepository,
                         UserRepository userRepository,
                         InventoryRepository inventoryRepository,
                         StockMovementRepository movementRepository,
                         PurchaseOrderRepository purchaseOrderRepository,
                         PurchaseRequestRepository purchaseRequestRepository,
                         SupplierRepository supplierRepository) {
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.supplierRepository = supplierRepository;
    }

    // ---------------------------------------------------------------- sales, orders, payments, customers

    public SalesReport sales(LocalDate fromDate, LocalDate toDate) {
        Period period = period(fromDate, toDate);
        List<Order> orders = orderRepository.findAll().stream().filter(o -> in(o.getCreatedAt(), period)).toList();
        List<Order> valid = orders.stream().filter(o -> o.getStatus() != OrderStatus.CANCELLED).toList();

        BigDecimal gross = sum(valid, Order::getTotalAmount);
        BigDecimal paid = sum(orders.stream().filter(o -> o.getPaymentStatus() == PaymentStatus.PAID).toList(), Order::getTotalAmount);
        BigDecimal discount = sum(valid, o -> o.getDiscountAmount() == null ? BigDecimal.ZERO : o.getDiscountAmount());
        BigDecimal average = valid.isEmpty() ? BigDecimal.ZERO
                : gross.divide(BigDecimal.valueOf(valid.size()), 2, RoundingMode.HALF_UP);
        List<OrderItem> items = valid.stream().flatMap(o -> o.getItems().stream()).toList();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus status : OrderStatus.values()) {
            byStatus.put(status.name(), orders.stream().filter(o -> o.getStatus() == status).count());
        }

        // payments: method x status
        Map<String, PaymentRow> payments = new LinkedHashMap<>();
        for (Payment p : paymentRepository.findAll()) {
            if (!in(p.getCreatedAt(), period)) {
                continue;
            }
            String key = p.getMethod() + "|" + p.getStatus();
            PaymentRow row = payments.getOrDefault(key, new PaymentRow(p.getMethod().name(), p.getStatus().name(), 0, BigDecimal.ZERO));
            payments.put(key, new PaymentRow(row.method(), row.status(), row.count() + 1, row.amount().add(p.getAmount())));
        }

        // top parts and categories
        Map<SparePart, long[]> unitsByPart = new LinkedHashMap<>();
        Map<SparePart, BigDecimal> revenueByPart = new LinkedHashMap<>();
        for (OrderItem item : items) {
            unitsByPart.computeIfAbsent(item.getSparePart(), k -> new long[1])[0] += item.getQuantity();
            revenueByPart.merge(item.getSparePart(), item.getSubtotal(), BigDecimal::add);
        }
        List<PartRow> topParts = unitsByPart.entrySet().stream()
                .map(e -> new PartRow(e.getKey().getName(), e.getKey().getSku(), e.getValue()[0], revenueByPart.get(e.getKey())))
                .sorted(Comparator.comparing(PartRow::revenue).reversed())
                .limit(10).toList();

        Map<String, long[]> unitsByCategory = new LinkedHashMap<>();
        Map<String, BigDecimal> revenueByCategory = new LinkedHashMap<>();
        for (OrderItem item : items) {
            String category = item.getSparePart().getCategory().getName();
            unitsByCategory.computeIfAbsent(category, k -> new long[1])[0] += item.getQuantity();
            revenueByCategory.merge(category, item.getSubtotal(), BigDecimal::add);
        }
        List<CategoryRow> categories = unitsByCategory.entrySet().stream()
                .map(e -> new CategoryRow(e.getKey(), e.getValue()[0], revenueByCategory.get(e.getKey())))
                .sorted(Comparator.comparing(CategoryRow::revenue).reversed())
                .toList();

        // top customers
        Map<User, List<Order>> byCustomer = valid.stream().collect(Collectors.groupingBy(Order::getCustomer));
        List<CustomerRow> customers = byCustomer.entrySet().stream()
                .map(e -> new CustomerRow(e.getKey().getFullName(), e.getKey().getEmail(), e.getValue().size(),
                        sum(e.getValue(), Order::getTotalAmount)))
                .sorted(Comparator.comparing(CustomerRow::spent).reversed())
                .limit(10).toList();

        long newCustomers = userRepository.findByRoleOrderByFirstNameAsc(Role.CUSTOMER).stream()
                .filter(u -> in(u.getCreatedAt(), period)).count();

        return new SalesReport(period, orders.size(), orders.size() - valid.size(), gross, paid, discount, average,
                items.stream().mapToLong(OrderItem::getQuantity).sum(), newCustomers, byCustomer.size(),
                orders.stream().filter(o -> o.getPlacedBy() != null).count(),
                overTime(valid, Order::getCreatedAt, Order::getTotalAmount, period),
                byStatus, new ArrayList<>(payments.values()), topParts, categories, customers);
    }

    // ---------------------------------------------------------------- inventory

    public InventoryReport inventory(LocalDate fromDate, LocalDate toDate) {
        Period period = period(fromDate, toDate);
        List<Inventory> stock = inventoryRepository.findAllWithPart();

        Map<String, List<Inventory>> byCategory = stock.stream()
                .collect(Collectors.groupingBy(i -> i.getSparePart().getCategory().getName()));
        List<StockCategoryRow> categories = byCategory.entrySet().stream()
                .map(e -> new StockCategoryRow(e.getKey(), e.getValue().size(),
                        e.getValue().stream().mapToLong(Inventory::getQuantity).sum(),
                        e.getValue().stream().map(ReportService::value).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparing(StockCategoryRow::value).reversed())
                .toList();

        Map<com.autohublanka.inventory.MovementType, long[]> movements = new EnumMap<>(com.autohublanka.inventory.MovementType.class);
        for (StockMovement m : movementRepository.findAll()) {
            if (in(m.getCreatedAt(), period)) {
                long[] row = movements.computeIfAbsent(m.getType(), k -> new long[2]);
                row[0]++;
                row[1] += m.getQuantity();
            }
        }
        List<MovementRow> movementRows = movements.entrySet().stream()
                .map(e -> new MovementRow(e.getKey().name(), e.getKey().isIncoming(), e.getValue()[0], e.getValue()[1]))
                .toList();

        return new InventoryReport(period, stock.size(),
                stock.stream().mapToLong(Inventory::getQuantity).sum(),
                stock.stream().map(ReportService::value).reduce(BigDecimal.ZERO, BigDecimal::add),
                stock.stream().filter(Inventory::isLowStock).count(),
                stock.stream().filter(i -> i.getQuantity() == 0).count(),
                categories, movementRows,
                stock.stream().filter(Inventory::isLowStock)
                        .sorted(Comparator.comparingInt(Inventory::getQuantity))
                        .map(InventoryResponse::from).toList());
    }

    // ---------------------------------------------------------------- purchasing & suppliers

    public PurchaseReport purchases(LocalDate fromDate, LocalDate toDate) {
        Period period = period(fromDate, toDate);
        List<PurchaseOrder> orders = purchaseOrderRepository.findAll().stream()
                .filter(o -> in(o.getCreatedAt(), period)).toList();
        List<PurchaseOrder> counted = orders.stream()
                .filter(o -> o.getStatus() != PurchaseOrderStatus.CANCELLED && o.getStatus() != PurchaseOrderStatus.DECLINED)
                .toList();

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (PurchaseOrderStatus status : PurchaseOrderStatus.values()) {
            byStatus.put(status.name(), orders.stream().filter(o -> o.getStatus() == status).count());
        }
        List<PurchaseRequest> requests = purchaseRequestRepository.findAll().stream()
                .filter(r -> in(r.getCreatedAt(), period)).toList();
        Map<String, Long> requestsByStatus = new LinkedHashMap<>();
        for (PurchaseRequestStatus status : PurchaseRequestStatus.values()) {
            requestsByStatus.put(status.name(), requests.stream().filter(r -> r.getStatus() == status).count());
        }

        List<SupplierRow> suppliers = new ArrayList<>();
        for (Supplier supplier : supplierRepository.findAll()) {
            List<PurchaseOrder> mine = orders.stream().filter(o -> o.getSupplier().getId().equals(supplier.getId())).toList();
            List<PurchaseOrder> mineCounted = mine.stream().filter(counted::contains).toList();
            suppliers.add(new SupplierRow(supplier.getName(), supplier.isActive(), mine.size(),
                    sum(mineCounted, PurchaseOrder::getTotalAmount),
                    mineCounted.stream().flatMap(o -> o.getItems().stream()).mapToLong(PurchaseOrderItem::getQuantity).sum(),
                    mine.stream().flatMap(o -> o.getItems().stream()).mapToLong(PurchaseOrderItem::getReceivedQuantity).sum(),
                    mine.stream().filter(o -> o.getStatus() == PurchaseOrderStatus.DECLINED).count(),
                    mine.stream().filter(o -> o.getStatus() == PurchaseOrderStatus.CANCELLED).count()));
        }
        suppliers.sort(Comparator.comparing(SupplierRow::spend).reversed().thenComparing(SupplierRow::supplier));

        return new PurchaseReport(period, orders.size(), sum(counted, PurchaseOrder::getTotalAmount),
                orders.stream().filter(o -> o.getStatus() == PurchaseOrderStatus.PENDING || o.getStatus() == PurchaseOrderStatus.CONFIRMED
                        || o.getStatus() == PurchaseOrderStatus.SHIPPED || o.getStatus() == PurchaseOrderStatus.PARTIALLY_RECEIVED).count(),
                orders.stream().filter(o -> o.getStatus() == PurchaseOrderStatus.RECEIVED).count(),
                orders.stream().flatMap(o -> o.getItems().stream()).mapToLong(PurchaseOrderItem::getReceivedQuantity).sum(),
                byStatus, requestsByStatus,
                overTime(counted, PurchaseOrder::getCreatedAt, PurchaseOrder::getTotalAmount, period),
                suppliers);
    }

    // ---------------------------------------------------------------- helpers

    private static Period period(LocalDate from, LocalDate to) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.minusDays(29) : from;
        if (start.isAfter(end)) {
            throw new BusinessException("'From' date must be before the 'To' date");
        }
        if (ChronoUnit.DAYS.between(start, end) > MAX_DAYS) {
            throw new BusinessException("Please choose a period of at most 3 years");
        }
        return new Period(start, end);
    }

    private static boolean in(LocalDateTime time, Period period) {
        LocalDate day = time.toLocalDate();
        return !day.isBefore(period.from()) && !day.isAfter(period.to());
    }

    private static <T> BigDecimal sum(List<T> list, Function<T, BigDecimal> value) {
        return list.stream().map(value).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal value(Inventory i) {
        return i.getSparePart().getPrice().multiply(BigDecimal.valueOf(i.getQuantity()));
    }

    /** Daily totals for periods up to 62 days, monthly totals for longer periods (gaps filled with 0). */
    private static <T> List<Point> overTime(List<T> list, Function<T, LocalDateTime> time, Function<T, BigDecimal> amount,
                                            Period period) {
        boolean daily = ChronoUnit.DAYS.between(period.from(), period.to()) <= 62;
        Map<String, BigDecimal> buckets = new LinkedHashMap<>();
        if (daily) {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);
            for (LocalDate d = period.from(); !d.isAfter(period.to()); d = d.plusDays(1)) {
                buckets.put(d.format(fmt), BigDecimal.ZERO);
            }
            list.forEach(item -> buckets.merge(time.apply(item).toLocalDate().format(fmt), amount.apply(item), BigDecimal::add));
        } else {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
            for (YearMonth m = YearMonth.from(period.from()); !m.isAfter(YearMonth.from(period.to())); m = m.plusMonths(1)) {
                buckets.put(m.format(fmt), BigDecimal.ZERO);
            }
            list.forEach(item -> buckets.merge(YearMonth.from(time.apply(item)).format(fmt), amount.apply(item), BigDecimal::add));
        }
        return buckets.entrySet().stream().map(e -> new Point(e.getKey(), e.getValue())).toList();
    }
}
