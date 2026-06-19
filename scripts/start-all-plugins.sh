#!/bin/bash
# 文件: scripts/start-all-plugins.sh
# TOPEMS 插件化服务一键启动脚本

set -e

# ==================== 配置 ====================

PROJECT_NAME="topems"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${TOPEMS_DATA_DIR:-/data/topems}"

# 插件配置 (端口, 服务目录)
declare -A PLUGINS=(
    ["workflow"]="8000:unified-core"
    ["erp"]="8010:erp"
    ["hrm"]="8011:hrm"
    ["crm"]="8012:crm"
    ["rs"]="8020:rs"
    ["mes"]="8023:manufacturing"
    ["qa"]="8032:quality-assurance"
    ["scm"]="8040:scm"
    ["srm"]="8041:srm"
    ["wms"]="8042:wms"
    ["ai"]="8062:ai"
    ["gis"]="8053:gis"
    ["mobile"]="8070:mobile"
    ["analytics"]="8060:analytics"
    ["pm"]="8001:pm"
    ["monitor"]="8064:monitor"
    ["portal"]="8066:portal"
    ["integration"]="8005:integration"
)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[${PROJECT_NAME}]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

# ==================== 帮助信息 ====================

show_help() {
    cat << EOF
TOPEMS 插件化服务启动脚本

用法: $0 <command>

命令:
  start [plugins]    启动所有或指定的插件
  stop [plugins]    停止所有或指定的插件
  restart [plugins]  重启所有或指定的插件
  status            查看所有插件状态
  logs <plugin>     查看指定插件日志
  health            健康检查所有插件
  help              显示帮助信息

插件列表:
  workflow  ERP  HRM  CRM  MES  QA  SCM  WMS  BI  PM
  AI  GIS  Mobile  RS  SRM  Monitor  Portal  Integration

示例:
  $0 start           # 启动所有插件
  $0 start erp hrm   # 只启动 ERP 和 HRM
  $0 status          # 查看状态
  $0 logs erp        # 查看 ERP 日志
  $0 health          # 健康检查

EOF
}

# ==================== 服务管理 ====================

get_binary_name() {
    local plugin=$1
    local dir=${PLUGINS[$plugin]#*:}

    case $plugin in
        workflow) echo "unified-core-service" ;;
        mes) echo "manufacturing-service" ;;
        bi) echo "analytics-service" ;;
        qa) echo "qa-service" ;;
        *) echo "${dir}-service" ;;
    esac
}

get_binary_path() {
    local plugin=$1
    echo "${PROJECT_ROOT}/target/release/$(get_binary_name $plugin)"
}

start_plugin() {
    local plugin=$1
    local port=${PLUGINS[$plugin]%%:*}
    local dir=${PLUGINS[$plugin]#*:}
    local binary=$(get_binary_path $plugin)
    local log_file="${DATA_DIR}/logs/${plugin}.log"
    local pid_file="${DATA_DIR}/pids/${plugin}.pid"

    # 检查二进制文件是否存在
    if [ ! -f "$binary" ]; then
        warn "二进制文件不存在: $binary"
        warn "跳过启动: $plugin"
        return 1
    fi

    # 检查是否已运行
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log "$plugin 已运行 (PID: $pid)"
            return 0
        fi
    fi

    # 确保日志目录存在
    mkdir -p "$(dirname "$log_file")" "$(dirname "$pid_file")"

    # 启动服务
    log "启动 $plugin (端口: $port)..."

    RUST_LOG=info \
    SERVER_PORT=$port \
    DATABASE_URL="${DATABASE_URL:-postgres://topems:topems@localhost:5432/topems}" \
    JWT_SECRET="${JWT_SECRET:-topems-default-secret}" \
    "$binary" >> "$log_file" 2>&1 &

    local pid=$!
    echo $pid > "$pid_file"

    # 等待启动
    sleep 2

    # 检查是否成功启动
    if kill -0 "$pid" 2>/dev/null; then
        success "$plugin 已启动 (PID: $pid)"
        return 0
    else
        fail "$plugin 启动失败"
        rm -f "$pid_file"
        return 1
    fi
}

stop_plugin() {
    local plugin=$1
    local pid_file="${DATA_DIR}/pids/${plugin}.pid"

    if [ ! -f "$pid_file" ]; then
        log "$plugin 未运行"
        return 0
    fi

    local pid=$(cat "$pid_file")

    if kill -0 "$pid" 2>/dev/null; then
        log "停止 $plugin (PID: $pid)..."
        kill "$pid" 2>/dev/null || true

        # 等待进程退出
        for i in {1..5}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
        done

        # 强制终止
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$pid_file"
        success "$plugin 已停止"
    else
        warn "$plugin 未运行"
        rm -f "$pid_file"
    fi
}

restart_plugin() {
    local plugin=$1
    stop_plugin "$plugin"
    sleep 1
    start_plugin "$plugin"
}

# ==================== 状态检查 ====================

check_plugin_status() {
    local plugin=$1
    local port=${PLUGINS[$plugin]%%:*}
    local pid_file="${DATA_DIR}/pids/${plugin}.pid"
    local status="stopped"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            status="running"
        fi
    fi

    # 检查端口
    local port_status="✗"
    if netstat -tuln 2>/dev/null | grep -q ":$port " || \
       lsof -i :$port 2>/dev/null | grep -q LISTEN; then
        port_status="✓"
    fi

    printf "%-15s %-10s %-5s %s\n" "$plugin" "$status" "$port_status" ":$port"
}

check_health() {
    local plugin=$1
    local port=${PLUGINS[$plugin]%%:*}
    local url="http://localhost:$port/api/plugins/health"

    local response=$(curl -s --connect-timeout 2 "$url" 2>/dev/null || echo "{}")
    local healthy=$(echo "$response" | jq -r '.success // false')

    if [ "$healthy" = "true" ]; then
        printf "${GREEN}✓${NC} %-15s healthy\n" "$plugin"
    else
        printf "${RED}✗${NC} %-15s unhealthy\n" "$plugin"
    fi
}

# ==================== 主流程 ====================

case "${1:-help}" in
    start)
        shift
        PLUGINS_TO_START=("${@:-${!PLUGINS[@]}}")

        if [ ${#PLUGINS_TO_START[@]} -eq 0 ] || [ "${PLUGINS_TO_START[0]}" = "" ]; then
            PLUGINS_TO_START=("${!PLUGINS[@]}")
        fi

        log "启动插件服务..."
        echo ""

        for plugin in "${PLUGINS_TO_START[@]}"; do
            if [ -n "${PLUGINS[$plugin]}" ]; then
                start_plugin "$plugin" || true
            else
                warn "未知插件: $plugin"
            fi
        done

        echo ""
        log "启动完成"
        echo ""
        log "查看状态: $0 status"
        ;;
    stop)
        shift
        PLUGINS_TO_STOP=("${@:-${!PLUGINS[@]}}")

        if [ ${#PLUGINS_TO_STOP[@]} -eq 0 ] || [ "${PLUGINS_TO_STOP[0]}" = "" ]; then
            PLUGINS_TO_STOP=("${!PLUGINS[@]}")
        fi

        log "停止插件服务..."
        echo ""

        for plugin in "${PLUGINS_TO_STOP[@]}"; do
            if [ -n "${PLUGINS[$plugin]}" ]; then
                stop_plugin "$plugin"
            fi
        done

        echo ""
        log "停止完成"
        ;;
    restart)
        shift
        PLUGINS_TO_RESTART=("${@:-${!PLUGINS[@]}}")

        if [ ${#PLUGINS_TO_RESTART[@]} -eq 0 ] || [ "${PLUGINS_TO_RESTART[0]}" = "" ]; then
            PLUGINS_TO_RESTART=("${!PLUGINS[@]}")
        fi

        log "重启插件服务..."
        echo ""

        for plugin in "${PLUGINS_TO_RESTART[@]}"; do
            if [ -n "${PLUGINS[$plugin]}" ]; then
                restart_plugin "$plugin"
            fi
        done

        echo ""
        log "重启完成"
        ;;
    status)
        echo ""
        echo "插件状态:"
        echo "========================================"
        printf "%-15s %-10s %-5s %s\n" "插件" "状态" "端口" "监听"
        echo "----------------------------------------"
        for plugin in "${!PLUGINS[@]}"; do
            check_plugin_status "$plugin"
        done
        echo "========================================"
        ;;
    health)
        echo ""
        echo "健康检查:"
        echo "========================================"
        for plugin in "${!PLUGINS[@]}"; do
            check_health "$plugin" &
        done
        wait
        echo "========================================"
        ;;
    logs)
        if [ -z "$2" ]; then
            error "请指定插件名: $0 logs <plugin>"
        fi

        local plugin=$2
        local log_file="${DATA_DIR}/logs/${plugin}.log"

        if [ ! -f "$log_file" ]; then
            error "日志文件不存在: $log_file"
        fi

        tail -f "$log_file"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "未知命令: $1"
        ;;
esac
