package com.autohublanka.activity;

import com.autohublanka.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * One line of the admin activity log.
 * The user is stored as plain values (not a foreign key) so the history stays when an account is deleted.
 */
@Entity
@Table(name = "activity_logs")
public class ActivityLog extends BaseEntity {

    private Long userId;

    @Column(length = 130)
    private String userName;

    @Column(length = 120)
    private String userEmail;

    @Column(length = 30)
    private String userRole;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(nullable = false, length = 40)
    private String module;

    private Long entityId;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(length = 45)
    private String ipAddress;

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserRole() { return userRole; }
    public void setUserRole(String userRole) { this.userRole = userRole; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
