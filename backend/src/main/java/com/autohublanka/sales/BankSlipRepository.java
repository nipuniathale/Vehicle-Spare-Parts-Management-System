package com.autohublanka.sales;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BankSlipRepository extends JpaRepository<BankSlip, Long> {

    Optional<BankSlip> findByPaymentId(Long paymentId);

    @Modifying
    @Query("delete from BankSlip s where s.paymentId = :paymentId")
    void deleteByPaymentId(Long paymentId);

    @Modifying
    @Query("delete from BankSlip s where s.paymentId in (select p.id from Payment p where p.order.id = :orderId)")
    void deleteByOrderId(Long orderId);
}
