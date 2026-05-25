#!/bin/bash

# TOPEMS 项目启动脚本
# 支持：基础服务启动、后端服务启动、前端服务启动

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/infrastructure/docker"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 显示帮助
show_help() {
    echo "TOPEMS 项目启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --infra        仅启动基础架构服务 (PostgreSQL + Redis)"
    echo "  --backend      启动全部后端服务 (需要先启动infra)"
    echo "  --frontend     启动全部前端服务 (需要先安装依赖)"
    echo "  --all          启动全部服务 (infra + backend + frontend)"
    echo "  --help, -h     显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --infra                    # 仅启动数据库和缓存"
    echo "  $0 --backend                 # 启动所有后端"
    echo "  $0 --all                     # 启动全部"
}

# 启动基础架构服务
start_infra() {
    log_info "检查 Docker 状态..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker 未运行，请启动 Docker Desktop"
        exit 1
    fi

    log_info "启动基础架构服务..."
    cd "$DOCKER_DIR"
    
    log_info "创建目录..."
    mkdir -p data/postgres
    mkdir -p data/redis
    
    log_info "启动 PostgreSQL 和 Redis..."
    docker-compose up -d
    
    log_info "等待服务就绪..."
    sleep 5
    
    log_success "基础架构服务启动完成"
    echo "  PostgreSQL: localhost:5432"
    echo "  Redis:      localhost:6379"
    echo ""
    echo "查看日志: cd $DOCKER_DIR && docker-compose logs -f"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    # 检查是否已启动infra
    if ! docker ps | grep -q "topems-postgres"; then
        log_warning "基础架构服务未运行，先启动..."
        start_infra
    fi
    
    log_info "启动后端服务..."
    
    # 服务列表
    SERVICES=(
        "platform/topems-doc"
        "platform/topems-iam"
        "platform/topems-flow"
        "services/topems-ai"
        "services/topems-rs"
        "services/topems-lims"
        "services/topems-qms"
        "services/topems-ehs"
        "services/topems-erp"
    )
    
    # 在新终端中启动每个服务
    for service in "${SERVICES[@]}"; do
        log_info "启动 $service..."
        (
            cd "$SCRIPT_DIR/$service/backend"
            if [ -f .env ]; then
                source .env
            fi
            cargo run &
        ) &
    done
    
    log_success "后端服务启动中..."
    log_warning "请等待各服务完成编译启动"
    echo ""
    echo "后端服务端口:"
    echo "  topems-doc:  8001"
    echo "  topems-iam:  8002"
    echo "  topems-ai:   8003"
    echo "  topems-flow: 8004"
    echo "  topems-rs:   8005"
    echo "  topems-lims: 8006"
    echo "  topems-qms:  8007"
    echo "  topems-ehs:  8008"
    echo "  topems-erp:  8009"
}

# 安装并启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    SERVICES=(
        "platform/topems-doc"
        "platform/topems-iam"
        "platform/topems-flow"
        "services/topems-ai"
        "services/topems-rs"
        "services/topems-lims"
        "services/topems-qms"
        "services/topems-ehs"
        "services/topems-erp"
    )
    
    # 先检查并安装依赖
    for service in "${SERVICES[@]}"; do
        cd "$SCRIPT_DIR/$service/frontend"
        if [ ! -d "node_modules" ]; then
            log_info "安装 $service 前端依赖..."
            npm install
        fi
    done
    
    # 启动前端服务
    log_info "启动前端服务..."
    for service in "${SERVICES[@]}"; do
        (
            cd "$SCRIPT_DIR/$service/frontend"
            npm run dev &
        ) &
    done
    
    log_success "前端服务启动中..."
    echo ""
    echo "前端服务端口:"
    echo "  topems-doc:  5173"
    echo "  topems-iam:  5174"
    echo "  topems-ai:   5175"
    echo "  topems-flow: 5176"
    echo "  topems-rs:   5177"
    echo "  topems-lims: 5178"
    echo "  topems-qms:  5179"
    echo "  topems-ehs:  5180"
    echo "  topems-erp:  5181"
}

# 主逻辑
case "${1:-}" in
    --infra)
        start_infra
        ;;
    --backend)
        start_backend
        ;;
    --frontend)
        start_frontend
        ;;
    --all)
        start_infra
        sleep 3
        start_backend
        sleep 5
        start_frontend
        ;;
    --help|-h)
        show_help
        ;;
    *)
        echo "未指定选项，默认启动基础架构服务"
        echo "使用 --help 查看更多选项"
        echo ""
        start_infra
        ;;
esac
