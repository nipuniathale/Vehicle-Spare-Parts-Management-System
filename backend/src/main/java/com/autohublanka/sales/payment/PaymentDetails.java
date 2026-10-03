package com.autohublanka.sales.payment;

import com.autohublanka.sales.dto.CardPaymentRequest;

/**
 * Whatever a strategy needs to complete a payment.
 * Card payments need the card; a bank transfer needs the name of the staff member who confirmed it; cash needs nothing.
 */
public record PaymentDetails(CardPaymentRequest card, String confirmedBy) {

    public static PaymentDetails none() {
        return new PaymentDetails(null, null);
    }

    public static PaymentDetails card(CardPaymentRequest card) {
        return new PaymentDetails(card, null);
    }

    public static PaymentDetails confirmedBy(String staffName) {
        return new PaymentDetails(null, staffName);
    }
}
