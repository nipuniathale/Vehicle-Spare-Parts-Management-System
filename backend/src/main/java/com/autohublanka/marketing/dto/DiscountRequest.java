package com.autohublanka.marketing.dto;

import com.autohublanka.marketing.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DiscountRequest(
        @NotNull(message = "Spare part is required")
        Long sparePartId,

        @NotBlank(message = "Discount name is required")
        @Size(min = 3, max = 120, message = "Name must be 3-120 characters")
        String name,

        @NotNull(message = "Discount type is required")
        DiscountType type,

        @NotNull(message = "Value is required")
        @DecimalMin(value = "0.01", message = "Value must be greater than 0")
        @Digits(integer = 10, fraction = 2, message = "Value can have at most 2 decimal places")
        BigDecimal value,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        Boolean active
) {
}
