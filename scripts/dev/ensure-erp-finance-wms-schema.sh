#!/usr/bin/env bash
# ==============================================================================
# 幂等补建 ERP/Finance/WMS 域缺表缺列（调用统一迁移链，权威来源，
# 消除 init/ 双源漂移；原 09_erp_finance_wms_schema.sql 兜底由迁移链取代）
# guard：erp.asset_categories 与 finance.reconcile_orders 均存在即视为已就绪
# 用法：bash scripts/dev/ensure-erp-finance-wms-schema.sh
# ==============================================================================
set -euo pipefail

PGURL="${DATABASE_URL:-postgres:///topems}"
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATE_SCRIPT="$SCRIPT_DIR/scripts/migrate.sh"

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
  echo "已就绪：erp.asset_categories + finance.reconcile_orders 存在（迁移链已应用），幂等退出 0"
  exit 0
fi

echo "ERP/Finance/WMS 域表缺失，调用迁移链补建（migrate.sh run）"
bash "$MIGRATE_SCRIPT" run >/dev/null
echo "✅ 迁移链已应用（erp.asset_categories / finance.reconcile_orders 建表 + 列补齐）"
