-- 回滚：20261117220000_unified_core_rls_strict_prod.sql
--
-- 语义：
--   A. core_flow_rules / core_flow_variables / core_flow_variable_history / core_flow_delegates
--      删策略、NO FORCE、DISABLE RLS，恢复迁移前「无 RLS」形态。
--   B. core_workflows / core_workflow_versions / core_workflow_instances / core_workflow_tasks
--      / monitor_settings：**保持严格、不降级**。生产在补丁前已由 M-2 batch06 收紧，
--      降级会把既有成果重新放松；补丁对段 B 只做归一，回滚不逆向归一。
--   C. alerts：恢复 public_allow_all_alerts（true/true）。
--   D. search_logs：删策略、NO FORCE、DISABLE RLS。
--   E. alert_rules：恢复 public_allow_all_alert_rules（true/true）。
--
-- 前置：11 表 RLS/force=true；A/D 为唯一严格策略；B 为唯一严格策略；alerts/alert_rules 为补丁后形态。

SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

DO $pre$
DECLARE
    t text;
    n_pol int;
    q text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.search_logs'
    ] LOOP
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '回滚前置失败：% 的 rls_tenant_isolation 策略数 = %（期望 1，补丁未应用？）', t, n_pol;
        END IF;
    END LOOP;

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
            RAISE EXCEPTION '回滚前置失败：% 的 rls_tenant_isolation 策略数 = %（期望 1）', t, n_pol;
        END IF;
        SELECT qual INTO q FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND policyname = 'rls_tenant_isolation';
        IF q IS NULL OR q LIKE '%IS NULL%'
           OR q LIKE '%00000000-0000-0000-0000-000000000000%'
           OR q NOT LIKE '%app.rls_system%' THEN
            RAISE EXCEPTION '回滚前置失败：% 的策略不是补丁后的严格形态：%', t, q;
        END IF;
    END LOOP;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alerts' AND policyname = 'rls_tenant_isolation';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚前置失败：public.alerts 的 rls_tenant_isolation 策略数 = %（期望 1）', n_pol;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname LIKE 'rls_alert_rules_%';
    IF n_pol <> 4 THEN
        RAISE EXCEPTION '回滚前置失败：public.alert_rules 的命令级策略数 = %（期望 4）', n_pol;
    END IF;
END $pre$;

-- A. flow 四表：恢复无 RLS
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

-- B. flow 四表 + monitor_settings：保持严格，不回滚（batch06 成果）

-- C. alerts：恢复 allow_all
DROP POLICY rls_tenant_isolation ON public.alerts;
CREATE POLICY public_allow_all_alerts ON public.alerts
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- D. search_logs：恢复无 RLS
DROP POLICY rls_tenant_isolation ON public.search_logs;
ALTER TABLE public.search_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs DISABLE ROW LEVEL SECURITY;

-- E. alert_rules：恢复 allow_all
DROP POLICY rls_alert_rules_read ON public.alert_rules;
DROP POLICY rls_alert_rules_insert ON public.alert_rules;
DROP POLICY rls_alert_rules_update ON public.alert_rules;
DROP POLICY rls_alert_rules_delete ON public.alert_rules;
CREATE POLICY public_allow_all_alert_rules ON public.alert_rules
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DO $post$
DECLARE
    t text;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'public.core_flow_rules', 'public.core_flow_variables',
        'public.core_flow_variable_history', 'public.core_flow_delegates',
        'public.search_logs'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '回滚后置失败：% 仍开启 RLS（rls=% / force=%）', t, rls, frls;
        END IF;
        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '回滚后置失败：% 仍有 % 条策略', t, n_pol;
        END IF;
    END LOOP;

    FOREACH t IN ARRAY ARRAY[
        'public.core_workflows', 'public.core_workflow_versions',
        'public.core_workflow_instances', 'public.core_workflow_tasks',
        'public.monitor_settings'
    ] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '回滚后置失败：% 的严格 RLS 被意外降级（rls=% / force=%）', t, rls, frls;
        END IF;
    END LOOP;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alerts'
       AND policyname = 'public_allow_all_alerts' AND qual = 'true' AND with_check = 'true';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚后置失败：public.alerts 未恢复 public_allow_all_alerts';
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'alert_rules'
       AND policyname = 'public_allow_all_alert_rules' AND qual = 'true' AND with_check = 'true';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '回滚后置失败：public.alert_rules 未恢复 public_allow_all_alert_rules';
    END IF;
END $post$;
