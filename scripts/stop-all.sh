#!/bin/bash

# TOPEMS 停止脚本
# 用法: ./scripts/stop-all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  TOPEMS 服务停止脚本"
echo "=========================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SERVICES=(
    "topems-iam"
    "topems-rs"
    "topems-lims"
    "topems-qms"
    "topems-mes"
    "topems-erp"
    "topems-scm"
    "topems-wms"
    "topems-crm"
    "topems-hrm"
    "topems-gis"
    "topems-bi"
    "topems-ehs"
    "topems-pdm"
    "topems-srm"
    "topems-im"
    "topems-ai"
    "topems-mobile"
    "topems-integration"
    "topems-portal"
)

stop_service() {
    local service_name=$1
    local pid_file="$PROJECT_DIR/pids/$service_name.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "→ 停止 $service_name (PID: $pid)..."
            kill $pid 2>/dev/null || true
            rm -f "$pid_file"
            echo -e "  ${GREEN}✓${NC} 已停止"
        else
            echo -e "  ${RED}✗${NC} $service_name 未运行"
            rm -f "$pid_file"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} $service_name 无 PID 文件"
    fi
}

for service in "${SERVICES[@]}"; do
    stop_service "$service"
done

echo ""
echo "=========================================="
echo -e "${GREEN}所有服务已停止${NC}"
echo "=========================================="
