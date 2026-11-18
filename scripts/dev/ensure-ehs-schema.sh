#!/usr/bin/env bash
# ==============================================================================
# ehs schema 幂等补建守卫（同 06-09 体系）
# 主库缺 ehs schema 71 表 → 调用统一迁移链补建（migrate.sh run，权威来源，
# 消除 init/ 双源漂移）；guard：ehs.qa_ehs_accidents 存在即「已就绪」exit 0。
# 用法：bash scripts/dev/ensure-ehs-schema.sh
# ==============================================================================
set -euo pipefail

DB_URL="${DATABASE_URL:-postgres:///topems}"
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATE_SCRIPT="$SCRIPT_DIR/scripts/migrate.sh"

ready() {
  psql "$DB_URL" -t -A -c "SELECT 1 FROM pg_tables WHERE schemaname='ehs' AND tablename='qa_ehs_accidents'" | grep -q 1
}

if ready; then
  echo "EHS_SCHEMA_OK（ehs.qa_ehs_accidents 已存在，跳过）"
  exit 0
fi

echo "EHS_SCHEMA_MISSING（ehs.qa_ehs_accidents 不存在，调用迁移链补建）"
bash "$MIGRATE_SCRIPT" run >/dev/null

if ready; then
  echo "EHS_SCHEMA_READY（迁移链补建完成：ehs 71 表）"
  exit 0
fi
echo "EHS_SCHEMA_FAIL（迁移链补建后仍缺 ehs.qa_ehs_accidents，请查迁移链输出）" >&2
exit 1
