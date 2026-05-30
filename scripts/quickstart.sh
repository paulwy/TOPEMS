#!/bin/bash

set -e

TOPEMS_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
export TOPEMS_DIR

print_info() {
    echo -e "\033[1;34m[INFO] $1\033[0m"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS] $1\033[0m"
}

print_error() {
    echo -e "\033[1;31m[ERROR] $1\033[0m"
}

print_warning() {
    echo -e "\033[1;33m[WARNING] $1\033[0m"
}

show_help() {
    cat << EOF
TOPEMS 快速启动脚本

用法: $0 [命令]

命令:
  start          - 启动所有服务（Docker模式）
  start-local    - 启动本地开发服务
  stop           - 停止所有服务
  restart        - 重启所有服务
  status         - 查看服务状态
  init           - 初始化环境配置
  clean          - 清理缓存和构建文件
  logs           - 查看服务日志
  help           - 显示此帮助信息

示例:
  $0 start        # 使用 Docker 启动所有服务
  $0 start-local  # 启动本地开发环境
  $0 stop         # 停止所有服务
EOF
}

init_env() {
    print_info "初始化环境配置..."
    
    if [ ! -f "$TOPEMS_DIR/.env" ]; then
        print_info "创建环境配置文件..."
        cat > "$TOPEMS_DIR/.env" << ENVEOF
# TOPEMS 环境配置
ENV=development
SERVER_PORT=8000
JWT_SECRET=topems-jwt-secret-key-change-in-production-2026
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://localhost:6379
RUST_LOG=info

# 服务端口配置
IAM_SERVICE_PORT=8001
DOC_SERVICE_PORT=8002
FLOW_SERVICE_PORT=8003
AI_SERVICE_PORT=8004
LIMS_SERVICE_PORT=8005
QMS_SERVICE_PORT=8006
RS_SERVICE_PORT=8007
ERP_SERVICE_PORT=8008
CRM_SERVICE_PORT=8009
SRM_SERVICE_PORT=8010
WMS_SERVICE_PORT=8011
MES_SERVICE_PORT=8012
GIS_SERVICE_PORT=8013
IM_SERVICE_PORT=8014
EHS_SERVICE_PORT=8015
BI_SERVICE_PORT=8016
MOBILE_SERVICE_PORT=8017
HRM_SERVICE_PORT=8018
PDM_SERVICE_PORT=8019
INTEGRATION_SERVICE_PORT=8020
PORTAL_SERVICE_PORT=8021
NOTIFICATION_SERVICE_PORT=8022
REPORT_SERVICE_PORT=8023

# 前端配置
VITE_API_URL=http://localhost:8000
VITE_IAM_URL=http://localhost:8001
ENVEOF
        print_success "环境配置文件创建成功"
    else
        print_info "环境配置文件已存在"
    fi

    if [ ! -d "$TOPEMS_DIR/data/postgres" ]; then
        print_info "创建数据目录..."
        mkdir -p "$TOPEMS_DIR/data/postgres"
        mkdir -p "$TOPEMS_DIR/data/redis"
        mkdir -p "$TOPEMS_DIR/logs"
        print_success "数据目录创建成功"
    fi

    print_success "环境初始化完成"
}

start_docker() {
    print_info "启动 TOPEMS 服务（Docker模式）..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose 未安装，请先安装"
        exit 1
    fi

    if [ ! -f "$TOPEMS_DIR/.env" ]; then
        print_info "环境配置文件不存在，正在初始化..."
        init_env
    fi

    print_info "启动 Docker 服务..."
    cd "$TOPEMS_DIR"
    
    if [ -f "docker/docker-compose.yml" ]; then
        docker-compose -f docker/docker-compose.yml up -d
    elif [ -f "docker-compose.yml" ]; then
        docker-compose up -d
    else
        print_error "未找到 docker-compose.yml 文件"
        exit 1
    fi

    print_success "Docker 服务启动成功"
    print_info "等待服务初始化..."
    sleep 10
    
    show_status
}

start_local() {
    print_info "启动本地开发环境..."
    
    if [ ! -f "$TOPEMS_DIR/.env" ]; then
        print_info "环境配置文件不存在，正在初始化..."
        init_env
    fi

    source "$TOPEMS_DIR/.env"

    print_info "启动 PostgreSQL..."
    if command -v pg_ctl &> /dev/null; then
        pg_ctl -D /usr/local/var/postgres start
    else
        print_warning "PostgreSQL 未安装或未配置"
    fi

    print_info "启动 Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
    else
        print_warning "Redis 未安装"
    fi

    print_info "启动 IAM 服务..."
    cd "$TOPEMS_DIR/services/topems-iam/backend"
    cargo run &
    IAM_PID=$!
    echo "$IAM_PID" > "$TOPEMS_DIR/logs/iam.pid"
    
    print_info "等待 IAM 服务启动..."
    sleep 5

    print_info "启动前端..."
    cd "$TOPEMS_DIR/frontend"
    npm install 2>/dev/null || true
    npm run dev &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > "$TOPEMS_DIR/logs/frontend.pid"

    print_success "本地服务启动成功"
    print_info "IAM 服务: http://localhost:$IAM_SERVICE_PORT"
    print_info "前端: http://localhost:5173"
}

stop_services() {
    print_info "停止所有服务..."
    
    if command -v docker-compose &> /dev/null; then
        cd "$TOPEMS_DIR"
        if [ -f "docker/docker-compose.yml" ]; then
            docker-compose -f docker/docker-compose.yml down
        elif [ -f "docker-compose.yml" ]; then
            docker-compose down
        fi
    fi

    if [ -f "$TOPEMS_DIR/logs/iam.pid" ]; then
        kill $(cat "$TOPEMS_DIR/logs/iam.pid") 2>/dev/null || true
        rm "$TOPEMS_DIR/logs/iam.pid"
    fi

    if [ -f "$TOPEMS_DIR/logs/frontend.pid" ]; then
        kill $(cat "$TOPEMS_DIR/logs/frontend.pid") 2>/dev/null || true
        rm "$TOPEMS_DIR/logs/frontend.pid"
    fi

    print_success "所有服务已停止"
}

show_status() {
    print_info "服务状态:"
    
    if command -v docker &> /dev/null; then
        echo ""
        print_info "Docker 容器状态:"
        if [ -f "docker/docker-compose.yml" ]; then
            docker-compose -f docker/docker-compose.yml ps
        elif [ -f "docker-compose.yml" ]; then
            docker-compose ps
        fi
    fi

    if [ -f "$TOPEMS_DIR/logs/iam.pid" ]; then
        if kill -0 $(cat "$TOPEMS_DIR/logs/iam.pid") 2>/dev/null; then
            print_success "IAM 服务: 运行中"
        else
            print_error "IAM 服务: 已停止"
        fi
    fi

    if [ -f "$TOPEMS_DIR/logs/frontend.pid" ]; then
        if kill -0 $(cat "$TOPEMS_DIR/logs/frontend.pid") 2>/dev/null; then
            print_success "前端服务: 运行中"
        else
            print_error "前端服务: 已停止"
        fi
    fi
}

show_logs() {
    print_info "查看服务日志..."
    
    if command -v docker &> /dev/null; then
        cd "$TOPEMS_DIR"
        if [ -f "docker/docker-compose.yml" ]; then
            docker-compose -f docker/docker-compose.yml logs -f
        elif [ -f "docker-compose.yml" ]; then
            docker-compose logs -f
        fi
    else
        print_error "Docker 未安装"
    fi
}

clean_cache() {
    print_info "清理缓存和构建文件..."
    
    find "$TOPEMS_DIR" -type d -name "target" -exec rm -rf {} + 2>/dev/null || true
    find "$TOPEMS_DIR" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
    find "$TOPEMS_DIR" -type f -name "Cargo.lock" -delete 2>/dev/null || true
    find "$TOPEMS_DIR" -type f -name "package-lock.json" -delete 2>/dev/null || true
    
    print_success "清理完成"
}

case "$1" in
    start)
        start_docker
        ;;
    start-local)
        start_local
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_docker
        ;;
    status)
        show_status
        ;;
    init)
        init_env
        ;;
    clean)
        clean_cache
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac