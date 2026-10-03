package com.autohublanka.support;

import com.autohublanka.common.Text;
import com.autohublanka.common.exception.BusinessException;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.notification.NotificationService;
import com.autohublanka.sales.OrderItem;
import com.autohublanka.sales.OrderItemRepository;
import com.autohublanka.sales.OrderStatus;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.settings.SettingsService;
import com.autohublanka.support.dto.RmaCompleteRequest;
import com.autohublanka.support.dto.RmaDecisionRequest;
import com.autohublanka.support.dto.RmaRequest;
import com.autohublanka.support.dto.RmaResponse;
import com.autohublanka.support.resolution.ClaimResolutionFactory;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;

/** Returns (within the return period set in Settings, 14 days by default) and warranty claims (within the part's warranty period). */
@Service
@Transactional
public class RmaService {

    private final RmaRepository rmaRepository;
    private final OrderItemRepository orderItemRepository;
    private final ClaimResolutionFactory resolutionFactory;
    private final CurrentUser currentUser;
    private final SettingsService settingsService;
    private final NotificationService notifications;

    public RmaService(RmaRepository rmaRepository,
                      OrderItemRepository orderItemRepository,
                      ClaimResolutionFactory resolutionFactory,
                      CurrentUser currentUser,
                      SettingsService settingsService,
                      NotificationService notifications) {
        this.rmaRepository = rmaRepository;
        this.orderItemRepository = orderItemRepository;
        this.resolutionFactory = resolutionFactory;
        this.currentUser = currentUser;
        this.settingsService = settingsService;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<RmaResponse> findAll() {
        return rmaRepository.findAllForList().stream().map(RmaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RmaResponse> findMine() {
        return rmaRepository.findByCustomerIdOrderByCreatedAtDesc(currentUser.get().getId()).stream()
                .map(RmaResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RmaResponse findById(Long id) {
        return RmaResponse.from(getAccessible(id));
    }

    // ---------------------------------------------------------------- customer

    public RmaResponse create(RmaRequest request) {
        User customer = currentUser.get();
        OrderItem item = orderItemRepository.findById(request.orderItemId())
                .filter(i -> i.getOrder().getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> NotFoundException.of("Order item", request.orderItemId()));

        validate(item, request, null);

        Rma rma = new Rma();
        rma.setCustomer(customer);
        rma.setOrderItem(item);
        apply(rma, request);
        return RmaResponse.from(rmaRepository.save(rma));
    }

    public RmaResponse update(Long id, RmaRequest request) {
        Rma rma = getOwn(id);
        if (rma.getStatus() != RmaStatus.REQUESTED) {
            throw new ConflictException("Only claims that are still REQUESTED can be edited");
        }
        if (!rma.getOrderItem().getId().equals(request.orderItemId())) {
            throw new BusinessException("A claim cannot be moved to another item");
        }
        validate(rma.getOrderItem(), request, rma.getId());
        apply(rma, request);
        return RmaResponse.from(rma);
    }

    // ---------------------------------------------------------------- staff

    public RmaResponse decide(Long id, RmaDecisionRequest request) {
        Rma rma = getRma(id);
        if (rma.getStatus() != RmaStatus.REQUESTED) {
            throw new ConflictException("This claim has already been " + rma.getStatus());
        }
        if (!request.approve() && Text.clean(request.note()) == null) {
            throw new BusinessException("Please give the customer a reason for rejecting the claim");
        }
        rma.setStatus(request.approve() ? RmaStatus.APPROVED : RmaStatus.REJECTED);
        rma.setStaffNote(Text.clean(request.note()));
        rma.setReviewedAt(LocalDateTime.now());
        notifications.claimChanged(rma);
        return RmaResponse.from(rma);
    }

    public RmaResponse complete(Long id, RmaCompleteRequest request) {
        Rma rma = getRma(id);
        if (rma.getStatus() != RmaStatus.APPROVED) {
            throw new ConflictException("Only APPROVED claims can be completed");
        }
        // FACTORY: the factory picks RefundResolution or ReplacementResolution
        resolutionFactory.getResolution(request.resolution()).resolve(rma, request);

        rma.setStatus(request.resolution());
        if (Text.clean(request.note()) != null) {
            rma.setStaffNote(request.note().trim());
        }
        rma.setCompletedAt(LocalDateTime.now());
        notifications.claimChanged(rma);
        return RmaResponse.from(rma);
    }

    /**
     * Physical delete. Customers can delete their own claim while REQUESTED or after REJECTED;
     * staff can delete any claim (stock movements already made keep their RMA reference as history).
     */
    public void delete(Long id) {
        Rma rma = getAccessible(id);
        if (currentUser.isCustomer() && !EnumSet.of(RmaStatus.REQUESTED, RmaStatus.REJECTED).contains(rma.getStatus())) {
            throw new ConflictException("A claim that is " + rma.getStatus() + " can no longer be deleted by the customer");
        }
        rmaRepository.delete(rma);
    }

    // ---------------------------------------------------------------- rules

    private void validate(OrderItem item, RmaRequest request, Long currentId) {
        if (item.getOrder().getStatus() != OrderStatus.DELIVERED || item.getOrder().getDeliveredAt() == null) {
            throw new BusinessException("Returns and warranty claims can be made only after the order is delivered");
        }
        LocalDateTime deliveredAt = item.getOrder().getDeliveredAt();

        if (request.type() == RmaType.RETURN) {
            int returnWindowDays = settingsService.current().returnWindowDays();
            if (deliveredAt.plusDays(returnWindowDays).isBefore(LocalDateTime.now())) {
                throw new BusinessException("The " + returnWindowDays + "-day return period for this item has ended");
            }
        } else {
            int months = item.getSparePart().getWarrantyMonths();
            if (months <= 0) {
                throw new BusinessException("'" + item.getSparePart().getName() + "' has no warranty");
            }
            if (deliveredAt.plusMonths(months).isBefore(LocalDateTime.now())) {
                throw new BusinessException("The " + months + "-month warranty for this item has expired");
            }
            if (request.reason() != RmaReason.DEFECTIVE && request.reason() != RmaReason.OTHER) {
                throw new BusinessException("Warranty covers defects only. Use a RETURN claim for this reason.");
            }
        }

        int alreadyClaimed = rmaRepository.findByOrderItemId(item.getId()).stream()
                .filter(r -> !r.getId().equals(currentId))
                .filter(r -> r.getStatus() != RmaStatus.REJECTED)
                .mapToInt(Rma::getQuantity)
                .sum();
        int allowed = item.getQuantity() - alreadyClaimed;
        if (request.quantity() > allowed) {
            throw new BusinessException("You can claim at most " + allowed + " more unit(s) of this item");
        }
    }

    private void apply(Rma rma, RmaRequest request) {
        rma.setType(request.type());
        rma.setReason(request.reason());
        rma.setQuantity(request.quantity());
        rma.setDescription(request.description().trim());
        rma.getImageUrls().clear();
        if (request.imageUrls() != null) {
            request.imageUrls().stream().map(Text::clean).filter(url -> url != null).forEach(rma.getImageUrls()::add);
        }
    }

    private Rma getAccessible(Long id) {
        return currentUser.isCustomer() ? getOwn(id) : getRma(id);
    }

    private Rma getOwn(Long id) {
        Rma rma = getRma(id);
        if (!rma.getCustomer().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Claim", id);
        }
        return rma;
    }

    private Rma getRma(Long id) {
        return rmaRepository.findById(id).orElseThrow(() -> NotFoundException.of("Claim", id));
    }
}
