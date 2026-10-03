package com.autohublanka.sales.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        Long id,
        List<Line> items,
        int itemCount,
        BigDecimal total
) {
    public record Line(
            Long id,
            Long sparePartId,
            String name,
            String sku,
            String imageUrl,
            BigDecimal listPrice,
            BigDecimal unitPrice,
            int quantity,
            BigDecimal subtotal,
            int availableStock
    ) {
    }
}
