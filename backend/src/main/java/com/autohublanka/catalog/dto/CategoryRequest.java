package com.autohublanka.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        @Size(min = 2, max = 80, message = "Category name must be 2-80 characters")
        String name,

        @Size(max = 500, message = "Description can have at most 500 characters")
        String description,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl,

        Boolean active
) {
}
