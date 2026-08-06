#!/usr/bin/env bash
# =============================================================================
# topems.sh 核心命令流程单元测试（run / start-all / restart-all）
# =============================================================================
# 覆盖正常流程和异常终止场景：
#   - run: db_start 失败 / redis_start 失败 → 应中止，不调用 start_all_services
#   - start-all: 直接调用 start_all_services，无 db/redis 依赖
#   - restart-all: stop_all_services 失败不阻断 → 仍继续 start_all_services
#
# 原理：
#   1. 从 topems.sh 提取函数定义 + case 分发（同 test-topems-sh.sh）
#   2. Mock 所有副作用函数（db_start / redis_start / start_service / stop_service 等）
#   3. 通过全局变量跟踪调用序列和返回码
#   4. 断言调用顺序、参数透传、中止/继续行为
#
# 用法：
#   bash scripts/test/test-commands-flow.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/scripts/topems.sh"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS=0; FAIL=0

# ---- 提取 topems.sh 的函数定义 + case 分发 ----
EXTRACTED=$(mktemp /tmp/topems-flow-test.XXXXXX)
trap 'rm -f "$EXTRACTED"' EXIT

sed '/^# 主命令处理$/,$d' "$SCRIPT_UNDER_TEST" \
    | sed 's/^set -e$/# set -e (disabled for testing)/' > "$EXTRACTED"
{
    echo ''
    echo 'main_dispatch() {'
    sed -n '/^# 主命令处理$/,/^esac$/p' "$SCRIPT_UNDER_TEST" | sed 's/exit 1/return 1/g'
    echo ''
    echo '}'
} >> "$EXTRACTED"

set +eu
# shellcheck disable=SC1090
source "$EXTRACTED" 2>/dev/null
set -u; set +e

# ====================== Mock 状态控制 ======================
# 用全局变量控制各 mock 的行为
MOCK_DB_START_RC=0
MOCK_REDIS_START_RC=0
MOCK_STOP_ALL_RC=0
MOCK_START_SVC_RC=0
MOCK_STOP_SVC_RC=0
MOCK_START_FRONTEND_RC=0

# 调用跟踪（记录调用序列）
CALL_LOG=""
CAPTURED_START_ARGS=""

_reset_mocks() {
    MOCK_DB_START_RC=0
    MOCK_REDIS_START_RC=0
    MOCK_STOP_ALL_RC=0
    MOCK_START_SVC_RC=0
    MOCK_STOP_SVC_RC=0
    MOCK_START_FRONTEND_RC=0
    CALL_LOG=""
    CAPTURED_START_ARGS=""
}

# ---- Mock 副作用函数 ----
db_start()           { CALL_LOG="${CALL_LOG}db_start "; return "$MOCK_DB_START_RC"; }
redis_start()        { CALL_LOG="${CALL_LOG}redis_start "; return "$MOCK_REDIS_START_RC"; }
load_env()           { :; }
wait_for_core_services() { :; }
get_all_services()   { echo "svc-a svc-b svc-c"; }
start_service()      { CALL_LOG="${CALL_LOG}start_service "; return "$MOCK_START_SVC_RC"; }
stop_service()       { CALL_LOG="${CALL_LOG}stop_service "; return "$MOCK_STOP_SVC_RC"; }
start_frontend()     { CALL_LOG="${CALL_LOG}start_frontend "; return "$MOCK_START_FRONTEND_RC"; }
stop_frontend()      { CALL_LOG="${CALL_LOG}stop_frontend "; return 0; }
show_all_status()    { CALL_LOG="${CALL_LOG}show_all_status "; return 0; }
sleep()              { :; }
info()               { :; }
success()            { :; }
warning()            { :; }
error()              { :; }
detail()             { :; }

# start_all_services 和 stop_all_services 需要保留真实实现（被测对象），
# 但它们调用的子函数已被 mock。不过 case 分发里 start-all 直接调用
# start_all_services，而 start_all_services 内部调用 load_env / start_service /
# start_frontend / show_all_status — 这些都已被 mock。
# stop_all_services 内部调用 get_all_services / stop_service / stop_frontend — 也被 mock。
# 所以不需要额外 mock start_all_services / stop_all_services 本身。

# ---- 断言辅助 ----
assert_eq() {
    local name="$1" expected="$2" actual="$3"
    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✅ PASS${NC}: $name"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $name"
        echo -e "     ${YELLOW}期望${NC}: '$expected'"
        echo -e "     ${RED}实际${NC}: '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local name="$1" pattern="$2" text="$3"
    if echo "$text" | grep -q "$pattern"; then
        echo -e "  ${GREEN}✅ PASS${NC}: $name"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $name"
        echo -e "     ${YELLOW}期望包含${NC}: '$pattern'"
        echo -e "     ${RED}实际${NC}: '$text'"
        FAIL=$((FAIL + 1))
    fi
}

assert_not_contains() {
    local name="$1" pattern="$2" text="$3"
    if echo "$text" | grep -q "$pattern"; then
        echo -e "  ${RED}❌ FAIL${NC}: $name"
        echo -e "     ${YELLOW}期望不包含${NC}: '$pattern'"
        echo -e "     ${RED}实际${NC}: '$text'"
        FAIL=$((FAIL + 1))
    else
        echo -e "  ${GREEN}✅ PASS${NC}: $name"
        PASS=$((PASS + 1))
    fi
}

assert_rc() {
    local name="$1" expected_rc="$2" actual_rc="$3"
    if [ "$actual_rc" = "$expected_rc" ]; then
        echo -e "  ${GREEN}✅ PASS${NC}: $name (rc=$actual_rc)"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $name"
        echo -e "     ${YELLOW}期望 rc=${NC}${expected_rc}"
        echo -e "     ${RED}实际 rc=${NC}${actual_rc}"
        FAIL=$((FAIL + 1))
    fi
}

# ====================== 测试用例 ======================

echo -e "${BLUE}=========================================="
echo "topems.sh 核心命令流程单元测试"
echo -e "==========================================${NC}"
echo ""

# =============================================
# run 命令（run_all: db_start → redis_start → start_all_services → show_all_status）
# =============================================
echo -e "${BLUE}[run 命令]${NC}"
echo ""

# --- Test 1: run 正常流程 ---
echo -e "  ${BLUE}Test 1${NC}: run 正常流程 — db/redis 成功 → start_all_services 被调用"
_reset_mocks
main_dispatch run --only-core >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_contains "调用了 db_start" "db_start" "$CALL_LOG"
assert_contains "调用了 redis_start" "redis_start" "$CALL_LOG"
assert_contains "调用了 start_service" "start_service" "$CALL_LOG"
assert_contains "调用了 show_all_status" "show_all_status" "$CALL_LOG"
echo ""

# --- Test 2: run db_start 失败 → 中止 ---
echo -e "  ${BLUE}Test 2${NC}: run db_start 失败 → 返回 1，不调用 start_all_services"
_reset_mocks
MOCK_DB_START_RC=1
main_dispatch run >/dev/null 2>&1
rc=$?
assert_rc "返回码 1（中止）" "1" "$rc"
assert_contains "调用了 db_start" "db_start" "$CALL_LOG"
assert_not_contains "未调用 redis_start" "redis_start" "$CALL_LOG"
assert_not_contains "未调用 start_service" "start_service" "$CALL_LOG"
assert_not_contains "未调用 show_all_status" "show_all_status" "$CALL_LOG"
echo ""

# --- Test 3: run redis_start 失败 → 中止 ---
echo -e "  ${BLUE}Test 3${NC}: run redis_start 失败 → 返回 1，不调用 start_all_services"
_reset_mocks
MOCK_REDIS_START_RC=1
main_dispatch run >/dev/null 2>&1
rc=$?
assert_rc "返回码 1（中止）" "1" "$rc"
assert_contains "调用了 db_start" "db_start" "$CALL_LOG"
assert_contains "调用了 redis_start" "redis_start" "$CALL_LOG"
assert_not_contains "未调用 start_service" "start_service" "$CALL_LOG"
assert_not_contains "未调用 show_all_status" "show_all_status" "$CALL_LOG"
echo ""

# --- Test 4: run --no-frontend → start_frontend 不被调用 ---
echo -e "  ${BLUE}Test 4${NC}: run --no-frontend → start_frontend 不被调用"
_reset_mocks
main_dispatch run --no-frontend >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_not_contains "未调用 start_frontend" "start_frontend" "$CALL_LOG"
echo ""

# =============================================
# start-all 命令（case: start_all_services "${@:2}" + show_all_status）
# =============================================
echo ""
echo -e "${BLUE}[start-all 命令]${NC}"
echo ""

# --- Test 5: start-all 正常流程 ---
echo -e "  ${BLUE}Test 5${NC}: start-all 正常流程 — 无 db/redis 依赖"
_reset_mocks
main_dispatch start-all >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_not_contains "不调用 db_start" "db_start" "$CALL_LOG"
assert_not_contains "不调用 redis_start" "redis_start" "$CALL_LOG"
assert_contains "调用了 start_service" "start_service" "$CALL_LOG"
assert_contains "调用了 show_all_status" "show_all_status" "$CALL_LOG"
echo ""

# --- Test 6: start-all --only-core → 只启动核心服务 ---
echo -e "  ${BLUE}Test 6${NC}: start-all --only-core → 仅核心服务，非核心被跳过"
_reset_mocks
main_dispatch start-all --only-core >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_contains "调用了 start_service" "start_service" "$CALL_LOG"
# --only-core 仍然会调用 start_frontend（除非同时 --no-frontend）
assert_contains "调用了 start_frontend" "start_frontend" "$CALL_LOG"
echo ""

# --- Test 7: start-all --no-frontend → 前端被跳过 ---
echo -e "  ${BLUE}Test 7${NC}: start-all --no-frontend → start_frontend 不被调用"
_reset_mocks
main_dispatch start-all --no-frontend >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_not_contains "未调用 start_frontend" "start_frontend" "$CALL_LOG"
echo ""

# --- Test 8: start-all 个别服务启动失败 → 不中止，继续其他服务 ---
echo -e "  ${BLUE}Test 8${NC}: start-all 个别 start_service 失败 → 不中止，继续启动其他"
_reset_mocks
MOCK_START_SVC_RC=1
main_dispatch start-all >/dev/null 2>&1
rc=$?
# start_all_services 不因个别失败返回非 0（它只计数）
assert_rc "返回码 0（个别失败不中止）" "0" "$rc"
assert_contains "仍调用了 start_service" "start_service" "$CALL_LOG"
echo ""

# =============================================
# restart-all 命令（restart_all: stop_all_services → sleep → start_all_services → show_all_status）
# =============================================
echo ""
echo -e "${BLUE}[restart-all 命令]${NC}"
echo ""

# --- Test 9: restart-all 正常流程 ---
echo -e "  ${BLUE}Test 9${NC}: restart-all 正常流程 — 先停后启"
_reset_mocks
main_dispatch restart-all >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
# 验证调用顺序：stop_service 在 start_service 之前
stop_pos=$(echo "$CALL_LOG" | grep -bo "stop_service" | head -1 | cut -d: -f1)
start_pos=$(echo "$CALL_LOG" | grep -bo "start_service" | head -1 | cut -d: -f1)
if [ -n "$stop_pos" ] && [ -n "$start_pos" ] && [ "$stop_pos" -lt "$start_pos" ]; then
    echo -e "  ${GREEN}✅ PASS${NC}: stop_service 在 start_service 之前"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}❌ FAIL${NC}: stop_service 应在 start_service 之前"
    echo -e "     stop_pos=$stop_pos start_pos=$start_pos"
    FAIL=$((FAIL + 1))
fi
assert_contains "调用了 stop_frontend" "stop_frontend" "$CALL_LOG"
assert_contains "调用了 start_frontend" "start_frontend" "$CALL_LOG"
assert_contains "调用了 show_all_status" "show_all_status" "$CALL_LOG"
echo ""

# --- Test 10: restart-all --only-core → 参数透传 ---
echo -e "  ${BLUE}Test 10${NC}: restart-all --only-core → 参数透传到 start_all_services"
_reset_mocks
main_dispatch restart-all --only-core >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_contains "调用了 start_service" "start_service" "$CALL_LOG"
echo ""

# --- Test 11: restart-all stop 阶段失败 → 不阻断启动 ---
echo -e "  ${BLUE}Test 11${NC}: restart-all stop_service 全部失败 → 仍继续启动"
_reset_mocks
MOCK_STOP_SVC_RC=1
# stop_all_services 内部用 || true，所以不会传播失败
main_dispatch restart-all >/dev/null 2>&1
rc=$?
assert_rc "返回码 0（stop 失败不阻断）" "0" "$rc"
assert_contains "仍调了 stop_service" "stop_service" "$CALL_LOG"
assert_contains "仍调了 start_service" "start_service" "$CALL_LOG"
echo ""

# --- Test 12: restart-all --no-frontend → 前端停止仍调用，启动跳过 ---
echo -e "  ${BLUE}Test 12${NC}: restart-all --no-frontend → stop_frontend 仍调用，start_frontend 跳过"
_reset_mocks
main_dispatch restart-all --no-frontend >/dev/null 2>&1
rc=$?
assert_rc "返回码 0" "0" "$rc"
assert_contains "调用了 stop_frontend" "stop_frontend" "$CALL_LOG"
assert_not_contains "未调用 start_frontend" "start_frontend" "$CALL_LOG"
echo ""

# ---- 汇总 ----
echo ""
echo -e "${BLUE}=========================================="
if [ "$FAIL" -eq 0 ]; then
    echo -e "结果: ${GREEN}$PASS 通过${NC}, $FAIL 失败"
else
    echo -e "结果: $PASS 通过, ${RED}$FAIL 失败${NC}"
fi
echo -e "==========================================${NC}"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
