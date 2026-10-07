#!/bin/bash
# ==============================================================================
# TOPEMS 生产环境功能链路冒烟脚本（TODO 2.3）
#
# 用途：生产/演练环境部署后，验证核心功能链路：
#   层1（自动断言，全部要求 200/成功）：
#     A. IAM 登录 → JWT → 受保护 API 抽样（/api/v1/users）
#     B. 各域服务健康（/api/<域>/health，经 nginx map 路由）
#     C. BI 真实 SQL 执行（/api/bi/datasets/test-sql + /datasets/query）
#     D. 插件注册/运行时（/api/plugin/runtime/list 带 token）
#   层2（专项指引，依赖生产数据与事件编排，打印执行步骤与期望，
#        由运维按 TODO 2.3 清单在生产机逐项复验）：
#     E. 财务凭证借贷平衡（R2 ① 后端已验 10000=10000）
#     F. 工单下达（事件化，R2 ② uuid=text 修复后重验）
#     G. 质量链 qms↔lims↔ehs 事件联动（R2 ④ internal 前缀修复后重验）
#     H. WS MES 看板推送（unified-core 投影由 mes_real_module 提供）
#
# 用法：
#   ./scripts/deploy/smoke-prod.sh --base http://localhost:80 [--user admin] [--password admin123] [--insecure]
# 依赖：curl / jq（生产机标准工具）
# ==============================================================================
set -uo pipefail

BASE=""
USERNAME="admin"
PASSWORD="admin123"
CURL_OPTS=(-s --max-time 15)
FAIL=0
PASS_COUNT=0
FAIL_COUNT=0

log_pass() { echo "  ✅ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
log_fail() { echo "  ❌ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); FAIL=1; }
log_info() { echo "ℹ️  $1"; }

usage() {
  echo "Usage: $0 --base <portal_url> [--user <u>] [--password <p>] [--insecure]"
  echo "  --base       portal 入口 URL，如 http://localhost:80 或 https://portal.example.com"
  echo "  --user       登录用户名（默认 admin）"
  echo "  --password   登录密码（默认 admin123）"
  echo "  --insecure   HTTPS 自签证书场景跳过证书校验（-k）"
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --user) USERNAME="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --insecure) CURL_OPTS+=(-k); shift ;;
    *) echo "未知参数: $1"; usage ;;
  esac
done

[[ -z "$BASE" ]] && usage

# 输出目标 URL 时去掉尾部斜杠
BASE="${BASE%/}"

echo "============================================================"
echo " TOPEMS 生产冒烟（base=${BASE} user=${USERNAME}）"
echo "============================================================"

# ========== 层1A：IAM 登录 → JWT → 受保护 API ==========
log_info "层1A IAM 登录 → JWT → 受保护 API"
LOGIN_RESP=$(curl "${CURL_OPTS[@]}" -X POST -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  "$BASE/api/v1/auth/login" 2>/dev/null)
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.token // empty' 2>/dev/null)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  log_fail "登录失败（未取到 token）: $(echo "$LOGIN_RESP" | head -c 200)"
else
  log_pass "登录成功，token 已获取"
  USERS_CODE=$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/users" 2>/dev/null)
  if [[ "$USERS_CODE" == "200" ]]; then
    log_pass "GET /api/v1/users（带 token）-> 200"
  else
    log_fail "GET /api/v1/users -> $USERS_CODE（token 未生效）"
  fi
fi

# ========== 层1B：各域服务健康（经 portal / nginx map） ==========
log_info "层1B 各域服务健康检查（/api/<域>/health）"
for svc in core erp hrm finance mes qms lims ehs bi pm portal wms scm srm rd; do
  code=$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' "$BASE/api/$svc/health" 2>/dev/null || echo 000)
  if [[ "$code" == "200" ]]; then log_pass "$svc /health -> 200"; else log_fail "$svc /health -> $code"; fi
done

# ========== 层1C：BI 真实 SQL 执行 ==========
log_info "层1C BI /datasets/test-sql + /datasets/query"
if [[ -n "${TOKEN:-}" ]]; then
  TEST_SQL=$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"sql":"SELECT 1 AS ok"}' "$BASE/api/bi/datasets/test-sql" 2>/dev/null)
  if [[ "$TEST_SQL" == "200" ]]; then
    log_pass "BI /datasets/test-sql -> 200（SQL 执行链路通）"
  else
    log_fail "BI /datasets/test-sql -> $TEST_SQL"
  fi
  # query 端点为 GET/POST 均可能；探测 200（成功）或 4xx（路由通但参数需按生产数据集调整）
  QUERY_CODE=$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "$BASE/api/bi/datasets/query" 2>/dev/null)
  if [[ "$QUERY_CODE" == "200" || "$QUERY_CODE" == "400" || "$QUERY_CODE" == "422" ]]; then
    log_pass "BI /datasets/query 路由可达（HTTP $QUERY_CODE；生产数据集参数按需补充）"
  else
    log_fail "BI /datasets/query -> $QUERY_CODE"
  fi
else
  log_fail "BI 验证跳过（无 token）"
fi

# ========== 层1D：插件注册/运行时（带 token） ==========
log_info "层1D 插件运行时（/api/plugin/runtime/list）"
if [[ -n "${TOKEN:-}" ]]; then
  PLUGIN_CODE=$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "$BASE/api/plugin/runtime/list" 2>/dev/null)
  if [[ "$PLUGIN_CODE" == "200" ]]; then
    log_pass "插件 /api/plugin/runtime/list -> 200"
  else
    log_fail "插件 /api/plugin/runtime/list -> $PLUGIN_CODE"
  fi
else
  log_fail "插件验证跳过（无 token）"
fi

# ========== 层2：专项指引（生产机按 TODO 2.3 逐项复验） ==========
echo ""
echo "============================================================"
echo " 层2 专项链路指引（依赖生产数据/事件编排，逐项复验并记录）"
echo "============================================================"
cat <<'EOF'
  E. 财务凭证借贷平衡（R2 ① 已验 10000=10000）
     路径：svc/finance 凭证创建/查询 API（/api/finance/v1/...）
     期望：创建借贷平衡凭证 → 查询汇总借贷恒等（decimal 精度无漂移）
  F. 工单下达（事件化，R2 ② uuid=text 修复后重验）
     路径：svc/mes 工单下达 API（/api/mes/v1/...）
     期望：下达 → 事件发布 → 订阅方投影落库（uuid=text 修复后无类型错配）
  G. 质量链 qms↔lims↔ehs 事件联动（R2 ④ internal 前缀修复后重验）
     路径：svc/qms、svc/lims、svc/ehs 事件订阅链路
     期望：qms 检验事件 → lims 采样联动 → ehs 风险联动（internal 前缀路由正常）
  H. WS MES 看板推送
     端点：unified-core WS 端点（mes_real_module 投影提供）
     期望：建立 WS 连接 → 订阅 MES 看板频道 → 工单状态变更实时推送
  （各专项端点详情见 docs/developer/backend/api-design.md 与对应服务源码；
    生产机执行后在本节下方手工补充实测记录）
EOF

echo ""
echo "============================================================"
echo " 冒烟结果：$PASS_COUNT 通过 / $FAIL_COUNT 失败"
echo " 整体：$([ $FAIL -eq 0 ] && echo PASS || echo FAIL)"
echo "============================================================"
exit $FAIL
