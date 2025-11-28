# ImageStream

**Fast, scalable, event-driven photo upload + background processing system**

ImageStream is a modern photo-processing pipeline designed to demonstrate clean architecture, async workflows, Redis Stream queues, S3-compatible storage, and end-to-end workflow tracking.

## 🚀 Features

- ✅ **Upload Multiple Photos** - Concurrent upload with validation
- ✅ **Async Background Processing** - Redis Stream-based job queue
- ✅ **Real-Time Status Updates** - WebSocket for instant notifications
- ✅ **Event/Workflow Logging** - Full traceability of processing lifecycle
- ✅ **Modern UI** - React + Vite with Tailwind CSS
- ✅ **Cloud-Ready** - Works locally and in production (AWS S3, ElastiCache, RDS)

## 📋 Prerequisites

- **Java 17+** (for backend)
- **Node.js 20+** (for frontend)
- **Maven 3.9+** (for backend build)
- **Docker & Docker Compose** (for infrastructure services)
- **PostgreSQL** (via Docker)
- **Redis** (via Docker)
- **MinIO** (via Docker)

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │  React + Vite (Port 5173)
│  (React)    │
└──────┬──────┘
       │ HTTP + WebSocket
       ▼
┌─────────────┐
│  API Server │  Spring Boot (Port 8080)
│ (REST API)  │
└──────┬──────┘
       │
   ┌───┴───┬──────────┬──────────┐
   ▼       ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌─────────┐
│PostgreSQL│ │Redis│ │MinIO│ │WebSocket│
│ (5432)  │ │(6379)│ │(9000)│ │  Server │
└──────┘ └──────┘ └──────┘ └─────────┘
       │
       │ Redis Stream
       ▼
┌─────────────┐
│   Worker    │  Spring Boot (No HTTP)
│  (Consumer) │
└─────────────┘
```

## 🚀 Quick Start

### 1. Start Infrastructure Services

```bash
cd infra
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **MinIO** on ports 9000 (API) and 9001 (Console)

**Access MinIO Console:**
- URL: http://localhost:9001
- Username: `minio`
- Password: `minio123`

### 2. Start Backend API

```bash
cd backend
mvn spring-boot:run
```

Or run the JAR:
```bash
mvn clean package
java -jar target/rapid-photo-flow-1.0.0.jar
```

API will be available at: http://localhost:8080

### 3. Start Backend Worker

In a **separate terminal**:

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.main-class=com.rapidphotoflow.WorkerApplication
```

Or with profile:
```bash
java -jar target/rapid-photo-flow-1.0.0.jar --spring.profiles.active=worker
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

## 📁 Project Structure

```
rapid-photo-flow/
├── backend/                 # Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rapidphotoflow/
│   │   │   │   ├── ApiApplication.java
│   │   │   │   ├── WorkerApplication.java
│   │   │   │   ├── controller/      # REST controllers
│   │   │   │   ├── service/         # Business logic
│   │   │   │   ├── repository/     # Data access
│   │   │   │   ├── model/           # JPA entities
│   │   │   │   ├── dto/             # Data transfer objects
│   │   │   │   ├── worker/          # Redis Stream consumer
│   │   │   │   ├── config/          # Configuration
│   │   │   │   └── util/            # Utilities
│   │   │   └── resources/
│   │   │       └── application.yml
│   │   └── test/
│   └── pom.xml
│
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/      # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── infra/                  # Infrastructure
│   └── docker-compose.yml  # PostgreSQL, Redis, MinIO
│
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## 🔧 Configuration

### Backend Configuration

Edit `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/photodb
    username: postgres
    password: postgres
  
  data:
    redis:
      host: localhost
      port: 6379

minio:
  endpoint: http://localhost:9000
  access-key: minio
  secret-key: minio123
```

### Frontend Configuration

Edit `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8080/api';
```

Or use environment variable:
```bash
VITE_API_URL=http://localhost:8080/api npm run dev
```

## 📝 API Endpoints

### Photo Management

- `POST /api/photos` - Upload photos (multipart/form-data)
- `GET /api/photos` - List photos (with filters, pagination)
- `GET /api/photos/{id}` - Get single photo
- `PUT /api/photos/{id}/status` - Update status
- `DELETE /api/photos/{id}` - Delete photo
- `GET /api/photos/status` - Poll for status updates
- `GET /api/photos/{id}/events` - Get photo events

### Event Log

- `GET /api/events` - List all events (with filters)
- `GET /api/events/by-photo/{photoId}` - Get events for photo

### WebSocket

- `WS /ws/photo-status` - WebSocket endpoint
- Subscribe to `/topic/photo-status/all` for all updates
- Subscribe to `/topic/photo-status/{id}` for specific photo

## 🐳 Docker Deployment

### Build Images

```bash
# Build backend
docker build -f Dockerfile.backend -t rapid-photo-flow-backend .

# Build frontend
docker build -f Dockerfile.frontend -t rapid-photo-flow-frontend .
```

### Run with Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  postgres:
    # ... (same as infra/docker-compose.yml)
  
  redis:
    # ... (same as infra/docker-compose.yml)
  
  minio:
    # ... (same as infra/docker-compose.yml)
  
  backend-api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/photodb
      - SPRING_DATA_REDIS_HOST=redis
      - MINIO_ENDPOINT=http://minio:9000
  
  backend-worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
    depends_on:
      - postgres
      - redis
      - minio
    command: ["java", "-jar", "app.jar", "--spring.profiles.active=worker"]
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/photodb
      - SPRING_DATA_REDIS_HOST=redis
  
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend-api
```

Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

### Test Photo Upload

1. Open http://localhost:5173
2. Click "Upload" tab
3. Drag and drop photos or click to browse
4. Photos will appear in "Queue" tab
5. Watch real-time status updates
6. View processed photos in "Review" tab

### Test API Directly

```bash
# Upload photo
curl -X POST http://localhost:8080/api/photos \
  -F "files=@photo.jpg"

# List photos
curl http://localhost:8080/api/photos

# Get photo events
curl http://localhost:8080/api/photos/{id}/events
```

## 📊 Monitoring

### Check Redis Stream

```bash
docker exec -it rapid-photo-flow-redis redis-cli
> XRANGE photo_stream - +
```

### Check Database

```bash
# Connect to PostgreSQL
docker exec -it rapid-photo-flow-postgres psql -U postgres -d photodb

# View photos
SELECT * FROM photo ORDER BY uploaded_at DESC;

# View events
SELECT * FROM event_log ORDER BY timestamp DESC;
```

### Check MinIO

- Console: http://localhost:9001
- Login: `minio` / `minio123`
- View buckets: `photos`, `thumbnails`

## 🔍 Troubleshooting

### Backend won't start

- Check PostgreSQL is running: `docker ps`
- Check port 8080 is available
- Check logs: `mvn spring-boot:run` or check Docker logs

### Worker not processing

- Check Redis is running: `docker ps`
- Check Redis Stream has messages: `XRANGE photo_stream - +`
- Check worker logs for errors

### Frontend can't connect

- Check backend is running on port 8080
- Check CORS configuration in `CorsConfig.java`
- Check browser console for errors

### WebSocket not working

- Check WebSocket endpoint: `ws://localhost:8080/ws/photo-status`
- Check browser console for connection errors
- Frontend will fallback to polling if WebSocket fails

## 🛠️ Development

### Backend Development

```bash
cd backend
mvn spring-boot:run
```

Hot reload enabled with Spring Boot DevTools.

### Frontend Development

```bash
cd frontend
npm run dev
```

Hot reload enabled by Vite.

### Database Migrations

JPA auto-creates tables on startup (`ddl-auto: update`).

For production, use Flyway or Liquibase.

## 📚 Technology Stack

### Backend
- **Spring Boot 3.2.0** - Framework
- **Spring Data JPA** - Database access
- **Spring WebSocket** - Real-time updates
- **PostgreSQL** - Database
- **Redis** - Streams/Queue
- **MinIO** - S3-compatible storage
- **Lombok** - Boilerplate reduction
- **Maven** - Build tool

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **SockJS + STOMP** - WebSocket client
- **React Router** - Routing

### Infrastructure
- **Docker Compose** - Service orchestration
- **PostgreSQL 15** - Database
- **Redis 7** - Cache/Queue
- **MinIO** - Object storage

## 🎯 Key Features Explained

### Event-Driven Architecture

- API uploads photo → Queues to Redis Stream
- Worker consumes from stream → Processes photo
- Status updates broadcast via WebSocket
- Frontend receives real-time updates

### Processing Simulation

Worker simulates processing with realistic delays:
- File validation (0.5-1s)
- Metadata extraction (0.5-1s)
- Thumbnail creation (1-2s)
- Image optimization (0.5-1s)
- Total: 2.5-5 seconds

### Real-Time Updates

- **Primary**: WebSocket for instant updates
- **Fallback**: Polling every 2 seconds if WebSocket fails
- Automatic reconnection on disconnect

## 📝 License

This project is created for the TeamFront AI Hackathon challenge.

## 👥 Contributors

Built with AI assistance (ChatGPT + Cursor) as per hackathon requirements.

---

**Happy Coding! 🚀**

