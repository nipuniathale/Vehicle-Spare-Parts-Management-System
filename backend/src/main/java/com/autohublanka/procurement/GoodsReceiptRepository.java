package com.autohublanka.procurement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {

    @Query("""
            select g from GoodsReceipt g
            join fetch g.purchaseOrderItem i
            join fetch i.purchaseOrder o
            join fetch o.supplier
            join fetch i.sparePart
            where (:purchaseOrderId is null or o.id = :purchaseOrderId)
            order by g.createdAt desc
            """)
    List<GoodsReceipt> search(@Param("purchaseOrderId") Long purchaseOrderId);

    long countByPurchaseOrderItemPurchaseOrderId(Long purchaseOrderId);

    long countByPurchaseOrderItemId(Long purchaseOrderItemId);

    boolean existsByStockMovementId(Long stockMovementId);

    boolean existsByStockMovementInventoryId(Long inventoryId);

    @Modifying
    @Query("update GoodsReceipt g set g.receivedBy = null where g.receivedBy.id = :userId")
    void clearReceiver(@Param("userId") Long userId);
}
