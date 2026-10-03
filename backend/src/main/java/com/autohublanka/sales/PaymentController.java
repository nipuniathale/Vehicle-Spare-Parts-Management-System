package com.autohublanka.sales;

import com.autohublanka.sales.dto.BankTransferRejectRequest;
import com.autohublanka.sales.dto.CardPaymentRequest;
import com.autohublanka.sales.dto.PaymentRequest;
import com.autohublanka.sales.dto.PaymentResponse;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF')")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public List<PaymentResponse> findAll() {
        return paymentService.findAll();
    }

    @GetMapping("/{id}")
    public PaymentResponse findById(@PathVariable Long id) {
        return paymentService.findById(id);
    }

    @GetMapping("/order/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public List<PaymentResponse> findByOrder(@PathVariable Long orderId) {
        return paymentService.findByOrder(orderId);
    }

    /** Customer pays an order by card. */
    @PostMapping("/order/{orderId}/card")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse payByCard(@PathVariable Long orderId, @Valid @RequestBody CardPaymentRequest request) {
        return paymentService.payByCard(orderId, request);
    }

    @PostMapping(value = "/order/{orderId}/bank-slip", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse uploadBankSlip(@PathVariable Long orderId,
                                          @RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "reference", required = false) String reference) {
        return paymentService.uploadBankSlip(orderId, file, reference);
    }

    @GetMapping("/{id}/slip")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_STAFF','CUSTOMER')")
    public ResponseEntity<byte[]> bankSlip(@PathVariable Long id) {
        BankSlip slip = paymentService.getBankSlip(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(slip.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(slip.getFileName()).build().toString())
                .cacheControl(CacheControl.noStore())
                .body(slip.getData());
    }

    @PatchMapping("/{id}/confirm-transfer")
    @PreAuthorize("hasRole('SALES_STAFF')")
    public PaymentResponse confirmBankTransfer(@PathVariable Long id) {
        return paymentService.confirmBankTransfer(id);
    }

    @PatchMapping("/{id}/reject-transfer")
    @PreAuthorize("hasRole('SALES_STAFF')")
    public PaymentResponse rejectBankTransfer(@PathVariable Long id, @Valid @RequestBody BankTransferRejectRequest request) {
        return paymentService.rejectBankTransfer(id, request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@Valid @RequestBody PaymentRequest request) {
        return paymentService.create(request);
    }

    @PutMapping("/{id}")
    public PaymentResponse update(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return paymentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        paymentService.delete(id);
    }
}
