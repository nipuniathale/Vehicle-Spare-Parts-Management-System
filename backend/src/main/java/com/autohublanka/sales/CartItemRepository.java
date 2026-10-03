package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    @Modifying
    @Query("delete from CartItem c where c.sparePart.id = :sparePartId")
    void deleteBySparePart(@Param("sparePartId") Long sparePartId);
}
