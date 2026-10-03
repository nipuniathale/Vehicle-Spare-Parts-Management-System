package com.autohublanka.support.dto;

import com.autohublanka.support.Feedback;

import java.time.LocalDateTime;

public record FeedbackResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerImageUrl,
        Long orderId,
        String subject,
        String message,
        int rating,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static FeedbackResponse from(Feedback feedback) {
        var customer = feedback.getCustomer();
        return new FeedbackResponse(
                feedback.getId(),
                customer.getId(),
                customer.getFirstName() + " " + customer.getLastName().charAt(0) + ".",
                customer.getProfileImageUrl(),
                feedback.getOrder() == null ? null : feedback.getOrder().getId(),
                feedback.getSubject(),
                feedback.getMessage(),
                feedback.getRating(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt()
        );
    }
}
