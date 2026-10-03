package com.autohublanka.catalog.dto;

import com.autohublanka.catalog.Category;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        String imageUrl,
        boolean active,
        long partCount,
        LocalDateTime createdAt
) {
    public static CategoryResponse from(Category category, long partCount) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getImageUrl(),
                category.isActive(),
                partCount,
                category.getCreatedAt()
        );
    }
}
