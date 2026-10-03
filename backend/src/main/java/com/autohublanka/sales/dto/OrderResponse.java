package com.autohublanka.sales.dto;

import com.autohublanka.sales.Order;
import com.autohublanka.sales.OrderItem;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.sales.PaymentMethod;
import com.autohublanka.sales.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerEmail,
        OrderStatus status,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String couponCode,
        String deliveryAddress,
        String contactPhone,
        String note,
        String invoiceNumber,
        String placedBy,
        LocalDateTime deliveredAt,
        LocalDateTime cancelledAt,
        LocalDateTime createdAt,
        List<Item> items
) {
    public record Item(
            Long id,
            Long sparePartId,
            String name,
            String sku,
            String imageUrl,
            int quantity,
            BigDecimal listPrice,
            BigDecimal unitPrice,
            BigDecimal subtotal,
            int warrantyMonths
    ) {
        static Item from(OrderItem item) {
            var part = item.getSparePart();
            return new Item(item.getId(), part.getId(), part.getName(), part.getSku(), part.getImageUrl(),
                    item.getQuantity(), item.getListPrice(), item.getUnitPrice(), item.getSubtotal(),
                    part.getWarrantyMonths());
        }
    }

    public static OrderResponse from(Order order, PaymentMethod method, String invoiceNumber) {
        var customer = order.getCustomer();
        return new OrderResponse(
                order.getId(),
                customer.getId(),
                customer.getFullName(),
                customer.getEmail(),
                order.getStatus(),
                order.getPaymentStatus(),
                method,
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getTotalAmount(),
                order.getCouponCode(),
                order.getDeliveryAddress(),
                order.getContactPhone(),
                order.getNote(),
                invoiceNumber,
                order.getPlacedBy() == null ? null : order.getPlacedBy().getFullName(),
                order.getDeliveredAt(),
                order.getCancelledAt(),
                order.getCreatedAt(),
                order.getItems().stream().map(Item::from).toList()
        );
    }
}
