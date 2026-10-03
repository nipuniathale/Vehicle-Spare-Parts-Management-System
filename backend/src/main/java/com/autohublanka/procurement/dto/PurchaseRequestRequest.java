package com.autohublanka.procurement.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PurchaseRequestRequest(
        @NotNull(message = "Spare part is required")
        Long sparePartId,

        @NotNull(message = "Supplier is required")
        Long supplierId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100000, message = "Quantity is too large")
        Integer quantity,

        @Size(max = 500, message = "Reason can have at most 500 characters")
        String reason
) {
}
