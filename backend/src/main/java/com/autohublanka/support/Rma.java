package com.autohublanka.support;

import com.autohublanka.common.BaseEntity;
import com.autohublanka.sales.OrderItem;
import com.autohublanka.user.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Return or warranty claim (Return Merchandise Authorization). */
@Entity
@Table(name = "rmas")
public class Rma extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RmaType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RmaReason reason;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, length = 1000)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "rma_images", joinColumns = @JoinColumn(name = "rma_id"))
    @Column(name = "image_url", length = 500)
    private List<String> imageUrls = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RmaStatus status = RmaStatus.REQUESTED;

    @Column(length = 1000)
    private String staffNote;

    @Column(precision = 12, scale = 2)
    private BigDecimal refundAmount;

    private LocalDateTime reviewedAt;

    private LocalDateTime completedAt;

    public OrderItem getOrderItem() { return orderItem; }
    public void setOrderItem(OrderItem orderItem) { this.orderItem = orderItem; }

    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }

    public RmaType getType() { return type; }
    public void setType(RmaType type) { this.type = type; }

    public RmaReason getReason() { return reason; }
    public void setReason(RmaReason reason) { this.reason = reason; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getImageUrls() { return imageUrls; }

    public RmaStatus getStatus() { return status; }
    public void setStatus(RmaStatus status) { this.status = status; }

    public String getStaffNote() { return staffNote; }
    public void setStaffNote(String staffNote) { this.staffNote = staffNote; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
