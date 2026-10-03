package com.autohublanka.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VehicleRequest(
        @NotBlank(message = "Make is required")
        @Size(max = 60, message = "Make can have at most 60 characters")
        String make,

        @NotBlank(message = "Model is required")
        @Size(max = 60, message = "Model can have at most 60 characters")
        String model,

        @NotNull(message = "Year is required")
        @Min(value = 1950, message = "Year must be 1950 or later")
        @Max(value = 2100, message = "Year is not valid")
        Integer year,

        @Size(max = 60, message = "Variant can have at most 60 characters")
        String variant,

        @Size(max = 40, message = "Engine can have at most 40 characters")
        String engine,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl
) {
}
