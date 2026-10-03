package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.GoodsReceipt;

import java.time.LocalDateTime;

public record GoodsReceiptResponse(
        Long id,
        Long purchaseOrderId,
        Long purchaseOrderItemId,
        String supplierName,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        int orderedQuantity,
        int receivedQuantity,
        int lineReceivedTotal,
        String note,
        String receivedBy,
        LocalDateTime createdAt
) {
    public static GoodsReceiptResponse from(GoodsReceipt receipt) {
        var item = receipt.getPurchaseOrderItem();
        return new GoodsReceiptResponse(
                receipt.getId(),
                item.getPurchaseOrder().getId(),
                item.getId(),
                item.getPurchaseOrder().getSupplier().getName(),
                item.getSparePart().getId(),
                item.getSparePart().getName(),
                item.getSparePart().getSku(),
                item.getQuantity(),
                receipt.getReceivedQuantity(),
                item.getReceivedQuantity(),
                receipt.getNote(),
                receipt.getReceivedBy() == null ? null : receipt.getReceivedBy().getFullName(),
                receipt.getCreatedAt()
        );
    }
}
