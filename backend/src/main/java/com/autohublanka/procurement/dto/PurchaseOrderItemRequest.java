package com.autohublanka.procurement.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PurchaseOrderItemRequest(
        @NotNull(message = "Spare part is required")
        Long sparePartId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100000, message = "Quantity is too large")
        Integer quantity,

        @NotNull(message = "Unit cost is required")
        @DecimalMin(value = "0.01", message = "Unit cost must be greater than 0")
        @DecimalMax(value = "10000000", message = "Unit cost is too large")
        @Digits(integer = 10, fraction = 2, message = "Unit cost can have at most 2 decimal places")
        BigDecimal unitCost
) {
}
