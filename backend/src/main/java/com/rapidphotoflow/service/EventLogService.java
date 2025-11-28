package com.rapidphotoflow.service;

import com.rapidphotoflow.model.EventLog;
import com.rapidphotoflow.repository.EventLogRepository;
import com.rapidphotoflow.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for event log management.
 * Handles creation and retrieval of workflow events.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogService {
    
    private final EventLogRepository eventLogRepository;
    
    /**
     * Create a new event log entry
     * @param photoId Photo ID this event relates to
     * @param eventType Type of event (UPLOADED, QUEUED, etc.)
     * @param message Human-readable message
     * @param metadata Optional metadata as JSON string
     * @return Created EventLog entity
     */
    @Transactional
    public EventLog createEvent(UUID photoId, String eventType, String message, String metadata) {
        EventLog eventLog = EventLog.builder()
                .photoId(photoId)
                .eventType(eventType)
                .message(message)
                .metadata(metadata)
                .timestamp(TimeUtil.getCurrentTimestamp())
                .build();
        
        EventLog saved = eventLogRepository.save(eventLog);
        log.debug("Created event log: {} for photo: {}", eventType, photoId);
        return saved;
    }
    
    /**
     * Create event with default message
     */
    @Transactional
    public EventLog createEvent(UUID photoId, String eventType, String message) {
        return createEvent(photoId, eventType, message, null);
    }
    
    /**
     * Get all events for a specific photo
     * @param photoId Photo ID
     * @return List of events ordered by timestamp (newest first)
     */
    public List<EventLog> getEventsByPhotoId(UUID photoId) {
        return eventLogRepository.findByPhotoIdOrderByTimestampDesc(photoId);
    }
    
    /**
     * Get events for a photo with pagination
     */
    public Page<EventLog> getEventsByPhotoId(UUID photoId, Pageable pageable) {
        return eventLogRepository.findByPhotoIdOrderByTimestampDesc(photoId, pageable);
    }
    
    /**
     * Get events by event type
     */
    public Page<EventLog> getEventsByType(String eventType, Pageable pageable) {
        return eventLogRepository.findByEventTypeOrderByTimestampDesc(eventType, pageable);
    }
    
    /**
     * Get events by photo ID and event type
     */
    public List<EventLog> getEventsByPhotoIdAndType(UUID photoId, String eventType) {
        return eventLogRepository.findByPhotoIdAndEventType(photoId, eventType);
    }
    
    /**
     * Get all events with pagination
     */
    public Page<EventLog> getAllEvents(Pageable pageable) {
        return eventLogRepository.findAll(pageable);
    }
}

