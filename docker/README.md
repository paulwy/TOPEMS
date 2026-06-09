# TOPEMS Docker Infrastructure

This directory contains the Docker configuration for running the TOPEMS infrastructure services.

## Services

- **PostgreSQL**: Primary database (port 5432)
- **Redis**: Cache and message broker (port 6379)

## Quick Start

```bash
cd docker

# Copy environment example
cp .env.example .env

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Environment Variables

Copy `.env.example` to `.env` and modify as needed:

- `POSTGRES_USER`: Database username (default: topems)
- `POSTGRES_PASSWORD`: Database password (default: topems_secret)
- `POSTGRES_DB`: Database name (default: topems)
- `POSTGRES_PORT`: Host port for PostgreSQL (default: 5432)
- `REDIS_PORT`: Host port for Redis (default: 6379)

## Volumes

- `postgres_data`: Persistent PostgreSQL data
- `redis_data`: Persistent Redis data

## Building Service Images

Use the root `Dockerfile` to build individual service images:

```bash
# Build IAM service
docker build --build-arg SERVICE_PATH=services/topems-iam/backend --build-arg SERVICE_PORT=8000 --build-arg SERVICE_NAME=topems-iam -t topems-iam:latest .

# Build ERP service
docker build --build-arg SERVICE_PATH=services/topems-erp/backend --build-arg SERVICE_PORT=8010 --build-arg SERVICE_NAME=topems-erp -t topems-erp:latest .
```
