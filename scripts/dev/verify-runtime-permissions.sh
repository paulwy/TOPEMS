#!/usr/bin/env bash
# 运行期权限冒烟：非超管用户读接口应为 200，写接口应为 403。
#
# 前置条件：
#   1. 单体服务已启动（默认 http://127.0.0.1:8099）；
#   2. 测试库已存在只读夹具 w13_reader，且已授予各模块读权限；
#   3. 设置 W13_READER_PASSWORD（以及需要时的 ADMIN_PASSWORD）。
#
# 用法：
#   W13_READER_PASSWORD=reader123 ADMIN_PASSWORD=admin123 \
#     bash scripts/dev/verify-runtime-permissions.sh
set -euo pipefail

BASE_URL="${TOPEMS_API_BASE:-http://127.0.0.1:8099}"
TENANT_ID="${TOPEMS_TENANT_ID:-00000000-0000-0000-0000-000000000001}"
READER_USER="${W13_READER_USER:-w13_reader}"
ADMIN_USER="${ADMIN_USER:-admin}"
: "${W13_READER_PASSWORD:?请设置 W13_READER_PASSWORD}"
: "${ADMIN_PASSWORD:?请设置 ADMIN_PASSWORD}"

fail=0
pass=0

login() {
  local user="$1" password="$2" payload token
  payload=$(U="$user" P="$password" python3 -c \
    'import json, os; print(json.dumps({"username": os.environ["U"], "password": os.environ["P"]}))')
  token=$(curl -fsS -X POST "$BASE_URL/api/core/iam/auth/login" \
    -H 'Content-Type: application/json' \
    -d "$payload" | python3 -c \
    'import json, sys; print(json.load(sys.stdin).get("data", {}).get("access_token", ""))')
  if [ -z "$token" ]; then
    echo "FAIL login: $user" >&2
    exit 1
  fi
  printf '%s' "$token"
}

check_get() {
  local module="$1" path="$2" code
  code=$(curl -sS -m 8 -o /dev/null -w '%{http_code}' \
    "$BASE_URL$path" \
    -H "Authorization: Bearer $READER_TOKEN" \
    -H "X-Tenant-ID: $TENANT_ID")
  if [ "$code" = "200" ]; then
    pass=$((pass + 1))
  else
    echo "FAIL read  $module $path -> $code" >&2
    fail=$((fail + 1))
  fi
}

check_write_denied() {
  local module="$1" path="$2" body="$3" code
  code=$(curl -sS -m 8 -o /dev/null -w '%{http_code}' \
    -X POST "$BASE_URL$path" \
    -H "Authorization: Bearer $READER_TOKEN" \
    -H "X-Tenant-ID: $TENANT_ID" \
    -H 'Content-Type: application/json' \
    -d "$body")
  if [ "$code" = "403" ]; then
    pass=$((pass + 1))
  else
    echo "FAIL write $module $path -> $code（期望 403）" >&2
    fail=$((fail + 1))
  fi
}

ADMIN_TOKEN=$(login "$ADMIN_USER" "$ADMIN_PASSWORD")
READER_TOKEN=$(login "$READER_USER" "$W13_READER_PASSWORD")
if [ -z "$ADMIN_TOKEN" ] || [ -z "$READER_TOKEN" ]; then
  echo "FAIL login token empty" >&2
  exit 1
fi

# 读矩阵：只读用户应全部 200。
while IFS='|' read -r module path; do
  [ -n "$module" ] || continue
  check_get "$module" "$path"
done <<'EOF'
crm|/api/crm/customers
erp|/api/erp/inventory
scm|/api/scm/suppliers
wms|/api/wms/inventory
qms|/api/qms/issues
ehs|/api/ehs/incidents
hrm|/api/hrm/employees
pm|/api/pm/projects
tms|/api/tms/carriers
lims|/api/lims/barcodes
master-data|/api/master-data/quality-v51/score
srm|/api/srm/suppliers
mes|/api/mes/production-plans
pdm|/api/pdm/materials
rd|/api/rd/patents
gis|/api/gis/statistics
mobile|/api/mobile/attendance
integration|/api/integration/stats
monitor|/api/monitor/alerts
ticket|/api/ticket/tickets/stats
EOF

# 写矩阵：有模块写门的接口应全部 403。
# ERP/SCM/WMS 使用处理器级细粒度 check_permission，不在此矩阵内。
while IFS='|' read -r module path body; do
  [ -n "$module" ] || continue
  check_write_denied "$module" "$path" "$body"
done <<'EOF'
crm|/api/crm/customers|{}
ehs|/api/ehs/incidents|{"title":"runtime-probe","severity":"minor"}
qms|/api/qms/issues|{"title":"runtime-probe","severity":"major"}
mes|/api/mes/production-plans|{"plan_no":"RT-PROBE","plan_name":"runtime probe","plan_type":"monthly"}
pdm|/api/pdm/materials|{}
rd|/api/rd/patents|{}
tms|/api/tms/routes/optimize|{}
lims|/api/lims/barcodes/generate|{}
master-data|/api/master-data/quality-v51/rules|{}
srm|/api/srm/suppliers|{}
mobile|/api/mobile/production/orders/none/pause|{}
integration|/api/integration/events|{}
monitor|/api/monitor/rules|{}
ticket|/api/ticket/feedbacks|{}
EOF

echo "runtime-permission-smoke: pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
