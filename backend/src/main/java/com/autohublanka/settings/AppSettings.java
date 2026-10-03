package com.autohublanka.settings;

import com.autohublanka.common.validation.ValidEmail;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * All admin-configurable settings. Used both as the request body of PUT /api/settings and as the
 * value handed to the services that read them (checkout, returns, spare parts, notifications).
 */
public record AppSettings(
        // ---- store information (storefront footer, invoices)
        @NotBlank(message = "Store name is required")
        @Size(max = 80, message = "Store name can have at most 80 characters")
        String storeName,

        @NotBlank(message = "Store email is required")
        @ValidEmail
        @Size(max = 120)
        String storeEmail,

        @NotBlank(message = "Store phone is required")
        @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Phone must contain 9-15 digits")
        String storePhone,

        @NotBlank(message = "Store address is required")
        @Size(max = 200, message = "Address can have at most 200 characters")
        String storeAddress,

        // ---- payments
        @NotNull Boolean cardPaymentEnabled,
        @NotNull Boolean cashOnDeliveryEnabled,
        @NotNull Boolean bankTransferEnabled,

        // ---- bank account shown to customers who pay by bank transfer
        @Size(max = 80, message = "Bank name can have at most 80 characters")
        String bankName,

        @Size(max = 80, message = "Account name can have at most 80 characters")
        String bankAccountName,

        @Pattern(regexp = "^$|^[0-9 -]{6,24}$", message = "Account number must be 6-24 digits (spaces and dashes allowed)")
        String bankAccountNumber,

        @Size(max = 80, message = "Branch can have at most 80 characters")
        String bankBranch,

        // ---- orders
        @NotNull(message = "Maximum quantity is required")
        @Min(value = 1, message = "Maximum quantity must be at least 1")
        @Max(value = 100, message = "Maximum quantity can be at most 100")
        Integer maxQuantityPerItem,

        // ---- returns & warranty
        @NotNull(message = "Return period is required")
        @Min(value = 1, message = "Return period must be at least 1 day")
        @Max(value = 90, message = "Return period can be at most 90 days")
        Integer returnWindowDays,

        // ---- inventory
        @NotNull(message = "Default reorder level is required")
        @Min(value = 0, message = "Reorder level cannot be negative")
        @Max(value = 10000, message = "Reorder level is too large")
        Integer defaultReorderLevel,

        @NotNull Boolean lowStockNotifications
) {
    public static AppSettings defaults() {
        return new AppSettings("AutoHub Lanka", "info@autohub.lk", "0112345678",
                "No. 25, Galle Road, Colombo 03", true, true, true,
                "Bank of Ceylon", "AutoHub Lanka (Pvt) Ltd", "0071234567", "Colombo 03",
                100, 14, 5, true);
    }

    @JsonIgnore
    @AssertTrue(message = "At least one payment method must be enabled")
    public boolean isAnyPaymentEnabled() {
        return Boolean.TRUE.equals(cardPaymentEnabled) || Boolean.TRUE.equals(cashOnDeliveryEnabled)
                || Boolean.TRUE.equals(bankTransferEnabled);
    }

    @JsonIgnore
    @AssertTrue(message = "Bank name, account name, account number and branch are required for bank transfer")
    public boolean isBankDetailsComplete() {
        return !Boolean.TRUE.equals(bankTransferEnabled)
                || (filled(bankName) && filled(bankAccountName) && filled(bankAccountNumber) && filled(bankBranch));
    }

    private static boolean filled(String value) {
        return value != null && !value.isBlank();
    }

    /** What the storefront (not logged in) may see. */
    public record Public(String storeName, String storeEmail, String storePhone, String storeAddress,
                         boolean cardPaymentEnabled, boolean cashOnDeliveryEnabled, boolean bankTransferEnabled,
                         String bankName, String bankAccountName, String bankAccountNumber, String bankBranch,
                         int maxQuantityPerItem, int returnWindowDays) {
    }

    public Public toPublic() {
        boolean bank = Boolean.TRUE.equals(bankTransferEnabled);
        return new Public(storeName, storeEmail, storePhone, storeAddress, cardPaymentEnabled, cashOnDeliveryEnabled, bank,
                bank ? bankName : null, bank ? bankAccountName : null, bank ? bankAccountNumber : null, bank ? bankBranch : null,
                maxQuantityPerItem, returnWindowDays);
    }
}
