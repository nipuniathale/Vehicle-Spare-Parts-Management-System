package com.autohublanka.auth.google;

import com.autohublanka.common.exception.BusinessException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.ProtectedHeader;
import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Checks a Google ID token without any extra library:
 * signature (Google's public keys, cached for an hour), issuer, audience (our client id),
 * expiry and that Google has verified the e-mail address.
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final String clientId;
    private final URI jwksUri;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    private volatile Map<String, Key> keys = Map.of();
    private volatile Instant keysLoadedAt = Instant.EPOCH;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId,
                               @Value("${app.google.jwks-uri:https://www.googleapis.com/oauth2/v3/certs}") String jwksUri) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.jwksUri = URI.create(jwksUri);
    }

    public boolean isConfigured() {
        return !clientId.isEmpty();
    }

    public String clientId() {
        return clientId;
    }

    public GoogleUser verify(String idToken) {
        if (!isConfigured()) {
            throw new BusinessException("Google login is not set up on this server (app.google.client-id is empty)");
        }
        Claims claims;
        try {
            claims = Jwts.parser()
                    .keyLocator(new LocatorAdapter<Key>() {
                        @Override
                        protected Key locate(ProtectedHeader header) {
                            return keyFor(header.getKeyId());
                        }
                    })
                    .requireAudience(clientId)
                    .clockSkewSeconds(60)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            log.info("Rejected Google token: {}", ex.getMessage());
            throw new BusinessException("Google sign-in could not be verified. Please try again.");
        }

        if (!ISSUERS.contains(claims.getIssuer())) {
            throw new BusinessException("Google sign-in could not be verified (wrong issuer)");
        }
        String email = claims.get("email", String.class);
        Object verified = claims.get("email_verified");
        if (email == null || !(Boolean.TRUE.equals(verified) || "true".equals(verified))) {
            throw new BusinessException("Your Google account e-mail is not verified");
        }
        return new GoogleUser(claims.getSubject(), email.trim().toLowerCase(),
                claims.get("given_name", String.class), claims.get("family_name", String.class),
                claims.get("picture", String.class));
    }

    /** Google rotates its keys - reload when the key id is unknown or the cache is older than an hour. */
    private Key keyFor(String keyId) {
        Key key = keys.get(keyId);
        if (key == null || keysLoadedAt.isBefore(Instant.now().minus(Duration.ofHours(1)))) {
            loadKeys();
            key = keys.get(keyId);
        }
        if (key == null) {
            throw new JwtException("Unknown Google signing key " + keyId);
        }
        return key;
    }

    private synchronized void loadKeys() {
        try {
            HttpResponse<String> response = http.send(HttpRequest.newBuilder(jwksUri).timeout(Duration.ofSeconds(10)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            JwkSet set = Jwks.setParser().build().parse(response.body());
            Map<String, Key> loaded = new HashMap<>();
            for (Jwk<?> jwk : set) {
                loaded.put(jwk.getId(), jwk.toKey());
            }
            keys = loaded;
            keysLoadedAt = Instant.now();
        } catch (IOException | InterruptedException | RuntimeException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new JwtException("Could not download Google's signing keys: " + ex.getMessage());
        }
    }
}
