package com.autohublanka.catalog.dto;

import com.autohublanka.catalog.Vehicle;

import java.time.LocalDateTime;

public record VehicleResponse(
        Long id,
        String make,
        String model,
        int year,
        String variant,
        String engine,
        String imageUrl,
        String displayName,
        long fitmentCount,
        LocalDateTime createdAt
) {
    public static VehicleResponse from(Vehicle vehicle, long fitmentCount) {
        return new VehicleResponse(
                vehicle.getId(),
                vehicle.getMake(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getVariant(),
                vehicle.getEngine(),
                vehicle.getImageUrl(),
                vehicle.getDisplayName(),
                fitmentCount,
                vehicle.getCreatedAt()
        );
    }
}
