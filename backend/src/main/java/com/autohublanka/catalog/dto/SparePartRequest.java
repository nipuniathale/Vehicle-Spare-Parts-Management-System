package com.autohublanka.catalog.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * initialStock / reorderLevel / location are only used when creating a part:
 * they create the part's inventory record in the same step.
 */
public record SparePartRequest(
        @NotBlank(message = "Part name is required")
        @Size(min = 2, max = 120, message = "Part name must be 2-120 characters")
        String name,

        @NotBlank(message = "SKU is required")
        @Pattern(regexp = "^[A-Za-z0-9-]{3,40}$", message = "SKU must be 3-40 letters, digits or dashes")
        String sku,

        @Size(max = 80, message = "Brand can have at most 80 characters")
        String brand,

        @Size(max = 1000, message = "Description can have at most 1000 characters")
        String description,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        @DecimalMax(value = "10000000", message = "Price is too large")
        @Digits(integer = 10, fraction = 2, message = "Price can have at most 2 decimal places")
        BigDecimal price,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl,

        @NotNull(message = "Warranty period is required (use 0 for no warranty)")
        @Min(value = 0, message = "Warranty cannot be negative")
        @Max(value = 60, message = "Warranty can be at most 60 months")
        Integer warrantyMonths,

        @NotNull(message = "Category is required")
        Long categoryId,

        Boolean active,

        @PositiveOrZero(message = "Initial stock cannot be negative")
        @Max(value = 100000, message = "Initial stock is too large")
        Integer initialStock,

        @PositiveOrZero(message = "Reorder level cannot be negative")
        @Max(value = 100000, message = "Reorder level is too large")
        Integer reorderLevel,

        @Size(max = 80, message = "Location can have at most 80 characters")
        String location
) {
}
