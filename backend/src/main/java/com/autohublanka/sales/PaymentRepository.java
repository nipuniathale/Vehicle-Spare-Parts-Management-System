package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("select p from Payment p join fetch p.order o join fetch o.customer order by p.createdAt desc")
    List<Payment> findAllForList();

    List<Payment> findByOrderIdOrderByIdDesc(Long orderId);

    Optional<Payment> findFirstByOrderIdOrderByIdDesc(Long orderId);

    void deleteByOrderId(Long orderId);
}
