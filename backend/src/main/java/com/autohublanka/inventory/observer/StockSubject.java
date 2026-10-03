package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.Inventory;

/**
 * OBSERVER pattern - the Subject (lecture: Subject interface of the Tsunami warning system).
 * StockService is the concrete subject: every time a stock level changes it notifies its observers.
 */
public interface StockSubject {

    void addObserver(StockObserver observer);

    void removeObserver(StockObserver observer);

    void notifyObservers(Inventory inventory, int previousQuantity);
}
