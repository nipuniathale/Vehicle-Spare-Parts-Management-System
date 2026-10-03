package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.Inventory;

/** OBSERVER pattern - the Observer: told about every stock change (new quantity in the inventory, plus the old one). */
public interface StockObserver {

    void update(Inventory inventory, int previousQuantity);
}
