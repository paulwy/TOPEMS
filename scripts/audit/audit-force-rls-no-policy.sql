-- =============================================================
-- A5 审计（只读幂等）：全库「RLS/FORCE 已开但无任何 policy」基表盘点
--
-- 用法：
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/audit/audit-force-rls-no-policy.sql
--
-- 输出：
--   结果 1（核心清单）：所有 relrowsecurity=TRUE 且无 pg_policy 的基表
--     （含 relforcerowsecurity 状态、tenant_id 列形态、行数、policy 数）
--   结果 2（补充）：relforcerowsecurity=TRUE 但 relrowsecurity=FALSE 的表
--     （FORCE 空转类，U5-C 型；本审计一并列出但分类标注）
--   结果 3（汇总计数）
--
-- 只读：本脚本不做任何 DDL/DML。可重复执行。
-- 排除：pg_catalog / information_schema / pg_toast 及其临时 schema。
-- =============================================================

\echo '=== [1/3] RLS=ON 且无任何 policy 的基表（A5 主清单） ==='

SELECT
    n.nspname                                                AS schema_name,
    c.relname                                                AS table_name,
    CASE WHEN c.relforcerowsecurity THEN 'FORCE' ELSE 'no-force' END AS rls_force,
    c.relrowsecurity                                         AS rls_on,
    COALESCE((
        SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid
    ), 0)                                                    AS policy_count,
    EXISTS (
        SELECT 1 FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id'
    )                                                        AS has_tenant_id,
    COALESCE((
        SELECT ci.data_type FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id' LIMIT 1
    ), '-')                                                  AS tenant_id_type,
    COALESCE((
        SELECT ci.is_nullable FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id' LIMIT 1
    ), '-')                                                  AS tenant_id_nullable,
    (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint                   AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relrowsecurity = TRUE
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
ORDER BY n.nspname, c.relname;

\echo ''
\echo '=== [2/3] FORCE=ON 但 RLS=OFF（FORCE 空转，U5-C 型补充清单） ==='

SELECT
    n.nspname                                                AS schema_name,
    c.relname                                                AS table_name,
    c.relrowsecurity                                         AS rls_on,
    c.relforcerowsecurity                                    AS rls_force,
    EXISTS (
        SELECT 1 FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id'
    )                                                        AS has_tenant_id,
    COALESCE((
        SELECT ci.data_type FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id' LIMIT 1
    ), '-')                                                  AS tenant_id_type,
    (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint                   AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relforcerowsecurity = TRUE
  AND c.relrowsecurity = FALSE
ORDER BY n.nspname, c.relname;

\echo ''
\echo '=== [3/3] 汇总 ==='

SELECT
    count(*) FILTER (WHERE c.relrowsecurity = TRUE
                        AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid))
        AS rls_on_no_policy_tables,
    count(*) FILTER (WHERE c.relrowsecurity = TRUE
                        AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
                        AND EXISTS (SELECT 1 FROM information_schema.columns ci
                                    WHERE ci.table_schema = n.nspname
                                      AND ci.table_name = c.relname
                                      AND ci.column_name = 'tenant_id'))
        AS with_tenant_id,
    count(*) FILTER (WHERE c.relrowsecurity = TRUE
                        AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
                        AND NOT EXISTS (SELECT 1 FROM information_schema.columns ci
                                    WHERE ci.table_schema = n.nspname
                                      AND ci.table_name = c.relname
                                      AND ci.column_name = 'tenant_id'))
        AS without_tenant_id,
    count(*) FILTER (WHERE c.relforcerowsecurity = TRUE AND c.relrowsecurity = FALSE)
        AS force_idle_tables
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%';
