package com.autohublanka.auth.dto;

import com.autohublanka.common.validation.GmailAddress;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public sign-up. Always creates a CUSTOMER account.
 * Phone number and delivery address are not asked here - they are collected at checkout.
 */
public record RegisterRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 60, message = "First name can have at most 60 characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 60, message = "Last name can have at most 60 characters")
        String lastName,

        @NotBlank(message = "Email is required")
        @GmailAddress
        @Size(max = 120, message = "Email can have at most 120 characters")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 64, message = "Password must be 6-64 characters")
        String password
) {
}
