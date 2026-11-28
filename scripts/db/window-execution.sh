#!/usr/bin/env bash
# =============================================================================
# 窗口执行总入口（四段串行，禁止跳段）
#
# 段落：
#   artifacts     发布基线（HEAD/工作区/commit）+ 执行物投递与 sha256 校验
#   preflight     前置检查（表/列存在、现场重测计数、长事务）
#   backup        9 张表 pg_dump -Fc + CSV，命名 <table>_<yyyyMMdd_HHmmss>.<dump|csv>
#   verify-backup 恢复到 --restore-dsn，逐表比对行数与整行指纹
#   s1            字典回灌 77 类/397 项（调用 dict-replay-window.sh）
#   s2            回填 317 行（rfm 300 + audit 17，现场重测）
#   s3            A 组清理 + B 组 orphan 标记
#   s4            前向迁移（白名单 08 + 13）+ 后核对
#   smoke         HTTP 冒烟（真实 BFF 或 stub）
#
# 两种连接模式：
#   本地：--dsn "$DSN"（演练必须用 scratch 库）
#   SSH ：--ssh-host xingzhai@host --remote-db topems_prod --remote-dir /tmp/topems_window_xxx
#         prod 主机本地执行 psql/pg_dump（socket，默认 /tmp），备份 dump+CSV 取回本地；
#         执行物（迁移/SQL/seed 二进制）先投递并逐件 sha256 一致后才执行。
#         WINDOW_SSH_LOCAL_SIM=1 时 ssh/scp 替换为本地执行/复制（仅演练）。
#
# 一键入口（本地演练）：
#   WINDOW_AUTO=1 scripts/db/window-execution.sh all --dsn "$DRILL_DSN" ...
#
# 一键入口（prod SSH，需三重授权）：
#   WINDOW_TARGET=prod ALLOW_PROD_WINDOW=yes WINDOW_CONFIRM=yes PROD_WINDOW_REASON='<工单>' \
#   WINDOW_SSH_HOST=xingzhai@<prod-host> WINDOW_REMOTE_DB=topems_prod \
#   scripts/db/window-execution.sh all \
#     --restore-dsn "$RESTORE_DSN" --anchor "$ANCHOR" \
#     --allow-migrations 20261107000008,20261107000013 \
#     --defer-migrations '<14 条已评审但本窗口不应用的版本>' \
#     --base-url "$BASE_URL" --super-token "$SUPER_TOKEN" --tenant-token "$TENANT_TOKEN" \
#     --tenant-id "$TENANT_ID" --notify-user-id "$NOTIFY_USER_ID"
#
# 非演练（WINDOW_AUTO 未设置）时，每个段落结束都会停在 [人工确认]：
#   备份验证后 / s1 后 / s2 后 / s3 后 / s4 后；输入 yes 才继续，否则 exit 3。
#   prod 目标禁止 WINDOW_AUTO=1（避免跳过停点）。
#
# 退出码：0 成功；1 段内失败（已打印中止点）；2 参数/守卫失败；3 等待人工确认
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="${1:-}"
shift || true

DSN="${WINDOW_DSN:-${DATABASE_URL:-}}"
OUT_DIR="${WINDOW_OUT_DIR:-$ROOT/tmp/window-$(date +%Y%m%d_%H%M%S)}"
BACKUP_DIR="${WINDOW_BACKUP_DIR:-$ROOT/backups}"
RESTORE_DSN="${WINDOW_RESTORE_DSN:-}"
APP_DSN="${WINDOW_APP_DSN:-}"
APP_ROLE="${WINDOW_APP_ROLE:-}"
ANCHOR="${WINDOW_ANCHOR:-}"
BASE_URL=""
SUPER_TOKEN=""
TENANT_TOKEN=""
TENANT_ID=""
NOTIFY_USER_ID=""
AUTO="${WINDOW_AUTO:-0}"
TARGET="${WINDOW_TARGET:-local}"

SSH_HOST="${WINDOW_SSH_HOST:-}"
REMOTE_DB="${WINDOW_REMOTE_DB:-}"
REMOTE_DIR="${WINDOW_REMOTE_DIR:-}"
REMOTE_PGHOST="${WINDOW_REMOTE_PGHOST:-/tmp}"
LOCAL_SIM="${WINDOW_SSH_LOCAL_SIM:-0}"
SSH_BIN="${WINDOW_SSH_BIN:-ssh}"
SCP_BIN="${WINDOW_SCP_BIN:-scp}"
REMOTE_PSQL_BIN="${WINDOW_REMOTE_PSQL_BIN:-/opt/homebrew/bin/psql}"
REMOTE_PG_DUMP_BIN="${WINDOW_REMOTE_PG_DUMP_BIN:-/opt/homebrew/bin/pg_dump}"
EXPECT_COMMIT="${WINDOW_EXPECT_COMMIT:-}"
SEED_BIN="${WINDOW_SEED_BIN:-$ROOT/target/debug/examples/seed_dict_replay}"
BUILD_SEED="${WINDOW_BUILD_SEED:-1}"
ONLY_MIGRATIONS="${WINDOW_ALLOW_MIGRATIONS:-20261107000008,20261107000013}"
DEFER_MIGRATIONS="${WINDOW_DEFER_MIGRATIONS:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --restore-dsn) RESTORE_DSN="$2"; shift 2 ;;
    --app-dsn) APP_DSN="$2"; shift 2 ;;
    --app-role) APP_ROLE="$2"; shift 2 ;;
    --anchor) ANCHOR="$2"; shift 2 ;;
    --base-url) BASE_URL="$2"; shift 2 ;;
    --super-token) SUPER_TOKEN="$2"; shift 2 ;;
    --tenant-token) TENANT_TOKEN="$2"; shift 2 ;;
    --tenant-id) TENANT_ID="$2"; shift 2 ;;
    --notify-user-id) NOTIFY_USER_ID="$2"; shift 2 ;;
    --ssh-host) SSH_HOST="$2"; shift 2 ;;
    --remote-db) REMOTE_DB="$2"; shift 2 ;;
    --remote-dir) REMOTE_DIR="$2"; shift 2 ;;
    --expect-commit) EXPECT_COMMIT="$2"; shift 2 ;;
    --seed-bin) SEED_BIN="$2"; shift 2 ;;
    --no-build-seed) BUILD_SEED=0; shift ;;
    --allow-migrations) ONLY_MIGRATIONS="$2"; shift 2 ;;
    --defer-migrations) DEFER_MIGRATIONS="$2"; shift 2 ;;
    -h|--help) sed -n '2,49p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$STAGE" ]] || { sed -n '2,49p' "$0"; exit 2; }

SSH_MODE=0
[[ -n "$SSH_HOST" ]] && SSH_MODE=1
if [[ $SSH_MODE -eq 1 ]]; then
  [[ -n "$REMOTE_DB" ]] || { echo "SSH 模式需要 --remote-db" >&2; exit 2; }
  [[ -n "$REMOTE_DIR" ]] || REMOTE_DIR="/tmp/topems_window_$(date +%Y%m%d_%H%M%S)"
  [[ -z "$APP_ROLE" ]] && APP_ROLE="topems_app"
else
  [[ -n "$DSN" ]] || { echo "缺少 --dsn（或 WINDOW_DSN / DATABASE_URL）" >&2; exit 2; }
fi
[[ -n "$APP_DSN" ]] || APP_DSN="$DSN"
mkdir -p "$OUT_DIR"
TIMINGS="$OUT_DIR/timings.tsv"
[[ -f "$TIMINGS" ]] || printf 'stage\tms\texit\n' > "$TIMINGS"

# --- 守卫：prod 授权 + 只读期约束 -------------------------------------------
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
  [[ $SSH_MODE -eq 1 ]] || {
    echo "拒绝：prod 窗口固定走 SSH 执行物模式（需要 --ssh-host / WINDOW_SSH_HOST）" >&2
    exit 2
  }
  [[ "$AUTO" != "1" ]] || {
    echo "拒绝：prod 窗口禁止 WINDOW_AUTO=1（不得跳过人工停点）" >&2
    exit 2
  }
  [[ "${WINDOW_ALLOW_DIRTY:-0}" != "1" ]] || {
    echo "拒绝：prod 窗口禁止 WINDOW_ALLOW_DIRTY=1（发布必须来自干净 HEAD）" >&2
    exit 2
  }
elif is_prod_like "$DSN$REMOTE_DB"; then
  echo "拒绝：DSN/远程库含 prod 字样。prod 窗口需 WINDOW_TARGET=prod + 三重授权 + SSH 模式；本地演练请用 scratch 库" >&2
  exit 2
fi

# --- 连接/传输封装 -----------------------------------------------------------
sq() { printf '%q' "$1"; }

remote_run() {
  local cmd="$1"
  if [[ "$LOCAL_SIM" == "1" ]]; then bash -c "$cmd"; else "$SSH_BIN" "$SSH_HOST" "$cmd"; fi
}

remote_psql() {
  local cmd
  cmd="PGHOST=$(sq "$REMOTE_PGHOST") $(sq "$REMOTE_PSQL_BIN") -X -v ON_ERROR_STOP=1 -d $(sq "$REMOTE_DB")"
  local a
  for a in "$@"; do cmd+=" $(sq "$a")"; done
  remote_run "$cmd"
}

psql_x() {
  if [[ $SSH_MODE -eq 1 ]]; then
    remote_psql "$@"
  else
    psql "$DSN" -X -v ON_ERROR_STOP=1 "$@"
  fi
}

sql_file() {
  local f="$1"; shift
  if [[ $SSH_MODE -eq 1 ]]; then
    remote_psql "$@" -f "$REMOTE_DIR/sql/$f"
  else
    psql "$DSN" -X -v ON_ERROR_STOP=1 "$@" -f "$ROOT/scripts/db/sql/$f"
  fi
}

copy_to_remote() {
  local src="$1" dest="$2"
  if [[ "$LOCAL_SIM" == "1" ]]; then cp -f "$src" "$dest"; else "$SCP_BIN" "$src" "$SSH_HOST:$dest"; fi
}

copy_from_remote() {
  local src="$1" dest="$2"
  if [[ "$LOCAL_SIM" == "1" ]]; then cp -f "$src" "$dest"; else "$SCP_BIN" "$SSH_HOST:$src" "$dest"; fi
}

local_sha256() { shasum -a 256 "$1" | awk '{print $1}'; }
remote_sha256() { remote_run "shasum -a 256 $(sq "$1")" | awk '{print $1}'; }

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

SQL_FILES=(
  window_preflight.sql
  tenant_backfill_7.sql
  tenant_cleanup_a_group.sql
  tenant_orphan_mark_b.sql
  window_postcheck.sql
  dict_replay_verify.sql
)

MIG_FILES=(
  20261107000008_dict_tenant_isolation_strict.sql
  20261107000013_rls_tenant_isolation_backfilled_7.sql
)

# --- 段 0a：发布基线 + 执行物投递/校验 --------------------------------------
stage_artifacts() {
  echo "== 段 0a 发布基线 + 执行物投递 =="
  local commit status
  commit="$(git -C "$ROOT" rev-parse HEAD)"
  status="$(git -C "$ROOT" status --porcelain)"
  if [[ -n "$status" ]]; then
    if [[ "${WINDOW_ALLOW_DIRTY:-0}" == "1" ]]; then
      echo "WARN 演练允许脏工作区（仅非 prod）：$(printf '%s' "$status" | wc -l | tr -d ' ') 个改动"
    else
      echo "拒绝：工作区不干净，先收口再开窗" >&2
      printf '%s\n' "$status" >&2
      return 1
    fi
  fi
  if [[ -n "$EXPECT_COMMIT" ]] && [[ "$commit" != "$EXPECT_COMMIT"* ]]; then
    echo "拒绝：HEAD=$commit 与期望 $EXPECT_COMMIT 不一致" >&2
    return 1
  fi
  echo "RELEASE|commit|$commit" | tee "$OUT_DIR/release_commit.txt"
  echo "RELEASE|branch|$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)" | tee -a "$OUT_DIR/release_commit.txt"
  echo "RELEASE|batch25_batch26|included_via_commits_6816f37d3_6bf524b2f" | tee -a "$OUT_DIR/release_commit.txt"

  if [[ "$BUILD_SEED" == "1" ]]; then
    # shellcheck source=../lib/swagger-ui.sh
    source "$ROOT/scripts/lib/swagger-ui.sh"
    topems_ensure_swagger_ui_archive || return 1
    echo "[artifacts] cargo build seed_dict_replay @ $commit"
    ( cd "$ROOT" && cargo build -p topems-master-data --example seed_dict_replay ) || return 1
  fi
  [[ -x "$SEED_BIN" ]] || { echo "seed 二进制不存在: $SEED_BIN" >&2; return 1; }
  echo "RELEASE|seed_sha256|$(local_sha256 "$SEED_BIN")" | tee -a "$OUT_DIR/release_commit.txt"

  [[ $SSH_MODE -eq 1 ]] || return 0

  remote_run "mkdir -p $(sq "$REMOTE_DIR") $(sq "$REMOTE_DIR/sql") $(sq "$REMOTE_DIR/migrations") $(sq "$REMOTE_DIR/bin") $(sq "$REMOTE_DIR/backups")" || return 1
  : > "$OUT_DIR/artifacts.tsv"
  local f base dest lsha rsha
  for f in "${SQL_FILES[@]}"; do
    dest="$REMOTE_DIR/sql/$f"
    copy_to_remote "$ROOT/scripts/db/sql/$f" "$dest" || return 1
    lsha="$(local_sha256 "$ROOT/scripts/db/sql/$f")"
    rsha="$(remote_sha256 "$dest")"
    [[ "$lsha" == "$rsha" ]] || { echo "投递校验失败: $f local=$lsha remote=${rsha:-<missing>}" >&2; return 1; }
    printf 'sql\t%s\t%s\n' "$f" "$lsha" >> "$OUT_DIR/artifacts.tsv"
  done
  for f in "${MIG_FILES[@]}"; do
    dest="$REMOTE_DIR/migrations/$f"
    copy_to_remote "$ROOT/database/migrations/$f" "$dest" || return 1
    lsha="$(local_sha256 "$ROOT/database/migrations/$f")"
    rsha="$(remote_sha256 "$dest")"
    [[ "$lsha" == "$rsha" ]] || { echo "投递校验失败: $f local=$lsha remote=${rsha:-<missing>}" >&2; return 1; }
    printf 'migration\t%s\t%s\n' "$f" "$lsha" >> "$OUT_DIR/artifacts.tsv"
  done
  base="$(basename "$SEED_BIN")"
  dest="$REMOTE_DIR/bin/$base"
  copy_to_remote "$SEED_BIN" "$dest" || return 1
  remote_run "chmod +x $(sq "$dest")" || return 1
  lsha="$(local_sha256 "$SEED_BIN")"
  rsha="$(remote_sha256 "$dest")"
  [[ "$lsha" == "$rsha" ]] || { echo "投递校验失败: seed local=$lsha remote=${rsha:-<missing>}" >&2; return 1; }
  printf 'seed\t%s\t%s\n' "$base" "$lsha" >> "$OUT_DIR/artifacts.tsv"
  echo "[artifacts] 投递 $(wc -l < "$OUT_DIR/artifacts.tsv" | tr -d ' ') 件，sha256 全部一致 -> $REMOTE_DIR"
}

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
  local ts entry qualified base dump csv count rdump rcsv rsha lsha
  ts="$(date +%Y%m%d_%H%M%S)"
  : > "$OUT_DIR/backup_manifest.tsv"
  for entry in "${TABLES[@]}"; do
    qualified="${entry%%|*}"
    base="${entry##*|}"
    dump="$BACKUP_DIR/${base}_${ts}.dump"
    csv="$BACKUP_DIR/${base}_${ts}.csv"

    if [[ $SSH_MODE -eq 1 ]]; then
      rdump="$REMOTE_DIR/backups/${base}_${ts}.dump"
      rcsv="$REMOTE_DIR/backups/${base}_${ts}.csv"
      remote_run "PGHOST=$(sq "$REMOTE_PGHOST") PGOPTIONS='-c app.rls_system=on' $(sq "$REMOTE_PG_DUMP_BIN") -d $(sq "$REMOTE_DB") -Fc -t $(sq "$qualified") --enable-row-security -f $(sq "$rdump")" || return 1
      rsha="$(remote_sha256 "$rdump")"
      copy_from_remote "$rdump" "$dump" || return 1
      lsha="$(local_sha256 "$dump")"
      [[ "$rsha" == "$lsha" ]] || { echo "备份取回 sha256 不一致: $base remote=${rsha:-<missing>} local=$lsha" >&2; return 1; }
      printf '%s  %s\n' "$lsha" "$dump" > "$dump.sha256"

      remote_psql -q -c "SET app.rls_system='on'" \
        -c "\\copy (SELECT * FROM $qualified) TO '$rcsv' WITH (FORMAT csv, HEADER true)" || return 1
      copy_from_remote "$rcsv" "$csv" || return 1
      count="$(remote_psql -q -A -t -c "SET app.rls_system='on'" -c "SELECT count(*) FROM $qualified")" || return 1
    else
      PGOPTIONS="${PGOPTIONS:-} -c app.rls_system=on" pg_dump "$DSN" -Fc \
        -t "$qualified" --enable-row-security -f "$dump" || return 1
      shasum -a 256 "$dump" > "$dump.sha256" || return 1

      psql_x -q -c "SET app.rls_system='on'" \
        -c "\copy (SELECT * FROM $qualified) TO '$csv' WITH (FORMAT csv, HEADER true)" || return 1
      count="$(psql_x -q -A -t -c "SET app.rls_system='on'" -c "SELECT count(*) FROM $qualified")" || return 1
    fi

    [[ "$(head -c 1 "$csv" 2>/dev/null || true)" != "" ]] || {
      echo "CSV 为空: $csv" >&2; return 1
    }
    printf '%s\t%s\t%s\t%s\n' "$base" "$count" "$dump" "$csv" >> "$OUT_DIR/backup_manifest.tsv"
    echo "[backup] $base rows=$count -> $dump / $csv"
  done
  printf '%s\n' "$ts" > "$OUT_DIR/backup_ts.txt"
  psql_x -q -A -t -c "SELECT now()" > "$OUT_DIR/window_start.txt"
  echo "[backup] window_start=$(cat "$OUT_DIR/window_start.txt")"
}

fingerprint_source() {
  local qualified="$1"
  psql_x -q -A -t \
    -c "SET app.rls_system='on'" \
    -c "SELECT 'rows|' || count(*) || '|' || COALESCE(md5(string_agg(x::text, '|' ORDER BY x::text)), 'empty') FROM $qualified x"
}

fingerprint_local() {
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
    before="$(fingerprint_source "$qualified")" || return 1
    after="$(fingerprint_local "$RESTORE_DSN" "$qualified")" || return 1
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
  local args
  if [[ $SSH_MODE -eq 1 ]]; then
    args=(--ssh-host "$SSH_HOST" --remote-db "$REMOTE_DB" --remote-dir "$REMOTE_DIR" --seed-bin "$SEED_BIN")
  else
    args=(--dsn "$DSN" --seed-bin "$SEED_BIN")
  fi
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" replay \
    --out-dir "$OUT_DIR/dict" "${args[@]}" 2>&1 | tee "$OUT_DIR/dict_replay.txt" || return 1
  DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" cleanup \
    --out-dir "$OUT_DIR/dict" "${args[@]}" 2>&1 | tee "$OUT_DIR/dict_cleanup.txt" || return 1
  if [[ $SSH_MODE -eq 1 ]]; then
    DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" verify \
      --out-dir "$OUT_DIR/dict" "${args[@]}" --app-role "$APP_ROLE" \
      2>&1 | tee "$OUT_DIR/dict_verify.txt" || return 1
  else
    DICT_WINDOW_CONFIRM=yes bash "$ROOT/scripts/db/dict-replay-window.sh" verify \
      --out-dir "$OUT_DIR/dict" --dsn "$APP_DSN" \
      2>&1 | tee "$OUT_DIR/dict_verify.txt" || return 1
  fi
  echo "[s1] 字典段落完成"
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
  local args=(--anchor "$ANCHOR" --only "$ONLY_MIGRATIONS")
  [[ -n "$DEFER_MIGRATIONS" ]] && args+=(--defer "$DEFER_MIGRATIONS")
  if [[ $SSH_MODE -eq 1 ]]; then
    args+=(--ssh-host "$SSH_HOST" --remote-db "$REMOTE_DB" --remote-mig-dir "$REMOTE_DIR/migrations")
    [[ "$TARGET" == "prod" ]] && args+=(--prod)
  else
    args+=(--dsn "$DSN")
    [[ "$TARGET" == "prod" ]] && args+=(--prod)
  fi
  echo "[s4] only=$ONLY_MIGRATIONS"
  bash "$ROOT/scripts/migration/apply-forward.sh" "${args[@]}" \
    2>&1 | tee "$OUT_DIR/release.txt" || return 1

  if [[ $SSH_MODE -eq 1 ]]; then
    sql_file window_postcheck.sql 2>&1 | tee "$OUT_DIR/postcheck.txt" || return 1
    local flags
    flags="$(psql_x -q -A -t -c "SELECT rolsuper::text || '|' || rolbypassrls::text FROM pg_roles WHERE rolname = '$APP_ROLE'")"
    if [[ -z "$flags" || "$flags" == *"|true" || "$flags" == true* ]]; then
      echo "拒绝：验证角色 $APP_ROLE 不存在或具备 super/bypassrls（${flags}），无法实测 RLS" >&2
      return 1
    fi
    remote_psql -q -A -t \
      -c "SET ROLE $APP_ROLE" \
      -c "SET app.tenant_id='00000000-0000-0000-0000-000000000001'" \
      -c "SELECT 'RLS|dict_0001|'||count(*) FROM public.core_dict_types" \
      -c "SET app.tenant_id='11111111-1111-1111-1111-111111111111'" \
      -c "SELECT 'RLS|dict_1111|'||count(*) FROM public.core_dict_types" \
      -c "SELECT 'RLS|audit_1111|'||count(*) FROM public.audit_logs" \
      -c "SELECT 'RLS|refs_1111|'||count(*) FROM crm.crm_master_data_refs" \
      | tee "$OUT_DIR/rls_visibility.txt" || return 1
    grep -q 'RLS|dict_0001|77' "$OUT_DIR/rls_visibility.txt" || { echo "RLS 断言失败：系统租户未看到 77 类" >&2; return 1; }
    grep -q 'RLS|dict_1111|0' "$OUT_DIR/rls_visibility.txt" || { echo "RLS 断言失败：普通租户仍可见字典" >&2; return 1; }
  elif psql "$APP_DSN" -X -q -A -t -c "SELECT 1" >/dev/null 2>&1; then
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
  if [[ -z "$ANCHOR" ]]; then
    ANCHOR="$(psql_x -q -A -t -c 'SELECT max(version) FROM _sqlx_migrations WHERE success')"
  fi
  run_timed segment0a_artifacts stage_artifacts
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
  artifacts) run_timed "$STAGE" stage_artifacts ;;
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
