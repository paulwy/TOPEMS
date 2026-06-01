#!/bin/bash

# TOPEMS Quick Start Script
echo "==================================="
echo "  TOPEMS Quick Start"
echo "==================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker found"

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "Starting services with Docker Compose..."

# Start containers
if [ "$1" = "--build" ]; then
    docker-compose up --build -d
else
    docker-compose up -d
fi

echo ""
echo "Services starting..."
echo ""
echo "Waiting for Postgres to be ready..."
sleep 10

# Check containers status
echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "==================================="
echo "  Services are starting up!"
echo "==================================="
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔐 IAM API: http://localhost:8002"
echo "🐘 Postgres: localhost:5432"
echo "💨 Redis: localhost:6379"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop services: docker-compose down"
echo "Remove data: docker-compose down -v"
echo ""
echo "Enjoy TOPEMS! 🚀"
