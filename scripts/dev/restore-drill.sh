#!/usr/bin/env bash
# restore-drill.sh — 用最新（或指定）生产 dump 真还原到临时库，逐表比对行数
#
# 目的：backup-topems.sh 只验证「文件可读」（pg_restore --list），不证明「能还原」。
# 本脚本把 dump 真正灌进一个临时库，与 topems_prod 逐表比对行数和迁移账本，
# 结果一致才算备份可用。
#
# 用法：
#   scripts/dev/restore-drill.sh                    # 取 ~/topems/backups 里最新一份
#   scripts/dev/restore-drill.sh <path/to.dump>     # 指定某一份
#
# 注意：全程走 Unix socket + peer 认证（不传 -h/-U），与 pg_hba 的 `local all all peer` 对齐。
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"

PROD_DB="topems_prod"
DRILL_DB="topems_restore_drill"
BACKUP_DIR="$HOME/topems/backups"
MIN_SIZE=1048576   # 1 MiB：低于此体积的 dump 一定不是完整备份

[ "$DRILL_DB" != "$PROD_DB" ] || { echo "拒绝执行：演练库名与生产库相同" >&2; exit 1; }

DUMP="${1:-}"
if [ -z "$DUMP" ]; then
  DUMP=$(find "$BACKUP_DIR" -maxdepth 1 -name 'topems_prod-*.dump' -type f 2>/dev/null | sort -r | head -1)
fi
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "找不到 dump 文件：${DUMP:-（空）}" >&2; exit 1; }

SIZE=$(stat -f%z "$DUMP")
[ "$SIZE" -ge "$MIN_SIZE" ] || { echo "FAILED：dump 体积异常（${SIZE} bytes）：${DUMP}" >&2; exit 1; }

echo "== 恢复演练 =="
echo "dump : $(basename "$DUMP")（${SIZE} bytes）"
echo "库   : ${DRILL_DB}（比对基准 ${PROD_DB}）"

pg_restore --list "$DUMP" >/dev/null 2>&1 || { echo "FAILED：dump 不可读" >&2; exit 1; }

cleanup() { dropdb --if-exists "$DRILL_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

dropdb --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
createdb "$DRILL_DB"

echo "→ 还原中..."
pg_restore -d "$DRILL_DB" --no-owner --no-privileges "$DUMP"

# 逐表行数：用 query_to_xml 对每张表做 count(*)，避免依赖统计信息的近似值
COUNT_SQL="select table_schema||'.'||table_name||' '||((xpath('/row/c/text()', query_to_xml('select count(*) as c from '||quote_ident(table_schema)||'.'||quote_ident(table_name), false, true, '')))[1])::text from information_schema.tables where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema','pg_toast');"

echo "→ 逐表比对行数..."
psql -d "$PROD_DB"  -Atc "$COUNT_SQL" 2>/dev/null | sort > "/tmp/restore-drill-prod.txt"
psql -d "$DRILL_DB" -Atc "$COUNT_SQL" 2>/dev/null | sort > "/tmp/restore-drill-restored.txt"

ROWS_PROD=$(wc -l < "/tmp/restore-drill-prod.txt" | tr -d ' ')
ROWS_DRILL=$(wc -l < "/tmp/restore-drill-restored.txt" | tr -d ' ')
echo "   表数：生产 ${ROWS_PROD} / 还原 ${ROWS_DRILL}"

DIFF_OUT=$(diff "/tmp/restore-drill-prod.txt" "/tmp/restore-drill-restored.txt" || true)
if [ -n "$DIFF_OUT" ]; then
  echo "FAILED：逐表行数不一致（前 15 行差异）" >&2
  echo "$DIFF_OUT" | head -15 >&2
  rm -f "/tmp/restore-drill-prod.txt" "/tmp/restore-drill-restored.txt"
  exit 1
fi

echo "→ 比对迁移账本..."
MIG_PROD=$(psql -d "$PROD_DB"  -Atc "select count(*)||'/'||max(version) from _sqlx_migrations")
MIG_DRILL=$(psql -d "$DRILL_DB" -Atc "select count(*)||'/'||max(version) from _sqlx_migrations")
echo "   生产 ${MIG_PROD} / 还原 ${MIG_DRILL}"
[ "$MIG_PROD" = "$MIG_DRILL" ] || { echo "FAILED：迁移账本不一致" >&2; exit 1; }

rm -f "/tmp/restore-drill-prod.txt" "/tmp/restore-drill-restored.txt"
echo "PASS：${ROWS_PROD} 张表行数一致，迁移账本一致（${MIG_PROD}）"
