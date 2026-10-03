package com.autohublanka.wishlist;

import com.autohublanka.sales.dto.CartResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The logged-in customer's wishlist. Items are addressed by spare part id. */
@RestController
@RequestMapping("/api/wishlist")
@PreAuthorize("hasRole('CUSTOMER')")
public class WishlistController {

    private final WishlistService wishlistService;

    public WishlistController(WishlistService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public List<WishlistItemResponse> mine() {
        return wishlistService.mine();
    }

    @PostMapping
    public List<WishlistItemResponse> add(@Valid @RequestBody WishlistRequest request) {
        return wishlistService.add(request.sparePartId());
    }

    @DeleteMapping("/{sparePartId}")
    public List<WishlistItemResponse> remove(@PathVariable Long sparePartId) {
        return wishlistService.remove(sparePartId);
    }

    @PostMapping("/{sparePartId}/move-to-cart")
    public CartResponse moveToCart(@PathVariable Long sparePartId) {
        return wishlistService.moveToCart(sparePartId);
    }
}
