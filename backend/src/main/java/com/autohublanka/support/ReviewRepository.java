package com.autohublanka.support;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @Query("""
            select r from Review r join fetch r.customer join fetch r.sparePart
            order by r.createdAt desc
            """)
    List<Review> findAllForList();

    @Query("select r from Review r join fetch r.customer where r.sparePart.id = :sparePartId order by r.createdAt desc")
    List<Review> findForPart(@Param("sparePartId") Long sparePartId);

    List<Review> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    boolean existsByOrderItemId(Long orderItemId);

    @Query("select avg(r.rating) from Review r where r.sparePart.id = :sparePartId")
    Double averageRating(@Param("sparePartId") Long sparePartId);

    @Modifying
    @Query("delete from Review r where r.orderItem.order.id = :orderId")
    void deleteByOrder(@Param("orderId") Long orderId);

    @Modifying
    @Query("delete from Review r where r.customer.id = :customerId")
    void deleteByCustomer(@Param("customerId") Long customerId);
}
