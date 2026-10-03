package com.autohublanka.procurement.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * One delivery from a supplier: the purchase order it belongs to and how many units of each line arrived.
 * Lines with quantity 0 are skipped (nothing of that part came in this delivery).
 */
public record ReceiveGoodsRequest(
        @NotNull(message = "Choose the purchase order")
        Long purchaseOrderId,

        @NotEmpty(message = "Enter the received quantities")
        List<@Valid Line> lines,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note
) {
    public record Line(
            @NotNull(message = "Purchase order line is required")
            Long purchaseOrderItemId,

            @NotNull(message = "Received quantity is required")
            @Min(value = 0, message = "Received quantity cannot be negative")
            @Max(value = 100000, message = "Received quantity is too large")
            Integer receivedQuantity
    ) {
    }
}
