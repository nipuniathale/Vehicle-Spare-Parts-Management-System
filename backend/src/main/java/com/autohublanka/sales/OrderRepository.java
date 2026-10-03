package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("select o from Order o join fetch o.customer order by o.createdAt desc")
    List<Order> findAllForList();

    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    long countByCustomerId(Long customerId);

    long countByStatus(OrderStatus status);

    @Modifying
    @Query("update Order o set o.placedBy = null where o.placedBy.id = :userId")
    void clearPlacedBy(@Param("userId") Long userId);

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o where o.paymentStatus = com.autohublanka.sales.PaymentStatus.PAID")
    BigDecimal totalPaidRevenue();
}
