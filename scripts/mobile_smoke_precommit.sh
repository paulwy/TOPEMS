#!/usr/bin/env bash
# 移动端契约冒烟的本机隔离实跑（pre-commit 前置）。
#
# 为什么需要它：scripts/mobile_contract_smoke.py 默认打本机 8070，而本机 8070 往往
# 没起；本仓 .env 的 DATABASE_URL 指向 *_prod，直接跑会被 prod 守卫拒绝，过去只能
# 用 LEFTHOOK_EXCLUDE 跳过。本脚本负责把「可实跑」固定下来：
#   1) 用 topems_test 库 + 独立 redis 端口 + 独立 mobile 端口拉起一个隔离 mobile 实例；
#   2) 让 smoke 指向该实例实跑（不碰 8070 / 8099 的常驻进程，不连生产库）；
#   3) 结束后回收进程。上游服务不拉起，转发类端点会按降级契约返回 503/502，smoke 记 WARN。
#
# 可用环境变量覆盖：MOBILE_SMOKE_DATABASE_URL / MOBILE_SMOKE_PORT / MOBILE_SMOKE_REDIS_PORT
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

DB_URL="${MOBILE_SMOKE_DATABASE_URL:-postgres://topems:topems_secret@127.0.0.1:5432/topems_test}"
PORT="${MOBILE_SMOKE_PORT:-18070}"
REDIS_PORT="${MOBILE_SMOKE_REDIS_PORT:-16379}"
MOBILE_LOG="/tmp/mobile_smoke_precommit.mobile.log"
REDIS_LOG="/tmp/mobile_smoke_precommit.redis.log"

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1; }
for p in "$PORT" "$REDIS_PORT"; do
  if port_busy "$p"; then
    echo "[MCS-local] 端口 $p 已被占用，无法拉起隔离栈（检查是否有残留进程）" >&2
    exit 1
  fi
done

export PATH="$HOME/.cargo/bin:$PATH"
echo "[MCS-local] 构建 topems-mobile ..."
if ! cargo build -p topems-mobile >/tmp/mobile_smoke_precommit.build.log 2>&1; then
  echo "[MCS-local] cargo build -p topems-mobile 失败，日志 /tmp/mobile_smoke_precommit.build.log" >&2
  tail -20 /tmp/mobile_smoke_precommit.build.log >&2
  exit 1
fi
BIN="$ROOT/target/debug/topems-mobile"
[ -x "$BIN" ] || { echo "[MCS-local] 未找到 $BIN" >&2; exit 1; }

# 复用 .env 的 JWT_SECRET 等公共配置，再覆盖为隔离栈配置
set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a
export DATABASE_URL="$DB_URL" MIGRATE_URL="$DB_URL"
export REDIS_URL="redis://127.0.0.1:$REDIS_PORT"
export MOBILE_PORT="$PORT" CORE_URL="http://127.0.0.1:18099"
# 上游服务指向一个不监听的端口：转发类端点走降级契约，不触碰本机常驻的 8099（生产位）
for v in WMS HRM NOTIFICATION MES QMS CRM WORKFLOW COMM FLOW IAM DOC FILE PORTAL; do
  export "${v}_SERVICE_URL=http://127.0.0.1:18099"
done

RPID=""
MPID=""
cleanup() {
  [ -n "$MPID" ] && kill "$MPID" 2>/dev/null
  [ -n "$RPID" ] && kill "$RPID" 2>/dev/null
  sleep 1
  [ -n "$MPID" ] && kill -9 "$MPID" 2>/dev/null
  [ -n "$RPID" ] && kill -9 "$RPID" 2>/dev/null
}
trap cleanup EXIT

if command -v redis-server >/dev/null 2>&1; then
  redis-server --port "$REDIS_PORT" --save '' --appendonly no >"$REDIS_LOG" 2>&1 &
  RPID=$!
  sleep 1
else
  echo "[MCS-local] 警告：未找到 redis-server，事件总线将不可用（不影响契约冒烟）" >&2
fi

nohup "$BIN" >"$MOBILE_LOG" 2>&1 &
MPID=$!
READY=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo "[MCS-local] mobile 在 ${PORT} 端口 60s 内未就绪，日志尾部：" >&2
  tail -30 "$MOBILE_LOG" >&2
  exit 1
fi

echo "[MCS-local] 隔离 mobile 就绪（db=topems_test, port=${PORT}），开始实跑契约冒烟"
TOPEMS_INSTANCE=dev WEB_SMOKE_ENV=local \
MOBILE_BASE_URL="http://127.0.0.1:$PORT/api/mobile" \
python3 scripts/mobile_contract_smoke.py
