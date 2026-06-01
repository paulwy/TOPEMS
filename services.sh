#!/bin/bash
# TOPEMS 统一服务管理脚本 - 最终完美版

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查端口是否已被占用
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 获取端口上的进程
get_process_on_port() {
    local port=$1
    lsof -i :$port -t 2>/dev/null || echo ""
}

# 显示服务状态 - 完美实现！
show_status() {
    echo ""
    echo "========================================"
    echo "       TOPEMS 服务状态"
    echo "========================================"
    echo ""

    printf "%-20s %-10s %-15s %s\n" "服务" "端口" "状态" "进程"
    printf "%-20s %-10s %-15s %s\n" "------" "----" "----" "----"

    # 服务列表 - 简化版，只列出真正存在的服务
    services=(
        "doc:8001:文档管理服务"
        "iam:8002:身份认证服务"
        "ai:8003:AI服务"
        "lims:8005:实验室管理服务"
        "scm:8007:供应链管理服务"
        "wms:8008:仓库管理系统服务"
        "erp:8006:企业资源计划服务"
        "crm:8009:客户关系管理服务"
        "hrm:8010:人力资源服务"
        "gis:8011:地理信息系统服务"
        "qms:8012:质量管理系统服务"
        "mes:8013:制造执行系统服务"
        "pdm:8017:产品数据管理服务"
        "ehs:8016:环境健康安全服务"
        "im:8016:即时通讯服务"
        "srm:8021:供应商关系管理服务"
        "rs:8005:研发管理系统服务"
        "integration:8019:集成服务"
        "notification:8023:通知服务"
        "report:8024:报表服务"
        "mobile:8018:移动端服务"
    )

    for service_entry in "${services[@]}"; do
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
        *)
            # 其他所有命令都直接调用原脚本
            if [ -f "./start-services.sh" ]; then
                ./start-services.sh "$@"
            else
                echo "ERROR: 找不到 start-services.sh"
                exit 1
            fi
            ;;
    esac
}

main "$@"