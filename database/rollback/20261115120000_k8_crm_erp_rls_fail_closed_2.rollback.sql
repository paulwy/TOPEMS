-- 回滚入口（K8 第二批 crm/erp 两表）
-- 仓库统一放在 database/rollback/<version>_<name>.rollback.sql，与既有迁移一致。
--
-- 回退顺序（强制）：
--   1) 先回本文件（策略恢复为 prod 快照原文，fail-open 生效）；
--   2) 再回二进制（退回到不带请求级 RLS 事务的旧版本）。
--   反序会先让旧二进制的裸池连接撞上 fail-closed 策略（读 0 / 写入 42501）。
--
-- 可空性：prod 快照（2026-11-15 只读）中两表 tenant_id 已是 NOT NULL，
--   因此回滚不改可空性——保持 NOT NULL 才是「恢复快照」。仅当前置断言发现被本迁移
--   之外的因素改成可空时才报错中止，避免静默改变生产形状。
--
-- 索引：crm.billing_records 的 idx_crm_billing_records_tenant 在收紧前已存在，保留；
--   erp.idx_erp_master_data_refs_tenant 由本次迁移新增，回滚删除。
--
-- 恢复后 pg_policies 的两条 qual/with_check 应与 prod 快照逐字一致：
--   crm：current_setting(...) IS NULL / = '' / = '00000000-…' / tenant_id IS NULL
--        / tenant_id = (NULLIF(...))::uuid
--   erp：COALESCE(current_setting(...), '') = '00000000-…' / IS NULL / = ''
--        / tenant_id IS NULL / tenant_id::text = NULLIF(...)

-- 1. crm.billing_records
DROP POLICY IF EXISTS rls_tenant_isolation ON crm.billing_records;
CREATE POLICY rls_tenant_isolation ON crm.billing_records
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

-- 2. erp.erp_master_data_refs（prod 原文为文本比较变体，勿改成 ::uuid）
DROP POLICY IF EXISTS rls_tenant_isolation ON erp.erp_master_data_refs;
CREATE POLICY rls_tenant_isolation ON erp.erp_master_data_refs
    USING (
        COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
    )
    WITH CHECK (
        COALESCE(current_setting('app.tenant_id', true), '') = '00000000-0000-0000-0000-000000000000'
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id::text = NULLIF(current_setting('app.tenant_id', true), '')
    );

-- 3. 删除本迁移新增的 tenant 索引（crm 的索引收紧前已存在，不动）
DROP INDEX IF EXISTS erp.idx_erp_master_data_refs_tenant;

-- 4. 可空性断言：prod 快照为 NOT NULL，回滚不得改变；若已漂移则报错暴露
DO $$
DECLARE
    t text;
    is_notnull boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['crm.billing_records', 'erp.erp_master_data_refs'] LOOP
        SELECT a.attnotnull
          INTO is_notnull
          FROM pg_class c
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
         WHERE c.oid = to_regclass(t);
        IF NOT is_notnull THEN
            RAISE EXCEPTION '回滚断言失败：% 的 tenant_id 已非 NOT NULL，与 prod 快照不一致', t;
        END IF;
    END LOOP;
END $$;
