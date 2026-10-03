package com.autohublanka.marketing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DiscountRepository extends JpaRepository<Discount, Long> {

    @Query("select d from Discount d join fetch d.sparePart order by d.createdAt desc")
    List<Discount> findAllForList();

    /** Discounts that apply today. */
    @Query("""
            select d from Discount d join fetch d.sparePart
            where d.active = true and d.startDate <= :today and d.endDate >= :today
            """)
    List<Discount> findRunning(@Param("today") LocalDate today);

    /** Any active discount on the same part whose dates overlap the given period. */
    @Query("""
            select count(d) from Discount d
            where d.sparePart.id = :sparePartId
              and d.active = true
              and d.startDate <= :endDate and d.endDate >= :startDate
              and (:excludeId is null or d.id <> :excludeId)
            """)
    long countOverlapping(@Param("sparePartId") Long sparePartId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate,
                          @Param("excludeId") Long excludeId);

    void deleteBySparePartId(Long sparePartId);
}
