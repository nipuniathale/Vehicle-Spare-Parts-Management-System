package com.autohublanka.catalog.dto;

import com.autohublanka.catalog.Fitment;

import java.time.LocalDateTime;

public record FitmentResponse(
        Long id,
        Long vehicleId,
        String vehicleName,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        String notes,
        LocalDateTime createdAt
) {
    public static FitmentResponse from(Fitment fitment) {
        return new FitmentResponse(
                fitment.getId(),
                fitment.getVehicle().getId(),
                fitment.getVehicle().getDisplayName(),
                fitment.getSparePart().getId(),
                fitment.getSparePart().getName(),
                fitment.getSparePart().getSku(),
                fitment.getNotes(),
                fitment.getCreatedAt()
        );
    }
}
