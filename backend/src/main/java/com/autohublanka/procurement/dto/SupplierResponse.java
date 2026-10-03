package com.autohublanka.procurement.dto;

import com.autohublanka.procurement.Supplier;

import java.time.LocalDateTime;

public record SupplierResponse(
        Long id,
        String name,
        String email,
        String phone,
        String contactPerson,
        String address,
        boolean active,
        boolean portalAccess,
        long purchaseOrderCount,
        LocalDateTime createdAt
) {
    public static SupplierResponse from(Supplier supplier, long purchaseOrderCount) {
        return new SupplierResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getEmail(),
                supplier.getPhone(),
                supplier.getContactPerson(),
                supplier.getAddress(),
                supplier.isActive(),
                supplier.getPortalUser() != null,
                purchaseOrderCount,
                supplier.getCreatedAt()
        );
    }
}
