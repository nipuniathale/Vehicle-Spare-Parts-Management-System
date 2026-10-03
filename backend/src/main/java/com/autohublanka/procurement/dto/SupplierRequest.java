package com.autohublanka.procurement.dto;

import com.autohublanka.common.validation.ValidEmail;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * portalPassword is optional: when given, a SUPPLIER login is created (or its password reset)
 * using the supplier email, so the supplier can open the supplier dashboard.
 */
public record SupplierRequest(
        @NotBlank(message = "Supplier name is required")
        @Size(min = 2, max = 120, message = "Supplier name must be 2-120 characters")
        String name,

        @NotBlank(message = "Email is required")
        @ValidEmail
        @Size(max = 120)
        String email,

        @NotBlank(message = "Phone is required")
        @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String phone,

        @Size(max = 80, message = "Contact person can have at most 80 characters")
        String contactPerson,

        @Size(max = 300, message = "Address can have at most 300 characters")
        String address,

        Boolean active,

        @Size(min = 6, max = 64, message = "Portal password must be 6-64 characters")
        String portalPassword
) {
}
