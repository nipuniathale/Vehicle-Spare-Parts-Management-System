package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByOrderId(Long orderId);

    boolean existsByOrderId(Long orderId);

    boolean existsByPaymentId(Long paymentId);

    void deleteByOrderId(Long orderId);
}
