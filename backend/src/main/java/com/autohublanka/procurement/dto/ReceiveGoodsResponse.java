package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.PurchaseOrderStatus;

import java.util.List;

/** Result of recording a delivery: the receipts created and the purchase order's new status. */
public record ReceiveGoodsResponse(Long id, PurchaseOrderStatus status, List<GoodsReceiptResponse> receipts) {
}
