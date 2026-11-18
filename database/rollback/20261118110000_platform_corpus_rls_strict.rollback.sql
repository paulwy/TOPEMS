-- 回滚 20261118110000_platform_corpus_rls_strict.sql
-- 恢复 5 表原状：rls_tenant_isolation（严格 B）+ rls_global_read（SELECT 追加 tenant_id IS NULL），
-- 并把平台哨兵行回退为 NULL（8/48/16/1/1 行）。
-- 生产零停服口径不变：本文件同样只在回滚窗口执行。

-- 1. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 2. 清空 5 表策略
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname, p.tablename, p.policyname
          FROM pg_policies p
         WHERE (p.schemaname, p.tablename) IN (
             ('finance', 'core_finance_currencies'),
             ('finance', 'core_finance_report_line_map'),
             ('public', 'core_roles'),
             ('pm', 'project_type_configs'),
             ('mobile', 'sync_policies')
         )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE '已删除策略 %.%.%', r.schemaname, r.tablename, r.policyname;
    END LOOP;
END $$;

-- 3. 重建原策略（严格 B 隔离 + 全局 NULL 读）
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'finance.core_finance_currencies',
        'finance.core_finance_report_line_map',
        'public.core_roles',
        'pm.project_type_configs',
        'mobile.sync_policies'
    ] LOOP
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

        EXECUTE format($f$
            CREATE POLICY rls_global_read ON %s
                FOR SELECT TO public
                USING (
                    COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                    OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
                    OR tenant_id IS NULL
                )
        $f$, t);
        RAISE NOTICE '已恢复原策略 %', t;
    END LOOP;
END $$;

-- 4. 数据回退：哨兵 → NULL
UPDATE finance.core_finance_currencies
   SET tenant_id = NULL, updated_at = CURRENT_TIMESTAMP
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE finance.core_finance_report_line_map
   SET tenant_id = NULL, updated_at = now()
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE public.core_roles
   SET tenant_id = NULL, updated_at = now()
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE pm.project_type_configs
   SET tenant_id = NULL, updated_at = now()
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

UPDATE mobile.sync_policies
   SET tenant_id = NULL, updated_at = now()
 WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 5. 后置断言：回到基线
DO $$
DECLARE
    rec record;
    n_null bigint;
    n_zero bigint;
    n_pol int;
    has_global_read boolean;
    rls boolean;
    frls boolean;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('finance.core_finance_currencies', 8::bigint),
            ('finance.core_finance_report_line_map', 48::bigint),
            ('public.core_roles', 16::bigint),
            ('pm.project_type_configs', 1::bigint),
            ('mobile.sync_policies', 1::bigint)
        ) AS v(t, expected)
    LOOP
        EXECUTE format(
            'SELECT count(*) FILTER (WHERE tenant_id IS NULL), '
            'count(*) FILTER (WHERE tenant_id = %L::uuid) FROM %s',
            '00000000-0000-0000-0000-000000000000', rec.t
        ) INTO n_null, n_zero;
        IF n_null <> rec.expected THEN
            RAISE EXCEPTION '回滚断言失败：% NULL 行数 = %（期望 %）', rec.t, n_null, rec.expected;
        END IF;
        IF n_zero <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 仍有 % 行哨兵租户', rec.t, n_zero;
        END IF;

        SELECT count(*), bool_or(p.policyname = 'rls_global_read')
          INTO n_pol, has_global_read
          FROM pg_policies p
         WHERE p.schemaname = split_part(rec.t, '.', 1)
           AND p.tablename = split_part(rec.t, '.', 2);
        IF n_pol <> 2 OR NOT coalesce(has_global_read, false) THEN
            RAISE EXCEPTION '回滚断言失败：% 策略未复原（数量 %，global_read=%）',
                rec.t, n_pol, has_global_read;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(rec.t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls/force_rls = %/%', rec.t, rls, frls;
        END IF;
    END LOOP;
    RAISE NOTICE '回滚完成：5 表恢复 strict B + rls_global_read，哨兵已回退为 NULL';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118110000;
