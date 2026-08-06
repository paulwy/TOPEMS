#!/usr/bin/env bash
# =============================================================================
# 验证 topems.sh 前端启动轮询 + status 三态
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/scripts/topems.sh"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
PASS=0; FAIL=0

# ========== 状态文件（规避 $(...) 子 shell 变量隔离）==========
STATE_DIR=$(mktemp -d /tmp/topems-fe-state.XXXXXX)
trap 'rm -rf "$STATE_DIR"; pkill -f "command sleep 86400" 2>/dev/null || true' EXIT
CALLS_FILE="$STATE_DIR/check_port_calls"
OPEN_AFTER_FILE="$STATE_DIR/open_after"
FE_PID_FILE="$STATE_DIR/fe_pid_exists"
: > "$CALLS_FILE"; echo "-1" > "$OPEN_AFTER_FILE"; echo "1" > "$FE_PID_FILE"

# ========== 注入被测脚本 ==========
EXTRACTED=$(mktemp /tmp/topems-fe-test.XXXXXX)
trap 'rm -f "$EXTRACTED"; rm -rf "$STATE_DIR"; pkill -f "command sleep 86400" 2>/dev/null || true' EXIT

RENAME_SYMS=(
    check_port get_frontend_pid get_pkg_cmd ensure_frontend_deps
    sleep tail kill
    start_frontend show_all_status get_service_port
)

sed '/^# 主命令处理$/,$d' "$SCRIPT_UNDER_TEST" \
    | sed 's/^set -e$/# set -e (disabled for testing)/' > "$EXTRACTED"
{
    echo ''
    echo 'main_dispatch() {'
    sed -n '/^# 主命令处理$/,/^esac$/p' "$SCRIPT_UNDER_TEST" | sed 's/exit 1/return 1/g'
    echo ''
    echo '}'
} >> "$EXTRACTED"

RENAME_LIST=""
for sym in "${RENAME_SYMS[@]}"; do
    RENAME_LIST="${RENAME_LIST}s/(?<![A-Za-z0-9_])${sym}(?![A-Za-z0-9_])/mock_${sym}/g;"
done
perl -i -pe "$RENAME_LIST" "$EXTRACTED"
perl -i -pe 's/(?<![A-Za-z0-9_])nohup(?![A-Za-z0-9_])/mock_nohup/g' "$EXTRACTED"

set +eu
# shellcheck disable=SC1090
source "$EXTRACTED" 2>/dev/null
RC=$?
set -u; set +e
if [ "$RC" != "0" ]; then
    echo "ERROR: 注入后脚本语法错误 (rc=$RC), 尾部：" >&2
    tail -30 "$EXTRACTED" >&2; exit 2
fi

# ========== Mock 实现（所有计数 / 切换都通过文件走）==========
inc_calls() { local c; c=$(cat "$CALLS_FILE"); echo $((c+1)) > "$CALLS_FILE"; }
get_calls() { cat "$CALLS_FILE"; }
set_open_after() { echo "$1" > "$OPEN_AFTER_FILE"; }
get_open_after() { cat "$OPEN_AFTER_FILE"; }
set_fe_pid() { echo "$1" > "$FE_PID_FILE"; }
get_fe_pid() { cat "$FE_PID_FILE"; }

mock_check_port() {
    local _port="$1"
    inc_calls
    [ "$_port" != "3000" ] && return 1
    local calls aft
    calls=$(get_calls); aft=$(get_open_after)
    [ "$aft" -ge 0 ] && [ "$calls" -gt "$aft" ] && return 0
    return 1
}
mock_get_frontend_pid() {
    [ "$(get_fe_pid)" = "1" ] && echo "99999" || return 0
}
mock_sleep() { :; }
mock_get_pkg_cmd() { echo "pnpm"; }
mock_ensure_frontend_deps() { return 0; }
mock_tail() { :; }

FE_PID_AFTER_NOHUP=1
BLOCK_AFTER_NOHUP=1
# mock_nohup 末尾外部有 &：把整个 mock_nohup 调用放后台，$! 就是 mock_nohup 子 shell PID
# 必须挂住（command sleep 大值）否则 kill -0 立即失败
mock_nohup() {
    set_fe_pid "$FE_PID_AFTER_NOHUP"
    if [ "$BLOCK_AFTER_NOHUP" = "1" ]; then
        command sleep 86400
    fi
}

mock_kill() {
    local _sig="" _pid=""
    if [ "$1" = "-0" ] || [ "$1" = "-9" ] || [ "$1" = "-INT" ] || [ "$1" = "-TERM" ] || [ "$1" = "-HUP" ]; then
        _sig=$1; _pid=$2
    else
        _pid=$1
    fi
    [ "$_sig" != "-0" ] && return 0
    [ "$(get_fe_pid)" = "1" ] && return 0 || return 1
}

# ========== 辅助 ==========
inject_max_wait() {
    local fname="$1" new_max="$2" body
    body=$(declare -f "$fname") || return 1
    eval "$(echo "$body" | sed "s/local max_wait=[0-9]*/local max_wait=$new_max/")"
}
reset_state() {
    local _open_after="$1"
    local _fe_pid_init="$2"
    local _fe_pid_after_nohup="$3"
    echo "0" > "$CALLS_FILE"
    echo "$_open_after" > "$OPEN_AFTER_FILE"
    echo "$_fe_pid_init" > "$FE_PID_FILE"
    FE_PID_AFTER_NOHUP="$_fe_pid_after_nohup"
    BLOCK_AFTER_NOHUP=1
    pkill -f "command sleep 86400" 2>/dev/null || true
}
assert() {
    local name="$1" cond="$2" detail="${3:-}"
    if eval "$cond"; then
        echo -e "  ${GREEN}✅ PASS${NC}: $name"; PASS=$((PASS+1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $name"; FAIL=$((FAIL+1))
        [ -n "$detail" ] && echo -e "     ${YELLOW}->${NC} $detail"
    fi
}

# ========== 组 1：start_frontend 轮询 ==========
echo -e "${BLUE}=== Group 1: start_frontend 轮询等待逻辑 ===${NC}"
echo ""

echo "[Test 1] 端口第 4 次 check 打开 → 成功"
reset_state 3 0 1   # open_after=3(=>第4次开), fe_pid初始=0(走nohup), nohup后fe_pid=1
inject_max_wait mock_start_frontend 30
out=$(mock_start_frontend); rc=$?
calls=$(get_calls)
echo "  mock_check_port 调用次数: $calls"
echo "  mock_start_frontend rc=$rc"
assert "返回码 0"                    '[ "$rc" = "0" ]' "rc=$rc"
assert "调用次数 >= 4"                '[ "$calls" -ge 4 ]' "calls=$calls"
assert "调用次数 <= 6"                '[ "$calls" -le 6 ]' "calls=$calls"
echo "$out" | grep -q "启动成功" \
    && assert "输出含「启动成功」" "true" \
    || assert "输出含「启动成功」" "false" "末尾输出: $(tail -n 3 <<<"$out")"
echo ""

echo "[Test 2] 端口永不开 + 进程活着 → WARNING 启动中（rc=0）"
reset_state -1 0 1
inject_max_wait mock_start_frontend 12
out=$(mock_start_frontend); rc=$?
echo "  mock_start_frontend rc=$rc"
assert "返回码 0"                    '[ "$rc" = "0" ]' "rc=$rc"
echo "$out" | grep -Eq "启动中|仍在启动" \
    && assert "输出含「启动中/仍在启动」" "true" \
    || assert "输出含「启动中/仍在启动」" "false" "末尾5行: $(tail -n 5 <<<"$out")"
echo "$out" | grep -q "启动失败" \
    && assert "不含「启动失败」" "false" \
    || assert "不含「启动失败」" "true"
echo ""

echo "[Test 3] 端口永不开 + 进程死 → ERROR 启动失败"
reset_state -1 0 0   # nohup 后也设成 0 => 模拟立刻崩溃
inject_max_wait mock_start_frontend 9
out=$(mock_start_frontend); rc=$?
echo "  mock_start_frontend rc=$rc"
assert "返回码非 0"                   '[ "$rc" != "0" ]' "rc=$rc"
echo "$out" | grep -q "启动失败" \
    && assert "输出含「启动失败」" "true" \
    || assert "输出含「启动失败」" "false" "末尾5行: $(tail -n 5 <<<"$out")"
echo ""

# ========== 组 2：status 三态 ==========
echo ""
echo -e "${BLUE}=== Group 2: show_all_status 前端三态 ===${NC}"
echo ""

capture_fe_state_line() {
    mock_show_all_status 2>&1 | grep "前端"
}

echo "[Test 4] 端口开 (3000) → ✅ 运行中"
reset_state 0 1 1   # open_after=0 => 第 1 次就 true; fe_pid=1 (不需要 nohup)
state=$(capture_fe_state_line)
echo "  输出: $state"
echo "$state" | grep -q "运行中" \
    && assert "前端 ✅ 运行中" "true" \
    || assert "前端 ✅ 运行中" "false" "state=$state"
echo ""

echo "[Test 5] 端口未开 + 有 PID → ⏳ 启动中"
reset_state -1 1 1  # 永远不开; fe_pid_init=1 (不需要 nohup，前端就是已存在但还没开端口)
state=$(capture_fe_state_line)
echo "  输出: $state"
echo "$state" | grep -Eq "启动中" \
    && assert "前端 ⏳ 启动中" "true" \
    || assert "前端 ⏳ 启动中" "false" "state=$state"
echo "$state" | grep -q "未运行" \
    && assert "不是 ❌ 未运行" "false" \
    || assert "不是 ❌ 未运行" "true"
echo ""

echo "[Test 6] 端口未开 + 无 PID → ❌ 未运行"
reset_state -1 0 0
state=$(capture_fe_state_line)
echo "  输出: $state"
echo "$state" | grep -q "未运行" \
    && assert "前端 ❌ 未运行" "true" \
    || assert "前端 ❌ 未运行" "false" "state=$state"
echo "$state" | grep -Eq "启动中" \
    && assert "不是 ⏳ 启动中" "false" \
    || assert "不是 ⏳ 启动中" "true"
echo ""

# ========== 汇总 ==========
echo -e "${BLUE}========================================${NC}"
[ "$FAIL" -eq 0 ] \
    && echo -e "结果: ${GREEN}$PASS 通过${NC}, $FAIL 失败" \
    || echo -e "结果: $PASS 通过, ${RED}$FAIL 失败${NC}"
echo -e "${BLUE}========================================${NC}"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
