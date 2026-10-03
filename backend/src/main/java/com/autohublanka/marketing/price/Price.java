package com.autohublanka.marketing.price;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.marketing.Discount;

import java.math.BigDecimal;

/**
 * DECORATOR pattern - the component.
 * A price can be wrapped by any number of decorators (product discount, coupon ...), each one
 * changing the amount and adding to the description, like the coffee add-ons in the lecture:
 * <pre>
 *   new CouponDecorator(new DiscountDecorator(new BasePrice(part), discount), coupon)
 *   -> "Front Brake Pad Set - 10% off pads - coupon SAVE500"
 * </pre>
 */
public interface Price {

    BigDecimal getAmount();

    String getDescription();

    /** Selling price of a part today: the base price, wrapped with the running discount if there is one. */
    static Price forPart(SparePart part, Discount runningDiscount) {
        Price price = new BasePrice(part);
        return runningDiscount == null ? price : new DiscountDecorator(price, runningDiscount);
    }
}
