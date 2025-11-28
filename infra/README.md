# Infrastructure Setup

This directory contains Docker Compose configuration for local development.

## Services

### PostgreSQL (Port 5432)
- **Database**: `photodb`
- **User**: `postgres`
- **Password**: `postgres`
- **Purpose**: Stores photo metadata and event logs
- **Access**: `localhost:5432`

### Redis (Port 6379)
- **Purpose**: Redis Streams for job queue
- **Persistence**: AOF (Append Only File) enabled
- **Access**: `localhost:6379`

### MinIO (Ports 9000, 9001)
- **API Port**: 9000
- **Console Port**: 9001
- **Access Key**: `minio`
- **Secret Key**: `minio123`
- **Purpose**: S3-compatible object storage for photos
- **Buckets**: `photos` (originals), `thumbnails` (processed)
- **Console**: http://localhost:9001

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Accessing Services

- **PostgreSQL**: Use any PostgreSQL client (pgAdmin, DBeaver, etc.)
  - Host: `localhost`
  - Port: `5432`
  - Database: `photodb`
  - User: `postgres`
  - Password: `postgres`

- **Redis**: Use `redis-cli` or any Redis client
  ```bash
  docker exec -it rapid-photo-flow-redis redis-cli
  ```

- **MinIO Console**: http://localhost:9001
  - Login with `minio` / `minio123`
  - View and manage buckets

## Health Checks

All services have health checks configured. Services will be marked as healthy when ready.

## Network

All services are on the `rapid-photo-flow-network` bridge network, allowing them to communicate using service names:
- `postgres` (instead of localhost)
- `redis` (instead of localhost)
- `minio` (instead of localhost)

## Volumes

Data is persisted in Docker volumes:
- `postgres-data`: Database files
- `redis-data`: Redis persistence
- `minio-data`: Object storage

To remove all data: `docker-compose down -v`

