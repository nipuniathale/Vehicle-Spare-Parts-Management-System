package com.autohublanka.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SparePartRepository extends JpaRepository<SparePart, Long> {

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    long countByCategoryId(Long categoryId);

    @Query("""
            select p from SparePart p
            join fetch p.category c
            where (:categoryId is null or c.id = :categoryId)
              and (:activeOnly = false or (p.active = true and c.active = true))
              and (:search is null
                   or lower(p.name) like lower(concat('%', :search, '%'))
                   or lower(p.sku) like lower(concat('%', :search, '%'))
                   or lower(p.brand) like lower(concat('%', :search, '%')))
              and (:vehicleId is null or exists (
                   select f.id from Fitment f where f.sparePart = p and f.vehicle.id = :vehicleId))
              and (:make is null or exists (
                   select f2.id from Fitment f2 where f2.sparePart = p and lower(f2.vehicle.make) = lower(:make)))
            order by p.createdAt desc
            """)
    List<SparePart> search(@Param("search") String search,
                           @Param("categoryId") Long categoryId,
                           @Param("vehicleId") Long vehicleId,
                           @Param("make") String make,
                           @Param("activeOnly") boolean activeOnly);
}
