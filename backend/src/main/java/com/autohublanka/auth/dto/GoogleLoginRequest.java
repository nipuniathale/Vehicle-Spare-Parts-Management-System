package com.autohublanka.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** The ID token (credential) returned to the browser by the "Sign in with Google" button. */
public record GoogleLoginRequest(
        @NotBlank(message = "Google credential is missing")
        String credential
) {
}
