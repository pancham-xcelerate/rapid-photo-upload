package com.rapidphotoflow.dto;

import com.rapidphotoflow.model.PhotoStatus;
import com.rapidphotoflow.util.TimeUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for photo status polling endpoint.
 * Returns only photos that have been updated since last poll.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoStatusPollResponse {
    private List<UpdatedPhoto> updatedPhotos;
    private String timestamp; // Use this as 'since' parameter in next poll
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatedPhoto {
        private UUID id;
        private PhotoStatus status;
        private String updatedAt;
    }
    
    public static PhotoStatusPollResponse of(List<UpdatedPhoto> photos) {
        return PhotoStatusPollResponse.builder()
                .updatedPhotos(photos)
                .timestamp(TimeUtil.formatTimestamp(LocalDateTime.now()))
                .build();
    }
}

