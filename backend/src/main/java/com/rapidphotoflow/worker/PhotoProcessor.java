package com.rapidphotoflow.worker;

import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import com.rapidphotoflow.service.EventLogService;
import com.rapidphotoflow.service.PhotoService;
import com.rapidphotoflow.service.StatusNotifier;
import com.rapidphotoflow.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Random;
import java.util.UUID;

/**
 * Photo processor that simulates photo processing.
 * In a real application, this would perform actual image processing
 * (resize, compress, watermark, etc.).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PhotoProcessor {
    
    private final PhotoService photoService;
    private final EventLogService eventLogService;
    private final StatusNotifier statusNotifier;
    
    private final Random random = new Random();
    
    // Processing simulation: 2-5 seconds delay
    private static final int MIN_PROCESSING_TIME_SECONDS = 2;
    private static final int MAX_PROCESSING_TIME_SECONDS = 5;
    
    /**
     * Process a photo (simulation).
     * Updates status through lifecycle: PROCESSING → COMPLETED
     * 
     * @param photoId Photo ID to process
     * @param filename Photo filename
     * @param storagePath Storage path in MinIO
     */
    public void processPhoto(UUID photoId, String filename, String storagePath) {
        try {
            // Check if photo exists before processing
            if (!photoService.photoExists(photoId)) {
                log.warn("Photo not found in database, skipping processing: {} (ID: {})", filename, photoId);
                return; // Photo may have been deleted, skip processing
            }
            
            log.info("Starting photo processing: {} (ID: {})", filename, photoId);
            
            // Update status to PROCESSING
            photoService.updatePhotoStatus(
                    photoId,
                    PhotoStatus.PROCESSING,
                    "Photo processing started"
            );
            
            // Simulate processing work
            simulateProcessing(photoId, filename);
            
            // Check again before updating to COMPLETED (photo might have been deleted during processing)
            if (!photoService.photoExists(photoId)) {
                log.warn("Photo was deleted during processing, skipping completion update: {} (ID: {})", filename, photoId);
                return;
            }
            
            // Update status to COMPLETED
            photoService.updatePhotoStatus(
                    photoId,
                    PhotoStatus.COMPLETED,
                    "Photo processing completed successfully"
            );
            
            log.info("Completed photo processing: {} (ID: {})", filename, photoId);
            
        } catch (RuntimeException e) {
            // Check if it's a "Photo not found" error
            if (e.getMessage() != null && e.getMessage().contains("Photo not found")) {
                log.warn("Photo not found during processing, skipping: {} (ID: {})", filename, photoId);
                return; // Photo was deleted, no need to update status
            }
            
            log.error("Error processing photo: {} (ID: {})", filename, photoId, e);
            
            // Update status to FAILED (only if photo still exists)
            try {
                if (photoService.photoExists(photoId)) {
                    photoService.updatePhotoStatus(
                            photoId,
                            PhotoStatus.FAILED,
                            "Photo processing failed: " + e.getMessage()
                    );
                } else {
                    log.warn("Photo was deleted, cannot update status to FAILED: {}", photoId);
                }
            } catch (Exception updateException) {
                // If photo doesn't exist, that's okay - just log it
                if (updateException.getMessage() != null && updateException.getMessage().contains("Photo not found")) {
                    log.warn("Photo not found, cannot update status to FAILED: {}", photoId);
                } else {
                    log.error("Error updating photo status to FAILED: {}", photoId, updateException);
                }
            }
        } catch (Exception e) {
            log.error("Unexpected error processing photo: {} (ID: {})", filename, photoId, e);
            
            // Try to update status to FAILED (only if photo exists)
            try {
                if (photoService.photoExists(photoId)) {
                    photoService.updatePhotoStatus(
                            photoId,
                            PhotoStatus.FAILED,
                            "Photo processing failed: " + e.getMessage()
                    );
                }
            } catch (Exception updateException) {
                log.warn("Could not update photo status to FAILED: {}", photoId, updateException.getMessage());
            }
        }
    }
    
    /**
     * Simulate photo processing with realistic delays.
     * In a real application, this would:
     * - Resize image to multiple sizes (thumbnail, medium, large)
     * - Compress image
     * - Extract metadata (width, height, format)
     * - Create thumbnail
     * - Apply watermark (optional)
     * - Validate file integrity
     */
    private void simulateProcessing(UUID photoId, String filename) {
        try {
            // Simulate processing steps with delays
            
            // Step 1: Validate file (0.5-1 second)
            log.debug("Validating file: {}", filename);
            Thread.sleep(500 + random.nextInt(500));
            eventLogService.createEvent(photoId, "PROCESSING", 
                    "File validation completed");
            
            // Step 2: Extract metadata (0.5-1 second)
            log.debug("Extracting metadata: {}", filename);
            Thread.sleep(500 + random.nextInt(500));
            eventLogService.createEvent(photoId, "PROCESSING", 
                    "Metadata extracted");
            
            // Step 3: Create thumbnail (1-2 seconds)
            log.debug("Creating thumbnail: {}", filename);
            Thread.sleep(1000 + random.nextInt(1000));
            eventLogService.createEvent(photoId, "PROCESSING", 
                    "Thumbnail created");
            
            // Step 4: Optimize/compress (0.5-1 second)
            log.debug("Optimizing image: {}", filename);
            Thread.sleep(500 + random.nextInt(500));
            eventLogService.createEvent(photoId, "PROCESSING", 
                    "Image optimization completed");
            
            // Total processing time: 2.5-5 seconds
            log.debug("Processing completed: {}", filename);
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Processing interrupted", e);
        }
    }
    
    /**
     * Get estimated processing time in seconds.
     * Used for progress tracking (future enhancement).
     */
    public int getEstimatedProcessingTime() {
        return MIN_PROCESSING_TIME_SECONDS + 
               random.nextInt(MAX_PROCESSING_TIME_SECONDS - MIN_PROCESSING_TIME_SECONDS + 1);
    }
}

