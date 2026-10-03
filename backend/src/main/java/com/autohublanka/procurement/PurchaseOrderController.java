package com.autohublanka.procurement;

import com.autohublanka.procurement.dto.PurchaseOrderRequest;
import com.autohublanka.procurement.dto.PurchaseOrderResponse;
import com.autohublanka.procurement.dto.PurchaseOrderStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@PreAuthorize("hasAnyRole('ADMIN','PROCUREMENT_OFFICER')")
public class PurchaseOrderController {

    private final PurchaseOrderService orderService;

    public PurchaseOrderController(PurchaseOrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public List<PurchaseOrderResponse> findAll() {
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROCUREMENT_OFFICER','SUPPLIER')")
    public PurchaseOrderResponse findById(@PathVariable Long id) {
        return orderService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrderResponse create(@Valid @RequestBody PurchaseOrderRequest request) {
        return orderService.create(request);
    }

    @PutMapping("/{id}")
    public PurchaseOrderResponse update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return orderService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public PurchaseOrderResponse changeStatus(@PathVariable Long id, @Valid @RequestBody PurchaseOrderStatusRequest request) {
        return orderService.changeStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        orderService.delete(id);
    }

    // ---------- supplier portal ----------

    @GetMapping("/supplier/mine")
    @PreAuthorize("hasRole('SUPPLIER')")
    public List<PurchaseOrderResponse> myOrders() {
        return orderService.findForLoggedInSupplier();
    }

    @PatchMapping("/{id}/supplier-status")
    @PreAuthorize("hasRole('SUPPLIER')")
    public PurchaseOrderResponse supplierUpdate(@PathVariable Long id, @Valid @RequestBody PurchaseOrderStatusRequest request) {
        return orderService.supplierUpdate(id, request);
    }
}
