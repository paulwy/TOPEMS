#!/bin/bash

# TOPEMS 服务监控和自动重启脚本
# 使用方法：./monitor-services.sh [interval]
# interval: 检查间隔（秒），默认30秒

INTERVAL=${1:-30}
LOG_FILE="/Users/air/TOPEMS/logs/service-monitor.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务配置（格式：端口:服务名:路径）
SERVICES=(
    "8001:topems-doc:platform/topems-doc/backend"
    "8002:topems-iam:platform/topems-iam/backend"
    "8003:topems-ai:services/topems-ai/backend"
    "8004:topems-flow:platform/topems-flow/backend"
    "8005:topems-rs:services/topems-rs/backend"
    "8006:topems-lims:services/topems-lims/backend"
    "8009:topems-erp:services/topems-erp/backend"
    "8010:topems-hrm:services/topems-hrm/backend"
    "8011:topems-gis:services/topems-gis/backend"
    "8012:topems-qms:services/topems-qms/backend"
    "8015:topems-pdm:services/topems-pdm/backend"
    "8016:topems-ehs:services/topems-ehs/backend"
    "8017:topems-im:services/topems-im/backend"
    "8018:topems-srm:services/topems-srm/backend"
)

log() {
    local level="$1"
    local message="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$1"
}

log_warning() {
    log "WARN" "$1"
}

log_error() {
    log "ERROR" "$1"
}

log_success() {
    log "SUCCESS" "$1"
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

# 检查服务是否健康运行
check_service_health() {
    local port=$1
    if curl -s --max-time 2 "http://localhost:${port}/health" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# 检查并重启服务
check_and_restart_service() {
    local port=$1
    local service_name=$2
    local service_dir=$3

    # 检查服务是否运行
    if check_service_health "$port"; then
        return 0  # 服务正在运行
    fi

    # 服务已停止，尝试重启
    log_warning "${service_name} (端口 ${port}) 已停止，尝试重启..."

    # 杀掉可能存在的进程
    lsof -ti:${port} | xargs -r kill -9 2>/dev/null
    pkill -f "${service_name}" 2>/dev/null
    sleep 1

    # 检查可执行文件
    local executable_path="$PROJECT_ROOT/$service_dir/target/release/$service_name"
    if [ ! -f "$executable_path" ]; then
        log_error "可执行文件不存在: $executable_path"
        return 2
    fi

    # 设置环境变量
    export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
    export REDIS_URL="redis://localhost:6379"
    export RUST_LOG="info"

    # 启动服务
    cd "$PROJECT_ROOT/$service_dir"
    nohup "$executable_path" > "/tmp/topems-${service_name}.log" 2>&1 &
    local pid=$!

    sleep 3

    # 再次检查是否启动成功
    if check_service_health "$port"; then
        log_success "${service_name} 已成功重启 (PID: $pid)"
        return 1  # 已重启
    else
        log_error "${service_name} 重启失败，请查看日志: /tmp/topems-${service_name}.log"
        kill $pid 2>/dev/null || true
        return 2  # 重启失败
    fi
}

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  TOPEMS 服务监控${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""
log_info "监控已启动 (检查间隔: ${INTERVAL}秒)"
echo "日志文件: $LOG_FILE"
echo ""
echo "按 Ctrl+C 停止监控"
echo ""

# 注册清理函数
cleanup() {
    echo ""
    log_info "监控已停止"
    exit 0
}
trap cleanup INT TERM

while true; do
    stopped_count=0
    restarted_count=0
    failed_count=0

    for service_config in "${SERVICES[@]}"; do
        IFS=':' read -r port service_name service_dir <<< "$service_config"
        check_and_restart_service "$port" "$service_name" "$service_dir"
        result=$?
        if [ $result -eq 1 ]; then
            ((restarted_count++))
        elif [ $result -eq 2 ]; then
            ((failed_count++))
        fi
    done

    if [ $restarted_count -eq 0 ] && [ $failed_count -eq 0 ]; then
        log_info "所有服务运行正常"
    else
        if [ $restarted_count -gt 0 ]; then
            log_warning "已重启 ${restarted_count} 个停止的服务"
        fi
        if [ $failed_count -gt 0 ]; then
            log_error "${failed_count} 个服务重启失败"
        fi
    fi

    sleep $INTERVAL
done
