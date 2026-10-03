package com.autohublanka.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FitmentRepository extends JpaRepository<Fitment, Long> {

    boolean existsByVehicleIdAndSparePartId(Long vehicleId, Long sparePartId);

    boolean existsByVehicleIdAndSparePartIdAndIdNot(Long vehicleId, Long sparePartId, Long id);

    long countByVehicleId(Long vehicleId);

    long countBySparePartId(Long sparePartId);

    void deleteByVehicleId(Long vehicleId);

    void deleteBySparePartId(Long sparePartId);

    @Query("""
            select f from Fitment f
            join fetch f.vehicle v
            join fetch f.sparePart p
            where (:vehicleId is null or v.id = :vehicleId)
              and (:sparePartId is null or p.id = :sparePartId)
            order by v.make, v.model, p.name
            """)
    List<Fitment> search(@Param("vehicleId") Long vehicleId, @Param("sparePartId") Long sparePartId);
}
