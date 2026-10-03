package com.autohublanka.inventory;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.dto.InventoryRequest;
import com.autohublanka.inventory.dto.InventoryResponse;
import com.autohublanka.procurement.GoodsReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final SparePartRepository sparePartRepository;
    private final GoodsReceiptRepository goodsReceiptRepository;
    private final StockService stockService;

    public InventoryService(InventoryRepository inventoryRepository,
                            StockMovementRepository movementRepository,
                            SparePartRepository sparePartRepository,
                            GoodsReceiptRepository goodsReceiptRepository,
                            StockService stockService) {
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
        this.sparePartRepository = sparePartRepository;
        this.goodsReceiptRepository = goodsReceiptRepository;
        this.stockService = stockService;
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> findAll(boolean lowStockOnly) {
        var records = lowStockOnly ? inventoryRepository.findLowStock() : inventoryRepository.findAllWithPart();
        return records.stream().map(InventoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public InventoryResponse findById(Long id) {
        return InventoryResponse.from(getInventory(id));
    }

    public InventoryResponse create(InventoryRequest request) {
        if (request.sparePartId() == null) {
            throw new BusinessException("Spare part is required");
        }
        SparePart part = sparePartRepository.findById(request.sparePartId())
                .orElseThrow(() -> NotFoundException.of("Spare part", request.sparePartId()));

        if (inventoryRepository.existsBySparePartId(part.getId())) {
            throw new ConflictException("'" + part.getName() + "' already has a stock record. Edit that record instead.");
        }

        int opening = request.quantity() == null ? 0 : request.quantity();
        Inventory inventory = stockService.openInventory(part, opening, request.reorderLevel(), Text.clean(request.location()));
        return InventoryResponse.from(inventory);
    }

    /** Only reorder level and location can be edited; quantity changes through stock movements. */
    public InventoryResponse update(Long id, InventoryRequest request) {
        Inventory inventory = getInventory(id);

        if (request.sparePartId() != null && !request.sparePartId().equals(inventory.getSparePart().getId())) {
            throw new BusinessException("The spare part of a stock record cannot be changed");
        }
        if (request.quantity() != null && request.quantity() != inventory.getQuantity()) {
            throw new BusinessException("Stock quantity cannot be edited directly. Record a stock movement "
                    + "(ADJUSTMENT_IN / ADJUSTMENT_OUT) so the change is audited.");
        }

        inventory.setReorderLevel(request.reorderLevel());
        inventory.setLocation(Text.clean(request.location()));
        return InventoryResponse.from(inventoryRepository.save(inventory));
    }

    /** Physically deletes the stock record together with its movement history. */
    public void delete(Long id) {
        Inventory inventory = getInventory(id);

        if (goodsReceiptRepository.existsByStockMovementInventoryId(id)) {
            throw new ConflictException("This stock record has goods receipts (GRNs) linked to it. "
                    + "Delete those goods receipts first.");
        }

        movementRepository.deleteAll(movementRepository.findByInventoryId(id));
        inventoryRepository.delete(inventory);
    }

    private Inventory getInventory(Long id) {
        return inventoryRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Stock record", id));
    }
}
