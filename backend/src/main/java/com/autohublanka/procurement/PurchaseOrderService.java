package com.autohublanka.procurement;

import com.autohublanka.procurement.observer.PurchaseOrderObserver;
import com.autohublanka.procurement.observer.PurchaseOrderSubject;
import java.util.concurrent.CopyOnWriteArrayList;
import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.procurement.dto.PurchaseOrderItemRequest;
import com.autohublanka.procurement.dto.PurchaseOrderRequest;
import com.autohublanka.procurement.dto.PurchaseOrderResponse;
import com.autohublanka.procurement.dto.PurchaseOrderStatusRequest;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class PurchaseOrderService implements PurchaseOrderSubject {

    private final PurchaseOrderRepository orderRepository;
    private final PurchaseRequestRepository requestRepository;
    private final SupplierRepository supplierRepository;
    private final SparePartRepository sparePartRepository;
    private final GoodsReceiptRepository receiptRepository;
    private final CurrentUser currentUser;
    /* OBSERVER pattern: purchase request status, procurement / supplier notifications, expected stock */
    private final List<PurchaseOrderObserver> observers = new CopyOnWriteArrayList<>();

    public PurchaseOrderService(PurchaseOrderRepository orderRepository,
                                PurchaseRequestRepository requestRepository,
                                SupplierRepository supplierRepository,
                                SparePartRepository sparePartRepository,
                                GoodsReceiptRepository receiptRepository,
                                CurrentUser currentUser) {
        this.orderRepository = orderRepository;
        this.requestRepository = requestRepository;
        this.supplierRepository = supplierRepository;
        this.sparePartRepository = sparePartRepository;
        this.receiptRepository = receiptRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> findAll() {
        return orderRepository.findAllForList().stream().map(PurchaseOrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseOrderResponse findById(Long id) {
        PurchaseOrder order = getOrder(id);
        if (currentUser.hasRole(Role.SUPPLIER)) {
            checkOwnedBySupplier(order);
        }
        return PurchaseOrderResponse.from(order);
    }

    // ---------------------------------------------------------------- Subject

    @Override
    public void addObserver(PurchaseOrderObserver observer) {
        if (!observers.contains(observer)) {
            observers.add(observer);
        }
    }

    @Override
    public void removeObserver(PurchaseOrderObserver observer) {
        observers.remove(observer);
    }

    @Override
    public void notifyObservers(PurchaseOrder order, PurchaseOrderStatus previousStatus) {
        for (PurchaseOrderObserver observer : observers) {
            observer.update(order, previousStatus);
        }
    }

    // ---------------------------------------------------------------- CRUD (procurement)

    public PurchaseOrderResponse create(PurchaseOrderRequest request) {
        Supplier supplier = supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> NotFoundException.of("Supplier", request.supplierId()));
        if (!supplier.isActive()) {
            throw new BusinessException("Supplier '" + supplier.getName() + "' is inactive");
        }

        // every order must come from a request the inventory manager approved - nothing can be bought without approval
        if (request.purchaseRequestId() == null) {
            throw new BusinessException("A purchase order can only be created from a purchase request approved by the inventory manager. Raise a purchase request first.");
        }
        PurchaseRequest purchaseRequest = requestRepository.findById(request.purchaseRequestId())
                .orElseThrow(() -> NotFoundException.of("Purchase request", request.purchaseRequestId()));
        if (purchaseRequest.getStatus() != PurchaseRequestStatus.APPROVED) {
            throw new BusinessException("Purchase request #" + purchaseRequest.getId() + " is " + purchaseRequest.getStatus()
                    + " - only an APPROVED request can be turned into an order");
        }
        if (!purchaseRequest.getSupplier().getId().equals(supplier.getId())) {
            throw new BusinessException("The purchase request is for supplier '"
                    + purchaseRequest.getSupplier().getName() + "'");
        }

        PurchaseOrder order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setCreatedBy(currentUser.get());
        order.setPurchaseRequest(purchaseRequest);

        applyDetails(order, request);
        orderRepository.save(order);
        notifyObservers(order, null); // request -> ORDERED, supplier told about the new order
        return PurchaseOrderResponse.from(order);
    }

    /** Editable only while the supplier has not responded yet. */
    public PurchaseOrderResponse update(Long id, PurchaseOrderRequest request) {
        PurchaseOrder order = getOrder(id);
        if (order.getStatus() != PurchaseOrderStatus.PENDING) {
            throw new ConflictException("Only PENDING purchase orders can be edited (this one is " + order.getStatus() + ")");
        }
        if (!order.getSupplier().getId().equals(request.supplierId())) {
            Supplier supplier = supplierRepository.findById(request.supplierId())
                    .orElseThrow(() -> NotFoundException.of("Supplier", request.supplierId()));
            if (order.getPurchaseRequest() != null) {
                throw new BusinessException("The supplier cannot be changed on an order created from a purchase request");
            }
            order.setSupplier(supplier);
        }

        order.getItems().clear();
        orderRepository.flush();
        applyDetails(order, request);
        return PurchaseOrderResponse.from(orderRepository.save(order));
    }

    /** Status changes made by procurement staff (cancel / re-open). */
    public PurchaseOrderResponse changeStatus(Long id, PurchaseOrderStatusRequest request) {
        PurchaseOrder order = getOrder(id);
        PurchaseOrderStatus next = request.status();

        if (next == PurchaseOrderStatus.CANCELLED) {
            if (receiptRepository.countByPurchaseOrderItemPurchaseOrderId(id) > 0) {
                throw new ConflictException("Goods have already been received for this order. Delete the goods receipts first.");
            }
            if (order.getStatus() == PurchaseOrderStatus.CANCELLED) {
                throw new ConflictException("Order is already cancelled");
            }
        } else if (next == PurchaseOrderStatus.PENDING) {
            if (order.getStatus() != PurchaseOrderStatus.CANCELLED && order.getStatus() != PurchaseOrderStatus.DECLINED) {
                throw new ConflictException("Only cancelled or declined orders can be re-opened");
            }
            PurchaseRequest purchaseRequest = order.getPurchaseRequest();
            if (purchaseRequest != null && purchaseRequest.getStatus() != PurchaseRequestStatus.APPROVED) {
                throw new ConflictException("Purchase request #" + purchaseRequest.getId()
                        + " has already been ordered again with another purchase order");
            }
        } else {
            throw new BusinessException("Procurement can only CANCEL or re-open (PENDING) an order. "
                    + "Confirm / decline / ship is done by the supplier, and receiving happens through goods receipts.");
        }

        PurchaseOrderStatus previous = order.getStatus();
        order.setStatus(next);
        if (Text.clean(request.note()) != null) {
            order.setNote(request.note().trim());
        }
        notifyObservers(order, previous);
        return PurchaseOrderResponse.from(order);
    }

    /** Physical delete (items cascade). The linked purchase request goes back to APPROVED. */
    public void delete(Long id) {
        PurchaseOrder order = getOrder(id);
        long receipts = receiptRepository.countByPurchaseOrderItemPurchaseOrderId(id);
        if (receipts > 0) {
            throw new ConflictException("Purchase order #" + id + " has " + receipts
                    + " goods receipt(s). Delete them first (this also reverses the stock).");
        }
        PurchaseRequest purchaseRequest = order.getPurchaseRequest();
        boolean activeOrder = order.getStatus() != PurchaseOrderStatus.CANCELLED && order.getStatus() != PurchaseOrderStatus.DECLINED;
        if (purchaseRequest != null && activeOrder) {
            purchaseRequest.setStatus(PurchaseRequestStatus.APPROVED);
        }
        orderRepository.delete(order);
    }

    // ---------------------------------------------------------------- supplier portal

    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> findForLoggedInSupplier() {
        Supplier supplier = loggedInSupplier();
        return orderRepository.findBySupplier(supplier.getId()).stream().map(PurchaseOrderResponse::from).toList();
    }

    /** Supplier confirms, declines or ships an order sent to them. */
    public PurchaseOrderResponse supplierUpdate(Long id, PurchaseOrderStatusRequest request) {
        PurchaseOrder order = getOrder(id);
        checkOwnedBySupplier(order);

        PurchaseOrderStatus current = order.getStatus();
        PurchaseOrderStatus next = request.status();
        boolean allowed = (current == PurchaseOrderStatus.PENDING
                && (next == PurchaseOrderStatus.CONFIRMED || next == PurchaseOrderStatus.DECLINED))
                || (current == PurchaseOrderStatus.CONFIRMED && next == PurchaseOrderStatus.SHIPPED);
        if (!allowed) {
            throw new ConflictException("An order that is " + current + " cannot be changed to " + next);
        }
        if (next == PurchaseOrderStatus.DECLINED && Text.clean(request.note()) == null) {
            throw new BusinessException("Please tell the buyer why the order is declined");
        }

        order.setStatus(next);
        order.setSupplierNote(Text.clean(request.note()));
        notifyObservers(order, current); // request status, procurement and inventory manager kept informed
        return PurchaseOrderResponse.from(order);
    }

    // ---------------------------------------------------------------- helpers

    private void applyDetails(PurchaseOrder order, PurchaseOrderRequest request) {
        order.setExpectedDeliveryDate(request.expectedDeliveryDate());
        order.setDeliveryAddress(request.deliveryAddress().trim());
        order.setNote(Text.clean(request.note()));

        Set<Long> seen = new HashSet<>();
        for (PurchaseOrderItemRequest line : request.items()) {
            if (!seen.add(line.sparePartId())) {
                throw new BusinessException("Each spare part can appear only once in an order - combine the quantities");
            }
            SparePart part = sparePartRepository.findById(line.sparePartId())
                    .orElseThrow(() -> NotFoundException.of("Spare part", line.sparePartId()));

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setSparePart(part);
            item.setQuantity(line.quantity());
            item.setUnitCost(line.unitCost());
            order.addItem(item);
        }

        checkMatchesApproval(order);
        order.recalculateTotal();
    }

    /** The order may only contain the approved part, and not more than the approved quantity. */
    private static void checkMatchesApproval(PurchaseOrder order) {
        PurchaseRequest approved = order.getPurchaseRequest();
        if (approved == null) {
            return; // orders made before approvals were required
        }
        SparePart part = approved.getSparePart();
        boolean onlyApprovedPart = order.getItems().stream().allMatch(i -> i.getSparePart().getId().equals(part.getId()));
        if (!onlyApprovedPart || order.getItems().isEmpty()) {
            throw new BusinessException("Purchase request #" + approved.getId() + " was approved for '" + part.getName()
                    + "' only - other parts need their own approved request");
        }
        int quantity = order.getItems().get(0).getQuantity();
        if (quantity > approved.getQuantity()) {
            throw new BusinessException("The inventory manager approved " + approved.getQuantity() + " × '" + part.getName()
                    + "' - the order cannot be for more (" + quantity + ")");
        }
    }

    private Supplier loggedInSupplier() {
        User user = currentUser.get();
        return supplierRepository.findByPortalUserId(user.getId())
                .orElseThrow(() -> new AccessDeniedException("Your login is not linked to a supplier"));
    }

    private void checkOwnedBySupplier(PurchaseOrder order) {
        if (!order.getSupplier().getId().equals(loggedInSupplier().getId())) {
            throw NotFoundException.of("Purchase order", order.getId());
        }
    }

    PurchaseOrder getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> NotFoundException.of("Purchase order", id));
    }
}
