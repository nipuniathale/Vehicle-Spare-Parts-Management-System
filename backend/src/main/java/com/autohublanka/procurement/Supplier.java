package com.autohublanka.procurement;

import com.autohublanka.common.BaseEntity;
import com.autohublanka.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "suppliers")
public class Supplier extends BaseEntity {

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(length = 80)
    private String contactPerson;

    @Column(length = 300)
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    /**
     * Login account used by the supplier to open the supplier portal (optional).
     * Mapped as ManyToOne on purpose: SQL Server allows only one NULL in a UNIQUE column,
     * so one-per-supplier is enforced in SupplierService instead of by a constraint.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User portalUser;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public User getPortalUser() { return portalUser; }
    public void setPortalUser(User portalUser) { this.portalUser = portalUser; }
}
