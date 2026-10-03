package com.autohublanka.sales.payment;

import com.autohublanka.sales.Order;
import com.autohublanka.sales.Payment;
import com.autohublanka.sales.PaymentStatus;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * STRATEGY pattern - concrete strategy: cash on delivery.
 * The payment stays PENDING after checkout; pay() is called when the order is marked DELIVERED
 * (the courier has collected the cash).
 */
public class CashOnDeliveryStrategy implements PaymentStrategy {

    @Override
    public void pay(Order order, Payment payment, PaymentDetails details) {
        payment.setTransactionId("COD-" + UUID.randomUUID().toString().substring(0, 13).toUpperCase());
        payment.setNote("Cash collected on delivery");
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        order.setPaymentStatus(PaymentStatus.PAID);
    }
}
