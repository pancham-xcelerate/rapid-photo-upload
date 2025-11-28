package com.rapidphotoflow.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Service for file validation.
 * Validates file types, sizes, and formats before processing.
 */
@Service
@Slf4j
public class ValidationService {
    
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif"
    );
    
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            ".jpg", ".jpeg", ".png", ".webp", ".gif"
    );
    
    /**
     * Validate a single file
     * @param file File to validate
     * @return List of validation errors (empty if valid)
     */
    public List<String> validateFile(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        
        if (file == null || file.isEmpty()) {
            errors.add("File is empty or null");
            return errors;
        }
        
        // Check file size
        if (file.getSize() > MAX_FILE_SIZE) {
            errors.add(String.format("File size (%d bytes) exceeds maximum allowed size (%d bytes)", 
                    file.getSize(), MAX_FILE_SIZE));
        }
        
        // Check MIME type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            errors.add(String.format("Unsupported file type: %s. Allowed types: %s", 
                    contentType, String.join(", ", ALLOWED_MIME_TYPES)));
        }
        
        // Check file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String extension = getFileExtension(originalFilename);
            if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
                errors.add(String.format("Unsupported file extension: %s. Allowed extensions: %s", 
                        extension, String.join(", ", ALLOWED_EXTENSIONS)));
            }
        }
        
        return errors;
    }
    
    /**
     * Validate multiple files
     * @param files Files to validate
     * @return Map of filename to list of errors
     */
    public ValidationResult validateFiles(MultipartFile[] files) {
        ValidationResult result = new ValidationResult();
        
        if (files == null || files.length == 0) {
            result.addError("No files provided");
            return result;
        }
        
        // Check batch size limit
        if (files.length > 1000) {
            result.addError("Maximum 1000 files allowed per batch");
            return result;
        }
        
        // Validate each file
        for (MultipartFile file : files) {
            String filename = file.getOriginalFilename() != null ? 
                    file.getOriginalFilename() : "unknown";
            List<String> errors = validateFile(file);
            
            if (!errors.isEmpty()) {
                result.addFileErrors(filename, errors);
            } else {
                result.addValidFile(filename);
            }
        }
        
        return result;
    }
    
    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot).toLowerCase();
    }
    
    /**
     * Validation result container
     */
    public static class ValidationResult {
        private final List<String> globalErrors = new ArrayList<>();
        private final java.util.Map<String, List<String>> fileErrors = new java.util.HashMap<>();
        private final List<String> validFiles = new ArrayList<>();
        
        public void addError(String error) {
            globalErrors.add(error);
        }
        
        public void addFileErrors(String filename, List<String> errors) {
            fileErrors.put(filename, errors);
        }
        
        public void addValidFile(String filename) {
            validFiles.add(filename);
        }
        
        public boolean isValid() {
            return globalErrors.isEmpty() && fileErrors.isEmpty();
        }
        
        public List<String> getGlobalErrors() {
            return globalErrors;
        }
        
        public java.util.Map<String, List<String>> getFileErrors() {
            return fileErrors;
        }
        
        public List<String> getValidFiles() {
            return validFiles;
        }
    }
}

