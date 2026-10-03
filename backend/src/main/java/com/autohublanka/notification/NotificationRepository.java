package com.autohublanka.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findTop30ByRecipientIdOrderByCreatedAtDescIdDesc(Long recipientId);

    long countByRecipientIdAndSeenFalse(Long recipientId);

    @Modifying
    @Query("update Notification n set n.seen = true where n.recipient.id = :recipientId and n.seen = false")
    void markAllSeen(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("delete from Notification n where n.recipient.id = :recipientId")
    void deleteByRecipient(@Param("recipientId") Long recipientId);
}
