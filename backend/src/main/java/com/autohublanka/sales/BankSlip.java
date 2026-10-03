package com.autohublanka.sales;

import com.autohublanka.common.BaseEntity;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

/**
 * The bank slip (photo or PDF) a customer uploaded for a bank-transfer payment.
 * Stored in its own table so the file is never loaded with the payment list.
 */
@Entity
@Table(name = "bank_slips")
public class BankSlip extends BaseEntity {

    @Column(nullable = false, unique = true)
    private Long paymentId;

    @Column(nullable = false, length = 40)
    private String contentType;

    @Column(length = 150)
    private String fileName;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false)
    private byte[] data;

    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}
