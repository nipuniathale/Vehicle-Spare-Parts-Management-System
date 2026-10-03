package com.autohublanka.support;

import com.autohublanka.support.dto.RmaCompleteRequest;
import com.autohublanka.support.dto.RmaDecisionRequest;
import com.autohublanka.support.dto.RmaRequest;
import com.autohublanka.support.dto.RmaResponse;
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
@RequestMapping("/api/rmas")
public class RmaController {

    private final RmaService rmaService;

    public RmaController(RmaService rmaService) {
        this.rmaService = rmaService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public List<RmaResponse> findAll() {
        return rmaService.findAll();
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<RmaResponse> findMine() {
        return rmaService.findMine();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public RmaResponse findById(@PathVariable Long id) {
        return rmaService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('CUSTOMER')")
    public RmaResponse create(@Valid @RequestBody RmaRequest request) {
        return rmaService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public RmaResponse update(@PathVariable Long id, @Valid @RequestBody RmaRequest request) {
        return rmaService.update(id, request);
    }

    @PatchMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public RmaResponse decide(@PathVariable Long id, @Valid @RequestBody RmaDecisionRequest request) {
        return rmaService.decide(id, request);
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
    public RmaResponse complete(@PathVariable Long id, @Valid @RequestBody RmaCompleteRequest request) {
        return rmaService.complete(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public void delete(@PathVariable Long id) {
        rmaService.delete(id);
    }
}
