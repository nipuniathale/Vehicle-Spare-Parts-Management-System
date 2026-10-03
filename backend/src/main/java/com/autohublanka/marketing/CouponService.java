package com.autohublanka.marketing;

import com.autohublanka.marketing.price.BasePrice;
import com.autohublanka.marketing.price.CouponDecorator;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.marketing.dto.CouponCheckResponse;
import com.autohublanka.marketing.dto.CouponRequest;
import com.autohublanka.marketing.dto.CouponResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class CouponService {

    private final CouponRepository couponRepository;

    public CouponService(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> findAll() {
        return couponRepository.findAllByOrderByCreatedAtDesc().stream().map(CouponResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CouponResponse findById(Long id) {
        return CouponResponse.from(getCoupon(id));
    }

    public CouponResponse create(CouponRequest request) {
        String code = request.code().trim().toUpperCase();
        if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Coupon code " + code + " already exists");
        }
        validate(request, true);
        Coupon coupon = new Coupon();
        apply(coupon, request, code);
        return CouponResponse.from(couponRepository.save(coupon));
    }

    public CouponResponse update(Long id, CouponRequest request) {
        Coupon coupon = getCoupon(id);
        String code = request.code().trim().toUpperCase();
        if (couponRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new ConflictException("Coupon code " + code + " already exists");
        }
        validate(request, false);
        if (request.usageLimit() > 0 && request.usageLimit() < coupon.getUsedCount()) {
            throw new BusinessException("Usage limit cannot be lower than the times already used (" + coupon.getUsedCount() + ")");
        }
        apply(coupon, request, code);
        return CouponResponse.from(couponRepository.save(coupon));
    }

    /** Physical delete. Orders keep the code as plain text, so old orders are not affected. */
    public void delete(Long id) {
        couponRepository.delete(getCoupon(id));
    }

    // ---------------------------------------------------------------- used by checkout

    @Transactional(readOnly = true)
    public CouponCheckResponse check(String code, BigDecimal orderAmount) {
        Coupon coupon = findUsable(code, orderAmount);
        CouponDecorator price = new CouponDecorator(new BasePrice(orderAmount, "Order"), coupon);
        return new CouponCheckResponse(coupon.getCode(), price.getSaving(), coupon.getDescription());
    }

    /** Validates the coupon for this order amount and throws a clear message when it cannot be used. */
    public Coupon findUsable(String code, BigDecimal orderAmount) {
        String clean = Text.clean(code);
        if (clean == null) {
            throw new BusinessException("Enter a coupon code");
        }
        Coupon coupon = couponRepository.findByCodeIgnoreCase(clean)
                .orElseThrow(() -> new BusinessException("Coupon " + clean.toUpperCase() + " does not exist"));

        switch (coupon.getStatus()) {
            case INACTIVE -> throw new BusinessException("Coupon " + coupon.getCode() + " is not active");
            case SCHEDULED -> throw new BusinessException("Coupon " + coupon.getCode() + " starts on " + coupon.getStartDate());
            case EXPIRED -> throw new BusinessException("Coupon " + coupon.getCode() + " expired on " + coupon.getEndDate());
            default -> { }
        }
        if (coupon.isUsageLimitReached()) {
            throw new BusinessException("Coupon " + coupon.getCode() + " has reached its usage limit");
        }
        if (orderAmount.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new BusinessException("Coupon " + coupon.getCode() + " needs a minimum order of Rs. " + coupon.getMinOrderAmount());
        }
        return coupon;
    }

    public void markUsed(Coupon coupon) {
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        couponRepository.save(coupon);
    }

    // ---------------------------------------------------------------- helpers

    private void validate(CouponRequest request, boolean isNew) {
        DateRules.check(request.startDate(), request.endDate(), isNew);
        if (request.type() == DiscountType.PERCENTAGE && request.value().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessException("A percentage coupon can be at most 100%");
        }
        if (request.type() == DiscountType.FIXED_AMOUNT && request.maxDiscountAmount() != null
                && request.maxDiscountAmount().signum() > 0) {
            throw new BusinessException("Maximum discount only applies to percentage coupons");
        }
    }

    private void apply(Coupon coupon, CouponRequest request, String code) {
        coupon.setCode(code);
        coupon.setDescription(Text.clean(request.description()));
        coupon.setType(request.type());
        coupon.setValue(request.value());
        coupon.setMinOrderAmount(request.minOrderAmount());
        coupon.setMaxDiscountAmount(request.maxDiscountAmount() != null && request.maxDiscountAmount().signum() > 0
                ? request.maxDiscountAmount() : null);
        coupon.setUsageLimit(request.usageLimit());
        coupon.setStartDate(request.startDate());
        coupon.setEndDate(request.endDate());
        coupon.setActive(request.active() == null || request.active());
    }

    private Coupon getCoupon(Long id) {
        return couponRepository.findById(id).orElseThrow(() -> NotFoundException.of("Coupon", id));
    }
}
