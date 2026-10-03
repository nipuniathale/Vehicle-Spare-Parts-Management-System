package com.autohublanka.inventory;

/** Every movement either adds stock (IN) or removes it (OUT). */
public enum MovementType {
    PURCHASE(true),        // goods received from a supplier
    SALE(false),           // customer order
    RETURN(true),          // customer returned an item / cancelled order
    DAMAGE(false),         // written off
    ADJUSTMENT_IN(true),   // stock count correction (+)
    ADJUSTMENT_OUT(false); // stock count correction (-)

    private final boolean incoming;

    MovementType(boolean incoming) {
        this.incoming = incoming;
    }

    public boolean isIncoming() {
        return incoming;
    }

    /** Signed effect on stock level. */
    public int effect(int quantity) {
        return incoming ? quantity : -quantity;
    }
}
