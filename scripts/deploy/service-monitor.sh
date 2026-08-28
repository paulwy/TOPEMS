#!/bin/bash
# TOPEMS 服务稳定性监控与自动恢复脚本
#
# 功能：
# 1. 检查所有 TOPEMS 服务的运行状态
# 2. 检查服务健康检查端点
# 3. 自动重启异常服务
# 4. 记录服务状态和恢复操作
# 5. 发送告警通知（可选）
#
# 使用方法：
#   ./service-monitor.sh              # 检查所有服务
#   ./service-monitor.sh --service ai # 只检查 AI 服务
#   ./service-monitor.sh --auto-restart # 自动重启异常服务
#   ./service-monitor.sh --daemon     # 守护进程模式（每 60 秒检查一次）
#
# 建议配合 cron 使用：
#   */5 * * * * /opt/topems/scripts/service-monitor.sh --auto-restart >> /var/log/topems/monitor.log 2>&1

set -euo pipefail

# ==================== 配置 ====================

# 服务列表（服务名:端口:健康检查路径）
SERVICES=(
    "topems-ai:8013:/health"
    "topems-srm:8011:/health"
    "topems-pm:8012:/health"
    "topems-analytics:8014:/health"
    "topems-master-data:8015:/health"
    "topems-mobile:8016:/health"
    "topems-ehs:8017:/health"
    "topems-pdm:8018:/health"
    "topems-rd:8019:/health"
)

# 日志文件
LOG_FILE="/var/log/topems/service-monitor.log"
LOG_DIR="/var/log/topems"

# 健康检查超时（秒）
HEALTH_CHECK_TIMEOUT=5

# 重启等待时间（秒）
RESTART_WAIT_TIME=10

# 最大重启尝试次数
MAX_RESTART_ATTEMPTS=3

# 守护进程检查间隔（秒）
DAEMON_INTERVAL=60

# 告警脚本（可选，留空则不发送）
ALERT_SCRIPT=""

# ==================== 函数 ====================

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] [$level] $message"
}

# 确保日志目录存在
ensure_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR" 2>/dev/null || true
    fi
}

# 检查服务是否运行
check_service_running() {
    local service_name="$1"
    if systemctl is-active --quiet "$service_name" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 检查服务健康检查端点
check_service_health() {
    local port="$1"
    local health_path="$2"
    local url="http://localhost:${port}${health_path}"
    
    if command -v curl &> /dev/null; then
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
            return 0
        else
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget --spider --timeout="$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    else
        # 没有 curl/wget，只检查端口
        if command -v nc &> /dev/null; then
            if nc -z -w "$HEALTH_CHECK_TIMEOUT" localhost "$port" 2>/dev/null; then
                return 0
            else
                return 1
            fi
        else
            # 无法检查，假设正常
            return 0
        fi
    fi
}

# 重启服务
restart_service() {
    local service_name="$1"
    local attempt=1
    
    while [ $attempt -le $MAX_RESTART_ATTEMPTS ]; do
        log "INFO" "尝试重启 $service_name（第 $attempt/$MAX_RESTART_ATTEMPTS 次）..."
        
        if systemctl restart "$service_name" 2>/dev/null; then
            sleep "$RESTART_WAIT_TIME"
            
            if check_service_running "$service_name"; then
                log "INFO" "$service_name 重启成功"
                return 0
            else
                log "WARN" "$service_name 重启后仍未运行"
            fi
        else
            log "ERROR" "$service_name 重启命令执行失败"
        fi
        
        attempt=$((attempt + 1))
        sleep 5
    done
    
    log "ERROR" "$service_name 重启失败（已尝试 $MAX_RESTART_ATTEMPTS 次）"
    return 1
}

# 发送告警
send_alert() {
    local service_name="$1"
    local issue="$2"
    local action="$3"
    
    local alert_message="[$(date '+%Y-%m-%d %H:%M:%S')] TOPEMS 服务告警: $service_name - $issue - 执行操作: $action"
    
    log "ALERT" "$alert_message"
    
    if [ -n "$ALERT_SCRIPT" ] && [ -x "$ALERT_SCRIPT" ]; then
        "$ALERT_SCRIPT" "$alert_message" 2>/dev/null || true
    fi
}

# 检查单个服务
check_service() {
    local service_def="$1"
    local auto_restart="${2:-false}"
    
    IFS=':' read -r service_name port health_path <<< "$service_def"
    
    log "DEBUG" "检查服务: $service_name (端口: $port, 健康检查: $health_path)"
    
    # 检查服务是否运行
    if ! check_service_running "$service_name"; then
        log "ERROR" "$service_name 未运行"
        send_alert "$service_name" "服务未运行" "检查中"
        
        if [ "$auto_restart" = "true" ]; then
            if restart_service "$service_name"; then
                send_alert "$service_name" "服务未运行" "自动重启成功"
                return 0
            else
                send_alert "$service_name" "服务未运行" "自动重启失败"
                return 1
            fi
        fi
        return 1
    fi
    
    # 检查健康检查端点
    if ! check_service_health "$port" "$health_path"; then
        log "WARN" "$service_name 健康检查失败（端口: $port, 路径: $health_path）"
        send_alert "$service_name" "健康检查失败" "检查中"
        
        if [ "$auto_restart" = "true" ]; then
            if restart_service "$service_name"; then
                # 重启后再次检查健康
                if check_service_health "$port" "$health_path"; then
                    log "INFO" "$service_name 重启后健康检查恢复正常"
                    send_alert "$service_name" "健康检查失败" "自动重启成功，健康恢复"
                    return 0
                else
                    log "ERROR" "$service_name 重启后健康检查仍失败"
                    send_alert "$service_name" "健康检查失败" "自动重启后健康仍异常"
                    return 1
                fi
            else
                send_alert "$service_name" "健康检查失败" "自动重启失败"
                return 1
            fi
        fi
        return 1
    fi
    
    log "INFO" "$service_name 运行正常"
    return 0
}

# 检查所有服务
check_all_services() {
    local auto_restart="${1:-false}"
    local target_service="${2:-all}"
    local total=0
    local healthy=0
    local unhealthy=0
    
    log "INFO" "========== 开始服务检查 =========="
    log "INFO" "检查模式: $([ "$auto_restart" = "true" ] && echo "自动重启" || echo "仅检查")"
    log "INFO" "目标服务: $target_service"
    
    for service_def in "${SERVICES[@]}"; do
        IFS=':' read -r service_name _ _ <<< "$service_def"
        
        if [ "$target_service" != "all" ] && [ "$service_name" != "topems-$target_service" ]; then
            continue
        fi
        
        total=$((total + 1))
        
        if check_service "$service_def" "$auto_restart"; then
            healthy=$((healthy + 1))
        else
            unhealthy=$((unhealthy + 1))
        fi
    done
    
    log "INFO" "========== 服务检查完成 =========="
    log "INFO" "总计: $total, 正常: $healthy, 异常: $unhealthy"
    
    if [ $unhealthy -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# 显示服务状态摘要
show_status_summary() {
    echo ""
    echo "=========================================="
    echo "  TOPEMS 服务状态摘要"
    echo "=========================================="
    echo ""
    printf "%-25s %-10s %-10s %s\n" "服务名称" "状态" "端口" "健康检查"
    echo "------------------------------------------"
    
    for service_def in "${SERVICES[@]}"; do
        IFS=':' read -r service_name port health_path <<< "$service_def"
        
        local status="未知"
        local health="未知"
        
        if check_service_running "$service_name"; then
            status="运行中"
            if check_service_health "$port" "$health_path"; then
                health="正常"
            else
                health="异常"
            fi
        else
            status="已停止"
            health="N/A"
        fi
        
        printf "%-25s %-10s %-10s %s\n" "$service_name" "$status" "$port" "$health"
    done
    
    echo "------------------------------------------"
    echo ""
}

# 守护进程模式
run_daemon() {
    local auto_restart="${1:-false}"
    log "INFO" "启动守护进程模式（检查间隔: ${DAEMON_INTERVAL}秒）"
    
    while true; do
        check_all_services "$auto_restart" "all" || true
        sleep "$DAEMON_INTERVAL"
    done
}

# 显示帮助
show_help() {
    echo "TOPEMS 服务稳定性监控与自动恢复脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --service <name>    只检查指定服务（如 ai, srm, pm）"
    echo "  --auto-restart      自动重启异常服务"
    echo "  --daemon            守护进程模式（持续监控）"
    echo "  --status            显示服务状态摘要"
    echo "  --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                          # 检查所有服务"
    echo "  $0 --service ai             # 只检查 AI 服务"
    echo "  $0 --auto-restart           # 检查并自动重启异常服务"
    echo "  $0 --daemon --auto-restart  # 守护进程模式，自动重启"
    echo "  $0 --status                 # 显示服务状态摘要"
    echo ""
}

# ==================== 主程序 ====================

main() {
    ensure_log_dir
    
    local auto_restart="false"
    local daemon_mode="false"
    local target_service="all"
    local show_status="false"
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --service)
                target_service="$2"
                shift 2
                ;;
            --auto-restart)
                auto_restart="true"
                shift
                ;;
            --daemon)
                daemon_mode="true"
                shift
                ;;
            --status)
                show_status="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示状态摘要
    if [ "$show_status" = "true" ]; then
        show_status_summary
        exit 0
    fi
    
    # 守护进程模式
    if [ "$daemon_mode" = "true" ]; then
        run_daemon "$auto_restart"
        exit 0
    fi
    
    # 正常检查模式
    if check_all_services "$auto_restart" "$target_service"; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
