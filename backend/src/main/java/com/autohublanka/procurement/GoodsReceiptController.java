package com.autohublanka.procurement;

import com.autohublanka.procurement.dto.GoodsReceiptRequest;
import com.autohublanka.procurement.dto.GoodsReceiptResponse;
import com.autohublanka.procurement.dto.PurchaseOrderResponse;
import com.autohublanka.procurement.dto.ReceiveGoodsRequest;
import com.autohublanka.procurement.dto.ReceiveGoodsResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/goods-receipts")
@PreAuthorize("hasAnyRole('ADMIN','PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
public class GoodsReceiptController {

    private final GoodsReceiptService receiptService;

    public GoodsReceiptController(GoodsReceiptService receiptService) {
        this.receiptService = receiptService;
    }

    @GetMapping
    public List<GoodsReceiptResponse> findAll(@RequestParam(required = false) Long purchaseOrderId) {
        return receiptService.findAll(purchaseOrderId);
    }

    @GetMapping("/{id}")
    public GoodsReceiptResponse findById(@PathVariable Long id) {
        return receiptService.findById(id);
    }

    /** Purchase orders waiting for goods - the starting point of the goods receipt workflow. */
    @GetMapping("/receivable-orders")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
    public List<PurchaseOrderResponse> receivableOrders() {
        return receiptService.receivableOrders();
    }

    /** Record a delivery: one goods receipt per order line that arrived. */
    @PostMapping("/receive")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
    public ReceiveGoodsResponse receive(@Valid @RequestBody ReceiveGoodsRequest request) {
        return receiptService.receive(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
    public GoodsReceiptResponse update(@PathVariable Long id, @Valid @RequestBody GoodsReceiptRequest request) {
        return receiptService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
    public void delete(@PathVariable Long id) {
        receiptService.delete(id);
    }
}
