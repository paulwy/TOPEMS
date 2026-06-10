#!/bin/bash

# TOPEMS 快速启动脚本
# 启动核心服务：IAM + 前端

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 设置环境变量
export JWT_SECRET="${JWT_SECRET:-topems_super_secret_jwt_key_for_development_only_change_in_production}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-topems_super_secret_refresh_key_for_development}"
export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

# 清理端口
cleanup_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
  fi
}

echo "🚀 启动 TOPEMS 核心服务..."
echo ""

# 启动数据库
echo "[1/3] 启动数据库服务..."
cd "$PROJECT_ROOT/deploy/docker"
if [ ! -f .env ]; then
  echo "# TOPEMS Docker Configuration" > .env
  echo "POSTGRES_USER=topems" >> .env
  echo "POSTGRES_PASSWORD=topems_secret" >> .env
  echo "POSTGRES_DB=topems" >> .env
  echo "REDIS_PASSWORD=topems_redis_secret" >> .env
fi
if ! docker ps --format '{{.Names}}' | grep -E '^(topems-postgres|topems-redis)$' > /dev/null 2>&1; then
  docker-compose up -d
  sleep 3
fi
cd "$PROJECT_ROOT"

# 启动IAM
echo "[2/3] 启动 IAM 服务..."
cleanup_port 8000
cd "$PROJECT_ROOT/svc/iam"
SERVER_PORT=8000 RUST_LOG=info cargo run --quiet &

# 等待IAM就绪
for i in {1..10}; do
  if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ IAM 服务已就绪"
    break
  fi
  sleep 1
done

# 启动前端
echo "[3/3] 启动前端服务..."
cleanup_port 3000
cd "$PROJECT_ROOT/apps/web"
npm run dev &

echo ""
echo "✅ TOPEMS 核心服务已启动！"
echo "   IAM: http://localhost:8000"
echo "   前端: http://localhost:3000"
echo ""
echo "💡 提示: 运行 'bash scripts/start-all.sh' 启动所有服务"