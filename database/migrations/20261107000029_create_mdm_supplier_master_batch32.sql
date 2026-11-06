-- [batch32] 供应商主数据权威表 master_data.mdm_suppliers（建表）
--
-- 用途：供应商主数据权威源表，承接 scm.suppliers 与 srm.suppliers 两源并集。
--       本批只建表 + 导入（见 20261107000030），写入侧（scm/srm 双写、
--       反向同步、事务回写）暂不动，留待后续双写专项。
--
-- 设计要点：
--   * 字段取两源业务必要列并集；新增溯源列 source_system / source_id，
--     记录来源（scm / srm）与原表主键，便于后续对账与双写。
--   * 唯一约束 (supplier_no, tenant_id) —— 同一租户内供应商编号唯一。
--   * RLS：与同 schema 其他 mdm_* 表一致，ENABLE + FORCE ROW LEVEL SECURITY，
--     策略表达式完全照抄 mdm_assets_tenant_policy（含未设置/空串/全零超管
--     放行分支），不自创表达式。
--   * 授权：GRANT SELECT, INSERT, UPDATE, DELETE ON master_data.mdm_suppliers
--     TO topems_app（与同 schema 其他 mdm 表一致；topems_app 同时为表 owner，
--     此处显式授予，保证权限语义清晰、幂等可重复执行）。
--   * 索引：supplier_no、lower(name)（搜索）、tenant_id、deleted_at。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
--       策略用 DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_policies ...) THEN ...
--       整段 BEGIN; COMMIT;。
--
-- ROLLBACK（如需回滚建表，在 psql 中执行）：
--   BEGIN;
--   DROP TABLE IF EXISTS master_data.mdm_suppliers;
--   COMMIT;
--   （注意：这会连同 0030 导入的 287 行数据一起删除；如需保留数据，
--     先 \copy master_data.mdm_suppliers TO ... CSV HEADER 备份。）

BEGIN;

-- 1) 建表（两源业务必要字段并集 + 溯源列）
CREATE TABLE IF NOT EXISTS master_data.mdm_suppliers (
    id             uuid         NOT NULL DEFAULT gen_random_uuid(),
    supplier_no    varchar      NOT NULL,
    name           varchar      NOT NULL,
    legal_name     varchar      NULL,
    category       varchar      NULL,
    status         varchar      NOT NULL,
    tax_id         varchar      NULL,
    address        varchar      NULL,
    contact_person varchar      NULL,
    phone          text         NULL,
    email          text         NULL,
    website        varchar      NULL,
    credit_rating  varchar      NULL,
    risk_level     varchar      NULL,
    bank_name      varchar      NULL,
    bank_account   varchar      NULL,
    remarks        text         NULL,
    name_en        varchar      NULL,
    lead_time_days int          NULL,
    tenant_id      uuid         NULL,
    source_system  varchar      NULL,   -- 来源：'scm' / 'srm'
    source_id      uuid         NULL,   -- 原表主键（scm.suppliers.id / srm.suppliers.id）
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    deleted_at     timestamptz  NULL,
    CONSTRAINT mdm_suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT mdm_suppliers_supplier_no_tenant_key UNIQUE (supplier_no, tenant_id)
);

COMMENT ON TABLE  master_data.mdm_suppliers IS '供应商主数据权威源（batch32，承接 scm/srm 并集，写入侧暂不动）';
COMMENT ON COLUMN master_data.mdm_suppliers.source_system IS '来源系统：scm / srm';
COMMENT ON COLUMN master_data.mdm_suppliers.source_id     IS '原表主键 id（scm.suppliers.id 或 srm.suppliers.id）';

-- 2) RLS：ENABLE + FORCE（与同 schema mdm_* 表一致，必须 FORCE）
ALTER TABLE master_data.mdm_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_suppliers FORCE ROW LEVEL SECURITY;

-- 3) 租户隔离策略（表达式完全照抄 mdm_assets_tenant_policy，含放行分支）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'master_data'
          AND tablename  = 'mdm_suppliers'
          AND policyname = 'tenant_isolation_mdm_suppliers'
    ) THEN
        CREATE POLICY tenant_isolation_mdm_suppliers ON master_data.mdm_suppliers
            AS PERMISSIVE
            FOR ALL
            TO public
            USING (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            )
            WITH CHECK (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            );
    END IF;
END
$$;

-- 4) 授权（与同 schema 其他 mdm 表一致）
GRANT SELECT, INSERT, UPDATE, DELETE ON master_data.mdm_suppliers TO topems_app;

-- 5) 索引
CREATE INDEX IF NOT EXISTS mdm_suppliers_supplier_no_idx     ON master_data.mdm_suppliers (supplier_no);
CREATE INDEX IF NOT EXISTS mdm_suppliers_name_lower_idx      ON master_data.mdm_suppliers (lower(name));
CREATE INDEX IF NOT EXISTS mdm_suppliers_tenant_id_idx      ON master_data.mdm_suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS mdm_suppliers_deleted_at_idx      ON master_data.mdm_suppliers (deleted_at);

COMMIT;
