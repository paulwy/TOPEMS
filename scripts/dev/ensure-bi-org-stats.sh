#!/usr/bin/env bash
# BE-02 组织计数最小纠正：确保 bi.org_stats 物化视图存在并刷新（方案 A）
# 幂等 guard：物化视图已存在则跳过创建，仅执行刷新（若视图缺失则创建后刷新）。
# 用法：bash scripts/dev/ensure-bi-org-stats.sh [DATABASE_URL]
set -euo pipefail

DB="${1:-postgres:///topems}"

if psql "$DB" -tAc "SELECT 1 FROM pg_matviews WHERE schemaname='bi' AND matviewname='org_stats'" | grep -q 1; then
  echo "[ensure-bi-org-stats] 物化视图已存在，刷新快照"
else
  echo "[ensure-bi-org-stats] 物化视图缺失，创建"
  psql "$DB" -f "$(dirname "$0")/../../database/init/11_bi_org_stats.sql"
fi

psql "$DB" -c "REFRESH MATERIALIZED VIEW bi.org_stats"

echo "[ensure-bi-org-stats] OK：$(psql "$DB" -tAc "SELECT companies || '/' || departments || '/' || employees FROM bi.org_stats")"
