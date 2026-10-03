package com.autohublanka.procurement.observer;

import com.autohublanka.notification.NotificationService;
import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.user.Role;
import org.springframework.stereotype.Component;

/**
 * Concrete observer: tells the people involved about the order -
 * the supplier (new / cancelled order in their portal) and procurement (confirmed, declined, shipped).
 * The changes also show on the procurement dashboard and bell.
 */
@Component
public class ProcurementNotificationObserver implements PurchaseOrderObserver {

    private final NotificationService notifications;

    public ProcurementNotificationObserver(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Override
    public void update(PurchaseOrder order, PurchaseOrderStatus previousStatus) {
        String po = "Purchase order #" + order.getId();
        var supplierLogin = order.getSupplier().getPortalUser();
        switch (order.getStatus()) {
            case PENDING -> {
                if (supplierLogin != null) {
                    notifications.notifyUser(supplierLogin, (previousStatus == null ? "New " : "Re-opened ") + po.toLowerCase(),
                            "Please confirm or decline it in the supplier portal.", "/supplier/orders");
                }
            }
            case CONFIRMED -> notifications.notifyRole(Role.PROCUREMENT_OFFICER, po + " confirmed",
                    order.getSupplier().getName() + " confirmed the order.", "/dashboard/purchase-orders");
            case DECLINED -> notifications.notifyRole(Role.PROCUREMENT_OFFICER, po + " declined",
                    order.getSupplier().getName() + ": " + order.getSupplierNote()
                            + (order.getPurchaseRequest() != null ? " - the purchase request is open again." : ""),
                    "/dashboard/purchase-orders");
            case SHIPPED -> notifications.notifyRole(Role.PROCUREMENT_OFFICER, po + " shipped",
                    order.getSupplier().getName() + " shipped the goods.", "/dashboard/goods-receipts");
            case CANCELLED -> {
                if (supplierLogin != null) {
                    notifications.notifyUser(supplierLogin, po + " cancelled", "The buyer cancelled this order.", "/supplier/orders");
                }
            }
            default -> {
                // PARTIALLY_RECEIVED / RECEIVED are recorded by the warehouse - no message needed
            }
        }
    }
}
