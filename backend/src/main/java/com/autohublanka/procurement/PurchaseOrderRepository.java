package com.autohublanka.procurement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    @Query("select o from PurchaseOrder o join fetch o.supplier order by o.createdAt desc")
    List<PurchaseOrder> findAllForList();

    @Query("select o from PurchaseOrder o join fetch o.supplier s where s.id = :supplierId order by o.createdAt desc")
    List<PurchaseOrder> findBySupplier(@Param("supplierId") Long supplierId);

    long countBySupplierId(Long supplierId);

    @Query("select o from PurchaseOrder o join fetch o.supplier where o.status in :statuses order by o.expectedDeliveryDate, o.id")
    List<PurchaseOrder> findByStatusIn(@Param("statuses") List<PurchaseOrderStatus> statuses);

    long countByStatusIn(List<PurchaseOrderStatus> statuses);

    /** Newest first - a request can have an older declined / cancelled order and a newer one. */
    List<PurchaseOrder> findByPurchaseRequestIdOrderByIdDesc(Long purchaseRequestId);

    @Modifying
    @Query("update PurchaseOrder o set o.createdBy = null where o.createdBy.id = :userId")
    void clearCreator(@Param("userId") Long userId);
}
