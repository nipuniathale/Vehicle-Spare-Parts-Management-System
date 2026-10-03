package com.autohublanka.user.dto;

import com.autohublanka.user.Role;
import com.autohublanka.user.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        String address,
        Role role,
        boolean active,
        String authProvider,
        boolean passwordSet,
        String profileImageUrl,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getAddress(),
                user.getRole(),
                user.isActive(),
                user.getAuthProvider().name(),
                user.isPasswordSet(),
                user.getProfileImageUrl(),
                user.getCreatedAt()
        );
    }
}
