package com.rapidphotoflow.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Photo entity representing uploaded photos and their metadata.
 * Stores information about the photo file, processing status, and storage locations.
 */
@Entity
@Table(name = "photo", indexes = {
    @Index(name = "idx_photo_status", columnList = "status"),
    @Index(name = "idx_photo_uploaded_at", columnList = "uploaded_at"),
    @Index(name = "idx_photo_short_id", columnList = "short_id"),
    @Index(name = "idx_photo_favorite", columnList = "is_favorite"),
    @Index(name = "idx_photo_deleted_at", columnList = "deleted_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Photo {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    /**
     * Short, human-readable ID (6 characters, e.g., "A3x9K2")
     * Used for easy reference and filtering
     * Note: Nullable for backward compatibility with existing photos
     */
    @Column(name = "short_id", nullable = true, unique = true, length = 10)
    private String shortId;
    
    /**
     * Original filename as uploaded by user
     */
    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;
    
    /**
     * Sanitized filename stored in MinIO
     */
    @Column(name = "filename", nullable = false, length = 255)
    private String filename;
    
    /**
     * Current processing status
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PhotoStatus status;
    
    /**
     * File size in bytes
     */
    @Column(name = "size", nullable = false)
    private Long size;
    
    /**
     * MIME type of the file (e.g., image/jpeg, image/png)
     */
    @Column(name = "mime_type", length = 50)
    private String mimeType;
    
    /**
     * Storage path in MinIO for original file
     */
    @Column(name = "storage_path", length = 500)
    private String storagePath;
    
    /**
     * Storage path in MinIO for thumbnail (if processed)
     */
    @Column(name = "thumbnail_path", length = 500)
    private String thumbnailPath;
    
    /**
     * Additional metadata as JSON (width, height, format, etc.)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;
    
    /**
     * Timestamp when photo was uploaded
     */
    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
    
    /**
     * Timestamp when processing completed
     */
    @Column(name = "processed_at")
    private LocalDateTime processedAt;
    
    /**
     * Whether this photo is marked as favorite
     */
    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private Boolean isFavorite = false;
    
    /**
     * Timestamp when photo was deleted (soft delete)
     * Null means photo is not deleted
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    /**
     * Timestamp when record was created (auto-managed)
     */
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * Timestamp when record was last updated (auto-managed)
     */
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

