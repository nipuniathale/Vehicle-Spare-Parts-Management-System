package com.autohublanka.sales.dto;

import com.autohublanka.sales.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Sales staff create an order for a registered customer (e.g. a phone or walk-in order). */
public record StaffOrderRequest(
        @NotNull(message = "Choose the customer")
        Long customerId,

        @NotEmpty(message = "Add at least one item")
        @Size(max = 30, message = "An order can have at most 30 lines")
        List<@Valid OrderLineRequest> items,

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
        PaymentMethod paymentMethod
) {
}
