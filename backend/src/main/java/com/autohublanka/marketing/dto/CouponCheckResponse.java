package com.autohublanka.marketing.dto;

import java.math.BigDecimal;

public record CouponCheckResponse(String code, BigDecimal discountAmount, String description) {
}
