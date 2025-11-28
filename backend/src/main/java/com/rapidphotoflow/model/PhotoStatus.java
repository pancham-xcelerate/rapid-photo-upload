package com.rapidphotoflow.model;

/**
 * Photo processing status enumeration.
 * Tracks the lifecycle of a photo through the processing pipeline.
 */
public enum PhotoStatus {
    /**
     * Photo has been uploaded by user but not yet queued for processing
     */
    UPLOADED,
    
    /**
     * Photo has been added to Redis Stream queue, waiting for worker
     */
    QUEUED,
    
    /**
     * Worker is currently processing the photo
     */
    PROCESSING,
    
    /**
     * Processing completed successfully
     */
    COMPLETED,
    
    /**
     * Processing failed with an error
     */
    FAILED
}

