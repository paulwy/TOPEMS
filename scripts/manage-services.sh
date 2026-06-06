#!/bin/bash

# TOPEMS 服务管理脚本
# 用于管理单个或多个服务的启动、停止、状态查看

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务配置 (使用空格分隔，格式: 服务名 路径 端口)
SERVICES_CONFIG="
iam platform/topems-iam/backend 8000
doc platform/topems-doc/backend 8001
pm services/topems-pm/backend 8002
notification services/notification-service 8003
integration services/topems-integration/backend 8004
portal services/topems-portal/backend 8005
flow platform/topems-flow/backend 8006
erp services/topems-erp/backend 8010
hrm services/topems-hrm/backend 8011
crm services/topems-crm/backend 8012
ai services/topems-ai/backend 8013
rs services/topems-rs/backend 8020
lims services/topems-lims/backend 8022
pdm services/topems-pdm/backend 8023
mes services/topems-mes/backend 8030
qms services/topems-qms/backend 8031
ehs services/topems-ehs/backend 8032
scm services/topems-scm/backend 8040
srm services/topems-srm/backend 8041
wms services/topems-wms/backend 8042
gis services/topems-gis/backend 8050
im services/topems-im/backend 8051
bi services/topems-bi/backend 8052
report services/report-service 8053
mail services/topems-mail/backend 8054
mobile services/topems-mobile/backend 8055
"

# 获取服务路径
get_service_path() {
    local service_name=$1
    echo "$SERVICES_CONFIG" | grep "^${service_name} " | awk '{print $2}'
}

# 获取服务端口
get_service_port() {
    local service_name=$1
    echo "$SERVICES_CONFIG" | grep "^${service_name} " | awk '{print $3}'
}

# 获取所有服务名
get_all_services() {
    echo "$SERVICES_CONFIG" | grep -v "^$" | awk '{print $1}' | sort
}

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

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 获取服务进程ID
get_service_pid() {
    local service_name=$1
    local port=$2
    lsof -ti:${port} 2>/dev/null || ps aux | grep -v grep | grep "topems-${service_name}" | awk '{print $2}' 2>/dev/null
}

# 强制清理端口
force_clean_port() {
    local port=$1
    log_info "强制清理端口 $port..."
    
    # 获取占用该端口的所有进程
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            log_warning "杀死进程 $pid (占用端口 $port)"
            kill -9 $pid 2>/dev/null
        done
        sleep 1
    fi
    
    # 再次检查
    if check_port $port; then
        log_error "无法清理端口 $port"
        return 1
    else
        log_success "端口 $port 已清理"
        return 0
    fi
}

# 获取可执行文件名
get_executable_name() {
    local service_name=$1
    if [ "$service_name" = "notification" ]; then
        echo "notification-service"
    else
        echo "topems-${service_name}"
    fi
}

# 编译服务
build_service() {
    local service_name=$1
    local service_path=$(get_service_path "$service_name")

    if [ -z "$service_path" ]; then
        log_error "服务 $service_name 不存在"
        return 1
    fi

    log_info "编译 $service_name 服务..."
    cd "$PROJECT_ROOT/$service_path"
    
    if cargo build --release 2>&1; then
        log_success "$service_name 编译成功"
        return 0
    else
        log_error "$service_name 编译失败"
        return 1
    fi
}

# 启动服务
start_service() {
    local service_name=$1
    local force=${2:-false}
    local service_path=$(get_service_path "$service_name")
    local port=$(get_service_port "$service_name")

    if [ -z "$service_path" ]; then
        log_error "服务 $service_name 不存在"
        return 1
    fi

    if [ -z "$port" ]; then
        log_error "无法获取服务 $service_name 的端口"
        return 1
    fi

    log_info "启动 $service_name 服务..."

    # 检查端口
    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            log_warning "$service_name 服务已在运行 (PID: $pid, 端口: $port)"
            if [ "$force" = "true" ]; then
                log_info "强制重启..."
                stop_service "$service_name"
            else
                return 0
            fi
        else
            log_warning "端口 $port 已被占用"
            if [ "$force" = "true" ]; then
                force_clean_port $port
            else
                log_info "使用 --force 强制清理端口"
                return 1
            fi
        fi
    fi

    # 检查可执行文件
    local executable_name=$(get_executable_name "$service_name")
    local executable_path="$PROJECT_ROOT/$service_path/target/release/${executable_name}"
    if [ ! -f "$executable_path" ]; then
        log_warning "可执行文件不存在，开始编译..."
        build_service "$service_name" || return 1
    fi

    # 加载项目根目录的 .env 文件（包含统一的 JWT_SECRET 等配置）
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "加载根目录配置: $PROJECT_ROOT/.env"
        export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
    fi
    
    # 加载服务特定的 .env 文件（优先级更高）
    if [ -f "$PROJECT_ROOT/$service_path/.env" ]; then
        log_info "加载服务配置: $PROJECT_ROOT/$service_path/.env"
        export $(grep -v '^#' "$PROJECT_ROOT/$service_path/.env" | xargs)
    fi

    # 启动服务
    cd "$PROJECT_ROOT/$service_path"
    if [ "$service_name" = "notification" ]; then
        SERVER_PORT=$port nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    else
        nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    fi
    local pid=$!

    # 等待服务启动
    sleep 3

    # 检查服务是否成功启动
    if check_port $port; then
        log_success "$service_name 服务启动成功 (PID: $pid, 端口: $port)"
        return 0
    else
        log_error "$service_name 服务启动失败，请查看日志: /tmp/topems-${service_name}.log"
        tail -20 "/tmp/topems-${service_name}.log" 2>/dev/null | tail -10
        return 1
    fi
}

# 停止服务
stop_service() {
    local service_name=$1
    local port=$(get_service_port "$service_name")

    if [ -z "$port" ]; then
        log_error "无法获取服务 $service_name 的端口"
        return 1
    fi

    log_info "停止 $service_name 服务..."

    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null
            sleep 1
            if ! check_port $port; then
                log_success "$service_name 服务已停止"
                return 0
            else
                log_warning "正常停止失败，尝试强制停止..."
                kill -9 $pid 2>/dev/null
                sleep 1
                if ! check_port $port; then
                    log_success "$service_name 服务已强制停止"
                    return 0
                else
                    log_error "无法停止 $service_name 服务 (PID: $pid)"
                    return 1
                fi
            fi
        else
            log_warning "未找到运行中的 $service_name 进程"
            return 0
        fi
    else
        log_warning "$service_name 服务未运行"
        return 0
    fi
}

# 查看服务状态
status_service() {
    local service_name=$1
    local port=$(get_service_port "$service_name")

    if [ -z "$port" ]; then
        echo -e "${RED}❌ $service_name: 无法获取端口${NC}"
        return
    fi

    if check_port $port; then
        local pid=$(get_service_pid "$service_name" "$port")
        echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid)"
    else
        echo -e "${RED}❌${NC} $service_name (端口 $port) 未运行"
    fi
}

# 查看日志
logs_service() {
    local service_name=$1
    local lines=${2:-50}

    if [ -f "/tmp/topems-${service_name}.log" ]; then
        tail -n $lines "/tmp/topems-${service_name}.log"
    else
        log_error "日志文件不存在: /tmp/topems-${service_name}.log"
        return 1
    fi
}

# 显示帮助
show_help() {
    echo "TOPEMS 服务管理脚本"
    echo ""
    echo "用法: $0 <命令> [服务名] [选项]"
    echo ""
    echo "命令:"
    echo "  start <服务名>        启动指定服务"
    echo "  stop <服务名>         停止指定服务"
    echo "  restart <服务名>      重启指定服务"
    echo "  status [服务名]       查看服务状态"
    echo "  logs <服务名> [行数]  查看服务日志"
    echo "  build <服务名>        编译服务"
    echo "  start-all            启动所有服务"
    echo "  stop-all             停止所有服务"
    echo "  restart-all          重启所有服务"
    echo "  list                 列出所有服务"
    echo "  help                 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 start iam         启动 IAM 服务"
    echo "  $0 stop hrm           停止 HRM 服务"
    echo "  $0 status             查看所有服务状态"
    echo "  $0 logs hrm 100      查看 HRM 最近 100 行日志"
    echo "  $0 start-all          启动所有服务"
    echo ""
    echo "可用的服务:"
    get_all_services | sed 's/^/  - /'
}

# 列出所有服务
list_services() {
    echo "可用的服务:"
    echo ""
    printf "%-15s %-50s %s\n" "服务名" "路径" "端口"
    printf "%-15s %-50s %s\n" "------" "----" "----"
    for service in $(get_all_services); do
        local path=$(get_service_path "$service")
        local port=$(get_service_port "$service")
        printf "%-15s %-50s %s\n" "$service" "$path" "$port"
    done
}

# 启动所有服务
start_all_services() {
    log_info "启动所有服务..."
    local success_count=0
    local fail_count=0
    local failed_services=""

    for service in $(get_all_services); do
        if start_service "$service"; then
            ((success_count++))
        else
            ((fail_count++))
            failed_services="$failed_services $service"
        fi
    done

    echo ""
    if [ $fail_count -eq 0 ]; then
        log_success "所有服务启动完成 ($success_count 成功)"
    else
        log_warning "服务启动完成 ($success_count 成功, $fail_count 失败)"
        log_warning "失败的服务:$failed_services"
    fi
}

# 停止所有服务
stop_all_services() {
    log_info "停止所有服务..."
    for service in $(get_all_services); do
        stop_service "$service"
    done
    log_success "所有服务已停止"
}

# 重启所有服务
restart_all_services() {
    log_info "重启所有服务..."
    stop_all_services
    sleep 2
    start_all_services
}

# 显示所有服务状态
show_all_status() {
    echo ""
    log_info "TOPEMS 服务状态"
    echo "=================================================="
    for service in $(get_all_services); do
        status_service "$service"
    done
    
    # 检查前端
    if check_port 3000; then
        echo -e "${GREEN}✅${NC} 前端 (端口 3000) 运行中"
    else
        echo -e "${RED}❌${NC} 前端 (端口 3000) 未运行"
    fi
    echo "=================================================="
}

# 主逻辑
case "$1" in
    start)
        if [ -z "$2" ]; then
            log_error "请指定服务名"
            show_help
            exit 1
        fi
        start_service "$2" "${3:-false}"
        ;;
    stop)
        if [ -z "$2" ]; then
            log_error "请指定服务名"
            show_help
            exit 1
        fi
        stop_service "$2"
        ;;
    restart)
        if [ -z "$2" ]; then
            log_error "请指定服务名"
            show_help
            exit 1
        fi
        stop_service "$2"
        sleep 1
        start_service "$2"
        ;;
    status)
        if [ -z "$2" ]; then
            show_all_status
        else
            status_service "$2"
        fi
        ;;
    logs)
        if [ -z "$2" ]; then
            log_error "请指定服务名"
            show_help
            exit 1
        fi
        logs_service "$2" "${3:-50}"
        ;;
    build)
        if [ -z "$2" ]; then
            log_error "请指定服务名"
            show_help
            exit 1
        fi
        build_service "$2"
        ;;
    start-all)
        start_all_services
        show_all_status
        ;;
    stop-all)
        stop_all_services
        ;;
    restart-all)
        restart_all_services
        show_all_status
        ;;
    list)
        list_services
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
