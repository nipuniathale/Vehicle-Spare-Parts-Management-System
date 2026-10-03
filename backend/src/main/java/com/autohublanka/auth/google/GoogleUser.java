package com.autohublanka.auth.google;

/** The verified details taken from a Google ID token. */
public record GoogleUser(String subject, String email, String firstName, String lastName, String pictureUrl) {
}
