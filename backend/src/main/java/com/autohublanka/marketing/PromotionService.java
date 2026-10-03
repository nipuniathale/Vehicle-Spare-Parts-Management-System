package com.autohublanka.marketing;

import com.autohublanka.catalog.SparePart;
import com.autohublanka.catalog.SparePartRepository;
import com.autohublanka.common.Text;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.marketing.dto.PromotionRequest;
import com.autohublanka.marketing.dto.PromotionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final SparePartRepository sparePartRepository;

    public PromotionService(PromotionRepository promotionRepository, SparePartRepository sparePartRepository) {
        this.promotionRepository = promotionRepository;
        this.sparePartRepository = sparePartRepository;
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> findAll() {
        return promotionRepository.findAllByOrderByStartDateDesc().stream().map(PromotionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> findRunning() {
        return promotionRepository.findRunning(LocalDate.now()).stream().map(PromotionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PromotionResponse findById(Long id) {
        return PromotionResponse.from(getPromotion(id));
    }

    public PromotionResponse create(PromotionRequest request) {
        DateRules.check(request.startDate(), request.endDate(), true);
        Promotion promotion = new Promotion();
        apply(promotion, request);
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    public PromotionResponse update(Long id, PromotionRequest request) {
        Promotion promotion = getPromotion(id);
        DateRules.check(request.startDate(), request.endDate(), false);
        apply(promotion, request);
        return PromotionResponse.from(promotionRepository.save(promotion));
    }

    /** Physical delete; rows in promotion_spare_parts are removed automatically. */
    public void delete(Long id) {
        promotionRepository.delete(getPromotion(id));
    }

    private void apply(Promotion promotion, PromotionRequest request) {
        promotion.setTitle(request.title().trim());
        promotion.setDescription(Text.clean(request.description()));
        promotion.setImageUrl(Text.clean(request.imageUrl()));
        promotion.setStartDate(request.startDate());
        promotion.setEndDate(request.endDate());
        promotion.setActive(request.active() == null || request.active());

        promotion.getSpareParts().clear();
        if (request.sparePartIds() != null) {
            for (Long partId : request.sparePartIds()) {
                SparePart part = sparePartRepository.findById(partId)
                        .orElseThrow(() -> NotFoundException.of("Spare part", partId));
                promotion.getSpareParts().add(part);
            }
        }
    }

    private Promotion getPromotion(Long id) {
        return promotionRepository.findById(id).orElseThrow(() -> NotFoundException.of("Promotion", id));
    }
}
