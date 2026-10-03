package com.autohublanka.procurement.dto;

import jakarta.validation.constraints.Size;

/** Approve / reject a purchase request. */
public record ReviewDecisionRequest(
        @Size(max = 500, message = "Note can have at most 500 characters")
        String note
) {
}
