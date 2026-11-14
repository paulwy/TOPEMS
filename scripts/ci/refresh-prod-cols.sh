#!/usr/bin/env bash
# 只读导出生产库列目录快照（decode-contract gate 的默认输入）
#
# 安全边界（必须保持）：
#   - 只执行 SELECT（列目录 + _sqlx_migrations.max(version)），
#     不 CREATE / ALTER / DROP / INSERT / UPDATE / DELETE，不改任何对象。
#   - 每次连接都设置 default_transaction_read_only=on，写语句会被数据库直接拒绝。
#   - 不新增生产写权限，复用既有只读通道（ssh + psql，见
#     docs/quality/decode-contract-audit-2026-11-05.md）。
#
# 用法：
#   bash scripts/ci/refresh-prod-cols.sh
#   PROD_DB_URL='postgresql://<ro-user>@<host>/topems_prod' bash scripts/ci/refresh-prod-cols.sh
#
# 输出（刷新后请一并提交）：
#   scripts/ci/data/prod_cols.psv        列目录快照（schema|table|column|type）
#   scripts/ci/data/prod_cols.meta.json  导出时间 / 库名 / 账本 max / 行数 / sha256
#
# 环境变量：
#   PROD_SSH_HOST  只读通道主机（默认 xingzhai@192.168.110.115）
#   PROD_DB        生产库名（默认 topems_prod）
#   PROD_PSQL      远端 psql 路径（默认 /opt/homebrew/bin/psql）
#   PROD_DB_URL    可选：本地直连只读账号；设置后不再走 ssh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

OUT="scripts/ci/data/prod_cols.psv"
META="scripts/ci/data/prod_cols.meta.json"
PROD_SSH_HOST="${PROD_SSH_HOST:-xingzhai@192.168.110.115}"
PROD_DB="${PROD_DB:-topems_prod}"
PROD_PSQL="${PROD_PSQL:-/opt/homebrew/bin/psql}"
PSQL_LOCAL="${PSQL_BIN:-psql}"

SQL_CATALOG="$(mktemp)"
SQL_LEDGER="$(mktemp)"
TMP_OUT="$(mktemp)"
trap 'rm -f "$SQL_CATALOG" "$SQL_LEDGER" "$TMP_OUT"' EXIT

cat > "$SQL_CATALOG" <<'SQL'
SELECT n.nspname, c.relname, a.attname,
       format_type(a.atttypid, a.atttypmod), a.attnotnull, c.relkind
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p','v','m')
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
ORDER BY n.nspname, c.relname, a.attnum;
SQL

printf "SELECT COALESCE(max(version)::TEXT, '') FROM _sqlx_migrations;\n" > "$SQL_LEDGER"

# 只读会话：default_transaction_read_only=on，任何写语句都会被数据库拒绝
run_psql() { # $1 = SQL 文件
  if [ -n "${PROD_DB_URL:-}" ]; then
    PGOPTIONS='-c default_transaction_read_only=on' \
      "$PSQL_LOCAL" "$PROD_DB_URL" -tA -F'|' -f - < "$1"
  else
    ssh "$PROD_SSH_HOST" \
      "PGOPTIONS='-c default_transaction_read_only=on' $PROD_PSQL -d $PROD_DB -tA -F'|' -f -" < "$1"
  fi
}

run_psql "$SQL_CATALOG" > "$TMP_OUT"
if [ ! -s "$TMP_OUT" ]; then
  printf '[refresh-prod-cols] FAILED 导出结果为空（检查只读通道与库名 %s）\n' "$PROD_DB" >&2
  exit 1
fi
if ! awk -F'|' 'NF < 6 { bad++ } END { if (bad) { printf "存在 %d 行列数不足 6（schema|table|column|type|attnotnull|relkind）\n", bad > "/dev/stderr"; exit 1 } }' "$TMP_OUT"; then
  exit 1
fi

LEDGER_MAX="$(run_psql "$SQL_LEDGER" | tr -d '[:space:]')"
ROWS="$(wc -l < "$TMP_OUT" | tr -d ' ')"
SHA="$(shasum -a 256 "$TMP_OUT" | awk '{print $1}')"
EXPORTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -n "${PROD_DB_URL:-}" ]; then SOURCE_HOST="local-psql"; else SOURCE_HOST="$PROD_SSH_HOST"; fi

mkdir -p scripts/ci/data
mv "$TMP_OUT" "$OUT"
python3 - "$EXPORTED_AT" "$ROWS" "$SHA" "$LEDGER_MAX" "$SOURCE_HOST" > "$META" <<'PY'
import json, sys
exported_at, rows, sha, ledger_max, source_host = sys.argv[1:6]
meta = {
    "exported_at": exported_at,
    "database": "topems_prod",
    "ledger_max": ledger_max,
    "source_host": source_host,
    "row_count": int(rows),
    "sha256": sha,
    "max_age_days": 7,
    "generator": "scripts/ci/refresh-prod-cols.sh",
}
json.dump(meta, sys.stdout, ensure_ascii=False, indent=2)
sys.stdout.write("\n")
PY

printf '[refresh-prod-cols] OK %s（%s 行，ledger_max=%s，sha256=%s）\n' "$OUT" "$ROWS" "$LEDGER_MAX" "${SHA:0:12}"
printf '[refresh-prod-cols] 已生成 %s；仅执行 SELECT，未修改任何数据库对象。请一并提交两份文件。\n' "$META"
