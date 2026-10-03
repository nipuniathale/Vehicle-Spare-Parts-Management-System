package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.PurchaseOrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PurchaseOrderStatusRequest(
        @NotNull(message = "Status is required")
        PurchaseOrderStatus status,

        @Size(max = 500, message = "Note can have at most 500 characters")
        String note
) {
}
