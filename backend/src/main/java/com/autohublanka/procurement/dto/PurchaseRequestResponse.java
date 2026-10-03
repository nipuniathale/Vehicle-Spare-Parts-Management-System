package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.PurchaseRequest;
import com.autohublanka.procurement.PurchaseRequestStatus;

import java.time.LocalDateTime;

public record PurchaseRequestResponse(
        Long id,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        Long supplierId,
        String supplierName,
        int quantity,
        String reason,
        PurchaseRequestStatus status,
        String requestedBy,
        String reviewNote,
        String reviewedBy,
        LocalDateTime reviewedAt,
        Long purchaseOrderId,
        LocalDateTime createdAt
) {
    public static PurchaseRequestResponse from(PurchaseRequest request, Long purchaseOrderId) {
        return new PurchaseRequestResponse(
                request.getId(),
                request.getSparePart().getId(),
                request.getSparePart().getName(),
                request.getSparePart().getSku(),
                request.getSupplier().getId(),
                request.getSupplier().getName(),
                request.getQuantity(),
                request.getReason(),
                request.getStatus(),
                request.getRequestedBy() == null ? null : request.getRequestedBy().getFullName(),
                request.getReviewNote(),
                request.getReviewedBy() == null ? null : request.getReviewedBy().getFullName(),
                request.getReviewedAt(),
                purchaseOrderId,
                request.getCreatedAt()
        );
    }
}
