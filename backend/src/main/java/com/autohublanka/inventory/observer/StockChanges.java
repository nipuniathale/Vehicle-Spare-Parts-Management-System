package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.Inventory;

final class StockChanges {

    private StockChanges() {
    }

    /** True only for the change that takes the quantity from above the reorder level to at / below it. */
    static boolean justBecameLow(Inventory inventory, int previousQuantity) {
        return previousQuantity > inventory.getReorderLevel() && inventory.isLowStock();
    }
}
