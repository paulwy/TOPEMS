#!/bin/bash

# TOPEMS 一键停止脚本

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          TOPEMS 系统一键停止脚本                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 1. 停止后端服务
log_info "停止后端服务..."

# 检查并停止所有服务端口
for port in 8001 8002 8003 8004 8005 8006 8009 8010 8011 8012 8015 8016 8017 8018 8019 8023; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "发现端口 $port 被占用，正在停止..."
        lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
    fi
done

# 2. 停止前端
log_info "停止前端服务..."
for port in 3000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        lsof -ti :$port | xargs -r kill -9 2>/dev/null || true
    fi
done

# 3. 停止 Docker 服务
log_info "停止数据库和 Redis 服务..."
cd "$PROJECT_ROOT/docker"
docker-compose down 2>/dev/null || true
cd "$PROJECT_ROOT"

# 4. 清理残留进程
log_info "清理残留进程..."
pkill -f "topems-" 2>/dev/null || true

log_success "所有服务已停止"
echo ""
echo "如果需要完全清理数据卷，请执行:"
echo "  cd $PROJECT_ROOT/docker && docker-compose down -v"
echo ""
