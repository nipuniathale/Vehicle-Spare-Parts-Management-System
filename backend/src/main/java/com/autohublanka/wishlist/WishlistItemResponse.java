package com.autohublanka.wishlist;

import com.autohublanka.catalog.dto.SparePartResponse;

import java.time.LocalDateTime;

/** One saved part, with its current price, discount and stock. */
public record WishlistItemResponse(Long id, LocalDateTime addedAt, SparePartResponse part) {
}
