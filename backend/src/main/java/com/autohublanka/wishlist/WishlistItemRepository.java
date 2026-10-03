package com.autohublanka.wishlist;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    @Query("""
            select w from WishlistItem w join fetch w.sparePart p join fetch p.category
            where w.customer.id = :customerId order by w.createdAt desc, w.id desc
            """)
    List<WishlistItem> findForCustomer(@Param("customerId") Long customerId);

    Optional<WishlistItem> findByCustomerIdAndSparePartId(Long customerId, Long sparePartId);

    boolean existsByCustomerIdAndSparePartId(Long customerId, Long sparePartId);

    @Modifying
    @Query("delete from WishlistItem w where w.customer.id = :customerId")
    void deleteByCustomer(@Param("customerId") Long customerId);

    @Modifying
    @Query("delete from WishlistItem w where w.sparePart.id = :sparePartId")
    void deleteBySparePart(@Param("sparePartId") Long sparePartId);
}
