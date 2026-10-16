-- =============================================================
-- B3b 分类审计（只读幂等）：FORCE=ON 但 RLS=OFF（FORCE 空转）表分类盘点
--
-- 用法：
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/audit/b3b_force_idle_classify.sql
--
-- 目的：
--   A5 审计（audit-force-rls-no-policy.sql）登记了 FORCE 空转表
--   5432=173 / 5433=192（U5-C 型；5433 验证实例 2026-10-16 起已不存在）。本脚本对该集合做处置前分类：
--     [1] 明细清单：每张表的 schema / 表名 / 是否含 tenant_id / tenant_id 类型 /
--         行数 / 既有 policy 数 / 建议处置桶
--     [2] 分类汇总：含 tenant_id（→ U5-C rls_tenant_isolation）vs
--         无 tenant_id（→ B3a 同构 allow_all permissive）
--     [3] 非空表重点：列出有真实数据的表（处置安全性重点核对对象）
--
-- 边界（与 B3a / A5 严格切分，靠 relrowsecurity 标志天然互斥）：
--   - 本脚本只看 relforcerowsecurity=TRUE AND relrowsecurity=FALSE（FORCE 空转）。
--   - RLS=TRUE 零 policy 表是 B3a(0011)/A5(0009) 的范围，不在本清单。
--
-- 只读：不做任何 DDL/DML。可重复执行。
-- 排除：pg_catalog / information_schema / pg_toast 及其临时 schema。
-- =============================================================

\echo '=== [1/3] FORCE 空转表明细（FORCE=ON 且 RLS=OFF）+ 处置桶分类 ==='

SELECT
    n.nspname                                                AS schema_name,
    c.relname                                                AS table_name,
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
        SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid
    ), 0)                                                    AS policy_count,
    (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint                   AS row_count,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id'
    ) THEN 'tenant_isolation (U5-C)'
    ELSE 'allow_all permissive (B3a 同构)'
    END                                                      AS disposition_bucket
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relname NOT LIKE 'pg\_%'
  AND c.relforcerowsecurity = TRUE
  AND c.relrowsecurity = FALSE
ORDER BY n.nspname, c.relname;

\echo ''
\echo '=== [2/3] 分类汇总（处置桶 × 行数 × 既有 policy） ==='

SELECT
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id'
    ) THEN 'tenant_isolation (U5-C)'
    ELSE 'allow_all permissive (B3a 同构)'
    END                                                      AS disposition_bucket,
    count(*)                                                 AS tables,
    count(*) FILTER (WHERE (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint > 0)              AS nonempty_tables,
    count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    ))                                                       AS with_existing_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relname NOT LIKE 'pg\_%'
  AND c.relforcerowsecurity = TRUE
  AND c.relrowsecurity = FALSE
GROUP BY 1
ORDER BY 1;

\echo ''
\echo '=== [3/3] 非空 FORCE 空转表（真实数据，处置安全性重点核对） ==='

SELECT
    n.nspname                                                AS schema_name,
    c.relname                                                AS table_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns ci
        WHERE ci.table_schema = n.nspname
          AND ci.table_name = c.relname
          AND ci.column_name = 'tenant_id'
    )                                                        AS has_tenant_id,
    (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint                   AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND c.relname NOT LIKE 'pg\_%'
  AND c.relforcerowsecurity = TRUE
  AND c.relrowsecurity = FALSE
  AND (xpath('/row/cnt/text()', query_to_xml(format(
        'SELECT count(*) AS cnt FROM %I.%I', n.nspname, c.relname
    ), false, true, '')))[1]::text::bigint > 0
ORDER BY n.nspname, c.relname;
