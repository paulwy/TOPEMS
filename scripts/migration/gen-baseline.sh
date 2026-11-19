#!/usr/bin/env bash
# =============================================================================
# 生成「schema 基线 + 账本锚点」资产（只读源库）
#
# 用途：为「基线 + 前向迁移」重建流程提供版本化基线。源库仅执行 pg_dump 与
#       SELECT，不做任何 DDL/DML。
#
# 产物（默认 database/baseline/）：
#   prod_schema_<anchor>.sql.gz   源库 schema-only 快照（gzip -n，无属主/权限）
#   prod_ledger_<anchor>.sql      源库 _sqlx_migrations 已成功记录（INSERT）
#   baseline_<anchor>.json        锚点元数据（版本/来源/时间/校验和/表数/已知未应用）
#   prod_drift_<anchor>.tsv       与对照链库的表差集（仅传 --chain-db 时生成）
#
# 用法（DSN 由调用方通过环境变量提供，含口令，禁止写入仓库）：
#   bash scripts/migration/gen-baseline.sh \
#     --dsn "$TOPEMS_PROD_DSN" \
#     --chain-db p4_rebuild_verify
#
# 退出码：0 成功；1 对齐校验失败；2 参数/环境错误
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG_DIR="$ROOT/database/migrations"
OUT="$ROOT/database/baseline"
MANIFEST="$ROOT/database/migration_manifest.yaml"
DSN=""
CHAIN_DB=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dsn) DSN="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --chain-db) CHAIN_DB="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$DSN" ]] || { echo "缺少 --dsn" >&2; exit 2; }

PG_DUMP="${PG_DUMP:-$(command -v pg_dump || true)}"
[[ -x "$PG_DUMP" ]] || PG_DUMP=/opt/homebrew/bin/pg_dump
[[ -x "$PG_DUMP" ]] || { echo "找不到 pg_dump（可用 PG_DUMP 指定）" >&2; exit 2; }

mkdir -p "$OUT"

# 已在仓库中、但未登记进源库账本的 14 位迁移（锚点对齐白名单）。
# 说明：均为 test/5433 定向或历史手工执行；其中 finance_currency_master_fix 为
#       幂等建表补迁移（prod 已有该表，只是未登记）。
KNOWN_NOT_APPLIED=(
  20261103210000
  20261103220000
  20261103230000
  20261104000000
  20261104010000
  20261104020000
  20261104030000
  20261104040000
  20261104050000
  20261104060000
  20261104070000
  20261105110000
  20261105120000
  20261105145000
  20261105150000
  20261105180000
)

# manifest 已逐条登记处置的版本（excluded/obsolete/superseded/forwarded/hold/to_apply）。
# 与上面的定向迁移白名单取并集：仓库存在、账本不存在、version <= 锚点的迁移必须
# 至少在一处登记，否则基线生成 fail-closed。清单来源见 database/migration_manifest.yaml。
if [[ -f "$MANIFEST" ]]; then
  while IFS= read -r v; do
    [[ -n "$v" ]] && KNOWN_NOT_APPLIED+=("$v")
  done < <(python3 - "$MANIFEST" <<'PY'
import re, sys
for line in open(sys.argv[1], encoding='utf-8'):
    m = re.match(r'\s*-\s*version:\s*"(\d{14})"', line)
    if m:
        print(m.group(1))
PY
  )
fi

TABLE_SQL="SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')"

ANCHOR="$(psql "$DSN" -tA -c "SELECT max(version) FROM _sqlx_migrations WHERE success")"
LEDGER_ROWS="$(psql "$DSN" -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success")"
TABLES="$(psql "$DSN" -tA -c "$TABLE_SQL")"
[[ -n "$ANCHOR" && "$ANCHOR" != "NULL" ]] || { echo "无法读取账本锚点" >&2; exit 2; }

in_known() {
  local v="$1" k
  for k in "${KNOWN_NOT_APPLIED[@]}"; do [[ "$v" = "$k" ]] && return 0; done
  return 1
}

# 对齐校验：锚点以内的 14 位迁移，必须在账本或白名单中
MISSING=()
for f in "$MIG_DIR"/*.sql; do
  b="$(basename "$f")"
  [[ "$b" =~ ^[0-9]{14}_ ]] || continue
  v="${b%%_*}"
  (( 10#$v <= 10#$ANCHOR )) || continue
  if ! psql "$DSN" -tA -c "SELECT 1 FROM _sqlx_migrations WHERE version=$v AND success" | grep -q 1; then
    in_known "$v" || MISSING+=("$b")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "锚点对齐失败：以下迁移 <= $ANCHOR 但不在账本/白名单：" >&2
  printf '  %s\n' "${MISSING[@]}" >&2
  exit 1
fi

SCHEMA_FILE="$OUT/prod_schema_${ANCHOR}.sql.gz"
LEDGER_FILE="$OUT/prod_ledger_${ANCHOR}.sql"
META_FILE="$OUT/baseline_${ANCHOR}.json"
DRIFT_FILE="$OUT/prod_drift_${ANCHOR}.tsv"

if [[ $FORCE -eq 0 && -e "$SCHEMA_FILE" ]]; then
  echo "已存在 ${SCHEMA_FILE}（加 --force 覆盖）" >&2
  exit 2
fi

echo "== 导出 schema-only（anchor=${ANCHOR}, tables=${TABLES}, ledger=${LEDGER_ROWS}）"
TMP="$(mktemp /tmp/topems_baseline_XXXXXX)"
"$PG_DUMP" "$DSN" --schema-only --no-owner --no-privileges -f "$TMP"
gzip -9 -n -c "$TMP" > "$SCHEMA_FILE"
rm -f "$TMP"

{
  echo "-- TopEMS 基线账本锚点 $ANCHOR"
  echo "-- 由 scripts/migration/gen-baseline.sh 生成；仅含 success=true 的已应用记录。"
  echo "BEGIN;"
  psql "$DSN" -tA -c "SELECT format('INSERT INTO _sqlx_migrations (version, description, installed_on, success, checksum, execution_time) VALUES (%s, %L, %L, %L, decode(%L,''hex''), %s);', version, description, installed_on, success, encode(checksum,'hex'), execution_time) FROM _sqlx_migrations WHERE success ORDER BY version"
  echo "COMMIT;"
} > "$LEDGER_FILE"

SOURCE_DB="$(psql "$DSN" -tA -c "SELECT current_database()")"
SOURCE_HOST="$(psql "$DSN" -tA -c "SELECT coalesce(inet_server_addr()::text,'local')")"
SOURCE_VER="$(psql "$DSN" -tA -c "SELECT current_setting('server_version')")"
DUMP_SHA="$(shasum -a 256 "$SCHEMA_FILE" | awk '{print $1}')"
LEDGER_SHA="$(shasum -a 256 "$LEDGER_FILE" | awk '{print $1}')"
GEN_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

KNOWN_JSON="$(printf '%s\n' "${KNOWN_NOT_APPLIED[@]}" | LC_ALL=C sort | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $0} END{printf "]"}' )"

# 可选：与对照链库的表差集（漂移清单）
DRIFT_JSON="null"
if [[ -n "$CHAIN_DB" ]]; then
  : "${PGHOST:?生成对照链差集需要显式 PGHOST（不再回落到 /tmp socket）}"
  : "${PGUSER:?生成对照链差集需要显式 PGUSER（不再回落到内置用户）}"
  psql -h "$PGHOST" -U "$PGUSER" -d "$CHAIN_DB" -tA -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY 1" > /tmp/topems_prod_tables.txt
  psql "$DSN" -tA -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY 1" > /tmp/topems_prod_tables.src.txt
  { echo -e "direction\ttable"; comm -23 <(LC_ALL=C sort -u /tmp/topems_prod_tables.src.txt) <(LC_ALL=C sort -u /tmp/topems_prod_tables.txt) | sed 's/^/prod_only\t/'; comm -13 <(LC_ALL=C sort -u /tmp/topems_prod_tables.src.txt) <(LC_ALL=C sort -u /tmp/topems_prod_tables.txt) | sed 's/^/chain_only\t/'; } > "$DRIFT_FILE"
  P_ONLY="$(grep -c $'^prod_only\t' "$DRIFT_FILE" || true)"
  C_ONLY="$(grep -c $'^chain_only\t' "$DRIFT_FILE" || true)"
  DRIFT_JSON="{\"chain_db\":\"$CHAIN_DB\",\"prod_only\":$P_ONLY,\"chain_only\":$C_ONLY}"
  rm -f /tmp/topems_prod_tables.txt /tmp/topems_prod_tables.src.txt
fi

cat > "$META_FILE" <<EOF
{
  "anchor_version": $ANCHOR,
  "source_db": "$SOURCE_DB",
  "source_host": "$SOURCE_HOST",
  "source_server_version": "$SOURCE_VER",
  "generated_at_utc": "$GEN_AT",
  "table_count": $TABLES,
  "ledger_rows": $LEDGER_ROWS,
  "schema_file": "$(basename "$SCHEMA_FILE")",
  "ledger_file": "$(basename "$LEDGER_FILE")",
  "schema_sha256": "$DUMP_SHA",
  "ledger_sha256": "$LEDGER_SHA",
  "known_not_applied_versions": $KNOWN_JSON,
  "drift": $DRIFT_JSON
}
EOF

echo "== 完成"
echo "  anchor : $ANCHOR"
echo "  schema : $SCHEMA_FILE ($(du -h "$SCHEMA_FILE" | cut -f1))"
echo "  ledger : $LEDGER_FILE ($LEDGER_ROWS rows)"
echo "  meta   : $META_FILE"
[[ -n "$CHAIN_DB" ]] && echo "  drift  : $DRIFT_FILE"
exit 0
