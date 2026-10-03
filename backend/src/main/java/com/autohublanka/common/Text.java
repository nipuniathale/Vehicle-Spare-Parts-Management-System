package com.autohublanka.common;

public final class Text {

    private Text() {
    }

    /** Trims the value and turns blank strings into null. */
    public static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
