package com.autohublanka.procurement;

import com.autohublanka.notification.NotificationService;
import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.procurement.dto.PurchaseRequestRequest;
import com.autohublanka.procurement.dto.PurchaseRequestResponse;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class PurchaseRequestService {

    private final PurchaseRequestRepository requestRepository;
    private final PurchaseOrderRepository orderRepository;
    private final SparePartRepository sparePartRepository;
    private final SupplierRepository supplierRepository;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    public PurchaseRequestService(PurchaseRequestRepository requestRepository,
                                  PurchaseOrderRepository orderRepository,
                                  SparePartRepository sparePartRepository,
                                  SupplierRepository supplierRepository,
                                  CurrentUser currentUser,
                                  NotificationService notifications) {
        this.notifications = notifications;
        this.requestRepository = requestRepository;
        this.orderRepository = orderRepository;
        this.sparePartRepository = sparePartRepository;
        this.supplierRepository = supplierRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<PurchaseRequestResponse> findAll() {
        return requestRepository.findAllForList().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseRequestResponse findById(Long id) {
        return toResponse(getRequest(id));
    }

    public PurchaseRequestResponse create(PurchaseRequestRequest request) {
        PurchaseRequest purchaseRequest = new PurchaseRequest();
        apply(purchaseRequest, request);
        purchaseRequest.setRequestedBy(currentUser.get());
        requestRepository.save(purchaseRequest);
        notifications.purchaseRequestRaised(purchaseRequest); // inventory manager: "needs approval"
        return toResponse(purchaseRequest);
    }

    public PurchaseRequestResponse update(Long id, PurchaseRequestRequest request) {
        PurchaseRequest purchaseRequest = getRequest(id);
        if (purchaseRequest.getStatus() != PurchaseRequestStatus.PENDING) {
            throw new ConflictException("Only PENDING requests can be edited (this one is "
                    + purchaseRequest.getStatus() + ")");
        }
        apply(purchaseRequest, request);
        return toResponse(requestRepository.save(purchaseRequest));
    }

    public PurchaseRequestResponse approve(Long id, String note) {
        return decide(id, PurchaseRequestStatus.APPROVED, note);
    }

    public PurchaseRequestResponse reject(Long id, String note) {
        if (Text.clean(note) == null) {
            throw new BusinessException("Please give a reason for rejecting the request");
        }
        return decide(id, PurchaseRequestStatus.REJECTED, note);
    }

    /** Physical delete. An ORDERED request is still linked to its purchase order, so that must be deleted first. */
    public void delete(Long id) {
        PurchaseRequest purchaseRequest = getRequest(id);
        orderRepository.findByPurchaseRequestIdOrderByIdDesc(id).stream().findFirst().ifPresent(order -> {
            throw new ConflictException("This request is linked to purchase order #" + order.getId()
                    + ". Delete that purchase order first.");
        });
        requestRepository.delete(purchaseRequest);
    }

    private PurchaseRequestResponse decide(Long id, PurchaseRequestStatus decision, String note) {
        PurchaseRequest purchaseRequest = getRequest(id);
        if (purchaseRequest.getStatus() != PurchaseRequestStatus.PENDING) {
            throw new ConflictException("Only PENDING requests can be approved or rejected");
        }
        User reviewer = currentUser.get();
        if (purchaseRequest.getRequestedBy() != null && purchaseRequest.getRequestedBy().getId().equals(reviewer.getId())) {
            throw new BusinessException("You cannot approve or reject a request you raised yourself");
        }
        purchaseRequest.setStatus(decision);
        purchaseRequest.setReviewNote(Text.clean(note));
        purchaseRequest.setReviewedBy(reviewer);
        purchaseRequest.setReviewedAt(LocalDateTime.now());
        requestRepository.save(purchaseRequest);
        notifications.purchaseRequestDecided(purchaseRequest); // the officer who raised it
        return toResponse(purchaseRequest);
    }

    private void apply(PurchaseRequest purchaseRequest, PurchaseRequestRequest request) {
        SparePart part = sparePartRepository.findById(request.sparePartId())
                .orElseThrow(() -> NotFoundException.of("Spare part", request.sparePartId()));
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> NotFoundException.of("Supplier", request.supplierId()));
        if (!supplier.isActive()) {
            throw new BusinessException("Supplier '" + supplier.getName() + "' is inactive");
        }
        purchaseRequest.setSparePart(part);
        purchaseRequest.setSupplier(supplier);
        purchaseRequest.setQuantity(request.quantity());
        purchaseRequest.setReason(Text.clean(request.reason()));
    }

    private PurchaseRequestResponse toResponse(PurchaseRequest request) {
        Long orderId = request.getStatus() == PurchaseRequestStatus.ORDERED
                ? orderRepository.findByPurchaseRequestIdOrderByIdDesc(request.getId()).stream().findFirst().map(o -> o.getId()).orElse(null)
                : null;
        return PurchaseRequestResponse.from(request, orderId);
    }

    private PurchaseRequest getRequest(Long id) {
        return requestRepository.findById(id).orElseThrow(() -> NotFoundException.of("Purchase request", id));
    }
}
