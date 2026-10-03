package com.autohublanka.support.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotNull(message = "Order item is required")
        Long orderItemId,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be 1-5")
        @Max(value = 5, message = "Rating must be 1-5")
        Integer rating,

        @Size(max = 1000, message = "Comment can have at most 1000 characters")
        String comment
) {
}
