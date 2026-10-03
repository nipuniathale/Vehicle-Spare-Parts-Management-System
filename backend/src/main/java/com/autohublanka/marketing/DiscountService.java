package com.autohublanka.marketing;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.marketing.dto.DiscountRequest;
import com.autohublanka.marketing.dto.DiscountResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class DiscountService {

    private static final BigDecimal MAX_PERCENTAGE = BigDecimal.valueOf(90);

    private final DiscountRepository discountRepository;
    private final SparePartRepository sparePartRepository;

    public DiscountService(DiscountRepository discountRepository, SparePartRepository sparePartRepository) {
        this.discountRepository = discountRepository;
        this.sparePartRepository = sparePartRepository;
    }

    @Transactional(readOnly = true)
    public List<DiscountResponse> findAll() {
        return discountRepository.findAllForList().stream().map(DiscountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DiscountResponse> findRunning() {
        return discountRepository.findRunning(LocalDate.now()).stream().map(DiscountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public DiscountResponse findById(Long id) {
        return DiscountResponse.from(getDiscount(id));
    }

    public DiscountResponse create(DiscountRequest request) {
        Discount discount = new Discount();
        validate(request, null, true);
        apply(discount, request);
        return DiscountResponse.from(discountRepository.save(discount));
    }

    public DiscountResponse update(Long id, DiscountRequest request) {
        Discount discount = getDiscount(id);
        validate(request, id, false);
        apply(discount, request);
        return DiscountResponse.from(discountRepository.save(discount));
    }

    public void delete(Long id) {
        discountRepository.delete(getDiscount(id));
    }

    private void validate(DiscountRequest request, Long currentId, boolean isNew) {
        DateRules.check(request.startDate(), request.endDate(), isNew);
        SparePart part = getPart(request.sparePartId());

        if (request.type() == DiscountType.PERCENTAGE && request.value().compareTo(MAX_PERCENTAGE) > 0) {
            throw new BusinessException("A percentage discount can be at most 90%");
        }
        if (request.type() == DiscountType.FIXED_AMOUNT && request.value().compareTo(part.getPrice()) >= 0) {
            throw new BusinessException("A fixed discount must be less than the part price (Rs. " + part.getPrice() + ")");
        }

        boolean active = request.active() == null || request.active();
        if (active && discountRepository.countOverlapping(part.getId(), request.startDate(), request.endDate(), currentId) > 0) {
            throw new ConflictException("'" + part.getName() + "' already has an active discount in this period");
        }
    }

    private void apply(Discount discount, DiscountRequest request) {
        discount.setSparePart(getPart(request.sparePartId()));
        discount.setName(request.name().trim());
        discount.setType(request.type());
        discount.setValue(request.value());
        discount.setStartDate(request.startDate());
        discount.setEndDate(request.endDate());
        discount.setActive(request.active() == null || request.active());
    }

    private SparePart getPart(Long id) {
        return sparePartRepository.findById(id).orElseThrow(() -> NotFoundException.of("Spare part", id));
    }

    private Discount getDiscount(Long id) {
        return discountRepository.findById(id).orElseThrow(() -> NotFoundException.of("Discount", id));
    }
}
