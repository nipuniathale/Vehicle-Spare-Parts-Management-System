package com.autohublanka.support.resolution;

import com.autohublanka.support.Rma;
import com.autohublanka.support.dto.RmaCompleteRequest;

/**
 * FACTORY pattern - the product interface.
 * Each way of closing an approved return / warranty claim is one class that implements this.
 */
public interface ClaimResolution {

    /** Carries out the resolution (refund amount, stock movement). The caller sets the final status. */
    void resolve(Rma rma, RmaCompleteRequest request);
}
