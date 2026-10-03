package com.autohublanka.wishlist;

import jakarta.validation.constraints.NotNull;

public record WishlistRequest(
        @NotNull(message = "Spare part is required")
        Long sparePartId
) {
}
