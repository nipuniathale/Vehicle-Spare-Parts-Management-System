package com.autohublanka.marketing.dto;

import com.autohublanka.marketing.price.Price;
import com.autohublanka.marketing.CampaignStatus;
import com.autohublanka.marketing.Discount;
import com.autohublanka.marketing.DiscountType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record DiscountResponse(
        Long id,
        Long sparePartId,
        String sparePartName,
        String sparePartSku,
        BigDecimal originalPrice,
        BigDecimal discountedPrice,
        String name,
        DiscountType type,
        BigDecimal value,
        LocalDate startDate,
        LocalDate endDate,
        boolean active,
        CampaignStatus status,
        LocalDateTime createdAt
) {
    public static DiscountResponse from(Discount discount) {
        var part = discount.getSparePart();
        return new DiscountResponse(
                discount.getId(),
                part.getId(),
                part.getName(),
                part.getSku(),
                part.getPrice(),
                Price.forPart(part, discount).getAmount(),
                discount.getName(),
                discount.getType(),
                discount.getValue(),
                discount.getStartDate(),
                discount.getEndDate(),
                discount.isActive(),
                discount.getStatus(),
                discount.getCreatedAt()
        );
    }
}
