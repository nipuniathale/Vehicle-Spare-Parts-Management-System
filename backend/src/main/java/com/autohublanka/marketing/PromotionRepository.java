package com.autohublanka.marketing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    List<Promotion> findAllByOrderByStartDateDesc();

    @Query("""
            select p from Promotion p
            where p.active = true and p.startDate <= :today and p.endDate >= :today
            order by p.endDate
            """)
    List<Promotion> findRunning(@Param("today") LocalDate today);

    @Query("select p from Promotion p join p.spareParts s where s.id = :sparePartId")
    List<Promotion> findBySparePart(@Param("sparePartId") Long sparePartId);
}
