#!/bin/bash

# TOPEMS 一键启动脚本
# 此脚本启动所有 TOPEMS 服务

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          TOPEMS 系统一键启动脚本                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 函数定义
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 检查 Docker
log_info "检查 Docker 服务..."
if ! docker info > /dev/null 2>&1; then
    log_error "Docker 未运行，正在启动..."
    open -a Docker
    sleep 10
fi
log_info "Docker 已就绪"

# 2. 启动数据库服务
log_info "启动数据库服务..."
cd docker
docker compose -f docker-compose.dev.yml up -d postgres redis
cd ..
sleep 5

# 3. 创建数据库用户（如果不存在）
log_info "配置数据库..."
psql -U xingzhai -d postgres -c "CREATE USER topems_dev WITH PASSWORD 'dev_password' CREATEDB;" 2>/dev/null || true
psql -U xingzhai -d postgres -c "CREATE DATABASE topems_dev OWNER topems_dev;" 2>/dev/null || true
psql -U xingzhai -d postgres -c "CREATE DATABASE topems_gis OWNER topems_dev;" 2>/dev/null || true
psql -U xingzhai -d postgres -c "CREATE DATABASE topems_bi OWNER topems_dev;" 2>/dev/null || true
psql -U xingzhai -d postgres -c "CREATE DATABASE topems_mobile OWNER topems_dev;" 2>/dev/null || true
psql -U xingzhai -d postgres -c "CREATE DATABASE topems_im OWNER topems_dev;" 2>/dev/null || true

# 4. 设置环境变量
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_dev"

# 5. 启动后端服务
log_info "启动后端服务..."

# IAM 服务
log_info "启动 IAM 服务 (端口 8002)..."
cd platform/topems-iam/backend
export SERVICE_PORT=8002
cargo run &
cd ../..

# DOC 服务
log_info "启动 DOC 服务 (端口 8001)..."
cd platform/topems-doc/backend
export SERVICE_PORT=8001
cargo run &
cd ../..

# AI 服务
log_info "启动 AI 服务 (端口 8003)..."
cd services/topems-ai/backend
export SERVICE_PORT=8003
cargo run &
cd ../..

# FLOW 服务
log_info "启动 FLOW 服务 (端口 8004)..."
cd platform/topems-flow/backend
export SERVICE_PORT=8004
cargo run &
cd ../..

# RS 服务
log_info "启动 RS 服务 (端口 8005)..."
cd services/topems-rs/backend
export SERVICE_PORT=8005
cargo run &
cd ../..

# LIMS 服务
log_info "启动 LIMS 服务 (端口 8006)..."
cd services/topems-lims/backend
export SERVICE_PORT=8006
cargo run &
cd ../..

# TOPEMS-GIS
log_info "启动 TOPEMS-GIS (端口 8011)..."
cd services/topems-gis/backend
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_gis"
export SERVICE_PORT=8011
cargo run &
cd ../..

# TOPEMS-BI
log_info "启动 TOPEMS-BI (端口 8012)..."
cd services/topems-bi/backend
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_bi"
export SERVICE_PORT=8012
cargo run &
cd ../..

# TOPEMS-MOBILE
log_info "启动 TOPEMS-MOBILE (端口 8013)..."
cd services/topems-mobile/backend
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_mobile"
export SERVICE_PORT=8013
cargo run &
cd ../..

# TOPEMS-IM
log_info "启动 TOPEMS-IM (端口 8014)..."
cd services/topems-im/backend
export DATABASE_URL="postgres://topems_dev:dev_password@localhost:5432/topems_im"
export SERVICE_PORT=8014
cargo run &
cd ../..

# 6. 启动前端
log_info "启动前端服务 (端口 3000)..."
cd frontend
npm run dev &
cd ..

# 7. 等待服务启动
log_info "等待服务启动..."
sleep 15

# 8. 健康检查
log_info "执行健康检查..."
echo ""

echo "检查所有服务状态:"
for port in 8001 8002 8003 8004 8005 8006 8011 8012 8013 8014 3000; do
    if curl -s -o /dev/null http://localhost:$port/health -w "%{http_code}" 2>/dev/null | grep -q "200"; then
        log_info "✅ 端口 $port - 运行中"
    elif [ $port -eq 3000 ]; then
        if curl -s -o /dev/null http://localhost:$port -w "%{http_code}" 2>/dev/null | grep -q "200"; then
            log_info "✅ 端口 $port - 运行中"
        else
            log_warn "⏳ 端口 $port - 启动中"
        fi
    else
        log_warn "⏳ 端口 $port - 启动中"
    fi
done

echo ""
log_info "系统启动完成！"
echo ""
echo "🌐 访问地址:"
echo "   前端门户: http://localhost:3000"
echo "   IAM: http://localhost:8002"
echo "   DOC: http://localhost:8001"
echo "   AI: http://localhost:8003"
echo "   FLOW: http://localhost:8004"
echo "   RS: http://localhost:8005"
echo "   LIMS: http://localhost:8006"
echo "   GIS: http://localhost:8011"
echo "   BI: http://localhost:8012"
echo "   MOBILE: http://localhost:8013"
echo "   IM: http://localhost:8014"
echo ""
echo "🔑 测试账号:"
echo "   admin123 / Admin123 (系统管理员)"
echo "   testuser / Test123456 (普通用户)"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 保持脚本运行
wait
