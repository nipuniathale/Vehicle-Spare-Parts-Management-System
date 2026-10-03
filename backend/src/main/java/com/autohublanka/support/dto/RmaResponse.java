package com.autohublanka.support.dto;

import com.autohublanka.support.Rma;
import com.autohublanka.support.RmaReason;
import com.autohublanka.support.RmaStatus;
import com.autohublanka.support.RmaType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RmaResponse(
        Long id,
        Long orderId,
        Long orderItemId,
        Long customerId,
        String customerName,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        int purchasedQuantity,
        BigDecimal unitPrice,
        RmaType type,
        RmaReason reason,
        int quantity,
        String description,
        List<String> imageUrls,
        RmaStatus status,
        String staffNote,
        BigDecimal refundAmount,
        LocalDateTime reviewedAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {
    public static RmaResponse from(Rma rma) {
        var item = rma.getOrderItem();
        return new RmaResponse(
                rma.getId(),
                item.getOrder().getId(),
                item.getId(),
                rma.getCustomer().getId(),
                rma.getCustomer().getFullName(),
                item.getSparePart().getId(),
                item.getSparePart().getName(),
                item.getSparePart().getSku(),
                item.getQuantity(),
                item.getUnitPrice(),
                rma.getType(),
                rma.getReason(),
                rma.getQuantity(),
                rma.getDescription(),
                List.copyOf(rma.getImageUrls()),
                rma.getStatus(),
                rma.getStaffNote(),
                rma.getRefundAmount(),
                rma.getReviewedAt(),
                rma.getCompletedAt(),
                rma.getCreatedAt()
        );
    }
}
