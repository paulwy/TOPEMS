#!/usr/bin/env bash
# Web(portal) 契约冒烟的本机隔离实跑（pre-commit 前置）。
#
# 为什么需要它：scripts/web_contract_smoke.py 默认打本机 8099，而本机 8099 是
# launchd 常驻的生产 BFF（DATABASE_URL 指向 *_prod）。冒烟脚本的「目标位」守卫会
# 只读 lsof + ps eww 读到该进程连的是生产库，于是无条件 exit 4，只要提交里含
# apps/web/src/api/** 就被卡住。本脚本把「可实跑」固定下来：
#   1) 用测试库（默认 topems_web_smoke）+ 独立 redis 端口 + 独立 BFF 端口拉起隔离实例；
#      测试库缺失/落后时按「基线快照 + 前向迁移」自动补齐（只写测试库，不连生产）；
#   2) 让 smoke 指向该实例实跑（WEB_BFF_URL），不碰 8099 的进程/端口/库；
#   3) 结束后回收进程。
# 上游服务 URL 一律指向不监听的死端口：转发类端点走降级契约（503/501），
# 绝不会把请求打到本机常驻的 8099。
#
# 可用环境变量覆盖：
#   WEB_SMOKE_PORT           隔离 BFF 端口（默认 18099，禁止 8099）
#   WEB_SMOKE_DEAD_PORT      下游死端口（默认 18098）
#   WEB_SMOKE_REDIS_PORT     隔离 redis 端口（默认 16379）
#   WEB_SMOKE_DB_NAME        测试库名（默认 topems_web_smoke）
#   WEB_SMOKE_DATABASE_URL   显式测试库 DSN（默认 postgresql://<当前用户>@127.0.0.1:5432/<DB_NAME>）
#   WEB_SMOKE_REFRESH_DB=1   重建测试库（drop + 基线快照 + 前向迁移）
#   WEB_SMOKE_SERVER_BIN     直接复用已构建的 topems-server 二进制
#   WEB_SMOKE_CARGO_TARGET_DIR  需要构建时的独立 CARGO_TARGET_DIR（默认 <repo>/target-web-smoke）
#   WEB_SMOKE_REBUILD=1      强制用独立 target 目录重新构建
#
# 安全边界：只接受非 *_prod 库名与本机回环端口；生产库零写入；
#          拒绝在 TOPEMS_INSTANCE=prod 或 8099 上运行。
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

fail() {
  echo "[WCS-local] FAIL: $*" >&2
  exit 1
}

DB_NAME="${WEB_SMOKE_DB_NAME:-topems_web_smoke}"
# 必须用「带 host + 显式用户」的 TCP DSN：sqlx 对 `postgresql:///db` 解析出的空用户名
# 会退化成角色 anonymous，建池即报 role "anonymous" does not exist（2026-11-06 实测）。
DB_URL="${WEB_SMOKE_DATABASE_URL:-postgresql://$(id -un)@127.0.0.1:5432/$DB_NAME}"
PORT="${WEB_SMOKE_PORT:-18099}"
DEAD_PORT="${WEB_SMOKE_DEAD_PORT:-18098}"
REDIS_PORT="${WEB_SMOKE_REDIS_PORT:-16379}"
SERVER_LOG="/tmp/web_smoke_precommit.server.log"
REDIS_LOG="/tmp/web_smoke_precommit.redis.log"
BUILD_LOG="/tmp/web_smoke_precommit.build.log"

# ── 安全边界：绝不指向生产 ───────────────────────────────────────────────────
if [ "$(printf '%s' "${TOPEMS_INSTANCE:-}" | tr '[:upper:]' '[:lower:]')" = "prod" ]; then
  fail "TOPEMS_INSTANCE=prod：本脚本只用于本机/测试，拒绝运行"
fi
DB_TAIL="${DB_URL%%\?*}"
DB_TAIL="${DB_TAIL%/}"
DB_TAIL="${DB_TAIL##*/}"
case "$DB_TAIL" in
  topems_prod|*_prod) fail "测试库名疑似生产库（${DB_TAIL}）：拒绝连接（可设置 WEB_SMOKE_DATABASE_URL 指向测试库）" ;;
esac
case "$DB_URL" in
  *"_prod"*) fail "WEB_SMOKE_DATABASE_URL 含 *_prod：拒绝连接" ;;
esac
DEFAULT_DB_URL="postgresql://$(id -un)@127.0.0.1:5432/$DB_NAME"
IS_LOCAL_DB=0
[ "$DB_URL" = "$DEFAULT_DB_URL" ] && IS_LOCAL_DB=1
case "$DB_NAME" in
  ''|*[!a-zA-Z0-9_]*) fail "WEB_SMOKE_DB_NAME 含非法字符：$DB_NAME" ;;
esac
if [ "$PORT" = "8099" ] || [ "$DEAD_PORT" = "8099" ] || [ "$REDIS_PORT" = "8099" ]; then
  fail "端口 8099 是生产 BFF，禁止复用"
fi
if [ ! -f .env ]; then
  fail "缺少 .env（JWT_SECRET 等公共配置），无法拉起隔离 BFF"
fi
for bin in psql createdb dropdb python3 lsof; do
  command -v "$bin" >/dev/null 2>&1 || fail "缺少 $bin"
done

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1; }
for p in "$PORT" "$DEAD_PORT" "$REDIS_PORT"; do
  if port_busy "$p"; then
    fail "端口 $p 已被占用，无法拉起隔离栈（检查是否有残留进程）"
  fi
done

# ── 测试库：缺失则按基线快照创建；落后则前向补齐（只写测试库） ──────────────
latest_anchor() {
  python3 - <<'PY'
import json
d = json.load(open("database/baseline/anchors.json"))
print(max(a["anchor_version"] for a in d["anchors"]))
PY
}

repo_head_version() {
  ls database/migrations/*.sql 2>/dev/null | sed 's#.*/##' | cut -d_ -f1 | sort -n | tail -1
}

provision_db() {
  local anchor
  anchor="$(latest_anchor)"
  [ -n "$anchor" ] || fail "无法从 database/baseline/anchors.json 解析锚点"
  local schema="database/baseline/prod_schema_${anchor}.sql.gz"
  local ledger="database/baseline/prod_ledger_${anchor}.sql"
  local data="database/baseline/baseline_${anchor}_data.sql.gz"
  for f in "$schema" "$ledger" "$data"; do
    [ -f "$f" ] || fail "缺少基线资产 ${f}（见 docs/quality/environment-provisioning.md）"
  done
  echo "[WCS-local] 初始化测试库 ${DB_NAME}（anchor=${anchor}）"
  createdb -h 127.0.0.1 -p 5432 -U "$(id -un)" "$DB_NAME" || fail "createdb ${DB_NAME} 失败"
  gzip -dc "$schema" | psql "$DB_URL" -v ON_ERROR_STOP=1 -q >/dev/null || fail "schema 快照恢复失败"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ledger" >/dev/null || fail "账本恢复失败"
  gzip -dc "$data" | psql "$DB_URL" -v ON_ERROR_STOP=1 -q >/dev/null || fail "参考数据恢复失败"
}

if [ "${WEB_SMOKE_REFRESH_DB:-0}" = "1" ]; then
  echo "[WCS-local] WEB_SMOKE_REFRESH_DB=1：重建测试库 ${DB_NAME}"
  dropdb --if-exists -h 127.0.0.1 -p 5432 -U "$(id -un)" "$DB_NAME" || fail "dropdb ${DB_NAME} 失败"
fi

if [ "$IS_LOCAL_DB" = "1" ]; then
  if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    provision_db
  fi
elif ! psql "$DB_URL" -tAc "SELECT 1" >/dev/null 2>&1; then
  fail "显式测试库不可达：${DB_URL}（本脚本不会自动在远端建库）"
fi

LEDGER_MAX="$(psql "$DB_URL" -tAc "SELECT COALESCE(max(version)::text,'0') FROM _sqlx_migrations WHERE success" 2>/dev/null | tr -d '[:space:]')"
if [ -z "$LEDGER_MAX" ] || [ "$LEDGER_MAX" = "0" ]; then
  if [ "$IS_LOCAL_DB" = "1" ]; then
    dropdb --if-exists -h 127.0.0.1 -p 5432 -U "$(id -un)" "$DB_NAME" >/dev/null 2>&1
    provision_db
    LEDGER_MAX="$(psql "$DB_URL" -tAc "SELECT COALESCE(max(version)::text,'0') FROM _sqlx_migrations WHERE success")"
  else
    fail "测试库账本为空/缺 _sqlx_migrations：${DB_URL}（请换成已迁移库或重建）"
  fi
fi

HEAD_VERSION="$(repo_head_version)"
if [ -n "$HEAD_VERSION" ] && [ "${LEDGER_MAX:-0}" -lt "$HEAD_VERSION" ] 2>/dev/null; then
  echo "[WCS-local] 测试库落后（ledger=${LEDGER_MAX} < head=${HEAD_VERSION}），前向补齐"
  bash scripts/migration/apply-forward.sh --dsn "$DB_URL" >/tmp/web_smoke_precommit.migrate.log 2>&1 \
    || { tail -20 /tmp/web_smoke_precommit.migrate.log >&2; fail "前向迁移失败（日志 /tmp/web_smoke_precommit.migrate.log）"; }
  LEDGER_MAX="$(psql "$DB_URL" -tAc "SELECT COALESCE(max(version)::text,'0') FROM _sqlx_migrations WHERE success")"
fi

# 基线「schema + data」分文件恢复不会自动 REFRESH 物化视图（pg_dump data-only 不含该语句），
# 例如 bi.org_stats 未 populate 会让 /api/bi/reports-center/stats 返回 503。只刷测试库。
if [ "$IS_LOCAL_DB" = "1" ]; then
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "DO \$\$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT schemaname, matviewname FROM pg_matviews WHERE NOT ispopulated LOOP
        EXECUTE format('REFRESH MATERIALIZED VIEW %I.%I', r.schemaname, r.matviewname);
      END LOOP;
    END \$\$;" >/dev/null || fail "刷新测试库物化视图失败"
fi
echo "[WCS-local] 测试库就绪：db=${DB_TAIL} ledger=${LEDGER_MAX} head=${HEAD_VERSION:-?}"

# ── 隔离 BFF 二进制：优先复用已有构建产物，避免抢别人的 target 锁 ────────────
BIN="${WEB_SMOKE_SERVER_BIN:-$ROOT/target/debug/topems-server}"
if [ "${WEB_SMOKE_REBUILD:-0}" = "1" ] || [ ! -x "$BIN" ]; then
  TARGET_DIR="${WEB_SMOKE_CARGO_TARGET_DIR:-$ROOT/target-web-smoke}"
  AVAIL_GIB="$(df -g "$ROOT" | awk 'NR==2 {print $4}')"
  if [ -n "$AVAIL_GIB" ] && [ "$AVAIL_GIB" -lt 10 ] 2>/dev/null; then
    fail "磁盘可用 ${AVAIL_GIB}GiB < 10GiB，停止构建（先清理磁盘）"
  fi
  export PATH="$HOME/.cargo/bin:$PATH"
  command -v cargo >/dev/null 2>&1 || fail "未找到 cargo"
  echo "[WCS-local] 构建 topems-server（CARGO_TARGET_DIR=${TARGET_DIR}）..."
  if ! CARGO_TARGET_DIR="$TARGET_DIR" SQLX_OFFLINE=true cargo build -p topems-server >"$BUILD_LOG" 2>&1; then
    tail -20 "$BUILD_LOG" >&2
    fail "cargo build -p topems-server 失败（日志 ${BUILD_LOG}）"
  fi
  BIN="$TARGET_DIR/debug/topems-server"
else
  STALE_COUNT="$(find svc lib -name '*.rs' -path '*/src/*' -newer "$BIN" 2>/dev/null | wc -l | tr -d ' ')"
  if [ "${STALE_COUNT:-0}" -gt 0 ] 2>/dev/null; then
    echo "[WCS-local] 提示：$STALE_COUNT 个源文件比复用二进制新；需要重建请设 WEB_SMOKE_REBUILD=1"
  fi
fi
[ -x "$BIN" ] || fail "未找到可执行二进制 $BIN"

# ── 隔离运行环境：覆盖 .env，全部下游指向死端口 ─────────────────────────────
set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a
export DATABASE_URL="$DB_URL" MIGRATE_URL="$DB_URL" TEST_DATABASE_URL="$DB_URL"
export SERVER_PORT="$PORT" BIND_ADDR="127.0.0.1"
export REDIS_URL="redis://127.0.0.1:$REDIS_PORT"
export CORE_URL="http://127.0.0.1:$DEAD_PORT"
for v in WMS HRM NOTIFICATION MES QMS CRM WORKFLOW COMM FLOW IAM DOC FILE PORTAL \
         ERP FINANCE AI PM PDM SCM SRM LIMS EHS RD BI MONITOR MOBILE GIS \
         INTEGRATION SEARCH COMMUNICATION BILLING TICKET FEEDBACK MASTER_DATA \
         PLUGIN_REGISTRY TMS; do
  export "${v}_SERVICE_URL=http://127.0.0.1:$DEAD_PORT"
done

RPID=""
SPID=""
cleanup() {
  [ -n "$SPID" ] && kill "$SPID" 2>/dev/null
  [ -n "$RPID" ] && kill "$RPID" 2>/dev/null
  sleep 1
  [ -n "$SPID" ] && kill -9 "$SPID" 2>/dev/null
  [ -n "$RPID" ] && kill -9 "$RPID" 2>/dev/null
}
trap cleanup EXIT

if command -v redis-server >/dev/null 2>&1; then
  redis-server --port "$REDIS_PORT" --save '' --appendonly no >"$REDIS_LOG" 2>&1 &
  RPID=$!
  sleep 1
else
  echo "[WCS-local] 警告：未找到 redis-server，事件总线/缓存将不可用（不影响路由契约）" >&2
fi

nohup "$BIN" >"$SERVER_LOG" 2>&1 &
SPID=$!
READY=0
for _ in $(seq 1 120); do
  if curl -sf "http://127.0.0.1:$PORT/api/server/health" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo "[WCS-local] 隔离 BFF 在 ${PORT} 端口 120s 内未就绪，日志尾部：" >&2
  tail -30 "$SERVER_LOG" >&2
  exit 1
fi
echo "[WCS-local] 隔离 BFF 就绪（db=${DB_TAIL}, port=${PORT}），开始实跑契约冒烟"

WEB_SMOKE_ENV="${WEB_SMOKE_ENV:-local}" \
TOPEMS_INSTANCE=dev \
WEB_BFF_URL="http://127.0.0.1:$PORT" \
python3 scripts/web_contract_smoke.py "$@"
