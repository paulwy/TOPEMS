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

# 服务配置
declare -A SERVICES=(
    ["iam"]="platform/topems-iam/backend 8002"
    ["doc"]="platform/topems-doc/backend 8001"
    ["ai"]="services/topems-ai/backend 8003"
    ["flow"]="platform/topems-flow/backend 8004"
    ["rs"]="services/topems-rs/backend 8005"
    ["lims"]="services/topems-lims/backend 8006"
    ["qms"]="services/topems-qms/backend 8012"
    ["ehs"]="services/topems-ehs/backend 8016"
    ["erp"]="services/topems-erp/backend 8009"
    ["hrm"]="services/topems-hrm/backend 8010"
    ["gis"]="services/topems-gis/backend 8011"
    ["pdm"]="services/topems-pdm/backend 8015"
    ["srm"]="services/topems-srm/backend 8018"
    ["im"]="services/topems-im/backend 8017"
)

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

# 编译服务
build_service() {
    local service_name=$1
    local config=${SERVICES[$service_name]}
    local service_path=$(echo "$config" | cut -d' ' -f1)

    if [ -z "$service_path" ]; then
        log_error "服务 $service_name 不存在"
        return 1
    fi

    log_info "编译 $service_name 服务..."
    cd "$PROJECT_ROOT/$service_path"
    
    if cargo build --release; then
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
    local config=${SERVICES[$service_name]}
    local service_path=$(echo "$config" | cut -d' ' -f1)
    local port=$(echo "$config" | cut -d' ' -f2)

    if [ -z "$service_path" ]; then
        log_error "服务 $service_name 不存在"
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
    local executable_path="$PROJECT_ROOT/$service_path/target/release/topems-$service_name"
    if [ ! -f "$executable_path" ]; then
        log_warning "可执行文件不存在，开始编译..."
        build_service "$service_name" || return 1
    fi

    # 设置环境变量
    export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
    export REDIS_URL="redis://localhost:6379"
    export RUST_LOG="info"

    # 启动服务
    cd "$PROJECT_ROOT/$service_path"
    nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    local pid=$!

    # 等待服务启动
    sleep 3

    # 验证服务是否启动成功
    if check_port $port; then
        log_success "$service_name 服务启动成功 (PID: $pid, 端口: $port)"
        log_info "日志文件: /tmp/topems-${service_name}.log"
        return 0
    else
        log_error "$service_name 服务启动失败，请查看日志: /tmp/topems-${service_name}.log"
        kill $pid 2>/dev/null || true
        return 1
    fi
}

# 停止服务
stop_service() {
    local service_name=$1
    local config=${SERVICES[$service_name]}
    local port=$(echo "$config" | cut -d' ' -f2)

    if [ -z "$config" ]; then
        log_error "服务 $service_name 不存在"
        return 1
    fi

    log_info "停止 $service_name 服务..."

    local pid=$(get_service_pid "$service_name" "$port")
    if [ -n "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 1

        # 检查是否停止成功
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
            sleep 0.5
        fi

        if ! check_port $port; then
            log_success "$service_name 服务已停止"
            return 0
        else
            log_error "无法停止 $service_name 服务"
            return 1
        fi
    else
        log_warning "$service_name 服务未运行"
        return 0
    fi
}

# 查看服务状态
service_status() {
    local service_name=$1
    local config=${SERVICES[$service_name]}
    local port=$(echo "$config" | cut -d' ' -f2)

    if [ -z "$config" ]; then
        log_error "服务 $service_name 不存在"
        return 1
    fi

    local pid=$(get_service_pid "$service_name" "$port")
    if [ -n "$pid" ]; then
        echo -e "${GREEN}✅${NC} $service_name (端口 $port) 运行中 (PID: $pid)"
    else
        echo -e "${RED}❌${NC} $service_name (端口 $port) 未运行"
    fi
}

# 查看所有服务状态
all_status() {
    log_info "TOPEMS 服务状态"
    echo "=================================================="

    for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
        service_status $service_name
    done

    echo "=================================================="

    # 检查前端
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} 前端 (端口 3000) 运行中"
    else
        echo -e "${RED}❌${NC} 前端 (端口 3000) 未运行"
    fi
}

# 查看服务日志
view_log() {
    local service_name=$1
    local log_file="/tmp/topems-${service_name}.log"

    if [ -f "$log_file" ]; then
        log_info "查看 $service_name 日志 (Ctrl+C 退出)..."
        echo "=================================================="
        tail -f "$log_file"
    else
        log_warning "$service_name 日志文件不存在: $log_file"
    fi
}

# 查看所有可用服务
list_services() {
    log_info "可用的服务:"
    for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
        local config=${SERVICES[$service_name]}
        local port=$(echo "$config" | cut -d' ' -f2)
        echo "  - $service_name (端口: $port)"
    done
}

# 使用说明
usage() {
    echo "TOPEMS 服务管理脚本"
    echo "======================================"
    echo ""
    echo "用法: $0 [命令] [服务名] [选项]"
    echo ""
    echo "命令:"
    echo "  start <服务名> [--force]  启动指定服务"
    echo "  stop <服务名>             停止指定服务"
    echo "  restart <服务名> [--force] 重启指定服务"
    echo "  status <服务名>           查看指定服务状态"
    echo "  all-status                查看所有服务状态"
    echo "  log <服务名>              查看指定服务日志"
    echo "  list                      列出所有可用服务"
    echo "  build <服务名>            编译指定服务"
    echo "  build-all                 编译所有服务"
    echo "  clean-port <端口>         强制清理指定端口"
    echo "  clean-all                 停止所有服务并清理端口"
    echo "  start-all [--force]       启动所有服务"
    echo "  stop-all                  停止所有服务"
    echo "  help                      显示此帮助信息"
    echo ""
    echo "选项:"
    echo "  --force                   强制模式（清理占用端口）"
    echo ""
    echo "可用服务:"
    list_services
    echo ""
    echo "示例:"
    echo "  $0 start iam"
    echo "  $0 start rs --force"
    echo "  $0 build lims"
    echo "  $0 clean-all"
    echo "  $0 stop-all"
    echo "  $0 all-status"
    echo "  $0 log lims"
}

# 主函数
main() {
    local cmd="${1:-}"
    local arg1="${2:-}"
    local arg2="${3:-}"
    
    case "$cmd" in
        start)
            if [ -z "$arg1" ]; then
                log_error "请指定要启动的服务名"
                list_services
                exit 1
            fi
            local force=false
            if [ "$arg2" = "--force" ]; then
                force=true
            fi
            start_service "$arg1" "$force"
            ;;

        stop)
            if [ -z "$arg1" ]; then
                log_error "请指定要停止的服务名"
                list_services
                exit 1
            fi
            stop_service "$arg1"
            ;;

        restart)
            if [ -z "$arg1" ]; then
                log_error "请指定要重启的服务名"
                list_services
                exit 1
            fi
            local force=false
            if [ "$arg2" = "--force" ]; then
                force=true
            fi
            stop_service "$arg1"
            sleep 1
            start_service "$arg1" "$force"
            ;;

        status)
            if [ -z "$arg1" ]; then
                log_error "请指定要查看的服务名"
                list_services
                exit 1
            fi
            service_status "$arg1"
            ;;

        all-status)
            all_status
            ;;

        log)
            if [ -z "$arg1" ]; then
                log_error "请指定要查看日志的服务名"
                list_services
                exit 1
            fi
            view_log "$arg1"
            ;;

        list)
            list_services
            ;;

        build)
            if [ -z "$arg1" ]; then
                log_error "请指定要编译的服务名"
                list_services
                exit 1
            fi
            build_service "$arg1"
            ;;

        build-all)
            log_info "编译所有服务..."
            local success=true
            for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
                if ! build_service "$service_name"; then
                    success=false
                fi
            done
            if [ "$success" = "true" ]; then
                log_success "所有服务编译成功"
            else
                log_error "部分服务编译失败"
            fi
            ;;

        clean-port)
            if [ -z "$arg1" ]; then
                log_error "请指定要清理的端口"
                exit 1
            fi
            force_clean_port "$arg1"
            ;;

        clean-all)
            log_info "停止所有服务并清理端口..."
            # 先停止所有服务
            for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
                stop_service "$service_name" 2>/dev/null || true
            done
            # 清理所有端口
            for service_config in "${SERVICES[@]}"; do
                local port=$(echo "$service_config" | cut -d' ' -f2)
                force_clean_port "$port" 2>/dev/null || true
            done
            log_success "所有服务已停止，端口已清理"
            ;;

        start-all)
            local force=false
            if [ "$arg1" = "--force" ]; then
                force=true
            fi
            log_info "启动所有服务..."
            for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
                start_service "$service_name" "$force" 2>/dev/null || true
            done
            log_success "所有服务启动完成"
            all_status
            ;;

        stop-all)
            log_info "停止所有服务..."
            for service_name in $(echo "${!SERVICES[@]}" | tr ' ' '\n' | sort); do
                stop_service "$service_name" 2>/dev/null || true
            done
            log_success "所有服务停止完成"
            ;;

        help|--help|-h)
            usage
            ;;

        *)
            log_error "无效的命令: $cmd"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# 启动脚本
main "$@"
