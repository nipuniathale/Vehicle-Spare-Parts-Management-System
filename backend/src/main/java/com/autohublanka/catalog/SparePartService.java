package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.SparePartRequest;
import com.autohublanka.catalog.dto.SparePartResponse;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.Inventory;
import com.autohublanka.inventory.InventoryRepository;
import com.autohublanka.inventory.StockMovementRepository;
import com.autohublanka.inventory.StockService;
import com.autohublanka.marketing.Discount;
import com.autohublanka.marketing.DiscountRepository;
import com.autohublanka.marketing.PricingService;
import com.autohublanka.marketing.PromotionRepository;
import com.autohublanka.procurement.PurchaseOrderItemRepository;
import com.autohublanka.procurement.PurchaseRequestRepository;
import com.autohublanka.sales.CartItemRepository;
import com.autohublanka.sales.OrderItemRepository;
import com.autohublanka.settings.SettingsService;
import com.autohublanka.support.ReviewRepository;
import com.autohublanka.wishlist.WishlistItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class SparePartService {

    private final SparePartRepository sparePartRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final StockService stockService;
    private final PricingService pricingService;
    private final FitmentRepository fitmentRepository;
    private final DiscountRepository discountRepository;
    private final PromotionRepository promotionRepository;
    private final CartItemRepository cartItemRepository;
    private final SettingsService settingsService;
    private final WishlistItemRepository wishlistRepository;
    private final OrderItemRepository orderItemRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final ReviewRepository reviewRepository;

    public SparePartService(SparePartRepository sparePartRepository,
                            CategoryRepository categoryRepository,
                            InventoryRepository inventoryRepository,
                            StockMovementRepository movementRepository,
                            StockService stockService,
                            PricingService pricingService,
                            FitmentRepository fitmentRepository,
                            DiscountRepository discountRepository,
                            PromotionRepository promotionRepository,
                            CartItemRepository cartItemRepository,
                            WishlistItemRepository wishlistRepository,
                            OrderItemRepository orderItemRepository,
                            PurchaseRequestRepository purchaseRequestRepository,
                            PurchaseOrderItemRepository purchaseOrderItemRepository,
                            ReviewRepository reviewRepository,
                            SettingsService settingsService) {
        this.sparePartRepository = sparePartRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
        this.stockService = stockService;
        this.pricingService = pricingService;
        this.fitmentRepository = fitmentRepository;
        this.discountRepository = discountRepository;
        this.promotionRepository = promotionRepository;
        this.cartItemRepository = cartItemRepository;
        this.settingsService = settingsService;
        this.wishlistRepository = wishlistRepository;
        this.orderItemRepository = orderItemRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseOrderItemRepository = purchaseOrderItemRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    /** Catalogue search. {@code make} = parts that fit any model of that vehicle make (e.g. every Toyota). */
    public List<SparePartResponse> search(String search, Long categoryId, Long vehicleId, String make, boolean activeOnly) {
        List<SparePart> parts = sparePartRepository.search(Text.clean(search), categoryId, vehicleId, Text.clean(make), activeOnly);
        if (parts.isEmpty()) {
            return List.of();
        }

        Map<Long, Integer> stock = inventoryRepository
                .findBySparePartIdIn(parts.stream().map(SparePart::getId).toList())
                .stream()
                .collect(Collectors.toMap(i -> i.getSparePart().getId(), Inventory::getQuantity));
        Map<Long, Discount> discounts = pricingService.runningDiscounts();

        return parts.stream()
                .map(p -> SparePartResponse.from(p, stock.get(p.getId()), discounts.get(p.getId()), null))
                .toList();
    }

    @Transactional(readOnly = true)
    public SparePartResponse findById(Long id) {
        return toResponse(getPart(id));
    }

    public SparePartResponse create(SparePartRequest request) {
        String sku = request.sku().trim().toUpperCase();
        if (sparePartRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("SKU " + sku + " is already used by another spare part");
        }

        SparePart part = new SparePart();
        apply(part, request, sku);
        sparePartRepository.save(part);

        stockService.openInventory(
                part,
                request.initialStock() == null ? 0 : request.initialStock(),
                request.reorderLevel() == null ? settingsService.current().defaultReorderLevel() : request.reorderLevel(),
                Text.clean(request.location()));

        return toResponse(part);
    }

    public SparePartResponse update(Long id, SparePartRequest request) {
        SparePart part = getPart(id);
        String sku = request.sku().trim().toUpperCase();
        if (sparePartRepository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new ConflictException("SKU " + sku + " is already used by another spare part");
        }
        apply(part, request, sku);
        return toResponse(sparePartRepository.save(part));
    }

    /**
     * Physical delete.
     * Blocked while the part appears in sales or procurement history.
     * Owned data (stock record + movements, fitments, discounts, promotion links, cart and wishlist lines) is deleted with it.
     */
    public void delete(Long id) {
        SparePart part = getPart(id);

        List<String> usedBy = new ArrayList<>();
        addUsage(usedBy, orderItemRepository.countBySparePartId(id), "customer order line(s)");
        addUsage(usedBy, purchaseOrderItemRepository.countBySparePartId(id), "purchase order line(s)");
        addUsage(usedBy, purchaseRequestRepository.countBySparePartId(id), "purchase request(s)");
        if (!usedBy.isEmpty()) {
            throw new ConflictException("'" + part.getName() + "' cannot be deleted because it is used in "
                    + String.join(", ", usedBy) + ". Delete those records first, or mark the part inactive.");
        }

        cartItemRepository.deleteBySparePart(id);
        wishlistRepository.deleteBySparePart(id);
        fitmentRepository.deleteBySparePartId(id);
        discountRepository.deleteBySparePartId(id);
        promotionRepository.findBySparePart(id).forEach(promotion -> promotion.getSpareParts().remove(part));

        inventoryRepository.findBySparePartId(id).ifPresent(inventory -> {
            movementRepository.deleteAll(movementRepository.findByInventoryId(inventory.getId()));
            inventoryRepository.delete(inventory);
        });

        sparePartRepository.delete(part);
    }

    private static void addUsage(List<String> usedBy, long count, String label) {
        if (count > 0) {
            usedBy.add(count + " " + label);
        }
    }

    private void apply(SparePart part, SparePartRequest request, String sku) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> NotFoundException.of("Category", request.categoryId()));

        part.setName(request.name().trim());
        part.setSku(sku);
        part.setBrand(Text.clean(request.brand()));
        part.setDescription(Text.clean(request.description()));
        part.setPrice(request.price());
        part.setImageUrl(Text.clean(request.imageUrl()));
        part.setWarrantyMonths(request.warrantyMonths());
        part.setActive(request.active() == null || request.active());
        part.setCategory(category);
    }

    public SparePartResponse toResponse(SparePart part) {
        Integer stock = inventoryRepository.findBySparePartId(part.getId())
                .map(Inventory::getQuantity)
                .orElse(null);
        return SparePartResponse.from(part, stock,
                pricingService.runningDiscountFor(part.getId()),
                reviewRepository.averageRating(part.getId()));
    }

    SparePart getPart(Long id) {
        return sparePartRepository.findById(id).orElseThrow(() -> NotFoundException.of("Spare part", id));
    }
}
