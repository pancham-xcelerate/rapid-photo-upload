package com.rapidphotoflow.worker;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Redis Stream consumer for photo processing jobs.
 * Consumes messages from Redis Stream and processes photos.
 * 
 * Only active when running as Worker application (not in API mode).
 */
@Component
@ConditionalOnProperty(name = "app.mode", havingValue = "worker", matchIfMissing = false)
@RequiredArgsConstructor
@Slf4j
public class StreamConsumer {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final PhotoProcessor photoProcessor;
    
    private static final String STREAM_NAME = "photo_stream";
    private static final String CONSUMER_GROUP = "workers";
    private static final String CONSUMER_NAME = "worker-1";
    
    // Thread pool for parallel photo processing (max 40 concurrent processing)
    private static final ExecutorService processingExecutor = Executors.newFixedThreadPool(40);
    
    /**
     * Initialize consumer group if it doesn't exist.
     * Called on application startup.
     */
    public void initializeConsumerGroup() {
        try {
            // Check if stream exists
            Long streamLength = redisTemplate.opsForStream().size(STREAM_NAME);
            
            if (streamLength == null || streamLength == 0) {
                // Stream doesn't exist, create it with consumer group
                try {
                    redisTemplate.opsForStream().createGroup(STREAM_NAME, CONSUMER_GROUP);
                    log.info("Created consumer group: {} for stream: {}", CONSUMER_GROUP, STREAM_NAME);
                } catch (Exception e) {
                    // Group might already exist, that's okay
                    log.debug("Consumer group might already exist: {}", e.getMessage());
                }
            } else {
                // Stream exists, try to create group (might already exist)
                try {
                    redisTemplate.opsForStream().createGroup(STREAM_NAME, CONSUMER_GROUP);
                    log.info("Created consumer group: {} for stream: {}", CONSUMER_GROUP, STREAM_NAME);
                } catch (Exception e) {
                    log.debug("Consumer group already exists or stream not found: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Error initializing consumer group (will retry): {}", e.getMessage());
        }
    }
    
    /**
     * Consume messages from Redis Stream.
     * Runs every 1 second to check for new messages.
     */
    @Scheduled(fixedDelay = 1000) // Check every 1 second
    public void consumeMessages() {
        try {
            // Check if stream exists first
            Long streamLength = redisTemplate.opsForStream().size(STREAM_NAME);
            if (streamLength == null || streamLength == 0) {
                // Stream doesn't exist yet, skip consumption
                return;
            }
            
            // Read messages from stream using consumer group
            StreamReadOptions readOptions = StreamReadOptions.empty()
                    .count(40); // Read up to 40 messages at a time
            
            List<MapRecord<String, Object, Object>> messages = redisTemplate.opsForStream().read(
                    Consumer.from(CONSUMER_GROUP, CONSUMER_NAME),
                    readOptions,
                    StreamOffset.create(STREAM_NAME, ReadOffset.lastConsumed())
            );
            
            if (messages == null || messages.isEmpty()) {
                return; // No messages available
            }
            
            log.debug("Consumed {} messages from stream", messages.size());
            
            // Process messages in parallel
            List<CompletableFuture<Void>> processingFutures = messages.stream()
                    .map(message -> CompletableFuture.runAsync(() -> {
                        try {
                            processMessage(message);
                            
                            // Acknowledge message after successful processing
                            redisTemplate.opsForStream().acknowledge(
                                    STREAM_NAME,
                                    CONSUMER_GROUP,
                                    message.getId()
                            );
                            
                            log.debug("Successfully processed and acknowledged message: {}", message.getId());
                            
                        } catch (Exception e) {
                            log.error("Error processing message: {}", message.getId(), e);
                            // Message will remain in pending list and can be retried
                            // In production, you might want to move to a dead-letter queue after N retries
                        }
                    }, processingExecutor))
                    .collect(Collectors.toList());
            
            // Wait for all processing to complete (non-blocking for the scheduler)
            // This allows the next scheduled run to start even if some are still processing
            CompletableFuture.allOf(processingFutures.toArray(new CompletableFuture[0]))
                    .exceptionally(ex -> {
                        log.error("Error in parallel processing batch", ex);
                        return null;
                    });
            
        } catch (org.springframework.data.redis.RedisSystemException e) {
            // Handle Redis errors gracefully (stream might not exist yet)
            if (e.getCause() instanceof io.lettuce.core.RedisCommandExecutionException) {
                io.lettuce.core.RedisCommandExecutionException redisEx = 
                    (io.lettuce.core.RedisCommandExecutionException) e.getCause();
                if (redisEx.getMessage() != null && redisEx.getMessage().contains("NOGROUP")) {
                    // Stream or consumer group doesn't exist yet - this is normal before first upload
                    log.debug("Stream or consumer group not ready yet: {}", redisEx.getMessage());
                    return;
                }
            }
            log.error("Error consuming messages from stream", e);
        } catch (Exception e) {
            log.error("Error consuming messages from stream", e);
        }
    }
    
    /**
     * Process a single message from the stream.
     * Extracts photo information and delegates to PhotoProcessor.
     */
    private void processMessage(MapRecord<String, Object, Object> message) {
        try {
            Map<Object, Object> valueMap = message.getValue();
            
            // Extract photo information from message
            String photoIdStr = (String) valueMap.get("photoId");
            String filename = (String) valueMap.get("filename");
            String storagePath = (String) valueMap.get("storagePath");
            
            if (photoIdStr == null || filename == null) {
                log.error("Invalid message format: missing photoId or filename");
                return;
            }
            
            UUID photoId = UUID.fromString(photoIdStr);
            
            log.info("Processing message: photoId={}, filename={}", photoId, filename);
            
            // Process the photo
            photoProcessor.processPhoto(photoId, filename, storagePath);
            
        } catch (Exception e) {
            log.error("Error processing message: {}", message.getId(), e);
            throw e; // Re-throw to prevent acknowledgment
        }
    }
    
    /**
     * Process pending messages (messages that failed previously).
     * Runs every 30 seconds to retry failed messages.
     */
    @Scheduled(fixedDelay = 30000) // Every 30 seconds
    public void processPendingMessages() {
        try {
            // Read pending messages for this consumer
            // Get pending messages - the method returns PendingMessages which contains the messages
            PendingMessages pendingMessages = redisTemplate.opsForStream().pending(
                    STREAM_NAME,
                    Consumer.from(CONSUMER_GROUP, CONSUMER_NAME)
            );
            
            if (pendingMessages == null || pendingMessages.isEmpty()) {
                return; // No pending messages
            }
            
            log.info("Found {} pending messages, processing up to 10", pendingMessages.size());
            
            // Collect pending message IDs (limit to 10)
            List<RecordId> pendingIds = new ArrayList<>();
            int count = 0;
            for (PendingMessage pending : pendingMessages) {
                if (count >= 10) break; // Limit to 10
                pendingIds.add(pending.getId());
                count++;
            }
            
            if (pendingIds.isEmpty()) {
                return;
            }
            
            // Claim all pending messages at once
            try {
                List<MapRecord<String, Object, Object>> claimed = redisTemplate.opsForStream().claim(
                        STREAM_NAME,
                        CONSUMER_GROUP,
                        CONSUMER_NAME,
                        java.time.Duration.ofMinutes(1), // Min idle time
                        pendingIds.toArray(new RecordId[0])
                );
                
                if (claimed == null || claimed.isEmpty()) {
                    return;
                }
                
                log.info("Claimed {} pending messages, processing in parallel", claimed.size());
                
                // Process claimed messages in parallel
                List<CompletableFuture<Void>> pendingFutures = claimed.stream()
                        .map(message -> CompletableFuture.runAsync(() -> {
                            try {
                                processMessage(message);
                                
                                // Acknowledge after successful processing
                                redisTemplate.opsForStream().acknowledge(
                                        STREAM_NAME,
                                        CONSUMER_GROUP,
                                        message.getId()
                                );
                                
                                log.debug("Successfully processed and acknowledged pending message: {}", message.getId());
                                
                            } catch (Exception e) {
                                log.error("Error processing pending message: {}", message.getId(), e);
                            }
                        }, processingExecutor))
                        .collect(Collectors.toList());
                
                // Wait for all pending processing to complete
                CompletableFuture.allOf(pendingFutures.toArray(new CompletableFuture[0]))
                        .exceptionally(ex -> {
                            log.error("Error in parallel pending message processing", ex);
                            return null;
                        });
                
            } catch (Exception e) {
                log.error("Error claiming pending messages", e);
            }
            
        } catch (Exception e) {
            log.error("Error processing pending messages", e);
        }
    }
}

