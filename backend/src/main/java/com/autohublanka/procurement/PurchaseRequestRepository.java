package com.autohublanka.procurement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long> {

    @Query("""
            select r from PurchaseRequest r
            join fetch r.sparePart
            join fetch r.supplier
            left join fetch r.requestedBy
            order by r.createdAt desc
            """)
    List<PurchaseRequest> findAllForList();

    long countBySupplierId(Long supplierId);

    long countBySparePartId(Long sparePartId);

    long countByRequestedById(Long userId);

    long countByStatus(PurchaseRequestStatus status);

    @Modifying
    @Query("update PurchaseRequest r set r.reviewedBy = null where r.reviewedBy.id = :userId")
    void clearReviewer(@Param("userId") Long userId);
}
