#!/usr/bin/env bash
# OpenAPI 统一文档生成脚本
#
# 功能：从所有已暴露 /api-docs/openapi.json 端点的服务聚合生成统一的 openapi.yaml
#
# 用法：
#   ./scripts/openapi/generate.sh                  # 从运行中的服务抓取
#   ./scripts/openapi/generate.sh --offline         # 仅生成骨架（服务未运行时）
#   ./scripts/openapi/generate.sh --service crm     # 仅抓取单个服务
#
# 依赖：curl, python3 (PyYAML), jq
#
# 输出：
#   docs/api/openapi-aggregated.yaml  — 聚合后的统一文档
#   docs/api/openapi-aggregated.json  — JSON 格式
#   docs/api/services-openapi-status.md — 各服务 OpenAPI 覆盖状态报告

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/docs/api"
mkdir -p "${OUTPUT_DIR}"

# 服务清单：service_name | port | openapi_endpoint
# 仅列出已确认暴露 /api-docs/openapi.json 的服务
SERVICES=(
  "erp|8010|/api-docs/openapi.json"
  "wms|8017|/api-docs/openapi.json"
  "hrm|8018|/api-docs/openapi.json"
  "pm|8019|/api-docs/openapi.json"
  "rd|8021|/api-docs/openapi.json"
  "scm|8023|/api-docs/openapi.json"
  "srm|8024|/api-docs/openapi.json"
  "gis|8026|/api-docs/openapi.json"
  "mes|8020|/api-docs/openapi.json"
  "monitor|8062|/api-docs/openapi.json"
  "crm|8029|/api-docs/openapi.json"
  "mobile|8064|/api-docs/openapi.json"
  "ai|8013|/api-docs/openapi.json"
  "unified-core|8000|/api-docs/openapi.json"
  "finance|8011|/api-docs/openapi.json"
  "doc|8012|/api-docs/openapi.json"
  "ehs|8025|/api-docs/openapi.json"
  "lims|8027|/api-docs/openapi.json"
  "qms|8028|/api-docs/openapi.json"
  "pdm|8022|/api-docs/openapi.json"
  "portal|8063|/api-docs/openapi.json"
  "analytics|8060|/api-docs/openapi.json"
  "integration|8050|/api-docs/openapi.json"
)

# 未暴露 OpenAPI 端点的服务（记录用于状态报告）
MISSING_SERVICES=()

OFFLINE=false
SINGLE_SERVICE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --offline) OFFLINE=true; shift ;;
    --service) SINGLE_SERVICE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "=========================================="
echo "  TOPEMS OpenAPI 统一文档生成"
echo "=========================================="
echo ""

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
STATUS_REPORT="${TMP_DIR}/status.md"

echo "| 服务 | 端口 | OpenAPI 端点 | 状态 | 路径数 | Schema 数 |" > "${STATUS_REPORT}"
echo "|------|------|-------------|------|--------|-----------|" >> "${STATUS_REPORT}"

fetch_service_openapi() {
  local svc="$1"
  local port="$2"
  local endpoint="$3"
  local url="http://localhost:${port}${endpoint}"
  local outfile="${TMP_DIR}/${svc}.json"

  if [[ "${OFFLINE}" == "true" ]]; then
    echo "  [SKIP] ${svc} (offline mode)"
    echo "| ${svc} | ${port} | ${endpoint} | ⏭ 跳过(离线) | - | - |" >> "${STATUS_REPORT}"
    return 1
  fi

  if ! curl -sf --connect-timeout 3 --max-time 10 "${url}" -o "${outfile}" 2>/dev/null; then
    echo "  [FAIL] ${svc} — 无法连接 ${url}"
    echo "| ${svc} | ${port} | ${endpoint} | ❌ 无法连接 | - | - |" >> "${STATUS_REPORT}"
    return 1
  fi

  # 验证 JSON 有效性
  if ! python3 -c "import json; json.load(open('${outfile}'))" 2>/dev/null; then
    echo "  [FAIL] ${svc} — 返回无效 JSON"
    echo "| ${svc} | ${port} | ${endpoint} | ❌ 无效JSON | - | - |" >> "${STATUS_REPORT}"
    return 1
  fi

  # 统计路径数和 Schema 数
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

  echo "  [OK]   ${svc} — ${path_count} paths, ${schema_count} schemas"
  echo "| ${svc} | ${port} | ${endpoint} | ✅ 成功 | ${path_count} | ${schema_count} |" >> "${STATUS_REPORT}"
  return 0
}

echo ">>> 抓取服务 OpenAPI 文档..."
echo ""

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r svc port endpoint <<< "${entry}"
  if [[ -n "${SINGLE_SERVICE}" && "${svc}" != "${SINGLE_SERVICE}" ]]; then
    continue
  fi
  if fetch_service_openapi "${svc}" "${port}" "${endpoint}"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
echo ">>> 记录未暴露 OpenAPI 的服务..."
if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
  for entry in "${MISSING_SERVICES[@]}"; do
    IFS='|' read -r svc port <<< "${entry}"
    echo "| ${svc} | ${port} | (未暴露) | ⚠️ 未装配 | - | - |" >> "${STATUS_REPORT}"
  done
else
  echo "  (全部服务已暴露 OpenAPI 端点，无缺失)"
fi

echo ""
echo ">>> 聚合 OpenAPI 文档..."

# 用 Python 聚合所有成功抓取的 JSON
TMP_DIR="${TMP_DIR}" OUTPUT_DIR="${OUTPUT_DIR}" python3 << 'PYEOF'
import json
import os
import sys

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
        pass

total_paths = 0
total_schemas = 0

for svc_name, svc_doc in service_files:
    svc_paths = svc_doc.get('paths', {})
    svc_schemas = svc_doc.get('components', {}).get('schemas', {})

    # 为每个路径添加服务前缀，避免冲突
    for path, methods in svc_paths.items():
        # 在路径前添加服务标识（如果尚未包含）
        prefixed_path = path
        if not path.startswith(f'/{svc_name}') and not path.startswith('/api'):
            prefixed_path = f'/{svc_name}{path}'

        if prefixed_path not in aggregated['paths']:
            aggregated['paths'][prefixed_path] = {}

        for method, spec in methods.items():
            if method not in ('get', 'post', 'put', 'delete', 'patch'):
                continue
            # 添加服务标签
            if 'tags' not in spec:
                spec['tags'] = []
            if svc_name not in spec['tags']:
                spec['tags'].insert(0, svc_name)
            aggregated['paths'][prefixed_path][method] = spec
            total_paths += 1

    # 合并 schemas，添加服务前缀避免命名冲突
    for schema_name, schema_def in svc_schemas.items():
        prefixed_schema = f'{svc_name}_{schema_name}' if schema_name not in aggregated['components']['schemas'] else schema_name
        if prefixed_schema not in aggregated['components']['schemas']:
            aggregated['components']['schemas'][prefixed_schema] = schema_def
            total_schemas += 1

aggregated['info']['description'] = (
    f'TOPEMS 企业级 SaaS 平台统一 API 文档（自动聚合生成）\n\n'
    f'聚合自 {len(service_files)} 个服务，共 {total_paths} 个端点、{total_schemas} 个 Schema。\n'
    f'生成时间: {__import__("datetime").datetime.now().isoformat()}'
)

# 输出 JSON
output_dir = os.environ.get('OUTPUT_DIR', '.')
json_path = os.path.join(output_dir, 'openapi-aggregated.json')
with open(json_path, 'w') as f:
    json.dump(aggregated, f, indent=2, ensure_ascii=False)
print(f'  JSON: {json_path} ({total_paths} paths, {total_schemas} schemas)')

# 尝试输出 YAML（如果 PyYAML 可用）
try:
    import yaml
    yaml_path = os.path.join(output_dir, 'openapi-aggregated.yaml')
    with open(yaml_path, 'w') as f:
        yaml.dump(aggregated, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    print(f'  YAML: {yaml_path}')
except ImportError:
    print('  [WARN] PyYAML 未安装，跳过 YAML 输出。安装: pip3 install pyyaml')
PYEOF

# 复制状态报告
cp "${STATUS_REPORT}" "${OUTPUT_DIR}/services-openapi-status.md"

echo ""
echo "=========================================="
echo "  生成完成"
echo "=========================================="
echo "  成功: ${SUCCESS_COUNT} 个服务"
echo "  失败: ${FAIL_COUNT} 个服务"
echo "  未装配: ${#MISSING_SERVICES[@]} 个服务"
echo ""
echo "  输出文件:"
echo "    - ${OUTPUT_DIR}/openapi-aggregated.json"
echo "    - ${OUTPUT_DIR}/openapi-aggregated.yaml (如 PyYAML 可用)"
echo "    - ${OUTPUT_DIR}/services-openapi-status.md"
echo ""
echo "  覆盖率: ${SUCCESS_COUNT}/$(( ${SUCCESS_COUNT} + ${FAIL_COUNT} + ${#MISSING_SERVICES[@]} )) 服务"
