package com.rapidphotoflow.dto;

import com.rapidphotoflow.model.EventLog;
import com.rapidphotoflow.util.TimeUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for event log API responses.
 * Contains event information formatted for frontend consumption.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLogResponse {
    private UUID id;
    private UUID photoId;
    private String eventType;
    private String message;
    private String timestamp;
    private Object metadata; // Can be Map<String, Object> or JSON string
    
    /**
     * Convert EventLog entity to EventLogResponse DTO
     */
    public static EventLogResponse fromEntity(EventLog eventLog) {
        return EventLogResponse.builder()
                .id(eventLog.getId())
                .photoId(eventLog.getPhotoId())
                .eventType(eventLog.getEventType())
                .message(eventLog.getMessage())
                .timestamp(TimeUtil.formatTimestamp(eventLog.getTimestamp()))
                .build();
    }
}

