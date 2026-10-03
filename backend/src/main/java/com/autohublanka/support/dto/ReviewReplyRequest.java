package com.autohublanka.support.dto;

import jakarta.validation.constraints.Size;

/** Staff reply to a review. An empty reply removes the existing one. */
public record ReviewReplyRequest(
        @Size(max = 1000, message = "Reply can have at most 1000 characters")
        String reply
) {
}
