package com.autohublanka.procurement.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GoodsReceiptRequest(
        @NotNull(message = "Purchase order line is required")
        Long purchaseOrderItemId,

        @NotNull(message = "Received quantity is required")
        @Min(value = 1, message = "Received quantity must be at least 1")
        @Max(value = 100000, message = "Received quantity is too large")
        Integer receivedQuantity,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note
) {
}
