package com.autohublanka.sales.dto;

import com.autohublanka.sales.PaymentMethod;
import com.autohublanka.sales.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Staff create / update of a payment record. */
public record PaymentRequest(
        @NotNull(message = "Order is required")
        Long orderId,

        @NotNull(message = "Payment method is required")
        PaymentMethod method,

        @NotNull(message = "Payment status is required")
        PaymentStatus status,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note
) {
}
