package com.autohublanka.support;

import com.autohublanka.common.exception.NotFoundException;
import com.autohublanka.sales.Order;
import com.autohublanka.sales.OrderRepository;
import com.autohublanka.security.CurrentUser;
import com.autohublanka.support.dto.FeedbackRequest;
import com.autohublanka.support.dto.FeedbackResponse;
import com.autohublanka.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final OrderRepository orderRepository;
    private final CurrentUser currentUser;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           OrderRepository orderRepository,
                           CurrentUser currentUser) {
        this.feedbackRepository = feedbackRepository;
        this.orderRepository = orderRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> findAll() {
        return feedbackRepository.findAllForList().stream().map(FeedbackResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> findPublic() {
        return feedbackRepository.findPublic().stream().map(FeedbackResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> findMine() {
        return feedbackRepository.findByCustomerIdOrderByCreatedAtDesc(currentUser.get().getId()).stream()
                .map(FeedbackResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FeedbackResponse findById(Long id) {
        return FeedbackResponse.from(getAccessible(id));
    }

    public FeedbackResponse create(FeedbackRequest request) {
        User customer = currentUser.get();
        Feedback feedback = new Feedback();
        feedback.setCustomer(customer);
        apply(feedback, request, customer);
        return FeedbackResponse.from(feedbackRepository.save(feedback));
    }

    /** Customer edits own feedback (shown straight away). */
    public FeedbackResponse update(Long id, FeedbackRequest request) {
        Feedback feedback = getOwn(id);
        apply(feedback, request, feedback.getCustomer());
        return FeedbackResponse.from(feedback);
    }

    /** Customers delete their own feedback; sales staff can remove inappropriate feedback. */
    public void delete(Long id) {
        feedbackRepository.delete(getAccessible(id));
    }

    private void apply(Feedback feedback, FeedbackRequest request, User customer) {
        // SINGLETON: the same bad-word filter as reviews (create and update both come here)
        ContentFilter.getInstance().requireClean(request.subject(), request.message());
        Order order = null;
        if (request.orderId() != null) {
            order = orderRepository.findById(request.orderId())
                    .filter(o -> o.getCustomer().getId().equals(customer.getId()))
                    .orElseThrow(() -> NotFoundException.of("Order", request.orderId()));
        }
        feedback.setOrder(order);
        feedback.setSubject(request.subject().trim());
        feedback.setMessage(request.message().trim());
        feedback.setRating(request.rating());
    }

    private Feedback getAccessible(Long id) {
        return currentUser.isCustomer() ? getOwn(id) : getFeedback(id);
    }

    private Feedback getOwn(Long id) {
        Feedback feedback = getFeedback(id);
        if (!feedback.getCustomer().getId().equals(currentUser.get().getId())) {
            throw NotFoundException.of("Feedback", id);
        }
        return feedback;
    }

    private Feedback getFeedback(Long id) {
        return feedbackRepository.findById(id).orElseThrow(() -> NotFoundException.of("Feedback", id));
    }
}
