package com.autohublanka.inventory.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * sparePartId and quantity are used only when creating the record (opening stock).
 * After that, quantity changes only through stock movements so every change is audited.
 */
public record InventoryRequest(
        Long sparePartId,

        @PositiveOrZero(message = "Quantity cannot be negative")
        @Max(value = 100000, message = "Quantity is too large")
        Integer quantity,

        @NotNull(message = "Reorder level is required")
        @PositiveOrZero(message = "Reorder level cannot be negative")
        @Max(value = 100000, message = "Reorder level is too large")
        Integer reorderLevel,

        @Size(max = 80, message = "Location can have at most 80 characters")
        String location
) {
}
