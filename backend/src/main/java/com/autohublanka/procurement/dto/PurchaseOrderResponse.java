package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderItem;
import com.autohublanka.procurement.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseOrderResponse(
        Long id,
        Long supplierId,
        String supplierName,
        Long purchaseRequestId,
        Integer approvedQuantity,
        PurchaseOrderStatus status,
        LocalDate expectedDeliveryDate,
        String deliveryAddress,
        String note,
        String supplierNote,
        BigDecimal totalAmount,
        String createdBy,
        List<Item> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public record Item(
            Long id,
            Long sparePartId,
            String sparePartName,
            String sparePartSku,
            int quantity,
            BigDecimal unitCost,
            BigDecimal subtotal,
            int receivedQuantity,
            int remainingQuantity
    ) {
        static Item from(PurchaseOrderItem item) {
            return new Item(
                    item.getId(),
                    item.getSparePart().getId(),
                    item.getSparePart().getName(),
                    item.getSparePart().getSku(),
                    item.getQuantity(),
                    item.getUnitCost(),
                    item.getSubtotal(),
                    item.getReceivedQuantity(),
                    item.getRemainingQuantity()
            );
        }
    }

    public static PurchaseOrderResponse from(PurchaseOrder order) {
        return new PurchaseOrderResponse(
                order.getId(),
                order.getSupplier().getId(),
                order.getSupplier().getName(),
                order.getPurchaseRequest() == null ? null : order.getPurchaseRequest().getId(),
                order.getPurchaseRequest() == null ? null : order.getPurchaseRequest().getQuantity(),
                order.getStatus(),
                order.getExpectedDeliveryDate(),
                order.getDeliveryAddress(),
                order.getNote(),
                order.getSupplierNote(),
                order.getTotalAmount(),
                order.getCreatedBy() == null ? null : order.getCreatedBy().getFullName(),
                order.getItems().stream().map(Item::from).toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }
}
