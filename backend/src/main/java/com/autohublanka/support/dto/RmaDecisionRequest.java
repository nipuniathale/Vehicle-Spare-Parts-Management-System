package com.autohublanka.support.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RmaDecisionRequest(
        @NotNull(message = "Choose approve or reject")
        Boolean approve,

        @Size(max = 1000, message = "Note can have at most 1000 characters")
        String note
) {
}
