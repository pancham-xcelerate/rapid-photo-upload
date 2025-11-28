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
    
    /**
     * Find all non-deleted photos (deletedAt is null)
     */
    @Query("SELECT p FROM Photo p WHERE p.deletedAt IS NULL")
    Page<Photo> findAllNotDeleted(Pageable pageable);
    
    /**
     * Find all deleted photos (deletedAt is not null)
     */
    @Query("SELECT p FROM Photo p WHERE p.deletedAt IS NOT NULL")
    Page<Photo> findAllDeleted(Pageable pageable);
    
    /**
     * Find non-deleted photos by status
     */
    @Query("SELECT p FROM Photo p WHERE p.status = :status AND p.deletedAt IS NULL")
    Page<Photo> findByStatusAndNotDeleted(@Param("status") PhotoStatus status, Pageable pageable);
    
    /**
     * Find non-deleted favorite photos
     */
    @Query("SELECT p FROM Photo p WHERE p.isFavorite = true AND p.deletedAt IS NULL")
    Page<Photo> findFavoritePhotosNotDeleted(Pageable pageable);
    
    /**
     * Find non-deleted favorite photos with status filter
     */
    @Query("SELECT p FROM Photo p WHERE p.isFavorite = true AND p.status = :status AND p.deletedAt IS NULL")
    Page<Photo> findFavoritePhotosNotDeletedAndStatus(@Param("status") PhotoStatus status, Pageable pageable);
}

