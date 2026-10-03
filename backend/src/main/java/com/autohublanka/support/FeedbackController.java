package com.autohublanka.support;

import com.autohublanka.support.dto.FeedbackRequest;
import com.autohublanka.support.dto.FeedbackResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    /** Public - shown on the homepage. */
    @GetMapping("/public")
    public List<FeedbackResponse> findPublic() {
        return feedbackService.findPublic();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public List<FeedbackResponse> findAll() {
        return feedbackService.findAll();
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<FeedbackResponse> findMine() {
        return feedbackService.findMine();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public FeedbackResponse findById(@PathVariable Long id) {
        return feedbackService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public FeedbackResponse create(@Valid @RequestBody FeedbackRequest request) {
        return feedbackService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public FeedbackResponse update(@PathVariable Long id, @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public void delete(@PathVariable Long id) {
        feedbackService.delete(id);
    }
}
