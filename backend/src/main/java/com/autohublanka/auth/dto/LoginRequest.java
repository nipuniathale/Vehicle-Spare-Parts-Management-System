package com.autohublanka.auth.dto;

import com.autohublanka.common.validation.ValidEmail;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email is required")
        @ValidEmail
        String email,

        @NotBlank(message = "Password is required")
        String password
) {
}
