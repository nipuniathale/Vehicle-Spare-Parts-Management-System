package com.autohublanka.inventory.dto;

import com.autohublanka.inventory.Inventory;

import java.time.LocalDateTime;

public record InventoryResponse(
        Long id,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        int quantity,
        int reorderLevel,
        String location,
        boolean lowStock,
        LocalDateTime updatedAt
) {
    public static InventoryResponse from(Inventory inventory) {
        return new InventoryResponse(
                inventory.getId(),
                inventory.getSparePart().getId(),
                inventory.getSparePart().getName(),
                inventory.getSparePart().getSku(),
                inventory.getQuantity(),
                inventory.getReorderLevel(),
                inventory.getLocation(),
                inventory.isLowStock(),
                inventory.getUpdatedAt()
        );
    }
}
