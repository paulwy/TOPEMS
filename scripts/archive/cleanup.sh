#!/bin/bash

# TOPEMS 全面清理脚本
# 清理所有服务、端口、编译缓存等

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 颜色定义
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

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  TOPEMS 全面清理脚本${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# 服务配置
declare -A SERVICES=(
    ["iam"]="services/topems-iam/backend 8000"
    ["doc"]="services/topems-doc/backend 8001"
    ["pm"]="services/topems-pm/backend 8002"
    ["notification"]="services/notification-service 8003"
    ["integration"]="services/topems-integration/backend 8004"
    ["portal"]="services/topems-portal/backend 8005"
    ["flow"]="services/topems-flow/backend 8006"
    ["erp"]="services/topems-erp/backend 8010"
    ["hrm"]="services/topems-hrm/backend 8011"
    ["crm"]="services/topems-crm/backend 8012"
    ["ai"]="services/topems-ai/backend 8013"
    ["rs"]="services/topems-rs/backend 8020"
    ["lims"]="services/topems-lims/backend 8022"
    ["pdm"]="services/topems-pdm/backend 8023"
    ["mes"]="services/topems-mes/backend 8030"
    ["qms"]="services/topems-qms/backend 8031"
    ["ehs"]="services/topems-ehs/backend 8032"
    ["scm"]="services/topems-scm/backend 8040"
    ["srm"]="services/topems-srm/backend 8041"
    ["wms"]="services/topems-wms/backend 8042"
    ["gis"]="services/topems-gis/backend 8050"
    ["im"]="services/topems-im/backend 8051"
    ["bi"]="services/topems-bi/backend 8052"
    ["report"]="services/report-service 8053"
    ["mail"]="services/topems-mail/backend 8054"
    ["mobile"]="services/topems-mobile/backend 8055"
)

# 1. 停止所有服务
log_info "1. 停止所有服务..."
for service_name in "${!SERVICES[@]}"; do
    local config=${SERVICES[$service_name]}
    local port=$(echo "$config" | cut -d' ' -f2)
    
    # 获取进程ID
    local pid=$(lsof -ti:$port 2>/dev/null || ps aux | grep -v grep | grep "topems-${service_name}" | awk '{print $2}' 2>/dev/null)
    if [ -n "$pid" ]; then
        log_warning "停止 $service_name (PID: $pid)"
        kill $pid 2>/dev/null
        sleep 0.5
        # 强制杀死
        kill -9 $pid 2>/dev/null || true
    fi
done
log_success "所有服务已停止"

# 2. 清理所有端口
log_info "2. 清理所有服务端口..."
for service_config in "${SERVICES[@]}"; do
    local port=$(echo "$service_config" | cut -d' ' -f2)
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            log_warning "杀死进程 $pid (占用端口 $port)"
            kill -9 $pid 2>/dev/null
        done
    fi
done
# 额外清理前端端口
for port in 3000 3001 5173; do
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            log_warning "杀死进程 $pid (占用端口 $port)"
            kill -9 $pid 2>/dev/null
        done
    fi
done
sleep 1
log_success "所有端口已清理"

# 3. 清理临时日志
log_info "3. 清理临时日志文件..."
for service_name in "${!SERVICES[@]}"; do
    rm -f "/tmp/topems-${service_name}.log"
done
log_success "临时日志已清理"

# 4. 可选：清理编译缓存
echo ""
read -p "是否清理编译缓存 (target 目录)? [y/N]: " clean_cache
if [[ "$clean_cache" =~ ^[Yy]$ ]]; then
    log_info "清理编译缓存..."
    for service_config in "${SERVICES[@]}"; do
        local service_path=$(echo "$service_config" | cut -d' ' -f1)
        local target_path="$PROJECT_ROOT/$service_path/target"
        if [ -d "$target_path" ]; then
            log_warning "删除 $target_path"
            rm -rf "$target_path"
        fi
    done
    log_success "编译缓存已清理"
fi

# 5. 可选：停止数据库容器
echo ""
read -p "是否停止 PostgreSQL/Redis 容器? [y/N]: " stop_db
if [[ "$stop_db" =~ ^[Yy]$ ]]; then
    log_info "停止数据库容器..."
    cd "$PROJECT_ROOT/docker"
    docker-compose down 2>/dev/null || true
    cd "$PROJECT_ROOT"
    log_success "数据库容器已停止"
fi

echo ""
echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}  清理完成！${NC}"
echo -e "${GREEN}==============================================${NC}"
echo ""
echo "下一步操作："
echo "  - 重新编译: ./scripts/manage-services.sh build-all"
echo "  - 启动服务: ./scripts/manage-services.sh start-all"
echo "  - 启动数据库: cd docker && docker-compose up -d postgres redis"
echo ""
