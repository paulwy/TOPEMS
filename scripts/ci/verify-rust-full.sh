#!/usr/bin/env bash
# =============================================================================
# verify-rust-full.sh — Rust 全量验证（显式命令，不进 pre-push）
# =============================================================================
# 复刻 CI 的 4 个 Rust 质量通道，顺序执行并逐项计时：
#   1. cargo fmt --all --check
#   2. RUSTFLAGS=-D warnings SQLX_OFFLINE=true cargo check --workspace --all-targets
#   3. SQLX_OFFLINE=true cargo clippy --workspace --all-targets -- -D warnings
#   4. cargo nextest run --workspace（带真实库；等价 CI rust-test 集成测试）
#   5. cargo llvm-cov test --workspace + 覆盖率阈值（等价 CI rust-test 覆盖率口径）
#
# 为什么不在 pre-push：全量编译 + 两轮测试实测远超分钟级预算，会把钩子拖成
# 十分钟以上，反而诱发 --no-verify。入口：npm run verify:rust-full / verify:full。
#
# fail-closed（不得重蹈 check-api.cjs 把「文件不存在」当 0 的覆辙）：
#   - cargo / cargo-nextest / cargo-llvm-cov / psql 任一缺失 → 非 0
#   - 解析不到测试库 DSN、库名疑似 *_prod、探活失败 → 非 0
#   - 任一步命令失败 → 立即非 0（不吞错、不跳过）
#
# 环境变量（均可显式覆盖）：
#   TEST_DATABASE_URL  测试库 DSN（优先；缺省从 .env 读取）
#   DATABASE_URL       nextest/llvm-cov 用（强制派生自 TEST_DATABASE_URL）
#   REDIS_URL / JWT_SECRET
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi
cd "$ROOT"

for bin in cargo psql; do
    command -v "$bin" >/dev/null 2>&1 || { echo "FAIL: 缺少 ${bin}（Rust 全量验证无法运行）" >&2; exit 1; }
done
command -v cargo-nextest >/dev/null 2>&1 || { echo "FAIL: 缺少 cargo-nextest（cargo install cargo-nextest --locked）" >&2; exit 1; }
command -v cargo-llvm-cov >/dev/null 2>&1 || { echo "FAIL: 缺少 cargo-llvm-cov（cargo install cargo-llvm-cov --locked）" >&2; exit 1; }

# --- 测试库 DSN：只认 TEST_DATABASE_URL，拒绝生产库 ---------------------------------
if [[ -z "${TEST_DATABASE_URL:-}" && -f .env ]]; then
    TEST_DATABASE_URL="$(sed -nE 's/^TEST_DATABASE_URL=(.*)/\1/p' .env | head -1)"
fi
if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
    echo "FAIL: 未提供 TEST_DATABASE_URL（且 .env 中也没有）。集成测试需要真实测试库，不允许跳过。" >&2
    exit 1
fi
DBNAME="$(printf '%s' "$TEST_DATABASE_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
case "$DBNAME" in
    *_prod|*prod*)
        echo "FAIL: TEST_DATABASE_URL 指向疑似生产库（${DBNAME}），拒绝执行（生产零写入）。" >&2
        exit 1
        ;;
esac
if ! psql "$TEST_DATABASE_URL" -tAc "SELECT 1" >/dev/null 2>&1; then
    echo "FAIL: 测试库探活失败（${DBNAME}）。请先启动本地 PG 并确认 .env 的 TEST_DATABASE_URL。" >&2
    exit 1
fi

if [[ -z "${REDIS_URL:-}" && -f .env ]]; then
    REDIS_URL="$(sed -nE 's/^REDIS_URL=(.*)/\1/p' .env | head -1)"
fi
export TEST_DATABASE_URL
export DATABASE_URL="$TEST_DATABASE_URL"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-key-for-testing-only-32chars}"
export APP_ENV=test
export SQLX_OFFLINE=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

STEP_START=0
step() { STEP_START=$(date +%s); echo "==> $1"; }
step_end() { echo "  ↳ $1 耗时 $(( $(date +%s) - STEP_START ))s"; }

TOTAL_START=$(date +%s)
echo "== Rust 全量验证（测试库 ${DBNAME}）=="

step "cargo fmt --all --check"
cargo fmt --all --check
step_end "fmt"

step "cargo check --workspace --all-targets -D warnings"
RUSTFLAGS="-D warnings" cargo check --workspace --all-targets --message-format=short
step_end "check"

step "cargo clippy --workspace --all-targets -D warnings"
cargo clippy --workspace --all-targets -- -D warnings
step_end "clippy"

step "cargo nextest run --workspace（真实库）"
cargo nextest run --workspace --test-threads=4
step_end "nextest"

step "cargo llvm-cov test --workspace（覆盖率采集）"
cargo llvm-cov test --workspace --html --output-dir target/llvm-cov-report
step_end "llvm-cov"

step "覆盖率阈值校验"
TOTAL_LINE="$(cargo llvm-cov report --summary-only 2>/dev/null | awk '/^TOTAL/ {print $9}' | tr -d '%')"
[[ -n "$TOTAL_LINE" ]] || { echo "FAIL: 无法读取 workspace 行覆盖率（llvm-cov 报告为空）" >&2; exit 1; }

CHECKS_PASSED=1
printf '  %-18s %8s %8s\n' "TARGET" "COVER" "THRESHOLD"
printf '  %-18s %8s %8s\n' "workspace-line" "${TOTAL_LINE}%" "25%"
if awk -v a="$TOTAL_LINE" -v b=25 'BEGIN{exit !(a>=b)}'; then :; else CHECKS_PASSED=0; fi

for item in \
    "topems-shared:80" \
    "topems-mes:50" \
    "topems-qms:60" \
    "topems-erp:55" \
    "topems-finance:40" \
    "topems-hrm:30" \
    "topems-scm:35" \
    "topems-wms:60" \
    "topems-tms:70"; do
    pkg="${item%%:*}"
    threshold="${item##*:}"
    cov="$(cargo llvm-cov report --summary-only -p "$pkg" 2>/dev/null | grep "$pkg" | awk '{print $9}' | tr -d '%')"
    if [[ -z "$cov" ]]; then
        printf '  %-18s %8s %8s\n' "$pkg" "N/A" "${threshold}%"
        CHECKS_PASSED=0
        continue
    fi
    printf '  %-18s %8s %8s\n' "$pkg" "${cov}%" "${threshold}%"
    awk -v a="$cov" -v b="$threshold" 'BEGIN{exit !(a>=b)}' || CHECKS_PASSED=0
done

if [[ "$CHECKS_PASSED" != "1" ]]; then
    echo "FAIL: 覆盖率未达阈值（口径同 .github/workflows/ci.yml rust-test）" >&2
    exit 1
fi
step_end "覆盖率阈值"

echo "PASS: Rust 全量验证通过（总耗时 $(( $(date +%s) - TOTAL_START ))s）"
