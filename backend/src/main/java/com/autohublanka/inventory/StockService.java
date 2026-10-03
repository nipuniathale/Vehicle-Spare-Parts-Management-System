package com.autohublanka.inventory;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.inventory.observer.StockObserver;
import com.autohublanka.inventory.observer.StockSubject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * The only place where stock levels change.
 * Used by inventory screens and by orders, goods receipts and RMAs.
 * OBSERVER pattern - the concrete subject: after every stock change it notifies its observers
 * (low-stock alert, reorder suggestion, stock log). New observers can be added without changing this class.
 */
@Service
@Transactional
public class StockService implements StockSubject {

    private final InventoryRepository inventoryRepository;
    private final StockMovementRepository movementRepository;
    private final List<StockObserver> observers = new CopyOnWriteArrayList<>();

    public StockService(InventoryRepository inventoryRepository,
                        StockMovementRepository movementRepository) {
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
    }

    // ---------------------------------------------------------------- Subject

    @Override
    public void addObserver(StockObserver observer) {
        if (!observers.contains(observer)) {
            observers.add(observer);
        }
    }

    @Override
    public void removeObserver(StockObserver observer) {
        observers.remove(observer);
    }

    @Override
    public void notifyObservers(Inventory inventory, int previousQuantity) {
        for (StockObserver observer : observers) {
            observer.update(inventory, previousQuantity);
        }
    }

    // ---------------------------------------------------------------- stock changes

    /** Creates the stock record for a part, with an opening movement when quantity > 0. */
    public Inventory openInventory(SparePart part, int quantity, int reorderLevel, String location) {
        Inventory inventory = new Inventory();
        inventory.setSparePart(part);
        inventory.setQuantity(0);
        inventory.setReorderLevel(reorderLevel);
        inventory.setLocation(location);
        inventoryRepository.save(inventory);

        if (quantity > 0) {
            record(inventory, MovementType.ADJUSTMENT_IN, quantity, "OPENING", "Opening stock", true);
        }
        return inventory;
    }

    /** Stock change made by another module (order, goods receipt, RMA). */
    public StockMovement recordSystemMovement(SparePart part, MovementType type, int quantity,
                                              String reference, String note) {
        Inventory inventory = inventoryRepository.findBySparePartId(part.getId())
                .orElseGet(() -> {
                    if (!type.isIncoming()) {
                        throw new BusinessException("'" + part.getName() + "' has no stock record, so it cannot be issued");
                    }
                    return openInventory(part, 0, 5, null);
                });
        return record(inventory, type, quantity, reference, note, false);
    }

    public StockMovement record(Inventory inventory, MovementType type, int quantity,
                                String reference, String note, boolean manual) {
        applyChange(inventory, type.effect(quantity));

        StockMovement movement = new StockMovement();
        movement.setInventory(inventory);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setReference(reference);
        movement.setNote(note);
        movement.setManual(manual);
        return movementRepository.save(movement);
    }

    /** Undo a movement and delete it. */
    public void revertAndDelete(StockMovement movement) {
        applyChange(movement.getInventory(), -movement.getType().effect(movement.getQuantity()));
        movementRepository.delete(movement);
    }

    /** Adds (positive) or removes (negative) stock; never lets stock go below zero. */
    public void applyChange(Inventory inventory, int change) {
        int newQuantity = inventory.getQuantity() + change;
        if (newQuantity < 0) {
            throw new BusinessException("Not enough stock for '" + inventory.getSparePart().getName()
                    + "'. Available: " + inventory.getQuantity() + ", required: " + (-change));
        }
        int previousQuantity = inventory.getQuantity();
        inventory.setQuantity(newQuantity);
        inventoryRepository.save(inventory);
        if (change != 0) {
            notifyObservers(inventory, previousQuantity);
        }
    }

    @Transactional(readOnly = true)
    public int availableQuantity(Long sparePartId) {
        return inventoryRepository.findBySparePartId(sparePartId)
                .map(Inventory::getQuantity)
                .orElse(0);
    }
}
