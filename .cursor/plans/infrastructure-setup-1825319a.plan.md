<!-- 1825319a-8fc2-4822-8143-f7cb32f0258d 73d8f15d-75d8-4e15-8b22-30f6328f75e9 -->
# Full Application Implementation Plan

## Overview

Build the complete RapidPhotoFlow application with all components: infrastructure services, backend API, worker service, and frontend UI.

## Implementation Phases

### Phase 1: Infrastructure Setup

Set up Docker Compose with PostgreSQL, Redis, and MinIO services.

**Files to Create:**

- `infra/docker-compose.yml` - Main orchestration file
- `.env` - Environment variables (optional)
- `infra/minio/create-buckets.sh` - Bucket initialization script

**Services:**

- PostgreSQL (port 5432, database: photodb)
- Redis (port 6379, with persistence)
- MinIO (ports 9000 API, 9001 console, buckets: photos, thumbnails)

### Phase 2: Backend - Project Structure & Dependencies

Set up Spring Boot project structure with **Maven** (pom.xml) and dependencies.

**Files to Create:**

- `backend/pom.xml` - Maven build configuration with all dependencies
- `backend/src/main/java/com/rapidphotoflow/` - Base package structure
- `backend/src/main/resources/application.yml` - Application configuration
- `backend/src/main/resources/application-dev.yml` - Dev profile config
- `backend/.mvn/wrapper/` - Maven wrapper files (optional, for consistent builds)

**Maven Dependencies Needed:**

- Spring Boot Starter Web (spring-boot-starter-web)
- Spring Boot Starter Data JPA (spring-boot-starter-data-jpa)
- Spring Boot Starter WebSocket (spring-boot-starter-websocket)
- PostgreSQL Driver (postgresql)
- Spring Data Redis (spring-boot-starter-data-redis)
- Lettuce Core (for Redis connection pooling)
- MinIO Java Client (io.minio:minio)
- Lombok (lombok, with provided scope)
- Bean Validation (spring-boot-starter-validation)
- Jackson (for JSON, included in web starter)
- Spring Boot DevTools (spring-boot-devtools, for development)

**Maven Configuration:**

- Java version: 17 or higher
- Spring Boot version: 3.x (latest stable)
- Packaging: jar (for both API and Worker)
- Maven compiler plugin configuration
- Spring Boot Maven plugin for executable JARs

**Project Structure Note:**

- Both `ApiApplication.java` and `WorkerApplication.java` will be in the same Maven module
- Use Spring profiles (`spring.profiles.active`) to differentiate between API and Worker
- Or use Maven profiles to build separate JARs with different main classes
- Recommended: Use Spring profiles with different `spring.main.web-application-type` (servlet for API, none for Worker)

### Phase 3: Backend - Models & Entities

Create JPA entities for Photo and EventLog.

**Files:**

- `backend/.../model/Photo.java` - Photo entity with status enum
- `backend/.../model/EventLog.java` - Event log entity
- `backend/.../model/PhotoStatus.java` - Status enum (UPLOADED, QUEUED, PROCESSING, COMPLETED, FAILED)

### Phase 4: Backend - Repositories

Create Spring Data JPA repositories.

**Files:**

- `backend/.../repository/PhotoRepository.java` - Photo CRUD operations
- `backend/.../repository/EventLogRepository.java` - Event log queries

### Phase 5: Backend - Utilities

Create utility classes for time and filename handling.

**Files:**

- `backend/.../util/TimeUtil.java` - Timestamp formatting, UTC handling
- `backend/.../util/FileNameUtil.java` - Filename sanitization, security

### Phase 6: Backend - DTOs

Create data transfer objects for API requests/responses.

**Files:**

- `backend/.../dto/PhotoUploadRequest.java`
- `backend/.../dto/PhotoResponse.java`
- `backend/.../dto/PhotoStatusUpdate.java`
- `backend/.../dto/EventLogResponse.java`
- `backend/.../dto/ErrorResponse.java`

### Phase 7: Backend - Services

Implement business logic services.

**Files:**

- `backend/.../service/PhotoService.java` - Photo management logic
- `backend/.../service/StorageService.java` - MinIO/S3 operations
- `backend/.../service/EventLogService.java` - Event logging
- `backend/.../service/ValidationService.java` - File validation
- `backend/.../service/StatusNotifier.java` - WebSocket broadcasting

### Phase 8: Backend - Configuration

Set up Spring configuration classes.

**Files:**

- `backend/.../config/WebSocketConfig.java` - STOMP WebSocket config
- `backend/.../config/CorsConfig.java` - CORS for frontend
- `backend/.../config/RedisConfig.java` - Redis connection
- `backend/.../config/MinIOConfig.java` - MinIO client setup

### Phase 9: Backend - Controllers (API Application)

Create REST controllers for API service.

**Files:**

- `backend/.../controller/PhotoController.java` - Photo CRUD endpoints
- `backend/.../controller/EventLogController.java` - Event log endpoints
- `backend/.../controller/WebSocketController.java` - WebSocket handling
- `backend/.../ApiApplication.java` - Main API application class

### Phase 10: Backend - Worker Service

Implement Redis Stream consumer and photo processor.

**Files:**

- `backend/.../worker/StreamConsumer.java` - Redis Stream consumer
- `backend/.../worker/PhotoProcessor.java` - Photo processing logic (simulation)
- `backend/.../WorkerApplication.java` - Main worker application class

### Phase 11: Frontend - Project Setup

Initialize React + Vite project with dependencies.

**Files:**

- `frontend/package.json` - Dependencies (React, Vite, Tailwind, Axios, etc.)
- `frontend/vite.config.js` - Vite configuration
- `frontend/tailwind.config.js` - Tailwind CSS config
- `frontend/index.html` - HTML entry point
- `frontend/.gitignore`

### Phase 12: Frontend - API Service

Create API client for backend communication.

**Files:**

- `frontend/src/services/api.js` - Axios instance and API methods

### Phase 13: Frontend - Hooks

Create custom React hooks.

**Files:**

- `frontend/src/hooks/useWebSocket.js` - WebSocket connection management
- `frontend/src/hooks/usePhotoStatus.js` - Photo status polling fallback

### Phase 14: Frontend - Components

Build reusable UI components.

**Files:**

- `frontend/src/components/StatusBadge.jsx` - Status indicator
- `frontend/src/components/FileUploader.jsx` - File upload with drag-drop
- `frontend/src/components/PhotoGallery.jsx` - Photo grid display
- `frontend/src/components/EventTimeline.jsx` - Event log timeline
- `frontend/src/components/ErrorToast.jsx` - Error notifications

### Phase 15: Frontend - Pages

Create main application pages.

**Files:**

- `frontend/src/pages/UploadPhotos.jsx` - Upload screen
- `frontend/src/pages/ProcessingQueue.jsx` - Queue screen
- `frontend/src/pages/ReviewPhotos.jsx` - Gallery/review screen
- `frontend/src/pages/EventLogViewer.jsx` - Event log viewer
- `frontend/src/App.jsx` - Main app with routing
- `frontend/src/main.jsx` - Entry point

### Phase 16: Docker & Deployment

Create Dockerfiles and deployment configuration.

**Files:**

- `Dockerfile.backend` - Backend container
- `Dockerfile.frontend` - Frontend container
- `docker-compose.prod.yml` - Production compose (optional)

### Phase 17: Documentation

Create README and setup instructions.

**Files:**

- `README.md` - Main documentation
- `SETUP.md` - Detailed setup guide (optional)

## Key Implementation Details

### Backend API Endpoints

- POST /api/photos - Upload photos (multipart/form-data)
- GET /api/photos - List photos (with filters, pagination)
- GET /api/photos/{id} - Get single photo
- PUT /api/photos/{id}/status - Update status
- DELETE /api/photos/{id} - Delete photo
- GET /api/photos/{id}/events - Get photo events
- GET /api/events - List all events (with filters)
- GET /api/photos/status - Polling endpoint (since timestamp)
- WS /ws/photo-status - WebSocket connection

### Processing Flow

1. User uploads photo → API stores in MinIO + PostgreSQL
2. API creates event log (UPLOADED)
3. API pushes job to Redis Stream
4. API creates event log (QUEUED)
5. Worker consumes from Redis Stream
6. Worker updates status to PROCESSING
7. Worker simulates processing (2-5 second delay)
8. Worker updates status to COMPLETED
9. StatusNotifier broadcasts update via WebSocket
10. Frontend receives real-time update

### File Validation

- Client-side: File type, size check before upload
- Server-side: MIME type validation, size limit (10MB), filename sanitization

### Error Handling

- Consistent error response format
- Validation errors with details
- Retry logic for transient failures
- User-friendly error messages

### To-dos

- [x] Create docker-compose.yml with PostgreSQL, Redis, and MinIO services
- [ ] Create MinIO bucket initialization script
- [ ] Set up Spring Boot project structure with Maven (pom.xml) and dependencies
- [ ] Create Photo and EventLog JPA entities with status enum
- [ ] Create Spring Data JPA repositories
- [ ] Create TimeUtil and FileNameUtil utility classes
- [ ] Create DTOs for API requests and responses
- [ ] Implement PhotoService, StorageService, EventLogService, ValidationService, and StatusNotifier
- [ ] Create WebSocket, CORS, Redis, and MinIO configuration classes
- [ ] Create PhotoController, EventLogController, and WebSocketController
- [ ] Create ApiApplication main class with proper configuration
- [ ] Implement StreamConsumer, PhotoProcessor, and WorkerApplication
- [ ] Initialize React + Vite project with Tailwind CSS and dependencies
- [ ] Create API service client with Axios
- [ ] Create useWebSocket and usePhotoStatus custom hooks
- [ ] Build StatusBadge, FileUploader, PhotoGallery, EventTimeline, and ErrorToast components
- [ ] Create UploadPhotos, ProcessingQueue, ReviewPhotos, EventLogViewer pages and App routing
- [ ] Create Dockerfile.backend and Dockerfile.frontend
- [ ] Create comprehensive README.md with setup and usage instructions