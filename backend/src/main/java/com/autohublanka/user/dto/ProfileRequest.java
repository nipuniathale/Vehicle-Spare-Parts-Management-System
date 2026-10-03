package com.autohublanka.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** A logged-in user updating their own profile. */
public record ProfileRequest(
        @NotBlank(message = "First name is required")
        @Size(max = 60)
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 60)
        String lastName,

        @Pattern(regexp = "^$|^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String phone,

        @Size(max = 300)
        String address
) {
}
