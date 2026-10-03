package com.autohublanka.marketing.price;

import com.autohublanka.catalog.SparePart;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** DECORATOR pattern - the concrete component: a plain amount with nothing taken off. */
public class BasePrice implements Price {

    private final BigDecimal amount;
    private final String description;

    /** The list price of a spare part. */
    public BasePrice(SparePart part) {
        this(part.getPrice(), part.getName());
    }

    /** Any amount, e.g. the subtotal of an order before the coupon. */
    public BasePrice(BigDecimal amount, String description) {
        this.amount = amount.setScale(2, RoundingMode.HALF_UP);
        this.description = description;
    }

    @Override
    public BigDecimal getAmount() {
        return amount;
    }

    @Override
    public String getDescription() {
        return description;
    }
}
