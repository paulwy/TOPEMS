#!/usr/bin/env bash
# =============================================================================
# 字典回灌窗口执行器（先灌后发）— prod 只读演练 / 窗口执行通用
#
# 阶段（按顺序）：
#   backup               备份 dict 两表（pg_dump -Fc + 文本基线 + SHA256）
#   replay               调用 seed_dict_replay（只合并，不清表）
#   cleanup              守卫式删除 zz_b4_probe2 等测试残留
#   verify               6 组核对 SQL（含 legacy 4 类保留校验）
#   release              前向迁移（apply-forward.sh，> anchor）；应用部署/重启仍需人工
#   smoke                HTTP 冒烟（超管列表、普通租户可见性、通知创建）
#   rollback-incremental 增量回滚：删除窗口内新增行（保留 legacy 与存量）
#   rollback-restore     备份恢复：TRUNCATE 两表 + pg_restore --data-only
#   all-pre-release      backup + replay + cleanup + verify
#
# 用法：
#   scripts/db/dict-replay-window.sh verify --dsn "$DSN"
#   scripts/db/dict-replay-window.sh all-pre-release --dsn "$DSN" \
#     --seed-bin target/debug/examples/seed_dict_replay
#   scripts/db/dict-replay-window.sh release --dsn "$DSN" --anchor 20261105235700 --prod
#   scripts/db/dict-replay-window.sh smoke --base-url http://127.0.0.1:8099 \
#     --super-token "$SUPER" --tenant-token "$TENANT" --notify-user-id "$UUID"
#
# 安全：replay / cleanup / release / rollback-* 必须设置 DICT_WINDOW_CONFIRM=yes。
# 期望值默认：types=77, items=397, 标准类=73/380, legacy=4/17（prod 2026-11-06 只读基线）。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="${1:-}"
shift || true

DSN="${DICT_WINDOW_DSN:-${DATABASE_URL:-}}"
OUT_DIR="${DICT_WINDOW_OUT_DIR:-}"
BACKUP_DIR="${DICT_WINDOW_BACKUP_DIR:-/Users/air/topems/backups}"
SEED_BIN="${DICT_WINDOW_SEED_BIN:-$ROOT/target/debug/examples/seed_dict_replay}"
ANCHOR=""
PROD_FLAG=""
BASE_URL=""
SUPER_TOKEN=""
TENANT_TOKEN=""
TENANT_ID=""
NOTIFY_USER_ID=""
EXPECT_TENANT_TOTAL=""
SINCE=""
EXPECTED_TYPES="${DICT_EXPECTED_TYPES:-77}"
EXPECTED_ITEMS="${DICT_EXPECTED_ITEMS:-397}"
EXPECTED_STANDARD_TYPES="${DICT_EXPECTED_STANDARD_TYPES:-73}"
EXPECTED_STANDARD_ITEMS="${DICT_EXPECTED_STANDARD_ITEMS:-380}"
EXPECTED_LEGACY_TYPES="${DICT_EXPECTED_LEGACY_TYPES:-4}"
EXPECTED_LEGACY_ITEMS="${DICT_EXPECTED_LEGACY_ITEMS:-17}"

usage() { sed -n '2,31p' "$0"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --seed-bin) SEED_BIN="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --prod) PROD_FLAG="--prod"; shift ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --super-token) SUPER_TOKEN="$2"; shift 2 ;;
    --tenant-token) TENANT_TOKEN="$2"; shift 2 ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --notify-user-id) NOTIFY_USER_ID="$2"; shift 2 ;;
    --expect-tenant-total) EXPECT_TENANT_TOTAL="$2"; shift 2 ;;
    --since) SINCE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$STAGE" ]] || { usage; exit 2; }
[[ -n "$DSN" ]] || { echo "缺少 --dsn（或 DICT_WINDOW_DSN / DATABASE_URL）" >&2; exit 2; }

if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="$ROOT/tmp/dict-window-$(date +%Y%m%d_%H%M%S)"
 fi
mkdir -p "$OUT_DIR"

require_confirm() {
  if [[ "${DICT_WINDOW_CONFIRM:-}" != "yes" ]]; then
    echo "拒绝执行 ${STAGE}：请设置 DICT_WINDOW_CONFIRM=yes" >&2
    exit 2
  fi
}

psql_x() { psql "$DSN" -X -v ON_ERROR_STOP=1 "$@"; }

latest_dump_for() {
  # $1 = 表名（core_dict_types / core_dict_items）
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/"$1"_*.dump 2>/dev/null | head -n 1
}

stage_backup() {
  local ts txt dump csv qualified table count
  ts="$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  txt="$OUT_DIR/dict_before_${ts}.txt"

  for table in core_dict_types core_dict_items; do
    qualified="public.$table"
    dump="$BACKUP_DIR/${table}_${ts}.dump"
    csv="$BACKUP_DIR/${table}_${ts}.csv"

    echo "[backup] pg_dump -> $dump"
    PGOPTIONS="${PGOPTIONS:-} -c app.rls_system=on" pg_dump "$DSN" -Fc \
      -t "$qualified" --enable-row-security -f "$dump"
    shasum -a 256 "$dump" > "$dump.sha256"

    echo "[backup] CSV -> $csv"
    psql_x -q -c "SET app.rls_system='on'" \
      -c "\copy (SELECT * FROM $qualified) TO '$csv' WITH (FORMAT csv, HEADER true)"
    count="$(psql_x -q -A -t -c "SET app.rls_system='on'" -c "SELECT count(*) FROM $qualified")"
    echo "[backup] $table rows=$count"
    printf '%s\t%s\t%s\n' "$table" "$count" "$dump" >> "$OUT_DIR/backup_manifest.tsv"
  done

  echo "[backup] 文本基线 -> $txt"
  psql_x -q -A -F'|' -c "SET app.rls_system='on'" -c "
    SELECT 'type', code, name, category, tenant_id, deleted_at
      FROM public.core_dict_types
    UNION ALL
    SELECT 'item', t.code || '.' || i.code, i.name, '', i.tenant_id, i.deleted_at
      FROM public.core_dict_items i
      JOIN public.core_dict_types t ON t.id = i.dict_type_id
    ORDER BY 1, 2" > "$txt"

  psql_x -q -A -t -c "SELECT now()" > "$OUT_DIR/window_start.txt"
  echo "[backup] window_start=$(cat "$OUT_DIR/window_start.txt")"
  echo "[backup] 备份文件：$BACKUP_DIR"
  echo "[backup] OK"
}

stage_replay() {
  require_confirm
  [[ -x "$SEED_BIN" ]] || {
    echo "seed 二进制不存在: $SEED_BIN" >&2
    echo "先构建：cargo build -p topems-master-data --example seed_dict_replay" >&2
    exit 2
  }
  if [[ ! -f "$OUT_DIR/window_start.txt" ]]; then
    psql_x -q -A -t -c "SELECT now()" > "$OUT_DIR/window_start.txt"
  fi
  echo "[replay] $SEED_BIN -> $DSN"
  DATABASE_URL="$DSN" DICT_REPLAY_CONFIRM=yes "$SEED_BIN"
  echo "[replay] OK"
}

stage_cleanup() {
  require_confirm
  echo "[cleanup] 删除 zz_b4_probe2（先断言 0 项）"
  psql_x <<'SQL'
BEGIN;
SET LOCAL app.rls_system = 'on';
DO $$
DECLARE
  n_items int;
  n_types int;
BEGIN
  SELECT count(*) INTO n_items
    FROM public.core_dict_items i
    JOIN public.core_dict_types t ON t.id = i.dict_type_id
   WHERE t.code = 'zz_b4_probe2';
  IF n_items <> 0 THEN
    RAISE EXCEPTION 'zz_b4_probe2 存在 % 个字典项，拒绝自动删除', n_items;
  END IF;

  SELECT count(*) INTO n_types
    FROM public.core_dict_types
   WHERE code = 'zz_b4_probe2' AND category = 'general' AND deleted_at IS NULL;
  IF n_types > 1 THEN
    RAISE EXCEPTION 'zz_b4_probe2 类型行数异常: %', n_types;
  END IF;

  DELETE FROM public.core_dict_types
   WHERE code = 'zz_b4_probe2' AND category = 'general';
  RAISE NOTICE 'zz_b4_probe2 清理完成（删除类型 % 行）', n_types;
END $$;
COMMIT;
SQL
  echo "[cleanup] OK"
}

stage_verify() {
  echo "[verify] 6 组核对"
  psql_x \
    -v expected_types="$EXPECTED_TYPES" \
    -v expected_items="$EXPECTED_ITEMS" \
    -v expected_standard_types="$EXPECTED_STANDARD_TYPES" \
    -v expected_standard_items="$EXPECTED_STANDARD_ITEMS" \
    -v expected_legacy_types="$EXPECTED_LEGACY_TYPES" \
    -v expected_legacy_items="$EXPECTED_LEGACY_ITEMS" \
    -f "$ROOT/scripts/db/sql/dict_replay_verify.sql"
  echo "[verify] OK"
}

stage_release() {
  require_confirm
  [[ -n "$ANCHOR" ]] || { echo "release 需要 --anchor <version>" >&2; exit 2; }
  echo "[release] 前向迁移（> ${ANCHOR}）"
  bash "$ROOT/scripts/migration/apply-forward.sh" --dsn "$DSN" \
    --anchor "$ANCHOR" $PROD_FLAG
  echo "[release] 迁移完成；仍需人工部署新二进制并滚动重启（先 master-data，再 server）"
}

stage_smoke() {
  [[ -n "$BASE_URL" ]] || { echo "smoke 需要 --base-url" >&2; exit 2; }
  [[ -n "$SUPER_TOKEN" ]] || { echo "smoke 需要 --super-token" >&2; exit 2; }
  [[ -n "$TENANT_TOKEN" ]] || { echo "smoke 需要 --tenant-token" >&2; exit 2; }

  local dict_url="$BASE_URL/api/master-data/dict/dict-types?page=1&page_size=100"
  echo "[smoke] 超管字典列表"
  curl -sS -o "$OUT_DIR/smoke_super.json" -w '%{http_code}' \
    -H "Authorization: Bearer $SUPER_TOKEN" "$dict_url" > "$OUT_DIR/smoke_super.code"
  [[ "$(cat "$OUT_DIR/smoke_super.code")" == "200" ]] || {
    echo "超管字典列表 HTTP $(cat "$OUT_DIR/smoke_super.code")" >&2
    cat "$OUT_DIR/smoke_super.json" >&2
    exit 1
  }
  python3 - "$OUT_DIR/smoke_super.json" "$EXPECTED_TYPES" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
data = payload.get("data", payload)
assert data.get("total", 0) >= int(sys.argv[2]), f"超管字典 total={data.get('total')}"
codes = {i.get("code") for i in data.get("items", [])}
for code in ("department_type", "education", "marital_status", "position_level"):
    assert code in codes or data.get("total", 0) > 100, f"超管视图缺少 legacy 类 {code}"
print(f"[smoke] 超管列表 PASS total={data.get('total')}")
PY

  echo "[smoke] 普通租户字典可见性"
  curl -sS -o "$OUT_DIR/smoke_tenant.json" -w '%{http_code}' \
    -H "Authorization: Bearer $TENANT_TOKEN" "$dict_url" > "$OUT_DIR/smoke_tenant.code"
  [[ "$(cat "$OUT_DIR/smoke_tenant.code")" == "200" ]] || {
    echo "普通租户字典列表 HTTP $(cat "$OUT_DIR/smoke_tenant.code")" >&2
    cat "$OUT_DIR/smoke_tenant.json" >&2
    exit 1
  }
  python3 - "$OUT_DIR/smoke_tenant.json" "$EXPECT_TENANT_TOTAL" "$TENANT_ID" <<'PY'
import json, sys
payload = json.load(open(sys.argv[1]))
data = payload.get("data", payload)
expected = sys.argv[2]
tenant = sys.argv[3]
if expected != "":
    assert data.get("total", 0) == int(expected), f"普通租户 total={data.get('total')} != {expected}"
if tenant and tenant != "00000000-0000-0000-0000-000000000001":
    codes = {i.get("code") for i in data.get("items", [])}
    leaked = codes & {"department_type", "education", "marital_status", "position_level",
                      "common_status", "currency"}
    assert not leaked, f"普通租户泄露系统字典: {sorted(leaked)}"
print(f"[smoke] 普通租户可见性 PASS total={data.get('total')} tenant={tenant or '-'}")
PY

  echo "[smoke] 通知创建"
  [[ -n "$NOTIFY_USER_ID" ]] || { echo "smoke 需要 --notify-user-id" >&2; exit 2; }
  cat > "$OUT_DIR/smoke_notify.json" <<JSON
{"user_id":"$NOTIFY_USER_ID","title":"dict-replay-window-smoke","content":"窗口冒烟","notification_type":"system","priority":1}
JSON
  code="$(curl -sS -o "$OUT_DIR/smoke_notify.resp" -w '%{http_code}' \
    -H "Authorization: Bearer $SUPER_TOKEN" -H 'Content-Type: application/json' \
    --data @"$OUT_DIR/smoke_notify.json" \
    "$BASE_URL/api/communication/notification/notifications")"
  [[ "$code" == "200" ]] || {
    echo "通知创建 HTTP $code" >&2
    cat "$OUT_DIR/smoke_notify.resp" >&2
    exit 1
  }
  echo "[smoke] 通知创建 PASS HTTP 200"
}

stage_incremental() {
  require_confirm
  local since="${SINCE:-}"
  if [[ -z "$since" ]]; then
    [[ -f "$OUT_DIR/window_start.txt" ]] || {
      echo "缺少 --since 或 $OUT_DIR/window_start.txt" >&2
      exit 2
    }
    since="$(cat "$OUT_DIR/window_start.txt")"
  fi
  echo "[rollback-incremental] 删除 created_at >= $since 的字典行"
  psql_x -v since="$since" <<SQL
BEGIN;
SET LOCAL app.rls_system = 'on';
DELETE FROM public.core_dict_items WHERE created_at >= :'since'::timestamptz;
DELETE FROM public.core_dict_types WHERE created_at >= :'since'::timestamptz;
DO \$\$
DECLARE
  legacy_types int;
  legacy_items int;
BEGIN
  SELECT count(*) INTO legacy_types FROM public.core_dict_types
   WHERE deleted_at IS NULL
     AND code IN ('department_type','education','marital_status','position_level');
  SELECT count(*) INTO legacy_items
    FROM public.core_dict_items i
    JOIN public.core_dict_types t ON t.id = i.dict_type_id
   WHERE i.deleted_at IS NULL
     AND t.code IN ('department_type','education','marital_status','position_level');
  IF legacy_types <> 4 OR legacy_items <> 17 THEN
    RAISE EXCEPTION '增量回滚误删 legacy：types=% items=%', legacy_types, legacy_items;
  END IF;
  RAISE NOTICE '增量回滚 OK，legacy 4 类 / 17 项仍在';
END \$\$;
COMMIT;
SQL
  echo "[rollback-incremental] OK"
}

stage_restore() {
  require_confirm
  local dump_types dump_items
  dump_types="${DICT_WINDOW_DUMP_TYPES:-$(latest_dump_for core_dict_types)}"
  dump_items="${DICT_WINDOW_DUMP_ITEMS:-$(latest_dump_for core_dict_items)}"
  [[ -n "$dump_types" && -f "$dump_types" ]] || {
    echo "找不到 core_dict_types 备份 dump（$BACKUP_DIR/core_dict_types_*.dump）" >&2
    exit 2
  }
  [[ -n "$dump_items" && -f "$dump_items" ]] || {
    echo "找不到 core_dict_items 备份 dump（$BACKUP_DIR/core_dict_items_*.dump）" >&2
    exit 2
  }
  echo "[rollback-restore] TRUNCATE + pg_restore --data-only"
  echo "[rollback-restore]   types <- $dump_types"
  echo "[rollback-restore]   items <- $dump_items"
  echo "[rollback-restore] 注意：pg_restore 的 -t 不匹配 schema.table，必须用 -n public -t <table>；"
  echo "[rollback-restore] 且 items 依赖 types，必须分两步按依赖顺序恢复并开启 --exit-on-error"
  psql_x <<'SQL'
BEGIN;
SET LOCAL app.rls_system = 'on';
TRUNCATE public.core_dict_items, public.core_dict_types;
COMMIT;
SQL
  PGOPTIONS="${PGOPTIONS:-} -c app.rls_system=on" pg_restore \
    --data-only --enable-row-security --exit-on-error \
    -n public -t core_dict_types \
    -d "$DSN" "$dump_types"
  PGOPTIONS="${PGOPTIONS:-} -c app.rls_system=on" pg_restore \
    --data-only --enable-row-security --exit-on-error \
    -n public -t core_dict_items \
    -d "$DSN" "$dump_items"
  echo "[rollback-restore] OK"
}

case "$STAGE" in
  backup) stage_backup ;;
  replay) stage_replay ;;
  cleanup) stage_cleanup ;;
  verify) stage_verify ;;
  release) stage_release ;;
  smoke) stage_smoke ;;
  rollback-incremental) stage_incremental ;;
  rollback-restore) stage_restore ;;
  all-pre-release)
    stage_backup
    stage_replay
    stage_cleanup
    stage_verify
    ;;
  *) echo "未知阶段: $STAGE" >&2; usage; exit 2 ;;
esac

echo "[$STAGE] done (out_dir=$OUT_DIR)"
