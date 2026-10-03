package com.autohublanka.wishlist;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.catalog.SparePartService;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.sales.CartService;
import com.autohublanka.sales.dto.CartItemRequest;
import com.autohublanka.sales.dto.CartResponse;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class WishlistService {

    private final WishlistItemRepository wishlistRepository;
    private final SparePartRepository sparePartRepository;
    private final SparePartService sparePartService;
    private final CartService cartService;
    private final CurrentUser currentUser;

    public WishlistService(WishlistItemRepository wishlistRepository,
                           SparePartRepository sparePartRepository,
                           SparePartService sparePartService,
                           CartService cartService,
                           CurrentUser currentUser) {
        this.wishlistRepository = wishlistRepository;
        this.sparePartRepository = sparePartRepository;
        this.sparePartService = sparePartService;
        this.cartService = cartService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<WishlistItemResponse> mine() {
        return wishlistRepository.findForCustomer(currentUser.get().getId()).stream()
                .map(item -> new WishlistItemResponse(item.getId(), item.getCreatedAt(),
                        sparePartService.toResponse(item.getSparePart())))
                .toList();
    }

    /** Adding a part that is already saved simply returns the list (no duplicates). */
    public List<WishlistItemResponse> add(Long sparePartId) {
        User customer = currentUser.get();
        SparePart part = sparePartRepository.findById(sparePartId)
                .orElseThrow(() -> NotFoundException.of("Spare part", sparePartId));
        if (!part.isActive()) {
            throw new BusinessException("'" + part.getName() + "' is no longer sold");
        }
        if (!wishlistRepository.existsByCustomerIdAndSparePartId(customer.getId(), sparePartId)) {
            WishlistItem item = new WishlistItem();
            item.setCustomer(customer);
            item.setSparePart(part);
            wishlistRepository.save(item);
        }
        return mine();
    }

    public List<WishlistItemResponse> remove(Long sparePartId) {
        wishlistRepository.delete(own(sparePartId));
        wishlistRepository.flush();
        return mine();
    }

    /** Puts one unit in the cart (stock is checked) and takes the part off the wishlist. */
    public CartResponse moveToCart(Long sparePartId) {
        WishlistItem item = own(sparePartId);
        CartResponse cart = cartService.addItem(new CartItemRequest(sparePartId, 1));
        wishlistRepository.delete(item);
        return cart;
    }

    private WishlistItem own(Long sparePartId) {
        return wishlistRepository.findByCustomerIdAndSparePartId(currentUser.get().getId(), sparePartId)
                .orElseThrow(() -> new NotFoundException("This part is not on your wishlist"));
    }
}
