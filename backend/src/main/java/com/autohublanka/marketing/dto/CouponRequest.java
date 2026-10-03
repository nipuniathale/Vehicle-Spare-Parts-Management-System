package com.autohublanka.marketing.dto;

import com.autohublanka.marketing.DiscountType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CouponRequest(
        @NotBlank(message = "Coupon code is required")
        @Pattern(regexp = "^[A-Za-z0-9]{4,20}$", message = "Code must be 4-20 letters or digits (no spaces)")
        String code,

        @Size(max = 300, message = "Description can have at most 300 characters")
        String description,

        @NotNull(message = "Discount type is required")
        DiscountType type,

        @NotNull(message = "Value is required")
        @DecimalMin(value = "0.01", message = "Value must be greater than 0")
        @Digits(integer = 10, fraction = 2)
        BigDecimal value,

        @NotNull(message = "Minimum order amount is required (use 0 for none)")
        @DecimalMin(value = "0", message = "Minimum order amount cannot be negative")
        @Digits(integer = 10, fraction = 2)
        BigDecimal minOrderAmount,

        @DecimalMin(value = "0", message = "Maximum discount cannot be negative")
        @Digits(integer = 10, fraction = 2)
        BigDecimal maxDiscountAmount,

        @NotNull(message = "Usage limit is required (use 0 for unlimited)")
        @PositiveOrZero(message = "Usage limit cannot be negative")
        @Max(value = 1000000, message = "Usage limit is too large")
        Integer usageLimit,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        Boolean active
) {
}
