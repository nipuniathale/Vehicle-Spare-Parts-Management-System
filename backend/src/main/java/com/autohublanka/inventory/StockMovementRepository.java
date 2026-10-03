package com.autohublanka.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @Query("""
            select m from StockMovement m
            join fetch m.inventory i
            join fetch i.sparePart p
            where (:inventoryId is null or i.id = :inventoryId)
            order by m.createdAt desc, m.id desc
            """)
    List<StockMovement> search(@Param("inventoryId") Long inventoryId);

    List<StockMovement> findByInventoryId(Long inventoryId);
}
