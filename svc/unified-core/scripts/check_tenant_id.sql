-- Unified Core - Tenant ID 缺失检测脚本
-- 运行此脚本检查哪些表缺少 tenant_id 列或包含 NULL 值的 tenant_id

-- ============================================
-- 1. 检查缺少 tenant_id 列的表
-- ============================================
WITH core_tables AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'core_%'
      AND table_name NOT IN ('core_tenants', 'core_users')
)
SELECT 
    table_name,
    '缺少 tenant_id 列' AS issue
FROM core_tables
WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = core_tables.table_name
      AND column_name = 'tenant_id'
)
ORDER BY table_name;

-- ============================================
-- 2. 检查包含 NULL tenant_id 的表和行数
-- ============================================
DO $$
DECLARE
    rec RECORD;
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    FOR rec IN 
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name LIKE 'core_%'
          AND column_name = 'tenant_id'
          AND is_nullable = 'YES'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', rec.table_name) INTO null_count;
        EXECUTE format('SELECT COUNT(*) FROM %I', rec.table_name) INTO total_count;
        
        IF null_count > 0 THEN
            RAISE NOTICE '表 % 有 % 行 tenant_id 为 NULL (总行数: %)', rec.table_name, null_count, total_count;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 3. 检查未启用 RLS 的表
-- ============================================
WITH rls_tables AS (
    SELECT 
        tablename AS table_name,
        relrowsecurity AS rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'core_%'
)
SELECT 
    table_name,
    CASE WHEN rls_enabled THEN '已启用' ELSE '未启用' END AS rls_status,
    CASE WHEN NOT rls_enabled THEN '需要启用 RLS' ELSE NULL END AS recommendation
FROM rls_tables
ORDER BY table_name;

-- ============================================
-- 4. 检查缺少 tenant_id 索引的表
-- ============================================
WITH indexed_tables AS (
    SELECT 
        tbl.table_name,
        idx.indexname IS NOT NULL AS has_index
    FROM information_schema.tables tbl
    LEFT JOIN pg_indexes idx 
        ON tbl.table_name = idx.tablename 
        AND idx.indexname LIKE '%tenant_id%'
    WHERE tbl.table_schema = 'public'
      AND tbl.table_name LIKE 'core_%'
)
SELECT 
    table_name,
    CASE WHEN has_index THEN '已存在' ELSE '缺少索引' END AS index_status,
    CASE WHEN NOT has_index THEN '建议创建索引: CREATE INDEX idx_<table>_tenant_id ON <table>(tenant_id)' ELSE NULL END AS recommendation
FROM indexed_tables
ORDER BY table_name;