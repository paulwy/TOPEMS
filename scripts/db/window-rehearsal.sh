#!/usr/bin/env bash
# =============================================================================
# 本地四段窗口整套演练（scratch 克隆库 + SSH 传输模拟 + stub 冒烟）
#
# 做：
#   1) 从本地 topems 克隆两个 scratch：drill / verify（不动主开发库）
#   2) drill 重置为 prod 2026-11-06 只读基线（7 类/24 项），补 prod 形态列 shim
#   3) 账本回退到 06：07–13 均为 pending；本轮只应用白名单 08 + 13，其余显式 defer
#   4) 白名单负例：临时塞入 20261108000000 清单外迁移，apply-forward 必须在任何
#      DDL 之前退出非 0；断言探针表不存在、账本无该版本
#   5) SSH 传输模拟：本地 shim 承担 ssh/scp，逐件投递 SQL/迁移/seed 并 sha256 校验
#   6) 调 window-execution.sh all：前置→备份→恢复验证→字典→回填→清理→发布收紧→冒烟
#   7) 输出分段耗时/总耗时；成功后 DROP 两个 scratch，保留备份文件
#
# 用法：
#   scripts/db/window-rehearsal.sh
#   KEEP_DRILL_DB=1 scripts/db/window-rehearsal.sh   # 失败/复核时保留库
#
# prod 全程只读：本脚本只连本地 PostgreSQL，ssh/scp 均为本地 shim。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
DRILL_DB="topems_window_drill"
VERIFY_DB="topems_window_verify"
PG_SCHEME='postgres'
URL_SEP='://'
DRILL_DSN="${PG_SCHEME}${URL_SEP}$(id -un)@localhost/${DRILL_DB}?host=%2Ftmp"
VERIFY_DSN="${PG_SCHEME}${URL_SEP}$(id -un)@localhost/${VERIFY_DB}?host=%2Ftmp"
OUT="$ROOT/tmp/window-rehearsal-$TS"
WALL_START=$SECONDS
BACKUP_DIR="$ROOT/backups"
PORT=18099
KEEP="${KEEP_DRILL_DB:-0}"
STUB_PID=""
SUCCESS=0
NEG_FILE="$ROOT/database/migrations/20261108000000_rehearsal_out_of_list.sql"
MIG_TIGHTEN="$ROOT/database/migrations/20261107000013_rls_tenant_isolation_backfilled_7.sql"
ONLY_MIGRATIONS="20261107000008,20261107000013"

mkdir -p "$OUT"

stop_stub() {
  if [[ -n "$STUB_PID" ]] && kill -0 "$STUB_PID" 2>/dev/null; then
    kill "$STUB_PID" 2>/dev/null || true
    wait "$STUB_PID" 2>/dev/null || true
  fi
}

finish() {
  stop_stub
  rm -f "$NEG_FILE"
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

psql "$VERIFY_DSN" -X -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS created_by uuid"

echo "== 0c. 账本回退：08 留到第四段应用 =="
psql "$DRILL_DSN" -X -v ON_ERROR_STOP=1 \
  -c "DELETE FROM _sqlx_migrations WHERE version = 20261107000008"
ANCHOR="$(psql "$DRILL_DSN" -X -A -t -c 'SELECT max(version) FROM _sqlx_migrations WHERE success')"
echo "anchor=$ANCHOR"

echo "== 0d. 计算显式 defer（已评审但本窗口不应用） =="
compute_defer() {
  local anchor="$1" f b v list=""
  for f in "$ROOT"/database/migrations/*.sql; do
    b="$(basename "$f")"
    [[ "$b" =~ ^[0-9]{14}_ ]] || continue
    v="${b%%_*}"
    (( 10#$v > 10#$anchor )) || continue
    if psql "$DRILL_DSN" -X -A -t -c "SELECT 1 FROM _sqlx_migrations WHERE version=$v AND success" | grep -q 1; then
      continue
    fi
    [[ ",$ONLY_MIGRATIONS," == *",$v,"* ]] && continue
    list+="${list:+,}$v"
  done
  echo "$list"
}
DEFER="$(compute_defer "$ANCHOR")"
echo "defer=$DEFER"

echo "== 0e. 白名单负例：清单外迁移必须硬拒（零 DDL） =="
cat > "$NEG_FILE" <<'SQL'
CREATE TABLE public.zz_whitelist_probe (id int);
SQL
set +e
bash "$ROOT/scripts/migration/apply-forward.sh" --dsn "$DRILL_DSN" --anchor "$ANCHOR" \
  --only "$ONLY_MIGRATIONS" --defer "$DEFER" > "$OUT/whitelist_block.txt" 2>&1
BLOCK_RC=$?
set -e
PROBE="$(psql "$DRILL_DSN" -X -A -t -c "SELECT COALESCE(to_regclass('public.zz_whitelist_probe')::text, '<null>')")"
NEG_LEDGER="$(psql "$DRILL_DSN" -X -A -t -c "SELECT count(*) FROM _sqlx_migrations WHERE version = 20261108000000")"
echo "whitelist_block_rc=$BLOCK_RC probe=$PROBE ledger=$NEG_LEDGER" | tee "$OUT/whitelist_result.txt"
cat "$OUT/whitelist_block.txt"
[[ $BLOCK_RC -ne 0 ]] || { echo "FAIL：清单外迁移未被拦截（rc=0）" >&2; exit 1; }
[[ "$PROBE" == "<null>" ]] || { echo "FAIL：拦截前已产生 DDL（${PROBE}）" >&2; exit 1; }
[[ "$NEG_LEDGER" == "0" ]] || { echo "FAIL：拦截前账本已新增" >&2; exit 1; }
rm -f "$NEG_FILE"
echo "PASS：清单外迁移 exit=${BLOCK_RC}，探针不存在，账本未新增"

echo "== 0f. 启动 stub 冒烟服务 =="
python3 "$ROOT/scripts/db/stub_window_smoke.py" --port "$PORT" > "$OUT/stub.log" 2>&1 &
STUB_PID=$!
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null; then break; fi
  sleep 0.2
done
curl -sf "http://127.0.0.1:$PORT/health" >/dev/null || { echo "stub 未就绪" >&2; exit 1; }
echo "stub pid=$STUB_PID port=$PORT"

echo "== 0g. SSH 传输模拟 shim =="
SIM="$OUT/sim"
mkdir -p "$SIM/bin" "$SIM/remote"
cat > "$SIM/bin/ssh" <<'EOF'
#!/usr/bin/env bash
# 本地 ssh 模拟：忽略 host，执行远端命令字符串
set -e
shift
exec bash -c "$*"
EOF
cat > "$SIM/bin/scp" <<'EOF'
#!/usr/bin/env bash
# 本地 scp 模拟：去掉 host: 前缀后本地复制
set -e
args=()
for a in "$@"; do
  if [[ "$a" == *:* && "$a" != /* ]]; then a="${a#*:}"; fi
  args+=("$a")
done
exec cp -f "${args[@]}"
EOF
chmod +x "$SIM/bin/ssh" "$SIM/bin/scp"
echo "ssh=$SIM/bin/ssh scp=$SIM/bin/scp remote_dir=$SIM/remote"

echo "== 0h. 四段执行（SSH 模式模拟） =="
WINDOW_AUTO=1 WINDOW_TARGET=local WINDOW_ALLOW_DIRTY=1 \
  WINDOW_BACKUP_DIR="$BACKUP_DIR" \
  WINDOW_SSH_BIN="$SIM/bin/ssh" \
  WINDOW_SCP_BIN="$SIM/bin/scp" \
  WINDOW_REMOTE_PGHOST=/tmp \
  WINDOW_REMOTE_PGUSER="$(id -un)" \
  WINDOW_REMOTE_DSN="postgres://$(id -un)@localhost/${DRILL_DB}?host=%2Ftmp" \
  bash "$ROOT/scripts/db/window-execution.sh" all \
    --ssh-host rehearsal-local \
    --remote-db "$DRILL_DB" \
    --remote-dir "$SIM/remote" \
    --restore-dsn "$VERIFY_DSN" \
    --out-dir "$OUT/window" \
    --backup-dir "$BACKUP_DIR" \
    --anchor "$ANCHOR" \
    --allow-migrations "$ONLY_MIGRATIONS" \
    --defer-migrations "$DEFER" \
    --expect-commit "$(git -C "$ROOT" rev-parse HEAD)" \
    --no-build-seed \
    --app-role topems_app \
    --base-url "http://127.0.0.1:$PORT" \
    --super-token super --tenant-token tenant \
    --tenant-id 11111111-1111-1111-1111-111111111111 \
    --notify-user-id e91e2228-ab9d-4ac3-99f4-fdcd9c723f21

echo "== 0i. 汇总 =="
{
  echo "rehearsal_ts=$TS"
  echo "drill_db=$DRILL_DB"
  echo "verify_db=$VERIFY_DB"
  echo "anchor=$ANCHOR"
  echo "defer=$DEFER"
  echo "backup_dir=$BACKUP_DIR"
  echo "--- whitelist negative ---"
  cat "$OUT/whitelist_result.txt"
  echo "--- timings ---"
  cat "$OUT/window/timings.tsv"
  echo "--- total ---"
  awk -F'\t' 'NR>1 {sum+=$2} END {printf "total_ms=%d total_s=%.2f\n", sum, sum/1000}' "$OUT/window/timings.tsv"
  echo "wall_s=$((SECONDS - WALL_START))"
  echo "--- backup verify ---"
  cat "$OUT/window/backup_verify.tsv"
  echo "--- artifacts sha256 ---"
  cat "$OUT/window/artifacts.tsv"
  echo "--- backups (this run) ---"
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR" | head -20
} | tee "$OUT/summary.txt"

SUCCESS=1
echo "== 演练完成：$OUT =="
