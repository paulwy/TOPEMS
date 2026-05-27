#!/bin/bash

set -e

MONITORING_DIR="/opt/topems/monitoring"
ALERT_THRESHOLDS_FILE="$MONITORING_DIR/alert_thresholds.conf"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

check_defaults() {
    if [ ! -f "$ALERT_THRESHOLDS_FILE" ]; then
        cat > "$ALERT_THRESHOLDS_FILE" << 'EOF'
CPU_WARNING=80
CPU_CRITICAL=90
MEMORY_WARNING=80
MEMORY_CRITICAL=90
DISK_WARNING=85
DISK_CRITICAL=95
RESPONSE_TIME_WARNING=1000
RESPONSE_TIME_CRITICAL=3000
ERROR_RATE_WARNING=1
ERROR_RATE_CRITICAL=5
EOF
    fi
    
    source "$ALERT_THRESHOLDS_FILE"
}

check_system_resources() {
    log "Checking system resources..."
    
    source "$ALERT_THRESHOLDS_FILE"
    
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    log "CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%"
    
    ALERTS=()
    
    if (( $(echo "$CPU_USAGE > $CPU_CRITICAL" | bc -l) )); then
        ALERTS+=("CRITICAL: CPU usage is ${CPU_USAGE}%")
    elif (( $(echo "$CPU_USAGE > $CPU_WARNING" | bc -l) )); then
        ALERTS+=("WARNING: CPU usage is ${CPU_USAGE}%")
    fi
    
    if [ "$MEMORY_USAGE" -gt "$MEMORY_CRITICAL" ]; then
        ALERTS+=("CRITICAL: Memory usage is ${MEMORY_USAGE}%")
    elif [ "$MEMORY_USAGE" -gt "$MEMORY_WARNING" ]; then
        ALERTS+=("WARNING: Memory usage is ${MEMORY_USAGE}%")
    fi
    
    if [ "$DISK_USAGE" -gt "$DISK_CRITICAL" ]; then
        ALERTS+=("CRITICAL: Disk usage is ${DISK_USAGE}%")
    elif [ "$DISK_USAGE" -gt "$DISK_WARNING" ]; then
        ALERTS+=("WARNING: Disk usage is ${DISK_USAGE}%")
    fi
    
    if [ ${#ALERTS[@]} -gt 0 ]; then
        for alert in "${ALERTS[@]}"; do
            echo "$alert"
            log "$alert"
        done
        return 1
    fi
    
    log "System resources: OK"
    return 0
}

check_service_health() {
    log "Checking service health..."
    
    SERVICES=(
        "topems-backend"
        "notification-service"
        "report-service"
    )
    
    HEALTH_ISSUES=()
    
    for service in "${SERVICES[@]}"; do
        if ! systemctl is-active --quiet "$service"; then
            HEALTH_ISSUES+=("CRITICAL: $service is not running")
        fi
    done
    
    if [ ${#HEALTH_ISSUES[@]} -gt 0 ]; then
        for issue in "${HEALTH_ISSUES[@]}"; do
            echo "$issue"
            log "$issue"
        done
        return 1
    fi
    
    log "Service health: OK"
    return 0
}

check_response_time() {
    log "Checking response time..."
    
    source "$ALERT_THRESHOLDS_FILE"
    
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8080/health 2>/dev/null | awk '{printf("%.0f", $1*1000}')
    
    log "Response time: ${RESPONSE_TIME}ms"
    
    if [ -n "$RESPONSE_TIME" ]; then
        if [ "$RESPONSE_TIME" -gt "$RESPONSE_TIME_CRITICAL" ]; then
            log "CRITICAL: Response time is ${RESPONSE_TIME}ms"
            return 1
        elif [ "$RESPONSE_TIME" -gt "$RESPONSE_TIME_WARNING" ]; then
            log "WARNING: Response time is ${RESPONSE_TIME}ms"
            return 1
        fi
    fi
    
    log "Response time: OK"
    return 0
}

check_error_rate() {
    log "Checking error rate..."
    
    source "$ALERT_THRESHOLDS_FILE"
    
    ERROR_RATE=0
    
    if [ -f "/var/log/topems/error.log" ]; then
        LAST_MINUTE_ERRORS=$(tail -n 1000 /var/log/topems/error.log | grep "$(date '+%Y-%m-%d %H:%M')" | wc -l)
        ERROR_RATE=$((LAST_MINUTE_ERRORS * 100 / 1000))
    fi
    
    log "Error rate: ${ERROR_RATE}%"
    
    if [ "$ERROR_RATE" -gt "$ERROR_RATE_CRITICAL" ]; then
        log "CRITICAL: Error rate is ${ERROR_RATE}%"
        return 1
    elif [ "$ERROR_RATE" -gt "$ERROR_RATE_WARNING" ]; then
        log "WARNING: Error rate is ${ERROR_RATE}%"
        return 1
    fi
    
    log "Error rate: OK"
    return 0
}

send_alert() {
    local severity=$1
    local message=$2
    
    log "Sending $severity alert: $message"
    
    if command -v curl &> /dev/null; then
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                 -H 'Content-Type: application/json' \
                 -d "{\"text\": \"[$severity] TOPEMS Alert: $message\"}" \
                 2>/dev/null || true
        fi
    fi
}

generate_report() {
    log "Generating monitoring report..."
    
    REPORT_FILE="$MONITORING_DIR/reports/report-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$MONITORING_DIR/reports"
    
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "system": {
    "cpu_usage": "$CPU_USAGE",
    "memory_usage": "$MEMORY_USAGE",
    "disk_usage": "$DISK_USAGE"
  },
  "services": {
    "backend": "$(systemctl is-active topems-backend)",
    "notification": "$(systemctl is-active notification-service)",
    "report": "$(systemctl is-active report-service)"
  },
  "response_time": "${RESPONSE_TIME}ms",
  "error_rate": "${ERROR_RATE}%"
}
EOF
    
    log "Report saved to: $REPORT_FILE"
    
    find "$MONITORING_DIR/reports" -name "report-*.json" -mtime +30 -delete
}

monitor() {
    check_defaults
    
    check_system_resources
    SYSTEM_OK=$?
    
    check_service_health
    SERVICE_OK=$?
    
    check_response_time
    RESPONSE_OK=$?
    
    check_error_rate
    ERROR_OK=$?
    
    if [ $SYSTEM_OK -ne 0 ] || [ $SERVICE_OK -ne 0 ] || [ $RESPONSE_OK -ne 0 ] || [ $ERROR_OK -ne 0 ]; then
        send_alert "ERROR" "One or more health checks failed"
        return 1
    fi
    
    log "All checks passed"
    return 0
}

continuous_monitor() {
    log "Starting continuous monitoring (Ctrl+C to stop)..."
    
    while true; do
        monitor
        sleep 60
    done
}

usage() {
    echo "Usage: $0 [monitor|continuous|report|thresholds] [options]"
    echo ""
    echo "Commands:"
    echo "  monitor       Run a single monitoring check"
    echo "  continuous    Run continuous monitoring (60s interval)"
    echo "  report        Generate a monitoring report"
    echo "  thresholds    Show current alert thresholds"
    exit 1
}

main() {
    COMMAND=${1:-monitor}
    
    mkdir -p "$MONITORING_DIR/reports"
    
    case $COMMAND in
        monitor)
            monitor
            ;;
        continuous)
            continuous_monitor
            ;;
        report)
            generate_report
            ;;
        thresholds)
            cat "$ALERT_THRESHOLDS_FILE"
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
