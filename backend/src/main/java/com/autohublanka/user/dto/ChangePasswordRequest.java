package com.autohublanka.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** currentPassword is required unless the account was created with Google and has no password yet. */
public record ChangePasswordRequest(
        String currentPassword,

        @NotBlank(message = "New password is required")
        @Size(min = 6, max = 64, message = "New password must be 6-64 characters")
        String newPassword
) {
}
