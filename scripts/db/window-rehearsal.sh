#!/usr/bin/env bash
# =============================================================================
# 本地四段窗口整套演练（scratch 克隆库 + stub 冒烟）
#
# 做：
#   1) 从本地 topems 克隆两个 scratch：drill / verify（不动主开发库）
#   2) drill 重置为 prod 2026-11-06 只读基线（7 类/24 项），补 prod 形态列 shim
#   3) 预先把并行迁移 09–11 应用，只留 08（字典收紧）与 12（7 表收紧）在窗口内
#   4) 调 window-execution.sh all：前置→备份→恢复验证→字典→回填→清理→发布收紧→冒烟
#   5) 输出分段耗时/总耗时；成功后 DROP 两个 scratch，保留备份文件
#
# 用法：
#   scripts/db/window-rehearsal.sh
#   KEEP_DRILL_DB=1 scripts/db/window-rehearsal.sh   # 失败/复核时保留库
#
# prod 全程只读：本脚本只连本地 PostgreSQL。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
DRILL_DB="topems_window_drill"
VERIFY_DB="topems_window_verify"
PG_SCHEME='postgres'
URL_SEP='://'
DRILL_DSN="${PG_SCHEME}${URL_SEP}air@localhost/${DRILL_DB}?host=%2Ftmp"
VERIFY_DSN="${PG_SCHEME}${URL_SEP}air@localhost/${VERIFY_DB}?host=%2Ftmp"

# app 角色凭据不入库：优先 WINDOW_APP_DSN，其次 WINDOW_APP_PASSWORD / PGPASSWORD。
APP_ROLE="${WINDOW_APP_ROLE:-topems_app}"
APP_PASSWORD="${WINDOW_APP_PASSWORD:-${PGPASSWORD:-}}"
if [[ -z "${WINDOW_APP_DSN:-}" && -z "$APP_PASSWORD" ]]; then
  echo "需设置 WINDOW_APP_DSN，或 WINDOW_APP_PASSWORD（app 角色密码，用于收紧后可见性验证）" >&2
  exit 2
fi
DRILL_APP_DSN="${WINDOW_APP_DSN:-${PG_SCHEME}${URL_SEP}${APP_ROLE}:${APP_PASSWORD}@127.0.0.1:5432/${DRILL_DB}}"
OUT="$ROOT/tmp/window-rehearsal-$TS"
WALL_START=$SECONDS
BACKUP_DIR="/Users/air/topems/backups"
PORT=18099
KEEP="${KEEP_DRILL_DB:-0}"
STUB_PID=""
SUCCESS=0
MIG_TIGHTEN="$ROOT/database/migrations/20261107000013_rls_tenant_isolation_backfilled_7.sql"

mkdir -p "$OUT"

stop_stub() {
  if [[ -n "$STUB_PID" ]] && kill -0 "$STUB_PID" 2>/dev/null; then
    kill "$STUB_PID" 2>/dev/null || true
    wait "$STUB_PID" 2>/dev/null || true
  fi
}

finish() {
  stop_stub
  if [[ -f "${MIG_TIGHTEN}.hold" ]]; then
    mv "${MIG_TIGHTEN}.hold" "$MIG_TIGHTEN"
  fi
  if [[ "$SUCCESS" == "1" && "$KEEP" != "1" ]]; then
    dropdb --if-exists "$DRILL_DB" 2>/dev/null || true
    dropdb --if-exists "$VERIFY_DB" 2>/dev/null || true
    echo "[cleanup] DROP ${DRILL_DB} / ${VERIFY_DB}"
  else
    echo "[cleanup] 保留 ${DRILL_DB} / ${VERIFY_DB}（SUCCESS=${SUCCESS} KEEP=${KEEP}）"
  fi
}
trap finish EXIT

echo "== 0. 创建 scratch 克隆库 =="
dropdb --if-exists "$DRILL_DB"
dropdb --if-exists "$VERIFY_DB"
createdb -T topems -O "$(id -un)" "$DRILL_DB"
createdb -T topems -O "$(id -un)" "$VERIFY_DB"
echo "drill=$DRILL_DB verify=$VERIFY_DB"

echo "== 0b. 字典重置为 prod 基线 + prod 形态 shim =="
psql "$DRILL_DSN" -X -v ON_ERROR_STOP=1 \
  -f "$ROOT/scripts/db/sql/rehearsal_baseline_prod_shape.sql"

# 恢复验证库同样需要 prod 形态列，否则 dump 含 created_by 无法恢复
psql "$VERIFY_DSN" -X -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS created_by uuid"

echo "== 0c. 账本回退：08 与 12 都留到第四段应用 =="
psql "$DRILL_DSN" -X -v ON_ERROR_STOP=1 \
  -c "DELETE FROM _sqlx_migrations WHERE version = 20261107000008"
ANCHOR="$(psql "$DRILL_DSN" -X -A -t -c 'SELECT max(version) FROM _sqlx_migrations WHERE success')"
echo "anchor=$ANCHOR"

echo "== 0e. 启动 stub 冒烟服务 =="
python3 "$ROOT/scripts/db/stub_window_smoke.py" --port "$PORT" > "$OUT/stub.log" 2>&1 &
STUB_PID=$!
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; then break; fi
  sleep 0.2
done
curl -sf "http://127.0.0.1:$PORT/health" >/dev/null || { echo "stub 未就绪" >&2; exit 1; }
echo "stub pid=$STUB_PID port=$PORT"

echo "== 0f. 四段执行 =="
WINDOW_AUTO=1 WINDOW_TARGET=local \
  WINDOW_BACKUP_DIR="$BACKUP_DIR" \
  bash "$ROOT/scripts/db/window-execution.sh" all \
    --dsn "$DRILL_DSN" \
    --app-dsn "$DRILL_APP_DSN" \
    --restore-dsn "$VERIFY_DSN" \
    --out-dir "$OUT/window" \
    --backup-dir "$BACKUP_DIR" \
    --anchor "$ANCHOR" \
    --base-url "http://127.0.0.1:$PORT" \
    --super-token super --tenant-token tenant \
    --tenant-id 11111111-1111-1111-1111-111111111111 \
    --notify-user-id e91e2228-ab9d-4ac3-99f4-fdcd9c723f21

echo "== 0g. 汇总 =="
{
  echo "rehearsal_ts=$TS"
  echo "drill_db=$DRILL_DB"
  echo "verify_db=$VERIFY_DB"
  echo "anchor=$ANCHOR"
  echo "backup_dir=$BACKUP_DIR"
  echo "--- timings ---"
  cat "$OUT/window/timings.tsv"
  echo "--- total ---"
  awk -F'\t' 'NR>1 {sum+=$2} END {printf "total_ms=%d total_s=%.2f\n", sum, sum/1000}' "$OUT/window/timings.tsv"
  echo "wall_s=$((SECONDS - WALL_START))"
  echo "--- backup verify ---"
  cat "$OUT/window/backup_verify.tsv"
  echo "--- backups (this run) ---"
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR" | head -20
} | tee "$OUT/summary.txt"

SUCCESS=1
echo "== 演练完成：$OUT =="
