package com.autohublanka.support;

import com.autohublanka.support.dto.ReviewReplyRequest;
import com.autohublanka.support.dto.ReviewRequest;
import com.autohublanka.support.dto.ReviewResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /** Public - reviews shown on the product page. */
    @GetMapping("/spare-part/{sparePartId}")
    public List<ReviewResponse> forPart(@PathVariable Long sparePartId) {
        return reviewService.findForPart(sparePartId);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public List<ReviewResponse> findAll() {
        return reviewService.findAll();
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<ReviewResponse> findMine() {
        return reviewService.findMine();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public ReviewResponse findById(@PathVariable Long id) {
        return reviewService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewResponse create(@Valid @RequestBody ReviewRequest request) {
        return reviewService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewResponse update(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return reviewService.update(id, request);
    }

    @PatchMapping("/{id}/reply")
    @PreAuthorize("hasRole('SALES_STAFF')")
    public ReviewResponse reply(@PathVariable Long id, @Valid @RequestBody ReviewReplyRequest request) {
        return reviewService.reply(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public void delete(@PathVariable Long id) {
        reviewService.delete(id);
    }
}
