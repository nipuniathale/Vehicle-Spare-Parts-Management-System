package com.autohublanka.sales.dto;

import com.autohublanka.sales.PaymentMethod;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Two checkout modes:
 *  - Buy now : sparePartId + quantity (cart is not touched)
 *  - Cart    : sparePartId empty -> the customer's cart is ordered and then emptied
 * Phone and delivery address are asked here (not at registration)
 */
public record CheckoutRequest(
        Long sparePartId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @Max(value = 100, message = "You can order at most 100 of one item")
        Integer quantity,

        @NotBlank(message = "Delivery address is required")
        @Size(min = 10, max = 300, message = "Delivery address must be 10-300 characters")
        String deliveryAddress,

        @NotBlank(message = "Contact phone is required")
        @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String contactPhone,

        @Size(max = 40, message = "Coupon code is too long")
        String couponCode,

        @Size(max = 300, message = "Note can have at most 300 characters")
        String note,

        @NotNull(message = "Choose a payment method")
        PaymentMethod paymentMethod,

        /* true = also save the phone and address to the customer's profile for next time */
        Boolean saveDetails
) {
}
