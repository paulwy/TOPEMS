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
#   - 磁盘可用 < 40 GiB 直接退出（exit 0，只记日志），避免把系统盘写满
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
if [ "${AVAIL_GB:-0}" -lt 40 ]; then
  echo "⏭ 跳过：可用空间 ${AVAIL_GB} GiB < 40 GiB（全量 test 编译需要余量）。"
  echo "   先解决 target 体积（cargo clean 约释放 76–80 GiB）后，下次夜间会自动执行。"
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

echo "── 阶段 2：cargo test --workspace --lib（全量）──"
export SQLX_OFFLINE=true
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
else
  echo "✗ cargo test --workspace --lib 失败"; RC=1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] nightly gates 结束（RC=${RC}）"
exit "$RC"
