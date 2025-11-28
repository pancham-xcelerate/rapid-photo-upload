package com.rapidphotoflow.controller;

import com.rapidphotoflow.dto.ErrorResponse;
import com.rapidphotoflow.dto.EventLogResponse;
import com.rapidphotoflow.model.EventLog;
import com.rapidphotoflow.service.EventLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for event log endpoints.
 * Provides access to workflow event history.
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Slf4j
public class EventLogController {
    
    private final EventLogService eventLogService;
    
    /**
     * Get all events for a specific photo
     * GET /api/photos/{photoId}/events
     * Note: This endpoint is handled by PhotoController for better REST structure
     */
    @GetMapping("/by-photo/{photoId}")
    public ResponseEntity<List<EventLogResponse>> getPhotoEvents(@PathVariable UUID photoId) {
        List<EventLog> events = eventLogService.getEventsByPhotoId(photoId);
        List<EventLogResponse> responses = events.stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Get all events with optional filters
     * GET /api/events?photoId=uuid&eventType=PROCESSING&page=0&size=50
     */
    @GetMapping
    public ResponseEntity<?> getEvents(
            @RequestParam(required = false) String photoId,
            @RequestParam(required = false) String eventType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10000") int size) { // Increased default to show more events
        
        // Validate photoId if provided - must be UUID format
        UUID photoIdUuid = null;
        if (photoId != null && !photoId.trim().isEmpty()) {
            String trimmedId = photoId.trim();
            try {
                photoIdUuid = UUID.fromString(trimmedId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(
                        ErrorResponse.of(
                                "INVALID_PHOTO_ID",
                                "Invalid photo ID format. Expected UUID format.",
                                "/api/events"
                        )
                );
            }
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<EventLog> events;
        
        if (photoIdUuid != null && eventType != null && !eventType.isEmpty()) {
            // Both filters - get all and filter manually (repository doesn't have this method)
            events = eventLogService.getEventsByPhotoId(photoIdUuid, pageable);
            // Filter by event type in memory (for simplicity)
            List<EventLog> filtered = events.getContent().stream()
                    .filter(e -> e.getEventType().equals(eventType))
                    .collect(Collectors.toList());
            events = new org.springframework.data.domain.PageImpl<>(filtered, pageable, filtered.size());
        } else if (photoIdUuid != null) {
            events = eventLogService.getEventsByPhotoId(photoIdUuid, pageable);
        } else if (eventType != null && !eventType.isEmpty()) {
            events = eventLogService.getEventsByType(eventType, pageable);
        } else {
            // No filters - return all events
            events = eventLogService.getAllEvents(pageable);
        }
        
        Page<EventLogResponse> responses = events.map(EventLogResponse::fromEntity);
        return ResponseEntity.ok(responses);
    }
}

