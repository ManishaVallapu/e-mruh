package com.emruh.util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Security utility for password hashing and verification using PBKDF2WithHmacSHA256.
 * Standard format: "PBKDF2$iterations$saltBase64$hashBase64"
 * Length is ~100 characters, well within VARCHAR(255).
 */
public final class PasswordUtil {

    private static final Logger LOGGER = Logger.getLogger(PasswordUtil.class.getName());

    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATIONS = 310_000; // Recommended OWASP baseline for PBKDF2-HMAC-SHA256
    private static final int SALT_BYTES = 16;      // 128-bit cryptographically secure salt
    private static final int KEY_LENGTH = 256;     // 256-bit derived key length

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private PasswordUtil() {}

    /**
     * Generates a cryptographically secure hash for the given plaintext password.
     */
    public static String hashPassword(String password) {
        if (password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty.");
        }

        byte[] salt = new byte[SALT_BYTES];
        SECURE_RANDOM.nextBytes(salt);

        byte[] hash = pbkdf2(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);

        String saltB64 = Base64.getEncoder().encodeToString(salt);
        String hashB64 = Base64.getEncoder().encodeToString(hash);

        return "PBKDF2$" + ITERATIONS + "$" + saltB64 + "$" + hashB64;
    }

    /**
     * Verifies a candidate plaintext password against a stored PBKDF2 formatted hash.
     * Uses constant-time comparison to prevent timing attacks.
     */
    public static boolean verifyPassword(String candidatePassword, String storedHash) {
        if (candidatePassword == null || storedHash == null) {
            return false;
        }

        String[] parts = storedHash.split("\\$");
        if (parts.length != 4 || !"PBKDF2".equals(parts[0])) {
            LOGGER.warning("Invalid or unsupported password hash format.");
            return false;
        }

        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = Base64.getDecoder().decode(parts[2]);
            byte[] expectedHash = Base64.getDecoder().decode(parts[3]);

            byte[] actualHash = pbkdf2(candidatePassword.toCharArray(), salt, iterations, expectedHash.length * 8);

            return slowEquals(expectedHash, actualHash);
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Error decoding stored password hash.", e);
            return false;
        }
    }

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations, int keyLength) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyLength);
            SecretKeyFactory skf = SecretKeyFactory.getInstance(ALGORITHM);
            return skf.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("PBKDF2 hashing failed: algorithm or key specification unavailable.", e);
        }
    }

    /**
     * Constant-time byte array comparison.
     */
    private static boolean slowEquals(byte[] a, byte[] b) {
        if (a == null || b == null) {
            return false;
        }
        int diff = a.length ^ b.length;
        for (int i = 0; i < a.length && i < b.length; i++) {
            diff |= a[i] ^ b[i];
        }
        return diff == 0;
    }
}
