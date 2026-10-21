#!/usr/bin/env bash
# ==============================================================================
# ehs schema 幂等补建守卫（同 06-09 体系）
# 主库缺 ehs schema 71 表 → 用 database/init/10_ehs_schema.sql 幂等补建；
# guard：ehs.qa_ehs_accidents 存在即「已就绪」exit 0（防空库重建再丢）。
# 用法：bash scripts/dev/ensure-ehs-schema.sh
# ==============================================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}"
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_FILE="$SCRIPT_DIR/database/init/10_ehs_schema.sql"

ready() {
  psql "$DB_URL" -t -A -c "SELECT 1 FROM pg_tables WHERE schemaname='ehs' AND tablename='qa_ehs_accidents'" | grep -q 1
}

if ready; then
  echo "EHS_SCHEMA_OK（ehs.qa_ehs_accidents 已存在，跳过）"
  exit 0
fi

echo "EHS_SCHEMA_MISSING（ehs.qa_ehs_accidents 不存在，执行补建）"
psql "$DB_URL" -f "$SQL_FILE" >/dev/null

if ready; then
  echo "EHS_SCHEMA_READY（补建完成：ehs 71 表）"
  exit 0
fi
echo "EHS_SCHEMA_FAIL（补建后仍缺 ehs.qa_ehs_accidents，请查 $SQL_FILE）" >&2
exit 1
