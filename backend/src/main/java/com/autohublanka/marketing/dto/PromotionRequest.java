package com.autohublanka.marketing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record PromotionRequest(
        @NotBlank(message = "Title is required")
        @Size(min = 3, max = 120, message = "Title must be 3-120 characters")
        String title,

        @Size(max = 1000, message = "Description can have at most 1000 characters")
        String description,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl,

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        Boolean active,

        @Size(max = 20, message = "A promotion can feature at most 20 parts")
        List<Long> sparePartIds
) {
}
