package com.autohublanka.inventory.observer;

import com.autohublanka.inventory.Inventory;
import com.autohublanka.notification.NotificationService;
import com.autohublanka.settings.SettingsService;
import com.autohublanka.user.Role;
import org.springframework.stereotype.Component;

/**
 * Concrete observer: when a part becomes low on stock, procurement is asked to raise a purchase request,
 * with a suggested quantity (enough to get back to twice the reorder level).
 */
@Component
public class ReorderSuggestionObserver implements StockObserver {

    private final NotificationService notifications;
    private final SettingsService settings;

    public ReorderSuggestionObserver(NotificationService notifications, SettingsService settings) {
        this.notifications = notifications;
        this.settings = settings;
    }

    @Override
    public void update(Inventory inventory, int previousQuantity) {
        if (!StockChanges.justBecameLow(inventory, previousQuantity) || !settings.current().lowStockNotifications()) {
            return;
        }
        int suggested = Math.max(inventory.getReorderLevel() * 2 - inventory.getQuantity(), Math.max(inventory.getReorderLevel(), 1));
        notifications.notifyRole(Role.PROCUREMENT_OFFICER, "Reorder suggested",
                "Raise a purchase request for about " + suggested + " × " + inventory.getSparePart().getName()
                        + " (only " + inventory.getQuantity() + " left).",
                "/dashboard/purchase-requests?part=" + inventory.getSparePart().getId());
    }
}
