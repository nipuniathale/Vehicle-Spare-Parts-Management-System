package com.autohublanka.support.resolution;

import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.inventory.StockService;
import com.autohublanka.support.RmaStatus;
import org.springframework.stereotype.Component;

/**
 * FACTORY pattern - the factory. RmaService (the client) asks for a resolution by the status the staff chose
 * and never creates RefundResolution / ReplacementResolution itself.
 * A new option (e.g. REPAIRED) = one new ClaimResolution class + one line here.
 */
@Component
public class ClaimResolutionFactory {

    private final StockService stockService;

    public ClaimResolutionFactory(StockService stockService) {
        this.stockService = stockService;
    }

    public ClaimResolution getResolution(RmaStatus resolution) {
        if (resolution == RmaStatus.REFUNDED) {
            return new RefundResolution(stockService);
        }
        if (resolution == RmaStatus.REPLACED) {
            return new ReplacementResolution(stockService);
        }
        throw new BusinessException("Resolution must be REFUNDED or REPLACED");
    }
}
