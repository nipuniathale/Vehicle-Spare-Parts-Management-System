package com.autohublanka.procurement;

public enum PurchaseOrderStatus {
    PENDING,            // sent to supplier, waiting for reply
    CONFIRMED,          // supplier accepted
    DECLINED,           // supplier cannot deliver
    SHIPPED,            // supplier dispatched the goods
    PARTIALLY_RECEIVED, // some goods receipts recorded
    RECEIVED,           // everything received
    CANCELLED           // cancelled by procurement
}
