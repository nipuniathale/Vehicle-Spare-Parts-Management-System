package com.autohublanka.sales;

import com.autohublanka.marketing.price.Price;
import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.StockService;
import com.autohublanka.marketing.Discount;
import com.autohublanka.marketing.PricingService;
import com.autohublanka.sales.dto.CartItemRequest;
import com.autohublanka.sales.dto.CartResponse;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.settings.SettingsService;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final SparePartRepository sparePartRepository;
    private final StockService stockService;
    private final PricingService pricingService;
    private final CurrentUser currentUser;
    private final SettingsService settingsService;

    public CartService(CartRepository cartRepository,
                       CartItemRepository cartItemRepository,
                       SparePartRepository sparePartRepository,
                       StockService stockService,
                       PricingService pricingService,
                       CurrentUser currentUser,
                       SettingsService settingsService) {
        this.settingsService = settingsService;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.sparePartRepository = sparePartRepository;
        this.stockService = stockService;
        this.pricingService = pricingService;
        this.currentUser = currentUser;
    }

    public CartResponse getMyCart() {
        return toResponse(myCart());
    }

    public CartResponse addItem(CartItemRequest request) {
        Cart cart = myCart();
        SparePart part = sparePartRepository.findById(request.sparePartId())
                .orElseThrow(() -> NotFoundException.of("Spare part", request.sparePartId()));
        checkSellable(part);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getSparePart().getId().equals(part.getId()))
                .findFirst()
                .orElse(null);

        int newQuantity = request.quantity() + (item == null ? 0 : item.getQuantity());
        checkQuantity(part, newQuantity);

        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setSparePart(part);
            cart.getItems().add(item);
        }
        item.setQuantity(newQuantity);
        return toResponse(cartRepository.save(cart));
    }

    public CartResponse updateItem(Long itemId, int quantity) {
        CartItem item = myItem(itemId);
        if (quantity < 1) {
            throw new BusinessException("Quantity must be at least 1");
        }
        checkQuantity(item.getSparePart(), quantity);
        item.setQuantity(quantity);
        return toResponse(item.getCart());
    }

    public CartResponse removeItem(Long itemId) {
        CartItem item = myItem(itemId);
        Cart cart = item.getCart();
        cart.getItems().remove(item);
        return toResponse(cartRepository.save(cart));
    }

    public void clear() {
        Cart cart = myCart();
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    /** Used by checkout. */
    Cart myCart() {
        User customer = currentUser.get();
        return cartRepository.findByCustomerId(customer.getId()).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setCustomer(customer);
            return cartRepository.save(cart);
        });
    }

    private CartItem myItem(Long itemId) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> NotFoundException.of("Cart item", itemId));
        if (!item.getCart().getCustomer().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Cart item", itemId);
        }
        return item;
    }

    static void checkSellable(SparePart part) {
        if (!part.isActive() || !part.getCategory().isActive()) {
            throw new BusinessException("'" + part.getName() + "' is not available for sale");
        }
    }

    private void checkQuantity(SparePart part, int quantity) {
        int max = settingsService.current().maxQuantityPerItem();
        if (quantity > max) {
            throw new BusinessException("You can order at most " + max + " of one item");
        }
        int available = stockService.availableQuantity(part.getId());
        if (quantity > available) {
            throw new BusinessException("Only " + available + " unit(s) of '" + part.getName() + "' are in stock");
        }
    }

    private CartResponse toResponse(Cart cart) {
        Map<Long, Discount> discounts = pricingService.runningDiscounts();
        List<CartResponse.Line> lines = cart.getItems().stream().map(item -> {
            SparePart part = item.getSparePart();
            Discount discount = discounts.get(part.getId());
            BigDecimal unitPrice = Price.forPart(part, discount).getAmount();
            return new CartResponse.Line(
                    item.getId(), part.getId(), part.getName(), part.getSku(), part.getImageUrl(),
                    part.getPrice(), unitPrice, item.getQuantity(),
                    unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())),
                    stockService.availableQuantity(part.getId()));
        }).toList();

        BigDecimal total = lines.stream().map(CartResponse.Line::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        int count = lines.stream().mapToInt(CartResponse.Line::quantity).sum();
        return new CartResponse(cart.getId(), lines, count, total);
    }
}
