package com.rapidphotoflow.service;

import com.rapidphotoflow.dto.PhotoStatusUpdate;
import com.rapidphotoflow.model.Photo;
import com.rapidphotoflow.model.PhotoStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service for broadcasting photo status updates via WebSocket.
 * Keeps controllers clean by centralizing WebSocket logic.
 */
@Service
@Slf4j
public class StatusNotifier {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    private static final String TOPIC_PHOTO_STATUS_ALL = "/topic/photo-status/all";
    private static final String TOPIC_PHOTO_STATUS_INDIVIDUAL = "/topic/photo-status/";
    
    public StatusNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * Broadcast status update to all subscribers
     * @param photoId Photo ID
     * @param status New status
     * @param message Optional message
     */
    public void broadcastStatusUpdate(UUID photoId, PhotoStatus status, String message) {
        PhotoStatusUpdate update = new PhotoStatusUpdate(status, message);
        
        // Broadcast to all subscribers
        messagingTemplate.convertAndSend(TOPIC_PHOTO_STATUS_ALL, createStatusMessage(photoId, status, message));
        
        // Broadcast to photo-specific subscribers
        messagingTemplate.convertAndSend(TOPIC_PHOTO_STATUS_INDIVIDUAL + photoId, 
                createStatusMessage(photoId, status, message));
        
        log.debug("Broadcasted status update: photoId={}, status={}", photoId, status);
    }
    
    /**
     * Broadcast status update from Photo entity
     */
    public void broadcastStatusUpdate(Photo photo) {
        broadcastStatusUpdate(photo.getId(), photo.getStatus(), 
                "Photo status updated to " + photo.getStatus());
    }
    
    /**
     * Create status message object for WebSocket
     */
    private StatusMessage createStatusMessage(UUID photoId, PhotoStatus status, String message) {
        return new StatusMessage(photoId, status.toString(), message);
    }
    
    /**
     * Status message DTO for WebSocket
     */
    public static class StatusMessage {
        private final String photoId;
        private final String status;
        private final String message;
        private final String timestamp;
        
        public StatusMessage(UUID photoId, String status, String message) {
            this.photoId = photoId.toString();
            this.status = status;
            this.message = message;
            this.timestamp = java.time.Instant.now().toString();
        }
        
        public String getPhotoId() {
            return photoId;
        }
        
        public String getStatus() {
            return status;
        }
        
        public String getMessage() {
            return message;
        }
        
        public String getTimestamp() {
            return timestamp;
        }
    }
}

