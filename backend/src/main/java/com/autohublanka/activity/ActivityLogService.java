package com.autohublanka.activity;

import com.autohublanka.common.Text;
import com.autohublanka.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);
    private static final int MAX_ROWS = 500;

    private final ActivityLogRepository repository;

    public ActivityLogService(ActivityLogRepository repository) {
        this.repository = repository;
    }

    /**
     * Writes one entry in its own transaction, so a logging problem never undoes the user's action
     * (and a failed action that rolled back is never logged as done).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(User user, String action, String module, Long entityId, String description, String ip) {
        try {
            ActivityLog entry = new ActivityLog();
            if (user != null) {
                entry.setUserId(user.getId());
                entry.setUserName(user.getFullName());
                entry.setUserEmail(user.getEmail());
                entry.setUserRole(user.getRole().name());
            }
            entry.setAction(action);
            entry.setModule(module);
            entry.setEntityId(entityId);
            entry.setDescription(description.length() > 500 ? description.substring(0, 500) : description);
            entry.setIpAddress(ip);
            repository.save(entry);
        } catch (RuntimeException ex) {
            log.warn("Could not write activity log entry: {}", ex.getMessage());
        }
    }

    /** Failed log-in (no user object - only the e-mail that was typed). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedLogin(String email, String ip) {
        ActivityLog entry = new ActivityLog();
        entry.setUserEmail(email);
        entry.setAction("LOGIN_FAILED");
        entry.setModule("Authentication");
        entry.setDescription("Failed log-in attempt for " + email);
        entry.setIpAddress(ip);
        repository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<ActivityLogResponse> search(String module, String action, String text, LocalDate from, LocalDate to) {
        LocalDateTime start = (from == null ? LocalDate.now().minusDays(30) : from).atStartOfDay();
        LocalDateTime end = (to == null ? LocalDate.now() : to).plusDays(1).atStartOfDay();
        String like = Text.clean(text) == null ? null : "%" + text.trim().toLowerCase() + "%";
        return repository.search(Text.clean(module), Text.clean(action), like, start, end, PageRequest.of(0, MAX_ROWS))
                .stream().map(ActivityLogResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, List<String>> filters() {
        return Map.of("modules", repository.modules(), "actions", repository.actions());
    }
}
