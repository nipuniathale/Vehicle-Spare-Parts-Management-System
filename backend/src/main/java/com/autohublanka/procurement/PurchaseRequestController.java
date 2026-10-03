package com.autohublanka.procurement;

import com.autohublanka.procurement.dto.PurchaseRequestRequest;
import com.autohublanka.procurement.dto.PurchaseRequestResponse;
import com.autohublanka.procurement.dto.ReviewDecisionRequest;
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
@RequestMapping("/api/purchase-requests")
@PreAuthorize("hasAnyRole('ADMIN','PROCUREMENT_OFFICER','INVENTORY_MANAGER')")
public class PurchaseRequestController {
    // Workflow: the procurement officer raises a request -> the INVENTORY MANAGER approves or rejects it
    // -> only an approved request can become a purchase order. The admin can only view requests.

    private final PurchaseRequestService requestService;

    public PurchaseRequestController(PurchaseRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public List<PurchaseRequestResponse> findAll() {
        return requestService.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseRequestResponse findById(@PathVariable Long id) {
        return requestService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('PROCUREMENT_OFFICER')")
    public PurchaseRequestResponse create(@Valid @RequestBody PurchaseRequestRequest request) {
        return requestService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PROCUREMENT_OFFICER')")
    public PurchaseRequestResponse update(@PathVariable Long id, @Valid @RequestBody PurchaseRequestRequest request) {
        return requestService.update(id, request);
    }

    /** Only the inventory manager decides - the officer who raised a request cannot approve it himself. */
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('INVENTORY_MANAGER')")
    public PurchaseRequestResponse approve(@PathVariable Long id, @Valid @RequestBody(required = false) ReviewDecisionRequest request) {
        return requestService.approve(id, request == null ? null : request.note());
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('INVENTORY_MANAGER')")
    public PurchaseRequestResponse reject(@PathVariable Long id, @Valid @RequestBody ReviewDecisionRequest request) {
        return requestService.reject(id, request.note());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('PROCUREMENT_OFFICER')")
    public void delete(@PathVariable Long id) {
        requestService.delete(id);
    }
}
