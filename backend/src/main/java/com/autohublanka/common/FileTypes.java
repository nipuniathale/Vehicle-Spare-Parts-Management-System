package com.autohublanka.common;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Recognises uploaded files by their first bytes, so a renamed file of another type is refused. */
public final class FileTypes {

    private FileTypes() {
    }

    /** image/jpeg, image/png, image/gif or image/webp - or null. */
    public static String image(byte[] b) {
        if (b == null || b.length < 12) {
            return null;
        }
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
            return "image/gif";
        }
        if (starts(b, 0, "RIFF") && starts(b, 8, "WEBP")) {
            return "image/webp";
        }
        return null;
    }

    /** An image type, or application/pdf - or null. */
    public static String imageOrPdf(byte[] b) {
        String image = image(b);
        if (image != null) {
            return image;
        }
        return b != null && b.length >= 5 && starts(b, 0, "%PDF-") ? "application/pdf" : null;
    }

    private static boolean starts(byte[] b, int offset, String text) {
        byte[] t = text.getBytes(StandardCharsets.US_ASCII);
        return b.length >= offset + t.length && Arrays.equals(Arrays.copyOfRange(b, offset, offset + t.length), t);
    }
}
