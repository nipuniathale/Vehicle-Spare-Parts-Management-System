package com.autohublanka.support.dto;

import com.autohublanka.support.RmaReason;
import com.autohublanka.support.RmaType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RmaRequest(
        @NotNull(message = "Order item is required")
        Long orderItemId,

        @NotNull(message = "Claim type is required")
        RmaType type,

        @NotNull(message = "Reason is required")
        RmaReason reason,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100, message = "Quantity is too large")
        Integer quantity,

        @NotBlank(message = "Please describe the problem")
        @Size(min = 10, max = 1000, message = "Description must be 10-1000 characters")
        String description,

        @Size(max = 5, message = "You can attach at most 5 photos")
        List<@Size(max = 500, message = "Image URL is too long") String> imageUrls
) {
}
