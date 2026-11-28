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
#   PROD_SSH_HOST  可选只读 SSH 通道主机（留空 = 本机直连 topems_prod，默认）
#   PROD_DB        生产库名（默认 topems_prod）
#   PROD_PSQL      远端 psql 路径（SSH 通道时默认 /opt/homebrew/bin/psql）
#   PROD_DB_URL    可选：本地直连只读账号；设置后不再走 ssh
#   PROD_LOCAL_USER / PROD_LOCAL_HOST  本机直连账号 / socket 目录（默认 xingzhai / /tmp）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

OUT="scripts/ci/data/prod_cols.psv"
META="scripts/ci/data/prod_cols.meta.json"
PROD_SSH_HOST="${PROD_SSH_HOST:-}"
PROD_DB="${PROD_DB:-topems_prod}"
PROD_PSQL="${PROD_PSQL:-/opt/homebrew/bin/psql}"
PSQL_LOCAL="${PSQL_BIN:-psql}"
PROD_LOCAL_USER="${PROD_LOCAL_USER:-xingzhai}"
PROD_LOCAL_HOST="${PROD_LOCAL_HOST:-/tmp}"

SQL_CATALOG="$(mktemp)"
SQL_LEDGER="$(mktemp)"
SQL_VERSION="$(mktemp)"
TMP_OUT="$(mktemp)"
trap 'rm -f "$SQL_CATALOG" "$SQL_LEDGER" "$SQL_VERSION" "$TMP_OUT"' EXIT

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

printf "SELECT COALESCE(max(version)::TEXT, '') || '|' || count(*)::TEXT FROM _sqlx_migrations;\n" > "$SQL_LEDGER"
printf "SELECT current_setting('server_version');\n" > "$SQL_VERSION"

# 只读会话：default_transaction_read_only=on，任何写语句都会被数据库拒绝
run_psql() { # $1 = SQL 文件
  if [ -n "${PROD_DB_URL:-}" ]; then
    PGOPTIONS='-c default_transaction_read_only=on' \
      "$PSQL_LOCAL" "$PROD_DB_URL" -tA -F'|' -f - < "$1"
  elif [ -n "$PROD_SSH_HOST" ]; then
    ssh "$PROD_SSH_HOST" \
      "PGOPTIONS='-c default_transaction_read_only=on' $PROD_PSQL -d $PROD_DB -tA -F'|' -f -" < "$1"
  else
    PGOPTIONS='-c default_transaction_read_only=on' \
      "$PSQL_LOCAL" -h "$PROD_LOCAL_HOST" -U "$PROD_LOCAL_USER" -d "$PROD_DB" \
      -tA -F'|' -f - < "$1"
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

LEDGER_OUT="$(run_psql "$SQL_LEDGER" | tr -d '[:space:]')"
LEDGER_MAX="${LEDGER_OUT%%|*}"
LEDGER_ROWS="${LEDGER_OUT##*|}"
SERVER_VERSION="$(run_psql "$SQL_VERSION" | tr -d '[:space:]')"
CLIENT_VERSION="$("$PSQL_LOCAL" --version 2>/dev/null || echo unknown)"
ROWS="$(wc -l < "$TMP_OUT" | tr -d ' ')"
SHA="$(shasum -a 256 "$TMP_OUT" | awk '{print $1}')"
EXPORTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -n "${PROD_DB_URL:-}" ]; then SOURCE_HOST="local-psql"; elif [ -n "$PROD_SSH_HOST" ]; then SOURCE_HOST="$PROD_SSH_HOST"; else SOURCE_HOST="local-socket"; fi
GENERATOR_CMD="bash scripts/ci/refresh-prod-cols.sh（PROD_SSH_HOST=${SOURCE_HOST} PROD_DB=${PROD_DB}）"

mkdir -p scripts/ci/data
mv "$TMP_OUT" "$OUT"
python3 - "$EXPORTED_AT" "$ROWS" "$SHA" "$LEDGER_MAX" "$LEDGER_ROWS" "$SOURCE_HOST" "$SERVER_VERSION" "$CLIENT_VERSION" "$GENERATOR_CMD" > "$META" <<'PY'
import json, sys
exported_at, rows, sha, ledger_max, ledger_rows, source_host, server_version, client_version, generator_cmd = sys.argv[1:10]
meta = {
    "exported_at": exported_at,
    "baseline_date": exported_at[:10],
    "database": "topems_prod",
    "ledger_max": ledger_max,
    "ledger_rows": int(ledger_rows),
    "source_host": source_host,
    "row_count": int(rows),
    "sha256": sha,
    "max_age_days": 7,
    "generator": "scripts/ci/refresh-prod-cols.sh",
    "generator_cmd": generator_cmd,
    "server_version": server_version,
    "client_version": client_version,
}
json.dump(meta, sys.stdout, ensure_ascii=False, indent=2)
sys.stdout.write("\n")
PY

printf '[refresh-prod-cols] OK %s（%s 行，ledger_max=%s，ledger_rows=%s，sha256=%s）\n' "$OUT" "$ROWS" "$LEDGER_MAX" "$LEDGER_ROWS" "${SHA:0:12}"
printf '[refresh-prod-cols] 已生成 %s；仅执行 SELECT，未修改任何数据库对象。请一并提交两份文件。\n' "$META"
