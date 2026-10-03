package com.autohublanka.sales.payment;

import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.Payment;
import com.autohublanka.sales.PaymentStatus;

import java.time.LocalDateTime;

/**
 * STRATEGY pattern - concrete strategy: bank transfer.
 * The customer transfers the money to the store's account and uploads the bank slip; sales staff check the slip
 * against the bank account and confirm it, which completes the payment with this strategy.
 */
public class BankTransferStrategy implements PaymentStrategy {

    @Override
    public void pay(Order order, Payment payment, PaymentDetails details) {
        if (payment.getSlipUrl() == null) {
            throw new BusinessException("The customer has not uploaded the bank slip yet");
        }
        String staff = details == null || details.confirmedBy() == null ? "sales staff" : details.confirmedBy();
        String reference = payment.getBankReference();
        payment.setTransactionId(reference != null
                ? "BT-" + reference.replace(" ", "").toUpperCase()
                : String.format("BT-%d-%06d", order.getId(), payment.getId()));
        payment.setNote("Bank transfer confirmed from the bank slip" + (reference == null ? "" : " (ref " + reference + ")") + " by " + staff);
        payment.setStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        order.setPaymentStatus(PaymentStatus.PAID);
    }
}
