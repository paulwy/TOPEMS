#!/usr/bin/env bash
# =============================================================================
# 窗口执行总入口（四段串行，禁止跳段）
#
# 段落：
#   preflight     前置检查（表/列存在、现场重测计数、长事务）
#   backup        9 张表 pg_dump -Fc + CSV，命名 <table>_<yyyyMMdd_HHmmss>.<dump|csv>
#   verify-backup 恢复到 --restore-dsn，逐表比对行数与整行指纹
#   s1            字典回灌 77 类/397 项（调用 dict-replay-window.sh）
#   s2            回填 317 行（rfm 300 + audit 17，现场重测）
#   s3            A 组清理 + B 组 orphan 标记
#   s4            前向迁移（字典 08 + 回填 7 表收紧 13）+ 后核对
#   smoke         HTTP 冒烟（真实 BFF 或 stub）
#
# 一键入口（本地演练）：
#   WINDOW_AUTO=1 scripts/db/window-execution.sh all \
#     --dsn "$DRILL_DSN" \
#     --out-dir /tmp/window-all \
#     --restore-dsn "$VERIFY_DSN" \
#     --anchor 20261107000007 \
#     --base-url http://127.0.0.1:18099 --super-token super --tenant-token tenant \
#     --tenant-id 11111111-1111-1111-1111-111111111111 --notify-user-id e91e2228-ab9d-4ac3-99f4-fdcd9c723f21
#
# 非演练（WINDOW_AUTO 未设置）时，每个段落结束都会停在 [人工确认]：
#   备份验证后 / s1 后 / s2 后 / s3 后 / s4 后；输入 yes 才继续，否则 exit 3。
#   prod 目标需要 WINDOW_TARGET=prod ALLOW_PROD_WINDOW=yes 且 DSN 不含 prod 字样；
#   本轮（2026-11-06）prod 只读，脚本只用于本地 scratch 演练。
#
# 退出码：0 成功；1 段内失败（已打印中止点）；2 参数/守卫失败；3 等待人工确认
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="${1:-}"
shift || true

DSN="${WINDOW_DSN:-${DATABASE_URL:-}}"
OUT_DIR="${WINDOW_OUT_DIR:-$ROOT/tmp/window-$(date +%Y%m%d_%H%M%S)}"
BACKUP_DIR="${WINDOW_BACKUP_DIR:-/Users/air/topems/backups}"
RESTORE_DSN="${WINDOW_RESTORE_DSN:-}"
APP_DSN="${WINDOW_APP_DSN:-}"
ANCHOR="${WINDOW_ANCHOR:-}"
BASE_URL=""
SUPER_TOKEN=""
TENANT_TOKEN=""
TENANT_ID=""
NOTIFY_USER_ID=""
AUTO="${WINDOW_AUTO:-0}"
TARGET="${WINDOW_TARGET:-local}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --restore-dsn) RESTORE_DSN="$2"; shift 2 ;;
    --app-dsn) APP_DSN="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --super-token) SUPER_TOKEN="$2"; shift 2 ;;
    --tenant-token) TENANT_TOKEN="$2"; shift 2 ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --notify-user-id) NOTIFY_USER_ID="$2"; shift 2 ;;
    -h|--help) sed -n '2,34p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$STAGE" ]] || { sed -n '2,34p' "$0"; exit 2; }
[[ -n "$DSN" ]] || { echo "缺少 --dsn（或 WINDOW_DSN / DATABASE_URL）" >&2; exit 2; }
[[ -n "$APP_DSN" ]] || APP_DSN="$DSN"
mkdir -p "$OUT_DIR"
TIMINGS="$OUT_DIR/timings.tsv"
[[ -f "$TIMINGS" ]] || printf 'stage\tms\texit\n' > "$TIMINGS"

# --- 守卫：prod 只读期不允许本脚本写 prod -----------------------------------
is_prod_like() {
  local s="$1"
  [[ "$s" == *prod* ]]
}

if [[ "$TARGET" == "prod" ]]; then
  [[ "${ALLOW_PROD_WINDOW:-}" == "yes" ]] || {
    echo "拒绝：WINDOW_TARGET=prod 需要 ALLOW_PROD_WINDOW=yes" >&2
    exit 2
  }
  [[ "${WINDOW_CONFIRM:-}" == "yes" ]] || {
    echo "拒绝：prod 窗口需要 WINDOW_CONFIRM=yes" >&2
    exit 2
  }
  [[ -n "${PROD_WINDOW_REASON:-}" ]] || {
    echo "拒绝：prod 窗口需要 PROD_WINDOW_REASON（工单/审批号）" >&2
    exit 2
  }
elif is_prod_like "$DSN"; then
  echo "拒绝：DSN 含 prod 字样（$DSN）。本地演练请用 scratch 库；prod 窗口需 WINDOW_TARGET=prod + ALLOW_PROD_WINDOW=yes + WINDOW_CONFIRM=yes + PROD_WINDOW_REASON" >&2
  exit 2
fi

psql_x() { psql "$DSN" -X -v ON_ERROR_STOP=1 "$@"; }
sql_file() { psql "$DSN" -X -v ON_ERROR_STOP=1 -f "$ROOT/scripts/db/sql/$1"; }

now_ms() { python3 -c 'import time;print(int(time.time()*1000))'; }

run_timed() {
  local name="$1"; shift
  local start end rc
  start="$(now_ms)"
  set +e
  "$@"
  rc=$?
  set -e
  end="$(now_ms)"
  printf '%s\t%s\t%s\n' "$name" "$((end - start))" "$rc" >> "$TIMINGS"
  return "$rc"
}

confirm_gate() {
  local msg="$1"
  if [[ "$AUTO" == "1" ]]; then
    echo "[auto] $msg"
    return 0
  fi
  echo ""
  echo "[人工确认] $msg"
  if ! read -r -p "输入 yes 继续，其它退出: " ans; then
    echo "无交互输入，停在人工确认点" >&2
    exit 3
  fi
  [[ "$ans" == "yes" ]] || { echo "人工中止" >&2; exit 3; }
}

# 备份清单：schema.table -> 文件基名（全部有 tenant_id；全部走 dump+CSV）
TABLES=(
  "public.core_dict_types|core_dict_types"
  "public.core_dict_items|core_dict_items"
  "crm.crm_master_data_refs|crm_master_data_refs"
  "crm.returns|returns"
  "crm.customers|customers"
  "crm.rfm_results|rfm_results"
  "ehs.qa_ehs_risks|qa_ehs_risks"
  "ehs.qa_ehs_environment_monitors|qa_ehs_environment_monitors"
  "public.audit_logs|audit_logs"
)

stage_preflight() {
  echo "== 段 0 前置检查 =="
  sql_file window_preflight.sql 2>&1 | tee "$OUT_DIR/preflight.txt" || return 1
  local anchor
  anchor="$(psql_x -q -A -t -c 'SELECT max(version) FROM _sqlx_migrations WHERE success')" || return 1
  echo "WINDOW|anchor|$anchor" | tee -a "$OUT_DIR/preflight.txt"
  if [[ -n "$ANCHOR" && "$ANCHOR" != "$anchor" ]]; then
    echo "拒绝：--anchor=$ANCHOR 与现场账本 max(version)=$anchor 不一致" >&2
    return 1
  fi
}

stage_backup() {
  echo "== 段 1 备份（dump + CSV） =="
  mkdir -p "$BACKUP_DIR"
  local ts entry qualified base dump csv count
  ts="$(date +%Y%m%d_%H%M%S)"
  : > "$OUT_DIR/backup_manifest.tsv"
  for entry in "${TABLES[@]}"; do
    qualified="${entry%%|*}"
    base="${entry##*|}"
    dump="$BACKUP_DIR/${base}_${ts}.dump"
    csv="$BACKUP_DIR/${base}_${ts}.csv"

    PGOPTIONS="${PGOPTIONS:-} -c app.rls_system=on" pg_dump "$DSN" -Fc \
      -t "$qualified" --enable-row-security -f "$dump" || return 1
    shasum -a 256 "$dump" > "$dump.sha256" || return 1

    psql_x -q -c "SET app.rls_system='on'" \
      -c "\copy (SELECT * FROM $qualified) TO '$csv' WITH (FORMAT csv, HEADER true)" || return 1

    count="$(psql_x -q -A -t -c "SET app.rls_system='on'" -c "SELECT count(*) FROM $qualified")" || return 1
    [[ "$(head -c 1 "$csv" 2>/dev/null || true)" != "" ]] || {
      echo "CSV 为空: $csv" >&2; return 1
    }
    printf '%s\t%s\t%s\t%s\n' "$base" "$count" "$dump" "$csv" >> "$OUT_DIR/backup_manifest.tsv"
    echo "[backup] $base rows=$count -> $dump / $csv"
  done
  printf '%s\n' "$ts" > "$OUT_DIR/backup_ts.txt"
  # 字典脚本的 window_start 由 s1 生成；这里保留统一窗口起点
  psql_x -q -A -t -c "SELECT now()" > "$OUT_DIR/window_start.txt"
  echo "[backup] window_start=$(cat "$OUT_DIR/window_start.txt")"
}

fingerprint() {
  local dsn="$1" qualified="$2"
  psql "$dsn" -X -q -A -t -v ON_ERROR_STOP=1 \
    -c "SET app.rls_system='on'" \
    -c "SELECT 'rows|' || count(*) || '|' || COALESCE(md5(string_agg(x::text, '|' ORDER BY x::text)), 'empty') FROM $qualified x"
}

stage_verify_backup() {
  echo "== 段 1b 备份可恢复性验证 =="
  [[ -n "$RESTORE_DSN" ]] || { echo "verify-backup 需要 --restore-dsn（空 scratch 库，需已有表结构）" >&2; return 2; }
  local ts entry qualified base dump
  ts="$(cat "$OUT_DIR/backup_ts.txt")"

  # 清空 scratch 中的 9 张表（dict 两张一起 TRUNCATE，处理内部外键）
  local trunc_list=""
  for entry in "${TABLES[@]}"; do
    qualified="${entry%%|*}"
    trunc_list+="${trunc_list:+,}$qualified"
  done
  psql "$RESTORE_DSN" -X -v ON_ERROR_STOP=1 -c "BEGIN" \
    -c "SET LOCAL app.rls_system='on'" \
    -c "TRUNCATE $trunc_list CASCADE" -c "COMMIT" || return 1

  for entry in "${TABLES[@]}"; do
    qualified="${entry%%|*}"
    base="${entry##*|}"
    dump="$BACKUP_DIR/${base}_${ts}.dump"
    [[ -f "$dump" ]] || { echo "缺少 dump: $dump" >&2; return 1; }
    pg_restore --data-only --enable-row-security --exit-on-error \
      -n "${qualified%%.*}" -t "${qualified#*.}" -d "$RESTORE_DSN" "$dump" || return 1
    echo "[verify-backup] restored $qualified"
  done

  local before after
  for entry in "${TABLES[@]}"; do
    qualified="${entry%%|*}"
    base="${entry##*|}"
    before="$(fingerprint "$DSN" "$qualified")"
    after="$(fingerprint "$RESTORE_DSN" "$qualified")"
    if [[ "$before" != "$after" ]]; then
      echo "[verify-backup] FAIL $base" >&2
      echo "  source:  $before" >&2
      echo "  restore: $after" >&2
      return 1
    fi
    echo "[verify-backup] $base $before"
    printf '%s\t%s\n' "$base" "$before" >> "$OUT_DIR/backup_verify.tsv"
  done
  echo "[verify-backup] ALL 9 TABLES MATCH"
}

stage_s1() {
  echo "== 段 2 字典回灌（77/397） =="
  local ts; ts="$(cat "$OUT_DIR/backup_ts.txt")"
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" replay \
    --dsn "$DSN" --out-dir "$OUT_DIR/dict" 2>&1 | tee "$OUT_DIR/dict_replay.txt" || return 1
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" cleanup \
    --dsn "$DSN" --out-dir "$OUT_DIR/dict" 2>&1 | tee "$OUT_DIR/dict_cleanup.txt" || return 1
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" verify \
    --dsn "$APP_DSN" --out-dir "$OUT_DIR/dict" 2>&1 | tee "$OUT_DIR/dict_verify.txt" || return 1
  echo "[s1] 字典段落完成（backup_ts=${ts}）"
}

stage_s2() {
  echo "== 段 3 回填 317 行（现场重测） =="
  sql_file tenant_backfill_7.sql 2>&1 | tee "$OUT_DIR/backfill.txt" || return 1
}

stage_s3() {
  echo "== 段 4 A 组清理 + B 组 orphan 标记 =="
  sql_file tenant_cleanup_a_group.sql 2>&1 | tee "$OUT_DIR/cleanup_a.txt" || return 1
  sql_file tenant_orphan_mark_b.sql 2>&1 | tee "$OUT_DIR/cleanup_b.txt" || return 1
}

stage_s4() {
  echo "== 段 5 发布并收紧 =="
  [[ -n "$ANCHOR" ]] || { echo "s4 需要 --anchor（窗口前账本锚点）" >&2; return 2; }
  bash "$ROOT/scripts/migration/apply-forward.sh" --dsn "$DSN" --anchor "$ANCHOR" \
    2>&1 | tee "$OUT_DIR/release.txt" || return 1
  psql "$APP_DSN" -X -v ON_ERROR_STOP=1 -f "$ROOT/scripts/db/sql/window_postcheck.sql" \
    2>&1 | tee "$OUT_DIR/postcheck.txt" || return 1
  # RLS 可见性（以非 superuser 应用角色实测；失败即中止而不是静默跳过）
  if psql "$APP_DSN" -X -q -A -t -c "SELECT 1" >/dev/null 2>&1; then
    psql "$APP_DSN" -X -q -A -t \
      -c "SET app.tenant_id='00000000-0000-0000-0000-000000000001'" \
      -c "SELECT 'RLS|dict_0001|'||count(*) FROM public.core_dict_types" \
      -c "SET app.tenant_id='11111111-1111-1111-1111-111111111111'" \
      -c "SELECT 'RLS|dict_1111|'||count(*) FROM public.core_dict_types" \
      -c "SELECT 'RLS|audit_1111|'||count(*) FROM public.audit_logs" \
      -c "SELECT 'RLS|refs_1111|'||count(*) FROM crm.crm_master_data_refs" \
      | tee "$OUT_DIR/rls_visibility.txt" || return 1
  else
    echo "WARN 应用角色 DSN 不可用，跳过 RLS 可见性实测（prod 窗口必须执行）" | tee "$OUT_DIR/rls_visibility.txt"
  fi
}

stage_smoke() {
  echo "== 段 6 HTTP 冒烟 =="
  [[ -n "$BASE_URL" ]] || { echo "smoke 需要 --base-url" >&2; return 2; }
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" smoke \
    --dsn "$DSN" --out-dir "$OUT_DIR/dict" \
    --base-url "$BASE_URL" --super-token "$SUPER_TOKEN" --tenant-token "$TENANT_TOKEN" \
    --tenant-id "$TENANT_ID" --notify-user-id "$NOTIFY_USER_ID" \
    --expect-tenant-total "${WINDOW_EXPECT_TENANT_TOTAL:-0}" || return 1
}

# --- 编排 -------------------------------------------------------------------
if [[ "$STAGE" == "all" ]]; then
  [[ -n "$ANCHOR" ]] || ANCHOR="$(psql_x -q -A -t -c 'SELECT max(version) FROM _sqlx_migrations WHERE success')"
  run_timed segment0_preflight stage_preflight
  run_timed segment1_backup stage_backup
  run_timed segment1b_verify_backup stage_verify_backup
  confirm_gate "备份与可恢复性验证已完成，检查 $OUT_DIR/backup_verify.tsv 后再进字典段"
  run_timed segment2_dict stage_s1
  confirm_gate "字典应为 77 类 / 397 项、legacy 4/17，确认后进回填段"
  run_timed segment3_backfill stage_s2
  confirm_gate "回填行数核对通过（BACKFILL| 行），确认后进清理段"
  run_timed segment4_cleanup stage_s3
  confirm_gate "A 组清理与 B 组标记完成，确认后进发布收紧段"
  run_timed segment5_release_tighten stage_s4
  confirm_gate "迁移与后核对通过；prod 窗口此时需人工部署新二进制并滚动重启（先 master-data 再 server）"
  run_timed segment6_smoke stage_smoke
  echo "== 四段全部完成 =="
  cat "$TIMINGS"
  exit 0
fi

case "$STAGE" in
  preflight) run_timed "$STAGE" stage_preflight ;;
  backup) run_timed "$STAGE" stage_backup ;;
  verify-backup) run_timed "$STAGE" stage_verify_backup ;;
  s1) run_timed "$STAGE" stage_s1 ;;
  s2) run_timed "$STAGE" stage_s2 ;;
  s3) run_timed "$STAGE" stage_s3 ;;
  s4) run_timed "$STAGE" stage_s4 ;;
  smoke) run_timed "$STAGE" stage_smoke ;;
  *) echo "未知阶段: $STAGE" >&2; exit 2 ;;
esac

echo "[$STAGE] done; 耗时见 $TIMINGS"
