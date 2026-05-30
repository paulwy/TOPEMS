#!/bin/bash

# TOPEMS Docker 服务状态检查脚本
# 用于检查所有服务的运行状态

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查服务状态
check_service() {
    local service=$1
    local container_name="topems-$service"
    
    if docker ps --filter "name=$container_name" --format "{{.Names}}" | grep -q "^${container_name}$"; then
        local status=$(docker inspect --format='{{.State.Status}}' "$container_name")
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
        local ports=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $k, $v := $conf}}{{index $v "HostPort"}} {{end}}{{end}}' "$container_name" 2>/dev/null || echo "none")
        
        echo -e "  ${GREEN}✓${NC} $service"
        echo -e "    状态: $status"
        echo -e "    健康: $health"
        echo -e "    端口: $ports"
        
        return 0
    else
        echo -e "  ${RED}✗${NC} $service"
        return 1
    fi
}

# 显示横幅
show_banner() {
    echo ""
    echo "================================================"
    echo "  TOPEMS 服务状态检查"
    echo "================================================"
    echo ""
}

# 主函数
main() {
    show_banner
    
    echo "正在检查服务状态..."
    echo ""
    
    services=(postgres redis iam doc ai flow rs lims qms ehs srm pdm frontend nginx)
    total=${#services[@]}
    running=0
    
    for service in "${services[@]}"; do
        if check_service "$service"; then
            running=$((running + 1))
        fi
    done
    
    echo ""
    echo "================================================"
    echo "  总结: $running/$total 服务正在运行"
    echo "================================================"
    echo ""
    
    if [ $running -eq $total ]; then
        echo -e "${GREEN}所有服务正在正常运行！${NC}"
    else
        echo -e "${YELLOW}部分服务未运行，请检查。${NC}"
        echo ""
        echo "启动所有服务: ./docker-start.sh"
    fi
    
    echo ""
}

main "$@"
