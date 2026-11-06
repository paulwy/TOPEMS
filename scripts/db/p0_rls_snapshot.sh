#!/usr/bin/env bash
# P0 · RLS 收紧前的备份快照
#
# 产出（默认写到 backups/p0_rls/<timestamp>/）：
#   dump.dump           整库 pg_dump -Fc（恢复点）
#   policies_before.sql 全部策略的可重放还原脚本（含 RLS/FORCE 状态）
#   table_state.tsv     逐表 RLS/FORCE/策略数快照
#   summary.txt         关键计数（策略数 / RLS 表 / FORCE 表）用于前后对账
#
# 用法：
#   scripts/db/p0_rls_snapshot.sh [数据库名] [输出目录]
#   scripts/db/p0_rls_snapshot.sh topems_prod
#
# 说明：
#   - 只读操作（pg_dump / 系统目录查询），不改动目标库。
#   - 需要本机以超级用户或具备 pg_read_all_stats 的角色运行 psql。
#   - 期望基线：策略 1066 / RLS 表 867 / FORCE 表 860（与方案第 1 节口径一致）。

set -euo pipefail

DB="${1:-topems_prod}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${2:-$(cd "$(dirname "$0")/../.." && pwd)/backups/p0_rls/${STAMP}}"

mkdir -p "$OUT"
echo "目标库: $DB"
echo "输出目录: $OUT"

# 1) 整库备份
pg_dump -Fc -d "$DB" -f "$OUT/dump.dump"
echo "dump: $(du -h "$OUT/dump.dump" | cut -f1)"

# 2) 逐表状态快照
psql -X -d "$DB" -A -F$'\t' -o "$OUT/table_state.tsv" -c "
SELECT n.nspname || '.' || c.relname AS tbl,
       c.relrowsecurity AS rls,
       c.relforcerowsecurity AS force,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1;"

# 3) 策略原文导出为可重放 SQL
{
  echo "-- P0 RLS 还原脚本（生成于 ${STAMP}，来源库 ${DB}）"
  echo "-- 重放方式: psql -v ON_ERROR_STOP=1 -d <目标库> -f policies_before.sql"
  echo "BEGIN;"
  # 先把目标库现有策略全部清空（避免 P0 新增的例外策略名残留导致计数虚高），
  # 再按快照逐条重建；DROP 用动态 SQL 覆盖所有关系类型，不依赖名单。
  cat <<'SQL'
DO $drop_all$
DECLARE
    r record;
    p text;
BEGIN
    FOR r IN
        SELECT c.oid FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r', 'p')
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    LOOP
        FOR p IN SELECT polname FROM pg_policy WHERE polrelid = r.oid LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %s', p, r.oid::regclass);
        END LOOP;
    END LOOP;
END $drop_all$;
SQL
  psql -X -d "$DB" -A -t -c "
SELECT format(
    'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
    p.polname,
    n.nspname,
    c.relname,
    CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
    CASE p.polcmd WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                  WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' END,
    CASE WHEN p.polroles = '{0}'::oid[] THEN 'PUBLIC'
         ELSE (SELECT string_agg(quote_ident(r2.rolname), ', ') FROM pg_roles r2 WHERE r2.oid = ANY(p.polroles))
    END,
    CASE WHEN p.polqual IS NOT NULL THEN ' USING (' || pg_get_expr(p.polqual, p.polrelid) || ')' ELSE '' END,
    CASE WHEN p.polwithcheck IS NOT NULL THEN ' WITH CHECK (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')' ELSE '' END
)
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, c.relname, p.polname;"
  # RLS / FORCE 状态还原（策略重建后再置状态，避免顺序依赖）
  psql -X -d "$DB" -A -t -c "
SELECT format('ALTER TABLE %I.%I %s ROW LEVEL SECURITY;', n.nspname, c.relname,
              CASE WHEN c.relrowsecurity THEN 'ENABLE' ELSE 'DISABLE' END)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1;"
  psql -X -d "$DB" -A -t -c "
SELECT format('ALTER TABLE %I.%I %s ROW LEVEL SECURITY;', n.nspname, c.relname,
              CASE WHEN c.relforcerowsecurity THEN 'FORCE' ELSE 'NO FORCE' END)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND c.relrowsecurity
ORDER BY 1;"
  echo "COMMIT;"
} > "$OUT/policies_before.sql"

# 4) 计数摘要（用于迁移前后对账）
psql -X -d "$DB" -A -F'|' -o "$OUT/summary.txt" -c "
SELECT
  (SELECT count(*) FROM pg_policy) AS policies,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relrowsecurity
      AND n.nspname NOT IN ('pg_catalog','information_schema')) AS rls_tables,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relforcerowsecurity
      AND n.nspname NOT IN ('pg_catalog','information_schema')) AS force_tables,
  (SELECT count(*) FROM pg_policy
    WHERE pg_get_expr(polqual, polrelid) LIKE '%current_setting%'
      AND (pg_get_expr(polqual, polrelid) LIKE '% IS NULL%'
        OR pg_get_expr(polqual, polrelid) LIKE '%00000000-0000-0000-0000-000000000001%')) AS fail_open_policies;"

echo
echo "policies|rls_tables|force_tables|fail_open_policies"
sed -n '2p' "$OUT/summary.txt"
echo
echo "快照完成：$OUT"
