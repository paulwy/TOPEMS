#!/bin/bash
# TOPEMS 域服务启动脚本
# 按业务域分组启动，降低运维成本
#
# 使用方法:
#   ./domain-start.sh <domain> [action]
#
# 可用域:
#   core          - 核心平台 (unified-core + postgres + redis + rabbitmq + consul)
#   erp           - ERP 经营管理 (erp + finance)
#   hrm           - HRM 协同办公 (hrm + pm)
#   crm           - CRM 客户关系 (crm)
#   manufacturing - 生产制造 (mes + pdm + qms + lims + ehs)
#   supply-chain  - 供应链 (scm + wms + srm)
#   rd            - 研发管理 (rd)
#   analytics     - 数据分析 (bi + portal)
#   infrastructure - 基础设施 (mobile + gis + integration + ai)
#   monitoring    - 监控系统 (prometheus + grafana + alertmanager + jaeger + traefik + nginx)
#   all           - 全部服务
#
# 示例:
#   ./domain-start.sh core start       # 启动核心平台
#   ./domain-start.sh erp start        # 启动 ERP 域
#   ./domain-start.sh all start        # 启动全部服务
#   ./domain-start.sh manufacturing stop  # 停止生产制造域

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_DIR="${SCRIPT_DIR}/deploy/docker"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[TOPEMS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 域配置
declare -A DOMAIN_SERVICES=(
    ["core"]="unified-core postgres redis rabbitmq consul"
    ["erp"]="erp finance"
    ["hrm"]="hrm pm"
    ["crm"]="crm"
    ["manufacturing"]="mes pdm qms lims ehs"
    ["supply-chain"]="scm wms srm"
    ["rd"]="rd"
    ["analytics"]="bi portal"
    ["infrastructure"]="mobile gis integration ai"
    ["monitoring"]="prometheus grafana alertmanager jaeger traefik nginx"
    ["all"]="unified-core postgres redis rabbitmq consul erp finance hrm pm crm mes pdm qms lims ehs scm wms srm rd bi portal mobile gis integration ai prometheus grafana alertmanager jaeger traefik nginx"
)

# 域依赖关系（启动顺序）
declare -A DOMAIN_DEPENDS=(
    ["erp"]="core"
    ["hrm"]="core"
    ["crm"]="core"
    ["manufacturing"]="core"
    ["supply-chain"]="core erp"
    ["rd"]="core hrm manufacturing"
    ["analytics"]="core"
    ["infrastructure"]="core"
    ["monitoring"]=""
    ["all"]=""
)

show_usage() {
    echo "TOPEMS 域服务管理脚本"
    echo ""
    echo "使用方法: $0 <domain> <action>"
    echo ""
    echo "可用域:"
    echo "  core           核心平台 (unified-core + 基础设施)"
    echo "  erp            ERP 经营管理域"
    echo "  hrm            HRM 协同办公域"
    echo "  crm            CRM 客户关系域"
    echo "  manufacturing  生产制造域"
    echo "  supply-chain   供应链域"
    echo "  rd             研发管理域"
    echo "  analytics      数据分析域"
    echo "  infrastructure 基础设施域"
    echo "  monitoring     监控系统"
    echo "  all            全部服务"
    echo ""
    echo "可用操作:"
    echo "  start    启动域服务"
    echo "  stop     停止域服务"
    echo "  restart  重启域服务"
    echo "  status   查看域服务状态"
    echo "  logs     查看域服务日志"
    echo ""
    echo "示例:"
    echo "  $0 core start              # 启动核心平台"
    echo "  $0 erp start               # 启动 ERP 域（会先检查 core 是否运行）"
    echo "  $0 manufacturing stop      # 停止生产制造域"
    echo "  $0 all start               # 启动全部服务"
}

check_dependencies() {
    local domain=$1
    local deps="${DOMAIN_DEPENDS[$domain]}"
    
    if [ -z "$deps" ] || [ "$deps" = "" ]; then
        return 0
    fi
    
    for dep in $deps; do
        if [ "$dep" = "core" ]; then
            # 检查核心服务是否运行
            if ! docker ps | grep -q "topems-unified-core"; then
                warn "核心服务未运行，正在启动..."
                start_domain "core"
            fi
        fi
    done
}

start_domain() {
    local domain=$1
    local services="${DOMAIN_SERVICES[$domain]}"
    
    log "启动域: ${domain}"
    log "服务列表: ${services}"
    
    cd "${COMPOSE_DIR}"
    
    # 使用 profiles 启动
    if [ "$domain" = "all" ]; then
        docker compose --profile all up -d
    else
        docker compose --profile "${domain}" up -d
    fi
    
    log "域 ${domain} 启动完成"
}

stop_domain() {
    local domain=$1
    local services="${DOMAIN_SERVICES[$domain]}"
    
    log "停止域: ${domain}"
    
    cd "${COMPOSE_DIR}"
    
    for svc in $services; do
        docker stop "topems-${svc}" 2>/dev/null || true
    done
    
    log "域 ${domain} 已停止"
}

show_status() {
    local domain=$1
    local services="${DOMAIN_SERVICES[$domain]}"
    
    log "域 ${domain} 服务状态:"
    echo ""
    
    printf "%-25s %-15s %s\n" "服务" "状态" "端口"
    echo "----------------------------------------------------"
    
    for svc in $services; do
        container="topems-${svc}"
        if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
            status=$(docker ps --format "{{.Status}}" --filter "name=${container}")
            port=$(docker port "${container}" 2>/dev/null | head -1 | cut -d: -f2 || echo "-")
            printf "%-25s ${GREEN}%s${NC}\n" "${svc}" "运行中 (${status})"
        else
            printf "%-25s ${RED}%s${NC}\n" "${svc}" "已停止"
        fi
    done
}

show_logs() {
    local domain=$1
    local services="${DOMAIN_SERVICES[$domain]}"
    
    log "域 ${domain} 日志:"
    
    for svc in $services; do
        echo ""
        echo "=== ${svc} ==="
        docker logs --tail 50 "topems-${svc}" 2>/dev/null || echo "无日志"
    done
}

# 主逻辑
if [ $# -lt 2 ]; then
    show_usage
    exit 1
fi

DOMAIN="$1"
ACTION="$2"

# 验证域
if [ -z "${DOMAIN_SERVICES[$DOMAIN]}" ]; then
    error "未知域: ${DOMAIN}"
fi

case "$ACTION" in
    start)
        check_dependencies "$DOMAIN"
        start_domain "$DOMAIN"
        show_status "$DOMAIN"
        ;;
    stop)
        stop_domain "$DOMAIN"
        ;;
    restart)
        stop_domain "$DOMAIN"
        check_dependencies "$DOMAIN"
        start_domain "$DOMAIN"
        show_status "$DOMAIN"
        ;;
    status)
        show_status "$DOMAIN"
        ;;
    logs)
        show_logs "$DOMAIN"
        ;;
    *)
        error "未知操作: ${ACTION}"
        ;;
esac