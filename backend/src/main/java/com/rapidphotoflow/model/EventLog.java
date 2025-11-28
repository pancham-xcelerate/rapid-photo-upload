package com.rapidphotoflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event log entity for tracking all workflow events.
 * Provides full traceability of photo processing lifecycle.
 */
@Entity
@Table(name = "event_log", indexes = {
    @Index(name = "idx_event_log_photo_id", columnList = "photo_id"),
    @Index(name = "idx_event_log_timestamp", columnList = "timestamp"),
    @Index(name = "idx_event_log_event_type", columnList = "event_type")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    /**
     * Reference to the photo this event relates to
     */
    @Column(name = "photo_id", nullable = false)
    private UUID photoId;
    
    /**
     * Type of event (UPLOADED, QUEUED, PROCESSING, COMPLETED, FAILED)
     */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;
    
    /**
     * Human-readable message describing the event
     */
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;
    
    /**
     * Additional metadata as JSON (queue position, error details, etc.)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;
    
    /**
     * Timestamp when event occurred
     */
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
}

