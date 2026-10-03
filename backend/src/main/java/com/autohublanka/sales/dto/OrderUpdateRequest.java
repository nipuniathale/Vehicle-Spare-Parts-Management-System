package com.autohublanka.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Delivery details that can be corrected before the order ships. */
public record OrderUpdateRequest(
        @NotBlank(message = "Delivery address is required")
        @Size(min = 10, max = 300, message = "Delivery address must be 10-300 characters")
        String deliveryAddress,

        @NotBlank(message = "Contact phone is required")
        @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String contactPhone,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note
) {
}
