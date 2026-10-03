package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.Inventory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Concrete observer: writes every stock change to the application log (useful when checking stock problems). */
@Component
public class StockLogObserver implements StockObserver {

    private static final Logger log = LoggerFactory.getLogger(StockLogObserver.class);

    @Override
    public void update(Inventory inventory, int previousQuantity) {
        log.info("Stock of {} ({}) changed {} -> {}", inventory.getSparePart().getName(),
                inventory.getSparePart().getSku(), previousQuantity, inventory.getQuantity());
    }
}
