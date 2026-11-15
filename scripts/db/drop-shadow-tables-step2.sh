#!/usr/bin/env bash
# 表族清理第二步：dev 专用影子表删除脚本（幂等）
#
# 为什么不是迁移：空库重放迁移会重建这些影子表，而迁移也会在 prod 执行，
# 与「prod 一张不删」的口径冲突。故本脚本只面向 dev，调用者必须显式 --apply。
#
# 用法：
#   scripts/db/drop-shadow-tables-step2.sh --batch B6                 # 只跑断言（默认 dry-run）
#   scripts/db/drop-shadow-tables-step2.sh --batch B6 --apply         # 断言 + 快照 + 删除 + 复核
#   scripts/db/drop-shadow-tables-step2.sh --batch B6 --apply --drill # 追加回滚演练
#
# 幂等语义：表已不存在 → NOTE 跳过；该批全部不存在 → 退出码 0。
# 失败语义：任一断言不通过 → 整批中止（不 dump、不删）。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DSN="${DSN:-postgresql:///topems?host=/tmp&user=air}"
MANIFEST="${MANIFEST:-$REPO_ROOT/scripts/db/shadow-tables-step2.tsv}"
SNAPSHOT_ROOT="${SNAPSHOT_ROOT:-/Users/air/topems-db-snapshots/20261115-step2}"
DRILL_DB="${DRILL_DB:-topems_rollback_drill}"

BATCH=""
APPLY=false
DRILL=false
ANCHOR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --batch)  BATCH="${2:-}"; shift 2 ;;
    --apply)  APPLY=true; shift ;;
    --drill)  DRILL=true; shift ;;
    --anchor) ANCHOR="${2:-}"; shift 2 ;;
    --dsn)    DSN="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$BATCH" ]] || { echo "--batch is required (e.g. --batch B6)" >&2; exit 2; }
[[ -f "$MANIFEST" ]] || { echo "manifest not found: $MANIFEST" >&2; exit 1; }

say()  { printf '%s\n' "$*"; }
note() { printf '[NOTE] %s\n' "$*"; }
die()  { printf '[FAIL] %s\n' "$*" >&2; exit 1; }

psql_at() { psql "$DSN" -At -v ON_ERROR_STOP=1 "$@"; }

# ---------- 0. 库身份与并发门禁 ----------
IDENT="$(psql_at -F'|' -c "select current_database(), coalesce(inet_server_addr()::text,'unix-socket'), (select max(version) from _sqlx_migrations), (select count(*) from _sqlx_migrations)")"
DB_NAME="${IDENT%%|*}"
[[ "$DB_NAME" == "topems" ]] || die "refuse to run against database '$DB_NAME' (expected topems)"
LEDGER_MAX="$(printf '%s' "$IDENT" | cut -d'|' -f3)"
LEDGER_ROWS="$(printf '%s' "$IDENT" | cut -d'|' -f4)"
if [[ -n "$ANCHOR" && "$ANCHOR" != "$LEDGER_MAX" ]]; then
  die "ledger watermark moved: anchor=$ANCHOR now=$LEDGER_MAX (concurrent migration?)"
fi
BUSY="$(psql_at -c "select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and state='active'")"
[[ "$BUSY" == "0" ]] || {
  psql_at -F'|' -c "select pid, usename, state, left(query,80) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid() and state='active'"
  die "active sessions detected ($BUSY) — rerun when dev is idle"
}

say "库身份: $DB_NAME @ $(printf '%s' "$IDENT" | cut -d'|' -f2)  PG $(psql_at -c 'show server_version')"
say "账本水位: max=$LEDGER_MAX rows=$LEDGER_ROWS  批=$BATCH  apply=$APPLY  drill=$DRILL"

# ---------- 1. 读清单 ----------
TABLES=(); HOLDS=()
while IFS=$'\t' read -r b t st _ _ note_txt; do
  [[ "$b" == \#* || -z "${b:-}" ]] && continue
  [[ "$b" == "$BATCH" ]] || continue
  if [[ "$st" == "drop" ]]; then TABLES+=("$t"); else HOLDS+=("$t — $note_txt"); fi
done < "$MANIFEST"

[[ ${#TABLES[@]} -gt 0 || ${#HOLDS[@]} -gt 0 ]] || die "batch $BATCH not found in manifest"
for h in "${HOLDS[@]:-}"; do [[ -n "$h" ]] && note "hold: $h"; done
say "本批 drop 目标: ${#TABLES[@]} 张"

# ---------- 2. 逐表断言（fail-closed） ----------
# 批内互引的外键不算失败（按拓扑序先删子表）；批外入向外键一律失败。
CSV_LIST_ALL="$(printf '%s' "${TABLES[*]}" | sed 's/ /,/g')"
assert_table() {
  local t="$1"
  psql_at -c "DO \$\$
DECLARE rel regclass := to_regclass('$t'); n bigint; k int; g int; gu text;
BEGIN
  IF rel IS NULL THEN RAISE EXCEPTION 'MISSING'; END IF;
  IF (SELECT relkind FROM pg_class WHERE oid = rel) <> 'r' THEN RAISE EXCEPTION 'NOT_ORDINARY_TABLE'; END IF;
  EXECUTE format('SELECT count(*) FROM %s', rel) INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'NOT_EMPTY rows=%', n; END IF;
  SELECT count(*) INTO k
    FROM pg_constraint con
    JOIN pg_class cc ON cc.oid = con.conrelid
    JOIN pg_namespace cn ON cn.oid = cc.relnamespace
   WHERE con.contype = 'f' AND con.confrelid = rel
     AND (cn.nspname||'.'||cc.relname) <> ALL (string_to_array('$CSV_LIST_ALL', ','));
  IF k > 0 THEN RAISE EXCEPTION 'INBOUND_FK_OUTSIDE_BATCH count=%', k; END IF;
  SELECT count(*) INTO k
    FROM pg_depend d JOIN pg_rewrite rw ON rw.oid = d.objid
   WHERE d.classid = 'pg_rewrite'::regclass AND d.refclassid = 'pg_class'::regclass
     AND d.refobjid = rel AND rw.ev_class <> rel;
  IF k > 0 THEN RAISE EXCEPTION 'VIEW_DEP count=%', k; END IF;
  SELECT count(*) INTO k
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
     AND p.prosrc ~* ('(^|[^a-z_0-9])' || rel::text || '([^a-z_0-9]|$)')
     AND p.prosrc !~* ('to_regclass\(\s*''' || rel::text || '''\s*\)\s+IS\s+NOT\s+NULL');
  IF k > 0 THEN
    SELECT string_agg(p.oid::regprocedure::text, ', ') INTO gu
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
       AND p.prosrc ~* ('(^|[^a-z_0-9])' || rel::text || '([^a-z_0-9]|$)')
       AND p.prosrc !~* ('to_regclass\(\s*''' || rel::text || '''\s*\)\s+IS\s+NOT\s+NULL');
    RAISE EXCEPTION 'FUNC_REF count=% [%]', k, gu;
  END IF;
  -- 只被 to_regclass('x') IS NOT NULL 守卫的动态 SQL 引用：缺表时函数自行跳过，不阻断删除。
  SELECT count(*) INTO g
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
     AND p.prosrc ~* ('(^|[^a-z_0-9])' || rel::text || '([^a-z_0-9]|$)')
     AND p.prosrc ~* ('to_regclass\(\s*''' || rel::text || '''\s*\)\s+IS\s+NOT\s+NULL');
  IF g > 0 THEN RAISE NOTICE 'FUNC_REF_GUARDED rel=% count=%（to_regclass 守卫）', rel, g; END IF;
  SELECT count(*) INTO k FROM pg_trigger WHERE tgrelid = rel AND NOT tgisinternal;
  IF k > 0 THEN RAISE EXCEPTION 'TRIGGER count=%', k; END IF;
END \$\$;" >/dev/null
}

EXISTING=()
for t in "${TABLES[@]}"; do
  if [[ "$(psql_at -c "select to_regclass('$t') is not null")" == "f" ]]; then
    note "已不存在，跳过: $t"
    continue
  fi
  assert_table "$t" || die "assertion failed: $t"
  EXISTING+=("$t")
  say "断言通过: $t"
done

if [[ ${#EXISTING[@]} -eq 0 ]]; then
  say "本批目标均已不存在，无事可做（幂等）。"
  exit 0
fi

# ---------- 3. 拓扑排序：子表先删 ----------
ORDER=()
REMAIN=("${EXISTING[@]}")
while [[ ${#REMAIN[@]} -gt 0 ]]; do
  R_LIST="$(printf '%s' "${REMAIN[*]}" | sed "s/ /','/g")"
  PARENTS="$(psql_at -c "select distinct p.nspname||'.'||pc.relname
    from pg_constraint con
    join pg_class pc on pc.oid = con.confrelid join pg_namespace p on p.oid = pc.relnamespace
    join pg_class cc on cc.oid = con.conrelid join pg_namespace cn on cn.oid = cc.relnamespace
   where con.contype = 'f' and con.conrelid <> con.confrelid
     and (p.nspname||'.'||pc.relname) in ('$R_LIST')
     and (cn.nspname||'.'||cc.relname) in ('$R_LIST')")"
  NEW=()
  for t in "${REMAIN[@]}"; do
    grep -qxF "$t" <<<"$PARENTS" && continue
    NEW+=("$t")
  done
  [[ ${#NEW[@]} -gt 0 ]] || die "topological cycle in batch $BATCH: ${REMAIN[*]}"
  ORDER+=("${NEW[@]}")
  NXT=()
  for t in "${REMAIN[@]}"; do
    keep=true
    for x in "${NEW[@]}"; do [[ "$t" == "$x" ]] && keep=false; done
    $keep && NXT+=("$t")
  done
  REMAIN=("${NXT[@]+"${NXT[@]}"}")
done
say "拆除顺序: ${ORDER[*]}"

$APPLY || { say "dry-run 结束（未 dump、未删除）。加 --apply 执行。"; exit 0; }

# ---------- 4. 快照 ----------
DIR="$SNAPSHOT_ROOT/$BATCH"
mkdir -p "$DIR"
T_ARGS=()
for t in "${EXISTING[@]}"; do
  T_ARGS+=(-t "$t")
  f="$DIR/$(printf '%s' "$t" | tr '.' '_').sql"
  pg_dump "$DSN" --schema-only --no-publications --no-subscriptions -t "$t" -f "$f"
done
pg_dump "$DSN" --schema-only --no-publications --no-subscriptions "${T_ARGS[@]}" -f "$DIR/restore.sql"
( cd "$DIR" && shasum -a 256 ./*.sql > sha256sums.txt )

IN_LIST="$(printf '%s' "${EXISTING[*]}" | sed "s/ /','/g")"
PRE_IDX="$(psql_at -c "select count(*) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname||'.'||c.relname in ('$IN_LIST')")"
PRE_POL="$(psql_at -c "select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname in ('$IN_LIST')")"
say "删除前形态: 索引=$PRE_IDX 策略=$PRE_POL"

# ---------- 5. 回滚演练（在 dev 删除之前做；失败则不动 dev） ----------
# 演练库用 createdb -T topems 克隆（需源库零连接）：直接灌 restore.sql 会因缺父表
# （如 public.core_tenants）失败；克隆保证外键父表齐全，再在克隆里按同序删表后回灌。
DRILL_RESULT="未执行"
if $DRILL; then
  DDSN="postgresql:///$DRILL_DB?host=/tmp&user=air"
  CONNS="$(psql_at -c "select count(*) from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()")"
  [[ "$CONNS" == "0" ]] || die "rollback drill needs 0 connections on dev (now $CONNS); stop services and retry"
  dropdb -h /tmp --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
  createdb -h /tmp -T topems "$DRILL_DB"
  for t in "${ORDER[@]}"; do
    psql "$DDSN" -q -v ON_ERROR_STOP=1 -c "DROP TABLE $t" >/dev/null
  done
  psql "$DDSN" -q -v ON_ERROR_STOP=1 -f "$DIR/restore.sql" >/dev/null
  D_OK=true
  for t in "${EXISTING[@]}"; do
    [[ "$(psql "$DDSN" -At -c "select to_regclass('$t') is not null")" == "t" ]] || { say "演练缺表: $t"; D_OK=false; }
  done
  D_IDX="$(psql "$DDSN" -At -c "select count(*) from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname||'.'||c.relname in ('$IN_LIST')")"
  D_POL="$(psql "$DDSN" -At -c "select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname||'.'||c.relname in ('$IN_LIST')")"
  $D_OK || die "rollback drill failed (restore incomplete) — dev untouched"
  [[ "$D_IDX" == "$PRE_IDX" && "$D_POL" == "$PRE_POL" ]] || die "rollback drill mismatch: idx $D_IDX/$PRE_IDX pol $D_POL/$PRE_POL — dev untouched"
  DRILL_RESULT="通过：${#EXISTING[@]} 张全部重建；索引 ${D_IDX}/${PRE_IDX}，策略 ${D_POL}/${PRE_POL} 与删除前一致"
  dropdb -h /tmp --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
  say "回滚演练: $DRILL_RESULT"
fi

# ---------- 6. 删除（禁用 CASCADE） ----------
for t in "${ORDER[@]}"; do
  psql_at -c "DROP TABLE $t" >/dev/null || die "drop failed: $t"
  say "已删除: $t"
done
DROPPED_AT="$(date '+%Y-%m-%d %H:%M:%S %Z')"

# ---------- 7. 复核 ----------
after_ok=true
for t in "${EXISTING[@]}"; do
  [[ "$(psql_at -c "select to_regclass('$t') is null")" == "t" ]] || { say "残留: $t"; after_ok=false; }
done
LEFTOVER="$(psql_at -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','v','m','S') and n.nspname||'.'||c.relname in ('$IN_LIST')")"
[[ "$LEFTOVER" == "0" ]] || { say "pg_class 残留对象: $LEFTOVER"; after_ok=false; }
$after_ok || die "post-verify failed for batch $BATCH"
say "复核通过：${#EXISTING[@]} 张均已不存在，无 pg_class 残留（策略/索引随表删除）"

# ---------- 8. 批次 README ----------
cat > "$DIR/README.md" <<EOF
# 第二步删表快照 · $BATCH

- 库身份：$DB_NAME @ unix-socket（PostgreSQL $(psql_at -c 'show server_version')）
- 账本水位：max=$LEDGER_MAX / $LEDGER_ROWS 行
- pg_dump 版本：$(pg_dump --version)
- 删除时间：$DROPPED_AT
- 本批表数：${#EXISTING[@]}
- 删除前形态：索引 $PRE_IDX / 策略 $PRE_POL
- 表清单：${EXISTING[*]}
- 校验：见 sha256sums.txt（逐表 .sql + restore.sql）
- 回滚演练：$DRILL_RESULT
- 回滚方式：\`psql <目标库> -f restore.sql\`（含表/列/默认值/约束/索引/触发器/RLS/策略/属主/ACL/注释）
- 注意：pg_dump -t 不含「别的表指向本表的入向外键」；本批未删除任何批外约束。
EOF

say "快照目录: $DIR"
say "完成: $BATCH 删除 ${#EXISTING[@]} 张"
