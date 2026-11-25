#!/bin/bash
# ============================================================
# scripts/ops/post-swap-regression-20261124.sh
#
# 换入新二进制（commit 642ca90db / sha256 fe23cda1…）之后的五项回归。
# 只发 GET，不写库、不改文件（只有 --uploads-dir 会建一个临时文件并立即删除）。
#
# 用法（生产机，127.0.0.1:8099）：
#   bash scripts/ops/post-swap-regression-20261124.sh \
#     --base http://127.0.0.1:8099 \
#     --bin target/release/topems-server \
#     --uploads-dir /Users/xingzhai/topems/storage \
#     --log /Users/xingzhai/topems/logs/server.err
#
#   带登录态的读回归（可选，给 1–2 条真实模块读接口）：
#   TOKEN=... TENANT_ID=... bash scripts/ops/post-swap-regression-20261124.sh \
#     --authed-path "/api/core/iam/users?page=1&page_size=5"
#   注：生产 tenant 中间件要求 X-Tenant-Id 头，缺了会 400「缺少租户上下文」；
#       不给 TOKEN 时导航/运行时接口只会 401，判据必然 FAIL——判据要真值就带 token+tenant。
#
# 判据（任一 FAIL 即建议立刻换回 bin/topems-server.bak-20261125-0925）：
#   1) 二进制 sha256 前 8 位 = fe23cda1
#   2) GET /health → 200
#   3) GET /api/core/health → 200
#   4) GET /api/plugin/navigation-config → 200 且 body success:true   ← 本次失败点
#   5) GET /api/plugin/runtime/list → 200 且 body 可解析
#   6) 上传目录可写（仅在给 --uploads-dir 时）
#   7) 日志尾部不再出现 is_default / RLS context missing / current transaction is aborted（仅在给 --log 时）
# ============================================================
set -uo pipefail

BASE="http://127.0.0.1:8099"
BIN="target/release/topems-server"
EXPECT_SHA_PREFIX="fe23cda1"
UPLOADS_DIR=""
LOG_FILE=""
LOG_TAIL=300
TOKEN="${TOKEN:-}"
TENANT_ID="${TENANT_ID:-}"
AUTHED_PATHS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --bin) BIN="$2"; shift 2 ;;
    --expect-sha-prefix) EXPECT_SHA_PREFIX="$2"; shift 2 ;;
    --uploads-dir) UPLOADS_DIR="$2"; shift 2 ;;
    --log) LOG_FILE="$2"; shift 2 ;;
    --log-tail) LOG_TAIL="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --authed-path) AUTHED_PATHS+=("$2"); shift 2 ;;
    --skip-sha) EXPECT_SHA_PREFIX=""; shift ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS+1)); }

# 生产 tenant 中间件要求显式租户头（X-Tenant-Id），否则 400「缺少租户上下文」；
# 无 TOKEN 时导航接口必然 401. 给了 token/tenant 就统一带上。
AUTH_HEADERS=()
if [[ -n "$TOKEN" ]]; then AUTH_HEADERS+=(-H "Authorization: Bearer ${TOKEN}"); fi
if [[ -n "$TENANT_ID" ]]; then AUTH_HEADERS+=(-H "X-Tenant-Id: ${TENANT_ID}"); fi

# bash 3.2 + set -u 下空数组直接展开会报 unbound，故用 ${arr[@]+...} 惯用法
http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${AUTH_HEADERS[@]+"${AUTH_HEADERS[@]}"} "$1"; }
http_body() { curl -s --max-time 10 ${AUTH_HEADERS[@]+"${AUTH_HEADERS[@]}"} "$1"; }

echo "== 换入后五项回归：${BASE} =="

# 1) 二进制指纹
if [[ -n "$EXPECT_SHA_PREFIX" ]]; then
  if [[ ! -f "$BIN" ]]; then
    fail "二进制不存在: $BIN"
  else
    sha="$(shasum -a 256 "$BIN" | cut -d' ' -f1)"
    if [[ "$sha" == "$EXPECT_SHA_PREFIX"* ]]; then
      pass "二进制 sha256=${sha:0:12}…（期望前缀 ${EXPECT_SHA_PREFIX}）"
    else
      fail "二进制 sha256=${sha:0:12}…，期望前缀 ${EXPECT_SHA_PREFIX}"
    fi
  fi
else
  echo "SKIP  二进制指纹（--skip-sha）"
fi

# 2) 基础健康
code="$(http_code "$BASE/health")"
[[ "$code" == "200" ]] && pass "GET /health → ${code}" || fail "GET /health → ${code}"
code="$(http_code "$BASE/api/core/health")"
[[ "$code" == "200" ]] && pass "GET /api/core/health → ${code}" || fail "GET /api/core/health → ${code}"

# 3) 本次失败的源头：导航配置必须 success:true
body="$(http_body "$BASE/api/plugin/navigation-config")"
code="$(http_code "$BASE/api/plugin/navigation-config")"
if [[ "$code" != "200" ]]; then
  fail "GET /api/plugin/navigation-config → ${code}（期望 200）"
  echo "      body 前 200 字：${body:0:200}"
else
  flag="$(printf '%s' "$body" | python3 -c 'import sys,json
try:
    d=json.load(sys.stdin)
except Exception:
    print("unparsable"); raise SystemExit
print("true" if d.get("success") is True else ("false" if d.get("success") is False else "missing"))' 2>/dev/null)"
  case "$flag" in
    true) pass "navigation-config body success:true" ;;
    false) fail "navigation-config body success:false（正是旧件形态，不算通过）" ;;
    missing) fail "navigation-config body 无 success 字段：${body:0:200}" ;;
    *) fail "navigation-config body 无法解析：${body:0:200}" ;;
  esac
fi

# 4) 插件运行时列表
code="$(http_code "$BASE/api/plugin/runtime/list")"
[[ "$code" == "200" ]] && pass "GET /api/plugin/runtime/list → ${code}" || fail "GET /api/plugin/runtime/list → ${code}"

# 5) 上传落盘（只建一个临时文件并删掉，验证挂载/权限，不写业务数据）
if [[ -n "$UPLOADS_DIR" ]]; then
  if [[ ! -d "$UPLOADS_DIR" ]]; then
    fail "上传目录不存在: $UPLOADS_DIR"
  elif tmp="$(mktemp "$UPLOADS_DIR/.probe.XXXXXX" 2>/dev/null)"; then
    rm -f "$tmp"
    pass "上传目录可写: $UPLOADS_DIR"
  else
    fail "上传目录不可写: $UPLOADS_DIR"
  fi
else
  echo "SKIP  上传目录（未给 --uploads-dir）"
fi

# 6) 带登录态的模块读回归（可选）
if [[ ${#AUTHED_PATHS[@]} -gt 0 ]]; then
  if [[ -z "$TOKEN" ]]; then
    fail "给了 --authed-path 但没有 TOKEN，无法验证登录态读"
  else
    for p in "${AUTHED_PATHS[@]}"; do
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${AUTH_HEADERS[@]+"${AUTH_HEADERS[@]}"} "$BASE$p")"
      [[ "$code" == "200" ]] && pass "GET $p → ${code}" || fail "GET $p → ${code}"
    done
  fi
else
  echo "SKIP  登录态模块读（未给 --authed-path；建议至少补 1–2 条真实读接口）"
fi

# 7) 日志尾部错误签名（旧日志里一定有历史命中，故只看尾部 N 行）
if [[ -n "$LOG_FILE" ]]; then
  if [[ ! -f "$LOG_FILE" ]]; then
    fail "日志文件不存在: $LOG_FILE"
  else
    tail_txt="$(tail -n "$LOG_TAIL" "$LOG_FILE")"
    for sig in 'column "is_default" does not exist' 'RLS context missing' 'current transaction is aborted'; do
      if printf '%s' "$tail_txt" | grep -qF "$sig"; then
        fail "日志尾部(最近 ${LOG_TAIL} 行)仍出现：${sig}"
      else
        pass "日志尾部无：${sig}"
      fi
    done
  fi
else
  echo "SKIP  日志扫描（未给 --log）"
fi

echo
if [[ "$FAILS" -eq 0 ]]; then
  echo "== 五项回归通过（0 FAIL）=="
  exit 0
fi
echo "== 五项回归未通过：${FAILS} 项 FAIL → 建议立即换回 bin/topems-server.bak-20261125-0925 =="
exit 1
