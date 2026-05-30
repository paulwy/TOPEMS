#!/bin/bash

# TOPEMS 后端服务启动脚本
# 用法: ./start-services.sh [服务名称]
# 示例:
#   ./start-services.sh          # 启动所有核心服务
#   ./start-services.sh iam      # 只启动 IAM
#   ./start-services.sh all      # 启动所有服务

set -e

# 颜色定义
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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口是否已被占用
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0  # 端口已被占用
    else
        return 1  # 端口空闲
    fi
}

# 获取端口上的进程
get_process_on_port() {
    local port=$1
    lsof -i :$port -t 2>/dev/null || echo ""
}

# 服务定义
SERVICES="
iam:services/topems-iam/backend:8002:身份认证服务
doc:services/backend:8001:文档管理服务
ai:services/topems-ai/backend:8003:AI服务
flow:platform/topems-flow/backend:8004:工作流服务
lims:services/topems-lims/backend:8005:实验室管理服务
erp:services/topems-erp/backend:8006:企业资源计划服务
hrm:services/topems-hrm/backend:8010:人力资源服务
crm:services/topems-crm/backend:8009:客户关系管理服务
qms:services/topems-qms/backend:8012:质量管理系统服务
mes:services/topems-mes/backend:8013:制造执行系统服务
scm:services/topems-scm/backend:8007:供应链管理服务
wms:services/topems-wms/backend:8008:仓库管理系统服务
ehs:services/topems-ehs/backend:8016:环境健康安全服务
pdm:services/topems-pdm/backend:8017:产品数据管理服务
srm:services/topems-srm/backend:8021:供应商关系管理服务
gis:services/topems-gis/backend:8011:地理信息系统服务
bi:services/topems-bi/backend:8020:商业智能服务
im:services/topems-im/backend:8016:即时通讯服务
rs:services/topems-rs/backend:8005:研发管理系统服务
integration:services/topems-integration/backend:8019:集成服务
notification:services/notification-service:8023:通知服务
report:services/report-service:8024:报表服务
mobile:services/topems-mobile/backend:8018:移动端服务
"

# 辅助函数:获取服务信息
get_service_info() {
    local key=$1
    local field=$2  # 1=path, 2=port, 3=name
    echo "$SERVICES" | grep "^${key}:" | cut -d: -f$field
}

# 核心服务列表
CORE_SERVICES="iam doc ai flow lims hrm"

# 启动单个服务
start_service() {
    local key=$1
    local service_path=$(get_service_info $key 1)
    local port=$(get_service_info $key 2)
    local service_name=$(get_service_info $key 3)

    if check_port $port; then
        log_warn "$service_name (端口 $port) 已在运行,跳过"
        return 0
    fi

    log_info "启动 $service_name (端口 $port)..."

    cd $(dirname $0)

    if [ ! -d "$service_path" ]; then
        log_error "服务目录不存在: $service_path"
        return 1
    fi

    cd "$service_path"

    # 检测是否有 Cargo.toml
    if [ -f "Cargo.toml" ]; then
        # Rust 服务
        if [ -d "backend" ]; then
            cd backend
        fi

        # 在后台启动服务
        cargo run > /tmp/topems-$key.log 2>&1 &
        local pid=$!

        # 等待服务启动
        local max_wait=60
        local waited=0
        while [ $waited -lt $max_wait ]; do
            if check_port $port; then
                log_success "$service_name 启动成功 (PID: $pid)"
                return 0
            fi
            sleep 1
            ((waited++))
        done

        log_error "$service_name 启动超时 (等待了 ${max_wait}秒)"
        log_error "查看日志: tail -f /tmp/topems-$key.log"
        return 1
    else
        log_error "未知的项目类型: $service_path"
        return 1
    fi
}

# 停止单个服务
stop_service() {
    local key=$1
    local port=$(get_service_info $key 2)
    local service_name=$(get_service_info $key 3)

    if ! check_port $port; then
        log_warn "$service_name (端口 $port) 未运行,跳过"
        return 0
    fi

    local pid=$(get_process_on_port $port)
    if [ -n "$pid" ]; then
        log_info "停止 $service_name (PID: $pid)..."
        kill $pid 2>/dev/null || true
        sleep 2

        if check_port $port; then
            log_warn "强制停止 $service_name..."
            kill -9 $pid 2>/dev/null || true
        fi

        log_success "$service_name 已停止"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    echo "========================================"
    echo "       TOPEMS 服务状态"
    echo "========================================"
    echo ""

    printf "%-20s %-10s %-15s %s\n" "服务" "端口" "状态" "进程"
    printf "%-20s %-10s %-15s %s\n" "------" "----" "----" "----"

    for service_entry in $SERVICES; do
        local key=$(echo $service_entry | cut -d: -f1)
        local port=$(echo $service_entry | cut -d: -f2)
        local service_name=$(echo $service_entry | cut -d: -f3)

        if check_port $port; then
            local pid=$(get_process_on_port $port)
            printf "${GREEN}%-20s${NC} %-10s ${GREEN}%-15s${NC} %s\n" "$service_name" "$port" "运行中" "$pid"
        else
            printf "${RED}%-20s${NC} %-10s ${RED}%-15s${NC} %s\n" "$service_name" "$port" "已停止" "-"
        fi
    done

    echo ""
}

# 主程序
main() {
    local action=${1:-"status"}

    case $action in
        status|list)
            show_status
            ;;
        start)
            if [ -z "$2" ]; then
                log_error "请指定服务名称"
                echo "可用服务: ${!SERVICES[@]}"
                exit 1
            fi
            start_service $2
            ;;
        stop)
            if [ -z "$2" ]; then
                log_error "请指定服务名称"
                exit 1
            fi
            stop_service $2
            ;;
        core|basic)
            log_info "启动核心服务..."
            for service in "${CORE_SERVICES[@]}"; do
                start_service $service || true
            done
            ;;
        all)
            log_info "启动所有服务..."
            for service_entry in $SERVICES; do
                local key=$(echo $service_entry | cut -d: -f1)
                start_service $key || true
            done
            ;;
        restart)
            if [ -z "$2" ]; then
                log_error "请指定服务名称"
                exit 1
            fi
            stop_service $2
            sleep 2
            start_service $2
            ;;
        *)
            echo "用法: $0 [命令] [服务名]"
            echo ""
            echo "命令:"
            echo "  status           显示所有服务状态 (默认)"
            echo "  start <服务>     启动指定服务"
            echo "  stop <服务>     停止指定服务"
            echo "  restart <服务>  重启指定服务"
            echo "  core            启动核心服务 (IAM, DOC, AI, FLOW, LIMS, HRM)"
            echo "  all             启动所有服务"
            echo ""
            echo "可用服务:"
            for service_entry in $SERVICES; do
                local key=$(echo $service_entry | cut -d: -f1)
                local service_name=$(echo $service_entry | cut -d: -f3)
                echo "  $key - $service_name"
            done
            ;;
    esac
}

main "$@"
