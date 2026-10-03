package com.autohublanka.inventory;

import com.autohublanka.inventory.dto.StockMovementRequest;
import com.autohublanka.inventory.dto.StockMovementResponse;
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
@RequestMapping("/api/stock-movements")
@PreAuthorize("hasAnyRole('ADMIN','INVENTORY_MANAGER')")
public class StockMovementController {

    private final StockMovementService movementService;

    public StockMovementController(StockMovementService movementService) {
        this.movementService = movementService;
    }

    @GetMapping
    public List<StockMovementResponse> findAll(@RequestParam(required = false) Long inventoryId) {
        return movementService.findAll(inventoryId);
    }

    @GetMapping("/{id}")
    public StockMovementResponse findById(@PathVariable Long id) {
        return movementService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StockMovementResponse create(@Valid @RequestBody StockMovementRequest request) {
        return movementService.create(request);
    }

    @PutMapping("/{id}")
    public StockMovementResponse update(@PathVariable Long id, @Valid @RequestBody StockMovementRequest request) {
        return movementService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        movementService.delete(id);
    }
}
