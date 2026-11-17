-- 回滚 20261117180000_unified_core_rls_strict.sql
--
-- 五步逆向：
--   1. 四张 core_flow_* 表 + search_logs：删除严格策略、NO FORCE、DISABLE RLS（恢复迁移前的无 RLS 形态）；
--   2. flow 四表 + monitor_settings：严格策略 → 迁移前的宽松文本（四个放行分支逐字恢复）；
--   3. alerts：严格策略 → public_allow_all_alerts(true/true)；
--   4. alert_rules：四条命令级策略 → public_allow_all_alert_rules(true/true)；
--   5. 断言目录形态恢复、NULL 租户行数仍为 0（up/down 均无 DML）。
--
-- 文本保真说明：
--   迁移前 core_workflows 的策略同时带 USING 与 WITH CHECK；其余 flow 三表与 monitor_settings
--   只有 USING（PostgreSQL 在 INSERT/UPDATE 时以 USING 代行 WITH CHECK，行为等价）。
--   down 统一写成 USING + WITH CHECK 同文本，行为与迁移前一致；pg_get_expr 文本可能多出
--   一个等价的 WITH CHECK 分支，属预期。
--
-- 注意：down 只恢复数据库形态。若 P3 代码已切到请求事务并显式落 tenant_id，
--   回滚后代码仍可正常工作（谓词与写入列都不依赖 RLS 是否开启）；
--   但「池直连是否会被 RLS 拦住」这一防线消失，必须同步回滚应用版本或确认不再需要该防线。

SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 1. 四张 core_flow_* + search_logs：拆策略、取消 FORCE、关闭 RLS
DROP POLICY rls_tenant_isolation ON public.core_flow_rules;
ALTER TABLE public.core_flow_rules NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_rules DISABLE ROW LEVEL SECURITY;

DROP POLICY rls_tenant_isolation ON public.core_flow_variables;
ALTER TABLE public.core_flow_variables NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_variables DISABLE ROW LEVEL SECURITY;

DROP POLICY rls_tenant_isolation ON public.core_flow_variable_history;
ALTER TABLE public.core_flow_variable_history NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_variable_history DISABLE ROW LEVEL SECURITY;

DROP POLICY rls_tenant_isolation ON public.core_flow_delegates;
ALTER TABLE public.core_flow_delegates NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.core_flow_delegates DISABLE ROW LEVEL SECURITY;

DROP POLICY rls_tenant_isolation ON public.search_logs;
ALTER TABLE public.search_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs DISABLE ROW LEVEL SECURITY;

-- 2. flow 四表 + monitor_settings：恢复宽松文本
DROP POLICY rls_tenant_isolation ON public.core_workflows;
CREATE POLICY rls_tenant_isolation ON public.core_workflows
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_versions;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_versions
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_instances;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_instances
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.core_workflow_tasks;
CREATE POLICY rls_tenant_isolation ON public.core_workflow_tasks
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

DROP POLICY rls_tenant_isolation ON public.monitor_settings;
CREATE POLICY rls_tenant_isolation ON public.monitor_settings
    FOR ALL TO public
    USING (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
        OR tenant_id IS NULL
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 3. alerts：恢复 public_allow_all_alerts
DROP POLICY rls_tenant_isolation ON public.alerts;
CREATE POLICY public_allow_all_alerts ON public.alerts
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 4. alert_rules：恢复 public_allow_all_alert_rules
DROP POLICY rls_alert_rules_read ON public.alert_rules;
DROP POLICY rls_alert_rules_insert ON public.alert_rules;
DROP POLICY rls_alert_rules_update ON public.alert_rules;
DROP POLICY rls_alert_rules_delete ON public.alert_rules;
CREATE POLICY public_allow_all_alert_rules ON public.alert_rules
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 5. 回滚断言
DO $down$
DECLARE
    t text;
    n_pol int;
    n_null bigint;
    rls boolean;
    frls boolean;
    q text;
BEGIN
    -- 5.1 五张表恢复为无 RLS / 0 策略
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.search_logs'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '回滚断言失败：% 仍开启 RLS（rls=% / force=%）', t, rls, frls;
        END IF;
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1) AND tablename = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 仍有 % 条策略（期望 0）', t, n_pol;
        END IF;
    END LOOP;

    -- 5.2 flow 四表 + monitor_settings：宽松文本已恢复
    FOREACH t IN ARRAY ARRAY[
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings'
    ] LOOP
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls_tenant_isolation 策略数 = %（期望 1）', t, n_pol;
        END IF;
        SELECT qual INTO q FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF q IS NULL OR q NOT LIKE '%IS NULL%'
           OR q NOT LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE EXCEPTION '回滚断言失败：% 未恢复为宽松文本', t;
        END IF;
    END LOOP;

    -- 5.3 alerts / alert_rules：allow_all 已恢复
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alerts'
       AND policyname = 'public_allow_all_alerts' AND qual = 'true';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚断言失败：public.alerts 未恢复 public_allow_all_alerts';
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname = 'public_allow_all_alert_rules' AND qual = 'true';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚断言失败：public.alert_rules 未恢复 public_allow_all_alert_rules';
    END IF;
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname LIKE 'rls_alert_rules_%';
    IF n_pol <> 0 THEN
        RAISE EXCEPTION '回滚断言失败：public.alert_rules 仍残留 % 条命令级策略', n_pol;
    END IF;

    -- 5.4 NULL 租户行数仍为 0（up/down 均无 DML）
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings', 'public.alerts', 'public.search_logs'
    ] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 出现 % 行 NULL 租户（不应变化）', t, n_null;
        END IF;
    END LOOP;
END $down$;
