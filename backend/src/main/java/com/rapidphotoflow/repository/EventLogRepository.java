package com.rapidphotoflow.repository;

import com.rapidphotoflow.model.EventLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for EventLog entity.
 * Provides database operations for event log queries.
 */
@Repository
public interface EventLogRepository extends JpaRepository<EventLog, UUID> {
    
    /**
     * Find all events for a specific photo, ordered by timestamp
     */
    List<EventLog> findByPhotoIdOrderByTimestampDesc(UUID photoId);
    
    /**
     * Find events by photo ID with pagination
     */
    Page<EventLog> findByPhotoIdOrderByTimestampDesc(UUID photoId, Pageable pageable);
    
    /**
     * Find events by event type
     */
    Page<EventLog> findByEventTypeOrderByTimestampDesc(String eventType, Pageable pageable);
    
    /**
     * Find events by photo ID and event type
     */
    @Query("SELECT e FROM EventLog e WHERE e.photoId = :photoId AND e.eventType = :eventType ORDER BY e.timestamp DESC")
    List<EventLog> findByPhotoIdAndEventType(
        @Param("photoId") UUID photoId,
        @Param("eventType") String eventType
    );
}

