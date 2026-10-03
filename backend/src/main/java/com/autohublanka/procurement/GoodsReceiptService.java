package com.autohublanka.procurement;

import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.inventory.MovementType;
import com.autohublanka.inventory.StockMovement;
import com.autohublanka.inventory.StockService;
import com.autohublanka.procurement.dto.GoodsReceiptRequest;
import com.autohublanka.procurement.dto.GoodsReceiptResponse;
import com.autohublanka.procurement.dto.PurchaseOrderResponse;
import com.autohublanka.procurement.dto.ReceiveGoodsRequest;
import com.autohublanka.procurement.dto.ReceiveGoodsResponse;
import com.autohublanka.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Receiving goods increases stock through a PURCHASE stock movement. */
@Service
@Transactional
public class GoodsReceiptService {

    private static final Set<PurchaseOrderStatus> RECEIVABLE = EnumSet.of(
            PurchaseOrderStatus.CONFIRMED,
            PurchaseOrderStatus.SHIPPED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED);

    private final GoodsReceiptRepository receiptRepository;
    private final PurchaseOrderRepository orderRepository;
    private final StockService stockService;
    private final CurrentUser currentUser;

    public GoodsReceiptService(GoodsReceiptRepository receiptRepository,
                               PurchaseOrderRepository orderRepository,
                               StockService stockService,
                               CurrentUser currentUser) {
        this.receiptRepository = receiptRepository;
        this.orderRepository = orderRepository;
        this.stockService = stockService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<GoodsReceiptResponse> findAll(Long purchaseOrderId) {
        return receiptRepository.search(purchaseOrderId).stream().map(GoodsReceiptResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public GoodsReceiptResponse findById(Long id) {
        return GoodsReceiptResponse.from(getReceipt(id));
    }

    /** Purchase orders that are waiting for goods (confirmed or shipped by the supplier, or partly received). */
    @Transactional(readOnly = true)
    public List<PurchaseOrderResponse> receivableOrders() {
        return orderRepository.findByStatusIn(List.copyOf(RECEIVABLE)).stream().map(PurchaseOrderResponse::from).toList();
    }

    /**
     * Records one delivery against a purchase order. Every line that arrived gets its own goods receipt (GRN)
     * and a PURCHASE stock movement; the order becomes PARTIALLY_RECEIVED or RECEIVED. All or nothing.
     */
    public ReceiveGoodsResponse receive(ReceiveGoodsRequest request) {
        PurchaseOrder order = orderRepository.findById(request.purchaseOrderId())
                .orElseThrow(() -> NotFoundException.of("Purchase order", request.purchaseOrderId()));
        if (!RECEIVABLE.contains(order.getStatus())) {
            throw new ConflictException("Goods can only be received for CONFIRMED, SHIPPED or PARTIALLY_RECEIVED orders. "
                    + "Purchase order #" + order.getId() + " is " + order.getStatus());
        }

        Set<Long> seen = new HashSet<>();
        List<GoodsReceiptResponse> created = new ArrayList<>();
        for (ReceiveGoodsRequest.Line line : request.lines()) {
            if (!seen.add(line.purchaseOrderItemId())) {
                throw new BusinessException("Each order line can appear only once");
            }
            PurchaseOrderItem item = order.getItems().stream()
                    .filter(i -> i.getId().equals(line.purchaseOrderItemId()))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Line #" + line.purchaseOrderItemId()
                            + " does not belong to purchase order #" + order.getId()));
            if (line.receivedQuantity() == 0) {
                continue;
            }
            checkQuantity(item, line.receivedQuantity(), 0);

            GoodsReceipt receipt = new GoodsReceipt();
            receipt.setPurchaseOrderItem(item);
            receipt.setReceivedQuantity(line.receivedQuantity());
            receipt.setNote(Text.clean(request.note()));
            receipt.setReceivedBy(currentUser.get());
            receiptRepository.save(receipt);

            StockMovement movement = stockService.recordSystemMovement(item.getSparePart(), MovementType.PURCHASE,
                    line.receivedQuantity(), "GRN-" + receipt.getId(), "Received for purchase order #" + order.getId());
            receipt.setStockMovement(movement);
            item.setReceivedQuantity(item.getReceivedQuantity() + line.receivedQuantity());
            created.add(GoodsReceiptResponse.from(receipt));
        }
        if (created.isEmpty()) {
            throw new BusinessException("Enter the quantity received for at least one line");
        }
        refreshOrderStatus(order);
        return new ReceiveGoodsResponse(order.getId(), order.getStatus(), created);
    }

    /** Changing the quantity also corrects the stock and the linked movement. */
    public GoodsReceiptResponse update(Long id, GoodsReceiptRequest request) {
        GoodsReceipt receipt = getReceipt(id);
        PurchaseOrderItem item = receipt.getPurchaseOrderItem();

        if (!item.getId().equals(request.purchaseOrderItemId())) {
            throw new BusinessException("A goods receipt cannot be moved to another order line. Delete it and create a new one.");
        }
        checkQuantity(item, request.receivedQuantity(), receipt.getReceivedQuantity());

        int difference = request.receivedQuantity() - receipt.getReceivedQuantity();
        StockMovement movement = receipt.getStockMovement();
        if (difference != 0 && movement != null) {
            stockService.applyChange(movement.getInventory(), difference);
            movement.setQuantity(request.receivedQuantity());
        }

        item.setReceivedQuantity(item.getReceivedQuantity() + difference);
        receipt.setReceivedQuantity(request.receivedQuantity());
        receipt.setNote(Text.clean(request.note()));
        refreshOrderStatus(item.getPurchaseOrder());
        return GoodsReceiptResponse.from(receipt);
    }

    /** Physical delete: removes the stock that was added and the PURCHASE movement. */
    public void delete(Long id) {
        GoodsReceipt receipt = getReceipt(id);
        PurchaseOrderItem item = receipt.getPurchaseOrderItem();
        StockMovement movement = receipt.getStockMovement();

        receipt.setStockMovement(null);
        receiptRepository.delete(receipt);
        receiptRepository.flush();
        if (movement != null) {
            stockService.revertAndDelete(movement);
        }

        item.setReceivedQuantity(item.getReceivedQuantity() - receipt.getReceivedQuantity());
        refreshOrderStatus(item.getPurchaseOrder());
    }

    private void checkQuantity(PurchaseOrderItem item, int newQuantity, int currentReceiptQuantity) {
        int remaining = item.getRemainingQuantity() + currentReceiptQuantity;
        if (newQuantity > remaining) {
            throw new BusinessException("Only " + remaining + " unit(s) of '" + item.getSparePart().getName()
                    + "' are still expected on this order (ordered " + item.getQuantity() + ")");
        }
    }

    private void refreshOrderStatus(PurchaseOrder order) {
        int ordered = order.getItems().stream().mapToInt(PurchaseOrderItem::getQuantity).sum();
        int received = order.getItems().stream().mapToInt(PurchaseOrderItem::getReceivedQuantity).sum();
        if (received == 0) {
            order.setStatus(PurchaseOrderStatus.SHIPPED);
        } else if (received < ordered) {
            order.setStatus(PurchaseOrderStatus.PARTIALLY_RECEIVED);
        } else {
            order.setStatus(PurchaseOrderStatus.RECEIVED);
        }
    }

    private GoodsReceipt getReceipt(Long id) {
        return receiptRepository.findById(id).orElseThrow(() -> NotFoundException.of("Goods receipt", id));
    }
}
