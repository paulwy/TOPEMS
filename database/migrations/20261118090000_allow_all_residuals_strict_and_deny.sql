-- public 层 6 张 allow_all 残留表的收口（独立批；本文件只出方案，生产另行开窗）
--
-- 定性结论（2026-11-17 生产 topems_prod 只读核查 + 全仓代码扫描）：
--
--   A. 可严格化（2 张）
--      public.core_operation_logs  tenant_id uuid NOT NULL，0 行，无 NULL 租户
--                                 写入：svc/unified-core/src/modules/audit/service.rs 显式绑定 tenant_id
--      public.subscriptions        tenant_id uuid NOT NULL，0 行，无 NULL 租户
--                                 写入：svc/server/src/modules/subscription_module.rs 显式绑定 tenant_id，
--                                       且以 ON CONFLICT (tenant_id) 做幂等
--      → 无平台内置行，不需要全零归一；按严格 B 范式（USING + WITH CHECK + ENABLE/FORCE）
--
--   B. 拒绝为默认（3 张）
--      public.navigation_menu / public.pinned_apps / public.todos
--      只有 id、deleted_at 两列（骨架表），0 行；
--      全仓无任何 SQL 读写依赖：portal 侧 navigation/todos 端点返回的是内存静态数据
--      （svc/portal/src/modules/navigation.rs、todos.rs 内无 FROM/INTO 这三张表）
--      → 删除 allow_all，保持 ENABLE + FORCE，不留策略 = 全拒绝；
--        将来表结构落地后按那时确定的隔离维度（tenant_id / user_id）再补策略
--
--   C. 保持现状（1 张）
--      public.user_settings  无 tenant_id 列，按 user_id 做用户级隔离；
--      正确做法是用户维度策略，需先定 app.user_id 之类的 GUC 约定，不在本批范围。
--      本迁移不改动它（后置断言会校验其策略仍为 1 条 allow_all，证明未被误伤）。
--
-- 锁影响：A 表 4 次 ALTER（ENABLE/FORCE）+ 策略 CREATE；B 表 DROP POLICY（ACCESS EXCLUSIVE 瞬时）
--   与 ENABLE/FORCE 幂等重申。全部 0 行表，无数据 DML、无表重写。
--
-- 回滚：database/rollback/20261118090000_allow_all_residuals_strict_and_deny.rollback.sql
--       回滚恢复 A/B 共 5 张表的 public_allow_all_* 策略（与原状一致）
--
-- destructive-gate: allow
-- ticket: PLATFORM-CORPUS-20261117

-- 1. 前置断言与读数
DO $$
DECLARE
    t text;
    n_rows bigint;
    n_null bigint;
    nn text;
BEGIN
    FOREACH t IN ARRAY ARRAY['public.core_operation_logs', 'public.subscriptions'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;
        EXECUTE format('SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL) FROM %s', t)
          INTO n_rows, n_null;
        SELECT is_nullable INTO nn
          FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = split_part(t, '.', 2)
           AND column_name = 'tenant_id';
        RAISE NOTICE '迁移前 %：总行 %，NULL 租户 % 行，tenant_id nullable=%', t, n_rows, n_null, nn;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION '中止：% 现有 % 行，超出本批「0 行免回填」前提，需重新定性', t, n_rows;
        END IF;
        IF nn IS DISTINCT FROM 'NO' THEN
            RAISE EXCEPTION '中止：% 的 tenant_id 允许 NULL，需先收敛列约束', t;
        END IF;
    END LOOP;

    FOREACH t IN ARRAY ARRAY['public.navigation_menu', 'public.pinned_apps', 'public.todos'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION '前置断言失败：表 % 不存在', t;
        END IF;
        EXECUTE format('SELECT count(*) FROM %s', t) INTO n_rows;
        RAISE NOTICE '迁移前骨架表 %：总行 %', t, n_rows;
        IF n_rows <> 0 THEN
            RAISE EXCEPTION '中止：骨架表 % 已有 % 行，需重新定性后再拒绝为默认', t, n_rows;
        END IF;
    END LOOP;
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空 5 张目标表的既有策略（当前均为一条 public_allow_all_*）
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN ('core_operation_logs', 'subscriptions',
                             'navigation_menu', 'pinned_apps', 'todos')
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 4. A 类：严格 B 范式
ALTER TABLE public.core_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_operation_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.core_operation_logs
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON public.subscriptions
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 5. B 类：拒绝为默认（保持 RLS 开启，不留任何策略）
ALTER TABLE public.navigation_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menu FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_apps FORCE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos FORCE ROW LEVEL SECURITY;

-- 6. 后置断言
DO $$
DECLARE
    t text;
    n_pol int;
    v_qual text;
    v_wcheck text;
    rls boolean;
    frls boolean;
    n_settings int;
BEGIN
    -- A：一条严格策略，rls/force 均开，且无 IS NULL 放行分支
    FOREACH t IN ARRAY ARRAY['public.core_operation_logs', 'public.subscriptions'] LOOP
        SELECT count(*), max(p.qual::text), max(p.with_check::text) INTO n_pol, v_qual, v_wcheck
          FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION '后置断言失败：% 策略数 = %（期望 1）', t, n_pol;
        END IF;
        IF position('app.rls_system' IN coalesce(v_qual, '')) = 0 THEN
            RAISE EXCEPTION '后置断言失败：% 的 USING 缺少 app.rls_system 分支：%', t, v_qual;
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
    END LOOP;

    -- B：零策略，rls/force 仍开
    FOREACH t IN ARRAY ARRAY['public.navigation_menu', 'public.pinned_apps', 'public.todos'] LOOP
        SELECT count(*) INTO n_pol
          FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '后置断言失败：% 仍残留 % 条策略（期望 0）', t, n_pol;
        END IF;
        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '后置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;
    END LOOP;

    -- C：未触碰 user_settings
    SELECT count(*) INTO n_settings
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = 'user_settings';
    IF n_settings <> 1 THEN
        RAISE EXCEPTION '后置断言失败：user_settings 策略数 = %（期望保持 1 条 allow_all）', n_settings;
    END IF;
    RAISE NOTICE '后置断言通过：A 类 2 张严格、B 类 3 张全拒绝、C 类 user_settings 未改动';
END $$;
