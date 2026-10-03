package com.autohublanka.catalog.dto;

import com.autohublanka.marketing.price.Price;
import com.autohublanka.catalog.SparePart;
import com.autohublanka.marketing.Discount;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SparePartResponse(
        Long id,
        String name,
        String sku,
        String brand,
        String description,
        BigDecimal price,
        BigDecimal finalPrice,
        String discountName,
        String imageUrl,
        int warrantyMonths,
        boolean active,
        Long categoryId,
        String categoryName,
        Integer stockQuantity,
        boolean inStock,
        Double averageRating,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    /**
     * @param stock    current stock or null when the part has no inventory record yet
     * @param discount discount running today or null
     */
    public static SparePartResponse from(SparePart part, Integer stock, Discount discount, Double averageRating) {
        BigDecimal finalPrice = Price.forPart(part, discount).getAmount();
        return new SparePartResponse(
                part.getId(),
                part.getName(),
                part.getSku(),
                part.getBrand(),
                part.getDescription(),
                part.getPrice(),
                finalPrice,
                discount == null ? null : discount.getName(),
                part.getImageUrl(),
                part.getWarrantyMonths(),
                part.isActive(),
                part.getCategory().getId(),
                part.getCategory().getName(),
                stock,
                stock != null && stock > 0,
                averageRating,
                part.getCreatedAt(),
                part.getUpdatedAt()
        );
    }
}
