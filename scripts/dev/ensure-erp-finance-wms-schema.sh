#!/usr/bin/env bash
# ==============================================================================
# 幂等补建 ERP/Finance/WMS 域缺表缺列（09_erp_finance_wms_schema.sql）
# guard：erp.asset_categories 与 finance.reconcile_orders 均存在即视为已就绪
# 用法：bash scripts/dev/ensure-erp-finance-wms-schema.sh
# ==============================================================================
set -euo pipefail

PGURL="${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}"
SQL_FILE="$(cd "$(dirname "$0")/../.." && pwd)/database/init/09_erp_finance_wms_schema.sql"

already() {
  local n
  n="$(psql "$PGURL" -t -A -c \
    "SELECT count(*) FROM pg_tables WHERE schemaname='erp' AND tablename='asset_categories'" 2>/dev/null || echo 0)"
  local m
  m="$(psql "$PGURL" -t -A -c \
    "SELECT count(*) FROM pg_tables WHERE schemaname='finance' AND tablename='reconcile_orders'" 2>/dev/null || echo 0)"
  [[ "${n:-0}" == "1" && "${m:-0}" == "1" ]]
}

if already; then
  echo "已就绪：erp.asset_categories + finance.reconcile_orders 存在（09 已应用），幂等退出 0"
  exit 0
fi

psql "$PGURL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "✅ 09_erp_finance_wms_schema.sql 已应用（erp.asset_categories / finance.reconcile_orders 建表 + 6 列补齐）"
