package com.autohublanka.support.resolution;

import com.autohublanka.inventory.MovementType;
import com.autohublanka.inventory.StockService;
import com.autohublanka.support.Rma;
import com.autohublanka.support.dto.RmaCompleteRequest;

/** Concrete product: a new part is sent to the customer, so it leaves stock as a SALE movement. */
public class ReplacementResolution implements ClaimResolution {

    private final StockService stockService;

    public ReplacementResolution(StockService stockService) {
        this.stockService = stockService;
    }

    @Override
    public void resolve(Rma rma, RmaCompleteRequest request) {
        stockService.recordSystemMovement(rma.getOrderItem().getSparePart(), MovementType.SALE, rma.getQuantity(),
                "RMA-" + rma.getId(), "Replacement sent to customer");
    }
}
