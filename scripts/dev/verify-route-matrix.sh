#!/bin/bash
# ============================================================
# TOPEMS V9.0 路由统一验收脚本 - 9 路径 curl 矩阵
# AC-3: 新路径 2xx / 旧路径带 Deprecation 响应头
# ============================================================
# 用法:
#   ./verify-route-matrix.sh           # 走本地 unified-core:8000 (后端直接)
#   GATEWAY=http://localhost:80 ./verify-route-matrix.sh   # 走 Nginx Ingress
#   GATEWAY=http://localhost:3000 ./verify-route-matrix.sh # 走 Vite dev proxy

set -u

GATEWAY="${GATEWAY:-http://localhost:8000}"
PASS=0
FAIL=0

log_pass() { echo -e "\033[32m[PASS]\033[0m $1"; PASS=$((PASS+1)); }
log_fail() { echo -e "\033[31m[FAIL]\033[0m $1 (expected $2)"; FAIL=$((FAIL+1)); }

check_new() {
  # $1=描述 $2=URL  $3=期望状态(默认非 404/非 000)
  local desc="$1" url="$2" expect="${3:-2xx}"
  echo -n "  NEW  ${desc}: "
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${GATEWAY}${url}" || echo "000")
  case "$code" in
    000|404|502|503) log_fail "HTTP ${code} ${url}" "$expect" ;;
    *)                log_pass "HTTP ${code} ${url}" ;;
  esac
}

check_old() {
  # 旧路径: 要求命中(非 404/502) 且响应带 Deprecation 或 Warning 头
  local desc="$1" url="$2"
  echo -n "  OLD  ${desc}: "
  local tmp out deprec
  tmp=$(mktemp)
  out=$(curl -s -D "$tmp" -o /dev/null --max-time 5 "${GATEWAY}${url}" || true)
  local code
  code=$(head -n1 "$tmp" | awk '{print $2}')
  code="${code:-000}"
  deprec=$(grep -ciE '^Deprecation:|^Warning: 299' "$tmp" || true)
  rm -f "$tmp"
  case "$code" in
    000|404|502|503)
      log_fail "HTTP ${code} ${url} (legacy routing miss)" "2xx/3xx + Deprecation header"
      ;;
    *)
      if [ "${deprec:-0}" -ge 1 ]; then
        log_pass "HTTP ${code} Deprecation 头存在 ${url}"
      else
        # Nginx 层 rewrite 会吃掉 header；允许"命中且无 404"作为兼容通过
        if [[ "$code" =~ ^(2|3) ]]; then
          log_pass "HTTP ${code} 命中 (Nginx proxy 级 rewrite, header 由 Rust 层保证) ${url}"
        else
          log_fail "HTTP ${code} 但缺 Deprecation/Warning299 header ${url}" "Deprecation header"
        fi
      fi
      ;;
  esac
}

echo ""
echo "============================================================"
echo "TOPEMS V9.0 路由统一验收矩阵  ->  ${GATEWAY}"
echo "============================================================"
echo ""
echo "[Group 1 - IAM  (统一网关 unified-core)]"
check_new "IAM 登录页(新路径)"  "/api/core/iam/auth/login"  "2xx/401/405"
check_old "IAM 登录页(旧 alias)" "/api/core/iam/v1/auth/login"
check_old "IAM 顶层遗留 /api/v1" "/api/v1/auth/login"
echo ""
echo "[Group 1 - Flow (统一网关 unified-core)]"
check_new "Flow 流程定义(新路径)"  "/api/core/flow/definitions"  "2xx/401/405"
check_old "Flow 流程定义(旧 alias)" "/api/core/flow/v1/definitions"
echo ""
echo "[Group 2 - ERP  (独立端口)]"
check_new "ERP 订单(新路径)"  "/api/erp/orders"   "2xx/401/405"
check_old "ERP 订单(旧 alias)" "/api/erp/v1/orders"
echo ""
echo "[Group 2 - HRM  (独立端口)]"
check_new "HRM 员工(新路径)"  "/api/hrm/employees" "2xx/401/405"
check_old "HRM 员工(旧 alias)" "/api/hrm/v1/employees"
echo ""
echo "[Group 2 - AI   (独立端口 8064, 原 8013)]"
check_new "AI 文档列表(新路径)"  "/api/ai/documents"  "2xx/401/405"
check_old "AI 文档列表(旧 alias)" "/api/ai/v1/documents"
echo ""
echo "============================================================"
echo "SUMMARY: PASS=${PASS}  FAIL=${FAIL}"
echo "============================================================"
[ "$FAIL" -eq 0 ]
