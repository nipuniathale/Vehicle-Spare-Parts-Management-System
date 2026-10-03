package com.autohublanka.marketing.price;

import java.math.BigDecimal;

/** DECORATOR pattern - the abstract decorator. It wraps another Price and passes calls on to it by default. */
public abstract class PriceDecorator implements Price {

    protected final Price decoratedPrice;

    protected PriceDecorator(Price price) {
        this.decoratedPrice = price;
    }

    @Override
    public BigDecimal getAmount() {
        return decoratedPrice.getAmount();
    }

    @Override
    public String getDescription() {
        return decoratedPrice.getDescription();
    }
}
