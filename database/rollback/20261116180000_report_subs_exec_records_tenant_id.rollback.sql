-- 回滚：20261116180000_report_subs_exec_records_tenant_id.sql
--
-- 顺序：先恢复策略/RLS 开关（回滚业务可见性），再删索引，最后删 tenant_id 列。
-- 删列保护：仅当列内无任何非空值时才删除；有数据则保留列并 RAISE NOTICE，
--   避免把业务写入的租户信息静默丢弃（与 20261115141400 回滚口径一致）。
--
-- 注意：若已回滚本迁移但未回滚二进制，新二进制的 INSERT 会因 42703 失败；
--   回退顺序应为：先回旧二进制或停服，再执行本回滚。

-- 1. 策略与 RLS 开关
DROP POLICY IF EXISTS rls_tenant_isolation ON bi.report_subscriptions;
ALTER TABLE bi.report_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bi.report_subscriptions NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON analytics.report_execution_records;
ALTER TABLE analytics.report_execution_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.report_execution_records NO FORCE ROW LEVEL SECURITY;

-- 2. 索引
DROP INDEX IF EXISTS bi.idx_report_subscriptions_tenant_id;
DROP INDEX IF EXISTS analytics.idx_report_execution_records_tenant_id;

-- 3. 列（有非空值则保留）
DO $$
DECLARE
    t text;
    n_nonnull bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['bi.report_subscriptions', 'analytics.report_execution_records'] LOOP
        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NOT NULL', t) INTO n_nonnull;
        IF n_nonnull <> 0 THEN
            RAISE NOTICE '回滚跳过删列：% 有 % 行非空 tenant_id，保留列以免丢数据', t, n_nonnull;
        ELSE
            EXECUTE format('ALTER TABLE %s DROP COLUMN IF EXISTS tenant_id', t);
        END IF;
    END LOOP;
END $$;

-- 4. 后置断言：无策略、无索引、RLS 关闭
DO $$
DECLARE
    t text;
    rls boolean;
    frls boolean;
    n_pol int;
    n_idx int;
BEGIN
    FOREACH t IN ARRAY ARRAY['bi.report_subscriptions', 'analytics.report_execution_records'] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity
          INTO rls, frls
          FROM pg_class c
         WHERE c.oid = to_regclass(t);
        IF rls OR frls THEN
            RAISE EXCEPTION '回滚断言失败：% 的 rls/force_rls 仍为 %/%', t, rls, frls;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 仍有 % 条策略', t, n_pol;
        END IF;

        SELECT count(*) INTO n_idx
          FROM pg_indexes
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2)
           AND indexname  LIKE '%tenant_id';
        IF n_idx <> 0 THEN
            RAISE EXCEPTION '回滚断言失败：% 仍有 % 个 tenant_id 索引', t, n_idx;
        END IF;
    END LOOP;
END $$;
