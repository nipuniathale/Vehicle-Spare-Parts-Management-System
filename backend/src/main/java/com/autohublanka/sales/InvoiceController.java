package com.autohublanka.sales;

import com.autohublanka.sales.dto.InvoiceResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Invoices are read-only: they are generated automatically when an order is paid
 * and are viewed from the order (My Orders for customers, Orders for sales staff).
 */
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public InvoiceResponse findByOrder(@PathVariable Long orderId) {
        return invoiceService.findByOrder(orderId);
    }
}
