-- K8 第二批：crm.billing_records / erp.erp_master_data_refs 由 fail-open 收紧为 fail-closed
--
-- 目标谓词（USING 与 WITH CHECK 相同，与 20261114200000（22 张 mes）/ 20261114202000（8 张
-- erp/crm/portal）/ 20261115110000（3 张 tms）同形）：
--   COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
--   OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 现状（prod 只读实测 2026-11-15，见 /tmp/k8b/prod_inspect_20261115.txt）：
--   * crm.billing_records：1 条 rls_tenant_isolation（PERMISSIVE/ALL），谓词含 4 处放行分支
--     （app.tenant_id IS NULL / = '' / = nil UUID / tenant_id IS NULL）；0 行、0 行 NULL 租户；
--     tenant_id 已 NOT NULL；已有 idx_crm_billing_records_tenant。
--   * erp.erp_master_data_refs：1 条 rls_tenant_isolation，谓词为文本比较变体
--     （COALESCE(...) = nil UUID / IS NULL / = '' / tenant_id IS NULL / tenant_id::text = GUC）；
--     0 行、0 行 NULL 租户；tenant_id 已 NOT NULL；无租户索引 → 本迁移补
--     idx_erp_master_data_refs_tenant。
--
-- 前置条件（代码侧，已随二进制 99f00cef…c794af8a4c 上线，提交 936f7e888）：
--   crm 看板聚合、OpportunityWon 建应收、PaymentReceived 核销、erp MDM UPSERT 四处裸池路径
--   已改走请求级 RLS 事务（Db::scope_with / txn_arc），不再依赖无 GUC 连接读全表。
--   旧二进制不设 GUC 时会被本策略挡住 → 必须先部署新二进制再投本迁移。
--
-- 同批附带（0 行表，瞬时）：tenant_id SET NOT NULL（幂等；prod 已是 NOT NULL）。
--
-- 回滚见 database/rollback/20261115120000_k8_crm_erp_rls_fail_closed_2.rollback.sql：
-- 恢复 prod 快照策略原文（含全部放行分支），可空性按 prod 快照保持 NOT NULL，
-- 并删除本迁移新增的 erp 租户索引。
-- 回退顺序：先回策略，再回二进制（详见 rollback 文件头）。

-- 1. 前置断言：表存在、RLS/FORCE 均为 true、无 NULL 租户行、每表恰好 1 条现有策略
DO $$
DECLARE
    t text;
    n_null bigint;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['crm.billing_records', 'erp.erp_master_data_refs'] LOOP
        SELECT c.relrowsecurity, c.relforcerowsecurity
          INTO rls, frls
          FROM pg_class c
         WHERE c.oid = to_regclass(t);

        IF rls IS NULL THEN
            RAISE EXCEPTION 'K8 前置断言失败：表不存在 %', t;
        END IF;
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 的 rls/force_rls = %/%（期望 true/true）', t, rls, frls;
        END IF;

        EXECUTE format('SELECT count(*) FROM %s WHERE tenant_id IS NULL', t) INTO n_null;
        IF n_null <> 0 THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 存量 tenant_id IS NULL = % 行，拒绝收紧与 SET NOT NULL', t, n_null;
        END IF;

        SELECT count(*) INTO n_pol
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);
        IF n_pol <> 1 THEN
            RAISE EXCEPTION 'K8 前置断言失败：% 现有策略 % 条（期望 1 条 rls_tenant_isolation）', t, n_pol;
        END IF;
    END LOOP;
END $$;

-- 2. 逐表换策略并收紧

-- 2.1 crm.billing_records
DROP POLICY IF EXISTS rls_tenant_isolation ON crm.billing_records;
DROP POLICY IF EXISTS tenant_isolation_billing_records ON crm.billing_records;
CREATE POLICY rls_tenant_isolation ON crm.billing_records
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
ALTER TABLE crm.billing_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_billing_records_tenant ON crm.billing_records (tenant_id);

-- 2.2 erp.erp_master_data_refs
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.erp_master_data_refs;
DROP POLICY IF EXISTS tenant_isolation_erp_master_data_refs ON erp.erp_master_data_refs;
CREATE POLICY rls_tenant_isolation ON erp.erp_master_data_refs
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );
ALTER TABLE erp.erp_master_data_refs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_master_data_refs_tenant ON erp.erp_master_data_refs (tenant_id);

-- 3. 后置断言：每表恰好 1 条 rls_tenant_isolation，谓词含 app.rls_system 且无 IS NULL 放行分支；
--    tenant_id NOT NULL；rls/force_rls 仍为 true；租户索引存在
DO $$
DECLARE
    ts text[] := ARRAY['crm.billing_records', 'erp.erp_master_data_refs'];
    idxs text[] := ARRAY['crm.idx_crm_billing_records_tenant', 'erp.idx_erp_master_data_refs_tenant'];
    i int;
    t text;
    n_pol int;
    bad_shape int;
    is_notnull boolean;
    rls boolean;
    frls boolean;
BEGIN
    FOR i IN 1..array_length(ts, 1) LOOP
        t := ts[i];
        SELECT count(*),
               count(*) FILTER (
                   WHERE policyname <> 'rls_tenant_isolation'
                      OR qual NOT LIKE '%app.rls_system%'
                      OR qual LIKE '%IS NULL%'
                      OR coalesce(with_check, '') NOT LIKE '%app.rls_system%'
               )
          INTO n_pol, bad_shape
          FROM pg_policies
         WHERE schemaname = split_part(t, '.', 1)
           AND tablename  = split_part(t, '.', 2);

        IF n_pol <> 1 OR bad_shape <> 0 THEN
            RAISE EXCEPTION 'K8 后置断言失败：% 策略 % 条、形状不符 % 条', t, n_pol, bad_shape;
        END IF;

        SELECT a.attnotnull, c.relrowsecurity, c.relforcerowsecurity
          INTO is_notnull, rls, frls
          FROM pg_class c
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
         WHERE c.oid = to_regclass(t);

        IF NOT is_notnull THEN
            RAISE EXCEPTION 'K8 后置断言失败：% tenant_id 仍可空', t;
        END IF;
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION 'K8 后置断言失败：% rls/force_rls = %/%', t, rls, frls;
        END IF;

        IF to_regclass(idxs[i]) IS NULL THEN
            RAISE EXCEPTION 'K8 后置断言失败：% 缺少租户索引 %', t, idxs[i];
        END IF;
    END LOOP;
END $$;
