#!/usr/bin/env bash
# =============================================================================
# verify-full.sh — Rust 与前端全量验证并行编排（显式命令，不进 pre-push）
# =============================================================================
# 并行执行：
#   scripts/ci/verify-rust-full.sh   （fmt/check/clippy/nextest/llvm-cov+阈值）
#   scripts/ci/verify-web-full.sh    （unit + 5 分片 + coverage 阈值）
# 完整日志落到 target/verify-full/，失败时保留可查。
#
# fail-closed：任一子任务非 0、脚本缺失、被信号中断 → 整体非 0。
# 入口：npm run verify:full
# =============================================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi
cd "$ROOT" || exit 1

RUST_SH="scripts/ci/verify-rust-full.sh"
WEB_SH="scripts/ci/verify-web-full.sh"
for f in "$RUST_SH" "$WEB_SH"; do
    [[ -f "$f" ]] || { echo "FAIL: 缺少 ${f}" >&2; exit 1; }
done

LOG_DIR="target/verify-full"
mkdir -p "$LOG_DIR"
RUST_LOG="$LOG_DIR/rust.log"
WEB_LOG="$LOG_DIR/web.log"

TOTAL_START=$(date +%s)
RUST_START=$(date +%s)
( bash "$RUST_SH" >"$RUST_LOG" 2>&1 ) &
RUST_PID=$!
WEB_START=$(date +%s)
( bash "$WEB_SH" >"$WEB_LOG" 2>&1 ) &
WEB_PID=$!

wait "$RUST_PID"; RUST_RC=$?
RUST_ELAPSED=$(( $(date +%s) - RUST_START ))
wait "$WEB_PID"; WEB_RC=$?
WEB_ELAPSED=$(( $(date +%s) - WEB_START ))

echo "===== Rust 全量（exit=${RUST_RC}，耗时 ${RUST_ELAPSED}s，日志 ${RUST_LOG}）====="
tail -30 "$RUST_LOG"
echo "===== 前端全量（exit=${WEB_RC}，耗时 ${WEB_ELAPSED}s，日志 ${WEB_LOG}）====="
tail -30 "$WEB_LOG"

if [[ $RUST_RC -ne 0 || $WEB_RC -ne 0 ]]; then
    echo "FAIL: 全量验证失败（Rust exit=${RUST_RC}，前端 exit=${WEB_RC}）" >&2
    exit 1
fi
echo "PASS: 全量验证通过（并行总耗时 $(( $(date +%s) - TOTAL_START ))s）"
