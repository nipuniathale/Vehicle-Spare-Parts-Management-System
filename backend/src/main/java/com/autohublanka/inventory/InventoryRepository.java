package com.autohublanka.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findBySparePartId(Long sparePartId);

    boolean existsBySparePartId(Long sparePartId);

    List<Inventory> findBySparePartIdIn(Collection<Long> sparePartIds);

    @Query("select i from Inventory i join fetch i.sparePart p order by p.name")
    List<Inventory> findAllWithPart();

    @Query("select i from Inventory i join fetch i.sparePart p where i.quantity <= i.reorderLevel order by i.quantity")
    List<Inventory> findLowStock();
}
