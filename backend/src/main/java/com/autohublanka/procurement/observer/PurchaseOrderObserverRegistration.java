package com.autohublanka.procurement.observer;

import com.autohublanka.procurement.PurchaseOrderService;
import org.springframework.stereotype.Component;

import java.util.List;

/** Attaches the purchase order observers to the subject when the application starts. */
@Component
public class PurchaseOrderObserverRegistration {

    public PurchaseOrderObserverRegistration(PurchaseOrderService purchaseOrderService, List<PurchaseOrderObserver> observers) {
        observers.forEach(purchaseOrderService::addObserver);
    }
}
