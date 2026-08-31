#!/usr/bin/env bash
# ============================================================================
# ⚠️  DEPRECATED - 请使用 scripts/gen-service-config.py
# ============================================================================
# 本脚本的功能已被 gen-service-config.py 完全覆盖：
#   - scripts/services.conf 生成 → gen-service-config.py 从 config/services.yaml 直接生成
#   - deploy/docker/.env 生成    → gen-service-config.py 已支持
#
# 正确数据流：config/services.yaml（唯一信源）
#              → gen-service-config.py
#              → config/ports.env + scripts/services.conf + deploy/docker/.env
#
# 本脚本保留仅为向后兼容，新代码请使用：
#   python3 scripts/gen-service-config.py          # 生成所有下游配置
#   python3 scripts/gen-service-config.py --check  # 仅校验一致性
# ============================================================================
# TOPEMS 端口同步脚本 (P32-2 / V66.2)
# V66.2 Shared Bootstrap V2 (28/28 = 100%) 端口单一信源
#   所有服务 main.rs 通过 ServiceConfig + port_env_var 解析对应 *_PORT 变量，
#   与 config/ports.env 保持严格一致。任何端口变更都应在此文件中修改
#   后运行 bash scripts/sync-ports.sh 自动广播。
# 从 config/ports.env（单一信源）生成下游配置文件：
#   1. scripts/services.conf      - 服务启动配置（topems.sh 使用）
#   2. deploy/docker/.env          - Docker Compose 端口变量（自动加载）
#
# 幂等运行：内容未变时不写文件，避免产生无意义的 diff。
# 用法: bash scripts/sync-ports.sh [--check]
#   --check  仅校验一致性，不写文件；不一致时以非 0 退出
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PORTS_ENV="$PROJECT_ROOT/config/ports.env"
SERVICES_CONF="$SCRIPT_DIR/services.conf"
DOCKER_ENV="$PROJECT_ROOT/deploy/docker/.env"

CHECK_ONLY=false
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=true
fi

# ----------------------------------------------------------------------------
# 校验 ports.env 存在
# ----------------------------------------------------------------------------
if [ ! -f "$PORTS_ENV" ]; then
  echo "ERROR: $PORTS_ENV 不存在" >&2
  exit 1
fi

# ----------------------------------------------------------------------------
# 从 ports.env 读取端口值
# 用法: get_port <ENV_KEY> <FALLBACK>
# ----------------------------------------------------------------------------
get_port() {
  local key="$1"
  local fallback="$2"
  local value
  value=$(grep -E "^${key}=" "$PORTS_ENV" 2>/dev/null | tail -1 | cut -d'=' -f2 | tr -d '[:space:]' || true)
  if [ -z "$value" ]; then
    echo "$fallback"
  else
    echo "$value"
  fi
}

# ============================================================================
# 1. 生成 scripts/services.conf
#    格式: 服务名 服务路径 二进制名 端口
#    端口列从 ports.env 读取，其余为静态元数据
# ============================================================================
generate_services_conf() {
  cat <<EOF
# TOPEMS 统一服务配置文件 (由 scripts/sync-ports.sh 从 config/ports.env 生成)
# 格式: 服务名 服务路径 二进制名 端口
#
# 架构说明:
# - unified-core (端口 8000): 平台核心，内含 iam/doc/flow/file 等模块
# - monitor (端口 8095): V68.1 从 unified-core 拆分的独立监控服务 (alerts/metrics/slo)
# - plugin-registry (端口 8096): V68.1 从 unified-core 拆分的独立插件注册服务
# - communication/ticket/feedback/search: 从 unified-core 外迁的独立进程 (8082-8090)
# - bi (analytics): 含原 report 报表功能
#
# 核心服务 (必须先启动): iam (unified-core)
#
# 端口来源: config/ports.env (单一信源)
# 二进制名来源于各服务的 Cargo.toml
# 端口分配规则:
#   8000-8009 核心服务 (Core)
#   8010-8019 经营管理 (ERP)
#   8020-8029 协同办公 (Collab)
#   8030-8039 生产制造 (Mfg)
#   8040-8049 供应链 (SCM)
#   8050-8059 质量/研发 (Q/RD)
#   8060-8069 数据分析/门户 (Analytics)
#   8070-8079 基础设施 (Infra)
# 最后更新: $(date +%Y-%m-%d)

# 平台核心服务 (unified-core 包含 iam, doc, flow, file; communication 模块保留兼容)
iam         svc/unified-core       topems-unified-core        $(get_port IAM_PORT 8000)
pm          svc/pm                 topems-pm                   $(get_port PM_PORT 8023)
erp         svc/erp                topems-erp                  $(get_port ERP_PORT 8010)
finance     svc/finance            topems-finance              $(get_port FINANCE_PORT 8011)
ai          svc/ai                 topems-ai                   $(get_port AI_PORT 8013)
hrm         svc/hrm                topems-hrm                  $(get_port HRM_PORT 8020)
crm         svc/crm                topems-crm                  $(get_port CRM_PORT 8029)

# 生产制造服务
mes         svc/mes                topems-mes                  $(get_port MES_PORT 8030)
pdm         svc/pdm                topems-pdm                  $(get_port PDM_PORT 8031)

# 供应链服务
scm         svc/scm                topems-scm                  $(get_port SCM_PORT 8040)
wms         svc/wms                topems-wms                  $(get_port WMS_PORT 8041)
srm         svc/srm                topems-srm                  $(get_port SRM_PORT 8042)

# 质量/研发服务
qms         svc/qms                topems-qms                  $(get_port QMS_PORT 8050)
lims        svc/lims               topems-lims                 $(get_port LIMS_PORT 8051)
ehs         svc/ehs                topems-ehs                  $(get_port EHS_PORT 8052)
rd          svc/rd                 topems-rd                   $(get_port RD_PORT 8053)

# 数据分析/门户服务
# NOTE: report 功能已整合到 bi 服务(topems-analytics)中，不再需要单独端口
bi          svc/analytics          topems-analytics           $(get_port BI_PORT 8060)
portal      svc/portal             topems-portal               $(get_port PORTAL_PORT 8063)

# 基础设施服务
mobile      svc/mobile             topems-mobile               $(get_port MOBILE_PORT 8070)
gis         svc/gis                topems-gis                  $(get_port GIS_PORT 8071)
integration svc/integration        topems-integration           $(get_port INTEGRATION_PORT 8072)

# 扩展服务 (8082-8096，从 unified-core 外迁为独立进程)
search      svc/search             topems-search               $(get_port SEARCH_PORT 8082)
communication svc/communication    topems-communication         $(get_port COMMUNICATION_PORT 8084)
ticket      svc/ticket             topems-ticket               $(get_port TICKET_PORT 8086)
# [V2026.08 已合并] feedback 服务已合并至 ticket（customer_feedback 类型），原端口 8087 停用
# [V2026.08 已移除] lowcode 空壳占位服务（原端口 8088）
master-data svc/master-data        topems-master-data          $(get_port MASTER_DATA_PORT 8090)
# V68.1 拆分服务 (8095-8096，从 unified-core 独立为单独进程)
monitor     svc/monitor            topems-monitor              $(get_port MONITOR_PORT 8095)
plugin-registry svc/plugin-registry topems-plugin-registry    $(get_port PLUGIN_REGISTRY_PORT 8096)

# 核心服务列表 (必须先启动)
CORE_SERVICES=iam
EOF
}

# ============================================================================
# 2. 生成 deploy/docker/.env
#    Docker Compose 自动加载同目录下的 .env 文件，用于 \${VAR:-default} 插值
# ============================================================================
generate_docker_env() {
  cat <<EOF
# TOPEMS Docker Compose 端口变量 (由 scripts/sync-ports.sh 从 config/ports.env 生成)
# 此文件已在本目录 .gitignore 中忽略，请勿提交。
# 单一信源: config/ports.env
# 最后更新: $(date +%Y-%m-%d)

# 业务服务端口
CORE_PORT=$(get_port CORE_PORT 8000)
IAM_PORT=$(get_port IAM_PORT 8000)
DOC_PORT=$(get_port DOC_PORT 8000)
FILE_PORT=$(get_port FILE_PORT 8000)
FLOW_PORT=$(get_port FLOW_PORT 8000)
MONITOR_PORT=$(get_port MONITOR_PORT 8095)
PLUGIN_REGISTRY_PORT=$(get_port PLUGIN_REGISTRY_PORT 8096)
COMMUNICATION_PORT=$(get_port COMMUNICATION_PORT 8084)
SEARCH_PORT=$(get_port SEARCH_PORT 8082)
TICKET_PORT=$(get_port TICKET_PORT 8086)
# [V2026.08 已合并] feedback 服务已合并至 ticket（原 FEEDBACK_PORT 8087 停用）
# [V2026.08 已移除] lowcode 空壳占位服务（原端口 8088）
ERP_PORT=$(get_port ERP_PORT 8010)
FINANCE_PORT=$(get_port FINANCE_PORT 8011)
AI_PORT=$(get_port AI_PORT 8013)
HRM_PORT=$(get_port HRM_PORT 8020)
PM_PORT=$(get_port PM_PORT 8023)
CRM_PORT=$(get_port CRM_PORT 8029)
MES_PORT=$(get_port MES_PORT 8030)
PDM_PORT=$(get_port PDM_PORT 8031)
SCM_PORT=$(get_port SCM_PORT 8040)
WMS_PORT=$(get_port WMS_PORT 8041)
SRM_PORT=$(get_port SRM_PORT 8042)
QMS_PORT=$(get_port QMS_PORT 8050)
LIMS_PORT=$(get_port LIMS_PORT 8051)
EHS_PORT=$(get_port EHS_PORT 8052)
RD_PORT=$(get_port RD_PORT 8053)
BI_PORT=$(get_port BI_PORT 8060)
PORTAL_PORT=$(get_port PORTAL_PORT 8063)
MASTER_DATA_PORT=$(get_port MASTER_DATA_PORT 8090)
MOBILE_PORT=$(get_port MOBILE_PORT 8070)
GIS_PORT=$(get_port GIS_PORT 8071)
INTEGRATION_PORT=$(get_port INTEGRATION_PORT 8072)

# 基础设施端口
POSTGRES_PORT=$(get_port POSTGRES_PORT 5432)
REDIS_PORT=$(get_port REDIS_PORT 6379)
OLLAMA_PORT=$(get_port OLLAMA_PORT 11434)

# 前端与网关
WEB_PORT=$(get_port WEB_PORT 3000)
GATEWAY_PORT=$(get_port GATEWAY_PORT 8080)
EOF
}

# ============================================================================
# 写文件辅助：内容未变时跳过（幂等）
# ============================================================================
write_if_changed() {
  local target="$1"
  local new_content="$2"

  if [ ! -f "$target" ]; then
    printf '%s\n' "$new_content" > "$target"
    echo "  已创建: $target"
    return 0
  fi

  local old_content
  old_content=$(cat "$target")
  if [ "$old_content" = "$new_content" ]; then
    echo "  无变化: $target"
    return 0
  fi

  printf '%s\n' "$new_content" > "$target"
  echo "  已更新: $target"
  return 0
}

# ============================================================================
# 主流程
# ============================================================================
main() {
  echo "TOPEMS 端口同步 (source: config/ports.env)"
  echo ""

  # P0-R4 治理：先校验 plugin.yaml 与 services.yaml/ports.env/main.rs 一致性
  echo "校验 plugin.yaml 单一信源一致性:"
  if python3 "$SCRIPT_DIR/validate-plugin-config.py" --check >/dev/null 2>&1; then
    echo "  ✓ plugin.yaml 与下游配置一致"
  else
    echo "  ✗ plugin.yaml 与下游配置不一致，请先运行: python3 scripts/validate-plugin-config.py" >&2
    python3 "$SCRIPT_DIR/validate-plugin-config.py" --check >&2 2>&1 || true
    exit 1
  fi
  echo ""

  local services_conf_content docker_env_content
  services_conf_content=$(generate_services_conf)
  docker_env_content=$(generate_docker_env)

  # P1-2: 校验 services.yaml 与 ports.env 的端口一致性
  echo "校验 config/services.yaml 端口一致性:"
  local yaml_inconsistent=false
  while IFS='|' read -r env_var yaml_port; do
    [ -z "$env_var" ] && continue
    local env_port
    env_port=$(get_port "$env_var" "")
    if [ -n "$env_port" ] && [ "$env_port" != "$yaml_port" ]; then
      echo "  DIFF: $env_var ports.env=$env_port services.yaml=$yaml_port" >&2
      yaml_inconsistent=true
    fi
  done < <(python3 -c "
import yaml, sys
with open('$PROJECT_ROOT/config/services.yaml') as f:
    data = yaml.safe_load(f)
for group in data.get('service_groups', {}).values():
    for svc in group:
        env = svc.get('env_var', '')
        port = svc.get('port', '')
        if env and port:
            print(f'{env}|{port}')
for svc in data.get('virtual_services', []):
    env = svc.get('env_var', '')
    port = svc.get('port', '')
    if env and port:
        print(f'{env}|{port}')
for key, info in data.get('special_ports', {}).items():
    env = info.get('env_var', '')
    port = info.get('port', '')
    if env and port:
        print(f'{env}|{port}')
" 2>/dev/null || true)

  if $yaml_inconsistent; then
    echo "  请更新 config/services.yaml 或 config/ports.env 以保持一致" >&2
    if $CHECK_ONLY; then
      exit 1
    fi
  else
    echo "  ✓ services.yaml 与 ports.env 端口一致"
  fi
  echo ""

  if $CHECK_ONLY; then
    # 校验模式：比较内容，不一致则报错
    local has_diff=false
    if [ ! -f "$SERVICES_CONF" ] || [ "$(cat "$SERVICES_CONF")" != "$services_conf_content" ]; then
      echo "DIFF: $SERVICES_CONF 与 ports.env 不一致" >&2
      has_diff=true
    fi
    if [ ! -f "$DOCKER_ENV" ] || [ "$(cat "$DOCKER_ENV")" != "$docker_env_content" ]; then
      echo "DIFF: $DOCKER_ENV 与 ports.env 不一致" >&2
      has_diff=true
    fi
    if $has_diff; then
      echo "请运行 bash scripts/sync-ports.sh 以同步" >&2
      exit 1
    fi
    echo "✓ 所有下游配置与 ports.env 一致"
    exit 0
  fi

  echo "生成 scripts/services.conf:"
  write_if_changed "$SERVICES_CONF" "$services_conf_content"

  echo "生成 deploy/docker/.env:"
  write_if_changed "$DOCKER_ENV" "$docker_env_content"

  echo ""
  echo "✓ 同步完成"
}

main
