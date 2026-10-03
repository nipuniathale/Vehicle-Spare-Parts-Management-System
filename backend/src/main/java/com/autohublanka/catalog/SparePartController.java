package com.autohublanka.catalog;

import com.autohublanka.catalog.dto.SparePartRequest;
import com.autohublanka.catalog.dto.SparePartResponse;
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
@RequestMapping("/api/spare-parts")
public class SparePartController {

    private final SparePartService service;

    public SparePartController(SparePartService service) {
        this.service = service;
    }

    @GetMapping
    public List<SparePartResponse> findAll(@RequestParam(required = false) String search,
                                           @RequestParam(required = false) Long categoryId,
                                           @RequestParam(required = false) Long vehicleId,
                                           @RequestParam(required = false) String make,
                                           @RequestParam(defaultValue = "false") boolean activeOnly) {
        return service.search(search, categoryId, vehicleId, make, activeOnly);
    }

    @GetMapping("/{id}")
    public SparePartResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public SparePartResponse create(@Valid @RequestBody SparePartRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public SparePartResponse update(@PathVariable Long id, @Valid @RequestBody SparePartRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
