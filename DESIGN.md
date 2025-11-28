# ImageStream  

**Fast, scalable, event-driven photo upload + background processing system**

ImageStream is a modern photo-processing pipeline designed to demonstrate clean architecture, async workflows, Redis Stream queues, S3-compatible storage, and end-to-end workflow tracking.

This project is ideal for production workloads AND developer-friendly environments where lightweight local tools (MinIO, Redis, PostgreSQL) replace cloud services.

---

## 🚀 Features

### ✔ 1. Upload photos  

Users upload images through the frontend UI. The API stores metadata in PostgreSQL and the raw file in S3/MinIO.

**File Validation:**
- Supported formats: JPEG, PNG, WebP, GIF
- Maximum file size: 10MB per photo
- Maximum files per batch: 1000 files
- Maximum request size: 5GB (to support 1000 files × 10MB max each)
- Parallel upload processing using CompletableFuture
- Multiple concurrent uploads supported
- Client-side and server-side validation

### ✔ 2. Async background processing  

Instead of processing photos immediately, the API pushes the job into **Redis Streams**.  

A worker service listens to the stream and performs:

- **Processing Simulation**: Adds realistic delays (2-5 seconds) to simulate real-world processing
- **Optional Real Processing** (can be enabled):
  - Resizing (multiple sizes: thumbnail, medium, large)
  - Compression (optimize file size)
  - Tagging (metadata extraction)
  - Watermark (optional)
  - File validation (format, corruption check)
  - Thumbnail creation

### ✔ 3. Event/Workflow Logging  

Every step is saved in `event_log` table:

| event_type     | meaning                          |
|----------------|----------------------------------|
| UPLOADED       | user sent photo to API           |
| QUEUED         | job added to redis stream        |
| PROCESSING     | worker picked and is working     |
| COMPLETED      | worker finished processing       |
| FAILED         | processing failed (with error message) |
| RENAMED        | photo filename was changed       |
| RESTORED       | photo restored from trash        |

This gives **full traceability**.

**Frontend Event Log Viewer:**
- Real-time event timeline for each photo
- Filter by event type and photo ID (supports UUID or short ID)
- Search by photo name/ID (6-character short ID or full UUID)
- Chronological order with timestamps
- Filters positioned on the right side of the heading

### ✔ 4. Real-Time Status Updates

**WebSocket Integration:**
- Frontend connects to `/ws/photo-status` endpoint
- Server pushes status updates when photos change state
- Automatic reconnection on disconnect
- Fallback to polling if WebSocket unavailable

**Polling Fallback:**
- If WebSocket fails, frontend polls `/api/photos/status` every 2 seconds
- Efficient: only fetches changed photos since last poll
- Stops polling when all photos are in terminal states (COMPLETED/FAILED)

### ✔ 5. Clean separation of API vs Worker  

- **ApiApplication** → handles requests, DB, and S3  
- **WorkerApplication** → consumes Redis streams and processes photos  

These run independently and scale independently.

**Worker Configuration:**
- **Concurrent Processing**: 40 photos processed simultaneously (thread pool)
- **Batch Read Size**: Reads up to 40 messages per cycle from Redis Stream
- **Consumer Instance**: `worker-1` in consumer group `workers`
- **Check Interval**: Every 1 second for new messages
- **Pending Message Retry**: Every 30 seconds for failed messages
- **Database Connection Pool**: HikariCP configured with 50 connections to support 40 worker threads + API connections

### ✔ 6. Trash & Soft Delete

**Soft Delete Functionality:**
- Photos are not immediately deleted from the database
- Deleted photos are moved to trash with `deletedAt` timestamp
- Photos in trash can be restored to their original location
- Permanent deletion removes photos from both database and storage
- Trash page displays all deleted photos with restore/permanent delete options

**Trash Management:**
- View all deleted photos in dedicated Trash page
- Restore individual or multiple photos
- Permanently delete photos (cannot be undone)
- Bulk operations for restore and permanent delete
- Photos in trash are excluded from normal photo listings

### ✔ 7. Favorites

**Favorite Photos:**
- Mark photos as favorites using heart icon
- Dedicated Favorites page to view all favorite photos
- Filter favorites by status
- Toggle favorite status from any photo view
- Favorites are preserved even after deletion (until permanent delete)

### ✔ 8. Cloud-ready + Local-ready  

Local development uses:

- PostgreSQL (via pgAdmin)  
- MinIO (S3 emulation)  
- Redis  
- Docker Compose  

Production can use:

- AWS S3  
- AWS ElastiCache Redis  
- RDS PostgreSQL  
- EKS / ECS / EC2  

Zero code changes required.

---

## 📁 Project Structure

```
rapid-photo-flow/

├─ backend/

│  ├─ ApiApplication.java

│  ├─ WorkerApplication.java

│  ├─ controller/

│  │  ├─ PhotoController.java

│  │  ├─ EventLogController.java

│  │  └─ WebSocketController.java

│  ├─ dto/

│  │  ├─ PhotoUploadRequest.java

│  │  ├─ PhotoResponse.java

│  │  ├─ PhotoStatusUpdate.java

│  │  └─ EventLogResponse.java

│  ├─ model/

│  │  ├─ Photo.java

│  │  └─ EventLog.java

│  ├─ repository/

│  │  ├─ PhotoRepository.java

│  │  └─ EventLogRepository.java

│  ├─ service/

│  │  ├─ PhotoService.java

│  │  ├─ StorageService.java

│  │  ├─ EventLogService.java

│  │  ├─ ValidationService.java

│  │  └─ StatusNotifier.java

│  ├─ util/

│  │  ├─ TimeUtil.java

│  │  ├─ FileNameUtil.java

│  │  └─ ShortIdUtil.java

│  ├─ worker/

│  │  ├─ PhotoProcessor.java

│  │  └─ StreamConsumer.java

│  ├─ config/

│  │  ├─ WebSocketConfig.java

│  │  ├─ CorsConfig.java

│  │  └─ RedisConfig.java

│  └─ resources/application.yml

├─ frontend/

│  ├─ pages/

│  │  ├─ UploadPhotos.jsx

│  │  ├─ ProcessingQueue.jsx

│  │  ├─ ReviewPhotos.jsx

│  │  ├─ Favorites.jsx

│  │  ├─ Trash.jsx

│  │  ├─ PhotoDetail.jsx

│  │  └─ EventLogViewer.jsx

│  ├─ components/

│  │  ├─ PhotoGallery.jsx

│  │  ├─ StatusBadge.jsx

│  │  ├─ FileUploader.jsx

│  │  ├─ EventTimeline.jsx

│  │  └─ ErrorToast.jsx

│  ├─ hooks/

│  │  ├─ useWebSocket.js

│  │  └─ usePhotoStatus.js

│  ├─ services/

│  │  └─ api.js

│  └─ main.jsx

├─ infra/

│  └─ docker-compose.yml

├─ Dockerfile.backend

├─ Dockerfile.frontend

└─ README.md

```

---

## 🏗️ Backend Services & Utilities

### Services

#### StatusNotifier Service
**Purpose**: Centralized WebSocket broadcasting service to keep controllers clean and maintain separation of concerns.

**Responsibilities**:
- Broadcast photo status updates to all connected WebSocket clients
- Send updates to specific photo subscribers (`/topic/photo-status/{photoId}`)
- Send updates to all subscribers (`/topic/photo-status/all`)
- Handle WebSocket connection state management
- Provide fallback mechanism if WebSocket is unavailable

**Usage**:
- Called by `PhotoService` when photo status changes
- Called by `WorkerApplication` when processing completes
- Controllers remain thin - they delegate to services, services notify via StatusNotifier

**Benefits**:
- Single responsibility: controllers handle HTTP, StatusNotifier handles WebSocket
- Easier testing: mock StatusNotifier in unit tests
- Reusable: any service can broadcast status updates
- Cleaner architecture: follows dependency injection principles

### Utilities

#### TimeUtil.java
**Purpose**: Centralized time/date utilities for consistent timestamp handling across the application.

**Functions**:
- `formatTimestamp(LocalDateTime)`: Format timestamps for API responses (ISO 8601)
- `getCurrentTimestamp()`: Get current timestamp in UTC
- `isAfter(LocalDateTime, LocalDateTime)`: Compare timestamps
- `addSeconds(LocalDateTime, int)`: Add seconds for processing simulation delays
- `formatDuration(Duration)`: Format duration for display (e.g., "2m 30s")
- `parseTimestamp(String)`: Parse ISO 8601 strings to LocalDateTime

**Benefits**:
- Consistent time formatting across all endpoints
- UTC handling to avoid timezone issues
- Reusable date/time operations
- Easy to mock in tests

#### FileNameUtil.java
**Purpose**: File name sanitization and generation utilities for secure file handling.

**Functions**:
- `sanitizeFileName(String)`: Remove dangerous characters, prevent path traversal
- `generateUniqueFileName(String)`: Generate UUID-based unique filename while preserving extension
- `getFileExtension(String)`: Extract file extension safely
- `isValidFileName(String)`: Validate filename format and length
- `normalizeFileName(String)`: Normalize filename (trim, lowercase, replace spaces)

**Security Features**:
- Prevents path traversal attacks (`../`, `..\\`)
- Removes special characters that could cause issues
- Enforces filename length limits (max 255 characters)
- Validates against reserved filenames (Windows/Linux)

**Benefits**:
- Security: prevents file system attacks
- Consistency: all filenames follow same rules
- Uniqueness: prevents filename collisions
- Reusable: single source of truth for filename handling

#### ShortIdUtil.java
**Purpose**: Generate short, human-readable photo IDs from UUIDs.

**Functions**:
- `generateShortId(UUID)`: Generate 6-character alphanumeric ID from UUID
- `isValidShortId(String)`: Validate short ID format

**Features**:
- 6-character alphanumeric IDs (e.g., "A3x9K2")
- Derived from UUID for uniqueness
- Human-readable and easy to share
- Used in UI for better user experience

**Benefits**:
- Better UX: shorter IDs than full UUIDs
- Shareable: easy to communicate photo IDs
- Unique: derived from UUID ensures uniqueness

---

## 🔧 Tech Stack

### Backend (Java + Spring Boot)

- Spring Web  
- Spring Data JPA  
- Spring WebSocket (STOMP)
- Redis Streams  
- PostgreSQL (with HikariCP connection pooling)
- MinIO / S3  
- Lombok  
- Bean Validation (JSR-303)
- HikariCP (default connection pool, configured for high concurrency)

### Frontend (React + Vite)

- React  
- Tailwind CSS
- Axios  
- React Router DOM
- SockJS + STOMP.js (for WebSocket)
- Google Fonts (Barlow font family)

### Infrastructure

- Docker Compose  
- Redis  
- PostgreSQL  
- MinIO  

---

## 🧱 Why we choose these technologies?

### **Redis Streams > SQS / RabbitMQ / Kafka**

| Feature | Redis Streams | SQS | Kafka |
|--------|---------------|-----|-------|
| Fast | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Local development | Easy | Hard | Hard |
| No cloud dependency | Yes | No | No |
| Easy consumer groups | Yes | No | Yes |

Redis Streams gives:

- persistent event log  
- auto consumer groups  
- replay support  
- extremely fast (sub-millisecond)  
- perfect for local + prod  

### **MinIO instead of AWS S3 (LOCALLY)**  

MinIO works 100% like S3:

- same API  
- same SDK  
- same buckets  
- runs locally → no AWS required  

So developers can test the entire pipeline without cloud cost.

### **PostgreSQL instead of DynamoDB (Because local is simple)**  

- SQL is easier  
- pgAdmin is easy  
- perfect for workflow logs  
- strong consistency  
- widely supported  

### **Two-Application Backend (API + Worker)**  

This separation gives:

- independent scaling  
- cleaner architecture  
- event-driven pattern  
- real-world microservice style  

### **WebSocket for Real-Time Updates**

- Low latency status updates
- Reduces server load (no constant polling)
- Better user experience
- Automatic fallback to polling ensures reliability

---

## 📦 Running locally

### 1. Start all services

```
docker-compose up -d
```

Services started:

- http://localhost:9000 → MinIO  
- http://localhost:5432 → PostgreSQL  
- http://localhost:6379 → Redis  
- http://localhost:8080 → Backend API  
- http://localhost:5173 → Frontend UI  

### 2. Open pgAdmin  

Connect to PostgreSQL:

- user: postgres  
- pass: postgres  
- DB: photodb  

### 3. Open MinIO console  

Login:

- user: minio  
- pass: minio123  

---

## 📝 API Endpoints

### Photo Management

#### Upload Photo(s)
```
POST /api/photos
Content-Type: multipart/form-data

Request:
- files: File[] (multiple files allowed)
- metadata (optional): JSON string with title, description, etc.

Response: 201 Created
{
  "photos": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "status": "UPLOADED",
      "uploadedAt": "2025-11-XX...",
      "size": 1024000
    }
  ]
}

Validation Errors: 400 Bad Request
{
  "error": "VALIDATION_ERROR",
  "message": "File validation failed",
  "details": [
    {
      "filename": "photo.pdf",
      "error": "Unsupported file type. Only JPEG, PNG, WebP, GIF allowed."
    },
    {
      "filename": "large.jpg",
      "error": "File size exceeds 10MB limit."
    }
  ]
}
```

#### List All Photos
```
GET /api/photos?status=PROCESSING&page=0&size=20&sort=uploadedAt,desc

Query Parameters:
- status (optional): Filter by status (UPLOADED, QUEUED, PROCESSING, COMPLETED, FAILED)
- page (optional): Page number (default: 0)
- size (optional): Page size (default: 20)
- sort (optional): Sort field and direction (default: uploadedAt,desc)

Response: 200 OK
{
  "content": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "status": "PROCESSING",
      "uploadedAt": "2025-11-XX...",
      "processedAt": null,
      "size": 1024000,
      "thumbnailUrl": "http://localhost:9000/thumbnails/photo_thumb.jpg",
      "originalUrl": "http://localhost:9000/photos/photo.jpg"
    }
  ],
  "totalElements": 50,
  "totalPages": 3,
  "page": 0,
  "size": 20
}
```

#### Get Single Photo
```
GET /api/photos/{id}

Response: 200 OK
{
  "id": "uuid",
  "filename": "photo.jpg",
  "status": "COMPLETED",
  "uploadedAt": "2025-11-XX...",
  "processedAt": "2025-11-XX...",
  "size": 1024000,
  "thumbnailUrl": "http://localhost:9000/thumbnails/photo_thumb.jpg",
  "originalUrl": "http://localhost:9000/photos/photo.jpg",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "JPEG"
  }
}

Not Found: 404
{
  "error": "NOT_FOUND",
  "message": "Photo with id {id} not found"
}
```

#### Update Photo Status (Internal/Admin)
```
PUT /api/photos/{id}/status

Request:
{
  "status": "PROCESSING",
  "message": "Started processing"
}

Response: 200 OK
{
  "id": "uuid",
  "status": "PROCESSING",
  "updatedAt": "2025-11-XX..."
}
```

#### Delete Photo (Soft Delete - Move to Trash)
```
DELETE /api/photos/{id}

Response: 204 No Content

Not Found: 404
{
  "error": "NOT_FOUND",
  "message": "Photo with id {id} not found"
}
```

#### Bulk Delete Photos (Soft Delete - Move to Trash)
```
POST /api/photos/bulk-delete
Content-Type: application/json

Request:
["uuid1", "uuid2", "uuid3"]

Response: 204 No Content

Bad Request: 400 (if empty array)
```

#### Get Trash Photos
```
GET /api/photos/trash?page=0&size=25&sort=deletedAt,desc

Query Parameters:
- page (optional): Page number (default: 0)
- size (optional): Page size (default: 25)
- sort (optional): Sort field and direction (default: deletedAt,desc)

Response: 200 OK
{
  "content": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "status": "COMPLETED",
      "deletedAt": "2025-11-XX...",
      "uploadedAt": "2025-11-XX...",
      "size": 1024000,
      "thumbnailUrl": "http://localhost:9000/thumbnails/photo_thumb.jpg",
      "originalUrl": "http://localhost:9000/photos/photo.jpg"
    }
  ],
  "totalElements": 10,
  "totalPages": 1,
  "page": 0,
  "size": 25
}
```

#### Restore Photo from Trash
```
POST /api/photos/{id}/restore

Response: 200 OK
{
  "id": "uuid",
  "filename": "photo.jpg",
  "status": "COMPLETED",
  "deletedAt": null,
  ...
}

Not Found: 404
{
  "error": "NOT_FOUND",
  "message": "Photo with id {id} not found"
}
```

#### Bulk Restore Photos
```
POST /api/photos/bulk-restore
Content-Type: application/json

Request:
["uuid1", "uuid2", "uuid3"]

Response: 204 No Content
```

#### Permanently Delete Photo
```
DELETE /api/photos/{id}/permanent

Response: 204 No Content

Not Found: 404
{
  "error": "NOT_FOUND",
  "message": "Photo with id {id} not found"
}
```

#### Bulk Permanently Delete Photos
```
POST /api/photos/bulk-permanent-delete
Content-Type: application/json

Request:
["uuid1", "uuid2", "uuid3"]

Response: 204 No Content
```

#### Toggle Favorite Status
```
PUT /api/photos/{id}/favorite

Request:
{
  "favorite": true
}

Response: 200 OK
{
  "id": "uuid",
  "favorite": true,
  ...
}
```

#### Get Favorite Photos
```
GET /api/photos/favorites?status=COMPLETED&page=0&size=20&sort=uploadedAt,desc

Query Parameters:
- status (optional): Filter by status
- page (optional): Page number (default: 0)
- size (optional): Page size (default: 20)
- sort (optional): Sort field and direction (default: uploadedAt,desc)

Response: 200 OK
{
  "content": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      "favorite": true,
      "status": "COMPLETED",
      ...
    }
  ],
  "totalElements": 15,
  "totalPages": 1
}
```

#### Rename Photo
```
PUT /api/photos/{id}/rename

Request:
{
  "filename": "new-name.jpg"
}

Response: 200 OK
{
  "id": "uuid",
  "filename": "new-name.jpg",
  ...
}
```

### Event Log

#### Get Event Log for Photo
```
GET /api/photos/{id}/events

Response: 200 OK
{
  "photoId": "uuid",
  "events": [
    {
      "id": "event-uuid",
      "eventType": "UPLOADED",
      "timestamp": "2025-11-XX...",
      "message": "Photo uploaded successfully",
      "metadata": {}
    },
    {
      "id": "event-uuid",
      "eventType": "QUEUED",
      "timestamp": "2025-11-XX...",
      "message": "Added to processing queue",
      "metadata": { "queuePosition": 3 }
    }
  ]
}
```

#### Get All Events (with filters)
```
GET /api/events?photoId={id}&eventType=PROCESSING&page=0&size=50

Query Parameters:
- photoId (optional): Filter by photo ID
- eventType (optional): Filter by event type
- page (optional): Page number
- size (optional): Page size
- sort (optional): Sort field (default: timestamp,desc)

Response: 200 OK
{
  "content": [
    {
      "id": "event-uuid",
      "photoId": "uuid",
      "eventType": "UPLOADED",
      "timestamp": "2025-11-XX...",
      "message": "Photo uploaded successfully"
    }
  ],
  "totalElements": 100,
  "totalPages": 2
}
```

### WebSocket

#### Connect to Status Updates
```
WS /ws/photo-status

Subscribe to: /topic/photo-status/{photoId}
Subscribe to: /topic/photo-status/all (for all photos)

Message Format (Server → Client):
{
  "photoId": "uuid",
  "status": "PROCESSING",
  "timestamp": "2025-11-XX...",
  "message": "Processing started"
}

Client can send:
{
  "action": "subscribe",
  "photoIds": ["uuid1", "uuid2"] // optional, empty = all
}
```

### Status Polling (Fallback)
```
GET /api/photos/status?since={timestamp}&photoIds={id1,id2}

Query Parameters:
- since (optional): Only return photos updated after this timestamp (ISO 8601)
- photoIds (optional): Comma-separated list of photo IDs to check

Response: 200 OK
{
  "updatedPhotos": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "updatedAt": "2025-11-XX..."
    }
  ],
  "timestamp": "2025-11-XX..." // Use this as 'since' in next poll
}
```

---

## 🧪 Monitoring the workflow

### Redis stream  

```
XRANGE photo_stream - +
```

### Event Log  

```
SELECT * FROM event_log ORDER BY timestamp DESC;
```

### WebSocket Connection Status

Check browser DevTools → Network → WS tab to verify WebSocket connection.

---

## 🎨 Frontend Screens & UI Design

### UI Theme & Styling

**Consistent Design System:**
- **Purple Gradient Theme**: Applied across navigation, buttons, and interactive elements
- **Dropdown Styling**: All `<select>` dropdowns use:
  - Rounded corners (`rounded-xl`)
  - Purple gradient backgrounds
  - Custom SVG arrow icons
  - Shadow effects
  - Hover states with dark purple gradient
  - Selected state with light purple gradient
  - Custom CSS overrides for browser default blue colors
- **Status Badges**: 
  - Compact design with full status word displayed
  - Smaller text size (`text-[10px]`) for better fit
  - Color-coded by status
  - Icon indicators
  - Half card width in grid view
- **Empty States**: 
  - Styled cards with white background, shadows, and borders
  - Large icons (20x20) in gray
  - Title and description text
  - Consistent across all pages
- **Pagination**: 
  - Purple-themed buttons with gradient hover effects
  - Rounded corners and shadows
  - Disabled states with reduced opacity
- **Loading Spinners**: 
  - Purple-themed animated spinners
  - Consistent size and styling
- **Dynamic Dropdown Positioning**: 
  - Three-dots menu opens on right by default
  - Automatically moves to left if insufficient space on right
  - Works in both grid and list views
  - Prevents horizontal scrolling

## 🎨 Frontend Screens

### Navigation
- **Left Sidebar Navigation** (purple gradient theme):
  - Fixed sidebar on left (224px width, ~10% reduced scale)
  - ImageStream logo at top
  - Navigation items: Upload, Queue, Review, Favorites, Trash, Events
  - Active state with purple background
  - Hover effects
  - Copyright footer at bottom
- **Barlow Font**: Google Fonts integration across entire application
- All pages use consistent `max-w-7xl` container width
- **Consistent UI Theme**: All dropdowns use purple gradient theme with custom styling

### 1. Upload Photos Screen
- Drag-and-drop file upload area
- Multiple file selection support (up to 1000 files)
- File validation feedback (before upload)
- Loading spinner during upload
- Success/error toasts
- Preview thumbnails after upload

### 2. Processing Queue Screen
- Real-time list of photos being processed
- Status badges (color-coded)
- Table view with photo name, status, size, upload time
- WebSocket connection status indicator:
  - "WebSocket Connected" / "WebSocket Disconnected"
  - Green/red dot indicator
- Auto-refresh via WebSocket/polling
- Shows only QUEUED and PROCESSING photos

### 3. Review Photos Screen
- **Square photo cards** in 3-column grid layout
- **Three-dots menu** (top-right) on each photo card for actions:
  - Photo ID display (6-character short ID)
  - Download options (Original/Thumbnail with quality selection)
  - Rename photo
  - Share link
  - Delete action (moves to trash)
- **Heart icon** for favoriting photos (before three-dots menu)
- Photo name displayed at bottom of card
- Filter by status positioned on right side of heading
- View toggle (Grid/List) with styled dropdown
- Pagination controls at bottom (Previous/Next with purple theme)
- **Multi-select mode** with bulk operations:
  - Select Photos button to enter selection mode
  - Checkboxes on photos when in selection mode
  - Select All / Deselect All (per-page selection)
  - Bulk delete selected photos (moves to trash)
  - Bulk download selected photos
- Click photo to view full details page
- **Status badges** on each thumbnail (bottom-right, half card width):
  - Shows full status word with smaller text
  - Color-coded by status
  - Compact design with icon
- **Dynamic dropdown positioning**: Three-dots menu opens on right by default, moves to left if insufficient space
- **Empty state**: Styled card with icon, title, and description
- Scroll to top on pagination

### 4. Favorites Screen
- Similar layout to Review Photos screen
- Displays only photos marked as favorites
- Filter by status dropdown
- View toggle (Grid/List)
- All standard photo actions available (rename, download, delete, etc.)
- Heart icon shows filled state for favorites
- **Empty state**: Styled card with heart icon, "No favorite photos yet" message
- Pagination controls with purple theme

### 5. Trash Screen
- Displays all deleted photos (soft delete)
- Similar layout to Review Photos screen
- Filter by status dropdown
- View toggle (Grid/List)
- **Trash-specific actions**:
  - Restore photo (single or bulk)
  - Permanently delete photo (single or bulk, cannot be undone)
  - Rename (allowed in trash)
- Three-dots menu shows only Restore and Permanently Delete options
- Bulk action buttons: Restore Selected and Permanently Delete Selected
- Bulk action buttons disabled when no photos selected
- **Empty state**: Styled card with trash icon, "Trash is empty" message
- Pagination controls with purple theme

### 6. Photo Detail Screen
- Full-screen photo view with metadata
- **Left section**: Large photo display with fullscreen preview
- **Right section**: Photo information and event timeline
- **Fullscreen modal**:
  - Renders using React Portal to prevent re-render issues
  - Full viewport coverage with dark background
  - Image centered and scaled to fit viewport
  - Bottom info bar with photo name and metadata (compact design)
  - Click outside image to close
- Event timeline shows all events chronologically
- Status badge display
- Download options
- Navigation back to gallery

### 7. Event Log Viewer Screen
- Timeline view of all events
- Filters positioned on right side of heading:
  - Photo ID input (supports UUID or 6-character short ID)
  - Event Type dropdown
- Chronological order (newest first)
- Expandable event details
- Export to CSV (optional)

---

## ⚠️ Error Handling

### Backend Error Responses

All errors follow consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "timestamp": "2025-11-XX...",
  "path": "/api/photos",
  "details": {} // Optional additional context
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): File validation failed
- `FILE_TOO_LARGE` (400): Exceeds size limit
- `UNSUPPORTED_FORMAT` (400): Invalid file type
- `NOT_FOUND` (404): Photo/Resource not found
- `STORAGE_ERROR` (500): S3/MinIO operation failed
- `PROCESSING_ERROR` (500): Worker processing failed
- `DATABASE_ERROR` (500): Database operation failed

### Frontend Error Handling

- **Toast Notifications**: Show error messages to user
- **Retry Logic**: Automatic retry for transient errors (network, 5xx)
- **Error Boundaries**: React error boundaries for component-level errors
- **Loading States**: Show spinners during operations (purple-themed spinners)
- **Offline Detection**: Detect network issues and show message
- **Empty States**: Styled empty state cards with icons and descriptive messages
- **Optimistic Locking**: Handled gracefully with retry logic for concurrent updates

### Validation Rules

**File Upload:**
- Max file size: 10MB per file
- Allowed types: image/jpeg, image/png, image/webp, image/gif
- Max files per batch: 1000 files
- Max request size: 5GB (to support 1000 files × 10MB max each)
- Filename length: max 255 characters
- Parallel upload processing for better performance

**API Requests:**
- Request timeout: 30 seconds
- Retry attempts: 3 (with exponential backoff)
- Rate limiting: 100 requests/minute per IP (optional)

---

## 📌 Roadmap (Future Enhancements)

- AI tagging with Vision API  
- Smart duplicate detection  
- Video support  
- Parallel worker scaling  
- Background retry queue  
- WebSocket live status updates (✅ Implemented)
- Batch operations (delete multiple, reprocess) (✅ Bulk delete implemented)
- Short photo IDs (✅ 6-character IDs implemented)
- Multi-select and bulk operations (✅ Implemented)
- Trash and soft delete functionality (✅ Implemented)
- Favorites feature (✅ Implemented)
- Photo renaming (✅ Implemented)
- Photo detail page with fullscreen preview (✅ Implemented)
- Dynamic dropdown positioning (✅ Implemented)
- Consistent UI theme across all components (✅ Implemented)
- Photo metadata editing (title, description, tags)
- Advanced filtering and search
- Export event logs to CSV/JSON

---

## 🏁 Summary

ImageStream is a clean, modern, scalable photo-processing pipeline using:

- event-driven design  
- Redis Streams  
- S3-compatible storage  
- microservice-style worker  
- PostgreSQL workflow-logging  
- decoupled backend + frontend  
- real-time WebSocket updates (via StatusNotifier service)
- comprehensive error handling
- file validation and security (via FileNameUtil)
- gallery with filtering and search
- clean service layer architecture (StatusNotifier, utility classes)
- **Parallel processing**: 40 concurrent photo processing threads (2x improvement from 20)
- **Database connection pooling**: HikariCP configured for high concurrency (50 connections)
- **Batch processing**: Reads up to 40 messages per cycle from Redis Stream

You can run everything locally and deploy to cloud without any architectural change.

---

# 🖼 Architecture Diagram

```
                         ┌──────────────────┐
                         │     Frontend      │
                         │   (React + Vite)  │
                         │  WebSocket Client │
                         └─────────┬────────┘
                                   │
                         ┌─────────┴────────┐
                         │   HTTP + WS      │
                         └─────────┬────────┘
                                   │
                         ┌─────────▼────────┐
                         │   API Service     │
                         │ (Spring Boot)     │
                         │  WebSocket Server │
                         │ StatusNotifier    │
                         └───────┬──────────┘
               ┌────────────────┼────────────────────┐
               │                │                    │
               ▼                ▼                    ▼
     ┌────────────────┐  ┌───────────────┐  ┌───────────────────┐
     │  PostgreSQL     │  │   Redis       │  │   MinIO / S3       │
     │ (metadata +     │  │  Streams      │  │ (image storage)    │
     │ event_log)       │  │ job queue     │  └───────────────────┘
     └────────────────┘  └───────────────┘
                                   │
                                   │ XREADGROUP
                                   ▼
                         ┌──────────────────┐
                         │ Worker Service    │
                         │ (Spring Boot)     │
                         │ Stream Consumer   │
                         └─────────┬────────┘
                                   │
                         ┌─────────▼────────┐
                         │ Process & Update  │
                         │ (DB + S3 + WS)    │
                         └──────────────────┘
```

---

## 🔐 Security Considerations

- File type validation (MIME type + extension)
- File size limits enforced
- CORS configured for frontend origin only
- Input sanitization for filenames
- SQL injection prevention (JPA parameterized queries)
- XSS prevention (React auto-escaping)
- Rate limiting (optional, for production)

---

## 🔌 Database Connection Pool Configuration

### HikariCP Settings

**Why Connection Pooling?**
- Worker threads need database connections for status updates, event logging
- Without proper pool sizing, threads wait for available connections (bottleneck)
- Connection pooling reuses connections efficiently, reducing overhead

**Configuration:**
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50  # Support 40 worker threads + API connections
      minimum-idle: 10        # Keep 10 connections ready (warm pool)
      connection-timeout: 30000  # Wait 30 seconds if pool is full
```

**Pool Size Calculation:**
- 40 worker threads (processing photos concurrently)
- ~10 API connections (for REST endpoints)
- Total: 50 connections ensures no waiting

**Performance Impact:**
- **With 20 threads**: Default pool (10) was sufficient (not all threads access DB simultaneously)
- **With 40 threads**: Explicit pool (50) prevents connection contention and improves throughput

**Why We Didn't Need It Before:**
- Spring Boot's default HikariCP pool size is 10 connections
- With 20 processing threads, the default pool was adequate because:
  - Not all 20 threads access the database at the exact same moment
  - Processing includes delays (2-5 seconds), so connections are released quickly
  - Connections are efficiently reused

**Why We Need It Now:**
- With 40 threads, more threads can request connections simultaneously
- Default pool of 10 becomes a bottleneck
- Threads would wait for available connections, reducing throughput
- Explicit configuration ensures optimal performance

---

## 📊 Database Schema

### Photo Table
```sql
CREATE TABLE photo (
    id UUID PRIMARY KEY,
    short_id VARCHAR(10) UNIQUE,  -- 6-character alphanumeric short ID
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(50),
    storage_path VARCHAR(500),
    thumbnail_path VARCHAR(500),
    metadata JSONB,
    favorite BOOLEAN DEFAULT FALSE,  -- Favorite flag
    deleted_at TIMESTAMP,  -- Soft delete timestamp (NULL = not deleted)
    uploaded_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_photo_status ON photo(status);
CREATE INDEX idx_photo_uploaded_at ON photo(uploaded_at DESC);
CREATE INDEX idx_photo_short_id ON photo(short_id);
CREATE INDEX idx_photo_favorite ON photo(favorite) WHERE favorite = TRUE;
CREATE INDEX idx_photo_deleted_at ON photo(deleted_at);
```

### Event Log Table
```sql
CREATE TABLE event_log (
    id UUID PRIMARY KEY,
    photo_id UUID REFERENCES photo(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_log_photo_id ON event_log(photo_id);
CREATE INDEX idx_event_log_timestamp ON event_log(timestamp DESC);
CREATE INDEX idx_event_log_event_type ON event_log(event_type);
```

---

If you want, I can also generate:

✅ complete backend code  

✅ complete frontend React pages  

✅ complete docker-compose  

✅ infrastructure diagram  

✅ explanation for judges  

Just tell me **"Generate full code"**.

