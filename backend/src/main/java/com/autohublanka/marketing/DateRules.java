package com.autohublanka.marketing;

import com.autohublanka.common.exception.BusinessException;

import java.time.LocalDate;

final class DateRules {

    private DateRules() {
    }

    /** Common date checks for promotions, discounts and coupons. */
    static void check(LocalDate start, LocalDate end, boolean isNew) {
        if (end.isBefore(start)) {
            throw new BusinessException("End date must be on or after the start date");
        }
        if (isNew && end.isBefore(LocalDate.now())) {
            throw new BusinessException("End date cannot be in the past");
        }
        if (start.isAfter(LocalDate.now().plusYears(2))) {
            throw new BusinessException("Start date can be at most 2 years ahead");
        }
    }
}
