#!/bin/bash

# TOPEMS 项目停止脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/infrastructure/docker"

cd "$DOCKER_DIR"

echo "🛑 停止 TOPEMS 服务..."
docker-compose down

echo "✅ 服务已停止！"
