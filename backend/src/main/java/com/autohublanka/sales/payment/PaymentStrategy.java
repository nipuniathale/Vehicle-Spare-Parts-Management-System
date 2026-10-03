package com.autohublanka.sales.payment;

import com.autohublanka.sales.Order;
import com.autohublanka.sales.Payment;

/**
 * STRATEGY pattern - the strategy interface (lecture example: PaymentStrategy.pay(amount)).
 * Each payment method takes the money in its own way; the PaymentContext only calls pay().
 * A new method (e.g. BankTransferStrategy) is one new class - existing code does not change (Open/Closed).
 */
public interface PaymentStrategy {

    /** Takes the money for the order and fills in the payment (status PAID, transaction id, note). */
    void pay(Order order, Payment payment, PaymentDetails details);
}
