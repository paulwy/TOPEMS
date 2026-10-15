#!/usr/bin/env bash
# TOPEMS 统一服务 Docker 构建脚本
# P1-1: 从统一模板构建任意服务镜像
#
# 用法:
#   bash deploy/docker/build-service.sh <service-name> [--tag <tag>] [--no-cache]
#
# 示例:
#   bash deploy/docker/build-service.sh erp
#   bash deploy/docker/build-service.sh hrm --tag latest
#   bash deploy/docker/build-service.sh finance --no-cache
#
# 服务名对应 config/services.yaml 中的 name 字段（如 erp, hrm, finance 等）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 仓库根 = deploy/docker 上溯两层（对照 build-local.sh:17）；context 必须是仓库根，
# 因为 Dockerfile.service 需要 COPY Cargo.toml / lib / svc / .sqlx（均在仓库根）。
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE="$SCRIPT_DIR/Dockerfile.service"
PORTS_FILE="$PROJECT_ROOT/config/ports.env"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[build-service]${NC} $1"; }
warn() { echo -e "${YELLOW}[build-service]${NC} $1"; }
err()  { echo -e "${RED}[build-service]${NC} $1" >&2; }

# 参数解析
SERVICE_NAME="${1:-}"
TAG=""
NO_CACHE=""

if [[ -z "$SERVICE_NAME" ]]; then
  err "用法: bash docker/build-service.sh <service-name> [--tag <tag>] [--no-cache]"
  err "示例: bash docker/build-service.sh erp"
  exit 1
fi
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)     TAG="$2"; shift 2 ;;
    --no-cache) NO_CACHE="--no-cache"; shift ;;
    *) err "未知参数: $1"; exit 1 ;;
  esac
done

# 服务名 → 二进制名 / 服务目录映射
# 格式: BINARY_NAME:SERVICE_DIR:PORT_ENV_VAR
# bash 3.2（macOS 自带）兼容实现：用 case 函数替代 declare -A（关联数组需 bash≥4）。
SERVICE_KEYS="erp finance ai hrm pm crm mes pdm scm wms srm qms lims ehs rd bi analytics portal mobile gis integration communication ticket search master-data tms"

service_map() {
  case "$1" in
    erp)           echo "topems-erp:erp:ERP_PORT" ;;
    finance)       echo "topems-finance:finance:FINANCE_PORT" ;;
    ai)            echo "topems-ai:ai:AI_PORT" ;;
    hrm)           echo "topems-hrm:hrm:HRM_PORT" ;;
    pm)            echo "topems-pm:pm:PM_PORT" ;;
    crm)           echo "topems-crm:crm:CRM_PORT" ;;
    mes)           echo "topems-mes:mes:MES_PORT" ;;
    pdm)           echo "topems-pdm:pdm:PDM_PORT" ;;
    scm)           echo "topems-scm:scm:SCM_PORT" ;;
    wms)           echo "topems-wms:wms:WMS_PORT" ;;
    srm)           echo "topems-srm:srm:SRM_PORT" ;;
    qms)           echo "topems-qms:qms:QMS_PORT" ;;
    lims)          echo "topems-lims:lims:LIMS_PORT" ;;
    ehs)           echo "topems-ehs:ehs:EHS_PORT" ;;
    rd)            echo "topems-rd:rd:RD_PORT" ;;
    bi|analytics)  echo "topems-analytics:analytics:BI_PORT" ;;
    portal)        echo "topems-portal:portal:PORTAL_PORT" ;;
    mobile)        echo "topems-mobile:mobile:MOBILE_PORT" ;;
    gis)           echo "topems-gis:gis:GIS_PORT" ;;
    integration)   echo "topems-integration:integration:INTEGRATION_PORT" ;;
    communication) echo "topems-communication:communication:COMMUNICATION_PORT" ;;
    ticket)        echo "topems-ticket:ticket:TICKET_PORT" ;;
    # [V2026.08 已合并] feedback 服务已合并至 ticket（customer_feedback 类型）
    search)        echo "topems-search:search:SEARCH_PORT" ;;
    # [V2026.08 已移除] lowcode 空壳占位服务
    master-data)   echo "topems-master-data:master-data:MASTER_DATA_PORT" ;;
    tms)           echo "topems-tms:tms:TMS_PORT" ;;
    # [V2026.08 已合并] aps 服务已合并至 mes（production_plan/capacity/demand_forecast 模块），保留兼容层 /api/aps → /api/mes
    *)             return 1 ;;
  esac
}

MAPPING="$(service_map "$SERVICE_NAME" 2>/dev/null || true)"
if [[ -z "$MAPPING" ]]; then
  err "未知服务: $SERVICE_NAME"
  err "可用服务: $SERVICE_KEYS"
  exit 1
fi

IFS=':' read -r BINARY_NAME SERVICE_DIR PORT_ENV_VAR <<< "$MAPPING"

# 从 ports.env 读取端口
if [[ ! -f "$PORTS_FILE" ]]; then
  err "端口配置文件不存在: $PORTS_FILE"
  exit 1
fi

PORT=$(grep "^${PORT_ENV_VAR}=" "$PORTS_FILE" | cut -d'=' -f2 || true)
if [[ -z "$PORT" ]]; then
  err "未在 $PORTS_FILE 中找到 $PORT_ENV_VAR"
  exit 1
fi

# 镜像标签
if [[ -z "$TAG" ]]; then
  TAG="topems-${SERVICE_NAME}:latest"
fi

log "构建服务: $SERVICE_NAME"
log "  二进制: $BINARY_NAME"
log "  目录:   $SERVICE_DIR"
log "  端口:   $PORT ($PORT_ENV_VAR)"
log "  镜像:   $TAG"

# 执行构建
docker build \
  -f "$TEMPLATE" \
  --build-arg SERVICE_NAME="$BINARY_NAME" \
  --build-arg SERVICE_PORT="$PORT" \
  --build-arg PORT_ENV_VAR="$PORT_ENV_VAR" \
  --build-arg SERVICE_DIR="$SERVICE_DIR" \
  -t "$TAG" \
  $NO_CACHE \
  "$PROJECT_ROOT"

log "构建完成: $TAG"
