package com.autohublanka.marketing;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.marketing.price.Price;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/** Finds the product discounts that apply today. */
@Service
@Transactional(readOnly = true)
public class PricingService {

    private final DiscountRepository discountRepository;

    public PricingService(DiscountRepository discountRepository) {
        this.discountRepository = discountRepository;
    }

    /** sparePartId -> discount running today (the one giving the lowest price wins). */
    public Map<Long, Discount> runningDiscounts() {
        Map<Long, Discount> result = new HashMap<>();
        for (Discount discount : discountRepository.findRunning(LocalDate.now())) {
            Long partId = discount.getSparePart().getId();
            Discount current = result.get(partId);
            SparePart part = discount.getSparePart();
            if (current == null || Price.forPart(part, discount).getAmount().compareTo(Price.forPart(part, current).getAmount()) < 0) {
                result.put(partId, discount);
            }
        }
        return result;
    }

    public Discount runningDiscountFor(Long sparePartId) {
        return runningDiscounts().get(sparePartId);
    }
}
