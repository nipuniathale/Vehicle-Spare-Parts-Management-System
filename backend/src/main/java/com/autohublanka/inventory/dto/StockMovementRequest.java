package com.autohublanka.inventory.dto;

import com.autohublanka.inventory.MovementType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StockMovementRequest(
        @NotNull(message = "Inventory record is required")
        Long inventoryId,

        @NotNull(message = "Movement type is required")
        MovementType type,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100000, message = "Quantity is too large")
        Integer quantity,

        @Size(max = 60, message = "Reference can have at most 60 characters")
        String reference,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note
) {
}
