package com.autohublanka.procurement.observer;

import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderStatus;

/**
 * OBSERVER pattern - the Subject. PurchaseOrderService is the concrete subject: when a purchase order is
 * created or its status changes (sent, confirmed, declined, shipped, cancelled, re-opened) it notifies its observers.
 */
public interface PurchaseOrderSubject {

    void addObserver(PurchaseOrderObserver observer);

    void removeObserver(PurchaseOrderObserver observer);

    /** previousStatus is null when the order was just created. */
    void notifyObservers(PurchaseOrder order, PurchaseOrderStatus previousStatus);
}
