package com.autohublanka.procurement;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

    long countBySparePartId(Long sparePartId);
}
