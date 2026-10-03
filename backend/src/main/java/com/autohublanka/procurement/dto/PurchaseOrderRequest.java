package com.autohublanka.procurement.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record PurchaseOrderRequest(
        @NotNull(message = "Supplier is required")
        Long supplierId,

        /* the approved purchase request this order fulfils (required when creating) */
        Long purchaseRequestId,

        @FutureOrPresent(message = "Expected delivery date cannot be in the past")
        LocalDate expectedDeliveryDate,

        @NotBlank(message = "Delivery address is required")
        @Size(max = 300, message = "Delivery address can have at most 300 characters")
        String deliveryAddress,

        @Size(max = 500, message = "Note can have at most 500 characters")
        String note,

        @NotEmpty(message = "Add at least one item")
        @Size(max = 50, message = "An order can have at most 50 lines")
        List<@Valid PurchaseOrderItemRequest> items
) {
}
