package com.autohublanka.procurement.observer;

import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.procurement.PurchaseRequest;
import com.autohublanka.procurement.PurchaseRequestStatus;
import org.springframework.stereotype.Component;

/**
 * Concrete observer: keeps the purchase request in step with its purchase order.
 * <ul>
 *   <li>order created or re-opened (PENDING) -> request ORDERED</li>
 *   <li>order declined by the supplier or cancelled -> request re-opened (APPROVED), so a new order can be placed</li>
 * </ul>
 */
@Component
public class PurchaseRequestStatusObserver implements PurchaseOrderObserver {

    @Override
    public void update(PurchaseOrder order, PurchaseOrderStatus previousStatus) {
        PurchaseRequest request = order.getPurchaseRequest();
        if (request == null) {
            return;
        }
        switch (order.getStatus()) {
            case PENDING -> request.setStatus(PurchaseRequestStatus.ORDERED);
            case DECLINED, CANCELLED -> request.setStatus(PurchaseRequestStatus.APPROVED);
            default -> {
                // confirmed / shipped / received: the request stays ORDERED
            }
        }
    }
}
