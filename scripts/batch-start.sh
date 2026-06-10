#!/bin/bash

# TOPEMS 批量启动脚本
# 特性:
# - 并行启动所有后端服务
# - 快速启动，不等待每个服务完成
# - 自动设置环境变量

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 服务列表
SERVICES=(
  "iam:8000"
  "doc:8001"
  "pm:8002"
  "notification:8003"
  "integration:8004"
  "portal:8005"
  "flow:8006"
  "erp:8010"
  "hrm:8011"
  "crm:8012"
  "ai:8013"
  "rs:8020"
  "lims:8022"
  "pdm:8023"
  "mes:8030"
  "qms:8031"
  "ehs:8032"
  "scm:8040"
  "srm:8041"
  "wms:8042"
  "gis:8050"
  "im:8051"
  "bi:8052"
  "report:8053"
  "mail:8054"
  "mobile:8055"
)

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

# 停止所有服务
stop_all() {
  echo "⏹️ 停止所有服务..."
  
  for service in "${SERVICES[@]}"; do
    port=$(echo "$service" | cut -d':' -f2)
    cleanup_port "$port"
  done
  cleanup_port 3000
  
  echo "✅ 所有服务已停止"
  exit 0
}

# 主入口
if [ "$1" = "stop" ]; then
  stop_all
fi

echo "🚀 批量启动 TOPEMS 所有服务..."
echo ""

# 先启动数据库（如果未运行）
echo "[1/3] 检查数据库服务..."
if ! docker ps --format '{{.Names}}' | grep -E '^(topems-postgres|topems-redis)$' > /dev/null 2>&1; then
  cd "$PROJECT_ROOT/deploy/docker"
  if [ ! -f .env ]; then
    echo "# TOPEMS Docker Configuration" > .env
    echo "POSTGRES_USER=topems" >> .env
    echo "POSTGRES_PASSWORD=topems_secret" >> .env
    echo "POSTGRES_DB=topems" >> .env
    echo "REDIS_PASSWORD=topems_redis_secret" >> .env
  fi
  docker-compose up -d
  echo "等待数据库启动..."
  sleep 5
fi
cd "$PROJECT_ROOT"

# 清理所有端口
echo "[2/3] 清理服务端口..."
for service in "${SERVICES[@]}"; do
  port=$(echo "$service" | cut -d':' -f2)
  cleanup_port "$port"
done

# 先启动IAM（核心服务）
echo "[3/3] 启动服务..."
echo ""
echo "📌 正在启动 IAM 服务（核心依赖）..."
cd "$PROJECT_ROOT/svc/iam"
SERVER_PORT=8000 RUST_LOG=info cargo run --quiet &
IAM_PID=$!

# 等待IAM启动
echo "等待 IAM 服务就绪..."
for i in {1..10}; do
  if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ IAM 服务已就绪"
    break
  fi
  sleep 1
done

# 并行启动所有其他服务
echo ""
echo "🚀 并行启动其他服务..."

for service in "${SERVICES[@]}"; do
  name=$(echo "$service" | cut -d':' -f1)
  port=$(echo "$service" | cut -d':' -f2)
  
  if [ "$name" != "iam" ]; then
    cleanup_port "$port"
    echo "启动 $name ($port)..."
    (cd "$PROJECT_ROOT/svc/$name" && SERVER_PORT=$port RUST_LOG=info cargo run --quiet &)
  fi
done

# 启动前端
echo ""
echo "🌐 启动前端服务..."
(cd "$PROJECT_ROOT/apps/web" && npm run dev &)

echo ""
echo "⏳ 等待服务启动完成..."
sleep 10

# 显示状态
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    服务状态                    "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success=0
total=0

for service in "${SERVICES[@]}"; do
  name=$(echo "$service" | cut -d':' -f1)
  port=$(echo "$service" | cut -d':' -f2)
  total=$((total + 1))
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ $name ($port)"
    success=$((success + 1))
  else
    echo "❌ $name ($port)"
  fi
done

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✅ FRONTEND (3000)"
  success=$((success + 1))
else
  echo "❌ FRONTEND (3000)"
fi
total=$((total + 1))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  成功: $success / $total"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示: 运行 'bash scripts/batch-start.sh stop' 停止所有服务"