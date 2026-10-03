package com.autohublanka.marketing.price;

import com.autohublanka.marketing.Discount;
import com.autohublanka.marketing.DiscountType;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** DECORATOR pattern - concrete decorator: a product discount (percentage or fixed amount off). Never below zero. */
public class DiscountDecorator extends PriceDecorator {

    private final Discount discount;

    public DiscountDecorator(Price price, Discount discount) {
        super(price);
        this.discount = discount;
    }

    @Override
    public BigDecimal getAmount() {
        BigDecimal price = decoratedPrice.getAmount();
        BigDecimal reduced = discount.getType() == DiscountType.PERCENTAGE
                ? price.subtract(price.multiply(discount.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP))
                : price.subtract(discount.getValue());
        return reduced.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public String getDescription() {
        return decoratedPrice.getDescription() + " - " + discount.getName();
    }
}
