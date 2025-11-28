package com.rapidphotoflow.util;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Utility class for time and date operations.
 * Provides consistent timestamp formatting and time calculations.
 */
public class TimeUtil {
    
    private static final DateTimeFormatter ISO_FORMATTER = 
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    
    /**
     * Get current timestamp in UTC
     */
    public static LocalDateTime getCurrentTimestamp() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
    
    /**
     * Format timestamp to ISO 8601 string for API responses
     */
    public static String formatTimestamp(LocalDateTime timestamp) {
        if (timestamp == null) {
            return null;
        }
        return timestamp.atOffset(ZoneOffset.UTC).format(ISO_FORMATTER);
    }
    
    /**
     * Parse ISO 8601 string to LocalDateTime
     */
    public static LocalDateTime parseTimestamp(String timestamp) {
        if (timestamp == null || timestamp.isEmpty()) {
            return null;
        }
        return LocalDateTime.parse(timestamp, ISO_FORMATTER);
    }
    
    /**
     * Check if first timestamp is after second timestamp
     */
    public static boolean isAfter(LocalDateTime first, LocalDateTime second) {
        if (first == null || second == null) {
            return false;
        }
        return first.isAfter(second);
    }
    
    /**
     * Add seconds to a timestamp
     * Used for processing simulation delays
     */
    public static LocalDateTime addSeconds(LocalDateTime timestamp, int seconds) {
        if (timestamp == null) {
            return null;
        }
        return timestamp.plusSeconds(seconds);
    }
    
    /**
     * Format duration for display (e.g., "2m 30s", "45s")
     */
    public static String formatDuration(Duration duration) {
        if (duration == null) {
            return "0s";
        }
        
        long totalSeconds = duration.getSeconds();
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes, seconds);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds);
        } else {
            return String.format("%ds", seconds);
        }
    }
}

