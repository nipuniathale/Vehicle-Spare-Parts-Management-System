package com.autohublanka.catalog.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FitmentRequest(
        @NotNull(message = "Vehicle is required")
        Long vehicleId,

        @NotNull(message = "Spare part is required")
        Long sparePartId,

        @Size(max = 300, message = "Notes can have at most 300 characters")
        String notes
) {
}
