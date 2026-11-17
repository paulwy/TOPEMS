-- unified-core RLS 收紧：生产前向补丁（段 B 幂等，兼容生产已收紧形态）
--
-- 背景：20261117180000 的 §2.4 前置断言要求 flow 四表 + monitor_settings 仍是
--   「含 IS NULL / 全零分支」的宽松文本；生产已于 2026-11-16 由 M-2 batch06
--   将这五表收紧为严格 B 范式，直接执行原迁移会在前置断言中止。
--   本补丁替代 20261117180000 在生产执行：段 B 允许两种输入形态（宽松或已严格），
--   其余段（A/C/D/E）与原迁移逐字一致。
--
-- 依据：docs/database/unified-core-rls-decisions-2026-11-17.md（R1 / R2 / R3 / R6-b）
--       docs/database/unified-core-rls-prod-window-runbook-2026-11-17.md §0 选项 A
--       docs/database/unified-core-rls-stage2-record-2026-11-17.md §6
--
-- 覆盖（11 张表）：
--   A. core_flow_rules / core_flow_variables / core_flow_variable_history / core_flow_delegates
--      加 ENABLE + FORCE RLS 与严格 B 范式策略
--   B. core_workflows / core_workflow_versions / core_workflow_instances / core_workflow_tasks
--      monitor_settings：删除现有 rls_tenant_isolation 并以严格文本重建
--      （不区分迁移前是宽松还是已严格，统一归一为 USING + WITH CHECK 全显式）
--   C. alerts：allow_all → 严格 B 范式
--   D. search_logs：补 ENABLE + FORCE RLS 与严格 B 范式策略
--   E. alert_rules：平台全局系统表（不补 tenant_id），读放开、写仅系统通道
--
-- 严格 B 范式：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 回填策略：不做自动归属。11 张带 tenant_id 的表，NULL 租户行必须为 0，非 0 中止。
-- 部署耦合：必须与阶段三代码（43eb4726d）及平台语料读路径（ec4aff8e8）同一窗口。
-- 锁影响：ENABLE/FORCE 取 SHARE ROW EXCLUSIVE，DROP/CREATE POLICY 取 ACCESS EXCLUSIVE，均瞬时。
--
-- 回滚：database/rollback/20261117220000_unified_core_rls_strict_prod.rollback.sql
--   段 B 回滚为「保持严格、不降级」，避免把生产 batch06 的成果重新放松；
--   A/C/D/E 恢复迁移前形态。

-- 1. 迁移会话显式走系统通道（FORCE RLS 下 owner 同样受策略约束，行数断言需全量可见）
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 2. 前置断言：目录形状 + 段 B 两种允许形态 + NULL 租户行为 0
DO $pre$
DECLARE
    t text;
    n_null bigint;
    n_pol int;
    rls boolean;
    frls boolean;
    q text;
BEGIN
    -- 2.1 表存在 + tenant_id 列存在（alert_rules 单独走 2.2）
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings', 'public.alerts', 'public.search_logs'
    ] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = split_part(t, '.', 1)
               AND table_name   = split_part(t, '.', 2)
               AND column_name  = 'tenant_id'
        ) THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 tenant_id 列，不能套 B 范式策略', t;
        END IF;
    END LOOP;

    -- 2.2 alert_rules 必须仍是「无 tenant_id 的平台全局表」
    IF to_regclass('public.alert_rules') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：表 public.alert_rules 不存在';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'alert_rules' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.alert_rules 已存在 tenant_id 列，本迁移的「平台全局系统表」口径不再成立，需重新拍板';
    END IF;

    -- 2.3 四张无 RLS 表 + search_logs：必须仍是 rls=false / force=false / 0 策略
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.search_logs'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '前置断言失败：% 已开启 RLS（rls=% / force=%），本迁移只处理未开启状态', t, rls, frls;
        END IF;
        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 已有 % 条策略（期望 0）', t, n_pol;
        END IF;
    END LOOP;

    -- 2.4 段 B 五表：rls/force=true、唯一 rls_tenant_isolation，且文本为宽松或已严格
    FOREACH t IN ARRAY ARRAY[
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 策略数 = %（期望仅 1 条 rls_tenant_isolation）', t, n_pol;
        END IF;
        SELECT qual INTO q
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF q IS NULL THEN
            RAISE EXCEPTION '前置断言失败：% 缺少 rls_tenant_isolation 策略', t;
        END IF;
        IF q LIKE '%IS NULL%' OR q LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            -- 允许：迁移前宽松形态（克隆库），本迁移将收紧
            NULL;
        ELSIF q LIKE '%app.rls_system%' THEN
            -- 允许：已严格形态（生产 batch06），本迁移将重建为 USING + WITH CHECK 全显式
            NULL;
        ELSE
            RAISE EXCEPTION '前置断言失败：% 的 rls_tenant_isolation 既不是宽松文本也不是严格 B 范式，需人工确认：%', t, q;
        END IF;
    END LOOP;

    -- 2.5 alerts / alert_rules：必须是 allow_all 单策略
    FOREACH t IN ARRAY ARRAY['public.alerts', 'public.alert_rules'] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
        IF t = 'public.alerts' THEN
            SELECT count(*) INTO n_pol FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'alerts'
               AND policyname = 'public_allow_all_alerts' AND qual = 'true';
            IF n_pol <> 1 THEN
                RAISE EXCEPTION '前置断言失败：public.alerts 的 public_allow_all_alerts 策略数 = %（期望 1 且 qual=true）', n_pol;
            END IF;
            SELECT count(*) INTO n_pol FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname <> 'public_allow_all_alerts';
            IF n_pol <> 0 THEN
                RAISE EXCEPTION '前置断言失败：public.alerts 存在 % 条额外策略，需人工确认', n_pol;
            END IF;
        ELSE
            SELECT count(*) INTO n_pol FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'alert_rules'
               AND policyname = 'public_allow_all_alert_rules' AND qual = 'true';
            IF n_pol <> 1 THEN
                RAISE EXCEPTION '前置断言失败：public.alert_rules 的 public_allow_all_alert_rules 策略数 = %（期望 1 且 qual=true）', n_pol;
            END IF;
            SELECT count(*) INTO n_pol FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'alert_rules' AND policyname <> 'public_allow_all_alert_rules';
            IF n_pol <> 0 THEN
                RAISE EXCEPTION '前置断言失败：public.alert_rules 存在 % 条额外策略，需人工确认', n_pol;
            END IF;
        END IF;
    END LOOP;

    -- 2.6 回填策略：所有带 tenant_id 的表 NULL 租户行必须为 0
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings', 'public.alerts', 'public.search_logs'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 有 % 行 NULL 租户；本迁移不做自动归属（回填策略=人工甄别后另发数据迁移），中止', t, n_null;
        END IF;
    END LOOP;
END $pre$;

-- 3. A. 四张无 RLS 表加表级 RLS + 严格 B 范式策略
ALTER TABLE public.core_flow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_flow_rules
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_flow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_variables FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_flow_variables
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_flow_variable_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_variable_history FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_flow_variable_history
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.core_flow_delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_delegates FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_flow_delegates
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 4. B. flow 四表 + monitor_settings：统一归一为严格 B 范式（USING + WITH CHECK 全显式）
DROP POLICY rls_tenant_isolation ON public.core_workflows;
CREATE POLICY rls_tenant_isolation ON public.core_workflows
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_versions;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_versions
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_instances;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_instances
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_tasks;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_tasks
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.monitor_settings;
CREATE POLICY rls_tenant_isolation ON public.monitor_settings
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 5. C. alerts：allow_all → 严格 B 范式
DROP POLICY public_allow_all_alerts ON public.alerts;
CREATE POLICY rls_tenant_isolation ON public.alerts
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 6. D. search_logs：补 RLS + 严格 B 范式
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.search_logs
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 7. E. alert_rules：平台全局系统表（不补 tenant_id）
--    读：所有身份可见；写：仅 app.rls_system='on'。拆四条命令级策略。
DROP POLICY public_allow_all_alert_rules ON public.alert_rules;
CREATE POLICY rls_alert_rules_read ON public.alert_rules
    FOR SELECT TO public
    USING (true);
CREATE POLICY rls_alert_rules_insert ON public.alert_rules
    FOR INSERT TO public
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
CREATE POLICY rls_alert_rules_update ON public.alert_rules
    FOR UPDATE TO public
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
    WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');
CREATE POLICY rls_alert_rules_delete ON public.alert_rules
    FOR DELETE TO public
    USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on');

-- 8. 后置断言：RLS/force 全开、严格策略到位、宽松分支清零、NULL 行仍为 0
DO $post$
DECLARE
    t text;
    n_null bigint;
    n_pol int;
    rls boolean;
    frls boolean;
    q text;
    w text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings', 'public.alerts', 'public.search_logs'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1，allow_all 等旧策略必须清零）', t, n_pol;
        END IF;

        SELECT qual, with_check INTO q, w
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF q IS NULL OR w IS NULL THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls_tenant_isolation 缺少 USING 或 WITH CHECK', t;
        END IF;
        IF q LIKE '%current_setting(''app.tenant_id''::text, true) IS NULL%'
           OR q LIKE '%tenant_id IS NULL%'
           OR q LIKE '%00000000-0000-0000-0000-000000000000%'
           OR q NOT LIKE '%app.rls_system%' THEN
            RAISE EXCEPTION '后置断言失败：% 的策略仍含宽松分支或缺少系统通道分支：%', t, q;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '后置断言失败：% 出现 % 行 NULL 租户（本迁移无 DML，不应变化）', t, n_null;
        END IF;
    END LOOP;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = to_regclass('public.alert_rules');
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 的 rls/force_rls = %/%（期望 true/true）', rls, frls;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules';
    IF n_pol <> 4 THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 策略数 = %（期望 4）', n_pol;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname = 'rls_alert_rules_read' AND qual = 'true';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 缺少 qual=true 的读策略';
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname IN ('rls_alert_rules_insert', 'rls_alert_rules_update', 'rls_alert_rules_delete')
       AND (COALESCE(qual, '') || COALESCE(with_check, '')) LIKE '%app.rls_system%';
    IF n_pol <> 3 THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 的写策略未被系统通道收口（命中 %/3）', n_pol;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname LIKE 'public_allow_all%';
    IF n_pol <> 0 THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 仍存在 public_allow_all 宽松策略';
    END IF;
END $post$;
