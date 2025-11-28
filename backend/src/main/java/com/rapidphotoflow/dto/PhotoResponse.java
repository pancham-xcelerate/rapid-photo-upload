package com.rapidphotoflow.dto;

import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import com.rapidphotoflow.util.TimeUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for photo API responses.
 * Contains photo information formatted for frontend consumption.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoResponse {
    private UUID id;
    private String filename;
    private String originalFilename;
    private PhotoStatus status;
    private Long size;
    private String mimeType;
    private String originalUrl;
    private String thumbnailUrl;
    private String uploadedAt;
    private String processedAt;
    private String updatedAt;
    private Boolean isFavorite;
    private Object metadata; // Can be Map<String, Object> or JSON string
    
    /**
     * Convert Photo entity to PhotoResponse DTO
     */
    public static PhotoResponse fromEntity(Photo photo, String baseUrl) {
        String originalUrl = null;
        String thumbnailUrl = null;
        
        // Use backend proxy endpoints for images
        if (photo.getId() != null && photo.getStoragePath() != null) {
            originalUrl = baseUrl + "/" + photo.getId() + "/image";
        }
        if (photo.getId() != null) {
            // Always provide thumbnail URL (will serve original if thumbnail doesn't exist)
            thumbnailUrl = baseUrl + "/" + photo.getId() + "/thumbnail";
        }
        
        return PhotoResponse.builder()
                .id(photo.getId())
                .filename(photo.getFilename())
                .originalFilename(photo.getOriginalFilename())
                .status(photo.getStatus())
                .size(photo.getSize())
                .mimeType(photo.getMimeType())
                .originalUrl(originalUrl)
                .thumbnailUrl(thumbnailUrl)
                .uploadedAt(TimeUtil.formatTimestamp(photo.getUploadedAt()))
                .processedAt(TimeUtil.formatTimestamp(photo.getProcessedAt()))
                .updatedAt(TimeUtil.formatTimestamp(photo.getUpdatedAt()))
                .isFavorite(photo.getIsFavorite())
                .build();
    }
}

