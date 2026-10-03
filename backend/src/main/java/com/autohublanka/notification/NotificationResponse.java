package com.autohublanka.notification;

import java.time.LocalDateTime;

public record NotificationResponse(Long id, String title, String message, String link, boolean seen,
                                   LocalDateTime createdAt) {

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getTitle(), n.getMessage(), n.getLink(), n.isSeen(), n.getCreatedAt());
    }
}
