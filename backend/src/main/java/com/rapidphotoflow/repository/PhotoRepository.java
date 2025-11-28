package com.rapidphotoflow.repository;

import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for Photo entity.
 * Provides database operations for photo management.
 */
@Repository
public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    
    /**
     * Find all photos with a specific status
     */
    Page<Photo> findByStatus(PhotoStatus status, Pageable pageable);
    
    /**
     * Find photos updated after a specific timestamp
     * Used for polling endpoint to get only changed photos
     */
    @Query("SELECT p FROM Photo p WHERE p.updatedAt > :since")
    List<Photo> findUpdatedAfter(@Param("since") LocalDateTime since);
    
    /**
     * Find photos by IDs (for batch operations)
     */
    @Query("SELECT p FROM Photo p WHERE p.id IN :ids")
    List<Photo> findByIds(@Param("ids") List<UUID> ids);
    
    /**
     * Count photos by status
     */
    long countByStatus(PhotoStatus status);
    
    /**
     * Find photo by short ID
     */
    Photo findByShortId(String shortId);
    
    /**
     * Find all favorite photos
     */
    Page<Photo> findByIsFavoriteTrue(Pageable pageable);
    
    /**
     * Find favorite photos with status filter
     */
    Page<Photo> findByIsFavoriteTrueAndStatus(PhotoStatus status, Pageable pageable);
}

