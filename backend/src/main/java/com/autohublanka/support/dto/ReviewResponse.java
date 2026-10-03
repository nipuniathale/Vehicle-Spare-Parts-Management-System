package com.autohublanka.support.dto;

import com.autohublanka.support.Review;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long customerId,
        String customerName,
        String customerImageUrl,
        Long sparePartId,
        String sparePartName,
        Long orderId,
        Long orderItemId,
        int rating,
        String comment,
        String staffReply,
        String repliedBy,
        LocalDateTime repliedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ReviewResponse from(Review review) {
        var customer = review.getCustomer();
        return new ReviewResponse(
                review.getId(),
                customer.getId(),
                customer.getFirstName() + " " + customer.getLastName().charAt(0) + ".",
                customer.getProfileImageUrl(),
                review.getSparePart().getId(),
                review.getSparePart().getName(),
                review.getOrderItem().getOrder().getId(),
                review.getOrderItem().getId(),
                review.getRating(),
                review.getComment(),
                review.getStaffReply(),
                review.getRepliedByName(),
                review.getRepliedAt(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
