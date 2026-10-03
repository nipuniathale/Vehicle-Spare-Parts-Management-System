package com.autohublanka.procurement.observer;

import com.autohublanka.notification.NotificationService;
import com.autohublanka.procurement.PurchaseOrder;
import com.autohublanka.procurement.PurchaseOrderStatus;
import com.autohublanka.user.Role;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

/**
 * Concrete observer: tells the inventory manager which stock to expect - when the supplier confirms
 * (with the expected date) and when the goods are shipped (time to prepare the goods receipt).
 */
@Component
public class ExpectedStockObserver implements PurchaseOrderObserver {

    private final NotificationService notifications;

    public ExpectedStockObserver(NotificationService notifications) {
        this.notifications = notifications;
    }

    @Override
    public void update(PurchaseOrder order, PurchaseOrderStatus previousStatus) {
        if (order.getStatus() != PurchaseOrderStatus.CONFIRMED && order.getStatus() != PurchaseOrderStatus.SHIPPED) {
            return;
        }
        String items = order.getItems().stream()
                .map(i -> i.getRemainingQuantity() + " × " + i.getSparePart().getName())
                .collect(Collectors.joining(", "));
        boolean shipped = order.getStatus() == PurchaseOrderStatus.SHIPPED;
        String when = shipped ? "is on the way" : "is expected" + (order.getExpectedDeliveryDate() == null ? "" : " by " + order.getExpectedDeliveryDate());
        notifications.notifyRole(Role.INVENTORY_MANAGER,
                (shipped ? "Goods shipped - " : "Stock expected - ") + "PO #" + order.getId(),
                items + " from " + order.getSupplier().getName() + " " + when + ". Record a goods receipt when it arrives.",
                "/dashboard/goods-receipts");
    }
}
