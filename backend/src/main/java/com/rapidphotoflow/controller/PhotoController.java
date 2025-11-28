package com.rapidphotoflow.controller;

import com.rapidphotoflow.dto.ErrorResponse;
import com.rapidphotoflow.dto.EventLogResponse;
import com.rapidphotoflow.dto.PhotoResponse;
import com.rapidphotoflow.dto.PhotoStatusPollResponse;
import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import com.rapidphotoflow.service.EventLogService;
import com.rapidphotoflow.service.PhotoService;
import com.rapidphotoflow.service.StorageService;
import com.rapidphotoflow.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for photo management endpoints.
 * Handles photo upload, retrieval, status updates, and deletion.
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoController {
    
    private final PhotoService photoService;
    private final StorageService storageService;
    private final EventLogService eventLogService;
    
    /**
     * Upload one or more photos
     * POST /api/photos
     */
    @PostMapping
    public ResponseEntity<?> uploadPhotos(@RequestParam("files") MultipartFile[] files) {
        try {
            List<Photo> photos = photoService.uploadPhotos(files);
            
            List<PhotoResponse> responses = photos.stream()
                    .map(photo -> PhotoResponse.fromEntity(photo, storageService.getBaseUrl()))
                    .collect(Collectors.toList());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    java.util.Map.of("photos", responses)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    ErrorResponse.of("VALIDATION_ERROR", e.getMessage(), "/api/photos")
            );
        } catch (Exception e) {
            log.error("Error uploading photos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    ErrorResponse.of("UPLOAD_ERROR", "Failed to upload photos: " + e.getMessage(), "/api/photos")
            );
        }
    }
    
    /**
     * Get all photos with optional filters
     * GET /api/photos?status=PROCESSING&page=0&size=20&sort=uploadedAt,desc
     */
    @GetMapping
    public ResponseEntity<Page<PhotoResponse>> getPhotos(
            @RequestParam(required = false) PhotoStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "uploadedAt,desc") String sort) {
        
        // Parse sort parameter
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        Sort sortObj = Sort.by(direction, sortParams[0]);
        
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Photo> photos = photoService.getPhotos(status, pageable);
        
        Page<PhotoResponse> responses = photos.map(photo -> 
                PhotoResponse.fromEntity(photo, storageService.getBaseUrl())
        );
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Get single photo by ID
     * GET /api/photos/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PhotoResponse> getPhoto(@PathVariable UUID id) {
        Photo photo = photoService.getPhotoById(id);
        PhotoResponse response = PhotoResponse.fromEntity(photo, storageService.getBaseUrl());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update photo status (internal/admin use)
     * PUT /api/photos/{id}/status
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<PhotoResponse> updatePhotoStatus(
            @PathVariable UUID id,
            @RequestBody com.rapidphotoflow.dto.PhotoStatusUpdate update) {
        
        Photo photo = photoService.updatePhotoStatus(id, update.getStatus(), update.getMessage());
        PhotoResponse response = PhotoResponse.fromEntity(photo, storageService.getBaseUrl());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Toggle favorite status of a photo
     * PUT /api/photos/{id}/favorite
     */
    @PutMapping("/{id}/favorite")
    public ResponseEntity<PhotoResponse> toggleFavorite(@PathVariable UUID id) {
        Photo photo = photoService.toggleFavorite(id);
        PhotoResponse response = PhotoResponse.fromEntity(photo, storageService.getBaseUrl());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Rename photo
     * PUT /api/photos/{id}/rename
     */
    @PutMapping("/{id}/rename")
    public ResponseEntity<?> renamePhoto(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> request) {
        try {
            String newFilename = request.get("filename");
            if (newFilename == null || newFilename.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(
                        ErrorResponse.of("VALIDATION_ERROR", "Filename cannot be empty", "/api/photos/" + id + "/rename")
                );
            }
            
            Photo photo = photoService.renamePhoto(id, newFilename);
            PhotoResponse response = PhotoResponse.fromEntity(photo, storageService.getBaseUrl());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                    ErrorResponse.of("VALIDATION_ERROR", e.getMessage(), "/api/photos/" + id + "/rename")
            );
        } catch (Exception e) {
            log.error("Error renaming photo: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                    ErrorResponse.of("RENAME_ERROR", "Failed to rename photo: " + e.getMessage(), "/api/photos/" + id + "/rename")
            );
        }
    }
    
    /**
     * Get favorite photos with optional filters
     * GET /api/photos/favorites?status=PROCESSING&page=0&size=20&sort=uploadedAt,desc
     */
    @GetMapping("/favorites")
    public ResponseEntity<Page<PhotoResponse>> getFavoritePhotos(
            @RequestParam(required = false) PhotoStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "uploadedAt,desc") String sort) {
        
        // Parse sort parameter
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        Sort sortObj = Sort.by(direction, sortParams[0]);
        
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Photo> photos = photoService.getFavoritePhotos(status, pageable);
        
        Page<PhotoResponse> responses = photos.map(photo -> 
                PhotoResponse.fromEntity(photo, storageService.getBaseUrl())
        );
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Get photo image (serves image from MinIO)
     * GET /api/photos/{id}/image
     */
    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getPhotoImage(@PathVariable UUID id) {
        try {
            Photo photo = photoService.getPhotoById(id);
            
            if (photo.getStoragePath() == null || photo.getFilename() == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Get image stream from MinIO
            InputStream imageStream = storageService.getPhotoStream(photo.getFilename());
            
            // Determine content type
            String contentType = photo.getMimeType();
            if (contentType == null || contentType.isEmpty()) {
                contentType = "image/jpeg"; // Default
            }
            
            InputStreamResource resource = new InputStreamResource(imageStream);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getOriginalFilename() + "\"")
                    .body(resource);
                    
        } catch (Exception e) {
            log.error("Error serving photo image: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Get photo thumbnail (serves thumbnail from MinIO, falls back to original)
     * GET /api/photos/{id}/thumbnail
     */
    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<Resource> getPhotoThumbnail(@PathVariable UUID id) {
        try {
            Photo photo = photoService.getPhotoById(id);
            
            if (photo.getFilename() == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Get image stream from MinIO (try thumbnail bucket first, then photos bucket)
            InputStream imageStream;
            try {
                if (photo.getThumbnailPath() != null) {
                    imageStream = storageService.getThumbnailStream(photo.getFilename());
                } else {
                    imageStream = storageService.getPhotoStream(photo.getFilename());
                }
            } catch (Exception e) {
                // Fallback to original if thumbnail not found
                imageStream = storageService.getPhotoStream(photo.getFilename());
            }
            
            String contentType = photo.getMimeType();
            if (contentType == null || contentType.isEmpty()) {
                contentType = "image/jpeg";
            }
            
            InputStreamResource resource = new InputStreamResource(imageStream);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photo.getOriginalFilename() + "\"")
                    .body(resource);
                    
        } catch (Exception e) {
            log.error("Error serving photo thumbnail: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Delete photo
     * DELETE /api/photos/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable UUID id) {
        photoService.deletePhoto(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Delete multiple photos (soft delete - move to trash)
     * POST /api/photos/bulk-delete
     */
    @PostMapping("/bulk-delete")
    public ResponseEntity<Void> deletePhotos(@RequestBody List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        photoService.deletePhotos(ids);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Get photos in trash
     * GET /api/photos/trash?page=0&size=25&sort=deletedAt,desc
     */
    @GetMapping("/trash")
    public ResponseEntity<Page<PhotoResponse>> getTrashPhotos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "deletedAt,desc") String sort) {
        
        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && "desc".equalsIgnoreCase(sortParams[1]) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
        Sort sortObj = Sort.by(direction, sortParams[0]);
        
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Photo> photos = photoService.getTrashPhotos(pageable);
        
        Page<PhotoResponse> responses = photos.map(photo -> 
                PhotoResponse.fromEntity(photo, storageService.getBaseUrl())
        );
        
        return ResponseEntity.ok(responses);
    }
    
    /**
     * Restore photo from trash
     * POST /api/photos/{id}/restore
     */
    @PostMapping("/{id}/restore")
    public ResponseEntity<PhotoResponse> restorePhoto(@PathVariable UUID id) {
        Photo photo = photoService.restorePhoto(id);
        PhotoResponse response = PhotoResponse.fromEntity(photo, storageService.getBaseUrl());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Restore multiple photos from trash
     * POST /api/photos/bulk-restore
     */
    @PostMapping("/bulk-restore")
    public ResponseEntity<Void> restorePhotos(@RequestBody List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        photoService.restorePhotos(ids);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Permanently delete photo from trash
     * DELETE /api/photos/{id}/permanent
     */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDeletePhoto(@PathVariable UUID id) {
        photoService.permanentDeletePhoto(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Permanently delete multiple photos from trash
     * POST /api/photos/bulk-permanent-delete
     */
    @PostMapping("/bulk-permanent-delete")
    public ResponseEntity<Void> permanentDeletePhotos(@RequestBody List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        photoService.permanentDeletePhotos(ids);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * Poll for photo status updates
     * GET /api/photos/status?since=2025-11-XX...&photoIds=uuid1,uuid2
     */
    @GetMapping("/status")
    public ResponseEntity<PhotoStatusPollResponse> getPhotoStatusUpdates(
            @RequestParam(required = false) String since,
            @RequestParam(required = false) String photoIds) {
        
        LocalDateTime sinceTime = since != null 
                ? TimeUtil.parseTimestamp(since) 
                : LocalDateTime.now().minusHours(1);
        
        List<Photo> updatedPhotos = photoService.getPhotosUpdatedAfter(sinceTime);
        
        // Filter by photoIds if provided
        if (photoIds != null && !photoIds.isEmpty()) {
            List<UUID> ids = java.util.Arrays.stream(photoIds.split(","))
                    .map(UUID::fromString)
                    .collect(Collectors.toList());
            updatedPhotos = updatedPhotos.stream()
                    .filter(photo -> ids.contains(photo.getId()))
                    .collect(Collectors.toList());
        }
        
        List<PhotoStatusPollResponse.UpdatedPhoto> updated = updatedPhotos.stream()
                .map(photo -> PhotoStatusPollResponse.UpdatedPhoto.builder()
                        .id(photo.getId())
                        .status(photo.getStatus())
                        .updatedAt(TimeUtil.formatTimestamp(photo.getUpdatedAt()))
                        .build())
                .collect(Collectors.toList());
        
        PhotoStatusPollResponse response = PhotoStatusPollResponse.of(updated);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get event log for a specific photo
     * GET /api/photos/{id}/events
     */
    @GetMapping("/{id}/events")
    public ResponseEntity<List<EventLogResponse>> getPhotoEvents(@PathVariable UUID id) {
        List<EventLogResponse> events = eventLogService.getEventsByPhotoId(id).stream()
                .map(EventLogResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(events);
    }
}

