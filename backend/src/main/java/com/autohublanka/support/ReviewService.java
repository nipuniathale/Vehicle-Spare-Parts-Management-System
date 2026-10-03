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
import com.autohublanka.support.dto.ReviewReplyRequest;
import com.autohublanka.support.dto.ReviewRequest;
import com.autohublanka.support.dto.ReviewResponse;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;
    private final CurrentUser currentUser;
    private final NotificationService notifications;

    public ReviewService(ReviewRepository reviewRepository,
                         OrderItemRepository orderItemRepository,
                         CurrentUser currentUser,
                         NotificationService notifications) {
        this.reviewRepository = reviewRepository;
        this.orderItemRepository = orderItemRepository;
        this.currentUser = currentUser;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> findAll() {
        return reviewRepository.findAllForList().stream().map(ReviewResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> findMine() {
        return reviewRepository.findByCustomerIdOrderByCreatedAtDesc(currentUser.get().getId()).stream()
                .map(ReviewResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> findForPart(Long sparePartId) {
        return reviewRepository.findForPart(sparePartId).stream().map(ReviewResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ReviewResponse findById(Long id) {
        return ReviewResponse.from(getAccessibleReview(id));
    }

    public ReviewResponse create(ReviewRequest request) {
        User customer = currentUser.get();
        OrderItem item = orderItemRepository.findById(request.orderItemId())
                .orElseThrow(() -> NotFoundException.of("Order item", request.orderItemId()));

        if (!item.getOrder().getCustomer().getId().equals(customer.getId())) {
            throw NotFoundException.of("Order item", request.orderItemId());
        }
        if (item.getOrder().getStatus() != OrderStatus.DELIVERED) {
            throw new BusinessException("You can review a product after the order has been delivered");
        }
        if (reviewRepository.existsByOrderItemId(item.getId())) {
            throw new ConflictException("You have already reviewed this item. Edit your existing review instead.");
        }

        ContentFilter.getInstance().requireClean(request.comment()); // SINGLETON: shared bad-word filter

        Review review = new Review();
        review.setCustomer(customer);
        review.setOrderItem(item);
        review.setSparePart(item.getSparePart());
        review.setRating(request.rating());
        review.setComment(Text.clean(request.comment()));
        return ReviewResponse.from(reviewRepository.save(review));
    }

    /** Customer edits their own review (shown straight away). */
    public ReviewResponse update(Long id, ReviewRequest request) {
        Review review = getOwnReview(id);
        if (!review.getOrderItem().getId().equals(request.orderItemId())) {
            throw new BusinessException("A review cannot be moved to another item");
        }
        ContentFilter.getInstance().requireClean(request.comment());
        review.setRating(request.rating());
        review.setComment(Text.clean(request.comment()));
        return ReviewResponse.from(review);
    }

    /** Sales staff reply publicly to a review (or change / remove the reply). The customer is notified. */
    public ReviewResponse reply(Long id, ReviewReplyRequest request) {
        Review review = getReview(id);
        String reply = Text.clean(request.reply());
        if (reply == null) {
            if (review.getStaffReply() == null) {
                throw new BusinessException("Please write a reply");
            }
            review.setStaffReply(null);
            review.setRepliedByName(null);
            review.setRepliedAt(null);
            return ReviewResponse.from(review);
        }
        boolean first = review.getStaffReply() == null;
        review.setStaffReply(reply);
        review.setRepliedByName(currentUser.get().getFullName());
        review.setRepliedAt(LocalDateTime.now());
        if (first) {
            notifications.notifyUser(review.getCustomer(), "We replied to your review",
                    "Your review of " + review.getSparePart().getName() + " has a reply from our team.",
                    "/parts/" + review.getSparePart().getId());
        }
        return ReviewResponse.from(review);
    }

    /** Customers delete their own reviews; sales staff can remove an inappropriate review. */
    public void delete(Long id) {
        reviewRepository.delete(getAccessibleReview(id));
    }

    private Review getAccessibleReview(Long id) {
        return currentUser.isCustomer() ? getOwnReview(id) : getReview(id);
    }

    private Review getOwnReview(Long id) {
        Review review = getReview(id);
        if (!review.getCustomer().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Review", id);
        }
        return review;
    }

    private Review getReview(Long id) {
        return reviewRepository.findById(id).orElseThrow(() -> NotFoundException.of("Review", id));
    }
}
