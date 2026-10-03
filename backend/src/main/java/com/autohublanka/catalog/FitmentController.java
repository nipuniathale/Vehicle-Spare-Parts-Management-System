package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.FitmentRequest;
import com.autohublanka.catalog.dto.FitmentResponse;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fitments")
public class FitmentController {

    private final FitmentService service;

    public FitmentController(FitmentService service) {
        this.service = service;
    }

    @GetMapping
    public List<FitmentResponse> findAll(@RequestParam(required = false) Long vehicleId,
                                         @RequestParam(required = false) Long sparePartId) {
        return service.findAll(vehicleId, sparePartId);
    }

    @GetMapping("/{id}")
    public FitmentResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public FitmentResponse create(@Valid @RequestBody FitmentRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public FitmentResponse update(@PathVariable Long id, @Valid @RequestBody FitmentRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
