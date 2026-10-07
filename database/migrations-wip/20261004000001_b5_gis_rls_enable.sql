-- =============================================================
-- B5：gis schema 业务表 RLS 开启与租户隔离策略补齐（幂等）
-- 关联审计：U5 残留 a（svc/gis/src/main.rs enable_rls:false 显式关闭 RLS）
--
-- 背景：
--   gis 运行时此前 enable_rls=false，protected 路由未挂载 RLS 中间件，
--   DB 层 RLS 纵深防御形同虚设。盘点 5432 现网 gis schema：
--     - 20 张含 tenant_id 基表已 RLS+FORCE+策略（rls_tenant_isolation）
--     - geofences / track_positions 无 tenant_id 列（设备/全局维度，不适用租户策略）
--   本迁移对 gis schema 全部“含 tenant_id 列的基表”幂等补齐：
--     ENABLE ROW LEVEL SECURITY + FORCE + rls_tenant_isolation 策略（缺失才建）。
--
-- 策略语义（与 20261003000001_u5_finance_rls_enable.sql、
--   scripts/db/rls-policy-unify.sql 一致）：
--   - GUC 未设置/为空（无 x-tenant-id、系统/事件/健康查询）→ 全放行（向后兼容）
--   - GUC = nil UUID（service token / 系统调用）→ 全放行
--   - tenant_id IS NULL（共享/全局行）→ 放行
--   - 否则仅放行本租户行（跨租户行对运行时角色不可见）
--
-- 幂等：
--   - ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY 重复执行无副作用
--   - 策略仅在不存在时创建（NOT EXISTS 守卫），不改动既有正确策略
--   - 不触碰视图（relkind='r' 过滤）、不触碰无 tenant_id 列的表
--   - 不修改任何已应用迁移文件
-- =============================================================

DO $$
DECLARE
    r RECORD;
    col_type text;
    expr text;
    pol_exists boolean;
BEGIN
    FOR r IN
        SELECT c.relname AS tbl
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'gis'
          AND c.relkind = 'r'                 -- 仅基表，排除视图
          AND c.relname NOT LIKE 'pg\_%'
          AND EXISTS (
              SELECT 1 FROM information_schema.columns ci
              WHERE ci.table_schema = 'gis'
                AND ci.table_name = c.relname
                AND ci.column_name = 'tenant_id'
          )
        ORDER BY c.relname
    LOOP
        -- 1) 启用 RLS（幂等：已启用则无操作）
        EXECUTE format('ALTER TABLE gis.%I ENABLE ROW LEVEL SECURITY', r.tbl);

        -- 2) FORCE：使表 owner（迁移池 superuser 之外的受限角色）同样受策略约束
        --    （与 finance U5 迁移、20260908000018 / 20260909000004 既有约定一致）
        EXECUTE format('ALTER TABLE gis.%I FORCE ROW LEVEL SECURITY', r.tbl);

        -- 3) 按 tenant_id 列类型选择比较表达式（现网 gis 全为 uuid，保留类型分支供未来兼容）
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_schema = 'gis'
          AND table_name = r.tbl
          AND column_name = 'tenant_id'
        LIMIT 1;

        IF col_type = 'uuid' THEN
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR ((tenant_id)::text = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        ELSE
            -- text / varchar 列：文本比较，无需 cast
            expr := '(COALESCE(current_setting(''app.tenant_id''::text, true), '''') = ''00000000-0000-0000-0000-000000000000'')'
                 || ' OR (current_setting(''app.tenant_id''::text, true) IS NULL)'
                 || ' OR (current_setting(''app.tenant_id''::text, true) = '''')'
                 || ' OR (tenant_id IS NULL)'
                 || ' OR (tenant_id = NULLIF(current_setting(''app.tenant_id''::text, true), ''''))';
        END IF;

        -- 4) 仅当 rls_tenant_isolation 策略缺失时创建（不覆盖既有正确策略，保证幂等）
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'gis'
              AND tablename = r.tbl
              AND policyname = 'rls_tenant_isolation'
        ) INTO pol_exists;

        IF NOT pol_exists THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON gis.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.tbl, expr, expr
            );
            RAISE NOTICE 'B5: created rls_tenant_isolation on gis.%', r.tbl;
        END IF;
    END LOOP;
END $$;
