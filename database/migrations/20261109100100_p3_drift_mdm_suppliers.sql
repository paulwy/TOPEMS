-- P3 A 级止血 / 2026-11-09：补建 master_data.mdm_suppliers（生产缺失）
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A1）：
--   迁移 20261107000029 声明建的 mdm_suppliers 从未进入生产账本（锚点跳跃，
--   version <= anchor 的未入账迁移永久无法应用），导致 master-data 供应商 CRUD、
--   erp 全局搜索、scm/srm 反向同步一律 500（relation does not exist）。
--
-- 本迁移只做 DDL（建表/索引/RLS/策略/授权/owner 归一）；不做种子、不做回填、
-- 不做去重、不动 scm/srm 既有数据。
--
-- Idempotency：
--   - CREATE TABLE / INDEX IF NOT EXISTS；策略 DO $$ IF NOT EXISTS；GRANT 幂等；
--   - owner 归一对已归位环境为 no-op。
--
-- owner 归一（必须）：
--   生产 pg_default_acl 为空、且服务运行角色 topems_prod 不是迁移执行账号，
--   仅 GRANT topems_app 在生产无效（topems_app 不可登录、服务用的是 topems_prod）。
--   故复用 20261108131000 的探测写法：表建好后把 owner 归给 topems_prod
--   （不存在则退回 topems_app），再补 GRANT topems_app。
--
-- ROLLBACK（生产，仅当确认表内无业务数据）：
--   DROP TABLE IF EXISTS master_data.mdm_suppliers;

BEGIN;

-- 1) 建表（字段集合与 20261107000029 一致）
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
    source_system  varchar      NULL,
    source_id      uuid         NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    deleted_at     timestamptz  NULL,
    CONSTRAINT mdm_suppliers_pkey PRIMARY KEY (id),
    CONSTRAINT mdm_suppliers_supplier_no_tenant_key UNIQUE (supplier_no, tenant_id)
);

COMMENT ON TABLE  master_data.mdm_suppliers IS '供应商主数据权威源（batch32，承接 scm/srm 并集）';
COMMENT ON COLUMN master_data.mdm_suppliers.source_system IS '来源系统：mdm / scm / srm';
COMMENT ON COLUMN master_data.mdm_suppliers.source_id     IS '原表主键 id（scm.suppliers.id 或 srm.suppliers.id）';

-- 2) RLS：ENABLE + FORCE（与同 schema mdm_* 表一致）
ALTER TABLE master_data.mdm_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_suppliers FORCE ROW LEVEL SECURITY;

-- 3) 租户隔离策略（表达式与 20261107000029 完全一致）
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

-- 4) 授权 + owner 归一（见文件头说明）
DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('master_data.mdm_suppliers') IS NULL THEN
        RAISE NOTICE 'P3 止血：mdm_suppliers 不存在，跳过授权/owner 归一';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P3 止血：未找到服务运行角色（topems_prod/topems_app），跳过 owner 归一';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE master_data.mdm_suppliers OWNER TO %I', svc_role);
    RAISE NOTICE 'P3 止血：mdm_suppliers owner -> %', svc_role;

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON master_data.mdm_suppliers TO topems_app;
    END IF;
END $$;

-- 5) 索引
CREATE INDEX IF NOT EXISTS mdm_suppliers_supplier_no_idx ON master_data.mdm_suppliers (supplier_no);
CREATE INDEX IF NOT EXISTS mdm_suppliers_name_lower_idx  ON master_data.mdm_suppliers (lower(name));
CREATE INDEX IF NOT EXISTS mdm_suppliers_tenant_id_idx   ON master_data.mdm_suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS mdm_suppliers_deleted_at_idx  ON master_data.mdm_suppliers (deleted_at);

COMMIT;
