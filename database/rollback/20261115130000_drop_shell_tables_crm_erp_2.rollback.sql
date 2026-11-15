-- 回滚入口：重建 20261115130000 拆除的 2 张空壳表（按 prod 只读快照逐字重建）
-- 仓库统一放在 database/rollback/<version>_<name>.rollback.sql，与既有迁移一致。
--
-- 重建形状（prod 2026-11-15 快照）：
--   3 列 id uuid NOT NULL DEFAULT gen_random_uuid() / deleted_at timestamptz / tenant_id uuid
--   （prod 列序为 id, deleted_at, tenant_id；dev 拆除前为 id, tenant_id, deleted_at，
--     列集合/类型/可空性/默认值一致，仅物理列序不同，本文件统一按 prod 列序重建）
--   pkey <table>_pkey(id)；idx_<schema>_<table>_tenant_id(tenant_id)；
--   rls ENABLE + FORCE；每表 1 条 rls_tenant_isolation（fail-closed 原文，见下）。
--   两表均无显式 ACL、无 reloptions、默认表空间。
--
-- 执行前提：无同表同名对象残留（迁移已 DROP；若库里又出现同名表，CREATE 会直接报错）。
-- 执行后请人工复核（本文件不自动设置）：
--   1) 属主：prod 快照为 topems_prod；回滚由复跑账号创建，需手工
--      ALTER TABLE <t> OWNER TO topems_prod;（dev 为 topems_app）。
--   2) 授权：prod 快照 relacl 为空（无显式 GRANT），仅靠属主与 schema 默认权限；
--      若环境改过 default privileges，请按目标环境补齐/回收。
--   3) 策略：两表恢复后各 1 条 rls_tenant_isolation（fail-closed）。若目标环境仍是旧
--      fail-open 代（或有 tenant_isolation_* 残留），多条 permissive 为 OR 关系会短路，
--      需先清理残留再使用本文件。
--   4) 数据：两表拆除时均为 0 行，本文件不恢复数据；history CSV 见
--      database/backup/batch31_*_20261107_063242.csv（header-only）。

-- ---------------------------------------------------------------
-- 1/2 crm.core_crm_customers
-- ---------------------------------------------------------------
CREATE TABLE crm.core_crm_customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);
ALTER TABLE crm.core_crm_customers ADD CONSTRAINT core_crm_customers_pkey PRIMARY KEY (id);
CREATE INDEX idx_crm_core_crm_customers_tenant_id ON crm.core_crm_customers USING btree (tenant_id);
ALTER TABLE crm.core_crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.core_crm_customers FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON crm.core_crm_customers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- ---------------------------------------------------------------
-- 2/2 erp.core_erp_suppliers
-- ---------------------------------------------------------------
CREATE TABLE erp.core_erp_suppliers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deleted_at timestamp with time zone,
    tenant_id uuid
);
ALTER TABLE erp.core_erp_suppliers ADD CONSTRAINT core_erp_suppliers_pkey PRIMARY KEY (id);
CREATE INDEX idx_erp_core_erp_suppliers_tenant_id ON erp.core_erp_suppliers USING btree (tenant_id);
ALTER TABLE erp.core_erp_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.core_erp_suppliers FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_tenant_isolation ON erp.core_erp_suppliers
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 形状自检（失败即报错，便于回滚演练实时发现偏差）
DO $shell_rollback_check$
DECLARE
    r record;
    n_cols int;
    n_pk int;
    n_idx int;
    n_pol int;
    rls boolean;
    frls boolean;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('crm.core_crm_customers', 'core_crm_customers_pkey', 'idx_crm_core_crm_customers_tenant_id'),
            ('erp.core_erp_suppliers', 'core_erp_suppliers_pkey', 'idx_erp_core_erp_suppliers_tenant_id')
        ) AS v(t, pk, idx)
    LOOP
        SELECT count(*) INTO n_cols
          FROM pg_attribute a
         WHERE a.attrelid = to_regclass(r.t) AND a.attnum > 0 AND NOT a.attisdropped;
        IF n_cols <> 3 THEN
            RAISE EXCEPTION 'ROLLBACK 自检失败：% 列数=%（期望 3）', r.t, n_cols;
        END IF;

        SELECT count(*) INTO n_pk FROM pg_constraint
         WHERE conrelid = to_regclass(r.t) AND contype = 'p' AND conname = r.pk;
        IF n_pk <> 1 THEN
            RAISE EXCEPTION 'ROLLBACK 自检失败：% 缺少主键 %', r.t, r.pk;
        END IF;

        SELECT count(*) INTO n_idx FROM pg_indexes
         WHERE (schemaname || '.' || tablename) = r.t AND indexname = r.idx;
        IF n_idx <> 1 THEN
            RAISE EXCEPTION 'ROLLBACK 自检失败：% 缺少索引 %', r.t, r.idx;
        END IF;

        SELECT count(*) INTO n_pol FROM pg_policies
         WHERE (schemaname || '.' || tablename) = r.t AND policyname = 'rls_tenant_isolation';
        IF n_pol <> 1 THEN
            RAISE EXCEPTION 'ROLLBACK 自检失败：% 策略数=%（期望 1）', r.t, n_pol;
        END IF;

        SELECT c.relrowsecurity, c.relforcerowsecurity INTO rls, frls
          FROM pg_class c WHERE c.oid = to_regclass(r.t);
        IF NOT rls OR NOT frls THEN
            RAISE EXCEPTION 'ROLLBACK 自检失败：% rls/force_rls=%/%', r.t, rls, frls;
        END IF;
    END LOOP;
    RAISE NOTICE 'ROLLBACK 自检通过：2 表 3 列 / 主键 / tenant 索引 / rls+force / 1 条策略';
END
$shell_rollback_check$;

-- 人工复核：ALTER TABLE <t> OWNER TO <prod 应用角色>;（见文件头 §执行后请人工复核）
