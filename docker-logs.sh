#!/bin/bash

# TOPEMS Docker 日志查看脚本
# 用于查看各服务的日志

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 显示横幅
show_banner() {
    echo ""
    echo "================================================"
    echo "  TOPEMS Docker 日志查看器"
    echo "================================================"
    echo ""
}

# 显示服务列表
show_services() {
    echo "可用的服务:"
    echo ""
    services=(postgres redis iam doc ai flow rs lims qms ehs srm pdm frontend nginx all)
    
    for i in "${!services[@]}"; do
        idx=$((i + 1))
        echo "  $idx. ${services[$i]}"
    done
    
    echo ""
}

# 查看日志
view_logs() {
    local service=$1
    local follow=$2
    
    cd docker
    
    if command -v docker-compose &> /dev/null; then
        if [ "$follow" = "yes" ]; then
            docker-compose logs -f "$service"
        else
            docker-compose logs --tail=100 "$service"
        fi
    else
        if [ "$follow" = "yes" ]; then
            docker compose logs -f "$service"
        else
            docker compose logs --tail=100 "$service"
        fi
    fi
    
    cd ..
}

# 主函数
main() {
    show_banner
    
    if [ -z "$1" ]; then
        show_services
        read -p "请选择服务 (1-"${#services[@]}"): " choice
    else
        choice=$1
    fi
    
    services=(postgres redis iam doc ai flow rs lims qms ehs srm pdm frontend nginx all)
    
    if [ "$choice" -ge 1 ] && [ "$choice" -le "${#services[@]}" ]; then
        service="${services[$((choice - 1))]}"
        
        echo ""
        echo "查看 $service 日志 (最后 100 行):"
        echo ""
        
        if [ "$2" = "-f" ]; then
            view_logs "$service" "yes"
        else
            view_logs "$service" "no"
        fi
    else
        echo "无效选择"
        exit 1
    fi
}

main "$@"
