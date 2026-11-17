-- unified-core 租户隔离收紧：flow 四表加 RLS、flow 策略收紧、monitor/search/alerts 缺口、alert_rules 口径
--
-- 依据：docs/database/unified-core-rls-decisions-2026-11-17.md（R1 / R2 / R3 / R6-b）
-- 基线：2026-11-17 对克隆库 m2_dryrun_20261116（与生产同源）实测、2026-11-17 仓库 HEAD 取证。
--
-- 本迁移做五件事：
--   A. 四张无 RLS 表加表级 RLS + 严格 B 范式策略
--      public.core_flow_rules / core_flow_variables / core_flow_variable_history / core_flow_delegates
--   B. flow 四表 + monitor_settings 的宽松策略收紧为严格 B 范式
--      public.core_workflows / core_workflow_versions / core_workflow_instances / core_workflow_tasks
--      public.monitor_settings
--      （取证：core_workflow_tasks 与「flow 三表」策略文本逐字相同，同属 GUC 空/NULL 放行面，故一并收紧）
--   C. public.alerts 的 allow_all 策略换成严格 B 范式（tenant_id 已 NOT NULL）
--   D. public.search_logs 补 RLS + 严格 B 范式策略
--   E. public.alert_rules 归类为「平台全局系统表」：不补 tenant_id 列，
--      读对所有身份开放、写仅限系统通道（app.rls_system='on'）
--
-- 严格 B 范式策略文本（A/B/C/D 共用）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--   不再包含 GUC 未设置 / 空串 / 全零 / tenant_id IS NULL 四个放行分支。
--
-- ── 取证结论（2026-11-17，克隆库 + 代码）────────────────────────────────────
--   public.alert_rules：0 行；无 tenant_id 列；全仓无 SQL 读写（规则在
--     lib/shared-observability/src/monitoring.rs 的内存态 Arc<RwLock<Vec<AlertRule>>>）；
--     docs/database/topems-table-inventory-2026-11-14.md 已登记为「系统表，无业务租户语义，不补列」。
--     → 归类：平台全局系统表。不补列；读放开、写收口到系统通道。
--   public.search_logs：0 行；tenant_id 可空；唯一写入点 svc/search/src/handlers.rs:429
--     （scope_for_tenant + 显式绑定 claims 租户）；读取点 /suggestions 与 MCP TOOL_SUGGEST
--     分别在请求事务与 scope_read_for_tenant 中执行，均有租户上下文。
--     → 归类：租户级搜索日志。补 RLS；收紧后 suggestions 由「跨租户聚合」变为「本租户聚合」，
--       系统通道仍可全量。属对外可见结果变化，发布说明需写明。
--   public.monitor_settings / alerts：0 行；现行策略分别为宽松文本 / allow_all。
--   flow 四表：0 行；策略为四个放行分支（core_workflows 另带同文本 WITH CHECK）。
--
-- ── 回填策略（硬断言，不做自动归属）────────────────────────────────────────
--   所有带 tenant_id 的表：迁移前 NULL 租户行数必须为 0。
--   非 0 即 RAISE EXCEPTION 中止——历史 NULL 行归属哪个租户无法从数据推断，
--   必须先人工甄别并另发数据迁移；本迁移绝不把 NULL 行自动塞给任何租户或平台租户。
--
-- ── 部署耦合（重要）────────────────────────────────────────────────────────
--   本迁移必须与 P3 代码改造同一停机窗口发布：
--     - rule.rs / variable.rs / delegate.rs / monitor.rs / instance.rs / statistics.rs
--       仍在池直连的查询，在收紧后会全部返回 0 行（GUC 空 → 两边均不匹配，fail-closed）；
--     - core_flow_* 写入必须显式落 tenant_id，否则 WITH CHECK 直接拒绝（INSERT 失败）。
--   只上迁移不上代码 → flow 列表/统计/监控大面积空；只上代码不上迁移 → 代码谓词虽生效，
--   但池直连仍可绕过 RLS，无法自证。
--
-- ── 锁影响 ─────────────────────────────────────────────────────────────────
--   ALTER TABLE ENABLE/FORCE RLS 需 SHARE ROW EXCLUSIVE（瞬时）；
--   DROP/CREATE POLICY 需 ACCESS EXCLUSIVE（瞬时）。本迁移无数据读写、不改列形状。
--
-- 回滚：database/rollback/20261117180000_unified_core_rls_strict.rollback.sql

-- 1. 迁移会话显式走系统通道（FORCE RLS 下 owner 同样受策略约束，行数断言需全量可见）
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 2. 前置断言：目录形状 + 宽松策略拿到的必须是预期旧形态 + NULL 租户行为 0
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

    -- 2.2 alert_rules 必须仍是「无 tenant_id 的平台全局表」；若已加列，本迁移口径失效，必须重新拍板
    IF to_regclass('public.alert_rules') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：表 public.alert_rules 不存在';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'alert_rules' AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.alert_rules 已存在 tenant_id 列，本迁移的「平台全局系统表」口径不再成立，需重新拍板';
    END IF;

    -- 2.3 四张待加 RLS 的表 + search_logs：必须仍是 rls=false / force=false / 0 策略
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
            RAISE EXCEPTION '前置断言失败：% 已有 % 条策略（期望 0，可能已被其它迁移收紧）', t, n_pol;
        END IF;
    END LOOP;

    -- 2.4 flow 四表 + monitor_settings：必须是宽松文本 rls_tenant_isolation
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
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls_tenant_isolation 策略数 = %（期望 1）', t, n_pol;
        END IF;
        SELECT qual INTO q
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF q IS NULL OR q NOT LIKE '%IS NULL%'
           OR q NOT LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls_tenant_isolation 不是预期的宽松文本（可能已被收紧），需人工确认', t;
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

-- 4. B. flow 四表 + monitor_settings：宽松策略 → 严格 B 范式（重建，去掉四个放行分支）
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

-- 5. C. alerts：allow_all → 严格 B 范式（tenant_id NOT NULL 已满足书写条件）
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
--    读：所有身份可见（与迁移前 allow_all 的可见性一致）；
--    写：仅 app.rls_system='on'（服务身份/系统通道）。普通租户写请求会被策略拒绝。
--    拆成四条命令级策略，避免 ALL 策略里 USING=true 让 DELETE/UPDATE 也全放行。
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
    -- 8.1 11 张租户表：rls/force=true + 唯一 rls_tenant_isolation + 文本无宽松分支 + WITH CHECK 显式
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

    -- 8.2 alert_rules：读放开 + 写系统通道，四条命令级策略
    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = to_regclass('public.alert_rules');
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 的 rls/force_rls = %/%（期望 true/true）', rls, frls;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules';
    IF n_pol <> 4 THEN
        RAISE EXCEPTION '后置断言失败：public.alert_rules 策略数 = %（期望 4：select/insert/update/delete）', n_pol;
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
