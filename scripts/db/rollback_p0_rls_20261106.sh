#!/usr/bin/env bash
# P0 · RLS 收紧回滚（策略层）
#
# 作用：把目标库的策略与 RLS/FORCE 状态还原到 `policies_before.sql` 记录的形态。
# 不涉及数据；数据层回滚用同目录 dump.dump 的 pg_restore。
#
# 用法：
#   scripts/db/rollback_p0_rls_20261106.sh <快照目录> [数据库名]
#
# 例：
#   scripts/db/rollback_p0_rls_20261106.sh backups/p0_rls/20261106-113000 topems_prod
#
# 前置：已确认 failures 命中回滚条件（登录成功率跌 >1% / refresh·logout 401 暴涨 /
# 核心列表由有数据变 0 / 审计写入失败 / pool timed out）。
# 完成后必须复验：策略数恢复 1066、RLS 表 867、fail_open 策略数恢复为 1066 中的对应值。

set -euo pipefail

SNAP="${1:-}"
DB="${2:-topems_prod}"

if [[ -z "$SNAP" ]]; then
  echo "用法: $0 <快照目录> [数据库名]" >&2
  exit 2
fi
if [[ ! -f "$SNAP/policies_before.sql" ]]; then
  echo "快照目录缺少 policies_before.sql: $SNAP" >&2
  exit 2
fi

echo "== 回滚前现状 =="
psql -X -A -F'|' -d "$DB" -c "
SELECT (SELECT count(*) FROM pg_policy) AS policies,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE c.relkind='r' AND c.relrowsecurity
           AND n.nspname NOT IN ('pg_catalog','information_schema')) AS rls_tables;"

echo "== 重放策略快照 =="
psql -X -v ON_ERROR_STOP=1 -d "$DB" -f "$SNAP/policies_before.sql"

echo "== 回滚后现状（应与快照 summary 一致）=="
psql -X -A -F'|' -d "$DB" -c "
SELECT (SELECT count(*) FROM pg_policy) AS policies,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE c.relkind='r' AND c.relrowsecurity
           AND n.nspname NOT IN ('pg_catalog','information_schema')) AS rls_tables,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE c.relkind='r' AND c.relforcerowsecurity
           AND n.nspname NOT IN ('pg_catalog','information_schema')) AS force_tables;"

echo
echo "回滚完成。若策略数与快照 summary 不符，立即人工介入（不要重跑迁移）。"
