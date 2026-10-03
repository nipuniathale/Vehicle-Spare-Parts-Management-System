package com.autohublanka.sales;

import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Creates the invoice of a paid order. Called right after a payment becomes PAID
 * (online card, cash collected on delivery, or recorded by staff). There is no manual invoice screen.
 */
@Component
public class InvoiceGenerator {

    private final InvoiceRepository invoiceRepository;

    public InvoiceGenerator(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    /** Safe to call twice: an order only ever gets one invoice. */
    public Invoice generateFor(Payment payment) {
        Order order = payment.getOrder();
        return invoiceRepository.findByOrderId(order.getId()).orElseGet(() -> {
            Invoice invoice = new Invoice();
            invoice.setOrder(order);
            invoice.setPayment(payment);
            invoice.setAmount(order.getTotalAmount());
            invoice.setIssueDate(LocalDate.now());
            invoice.setInvoiceNumber(String.format("INV-%d-%05d", LocalDate.now().getYear(), order.getId()));
            return invoiceRepository.save(invoice);
        });
    }
}
