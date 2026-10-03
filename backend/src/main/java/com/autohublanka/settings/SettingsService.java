package com.autohublanka.settings;

import com.autohublanka.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Reads and saves the system settings.
 * The current settings are kept in memory, so every request uses the same values without reading the
 * database each time.
 * The cache is replaced as a whole when an admin saves new settings.
 */
@Service
public class SettingsService {

    private final SystemSettingRepository repository;
    private final CurrentUser currentUser;
    private volatile AppSettings cached;

    public SettingsService(SystemSettingRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    /** The settings in force right now (defaults for anything never saved). */
    @Transactional(readOnly = true)
    public AppSettings current() {
        AppSettings settings = cached;
        if (settings == null) {
            settings = load();
            cached = settings;
        }
        return settings;
    }

    @Transactional
    public AppSettings update(AppSettings settings) {
        String by = currentUser.get().getEmail();
        Map<String, String> values = toMap(settings);
        values.forEach((key, value) -> {
            SystemSetting row = repository.findById(key).orElseGet(() -> new SystemSetting(key, value));
            row.setValue(value);
            row.setUpdatedAt(LocalDateTime.now());
            row.setUpdatedBy(by);
            repository.save(row);
        });
        cached = null;
        return current();
    }

    @Transactional(readOnly = true)
    public LocalDateTime lastUpdated() {
        return repository.findAll().stream().map(SystemSetting::getUpdatedAt)
                .filter(java.util.Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
    }

    // ---------------------------------------------------------------- mapping

    private AppSettings load() {
        Map<String, String> saved = new HashMap<>();
        repository.findAll().forEach(s -> saved.put(s.getKey(), s.getValue()));
        AppSettings d = AppSettings.defaults();
        return new AppSettings(
                get(saved, "store.name", d.storeName(), Function.identity()),
                get(saved, "store.email", d.storeEmail(), Function.identity()),
                get(saved, "store.phone", d.storePhone(), Function.identity()),
                get(saved, "store.address", d.storeAddress(), Function.identity()),
                get(saved, "payment.card", d.cardPaymentEnabled(), Boolean::valueOf),
                get(saved, "payment.cod", d.cashOnDeliveryEnabled(), Boolean::valueOf),
                get(saved, "payment.bank", d.bankTransferEnabled(), Boolean::valueOf),
                get(saved, "bank.name", d.bankName(), Function.identity()),
                get(saved, "bank.account-name", d.bankAccountName(), Function.identity()),
                get(saved, "bank.account-number", d.bankAccountNumber(), Function.identity()),
                get(saved, "bank.branch", d.bankBranch(), Function.identity()),
                get(saved, "order.max-quantity", d.maxQuantityPerItem(), Integer::valueOf),
                get(saved, "returns.window-days", d.returnWindowDays(), Integer::valueOf),
                get(saved, "inventory.default-reorder-level", d.defaultReorderLevel(), Integer::valueOf),
                get(saved, "inventory.low-stock-notifications", d.lowStockNotifications(), Boolean::valueOf));
    }

    private static Map<String, String> toMap(AppSettings s) {
        Map<String, String> map = new HashMap<>();
        map.put("store.name", s.storeName().trim());
        map.put("store.email", s.storeEmail().trim().toLowerCase());
        map.put("store.phone", s.storePhone().trim());
        map.put("store.address", s.storeAddress().trim());
        map.put("payment.card", String.valueOf(s.cardPaymentEnabled()));
        map.put("payment.cod", String.valueOf(s.cashOnDeliveryEnabled()));
        map.put("payment.bank", String.valueOf(s.bankTransferEnabled()));
        map.put("bank.name", trim(s.bankName()));
        map.put("bank.account-name", trim(s.bankAccountName()));
        map.put("bank.account-number", trim(s.bankAccountNumber()));
        map.put("bank.branch", trim(s.bankBranch()));
        map.put("order.max-quantity", String.valueOf(s.maxQuantityPerItem()));
        map.put("returns.window-days", String.valueOf(s.returnWindowDays()));
        map.put("inventory.default-reorder-level", String.valueOf(s.defaultReorderLevel()));
        map.put("inventory.low-stock-notifications", String.valueOf(s.lowStockNotifications()));
        return map;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static <T> T get(Map<String, String> saved, String key, T fallback, Function<String, T> parse) {
        String value = saved.get(key);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            return parse.apply(value);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }
}
