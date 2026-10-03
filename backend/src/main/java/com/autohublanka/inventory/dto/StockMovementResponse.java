package com.autohublanka.inventory.dto;

import com.autohublanka.inventory.MovementType;
import com.autohublanka.inventory.StockMovement;

import java.time.LocalDateTime;

public record StockMovementResponse(
        Long id,
        Long inventoryId,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        MovementType type,
        boolean incoming,
        int quantity,
        String reference,
        String note,
        boolean manual,
        LocalDateTime createdAt
) {
    public static StockMovementResponse from(StockMovement movement) {
        var part = movement.getInventory().getSparePart();
        return new StockMovementResponse(
                movement.getId(),
                movement.getInventory().getId(),
                part.getId(),
                part.getName(),
                part.getSku(),
                movement.getType(),
                movement.getType().isIncoming(),
                movement.getQuantity(),
                movement.getReference(),
                movement.getNote(),
                movement.isManual(),
                movement.getCreatedAt()
        );
    }
}
