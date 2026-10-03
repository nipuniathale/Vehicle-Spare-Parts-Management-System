package com.autohublanka.marketing.dto;

import com.autohublanka.marketing.CampaignStatus;
import com.autohublanka.marketing.Coupon;
import com.autohublanka.marketing.DiscountType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CouponResponse(
        Long id,
        String code,
        String description,
        DiscountType type,
        BigDecimal value,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        int usageLimit,
        int usedCount,
        LocalDate startDate,
        LocalDate endDate,
        boolean active,
        CampaignStatus status,
        LocalDateTime createdAt
) {
    public static CouponResponse from(Coupon coupon) {
        return new CouponResponse(
                coupon.getId(),
                coupon.getCode(),
                coupon.getDescription(),
                coupon.getType(),
                coupon.getValue(),
                coupon.getMinOrderAmount(),
                coupon.getMaxDiscountAmount(),
                coupon.getUsageLimit(),
                coupon.getUsedCount(),
                coupon.getStartDate(),
                coupon.getEndDate(),
                coupon.isActive(),
                coupon.getStatus(),
                coupon.getCreatedAt()
        );
    }
}
