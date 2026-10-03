package com.autohublanka.activity;

import java.time.LocalDateTime;

public record ActivityLogResponse(Long id, LocalDateTime createdAt, Long userId, String userName, String userEmail,
                                  String userRole, String action, String module, Long entityId, String description,
                                  String ipAddress) {

    public static ActivityLogResponse from(ActivityLog a) {
        return new ActivityLogResponse(a.getId(), a.getCreatedAt(), a.getUserId(), a.getUserName(), a.getUserEmail(),
                a.getUserRole(), a.getAction(), a.getModule(), a.getEntityId(), a.getDescription(), a.getIpAddress());
    }
}
