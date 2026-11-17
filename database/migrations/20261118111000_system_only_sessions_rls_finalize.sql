-- Batch B：登录会话两表（core_sessions / core_refresh_tokens）系统通道定型
--
-- 定性（2026-11-17/18 生产与克隆库只读核查，superuser）：
--   - public.core_sessions        106 行，全部租户 1；策略仅 rls_system_only(ALL)
--   - public.core_refresh_tokens  106 行，全部租户 1；策略仅 rls_system_only(ALL)
--   两表均不使用租户分支：登录/刷新发生在租户上下文建立之前，读写全部走
--   app.rls_system='on' 的系统通道（auth.rs 已就绪，本批不改代码）。
--   「租户查看自有会话」属新增功能，本次不做，也不预留租户读分支。
--
-- 本迁移不新增/删除数据，只把既有 system-only 策略钉成规范形式并加断言，
-- 防止后续误加 tenant 分支或退回 allow_all。锁影响：2 次 DROP/CREATE POLICY
-- + 2 次 ENABLE/FORCE（ACCESS EXCLUSIVE 瞬时）。
--
-- 关联：
--   - public.core_login_logs 读策略已严格（rls_system_only + rls_tenant_read），
--     本批不出 DDL，只等 54 行回填窗口；后置断言校验其策略未漂移。
--   - public.core_operation_logs 的严格策略由 20261118090000 落地，本批只断言；
--     平台视图改系统通道的代码改动在同一提交。
--
-- 回滚：database/rollback/20261118111000_system_only_sessions_rls_finalize.rollback.sql
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_tenant int;
    n_pol int;
    n_tenant_branch int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_sessions', 'public.core_refresh_tokens'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s', t) INTO n_rows;
        EXECUTE format(
            'SELECT count(*) FROM pg_policies WHERE schemaname = %L AND tablename = %L',
            split_part(t, '.', 1), split_part(t, '.', 2)
        ) INTO n_pol;
        EXECUTE format(
            'SELECT count(*) FROM pg_policies WHERE schemaname = %L AND tablename = %L '
            'AND (coalesce(qual, '''') LIKE ''%%app.tenant_id%%'' OR coalesce(with_check, '''') LIKE ''%%app.tenant_id%%'')',
            split_part(t, '.', 1), split_part(t, '.', 2)
        ) INTO n_tenant_branch;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);

        RAISE NOTICE '迁移前 %：行 %，策略 % 条，租户分支 % 条，rls/force = %/%',
            t, n_rows, n_pol, n_tenant_branch, rls, frls;

        IF n_pol <> 1 THEN
            RAISE EXCEPTION '前置断言失败：% 预期仅 1 条系统通道策略，实际 %', t, n_pol;
        END IF;
        IF n_tenant_branch <> 0 THEN
            RAISE EXCEPTION '前置断言失败：% 已存在租户分支，需重新定性', t;
        END IF;
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '前置断言失败：% 的 rls/force_rls = %/%', t, rls, frls;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);

-- 3. 钉成规范 system-only 策略（不加租户分支）
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_sessions', 'public.core_refresh_tokens'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS rls_system_only ON %s', t);
        EXECUTE format($f$
            CREATE POLICY rls_system_only ON %s
                FOR ALL TO public
                USING (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
                WITH CHECK (COALESCE(current_setting('app.rls_system', true), 'off') = 'on')
        $f$, t);
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
        RAISE NOTICE '已定型 %（rls_system_only，无租户分支）', t;
    END LOOP;
END $$;

-- 4. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_cmd text;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    n_login_pol int;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_sessions', 'public.core_refresh_tokens'] LOOP
        SELECT count(*), max(p.cmd), max(p.qual::text), max(p.with_check::text)
          INTO n_pol, v_cmd, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2)
           AND p.policyname = 'rls_system_only';

        IF n_pol <> 1 OR v_cmd <> 'ALL' THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls_system_only 缺失或命令不符（%, %）', t, n_pol, v_cmd;
        END IF;
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0
           OR position('app.rls_system' IN coalesce(v_wcheck, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的系统通道表达式不完整', t;
        END IF;
        IF position('app.tenant_id' IN coalesce(v_qual, '')) > 0
           OR position('app.tenant_id' IN coalesce(v_wcheck, '')) > 0 THEN
            RAISE EXCEPTION '后置断言失败：% 出现租户分支（本批明确不加）', t;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = split_part(t, '.', 1)
           AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略总数为 %（期望 1）', t, n_pol;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%', t, rls, frls;
        END IF;
    END LOOP;

    -- core_login_logs 本批不出 DDL：只校验策略未被本批意外改动
    SELECT count(*) INTO n_login_pol
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'core_login_logs';
    IF n_login_pol <> 2 THEN
        RAISE EXCEPTION '后置断言失败：public.core_login_logs 策略数 = %（期望 2，本批不应改动）', n_login_pol;
    END IF;

    RAISE NOTICE '后置断言通过：两表 system-only 定型；core_login_logs 保持 2 条策略未动';
    RAISE NOTICE '提示：public.core_operation_logs 的严格策略由 20261118090000 落地，本批只依赖不复做';
END $$;
