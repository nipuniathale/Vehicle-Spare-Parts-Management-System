package com.autohublanka.support;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RmaRepository extends JpaRepository<Rma, Long> {

    @Query("""
            select r from Rma r
            join fetch r.customer
            join fetch r.orderItem i
            join fetch i.sparePart
            order by r.createdAt desc
            """)
    List<Rma> findAllForList();

    List<Rma> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Rma> findByOrderItemId(Long orderItemId);

    @Query("select r from Rma r where r.orderItem.order.id = :orderId")
    List<Rma> findByOrder(@Param("orderId") Long orderId);

    long countByStatus(RmaStatus status);
}
