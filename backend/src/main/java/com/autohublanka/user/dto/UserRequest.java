package com.autohublanka.user.dto;

import com.autohublanka.common.validation.ValidEmail;
import com.autohublanka.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Used by admins to create or update any account.
 * Password is required on create and optional on update (blank = keep current).
 */
public record UserRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 60, message = "First name can have at most 60 characters")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 60, message = "Last name can have at most 60 characters")
        String lastName,

        @NotBlank(message = "Email is required")
        @ValidEmail
        @Size(max = 120)
        String email,

        @Size(min = 6, max = 64, message = "Password must be 6-64 characters")
        String password,

        @Pattern(regexp = "^$|^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String phone,

        @Size(max = 300, message = "Address can have at most 300 characters")
        String address,

        @NotNull(message = "Role is required")
        Role role,

        Boolean active
) {
}
