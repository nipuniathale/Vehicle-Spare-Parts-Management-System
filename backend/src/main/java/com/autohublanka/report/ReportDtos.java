package com.autohublanka.report;

import com.autohublanka.inventory.dto.InventoryResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Response shapes of the admin reports. */
public final class ReportDtos {

    private ReportDtos() {
    }

    public record Period(LocalDate from, LocalDate to) {
    }

    /** A labelled value for charts (day / month / category ...). */
    public record Point(String label, BigDecimal value) {
    }

    // ---------------------------------------------------------------- sales, orders & payments

    public record SalesReport(
            Period period,
            long orders,
            long cancelledOrders,
            BigDecimal grossSales,
            BigDecimal paidRevenue,
            BigDecimal discountGiven,
            BigDecimal averageOrderValue,
            long unitsSold,
            long newCustomers,
            long orderingCustomers,
            long staffCreatedOrders,
            List<Point> salesOverTime,
            Map<String, Long> ordersByStatus,
            List<PaymentRow> payments,
            List<PartRow> topParts,
            List<CategoryRow> salesByCategory,
            List<CustomerRow> topCustomers
    ) {
    }

    public record PaymentRow(String method, String status, long count, BigDecimal amount) {
    }

    public record PartRow(String name, String sku, long units, BigDecimal revenue) {
    }

    public record CategoryRow(String category, long units, BigDecimal revenue) {
    }

    public record CustomerRow(String name, String email, long orders, BigDecimal spent) {
    }

    // ---------------------------------------------------------------- inventory

    public record InventoryReport(
            Period period,
            long spareParts,
            long unitsInStock,
            BigDecimal stockValue,
            long lowStock,
            long outOfStock,
            List<StockCategoryRow> stockByCategory,
            List<MovementRow> movements,
            List<InventoryResponse> lowStockItems
    ) {
    }

    public record StockCategoryRow(String category, long parts, long units, BigDecimal value) {
    }

    public record MovementRow(String type, boolean incoming, long count, long units) {
    }

    // ---------------------------------------------------------------- purchasing & suppliers

    public record PurchaseReport(
            Period period,
            long purchaseOrders,
            BigDecimal spend,
            long openOrders,
            long receivedOrders,
            long unitsReceived,
            Map<String, Long> ordersByStatus,
            Map<String, Long> requestsByStatus,
            List<Point> spendOverTime,
            List<SupplierRow> suppliers
    ) {
    }

    public record SupplierRow(String supplier, boolean active, long orders, BigDecimal spend, long unitsOrdered,
                              long unitsReceived, long declined, long cancelled) {
    }
}
