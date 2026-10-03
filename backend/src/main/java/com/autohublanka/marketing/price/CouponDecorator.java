package com.autohublanka.marketing.price;

import com.autohublanka.marketing.Coupon;
import com.autohublanka.marketing.DiscountType;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * DECORATOR pattern - concrete decorator: a coupon on the order amount.
 * Percentage or fixed amount, limited by the coupon's maximum discount, only when the minimum order is reached.
 */
public class CouponDecorator extends PriceDecorator {

    private final Coupon coupon;

    public CouponDecorator(Price price, Coupon coupon) {
        super(price);
        this.coupon = coupon;
    }

    /** How much the coupon takes off the wrapped amount. */
    public BigDecimal getSaving() {
        BigDecimal amount = decoratedPrice.getAmount();
        if (coupon.getMinOrderAmount() != null && amount.compareTo(coupon.getMinOrderAmount()) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal saving = coupon.getType() == DiscountType.PERCENTAGE
                ? amount.multiply(coupon.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : coupon.getValue();
        if (coupon.getMaxDiscountAmount() != null && coupon.getMaxDiscountAmount().signum() > 0) {
            saving = saving.min(coupon.getMaxDiscountAmount());
        }
        return saving.min(amount).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public BigDecimal getAmount() {
        return decoratedPrice.getAmount().subtract(getSaving());
    }

    @Override
    public String getDescription() {
        return decoratedPrice.getDescription() + " - coupon " + coupon.getCode();
    }
}
