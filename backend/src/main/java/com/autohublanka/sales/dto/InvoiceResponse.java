package com.autohublanka.sales.dto;

import com.autohublanka.sales.Invoice;
import com.autohublanka.settings.AppSettings;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Everything needed to show / print an invoice, including the shop's details from Settings. */
public record InvoiceResponse(
        Long id,
        String invoiceNumber,
        LocalDate issueDate,
        BigDecimal amount,
        Long orderId,
        String customerName,
        String customerEmail,
        String paymentStatus,
        String paymentMethod,
        String transactionId,
        LocalDateTime paidAt,
        OrderResponse order,
        AppSettings.Public store
) {
    public static InvoiceResponse from(Invoice invoice, OrderResponse order, AppSettings.Public store) {
        var o = invoice.getOrder();
        var payment = invoice.getPayment();
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getIssueDate(),
                invoice.getAmount(),
                o.getId(),
                o.getCustomer().getFullName(),
                o.getCustomer().getEmail(),
                o.getPaymentStatus().name(),
                payment == null ? null : payment.getMethod().name(),
                payment == null ? null : payment.getTransactionId(),
                payment == null ? null : payment.getPaidAt(),
                order,
                store
        );
    }
}
