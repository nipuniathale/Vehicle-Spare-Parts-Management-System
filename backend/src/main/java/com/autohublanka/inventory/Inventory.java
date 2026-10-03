package com.autohublanka.inventory;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/** Current stock level of one spare part (one row per part). */
@Entity
@Table(name = "inventory")
public class Inventory extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "spare_part_id", nullable = false, unique = true)
    private SparePart sparePart;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private int reorderLevel = 5;

    @Column(length = 80)
    private String location;

    public boolean isLowStock() {
        return quantity <= reorderLevel;
    }

    public SparePart getSparePart() { return sparePart; }
    public void setSparePart(SparePart sparePart) { this.sparePart = sparePart; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(int reorderLevel) { this.reorderLevel = reorderLevel; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
