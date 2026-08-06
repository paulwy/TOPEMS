#!/usr/bin/env bash
# =============================================================================
# topems.sh 参数传递单元测试
# =============================================================================
# 验证 run / start-all / restart-all 三种命令的参数是否正确透传到
# start_all_services。
#
# 原理：
#   1. 从 topems.sh 中提取函数定义和 case 分发逻辑
#   2. 用 mock 替换 start_all_services 等副作用函数，捕获实际收到的参数
#   3. 对比期望参数与实际参数
#
# 用法：
#   bash scripts/test/test-topems-sh.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$PROJECT_ROOT/scripts/topems.sh"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

# ---- 提取 topems.sh 的函数定义 + case 分发 ----
EXTRACTED=$(mktemp /tmp/topems-test.XXXXXX)
trap 'rm -f "$EXTRACTED"' EXIT

# 1) 提取 # 主命令处理 之前的所有内容（函数定义 + 全局变量初始化）
#    同时移除 set -e，防止 source 时因命令返回非零而退出
sed '/^# 主命令处理$/,$d' "$SCRIPT_UNDER_TEST" | sed 's/^set -e$/# set -e (disabled for testing)/' > "$EXTRACTED"

# 2) 提取 case 分发块，包装成 main_dispatch 函数（exit → return 防止退出）
{
    echo ''
    echo 'main_dispatch() {'
    sed -n '/^# 主命令处理$/,/^esac$/p' "$SCRIPT_UNDER_TEST" | sed 's/exit 1/return 1/g'
    echo ''
    echo '}'
} >> "$EXTRACTED"

# 关闭 set -e 和 set -u（提取的代码里带了 set -e，会干扰 source）
set +eu

# 加载函数定义
# shellcheck disable=SC1090
source "$EXTRACTED" 2>/dev/null

# ---- Mock 副作用函数 ----
CAPTURED_ARGS=""

start_all_services() { CAPTURED_ARGS="$*"; return 0; }
stop_all_services()  { return 0; }
db_start()           { return 0; }
redis_start()        { return 0; }
show_all_status()    { return 0; }
sleep()              { :; }  # no-op

# ---- 测试辅助 ----
assert_args() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    if [ "$actual" = "$expected" ]; then
        echo -e "  ${GREEN}✅ PASS${NC}: $test_name"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}❌ FAIL${NC}: $test_name"
        echo -e "     ${YELLOW}期望${NC}: '$expected'"
        echo -e "     ${RED}实际${NC}: '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

# ---- 测试用例 ----

echo -e "${BLUE}=========================================="
echo "topems.sh 参数传递单元测试"
echo -e "==========================================${NC}"
echo ""

# --- start-all ---
echo "[start-all]"

echo -e "  ${BLUE}Test 1${NC}: start-all --only-core"
CAPTURED_ARGS=""
main_dispatch start-all --only-core
assert_args "单参数 --only-core" "--only-core" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 2${NC}: start-all --no-frontend --skip=mes"
CAPTURED_ARGS=""
main_dispatch start-all --no-frontend --skip=mes
assert_args "多参数 --no-frontend --skip=mes" "--no-frontend --skip=mes" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 3${NC}: start-all (无参数)"
CAPTURED_ARGS=""
main_dispatch start-all
assert_args "无参数透传空" "" "$CAPTURED_ARGS"

echo ""

# --- run (run -> run_all -> start_all_services) ---
echo "[run]"

echo -e "  ${BLUE}Test 4${NC}: run --only-core"
CAPTURED_ARGS=""
main_dispatch run --only-core
assert_args "run 转发 --only-core" "--only-core" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 5${NC}: run --no-frontend --skip=mes --skip=portal"
CAPTURED_ARGS=""
main_dispatch run --no-frontend --skip=mes --skip=portal
assert_args "run 转发多参数" "--no-frontend --skip=mes --skip=portal" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 6${NC}: run (无参数)"
CAPTURED_ARGS=""
main_dispatch run
assert_args "run 无参数透传空" "" "$CAPTURED_ARGS"

echo ""

# --- restart-all (restart-all -> restart_all -> start_all_services) ---
echo "[restart-all]"

echo -e "  ${BLUE}Test 7${NC}: restart-all --only-core"
CAPTURED_ARGS=""
main_dispatch restart-all --only-core
assert_args "restart-all 转发 --only-core" "--only-core" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 8${NC}: restart-all --no-frontend"
CAPTURED_ARGS=""
main_dispatch restart-all --no-frontend
assert_args "restart-all 转发 --no-frontend" "--no-frontend" "$CAPTURED_ARGS"

echo -e "  ${BLUE}Test 9${NC}: restart-all --skip=wms --skip=srm"
CAPTURED_ARGS=""
main_dispatch restart-all --skip=wms --skip=srm
assert_args "restart-all 转发多 --skip" "--skip=wms --skip=srm" "$CAPTURED_ARGS"

echo ""

# ---- 汇总 ----
echo -e "${BLUE}=========================================="
if [ "$FAIL" -eq 0 ]; then
    echo -e "结果: ${GREEN}$PASS 通过${NC}, $FAIL 失败"
else
    echo -e "结果: $PASS 通过, ${RED}$FAIL 失败${NC}"
fi
echo -e "==========================================${NC}"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
