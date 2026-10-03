package com.autohublanka.sales;

public enum OrderStatus {
    PLACED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    /** Allowed next steps in the order life cycle. */
    public boolean canMoveTo(OrderStatus next) {
        return switch (this) {
            case PLACED -> next == PROCESSING || next == CANCELLED;
            case PROCESSING -> next == SHIPPED || next == CANCELLED;
            case SHIPPED -> next == DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }
}
