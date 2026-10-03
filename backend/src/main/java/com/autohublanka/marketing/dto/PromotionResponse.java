package com.autohublanka.marketing.dto;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.marketing.CampaignStatus;
import com.autohublanka.marketing.Promotion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

public record PromotionResponse(
        Long id,
        String title,
        String description,
        String imageUrl,
        LocalDate startDate,
        LocalDate endDate,
        boolean active,
        CampaignStatus status,
        List<Part> spareParts,
        LocalDateTime createdAt
) {
    public record Part(Long id, String name, String sku, BigDecimal price, String imageUrl) {
        static Part from(SparePart part) {
            return new Part(part.getId(), part.getName(), part.getSku(), part.getPrice(), part.getImageUrl());
        }
    }

    public static PromotionResponse from(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getTitle(),
                promotion.getDescription(),
                promotion.getImageUrl(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.isActive(),
                promotion.getStatus(),
                promotion.getSpareParts().stream()
                        .sorted(Comparator.comparing(SparePart::getName))
                        .map(Part::from)
                        .toList(),
                promotion.getCreatedAt()
        );
    }
}
