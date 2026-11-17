-- bi schema 8 张无策略表补严格 RLS（analytics 服务 BI 波次；本文件只出方案，生产另行开窗）
--
-- 定性结论（2026-11-17 生产 topems_prod 与克隆库 m2_dryrun_20261116 只读核查）：
--
--   1. 运行时 schema 是 bi：analytics 服务在 scripts/schema_boundary.json 中
--      search_path = "bi, public"，代码里的未限定表名命中 bi.*；analytics.* 下的
--      同名表是影子/历史副本（生产侧已是严格 B，本次不动，避免同时改两套）。
--   2. 8 张表均无 RLS、无策略：relrowsecurity=false、relforcerowsecurity=false、
--      pg_policies 0 条；tenant_id uuid 可空、无默认值；两库实测均 0 行、无 NULL 租户行。
--   3. 读写路径全部在 svc/analytics：本波次已改为 tenant_middleware +
--      open_read_scope/open_write_scope（事务级 GUC）+ 显式 tenant_id 谓词，
--      并重新生成 .sqlx；无其他服务直接访问这 8 张表。
--   4. tenant_id 上无索引；8 张表 0 行，补 tenant_id 索引成本近似为零，避免策略谓词全表扫。
--
-- 变更：8 张表 ENABLE + FORCE RLS → 清空既有策略（当前为 0 条，幂等）→
--       重建唯一严格 B 范式策略 rls_tenant_isolation（USING + WITH CHECK）→
--       补 tenant_id 索引。不改列、不改数据、不做 NULL→全零归一。
--
-- 锁影响：8 次 ENABLE + 8 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ 8 次 CREATE POLICY
--   + 8 次 CREATE INDEX IF NOT EXISTS（0 行表，秒级）。
--
-- 回滚：database/rollback/20261118093000_bi_core_tables_rls_strict.rollback.sql
--       回滚恢复「无 RLS、无策略、无 tenant_id 索引」的原状。
--
-- 部署耦合：必须与 svc/analytics 本波次代码同窗口。只上迁移 → 旧裸池直连在 FORCE RLS
--   下读 0 行、写 42501；只上代码 → 池直连仍可绕过。
--
-- destructive-gate: allow
-- ticket: BI-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    n_col int;
    missing text[] := ARRAY[]::text[];
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'bi.analytics_comparison_analyses',
        'bi.analytics_comparison_results',
        'bi.analytics_dashboard_shares',
        'bi.analytics_dashboard_templates',
        'bi.analytics_drilldown_history',
        'bi.analytics_drilldown_paths',
        'bi.analytics_row_level_permissions',
        'bi.analytics_self_service_reports'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        SELECT count(*) INTO n_col
          FROM information_schema.columns
         WHERE table_schema = 'bi' AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';
        IF n_col <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列', t;
        END IF;

        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行', t, n_rows, n_null;
        -- 允许已有真实租户行；但 NULL 归属行在严格策略下只对系统通道可见，必须先定性，不能静默吞掉
        IF n_null <> 0 THEN
            RAISE EXCEPTION '中止：% 存在 % 行 tenant_id IS NULL，需先定性归属或回填，再做严格化', t, n_null;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'bi' AND p.tablename = split_part(t, '.', 2)) THEN
            RAISE NOTICE '迁移前 % 已有策略，将在第 3 步清空后重建', t;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空 8 张目标表的既有策略（幂等；当前均为 0 条）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'bi'
           AND p.tablename IN ('analytics_comparison_analyses', 'analytics_comparison_results',
                               'analytics_dashboard_shares', 'analytics_dashboard_templates',
                               'analytics_drilldown_history', 'analytics_drilldown_paths',
                               'analytics_row_level_permissions', 'analytics_self_service_reports')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 4. 严格 B 范式：ENABLE + FORCE + 唯一策略
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'bi.analytics_comparison_analyses',
        'bi.analytics_comparison_results',
        'bi.analytics_dashboard_shares',
        'bi.analytics_dashboard_templates',
        'bi.analytics_drilldown_history',
        'bi.analytics_drilldown_paths',
        'bi.analytics_row_level_permissions',
        'bi.analytics_self_service_reports'
    ] LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        EXECUTE format($f$
            CREATE POLICY rls_tenant_isolation ON %s
                FOR ALL TO public
                USING (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
                WITH CHECK (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                )
        $f$, t);
        RAISE NOTICE '已收紧 %', t;
    END LOOP;
END $$;

-- 5. tenant_id 索引（8 张表 0 行，秒级）
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_analyses_tenant_id ON bi.analytics_comparison_analyses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_comparison_results_tenant_id ON bi.analytics_comparison_results (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_shares_tenant_id ON bi.analytics_dashboard_shares (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_dashboard_templates_tenant_id ON bi.analytics_dashboard_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_drilldown_history_tenant_id ON bi.analytics_drilldown_history (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_drilldown_paths_tenant_id ON bi.analytics_drilldown_paths (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_row_level_permissions_tenant_id ON bi.analytics_row_level_permissions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_self_service_reports_tenant_id ON bi.analytics_self_service_reports (tenant_id);

-- 6. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    has_idx boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'bi.analytics_comparison_analyses',
        'bi.analytics_comparison_results',
        'bi.analytics_dashboard_shares',
        'bi.analytics_dashboard_templates',
        'bi.analytics_drilldown_history',
        'bi.analytics_drilldown_paths',
        'bi.analytics_row_level_permissions',
        'bi.analytics_self_service_reports'
    ] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = 'bi' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 分支：%', t, v_qual;
        END IF;
        IF position('app.tenant_id' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.tenant_id 分支：%', t, v_qual;
        END IF;
        IF position('tenant_id IS NULL' IN coalesce(v_qual, '')) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 仍含 tenant_id IS NULL 放行分支：%', t, v_qual;
        END IF;
        IF position('app.rls_system' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 WITH CHECK 缺失或未显式：%', t, v_wcheck;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM pg_indexes i
             WHERE i.schemaname = 'bi' AND i.tablename = split_part(t, '.', 2)
               AND i.indexdef LIKE '%(tenant_id)%'
        ) INTO has_idx;
        IF NOT has_idx THEN
            RAISE EXCEPTION '后置断言失败：% 缺少 tenant_id 索引', t;
        END IF;
    END LOOP;
    RAISE NOTICE '后置断言通过：bi 8 张表均已严格 B 范式（rls/force + 唯一策略 + tenant_id 索引）';
END $$;
