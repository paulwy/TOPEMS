#!/usr/bin/env bash
# TOPEMS 统一服务 Docker 构建脚本
# P1-1: 从统一模板构建任意服务镜像
#
# 用法:
#   bash docker/build-service.sh <service-name> [--tag <tag>] [--no-cache]
#
# 示例:
#   bash docker/build-service.sh erp
#   bash docker/build-service.sh hrm --tag latest
#   bash docker/build-service.sh finance --no-cache
#
# 服务名对应 config/services.yaml 中的 name 字段（如 erp, hrm, finance 等）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
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
# 格式: SERVICE_NAME:BINARY_NAME:SERVICE_DIR:PORT_ENV_VAR
# 如果 SERVICE_DIR 与 BINARY_NAME 的后缀一致，则直接使用
declare -A SERVICE_MAP=(
  [erp]="topems-erp:erp:ERP_PORT"
  [finance]="topems-finance:finance:FINANCE_PORT"
  [ai]="topems-ai:ai:AI_PORT"
  [hrm]="topems-hrm:hrm:HRM_PORT"
  [pm]="topems-pm:pm:PM_PORT"
  [crm]="topems-crm:crm:CRM_PORT"
  [mes]="topems-mes:mes:MES_PORT"
  [pdm]="topems-pdm:pdm:PDM_PORT"
  [scm]="topems-scm:scm:SCM_PORT"
  [wms]="topems-wms:wms:WMS_PORT"
  [srm]="topems-srm:srm:SRM_PORT"
  [qms]="topems-qms:qms:QMS_PORT"
  [lims]="topems-lims:lims:LIMS_PORT"
  [ehs]="topems-ehs:ehs:EHS_PORT"
  [rd]="topems-rd:rd:RD_PORT"
  [bi]="topems-analytics:analytics:BI_PORT"
  [analytics]="topems-analytics:analytics:BI_PORT"
  [portal]="topems-portal:portal:PORTAL_PORT"
  [mobile]="topems-mobile:mobile:MOBILE_PORT"
  [gis]="topems-gis:gis:GIS_PORT"
  [integration]="topems-integration:integration:INTEGRATION_PORT"
  [communication]="topems-communication:communication:COMMUNICATION_PORT"
  [billing]="topems-billing:billing:BILLING_PORT"
  [ticket]="topems-ticket:ticket:TICKET_PORT"
  [feedback]="topems-feedback:feedback:FEEDBACK_PORT"
  [search]="topems-search:search:SEARCH_PORT"
  [lowcode]="topems-lowcode:lowcode:LOWCODE_PORT"
  [master-data]="topems-master-data:master-data:MASTER_DATA_PORT"
  [tms]="topems-tms:tms:TMS_PORT"
  [aps]="topems-aps:aps:APS_PORT"
)

MAPPING="${SERVICE_MAP[$SERVICE_NAME]:-}"
if [[ -z "$MAPPING" ]]; then
  err "未知服务: $SERVICE_NAME"
  err "可用服务: ${!SERVICE_MAP[*]}"
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
