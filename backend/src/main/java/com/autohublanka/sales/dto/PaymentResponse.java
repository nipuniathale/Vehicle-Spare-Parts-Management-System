package com.autohublanka.sales.dto;

import com.autohublanka.sales.Payment;
import com.autohublanka.sales.PaymentMethod;
import com.autohublanka.sales.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long id,
        Long orderId,
        String customerName,
        BigDecimal amount,
        PaymentMethod method,
        PaymentStatus status,
        String transactionId,
        String note,
        LocalDateTime paidAt,
        String bankReference,
        String slipUrl,
        LocalDateTime transferSubmittedAt,
        LocalDateTime createdAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getOrder().getCustomer().getFullName(),
                payment.getAmount(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getTransactionId(),
                payment.getNote(),
                payment.getPaidAt(),
                payment.getBankReference(),
                payment.getSlipUrl(),
                payment.getTransferSubmittedAt(),
                payment.getCreatedAt()
        );
    }
}
