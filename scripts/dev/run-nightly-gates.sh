#!/bin/bash
# ==============================================================================
# 夜间全量测试（从 pre-push 链路移出的 cargo test 承接点）
#
# 背景：2026-11-18 把 cargo test 从 pre-push 移除——增量 test 也要为变更 crate 编译
#       测试依赖，一次 push 内 target 涨 4G、磁盘可用降到 12 GiB 仍未编完。push 只保留
#       fmt/check/clippy，test 改为手动或夜间。
#
# 用法：
#   bash scripts/dev/run-nightly-gates.sh              # 全量 --workspace --lib
#   bash scripts/dev/run-nightly-gates.sh --fast-only  # 只跑静态门禁，不编译
#
# 安全阀：
#   - 磁盘可用 < 60 GiB 直接退出（exit 0，只记日志），避免把系统盘写满
#   - 有 cargo build/test 在跑时跳过：夜间测试与白天的 release 演练抢同一份 CPU/磁盘，
#     两个全量编译并行会把余量一次吃光
#   - 使用独立 CARGO_TARGET_DIR（~/.cache/topems-nightly-target），跑完即删：夜间构建
#     不再往仓库 target/ 里堆，磁盘占用可预测；白天 Trae 的增量缓存不受影响
#   - SQLX_OFFLINE=true、RUST_TEST_THREADS=1，与 pre-push 原语义一致
#   - 不写生产库：DATABASE_URL 取 .env 的 TEST_DATABASE_URL，缺失才回落 MIGRATE_URL
#
# 日志：~/Library/Logs/topems-nightly-gates.log
# ==============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1
LOG="${HOME}/Library/Logs/topems-nightly-gates.log"
mkdir -p "$(dirname "$LOG")"

exec > >(tee -a "$LOG") 2>&1
echo "=============================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] nightly gates 开始（${ROOT}）"

FAST_ONLY=0
[ "${1:-}" = "--fast-only" ] && FAST_ONLY=1

AVAIL_GB=$(df -g /System/Volumes/Data 2>/dev/null | awk 'NR==2{print $4}')
echo "磁盘可用: ${AVAIL_GB} GiB"
if [ "${AVAIL_GB:-0}" -lt 60 ]; then
  echo "⏭ 跳过：可用空间 ${AVAIL_GB} GiB < 60 GiB（全量 test 编译需要余量）。"
  echo "   清理 target/ 或其他大文件后，下次夜间会自动执行。"
  exit 0
fi


RC=0
echo "── 阶段 1：静态门禁 ──"
bash scripts/dev/run-local-gates.sh --fast || RC=1

# 本机认证策略（防 pg_hba 退回 trust：Homebrew 升级或手改都会触发）
echo "── 阶段 1b：PostgreSQL 认证策略 ──"
bash scripts/ci/check-pg-auth-hardening.sh || RC=1

# launchd 单元不得出现明文密钥（已迁 System Keychain + launch-with-keychain.sh 注入）
echo "── 阶段 1c：launchd 明文密钥 ──"
bash scripts/ci/check-launchd-secrets.sh || RC=1

if [ "$FAST_ONLY" = "1" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] fast-only，结束（RC=${RC}）"
  exit "$RC"
fi

if pgrep -f "cargo (build|test|check)" >/dev/null 2>&1; then
  echo "── 阶段 2：跳过 ──"
  echo "检测到 cargo 编译/测试进程在运行，避免并发抢占磁盘与 CPU："
  pgrep -fl "cargo (build|test|check)" | head -3
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] nightly gates 结束（RC=${RC}，阶段 2 跳过）"
  exit "$RC"
fi

echo "── 阶段 2：cargo test --workspace --lib（全量）──"
export SQLX_OFFLINE=true
# 独立 target：夜间构建与仓库 target/（Trae 增量缓存）互不污染，跑完即删
NIGHTLY_TARGET="${HOME}/.cache/topems-nightly-target"
rm -rf "$NIGHTLY_TARGET"
mkdir -p "$NIGHTLY_TARGET"
export CARGO_TARGET_DIR="$NIGHTLY_TARGET"
echo "CARGO_TARGET_DIR=${NIGHTLY_TARGET}"
export RUST_TEST_THREADS=1
if [ -f .env ]; then
  TEST_DSN=$(sed -nE 's/^TEST_DATABASE_URL=(.*)/\1/p' .env | head -1)
  [ -z "$TEST_DSN" ] && TEST_DSN=$(sed -nE 's/^MIGRATE_URL=(.*)/\1/p' .env | head -1)
  [ -z "${TEST_DATABASE_URL:-}" ] && TEST_DATABASE_URL="$TEST_DSN"
  [ -z "${REDIS_URL:-}" ] && REDIS_URL=$(sed -nE 's/^REDIS_URL=(.*)/\1/p' .env | head -1)
  [ -z "${DATABASE_URL:-}" ] && DATABASE_URL="$TEST_DSN"
  [ -n "$TEST_DATABASE_URL" ] && export TEST_DATABASE_URL
  [ -n "$REDIS_URL" ] && export REDIS_URL
  [ -n "$DATABASE_URL" ] && export DATABASE_URL
fi

# utoipa-swagger-ui 的 build.rs 需要本地归档，否则离线构建失败
if [ -f scripts/lib/swagger-ui.sh ]; then
  # shellcheck disable=SC1091
  source scripts/lib/swagger-ui.sh
  topems_ensure_swagger_ui_archive || { echo "✗ swagger-ui 归档准备失败"; RC=1; }
fi

if cargo test --workspace --lib; then
  echo "✔ cargo test --workspace --lib 通过"
  rm -rf "$NIGHTLY_TARGET"
  echo "已清理夜间 target：${NIGHTLY_TARGET}"
else
  echo "✗ cargo test --workspace --lib 失败"; RC=1
  echo "保留 ${NIGHTLY_TARGET} 供排查（体积 $(du -sg "$NIGHTLY_TARGET" 2>/dev/null | awk '{print $1}') GiB）"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] nightly gates 结束（RC=${RC}）"
exit "$RC"
