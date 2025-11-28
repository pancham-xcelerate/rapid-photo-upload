package com.rapidphotoflow.util;

import java.util.UUID;

/**
 * Utility class for generating short, human-readable IDs.
 * Uses base62 encoding to create 6-8 character IDs from UUIDs.
 */
public class ShortIdUtil {
    
    private static final String BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int SHORT_ID_LENGTH = 6;
    
    /**
     * Generate a short ID from a UUID.
     * Uses base62 encoding to create a 6-character alphanumeric ID.
     * 
     * @param uuid UUID to encode
     * @return Short ID (6 characters, e.g., "A3x9K2")
     */
    public static String generateShortId(UUID uuid) {
        long mostSignificantBits = uuid.getMostSignificantBits();
        long leastSignificantBits = uuid.getLeastSignificantBits();
        
        // Combine both parts into a single long value
        // Use XOR to mix the bits
        long combined = mostSignificantBits ^ leastSignificantBits;
        
        // Ensure positive value
        if (combined < 0) {
            combined = Math.abs(combined);
        }
        
        return encodeBase62(combined, SHORT_ID_LENGTH);
    }
    
    /**
     * Generate a short ID from a long value.
     * 
     * @param value Long value to encode
     * @return Short ID
     */
    public static String generateShortId(long value) {
        return encodeBase62(Math.abs(value), SHORT_ID_LENGTH);
    }
    
    /**
     * Encode a number to base62 string.
     * 
     * @param number Number to encode
     * @param length Desired length of output
     * @return Base62 encoded string
     */
    private static String encodeBase62(long number, int length) {
        StringBuilder sb = new StringBuilder();
        
        // Convert to base62
        while (number > 0 && sb.length() < length) {
            sb.append(BASE62_CHARS.charAt((int) (number % 62)));
            number /= 62;
        }
        
        // Pad to desired length if needed
        while (sb.length() < length) {
            sb.append(BASE62_CHARS.charAt(0));
        }
        
        // Reverse to get correct order
        return sb.reverse().toString();
    }
    
    /**
     * Validate if a string is a valid short ID format.
     * 
     * @param shortId String to validate
     * @return true if valid format
     */
    public static boolean isValidShortId(String shortId) {
        if (shortId == null || shortId.length() != SHORT_ID_LENGTH) {
            return false;
        }
        
        for (char c : shortId.toCharArray()) {
            if (BASE62_CHARS.indexOf(c) == -1) {
                return false;
            }
        }
        
        return true;
    }
}

