package com.autohublanka.inventory;

import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.dto.StockMovementRequest;
import com.autohublanka.inventory.dto.StockMovementResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class StockMovementService {

    private final StockMovementRepository movementRepository;
    private final InventoryRepository inventoryRepository;
    private final StockService stockService;

    public StockMovementService(StockMovementRepository movementRepository,
                                InventoryRepository inventoryRepository,
                                StockService stockService) {
        this.movementRepository = movementRepository;
        this.inventoryRepository = inventoryRepository;
        this.stockService = stockService;
    }

    @Transactional(readOnly = true)
    public List<StockMovementResponse> findAll(Long inventoryId) {
        return movementRepository.search(inventoryId).stream()
                .map(StockMovementResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StockMovementResponse findById(Long id) {
        return StockMovementResponse.from(getMovement(id));
    }

    public StockMovementResponse create(StockMovementRequest request) {
        Inventory inventory = inventoryRepository.findById(request.inventoryId())
                .orElseThrow(() -> NotFoundException.of("Stock record", request.inventoryId()));

        StockMovement movement = stockService.record(inventory, request.type(), request.quantity(),
                Text.clean(request.reference()), Text.clean(request.note()), true);
        return StockMovementResponse.from(movement);
    }

    /** Re-applies the movement with the new values (old effect is reversed first). */
    public StockMovementResponse update(Long id, StockMovementRequest request) {
        StockMovement movement = getManualMovement(id, "edited");

        if (!movement.getInventory().getId().equals(request.inventoryId())) {
            throw new BusinessException("A movement cannot be moved to a different stock record");
        }

        int oldEffect = movement.getType().effect(movement.getQuantity());
        int newEffect = request.type().effect(request.quantity());
        stockService.applyChange(movement.getInventory(), newEffect - oldEffect);

        movement.setType(request.type());
        movement.setQuantity(request.quantity());
        movement.setReference(Text.clean(request.reference()));
        movement.setNote(Text.clean(request.note()));
        return StockMovementResponse.from(movementRepository.save(movement));
    }

    /** Deletes the movement and reverses its effect on stock. */
    public void delete(Long id) {
        stockService.revertAndDelete(getManualMovement(id, "deleted"));
    }

    private StockMovement getManualMovement(Long id, String action) {
        StockMovement movement = getMovement(id);
        if (!movement.isManual()) {
            throw new ConflictException("This movement was created automatically by "
                    + (movement.getReference() == null ? "the system" : movement.getReference())
                    + " and cannot be " + action + " here. Change the related order / goods receipt / claim instead.");
        }
        return movement;
    }

    private StockMovement getMovement(Long id) {
        return movementRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Stock movement", id));
    }
}
