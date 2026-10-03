package com.autohublanka.marketing;

import java.time.LocalDate;

/** Status shown for promotions, discounts and coupons - calculated, not stored. */
public enum CampaignStatus {
    INACTIVE,
    SCHEDULED,
    ACTIVE,
    EXPIRED;

    public static CampaignStatus of(boolean active, LocalDate start, LocalDate end) {
        LocalDate today = LocalDate.now();
        if (end != null && end.isBefore(today)) {
            return EXPIRED;
        }
        if (!active) {
            return INACTIVE;
        }
        if (start != null && start.isAfter(today)) {
            return SCHEDULED;
        }
        return ACTIVE;
    }
}
