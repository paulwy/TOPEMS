-- =============================================================
-- P2-1 第 1 批：对含 tenant_id 列的表启用 RLS（分批迁移）
-- 日期：2026-08-31
-- 目的：为全部 schema 中已含 tenant_id 列的业务表启用行级安全，
--       策略与应用层 lib/shared-db/src/rls.rs 保持一致：
--         USING (tenant_id = current_setting('app.tenant_id')::UUID OR tenant_id IS NULL)
--       仅处理含 tenant_id 列的表（避免 CREATE POLICY 引用不存在列而失败）。
-- 注意 1：PostgreSQL 不支持 CREATE POLICY IF NOT EXISTS（PG18 语法错误），
--         需先查询 pg_policies 判断策略是否存在，避免重复创建报错。
-- 注意 2：GUC 未设置时 current_setting('app.tenant_id') 返回空串，''::UUID 会报错；
--         必须用 NULLIF(...,'')::UUID 保证空安全（未设置租户 → NULL → 仅放行 tenant_id IS NULL）。
-- 幂等：ENABLE ROW LEVEL SECURITY 与存在性判断均可重复执行。
-- =============================================================

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT n.nspname AS schema_name, c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND EXISTS (
              SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
          )
        ORDER BY n.nspname, c.relname
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schema_name, t.table_name);

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = t.schema_name
              AND tablename = t.table_name
              AND policyname = format('tenant_isolation_%I', t.table_name)
        ) THEN
            EXECUTE format(
                'CREATE POLICY tenant_isolation_%I ON %I.%I
                 FOR ALL USING (
                    tenant_id = NULLIF(current_setting(''app.tenant_id''), '''')::UUID
                    OR tenant_id IS NULL
                 )',
                t.table_name, t.schema_name, t.table_name
            );
        ELSE
            -- 已存在策略则更新为空安全表达式（修复旧策略的 ''::UUID 报错缺陷）
            EXECUTE format(
                'ALTER POLICY tenant_isolation_%I ON %I.%I USING (
                    tenant_id = NULLIF(current_setting(''app.tenant_id''), '''')::UUID
                    OR tenant_id IS NULL
                 )',
                t.table_name, t.schema_name, t.table_name
            );
        END IF;
        RAISE NOTICE 'RLS enabled: %.%', t.schema_name, t.table_name;
    END LOOP;
END $$;

-- 校验统计：启用后应等于"含 tenant_id 列的表数"
-- SELECT count(*) FROM (
--   SELECT n.nspname||'.'||c.relname
--   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema')
--     AND c.relrowsecurity
-- ) s;
