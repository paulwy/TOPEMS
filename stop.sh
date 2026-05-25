#!/bin/bash

# TOPEMS 项目停止脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/infrastructure/docker"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "TOPEMS 项目停止脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --infra        仅停止基础架构服务"
    echo "  --all          停止全部服务 (infra + 后台进程)"
    echo "  --help, -h     显示此帮助信息"
}

stop_infra() {
    log_info "停止基础架构服务..."
    cd "$DOCKER_DIR"
    docker-compose down
    log_success "基础架构服务已停止"
}

stop_all() {
    log_warning "停止所有后台进程..."
    
    # 尝试停止 cargo 进程
    pkill -f 'cargo run' 2>/dev/null || true
    # 尝试停止 node 进程
    pkill -f 'vite' 2>/dev/null || true
    pkill -f 'npm run dev' 2>/dev/null || true
    
    log_info "停止基础架构..."
    stop_infra
    
    log_success "所有服务已停止"
}

case "${1:-}" in
    --infra)
        stop_infra
        ;;
    --all)
        stop_all
        ;;
    --help|-h)
        show_help
        ;;
    *)
        echo "未指定选项，默认停止基础架构服务"
        stop_infra
        ;;
esac
