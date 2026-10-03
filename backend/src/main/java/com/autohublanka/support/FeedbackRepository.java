package com.autohublanka.support;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    @Query("select f from Feedback f join fetch f.customer order by f.createdAt desc")
    List<Feedback> findAllForList();

    List<Feedback> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    /** Homepage list (newest first). */
    @Query("select f from Feedback f join fetch f.customer order by f.createdAt desc")
    List<Feedback> findPublic();

    /** Feedback stays when an order is deleted, it just loses the link. */
    @Modifying
    @Query("update Feedback f set f.order = null where f.order.id = :orderId")
    void detachOrder(@Param("orderId") Long orderId);

    @Modifying
    @Query("delete from Feedback f where f.customer.id = :customerId")
    void deleteByCustomer(@Param("customerId") Long customerId);
}
