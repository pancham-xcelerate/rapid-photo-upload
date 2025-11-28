package com.rapidphotoflow.dto;

import com.rapidphotoflow.model.PhotoStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for updating photo status.
 * Used internally by worker service and API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhotoStatusUpdate {
    @NotNull(message = "Status is required")
    private PhotoStatus status;
    
    private String message; // Optional message describing the status change
}

