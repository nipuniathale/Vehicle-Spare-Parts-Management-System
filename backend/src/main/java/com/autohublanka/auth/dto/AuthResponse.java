package com.autohublanka.auth.dto;

import com.autohublanka.user.dto.UserResponse;

public record AuthResponse(String token, UserResponse user) {
}
