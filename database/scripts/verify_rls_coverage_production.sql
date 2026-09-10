-- ============================================
-- RLS 全覆盖 & 死表清理 生产环境验证脚本
-- 版本: 2026-09-10
-- 说明: 部署后执行此脚本验证 RLS 覆盖率和死表清理结果
-- ============================================

-- ===== 1. RLS 覆盖率验证 =====
-- 预期结果: 0 行（所有含 tenant_id 的表都已启用 RLS）
SELECT
    t.table_schema,
    t.table_name,
    c.column_name
FROM information_schema.columns c
JOIN information_schema.tables t
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
WHERE c.column_name = 'tenant_id'
  AND t.table_type = 'BASE TABLE'
  AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND NOT EXISTS (
      SELECT 1
      FROM pg_class pc
      JOIN pg_namespace pn ON pc.relnamespace = pn.oid
      WHERE pc.relname = t.table_name
        AND pn.nspname = t.table_schema
        AND pc.relrowsecurity = true
  )
ORDER BY t.table_schema, t.table_name;

-- ===== 2. RLS 启用统计表 =====
-- 预期结果: 显示各 schema 的 RLS 启用情况
SELECT
    t.table_schema,
    COUNT(*) AS total_tables,
    COUNT(*) FILTER (WHERE pc.relrowsecurity = true) AS rls_enabled,
    COUNT(*) FILTER (WHERE pc.relrowsecurity = false) AS rls_disabled,
    ROUND(
        COUNT(*) FILTER (WHERE pc.relrowsecurity = true)::numeric / COUNT(*) * 100,
        2
    ) AS rls_coverage_pct
FROM information_schema.tables t
JOIN pg_class pc ON pc.relname = t.table_name
JOIN pg_namespace pn ON pc.relnamespace = pn.oid AND pn.nspname = t.table_schema
WHERE t.table_type = 'BASE TABLE'
  AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY t.table_schema
ORDER BY t.table_schema;

-- ===== 3. RLS Policy 验证 =====
-- 预期结果: 每个启用 RLS 的表都有 rls_tenant_isolation policy
SELECT
    pn.nspname AS table_schema,
    pc.relname AS table_name,
    pc.relrowsecurity AS rls_enabled,
    pc.relforcerowsecurity AS rls_forced,
    COUNT(pp.polname) AS policy_count
FROM pg_class pc
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
LEFT JOIN pg_policy pp ON pp.polrelid = pc.oid
WHERE pc.relkind = 'r'
  AND pn.nspname NOT IN ('pg_catalog', 'information_schema')
  AND pc.relrowsecurity = true
GROUP BY pn.nspname, pc.relname, pc.relrowsecurity, pc.relforcerowsecurity
HAVING COUNT(pp.polname) = 0
ORDER BY pn.nspname, pc.relname;

-- ===== 4. 死表清理验证（public schema） =====
-- 预期结果: 0 行（public schema 中不应有 finance 相关的旧表）
SELECT
    table_schema,
    table_name,
    (xpath('/row/cnt/text()', query_to_xml(
        format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name),
        false, true, ''
    )))[1]::text::int AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%finance%'
ORDER BY table_name;

-- ===== 5. 数据库表数统计 =====
-- 预期结果: 约 902 张表（清理后）
SELECT
    table_schema,
    COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
GROUP BY table_schema
ORDER BY table_count DESC;

-- ===== 6. 迁移状态验证 =====
-- 预期结果: 116 个迁移全部成功
SELECT
    COUNT(*) AS total_migrations,
    COUNT(*) FILTER (WHERE success = true) AS successful,
    COUNT(*) FILTER (WHERE success = false) AS failed,
    MAX(installed_on) AS last_migration_time
FROM _sqlx_migrations;

-- ===== 7. 最近应用的迁移列表 =====
SELECT
    version,
    description,
    installed_on,
    success
FROM _sqlx_migrations
ORDER BY installed_on DESC
LIMIT 15;

-- ============================================
-- 验证结果判定标准:
-- 1. RLS 覆盖率查询返回 0 行 → ✅ 通过
-- 2. 各 schema RLS 覆盖率均为 100% → ✅ 通过
-- 3. 无 policy 的 RLS 表返回 0 行 → ✅ 通过
-- 4. public schema finance 旧表返回 0 行 → ✅ 通过
-- 5. 迁移表 116 个全部成功 → ✅ 通过
-- ============================================
