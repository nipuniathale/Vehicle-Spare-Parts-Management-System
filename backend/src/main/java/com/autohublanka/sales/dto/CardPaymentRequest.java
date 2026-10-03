package com.autohublanka.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Simulated card payment - card data is validated but never stored (only the last 4 digits). */
public record CardPaymentRequest(
        @NotBlank(message = "Card holder name is required")
        @Size(max = 80)
        String cardHolder,

        @NotBlank(message = "Card number is required")
        @Pattern(regexp = "^[0-9]{16}$", message = "Card number must be 16 digits")
        String cardNumber,

        @NotBlank(message = "Expiry date is required")
        @Pattern(regexp = "^(0[1-9]|1[0-2])/[0-9]{2}$", message = "Expiry must be MM/YY")
        String expiry,

        @NotBlank(message = "CVV is required")
        @Pattern(regexp = "^[0-9]{3}$", message = "CVV must be 3 digits")
        String cvv
) {
}
