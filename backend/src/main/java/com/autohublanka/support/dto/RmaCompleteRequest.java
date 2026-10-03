package com.autohublanka.support.dto;

import com.autohublanka.support.RmaStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Finish an approved claim with a refund or a replacement. */
public record RmaCompleteRequest(
        @NotNull(message = "Resolution is required (REFUNDED or REPLACED)")
        RmaStatus resolution,

        @DecimalMin(value = "0.01", message = "Refund amount must be greater than 0")
        @Digits(integer = 10, fraction = 2)
        BigDecimal refundAmount,

        @Size(max = 1000, message = "Note can have at most 1000 characters")
        String note
) {
}
