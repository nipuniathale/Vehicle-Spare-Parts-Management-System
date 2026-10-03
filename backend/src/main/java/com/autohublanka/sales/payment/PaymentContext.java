package com.autohublanka.sales.payment;

import com.autohublanka.sales.Order;
import com.autohublanka.sales.Payment;

/**
 * STRATEGY pattern - the context (lecture example: ShoppingCart).
 * It does not know how a payment is made; it keeps a reference to a PaymentStrategy and uses it.
 */
public class PaymentContext {

    private PaymentStrategy paymentStrategy;

    public PaymentContext(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }

    public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }

    public void pay(Order order, Payment payment, PaymentDetails details) {
        paymentStrategy.pay(order, payment, details);
    }
}
