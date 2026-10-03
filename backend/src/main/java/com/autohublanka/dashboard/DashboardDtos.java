package com.autohublanka.dashboard;

import com.autohublanka.inventory.dto.InventoryResponse;
import com.autohublanka.inventory.dto.StockMovementResponse;
import com.autohublanka.marketing.dto.CouponResponse;
import com.autohublanka.marketing.dto.DiscountResponse;
import com.autohublanka.marketing.dto.PromotionResponse;
import com.autohublanka.procurement.dto.PurchaseOrderResponse;
import com.autohublanka.procurement.dto.PurchaseRequestResponse;
import com.autohublanka.sales.dto.OrderResponse;
import com.autohublanka.sales.dto.PaymentResponse;
import com.autohublanka.support.dto.FeedbackResponse;
import com.autohublanka.support.dto.ReviewResponse;
import com.autohublanka.support.dto.RmaResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Response shapes for the dashboard pages (numbers, chart points and "needs attention" lists). */
public final class DashboardDtos {

    private DashboardDtos() {
    }

    /** One bar / point of a single-series chart. */
    public record Point(String label, BigDecimal value) {
    }

    /** Stock in vs stock out for one week. */
    public record InOut(String label, long in, long out) {
    }

    /** A promotion, discount or coupon whose end date is close. */
    public record Ending(String kind, String name, java.time.LocalDate endDate, long daysLeft) {
    }

    /** A small change indicator: this month compared with last month. */
    public record Trend(BigDecimal current, BigDecimal previous) {
    }

    public record Overview(
            BigDecimal revenue,
            Trend revenueTrend,
            long orders,
            Trend ordersTrend,
            long spareParts,
            long lowStock,
            long customers,
            long pendingPurchaseRequests,
            long reviews,
            long openClaims,
            List<Point> salesByMonth,
            Map<String, Long> ordersByStatus,
            List<Point> topCategories,
            List<InOut> stockMovements,
            List<OrderResponse> recentOrders,
            List<InventoryResponse> lowStockItems,
            List<ReviewResponse> recentReviews
    ) {
    }

    public record InventorySummary(
            long categories,
            long spareParts,
            long activeParts,
            long vehicles,
            long fitments,
            long unitsInStock,
            BigDecimal stockValue,
            long lowStock,
            long outOfStock,
            List<InOut> stockMovements,
            List<Point> unitsByCategory,
            List<InventoryResponse> lowStockItems,
            List<StockMovementResponse> recentMovements
    ) {
    }

    public record ProcurementSummary(
            long suppliers,
            long activeSuppliers,
            long pendingRequests,
            long approvedAwaitingOrder,
            long openOrders,
            long receivedOrders,
            BigDecimal spendThisMonth,
            Map<String, Long> ordersByStatus,
            List<Point> spendByMonth,
            List<PurchaseRequestResponse> pendingRequestList,
            List<PurchaseRequestResponse> approvedRequestList,
            List<PurchaseOrderResponse> openOrderList
    ) {
    }

    public record SalesSummary(
            BigDecimal revenue,
            Trend revenueTrend,
            long orders,
            long placed,
            long processing,
            long shipped,
            long delivered,
            long cancelled,
            long pendingPayments,
            BigDecimal pendingPaymentAmount,
            long invoices,
            long customers,
            List<Point> salesByMonth,
            Map<String, Long> ordersByStatus,
            List<Point> topCategories,
            List<OrderResponse> ordersToProcess,
            List<PaymentResponse> unpaidPayments,
            List<OrderResponse> recentOrders
    ) {
    }

    public record MarketingSummary(
            Map<String, Long> promotions,
            Map<String, Long> discounts,
            Map<String, Long> coupons,
            long couponRedemptions,
            BigDecimal discountGiven,
            List<Point> couponUsage,
            List<Point> discountByMonth,
            List<PromotionResponse> activePromotions,
            List<DiscountResponse> activeDiscounts,
            List<CouponResponse> activeCoupons,
            List<Ending> endingSoon
    ) {
    }

    public record SupportSummary(
            long totalReviews,
            long totalFeedback,
            long reviewsThisMonth,
            long openClaims,
            Double averageRating,
            List<Point> ratingDistribution,
            Map<String, Long> claimsByStatus,
            List<ReviewResponse> recentReviews,
            List<FeedbackResponse> recentFeedback,
            List<RmaResponse> openClaimList
    ) {
    }
}
