#!/bin/bash

# TOPEMS 本地开发启动脚本（无 Docker）
# 仅启动核心服务：topems-doc, topems-iam, topems-ai, topems-flow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# 服务列表
BACKEND_SERVICES=(
    "platform/topems-doc:8001"
    "platform/topems-iam:8002"
    "services/topems-ai:8003"
    "platform/topems-flow:8004"
)

FRONTEND_SERVICES=(
    "frontend:5173"
)

# 停止已运行的服务
stop_existing() {
    log_warning "停止已运行的后端服务..."
    for service in "${BACKEND_SERVICES[@]}"; do
        port=${service#*:}
        pkill -f ":$port" 2>/dev/null || true
        pkill -f "cargo run" 2>/dev/null || true
    done
    
    log_warning "停止已运行的前端服务..."
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    sleep 2
}

# 启动单个后端服务
start_backend_service() {
    local service_path=$1
    local port=$2
    local name=$(basename $service_path)
    
    log_info "启动 $name (端口 $port)..."
    
    (
        cd "$SCRIPT_DIR/$service_path/backend"
        if [ -f .env ]; then
            source .env
        fi
        cargo run 2>&1 | sed -e "s/^/[$name] /"
    ) &
}

# 启动单个前端服务
start_frontend_service() {
    local service_path=$1
    local port=$2
    local name=$(dirname $service_path | xargs basename 2>/dev/null || echo "frontend")
    
    if [ -z "$name" ] || [ "$name" = "." ]; then
        name="frontend"
    fi
    
    log_info "启动 $name (端口 $port)..."
    
    (
        cd "$SCRIPT_DIR/$service_path"
        if [ ! -d "node_modules" ]; then
            log_warning "安装前端依赖..."
            npm install
        fi
        npm run dev 2>&1 | sed -e "s/^/[$name] /"
    ) &
}

# 主启动函数
start_all() {
    stop_existing
    
    log_info "============================================="
    log_info "  启动 TOPEMS 本地开发环境"
    log_info "============================================="
    
    # 启动后端服务
    log_info ""
    log_info "--- 启动后端服务 ---"
    for service in "${BACKEND_SERVICES[@]}"; do
        IFS=":" read -r path port <<< "$service"
        start_backend_service "$path" "$port"
        sleep 3
    done
    
    # 启动前端服务
    log_info ""
    log_info "--- 启动前端服务 ---"
    for service in "${FRONTEND_SERVICES[@]}"; do
        IFS=":" read -r path port <<< "$service"
        start_frontend_service "$path" "$port"
        sleep 2
    done
    
    log_success ""
    log_success "============================================="
    log_success "  所有服务已启动"
    log_success "============================================="
    log_success ""
    log_success "后端服务："
    for service in "${BACKEND_SERVICES[@]}"; do
        IFS=":" read -r path port <<< "$service"
        name=$(basename $path)
        log_success "  - $name: http://localhost:$port"
    done
    log_success ""
    log_success "前端服务："
    for service in "${FRONTEND_SERVICES[@]}"; do
        IFS=":" read -r path port <<< "$service"
        log_success "  - 主应用: http://localhost:$port"
    done
    log_success ""
    log_warning "按 Ctrl+C 停止所有服务"
    log_success ""
    
    wait
}

# 停止服务
stop_all() {
    log_warning "停止所有服务..."
    stop_existing
    log_success "所有服务已停止"
}

# 显示帮助
show_help() {
    echo "TOPEMS 本地开发启动脚本（无 Docker）"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start, -s      启动所有服务（默认）"
    echo "  stop, -k       停止所有服务"
    echo "  help, -h       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                    # 启动所有核心服务"
    echo "  $0 start              # 启动所有核心服务"
    echo "  $0 stop               # 停止所有服务"
}

# 主逻辑
case "${1:-start}" in
    start|-s)
        start_all
        ;;
    stop|-k)
        stop_all
        ;;
    help|-h)
        show_help
        ;;
    *)
        echo "未知选项: $1"
        show_help
        exit 1
        ;;
esac
