package com.rapidphotoflow.service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.SetBucketPolicyArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

/**
 * Service for MinIO/S3 storage operations.
 * Handles file uploads, downloads, and bucket management.
 */
@Service
@Slf4j
public class StorageService {
    
    private final MinioClient minioClient;
    private final String bucketPhotos;
    private final String bucketThumbnails;
    
    public StorageService(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket-photos}") String bucketPhotos,
            @Value("${minio.bucket-thumbnails}") String bucketThumbnails) {
        
        this.bucketPhotos = bucketPhotos;
        this.bucketThumbnails = bucketThumbnails;
        
        // Initialize MinIO client
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        
        // Ensure buckets exist
        initializeBuckets();
    }
    
    /**
     * Initialize buckets if they don't exist
     */
    private void initializeBuckets() {
        try {
            if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketPhotos).build())) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketPhotos).build());
                log.info("Created bucket: {}", bucketPhotos);
            }
            
            if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketThumbnails).build())) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketThumbnails).build());
                log.info("Created bucket: {}", bucketThumbnails);
            }
        } catch (Exception e) {
            log.error("Error initializing buckets", e);
            throw new RuntimeException("Failed to initialize storage buckets", e);
        }
    }
    
    /**
     * Upload photo to MinIO
     * @param file MultipartFile to upload
     * @param filename Sanitized filename
     * @return Storage path (bucket/filename)
     */
    public String uploadPhoto(MultipartFile file, String filename) {
        try {
            return uploadPhoto(file.getBytes(), filename, file.getContentType());
        } catch (Exception e) {
            log.error("Error reading file: {}", filename, e);
            throw new RuntimeException("Failed to read file: " + filename, e);
        }
    }
    
    /**
     * Upload photo to MinIO from byte array (thread-safe for parallel processing)
     * @param fileBytes File content as byte array
     * @param filename Sanitized filename
     * @param contentType Content type (e.g., image/jpeg)
     * @return Storage path (bucket/filename)
     */
    public String uploadPhoto(byte[] fileBytes, String filename, String contentType) {
        try {
            String objectName = bucketPhotos + "/" + filename;
            
            java.io.ByteArrayInputStream inputStream = new java.io.ByteArrayInputStream(fileBytes);
            
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketPhotos)
                            .object(filename)
                            .stream(inputStream, fileBytes.length, -1)
                            .contentType(contentType)
                            .build()
            );
            
            log.info("Uploaded photo: {}", filename);
            return objectName;
        } catch (Exception e) {
            log.error("Error uploading photo: {}", filename, e);
            throw new RuntimeException("Failed to upload photo to storage", e);
        }
    }
    
    /**
     * Upload thumbnail to MinIO
     * @param inputStream Thumbnail image stream
     * @param filename Thumbnail filename
     * @param contentType Content type (e.g., image/jpeg)
     * @param size File size in bytes
     * @return Storage path
     */
    public String uploadThumbnail(InputStream inputStream, String filename, String contentType, long size) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketThumbnails)
                            .object(filename)
                            .stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build()
            );
            
            log.info("Uploaded thumbnail: {}", filename);
            return bucketThumbnails + "/" + filename;
        } catch (Exception e) {
            log.error("Error uploading thumbnail: {}", filename, e);
            throw new RuntimeException("Failed to upload thumbnail to storage", e);
        }
    }
    
    /**
     * Delete photo from MinIO
     * @param filename Filename to delete
     */
    public void deletePhoto(String filename) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketPhotos)
                            .object(filename)
                            .build()
            );
            log.info("Deleted photo: {}", filename);
        } catch (Exception e) {
            log.error("Error deleting photo: {}", filename, e);
            throw new RuntimeException("Failed to delete photo from storage", e);
        }
    }
    
    /**
     * Delete thumbnail from MinIO
     * @param filename Thumbnail filename to delete
     */
    public void deleteThumbnail(String filename) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketThumbnails)
                            .object(filename)
                            .build()
            );
            log.info("Deleted thumbnail: {}", filename);
        } catch (Exception e) {
            log.error("Error deleting thumbnail: {}", filename, e);
            throw new RuntimeException("Failed to delete thumbnail from storage", e);
        }
    }
    
    /**
     * Get MinIO client (for advanced operations)
     */
    public MinioClient getMinioClient() {
        return minioClient;
    }
    
    /**
     * Get photo stream from MinIO
     * @param filename Photo filename
     * @return InputStream of the photo
     */
    public InputStream getPhotoStream(String filename) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketPhotos)
                            .object(filename)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error getting photo stream: {}", filename, e);
            throw new RuntimeException("Failed to get photo from storage", e);
        }
    }
    
    /**
     * Get thumbnail stream from MinIO
     * @param filename Thumbnail filename
     * @return InputStream of the thumbnail
     */
    public InputStream getThumbnailStream(String filename) {
        try {
            return minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketThumbnails)
                            .object(filename)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error getting thumbnail stream: {}", filename, e);
            throw new RuntimeException("Failed to get thumbnail from storage", e);
        }
    }
    
    /**
     * Get base URL for photo access (now using backend proxy)
     */
    public String getBaseUrl() {
        // Return backend API URL for proxy endpoints
        return "http://localhost:8080/api/photos";
    }
}

