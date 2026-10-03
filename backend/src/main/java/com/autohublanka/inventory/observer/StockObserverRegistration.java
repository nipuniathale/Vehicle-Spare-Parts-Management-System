package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.StockService;
import org.springframework.stereotype.Component;

import java.util.List;

/** Attaches the stock observers to the subject when the application starts (lecture: subject.addObserver(...)). */
@Component
public class StockObserverRegistration {

    public StockObserverRegistration(StockService stockService, List<StockObserver> observers) {
        observers.forEach(stockService::addObserver);
    }
}
