package com.rapidphotoflow.service;

import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import com.rapidphotoflow.repository.PhotoRepository;
import com.rapidphotoflow.util.FileNameUtil;
import com.rapidphotoflow.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Main service for photo management.
 * Orchestrates photo upload, storage, queuing, and status management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoService {
    
    private final PhotoRepository photoRepository;
    private final StorageService storageService;
    private final ValidationService validationService;
    private final EventLogService eventLogService;
    private final StatusNotifier statusNotifier;
    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String REDIS_STREAM_NAME = "photo_stream";
    
    // Thread pool for parallel uploads (max 10 concurrent uploads)
    private static final ExecutorService uploadExecutor = Executors.newFixedThreadPool(10);
    
    /**
     * Helper class to hold file data in a thread-safe way
     */
    private static class FileData {
        private final String originalFilename;
        private final String contentType;
        private final byte[] bytes;
        private final long size;
        
        public FileData(String originalFilename, String contentType, byte[] bytes, long size) {
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.bytes = bytes;
            this.size = size;
        }
        
        public String getOriginalFilename() {
            return originalFilename;
        }
        
        public String getContentType() {
            return contentType;
        }
        
        public byte[] getBytes() {
            return bytes;
        }
        
        public long getSize() {
            return size;
        }
    }
    
    /**
     * Upload one or more photos in parallel
     * @param files Files to upload
     * @return List of created Photo entities
     */
    public List<Photo> uploadPhotos(MultipartFile[] files) {
        // Check batch size limit first
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No files provided");
        }
        
        if (files.length > 1000) {
            throw new IllegalArgumentException("Maximum 1000 files allowed per batch");
        }
        
        // Copy and validate file data individually before parallel processing
        // MultipartFile streams can only be read once and are not thread-safe
        // We validate each file during copy and skip corrupted/empty files
        List<FileData> fileDataList = new ArrayList<>();
        List<String> validationErrors = new ArrayList<>();
        
        for (MultipartFile file : files) {
            String filename = file.getOriginalFilename() != null ? 
                    file.getOriginalFilename() : "unknown";
            
            try {
                // First check if file is empty or null
                if (file == null || file.isEmpty()) {
                    validationErrors.add(filename + ": File is corrupted or empty");
                    log.warn("Skipping corrupted/empty file: {}", filename);
                    continue;
                }
                
                // Validate the file before reading bytes
                List<String> errors = validationService.validateFile(file);
                if (!errors.isEmpty()) {
                    String errorMsg = filename + ": " + String.join(", ", errors);
                    validationErrors.add(errorMsg);
                    log.warn("Skipping invalid file: {} - {}", filename, errors);
                    continue;
                }
                
                // Read file bytes
                byte[] fileBytes = file.getBytes();
                
                // Double-check after reading bytes (in case file became empty during read)
                if (fileBytes == null || fileBytes.length == 0) {
                    validationErrors.add(filename + ": File is corrupted or empty (no data read)");
                    log.warn("Skipping corrupted file (no data): {}", filename);
                    continue;
                }
                
                // Create FileData for valid files
                FileData fileData = new FileData(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    fileBytes,
                    fileBytes.length // Use actual bytes length
                );
                fileDataList.add(fileData);
                
            } catch (Exception e) {
                String errorMsg = filename + ": Failed to read file - " + e.getMessage();
                validationErrors.add(errorMsg);
                log.error("Error reading file data: {}", filename, e);
                // Continue with other files instead of throwing
            }
        }
        
        // If all files failed validation, throw an exception
        if (fileDataList.isEmpty() && !validationErrors.isEmpty()) {
            throw new IllegalArgumentException("All files failed validation: " + String.join("; ", validationErrors));
        }
        
        // If some files failed, log warnings but continue with valid files
        if (!validationErrors.isEmpty()) {
            log.warn("Some files failed validation (continuing with valid files): {}", String.join("; ", validationErrors));
        }
        
        // Create parallel upload tasks using copied file data
        List<CompletableFuture<Photo>> uploadFutures = fileDataList.stream()
                .map(fileData -> CompletableFuture.supplyAsync(() -> {
                    try {
                        return uploadSinglePhoto(fileData);
                    } catch (Exception e) {
                        log.error("Error uploading file: {}", fileData.getOriginalFilename(), e);
                        throw new RuntimeException("Failed to upload file: " + fileData.getOriginalFilename(), e);
                    }
                }, uploadExecutor))
                .collect(Collectors.toList());
        
        // Wait for all uploads to complete and collect results
        List<Photo> photos = new ArrayList<>();
        List<String> failedFiles = new ArrayList<>();
        
        for (int i = 0; i < uploadFutures.size(); i++) {
            CompletableFuture<Photo> future = uploadFutures.get(i);
            FileData fileData = fileDataList.get(i);
            try {
                Photo photo = future.join(); // Wait for this upload to complete
                photos.add(photo);
                log.info("Successfully uploaded: {}", fileData.getOriginalFilename());
            } catch (Exception e) {
                String filename = fileData.getOriginalFilename();
                failedFiles.add(filename);
                log.error("Failed to upload file: {}", filename, e);
                // Continue processing other files even if one fails
            }
        }
        
        // If all files failed (both validation and upload), throw an exception
        if (photos.isEmpty() && (!failedFiles.isEmpty() || !validationErrors.isEmpty())) {
            List<String> allErrors = new ArrayList<>(validationErrors);
            for (String failedFile : failedFiles) {
                allErrors.add(failedFile + ": Upload failed");
            }
            String errorMessage = "All files failed. Errors: " + String.join("; ", allErrors);
            throw new RuntimeException(errorMessage);
        }
        
        // Log summary including validation errors
        if (!validationErrors.isEmpty() || !failedFiles.isEmpty()) {
            log.warn("Some files failed. Successful: {}, Validation errors: {}, Upload failures: {}", 
                    photos.size(), validationErrors.size(), failedFiles.size());
        } else {
            log.info("All {} photos uploaded successfully", photos.size());
        }
        
        // Store validation errors in a way that can be accessed if needed
        // For now, we just log them and continue with successful uploads
        
        return photos;
    }
    
    /**
     * Upload a single photo from MultipartFile (legacy method for backward compatibility)
     */
    @Transactional
    public Photo uploadSinglePhoto(MultipartFile file) {
        try {
            FileData fileData = new FileData(
                file.getOriginalFilename(),
                file.getContentType(),
                file.getBytes(),
                file.getSize()
            );
            return uploadSinglePhoto(fileData);
        } catch (Exception e) {
            log.error("Error reading file: {}", file.getOriginalFilename(), e);
            throw new RuntimeException("Failed to read file: " + file.getOriginalFilename(), e);
        }
    }
    
    /**
     * Upload a single photo from FileData (thread-safe)
     */
    @Transactional
    public Photo uploadSinglePhoto(FileData fileData) {
        // Generate unique filename
        String originalFilename = fileData.getOriginalFilename();
        String sanitizedFilename = FileNameUtil.sanitizeFileName(originalFilename);
        String uniqueFilename = FileNameUtil.generateUniqueFileName(sanitizedFilename);
        
        // Upload to MinIO using byte array
        String storagePath = storageService.uploadPhoto(
            fileData.getBytes(), 
            uniqueFilename, 
            fileData.getContentType()
        );
        
        // Create photo entity
        Photo photo = Photo.builder()
                .originalFilename(originalFilename)
                .filename(uniqueFilename)
                .status(PhotoStatus.UPLOADED)
                .size(fileData.getSize())
                .mimeType(fileData.getContentType())
                .storagePath(storagePath)
                .uploadedAt(TimeUtil.getCurrentTimestamp())
                .build();
        
        Photo savedPhoto = photoRepository.save(photo);
        
        // Create event log
        eventLogService.createEvent(savedPhoto.getId(), "UPLOADED", 
                "Photo uploaded successfully: " + originalFilename);
        
        // Queue for processing
        queuePhotoForProcessing(savedPhoto);
        
        // Broadcast status update
        statusNotifier.broadcastStatusUpdate(savedPhoto);
        
        log.info("Uploaded photo: {} (ID: {})", originalFilename, savedPhoto.getId());
        return savedPhoto;
    }
    
    /**
     * Queue photo for processing in Redis Stream
     */
    private void queuePhotoForProcessing(Photo photo) {
        try {
            // Ensure consumer group exists (create if stream is new)
            try {
                Long streamLength = redisTemplate.opsForStream().size(REDIS_STREAM_NAME);
                if (streamLength == null || streamLength == 0) {
                    // Stream doesn't exist yet - will be created when we add first message
                } else {
                    // Stream exists, ensure consumer group exists
                    try {
                        redisTemplate.opsForStream().createGroup(REDIS_STREAM_NAME, "workers");
                    } catch (Exception e) {
                        // Group might already exist, that's okay
                        log.debug("Consumer group might already exist: {}", e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.debug("Error checking stream/group: {}", e.getMessage());
            }
            
            // Create stream record with photo data
            java.util.Map<String, String> fields = new java.util.HashMap<>();
            fields.put("photoId", photo.getId().toString());
            fields.put("filename", photo.getFilename());
            fields.put("storagePath", photo.getStoragePath());
            
            MapRecord<String, String, String> record = 
                    StreamRecords.newRecord()
                            .ofStrings(fields)
                            .withStreamKey(REDIS_STREAM_NAME);
            
            // Add to Redis Stream (this creates the stream if it doesn't exist)
            // Note: add() returns RecordId (the message ID generated by Redis)
            RecordId recordId = redisTemplate.opsForStream().add(record);
            
            // Now that stream exists, ensure consumer group exists
            try {
                redisTemplate.opsForStream().createGroup(REDIS_STREAM_NAME, "workers");
            } catch (Exception e) {
                // Group might already exist, that's okay
                log.debug("Consumer group creation (might already exist): {}", e.getMessage());
            }
            
            String messageId = recordId.getValue();
            
            // Update status to QUEUED
            updatePhotoStatus(photo.getId(), PhotoStatus.QUEUED, 
                    "Photo queued for processing (messageId: " + messageId + ")");
            
            log.info("Queued photo for processing: {} (messageId: {})", photo.getId(), messageId);
        } catch (Exception e) {
            log.error("Error queueing photo for processing: {}", photo.getId(), e);
            updatePhotoStatus(photo.getId(), PhotoStatus.FAILED, 
                    "Failed to queue photo: " + e.getMessage());
            throw new RuntimeException("Failed to queue photo for processing", e);
        }
    }
    
    /**
     * Get photo by ID
     */
    public Photo getPhotoById(UUID id) {
        return photoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Photo not found: " + id));
    }
    
    /**
     * Check if photo exists by ID
     */
    public boolean photoExists(UUID id) {
        return photoRepository.existsById(id);
    }
    
    /**
     * Get all photos with pagination and optional status filter
     */
    public Page<Photo> getPhotos(PhotoStatus status, Pageable pageable) {
        if (status != null) {
            return photoRepository.findByStatus(status, pageable);
        }
        return photoRepository.findAll(pageable);
    }
    
    /**
     * Get photos updated after a timestamp (for polling)
     */
    public List<Photo> getPhotosUpdatedAfter(java.time.LocalDateTime since) {
        return photoRepository.findUpdatedAfter(since);
    }
    
    /**
     * Toggle favorite status of a photo
     */
    @Transactional
    public Photo toggleFavorite(UUID photoId) {
        Photo photo = getPhotoById(photoId);
        photo.setIsFavorite(!photo.getIsFavorite());
        return photoRepository.save(photo);
    }
    
    /**
     * Rename photo (update original filename)
     */
    @Transactional
    public Photo renamePhoto(UUID photoId, String newFilename) {
        Photo photo = getPhotoById(photoId);
        
        // Validate new filename
        if (newFilename == null || newFilename.trim().isEmpty()) {
            throw new IllegalArgumentException("Filename cannot be empty");
        }
        
        String sanitizedFilename = FileNameUtil.sanitizeFileName(newFilename.trim());
        photo.setOriginalFilename(sanitizedFilename);
        
        // Create event log
        eventLogService.createEvent(photoId, "RENAMED", 
                "Photo renamed from '" + photo.getOriginalFilename() + "' to '" + sanitizedFilename + "'");
        
        return photoRepository.save(photo);
    }
    
    /**
     * Get favorite photos with optional status filter
     */
    public Page<Photo> getFavoritePhotos(PhotoStatus status, Pageable pageable) {
        if (status != null) {
            return photoRepository.findByIsFavoriteTrueAndStatus(status, pageable);
        }
        return photoRepository.findByIsFavoriteTrue(pageable);
    }
    
    /**
     * Update photo status
     */
    @Transactional
    public Photo updatePhotoStatus(UUID photoId, PhotoStatus status, String message) {
        Photo photo = getPhotoById(photoId);
        photo.setStatus(status);
        
        if (status == PhotoStatus.COMPLETED || status == PhotoStatus.FAILED) {
            photo.setProcessedAt(TimeUtil.getCurrentTimestamp());
        }
        
        Photo updated = photoRepository.save(photo);
        
        // Create event log
        eventLogService.createEvent(photoId, status.toString(), message);
        
        // Broadcast status update
        statusNotifier.broadcastStatusUpdate(updated);
        
        log.info("Updated photo status: {} -> {} (ID: {})", photo.getStatus(), status, photoId);
        return updated;
    }
    
    /**
     * Delete photo
     */
    @Transactional
    public void deletePhoto(UUID id) {
        // Get photo info before deletion (for MinIO cleanup)
        Photo photo = null;
        try {
            photo = getPhotoById(id);
        } catch (Exception e) {
            log.warn("Photo not found for deletion: {}", id);
            return; // Photo doesn't exist, nothing to delete
        }
        
        String filename = photo.getFilename();
        String thumbnailPath = photo.getThumbnailPath();
        
        // Delete from database using deleteById to avoid optimistic locking issues
        // This will cascade delete event logs
        try {
            photoRepository.deleteById(id);
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
            // Photo was updated by another transaction (e.g., worker)
            // Try to delete again with a fresh query
            log.warn("Optimistic locking failure during delete, retrying with fresh query: {}", id);
            try {
                // Check if photo still exists
                if (photoRepository.existsById(id)) {
                    // Use native query to force delete (bypasses optimistic locking)
                    photoRepository.deleteById(id);
                } else {
                    log.info("Photo already deleted: {}", id);
                }
            } catch (Exception retryException) {
                // If still fails, log but don't throw - photo might have been deleted by worker
                log.warn("Failed to delete photo after retry (may have been deleted by worker): {}", id, retryException);
            }
        }
        
        // Delete from MinIO (after DB deletion to ensure consistency)
        try {
            storageService.deletePhoto(filename);
            if (thumbnailPath != null) {
                storageService.deleteThumbnail(filename);
            }
        } catch (Exception e) {
            log.warn("Error deleting photo from storage (photo already deleted from DB): {}", id, e);
        }
        
        log.info("Deleted photo: {}", id);
    }
    
    /**
     * Delete multiple photos
     */
    @Transactional
    public void deletePhotos(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        
        // Get photo info before deletion (for MinIO cleanup)
        List<Photo> photos = photoRepository.findAllById(ids);
        if (photos.isEmpty()) {
            log.warn("No photos found for deletion: {}", ids);
            return;
        }
        
        // Store filenames before deletion
        List<String> filenames = photos.stream()
                .map(Photo::getFilename)
                .toList();
        List<String> thumbnailPaths = photos.stream()
                .filter(p -> p.getThumbnailPath() != null)
                .map(Photo::getThumbnailPath)
                .toList();
        
        // Delete from database - delete individually to handle optimistic locking gracefully
        int deletedCount = 0;
        for (UUID id : ids) {
            try {
                photoRepository.deleteById(id);
                deletedCount++;
            } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
                // Photo was updated by another transaction (e.g., worker)
                log.warn("Optimistic locking failure for photo {}, may have been updated by worker: {}", id, e.getMessage());
                // Try once more
                try {
                    if (photoRepository.existsById(id)) {
                        photoRepository.deleteById(id);
                        deletedCount++;
                    }
                } catch (Exception retryException) {
                    log.warn("Failed to delete photo after retry: {}", id, retryException);
                }
            } catch (Exception e) {
                log.warn("Error deleting photo: {}", id, e);
            }
        }
        
        // Delete from MinIO (after DB deletion)
        for (String filename : filenames) {
            try {
                storageService.deletePhoto(filename);
            } catch (Exception e) {
                log.warn("Error deleting photo from storage: {}", filename, e);
            }
        }
        
        for (String thumbnailPath : thumbnailPaths) {
            try {
                storageService.deleteThumbnail(thumbnailPath);
            } catch (Exception e) {
                log.warn("Error deleting thumbnail from storage: {}", thumbnailPath, e);
            }
        }
        
        log.info("Deleted {} out of {} photos", deletedCount, photos.size());
    }
}

