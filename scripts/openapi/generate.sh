#!/usr/bin/env bash
# OpenAPI 统一文档生成脚本
#
# 功能：从所有已暴露 /api-docs/openapi.json 端点的服务聚合生成统一的 openapi.yaml
#       可选地（--with-types）继续调用 gen-types.mjs 生成前端 TypeScript 类型，
#       完成整条「服务 OpenAPI → 聚合 → TS 类型」流水线。
#
# 用法：
#   ./scripts/openapi/generate.sh                  # 从运行中的服务抓取
#   ./scripts/openapi/generate.sh --offline         # 仅生成骨架（服务未运行时）
#   ./scripts/openapi/generate.sh --service crm     # 仅抓取单个服务
#   ./scripts/openapi/generate.sh --with-types      # 聚合后继续生成 TS 类型
#   ./scripts/openapi/generate.sh --with-types --offline   # 离线骨架 + TS 类型（从手写 yaml）
#   ./scripts/openapi/generate.sh --timeout 5       # 设置单个服务抓取超时时间（秒）
#   ./scripts/openapi/generate.sh --extract         # 通过 cargo test 提取各服务 spec（无需启动服务）
#   ./scripts/openapi/generate.sh --extract --with-types   # 提取 + 聚合 + 生成 TS 类型
#
# 依赖：curl, python3 (PyYAML 可选, 用于 YAML 输出)
#       --extract 额外依赖：cargo（在 monorepo 根执行 cargo test 提取 spec）
#       --extract 聚合使用 scripts/openapi/aggregate.py（纯 python3，无第三方依赖）
#       --with-types 额外依赖：node + openapi-typescript（已在 packages/shared-types devDeps）
#
# 输出：
#   docs/api/openapi-aggregated.json  — 聚合后的统一文档 (JSON 格式，主输出)
#   docs/api/openapi-aggregated.yaml  — 聚合后的统一文档 (YAML 格式，需 PyYAML)
#   docs/api/services-openapi-status.md — 各服务 OpenAPI 覆盖状态报告
#   （--with-types 时）packages/shared-types/src/generated/openapi.d.ts — TS 类型

set -euo pipefail

# ==============================================
# 颜色输出辅助函数
# ==============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/docs/api"
mkdir -p "${OUTPUT_DIR}"

# ==============================================
# 服务清单
# ==============================================
# 格式: service_name | port | openapi_endpoint | service_group
# 端口与 config/ports.env、config/services.yaml 保持严格一致
# 服务列表权威来源: config/services.yaml + svc/ 目录下的实际服务

SERVICES=(
  # 核心服务 (8000-8009)
  "unified-core|8000|/api-docs/openapi.json|core"
  # 经营管理服务 (8010-8019)
  "erp|8010|/api-docs/openapi.json|erp"
  "finance|8011|/api-docs/openapi.json|erp"
  "ai|8013|/api-docs/openapi.json|erp"
  # 协同办公服务 (8020-8029)
  "hrm|8020|/api-docs/openapi.json|collaboration"
  "pm|8023|/api-docs/openapi.json|collaboration"
  "crm|8029|/api-docs/openapi.json|collaboration"
  # 生产制造服务 (8030-8039)
  "mes|8030|/api-docs/openapi.json|manufacturing"
  "pdm|8031|/api-docs/openapi.json|manufacturing"
  # 供应链服务 (8040-8049)
  "scm|8040|/api-docs/openapi.json|supply-chain"
  "wms|8041|/api-docs/openapi.json|supply-chain"
  "srm|8042|/api-docs/openapi.json|supply-chain"
  # 质量/研发服务 (8050-8059)
  "qms|8050|/api-docs/openapi.json|quality-rd"
  "lims|8051|/api-docs/openapi.json|quality-rd"
  "ehs|8052|/api-docs/openapi.json|quality-rd"
  "rd|8053|/api-docs/openapi.json|quality-rd"
  # 数据分析/门户服务 (8060-8069)
  "bi|8060|/api-docs/openapi.json|analytics"
  "portal|8063|/api-docs/openapi.json|analytics"
  # 基础设施服务 (8070-8079)
  "mobile|8070|/api-docs/openapi.json|infrastructure"
  "gis|8071|/api-docs/openapi.json|infrastructure"
  "integration|8072|/api-docs/openapi.json|infrastructure"
  # 扩展服务 (8080-8089)
  "billing|8080|/api-docs/openapi.json|billing"
  "ticket|8081|/api-docs/openapi.json|billing"
  # 主数据服务 (8090)
  "master-data|8090|/api-docs/openapi.json|master-data"
)

# 尚未暴露 OpenAPI 端点的服务（记录用于状态报告和后续追踪）
# 这些服务存在于 svc/ 目录但未实现 OpenAPI 端点
MISSING_SERVICES=(
  "search|8082|search"
  "feedback|8083|feedback"
  "communication|8084|communication"
)

# 默认超时配置
CONNECT_TIMEOUT=3
MAX_TIMEOUT=10

OFFLINE=false
SINGLE_SERVICE=""
WITH_TYPES=false
EXTRACT=false

# --extract 模式下通过 cargo test extract_openapi_spec 提取 spec 的服务列表。
# 这些服务已在源码中实现了 extract_openapi_spec 测试（将 spec 写到 /tmp/topems-<svc>-openapi.json）。
EXTRACT_SERVICES=("finance" "mes" "master-data" "qms")

print_help() {
  cat << 'EOF'
用法: ./scripts/openapi/generate.sh [选项]

选项:
  --offline              离线模式，仅生成骨架（服务未运行时）
  --service <name>       仅抓取单个服务
  --with-types           聚合后继续生成 TypeScript 类型
  --no-types             不生成 TypeScript 类型（默认）
  --extract              通过 cargo test extract_openapi_spec 提取各服务 spec（无需启动服务）
  --extract-services <a,b,c>  覆盖 --extract 默认服务列表（默认: finance,mes,master-data,qms）
  --timeout <seconds>    单个服务抓取超时时间（默认: 10秒）
  --connect-timeout <s>  连接超时时间（默认: 3秒）
  -h, --help             显示帮助信息

示例:
  ./scripts/openapi/generate.sh                          # 从运行中的服务抓取
  ./scripts/openapi/generate.sh --offline                # 仅生成骨架
  ./scripts/openapi/generate.sh --service crm            # 仅抓取 CRM 服务
  ./scripts/openapi/generate.sh --with-types             # 聚合 + 生成 TS 类型
  ./scripts/openapi/generate.sh --with-types --offline   # 离线 + TS 类型（从手写 yaml）
  ./scripts/openapi/generate.sh --timeout 15             # 设置超时为 15 秒
  ./scripts/openapi/generate.sh --extract                # cargo test 提取 spec 后聚合（无需启动服务）
  ./scripts/openapi/generate.sh --extract --with-types   # 提取 + 聚合 + 生成 TS 类型
  ./scripts/openapi/generate.sh --extract-services finance,mes  # 仅提取指定服务
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --offline) OFFLINE=true; shift ;;
    --service) SINGLE_SERVICE="$2"; shift 2 ;;
    --with-types) WITH_TYPES=true; shift ;;
    --no-types) WITH_TYPES=false; shift ;;
    --extract) EXTRACT=true; shift ;;
    --extract-services)
      IFS=',' read -r -a EXTRACT_SERVICES <<< "$2"
      shift 2
      ;;
    --timeout) MAX_TIMEOUT="$2"; shift 2 ;;
    --connect-timeout) CONNECT_TIMEOUT="$2"; shift 2 ;;
    -h|--help) print_help; exit 0 ;;
    *) log_error "Unknown option: $1"; echo ""; print_help; exit 1 ;;
  esac
done

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "=========================================="
echo "  TOPEMS OpenAPI 统一文档生成"
echo "=========================================="
echo ""
log_info "输出目录: ${OUTPUT_DIR}"
log_info "模式: $([[ "${OFFLINE}" == "true" ]] && echo "离线" || echo "在线抓取")"
log_info "超时: 连接=${CONNECT_TIMEOUT}s, 总超时=${MAX_TIMEOUT}s"
echo ""

# ==============================================
# --extract 模式：通过 cargo test 提取 spec，无需启动服务
# 流程：cargo test 提取 → aggregate.py 聚合 → （可选）gen-types.mjs
# ==============================================
extract_specs() {
  local services=("$@")
  local extract_ok=0
  local extract_fail=0

  if ! command -v cargo >/dev/null 2>&1; then
    log_error "未找到 cargo，无法执行 --extract 模式"
    exit 1
  fi

  log_info ">>> 通过 cargo test extract_openapi_spec 提取各服务 spec..."
  echo ""

  # 清理可能残留的旧 spec 文件，避免聚合到过期数据
  rm -f /tmp/topems-*-openapi.json 2>/dev/null || true

  for svc in "${services[@]}"; do
    local pkg="topems-${svc}"
    log_info "  ${pkg} — cargo test extract_openapi_spec"
    if cargo test -p "${pkg}" --bin "${pkg}" extract_openapi_spec -- --nocapture >/dev/null 2>&1; then
      local spec_file="/tmp/topems-${svc}-openapi.json"
      if [[ -f "${spec_file}" ]]; then
        local stats
        stats=$(OUTFILE="${spec_file}" python3 -c "
import json, os
with open(os.environ['OUTFILE']) as f:
    doc = json.load(f)
paths = len(doc.get('paths', {}))
schemas = len(doc.get('components', {}).get('schemas', {}))
print(f'{paths}|{schemas}')
" 2>/dev/null || echo "0|0")
        local path_count="${stats%%|*}"
        local schema_count="${stats##*|}"
        log_success "  ${pkg} — ${path_count} paths, ${schema_count} schemas"
        extract_ok=$((extract_ok + 1))
      else
        log_error "  ${pkg} — 测试通过但未生成 ${spec_file}"
        extract_fail=$((extract_fail + 1))
      fi
    else
      log_error "  ${pkg} — cargo test 失败"
      extract_fail=$((extract_fail + 1))
    fi
  done

  echo ""
  log_info "提取完成: 成功 ${extract_ok}，失败 ${extract_fail}"

  if [[ ${extract_ok} -eq 0 ]]; then
    log_error "无成功提取的 spec，终止聚合"
    exit 1
  fi

  # 调用 aggregate.py 聚合 /tmp/topems-*-openapi.json
  local agg_script="${SCRIPT_DIR}/aggregate.py"
  if [[ ! -f "${agg_script}" ]]; then
    log_error "未找到聚合脚本: ${agg_script}"
    exit 1
  fi

  log_info ">>> 聚合 spec (aggregate.py)..."
  if python3 "${agg_script}" --input-dir /tmp --output "${OUTPUT_DIR}/openapi-aggregated.json"; then
    log_success "聚合文档已生成: ${OUTPUT_DIR}/openapi-aggregated.json"
  else
    log_error "aggregate.py 执行失败"
    exit 1
  fi

  # 可选：生成 YAML（若 PyYAML 可用）
  OUTPUT_DIR="${OUTPUT_DIR}" python3 -c "
import json, os
output_dir = os.environ['OUTPUT_DIR']
json_path = os.path.join(output_dir, 'openapi-aggregated.json')
with open(json_path) as f:
    doc = json.load(f)
try:
    import yaml
    yaml_path = os.path.join(output_dir, 'openapi-aggregated.yaml')
    with open(yaml_path, 'w') as f:
        yaml.dump(doc, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    print(f'  [OK]  YAML: {yaml_path}')
except ImportError:
    print('  [WARN] PyYAML 未安装，跳过 YAML 输出。安装: pip3 install pyyaml')
" 2>/dev/null || log_warn "YAML 生成跳过"

  # 可选：继续生成前端 TypeScript 类型
  if [[ "${WITH_TYPES}" == "true" ]]; then
    echo ""
    log_info ">>> 生成 TypeScript 类型..."
    GEN_TYPES_SCRIPT="${SCRIPT_DIR}/gen-types.mjs"
    if [[ ! -f "${GEN_TYPES_SCRIPT}" ]]; then
      log_warn "未找到 ${GEN_TYPES_SCRIPT}，跳过类型生成。"
    elif ! command -v node >/dev/null 2>&1; then
      log_warn "未找到 node，跳过类型生成。"
    else
      if node "${GEN_TYPES_SCRIPT}" --aggregated; then
        log_success "TypeScript 类型已生成"
      else
        log_warn "类型生成失败（聚合产物已保留，可稍后单独运行 node ${GEN_TYPES_SCRIPT})"
      fi
    fi
  fi

  echo ""
  echo "=========================================="
  echo "  --extract 模式完成"
  echo "=========================================="
  echo ""
  log_success "提取成功: ${extract_ok} 个服务"
  if [[ ${extract_fail} -gt 0 ]]; then
    log_error "提取失败: ${extract_fail} 个服务"
  fi
  log_info "输出文件:"
  echo "  - ${OUTPUT_DIR}/openapi-aggregated.json"
  echo "  - ${OUTPUT_DIR}/openapi-aggregated.yaml (如 PyYAML 可用)"
  if [[ "${WITH_TYPES}" == "true" ]]; then
    echo "  - packages/shared-types/src/generated/openapi.d.ts (TS 类型)"
  fi
  echo ""
  exit 0
}

# --extract 模式提前分发：跳过后续 curl 抓取流程
if [[ "${EXTRACT}" == "true" ]]; then
  log_info "模式: --extract (cargo test 提取，无需启动服务)"
  log_info "目标服务: ${EXTRACT_SERVICES[*]}"
  echo ""
  extract_specs "${EXTRACT_SERVICES[@]}"
fi

# 初始化聚合文档骨架
AGGREGATED_JSON="${TMP_DIR}/aggregated.json"
TMP_DIR="${TMP_DIR}" python3 -c "
import json, os
skeleton = {
    'openapi': '3.0.3',
    'info': {
        'title': 'TOPEMS API',
        'version': '14.0.0',
        'description': 'TOPEMS 企业级 SaaS 平台统一 API 文档（自动聚合生成）',
    },
    'paths': {},
    'components': {'schemas': {}},
}
out = os.path.join(os.environ['TMP_DIR'], 'aggregated.json')
with open(out, 'w') as f:
    json.dump(skeleton, f, indent=2, ensure_ascii=False)
"

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
STATUS_REPORT="${TMP_DIR}/status.md"
FAILED_SERVICES=()
SUCCESSFUL_SERVICES=()

echo "# TOPEMS 服务 OpenAPI 状态报告" > "${STATUS_REPORT}"
echo "" >> "${STATUS_REPORT}"
echo "_生成时间: $(date -u +"%Y-%m-%dT%H:%M:%SZ")_" >> "${STATUS_REPORT}"
echo "" >> "${STATUS_REPORT}"
echo "## 概览" >> "${STATUS_REPORT}"
echo "" >> "${STATUS_REPORT}"
echo "| 指标 | 数量 |" >> "${STATUS_REPORT}"
echo "|------|------|" >> "${STATUS_REPORT}"

echo ""
log_info ">>> 抓取服务 OpenAPI 文档..."
echo ""

fetch_service_openapi() {
  local svc="$1"
  local port="$2"
  local endpoint="$3"
  local group="$4"
  local url="http://localhost:${port}${endpoint}"
  local outfile="${TMP_DIR}/${svc}.json"

  if [[ "${OFFLINE}" == "true" ]]; then
    log_warn "  ${svc} — 跳过 (离线模式)"
    echo "| ${svc} | ${port} | ${endpoint} | ⏭ 跳过(离线) | - | - | ${group} |" >> "${STATUS_REPORT}"
    return 2
  fi

  if ! curl -sf --connect-timeout "${CONNECT_TIMEOUT}" --max-time "${MAX_TIMEOUT}" "${url}" -o "${outfile}" 2>/dev/null; then
    log_error "  ${svc} — 无法连接 ${url}"
    echo "| ${svc} | ${port} | ${endpoint} | ❌ 无法连接 | - | - | ${group} |" >> "${STATUS_REPORT}"
    FAILED_SERVICES+=("${svc}")
    return 1
  fi

  if ! python3 -c "import json; json.load(open('${outfile}'))" 2>/dev/null; then
    log_error "  ${svc} — 返回无效 JSON"
    echo "| ${svc} | ${port} | ${endpoint} | ❌ 无效JSON | - | - | ${group} |" >> "${STATUS_REPORT}"
    FAILED_SERVICES+=("${svc}")
    return 1
  fi

  local stats
  stats=$(OUTFILE="${outfile}" python3 -c "
import json, os
with open(os.environ['OUTFILE']) as f:
    doc = json.load(f)
paths = len(doc.get('paths', {}))
schemas = len(doc.get('components', {}).get('schemas', {}))
print(f'{paths}|{schemas}')
" 2>/dev/null || echo "0|0")

  local path_count="${stats%%|*}"
  local schema_count="${stats##*|}"

  log_success "  ${svc} — ${path_count} paths, ${schema_count} schemas"
  echo "| ${svc} | ${port} | ${endpoint} | ✅ 成功 | ${path_count} | ${schema_count} | ${group} |" >> "${STATUS_REPORT}"
  SUCCESSFUL_SERVICES+=("${svc}")
  return 0
}

TOTAL_SERVICES=${#SERVICES[@]}

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r svc port endpoint group <<< "${entry}"
  if [[ -n "${SINGLE_SERVICE}" && "${svc}" != "${SINGLE_SERVICE}" ]]; then
    continue
  fi
  set +e
  fetch_service_openapi "${svc}" "${port}" "${endpoint}" "${group}"
  result=$?
  set -e
  case $result in
    0) SUCCESS_COUNT=$((SUCCESS_COUNT + 1)) ;;
    1) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    2) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
  esac
done

echo ""
log_info ">>> 记录未暴露 OpenAPI 的服务..."
if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
  for entry in "${MISSING_SERVICES[@]}"; do
    IFS='|' read -r svc port group <<< "${entry}"
    echo "| ${svc} | ${port} | (未暴露) | ⚠️ 未装配 | - | - | ${group} |" >> "${STATUS_REPORT}"
  done
  log_warn "  有 ${#MISSING_SERVICES[@]} 个服务未装配 OpenAPI 端点"
else
  log_success "  全部服务已暴露 OpenAPI 端点，无缺失"
fi

echo ""
log_info ">>> 聚合 OpenAPI 文档..."

# 用 Python 聚合所有成功抓取的 JSON
TMP_DIR="${TMP_DIR}" OUTPUT_DIR="${OUTPUT_DIR}" python3 << 'PYEOF'
import json
import os
import sys
from datetime import datetime, timezone

tmp_dir = os.environ.get('TMP_DIR', '/tmp')
aggregated_path = os.path.join(tmp_dir, 'aggregated.json')

with open(aggregated_path) as f:
    aggregated = json.load(f)

service_files = []
for fname in sorted(os.listdir(tmp_dir)):
    if fname == 'aggregated.json':
        continue
    if not fname.endswith('.json'):
        continue
    svc_name = fname.replace('.json', '')
    svc_path = os.path.join(tmp_dir, fname)
    try:
        with open(svc_path) as f:
            svc_doc = json.load(f)
        service_files.append((svc_name, svc_doc))
    except (json.JSONDecodeError, IOError):
        print(f'  [WARN] 跳过无效的服务文件: {fname}', file=sys.stderr)

total_paths = 0
total_schemas = 0

for svc_name, svc_doc in service_files:
    svc_paths = svc_doc.get('paths', {})
    svc_schemas = svc_doc.get('components', {}).get('schemas', {})

    for path, methods in svc_paths.items():
        prefixed_path = path
        if not path.startswith(f'/{svc_name}') and not path.startswith('/api'):
            prefixed_path = f'/{svc_name}{path}'

        if prefixed_path not in aggregated['paths']:
            aggregated['paths'][prefixed_path] = {}

        for method, spec in methods.items():
            if method not in ('get', 'post', 'put', 'delete', 'patch'):
                continue
            if 'tags' not in spec:
                spec['tags'] = []
            if svc_name not in spec['tags']:
                spec['tags'].insert(0, svc_name)
            aggregated['paths'][prefixed_path][method] = spec
            total_paths += 1

    for schema_name, schema_def in svc_schemas.items():
        prefixed_schema = f'{svc_name}_{schema_name}' if schema_name not in aggregated['components']['schemas'] else schema_name
        if prefixed_schema not in aggregated['components']['schemas']:
            aggregated['components']['schemas'][prefixed_schema] = schema_def
            total_schemas += 1

aggregated['info']['description'] = (
    f'TOPEMS 企业级 SaaS 平台统一 API 文档（自动聚合生成）\n\n'
    f'聚合自 {len(service_files)} 个服务，共 {total_paths} 个端点、{total_schemas} 个 Schema。\n'
    f'生成时间: {datetime.now(timezone.utc).isoformat()}'
)

output_dir = os.environ.get('OUTPUT_DIR', '.')
json_path = os.path.join(output_dir, 'openapi-aggregated.json')
with open(json_path, 'w') as f:
    json.dump(aggregated, f, indent=2, ensure_ascii=False)
print(f'  [OK]  JSON: {json_path} ({total_paths} paths, {total_schemas} schemas)')

try:
    import yaml
    yaml_path = os.path.join(output_dir, 'openapi-aggregated.yaml')
    with open(yaml_path, 'w') as f:
        yaml.dump(aggregated, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    print(f'  [OK]  YAML: {yaml_path}')
except ImportError:
    print('  [WARN] PyYAML 未安装，跳过 YAML 输出。安装: pip3 install pyyaml')
PYEOF

# 生成完整的状态报告（先写概览，再写详情）
generate_status_report() {
  local report_path="$1"

  {
    echo "# TOPEMS 服务 OpenAPI 状态报告"
    echo ""
    echo "_生成时间: $(date -u +"%Y-%m-%dT%H:%M:%SZ")_"
    echo ""
    echo "## 概览"
    echo ""
    echo "| 指标 | 数量 |"
    echo "|------|------|"
    echo "| 总服务数 | ${TOTAL_SERVICES} |"
    echo "| ✅ 成功 | ${SUCCESS_COUNT} |"
    echo "| ❌ 失败 | ${FAIL_COUNT} |"
    echo "| ⏭ 跳过 | ${SKIP_COUNT} |"
    echo "| ⚠️ 未装配 | ${#MISSING_SERVICES[@]} |"
    echo ""
    echo "## 服务详情"
    echo ""
    echo "| 服务 | 端口 | OpenAPI 端点 | 状态 | 路径数 | Schema 数 | 分组 |"
    echo "|------|------|-------------|------|--------|-----------|------|"
  } > "${report_path}"

  # 追加详情（从已有的临时报告中提取详情部分追加到新报告）
  # 由于我们之前已经写了一部分，这里重新生成完整报告
  local tmp_details="${TMP_DIR}/details.md"
  echo "" > "${tmp_details}"

  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r svc port endpoint group <<< "${entry}"
    local outfile="${TMP_DIR}/${svc}.json"
    local status="❓未知"
    local path_count="-"
    local schema_count="-"

    if [[ "${OFFLINE}" == "true" ]]; then
      status="⏭ 跳过(离线)"
    elif [[ -f "${outfile}" ]]; then
      if python3 -c "import json; json.load(open('${outfile}'))" 2>/dev/null; then
        status="✅ 成功"
        local stats
        stats=$(OUTFILE="${outfile}" python3 -c "
import json, os
with open(os.environ['OUTFILE']) as f:
    doc = json.load(f)
paths = len(doc.get('paths', {}))
schemas = len(doc.get('components', {}).get('schemas', {}))
print(f'{paths}|{schemas}')
" 2>/dev/null || echo "0|0")
        path_count="${stats%%|*}"
        schema_count="${stats##*|}"
      else
        status="❌ 无效JSON"
      fi
    else
      status="❌ 无法连接"
    fi

    echo "| ${svc} | ${port} | ${endpoint} | ${status} | ${path_count} | ${schema_count} | ${group} |" >> "${tmp_details}"
  done

  # 追加未装配的服务
  for entry in "${MISSING_SERVICES[@]}"; do
    IFS='|' read -r svc port group <<< "${entry}"
    echo "| ${svc} | ${port} | (未暴露) | ⚠️ 未装配 | - | - | ${group} |" >> "${tmp_details}"
  done

  cat "${tmp_details}" >> "${report_path}"
}

generate_status_report "${OUTPUT_DIR}/services-openapi-status.md"
log_success "状态报告已生成: ${OUTPUT_DIR}/services-openapi-status.md"

# 可选：继续生成前端 TypeScript 类型（bash 调用 node 脚本，完成整条流水线）
if [[ "${WITH_TYPES}" == "true" ]]; then
  echo ""
  log_info ">>> 生成 TypeScript 类型..."
  GEN_TYPES_SCRIPT="${SCRIPT_DIR}/gen-types.mjs"
  if [[ ! -f "${GEN_TYPES_SCRIPT}" ]]; then
    log_warn "未找到 ${GEN_TYPES_SCRIPT}，跳过类型生成。"
  elif ! command -v node >/dev/null 2>&1; then
    log_warn "未找到 node，跳过类型生成。"
  else
    GEN_ARGS=""
    if [[ "${OFFLINE}" != "true" && -f "${OUTPUT_DIR}/openapi-aggregated.json" && "${SUCCESS_COUNT}" -gt 0 ]]; then
      GEN_ARGS="--aggregated"
    fi
    if node "${GEN_TYPES_SCRIPT}" ${GEN_ARGS}; then
      log_success "TypeScript 类型已生成"
    else
      log_warn "类型生成失败（聚合产物已保留，可稍后单独运行 node ${GEN_TYPES_SCRIPT})"
    fi
  fi
fi

echo ""
echo "=========================================="
echo "  生成完成"
echo "=========================================="
echo ""
log_success "成功: ${SUCCESS_COUNT} 个服务"
if [[ ${FAIL_COUNT} -gt 0 ]]; then
  log_error "失败: ${FAIL_COUNT} 个服务"
  log_error "失败服务: ${FAILED_SERVICES[*]:-}"
fi
if [[ ${SKIP_COUNT} -gt 0 ]]; then
  log_warn "跳过: ${SKIP_COUNT} 个服务 (离线模式)"
fi
log_warn "未装配: ${#MISSING_SERVICES[@]} 个服务"
echo ""
log_info "输出文件:"
echo "  - ${OUTPUT_DIR}/openapi-aggregated.json"
echo "  - ${OUTPUT_DIR}/openapi-aggregated.yaml (如 PyYAML 可用)"
echo "  - ${OUTPUT_DIR}/services-openapi-status.md"
if [[ "${WITH_TYPES}" == "true" ]]; then
  echo "  - packages/shared-types/src/generated/openapi.d.ts (TS 类型)"
fi
echo ""
TOTAL_TARGET=$(( TOTAL_SERVICES + ${#MISSING_SERVICES[@]} ))
log_info "覆盖率: ${SUCCESS_COUNT}/${TOTAL_TARGET} 服务"
if [[ "${WITH_TYPES}" != "true" ]]; then
  echo ""
  log_info "提示: 加 --with-types 可同时生成前端 TS 类型"
  log_info "提示: 服务未运行时可用 --extract 通过 cargo test 提取 spec"
fi
