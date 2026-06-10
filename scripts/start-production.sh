#!/bin/bash
# 文件: scripts/start-production.sh
# TOPEMS 生产环境启动脚本 (不依赖 Docker)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TOPEMS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }

check_requirements() {
    step "检查系统依赖..."
    
    if ! command -v cargo &> /dev/null; then
        error "未找到 cargo，请安装 Rust"
    fi
    
    if ! command -v nginx &> /dev/null; then
        warn "未找到 nginx，请安装: sudo apt install nginx"
    fi
    
    if ! command -v psql &> /dev/null; then
        warn "未找到 psql，请安装 PostgreSQL 客户端"
    fi
    
    if ! command -v redis-cli &> /dev/null; then
        warn "未找到 redis-cli，请安装 Redis 客户端"
    fi
    
    log "系统依赖检查完成"
}

build_services() {
    step "编译所有服务..."
    
    local services=(
        "iam"
        "hrm"
        "erp"
        "crm"
        "doc"
        "ai"
    )
    
    for service in "${services[@]}"; do
        svc_dir="$PROJECT_ROOT/svc/$service"
        if [ -d "$svc_dir" ]; then
            log "编译 $service 服务..."
            cd "$svc_dir"
            cargo build --release --quiet
            if [ $? -eq 0 ]; then
                log "  ${GREEN}✓${NC} 编译成功"
            else
                warn "  ${YELLOW}✗${NC} 编译失败"
            fi
        else
            warn "  跳过不存在的服务: $service"
        fi
    done
    
    cd "$PROJECT_ROOT"
    log "服务编译完成"
}

setup_directories() {
    step "创建目录结构..."
    
    local dirs=(
        "/var/log/topems"
        "/var/lib/topems/uploads"
        "/var/run/topems"
        "/etc/topems"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            sudo mkdir -p "$dir"
            sudo chown -R $USER:$USER "$dir"
            log "创建目录: $dir"
        fi
    done
    
    log "目录结构创建完成"
}

setup_env() {
    step "配置环境变量..."
    
    if [ -f "$PROJECT_ROOT/deploy/env/.env.production" ]; then
        log "使用现有生产配置"
        export $(cat "$PROJECT_ROOT/deploy/env/.env.production" | grep -v '^#' | xargs)
    else
        log "复制配置模板..."
        cp "$PROJECT_ROOT/deploy/env/.env.production.template" "$PROJECT_ROOT/deploy/env/.env.production"
        warn "请编辑 deploy/env/.env.production 配置文件"
        export $(cat "$PROJECT_ROOT/deploy/env/.env.production" | grep -v '^#' | xargs)
    fi
    
    log "环境变量配置完成"
}

setup_nginx() {
    step "配置 Nginx..."
    
    if [ -f "$PROJECT_ROOT/deploy/nginx/topems.conf" ]; then
        sudo cp "$PROJECT_ROOT/deploy/nginx/topems.conf" /etc/nginx/sites-available/topems.conf
        
        if [ -L /etc/nginx/sites-enabled/topems.conf ]; then
            sudo rm /etc/nginx/sites-enabled/topems.conf
        fi
        
        sudo ln -s /etc/nginx/sites-available/topems.conf /etc/nginx/sites-enabled/topems.conf
        
        sudo nginx -t
        if [ $? -eq 0 ]; then
            sudo systemctl reload nginx
            log "Nginx 配置已更新"
        else
            error "Nginx 配置验证失败"
        fi
    else
        error "未找到 Nginx 配置文件"
    fi
}

create_systemd_service() {
    local service_name=$1
    local port=$2
    local svc_dir="$PROJECT_ROOT/svc/$service_name"
    local service_file="/etc/systemd/system/topems-${service_name}.service"
    
    if [ ! -f "$svc_dir/target/release/topems-$service_name" ]; then
        warn "服务二进制文件不存在: $svc_dir/target/release/topems-$service_name"
        return
    fi
    
    log "创建 systemd 服务: $service_name"
    
    cat > "$service_file" << EOF
[Unit]
Description=TOPEMS $service_name Service
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$svc_dir
EnvironmentFile=$PROJECT_ROOT/deploy/env/.env.production
ExecStart=$svc_dir/target/release/topems-$service_name
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5
Environment="RUST_LOG=info"
Environment="PORT=$port"

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv "$service_file" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable "topems-${service_name}.service"
    
    log "  ${GREEN}✓${NC} 创建成功"
}

start_services() {
    step "启动服务..."
    
    local services=(
        "iam:8000"
        "hrm:8001"
        "erp:8002"
        "crm:8003"
        "doc:8004"
        "ai:8013"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        create_systemd_service "$name" "$port"
        sudo systemctl start "topems-${name}.service"
        
        # 等待服务启动
        for i in {1..10}; do
            if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
                log "  ${GREEN}✓${NC} $name 服务已启动"
                break
            fi
            sleep 1
        done
    done
    
    log "服务启动完成"
}

check_status() {
    step "检查服务状态..."
    
    echo ""
    echo "📦 服务状态:"
    
    local services=(
        "iam:8000"
        "hrm:8001"
        "erp:8002"
        "crm:8003"
        "doc:8004"
        "ai:8013"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if systemctl is-active --quiet "topems-${name}.service"; then
            echo -e "  ${GREEN}✓${NC} $name (端口: $port)"
        else
            echo -e "  ${RED}✗${NC} $name (未运行)"
        fi
    done
    
    echo ""
    echo "🔌 端口监听:"
    for port in 80 443 8000 8001 8002 8003 8004 8013; do
        if ss -tlnp | grep -q ":$port "; then
            echo -e "  ${GREEN}✓${NC} 端口 $port 已监听"
        else
            echo -e "  ${YELLOW}○${NC} 端口 $port 未监听"
        fi
    done
}

show_complete() {
    echo ""
    echo "=============================================="
    echo -e "${GREEN}✅ TOPEMS 生产环境部署完成!${NC}"
    echo "=============================================="
    echo ""
    echo "📍 访问地址:"
    echo "   API:     https://your-domain.com/api/v1/"
    echo "   健康检查: https://your-domain.com/health"
    echo "   监控指标: https://your-domain.com/metrics"
    echo ""
    echo "📁 数据目录: /var/lib/topems"
    echo "📝 配置文件: $PROJECT_ROOT/deploy/env/.env.production"
    echo "📊 日志目录: /var/log/topems"
    echo ""
    echo "🔧 常用命令:"
    echo "   查看服务状态:  systemctl status topems-iam"
    echo "   查看服务日志:  journalctl -u topems-iam -f"
    echo "   重启服务:      systemctl restart topems-iam"
    echo "   查看所有服务:  systemctl list-units --type=service | grep topems"
    echo ""
}

main() {
    echo "=============================================="
    echo "TOPEMS 生产环境部署脚本 (不依赖 Docker)"
    echo "=============================================="
    echo ""
    echo "部署流程:"
    echo "  1. 检查系统依赖"
    echo "  2. 编译所有服务"
    echo "  3. 创建目录结构"
    echo "  4. 配置环境变量"
    echo "  5. 配置 Nginx"
    echo "  6. 创建 systemd 服务"
    echo "  7. 启动服务"
    echo ""

    check_requirements
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 2/7: 编译所有服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    build_services
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 3/7: 创建目录结构"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    setup_directories
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 4/7: 配置环境变量"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    setup_env
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 5/7: 配置 Nginx"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    setup_nginx
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 6/7: 创建 systemd 服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "(已在启动服务步骤中完成)"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "步骤 7/7: 启动服务"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    start_services
    
    echo ""
    check_status
    show_complete
}

case "${1:-deploy}" in
    deploy)
        main
        ;;
    start)
        log "启动所有服务..."
        for service in iam hrm erp crm doc ai; do
            sudo systemctl start "topems-${service}.service" 2>/dev/null || true
        done
        check_status
        ;;
    stop)
        log "停止所有服务..."
        for service in iam hrm erp crm doc ai; do
            sudo systemctl stop "topems-${service}.service" 2>/dev/null || true
        done
        ;;
    restart)
        log "重启所有服务..."
        for service in iam hrm erp crm doc ai; do
            sudo systemctl restart "topems-${service}.service" 2>/dev/null || true
        done
        ;;
    status)
        check_status
        ;;
    build)
        build_services
        ;;
    help|--help|-h)
        echo "用法: $0 <command>"
        echo ""
        echo "命令:"
        echo "  deploy   完整部署 (编译+配置+启动)"
        echo "  start    启动服务"
        echo "  stop     停止服务"
        echo "  restart  重启服务"
        echo "  status   查看状态"
        echo "  build    仅编译服务"
        echo ""
        exit 0
        ;;
    *)
        error "未知命令: $1"
        ;;
esac