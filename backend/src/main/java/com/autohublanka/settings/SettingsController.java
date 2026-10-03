package com.autohublanka.settings;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    public record SettingsResponse(AppSettings settings, LocalDateTime lastUpdated) {
    }

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /** Store details and enabled payment methods - used by the storefront and checkout (no login needed). */
    @GetMapping("/public")
    public AppSettings.Public publicSettings() {
        return settingsService.current().toPublic();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public SettingsResponse get() {
        return new SettingsResponse(settingsService.current(), settingsService.lastUpdated());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public SettingsResponse update(@Valid @RequestBody AppSettings request) {
        AppSettings saved = settingsService.update(request);
        return new SettingsResponse(saved, settingsService.lastUpdated());
    }
}
