package com.rapidphotoflow.dto;

import com.rapidphotoflow.util.TimeUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO for error responses.
 * Provides consistent error format across all API endpoints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {
    private String error;
    private String message;
    private String timestamp;
    private String path;
    private Map<String, Object> details; // Optional additional context
    
    public static ErrorResponse of(String error, String message, String path) {
        return ErrorResponse.builder()
                .error(error)
                .message(message)
                .timestamp(TimeUtil.formatTimestamp(LocalDateTime.now()))
                .path(path)
                .build();
    }
    
    public static ErrorResponse of(String error, String message, String path, Map<String, Object> details) {
        return ErrorResponse.builder()
                .error(error)
                .message(message)
                .timestamp(TimeUtil.formatTimestamp(LocalDateTime.now()))
                .path(path)
                .details(details)
                .build();
    }
}

