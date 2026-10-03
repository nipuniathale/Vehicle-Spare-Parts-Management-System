package com.autohublanka.auth;

import com.autohublanka.activity.ActivityLogService;
import com.autohublanka.auth.dto.AuthResponse;
import com.autohublanka.auth.dto.GoogleLoginRequest;
import com.autohublanka.auth.dto.LoginRequest;
import com.autohublanka.auth.dto.RegisterRequest;
import com.autohublanka.auth.google.GoogleTokenVerifier;
import com.autohublanka.auth.google.GoogleUser;
import com.autohublanka.common.exception.ConflictException;
import com.autohublanka.security.JwtService;
import com.autohublanka.user.AuthProvider;
import com.autohublanka.user.Role;
import com.autohublanka.user.User;
import com.autohublanka.user.UserRepository;
import com.autohublanka.user.dto.UserResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final ActivityLogService activityLog;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       GoogleTokenVerifier googleTokenVerifier,
                       ActivityLogService activityLog) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.activityLog = activityLog;
    }

    /** E-mail + password, checked by Spring Security (BCrypt). */
    public AuthResponse login(LoginRequest request, String ip) {
        String email = request.email().trim();
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException ex) {
            activityLog.recordFailedLogin(email.toLowerCase(), ip);
            throw ex;
        }
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        return issueToken(user, "Logged in", ip);
    }

    /**
     * "Continue with Google". The ID token is verified first; then an existing account with the same
     * (Google-verified) e-mail logs in with its own role, and an unknown e-mail gets a new CUSTOMER account
     * (no password yet - it can be set later in the profile).
     */
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request, String ip) {
        GoogleUser google = googleTokenVerifier.verify(request.credential());
        User user = userRepository.findByEmailIgnoreCase(google.email()).orElseGet(() -> registerGoogleUser(google));
        if (!user.isActive()) {
            throw new DisabledException("This account has been deactivated. Please contact the administrator.");
        }
        if (user.getProfileImageUrl() == null && validPicture(google.pictureUrl())) {
            user.setProfileImageUrl(google.pictureUrl()); // use the Google picture until the user uploads one
        }
        return issueToken(user, "Logged in with Google", ip);
    }

    /** Whether the "Continue with Google" button should be shown, and the client id it needs. */
    public GoogleConfig googleConfig() {
        return new GoogleConfig(googleTokenVerifier.isConfigured(), googleTokenVerifier.clientId());
    }

    public record GoogleConfig(boolean enabled, String clientId) {
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ip) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("An account with email " + email + " already exists");
        }

        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setPasswordSet(true);
        user.setRole(Role.CUSTOMER);
        userRepository.save(user);

        activityLog.record(user, "REGISTER", "Authentication", user.getId(), "New customer account registered", ip);
        return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
    }

    private AuthResponse issueToken(User user, String description, String ip) {
        activityLog.record(user, "LOGIN", "Authentication", user.getId(), description, ip);
        return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
    }

    private User registerGoogleUser(GoogleUser google) {
        User user = new User();
        user.setEmail(google.email().toLowerCase());
        user.setFirstName(limit(google.firstName() == null ? google.email().split("@")[0] : google.firstName()));
        user.setLastName(limit(google.lastName() == null ? "-" : google.lastName()));
        // unusable random password: this account can only log in with Google until the user sets a password
        user.setPassword(passwordEncoder.encode(UUID.randomUUID() + UUID.randomUUID().toString()));
        user.setPasswordSet(false);
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setRole(Role.CUSTOMER);
        if (validPicture(google.pictureUrl())) {
            user.setProfileImageUrl(google.pictureUrl());
        }
        return userRepository.save(user);
    }

    private static boolean validPicture(String url) {
        return url != null && url.startsWith("https://") && url.length() <= 500;
    }

    private static String limit(String value) {
        String v = value.trim();
        return v.length() > 60 ? v.substring(0, 60) : v;
    }
}
