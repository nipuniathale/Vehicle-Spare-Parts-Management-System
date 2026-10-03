package com.autohublanka.dashboard;

import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.dashboard.DashboardDtos.InventorySummary;
import com.autohublanka.dashboard.DashboardDtos.MarketingSummary;
import com.autohublanka.dashboard.DashboardDtos.Overview;
import com.autohublanka.dashboard.DashboardDtos.ProcurementSummary;
import com.autohublanka.dashboard.DashboardDtos.SalesSummary;
import com.autohublanka.dashboard.DashboardDtos.SupportSummary;
import com.autohublanka.inventory.InventoryRepository;
import com.autohublanka.procurement.PurchaseOrderRepository;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.procurement.PurchaseRequestRepository;
import com.autohublanka.procurement.PurchaseRequestStatus;
import com.autohublanka.sales.OrderRepository;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.support.RmaRepository;
import com.autohublanka.support.RmaStatus;
import com.autohublanka.user.Role;
import com.autohublanka.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/**
 * Dashboard data. /summary = small counters for every staff member (notification bell);
 * the other endpoints give the charts and "needs attention" lists of one function.
 */
@RestController
@RequestMapping("/api/dashboard")
@PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER','PROCUREMENT_OFFICER','SALES_STAFF','MARKETING_MANAGER')")
public class DashboardController {

    public record Summary(
            long spareParts,
            long lowStockItems,
            long customers,
            long totalOrders,
            long placedOrders,
            long processingOrders,
            BigDecimal revenue,
            long pendingPurchaseRequests,
            long approvedPurchaseRequests,
            long openPurchaseOrders,
            long receivableOrders,
            long openClaims
    ) {
    }

    private final SparePartRepository sparePartRepository;
    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final RmaRepository rmaRepository;
    private final DashboardService dashboardService;

    public DashboardController(SparePartRepository sparePartRepository,
                               InventoryRepository inventoryRepository,
                               UserRepository userRepository,
                               OrderRepository orderRepository,
                               PurchaseRequestRepository purchaseRequestRepository,
                               PurchaseOrderRepository purchaseOrderRepository,
                               RmaRepository rmaRepository,
                               DashboardService dashboardService) {
        this.sparePartRepository = sparePartRepository;
        this.inventoryRepository = inventoryRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.rmaRepository = rmaRepository;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public Overview overview() {
        return dashboardService.overview();
    }

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public InventorySummary inventory() {
        return dashboardService.inventory();
    }

    @GetMapping("/procurement")
    @PreAuthorize("hasAnyRole('ADMIN','PROCUREMENT_OFFICER')")
    public ProcurementSummary procurement() {
        return dashboardService.procurement();
    }

    @GetMapping("/sales")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public SalesSummary sales() {
        return dashboardService.sales();
    }

    @GetMapping("/marketing")
    @PreAuthorize("hasAnyRole('ADMIN','MARKETING_MANAGER')")
    public MarketingSummary marketing() {
        return dashboardService.marketing();
    }

    @GetMapping("/customer-care")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public SupportSummary customerCare() {
        return dashboardService.support();
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public Summary summary() {
        return new Summary(
                sparePartRepository.count(),
                inventoryRepository.findLowStock().size(),
                userRepository.countByRole(Role.CUSTOMER),
                orderRepository.count(),
                orderRepository.countByStatus(OrderStatus.PLACED),
                orderRepository.countByStatus(OrderStatus.PROCESSING),
                orderRepository.totalPaidRevenue(),
                purchaseRequestRepository.countByStatus(PurchaseRequestStatus.PENDING),
                purchaseRequestRepository.countByStatus(PurchaseRequestStatus.APPROVED),
                purchaseOrderRepository.countByStatusIn(List.of(
                        PurchaseOrderStatus.PENDING, PurchaseOrderStatus.CONFIRMED,
                        PurchaseOrderStatus.SHIPPED, PurchaseOrderStatus.PARTIALLY_RECEIVED)),
                purchaseOrderRepository.countByStatusIn(List.of(
                        PurchaseOrderStatus.CONFIRMED, PurchaseOrderStatus.SHIPPED, PurchaseOrderStatus.PARTIALLY_RECEIVED)),
                rmaRepository.countByStatus(RmaStatus.REQUESTED) + rmaRepository.countByStatus(RmaStatus.APPROVED)
        );
    }
}
