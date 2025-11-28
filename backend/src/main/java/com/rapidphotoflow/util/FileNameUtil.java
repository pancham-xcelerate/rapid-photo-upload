package com.rapidphotoflow.util;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Utility class for filename sanitization and generation.
 * Provides security against path traversal and ensures consistent naming.
 */
public class FileNameUtil {
    
    private static final int MAX_FILENAME_LENGTH = 255;
    private static final Pattern DANGEROUS_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");
    private static final Pattern PATH_TRAVERSAL = Pattern.compile("\\.\\.|/|\\\\");
    
    // Reserved filenames on Windows
    private static final String[] RESERVED_NAMES = {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    };
    
    /**
     * Sanitize filename to prevent security issues.
     * Removes dangerous characters and prevents path traversal.
     */
    public static String sanitizeFileName(String filename) {
        if (filename == null || filename.isEmpty()) {
            throw new IllegalArgumentException("Filename cannot be null or empty");
        }
        
        // Remove path separators and parent directory references
        String sanitized = PATH_TRAVERSAL.matcher(filename).replaceAll("");
        
        // Remove dangerous characters (keep only alphanumeric, dots, underscores, hyphens)
        sanitized = DANGEROUS_CHARS.matcher(sanitized).replaceAll("_");
        
        // Trim whitespace
        sanitized = sanitized.trim();
        
        // Check for reserved names (Windows)
        String upperName = sanitized.toUpperCase();
        for (String reserved : RESERVED_NAMES) {
            if (upperName.equals(reserved) || upperName.startsWith(reserved + ".")) {
                sanitized = "file_" + sanitized;
                break;
            }
        }
        
        // Ensure filename is not empty after sanitization
        if (sanitized.isEmpty()) {
            sanitized = "file";
        }
        
        // Enforce length limit
        if (sanitized.length() > MAX_FILENAME_LENGTH) {
            String extension = getFileExtension(sanitized);
            int maxNameLength = MAX_FILENAME_LENGTH - extension.length();
            sanitized = sanitized.substring(0, maxNameLength) + extension;
        }
        
        return sanitized;
    }
    
    /**
     * Generate unique filename using UUID while preserving extension.
     * Format: {UUID}.{extension}
     */
    public static String generateUniqueFileName(String originalFilename) {
        String extension = getFileExtension(originalFilename);
        String uuid = UUID.randomUUID().toString();
        
        if (extension.isEmpty()) {
            return uuid;
        }
        
        return uuid + extension;
    }
    
    /**
     * Extract file extension from filename.
     * Returns extension with dot (e.g., ".jpg", ".png")
     */
    public static String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1 || lastDot == filename.length() - 1) {
            return "";
        }
        
        return filename.substring(lastDot).toLowerCase();
    }
    
    /**
     * Validate filename format and length.
     */
    public static boolean isValidFileName(String filename) {
        if (filename == null || filename.isEmpty()) {
            return false;
        }
        
        if (filename.length() > MAX_FILENAME_LENGTH) {
            return false;
        }
        
        // Check for path traversal attempts
        if (PATH_TRAVERSAL.matcher(filename).find()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Normalize filename (trim, lowercase, replace spaces).
     * Less aggressive than sanitize - used for display purposes.
     */
    public static String normalizeFileName(String filename) {
        if (filename == null || filename.isEmpty()) {
            return filename;
        }
        
        return filename.trim()
                      .toLowerCase()
                      .replaceAll("\\s+", "_");
    }
}

