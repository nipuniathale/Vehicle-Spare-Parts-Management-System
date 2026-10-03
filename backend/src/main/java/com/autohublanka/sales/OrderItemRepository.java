package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    long countBySparePartId(Long sparePartId);
}
