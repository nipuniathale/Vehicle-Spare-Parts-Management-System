package com.autohublanka.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Sales staff could not find the transfer - the customer is told why and can send the details again. */
public record BankTransferRejectRequest(
        @NotBlank(message = "Please tell the customer why")
        @Size(max = 250, message = "Reason can have at most 250 characters")
        String reason
) {
}
