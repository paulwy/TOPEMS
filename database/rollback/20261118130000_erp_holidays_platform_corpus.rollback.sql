-- 回滚 20261118130000_erp_holidays_platform_corpus.sql
-- 恢复 erp.holidays 原状：erp_allow_all_holidays（ALL, true/true）；
-- tenant_id 列仅当整列为空（全 NULL）且表 0 行时删除，否则保留并 RAISE NOTICE。
-- 生产零停服口径不变：本文件同样只在回滚窗口执行。

-- 1. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 2. 清空策略
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.policyname
          FROM pg_policies p
         WHERE p.schemaname = 'erp' AND p.tablename = 'holidays'
    LOOP
        EXECUTE format('DROP POLICY %I ON erp.holidays', r.policyname);
        RAISE NOTICE '已删除策略 erp.holidays.%', r.policyname;
    END LOOP;
END $$;

-- 3. 恢复原策略
CREATE POLICY erp_allow_all_holidays ON erp.holidays
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- 4. 条件删除补列：仅当表 0 行且列全 NULL
DO $$
DECLARE
    n_rows bigint;
    n_nonnull bigint;
    n_col int;
BEGIN
    SELECT count(*) INTO n_col
      FROM information_schema.columns
     WHERE table_schema = 'erp' AND table_name = 'holidays' AND column_name = 'tenant_id';

    IF n_col = 0 THEN
        RAISE NOTICE 'tenant_id 列不存在，无需删除';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*), count(*) FILTER (WHERE tenant_id IS NOT NULL) FROM erp.holidays'
       INTO n_rows, n_nonnull;

    IF n_rows = 0 AND n_nonnull = 0 THEN
        ALTER TABLE erp.holidays DROP COLUMN tenant_id;
        RAISE NOTICE '已删除 tenant_id（表 0 行，列无非空值）';
    ELSE
        RAISE NOTICE '保留 tenant_id：表 % 行、非空值 % 行，需人工确认后再删列', n_rows, n_nonnull;
    END IF;
END $$;

-- 5. 后置断言
DO $$
DECLARE
    n_pol int;
    has_allow_all boolean;
    rls boolean;
    frls boolean;
BEGIN
    SELECT count(*), bool_or(p.policyname = 'erp_allow_all_holidays')
      INTO n_pol, has_allow_all
      FROM pg_policies p
     WHERE p.schemaname = 'erp' AND p.tablename = 'holidays';

    IF n_pol <> 1 OR NOT coalesce(has_allow_all, false) THEN
        RAISE EXCEPTION '回滚断言失败：erp.holidays 策略数 = %，allow_all = %（期望 1/true）',
            n_pol, has_allow_all;
    END IF;

    SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
      FROM pg_class c WHERE c.oid = 'erp.holidays'::regclass;
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '回滚断言失败：erp.holidays 的 rls/force_rls = %/%', rls, frls;
    END IF;

    RAISE NOTICE '回滚完成：erp.holidays 恢复 erp_allow_all_holidays';
END $$;

-- 清理本迁移在账本中的登记行（幂等；按 version 精确匹配，不存在也不报错）
DELETE FROM public._sqlx_migrations WHERE version = 20261118130000;
