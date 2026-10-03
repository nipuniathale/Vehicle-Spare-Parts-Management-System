package com.autohublanka.support.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FeedbackRequest(
        /* optional - the order the feedback is about */
        Long orderId,

        @NotBlank(message = "Subject is required")
        @Size(min = 3, max = 150, message = "Subject must be 3-150 characters")
        String subject,

        @NotBlank(message = "Message is required")
        @Size(min = 5, max = 2000, message = "Message must be 5-2000 characters")
        String message,

        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be 1-5")
        @Max(value = 5, message = "Rating must be 1-5")
        Integer rating
) {
}
