-- P5 B2：svc/erp 补列（payables/receivables）+ 两表 tenant_id + RLS
--
-- 依据：docs/quality/prod-column-drift-verified-2026-11-09.md
--       docs/quality/prod-column-drift-workorder-2026-11-09.md §M2
-- 类型来源：fixtures/full_schema_contract.sql（2026-10-15 整库 dump；
--           本地 topems 库 pg_catalog 42/42 一致，核验日 2026-11-09）
--
-- NOT NULL 口径（2026-11-09 裁决）：以 DDL 为准。
--   - amount / invoice_number / paid_amount / received_amount / status /
--     created_at / updated_at 在 DDL 中为 NOT NULL → 加约束；
--     存量有 NULL 时只 NOTICE 不强行收紧（不伪造回填值）。
--   - category / supplier_name / customer_name / project_name /
--     invoice_date / tenant_id 在 DDL 中可空 → 保持可空，不加 DEFAULT 粉饰。
--
-- 两列 tenant_id（用户 2026-11-09 裁决）：
--   erp.erp_production_orders / erp.event_idempotency 生产行数 0，
--   tenant_id uuid NOT NULL，不允许 DEFAULT；同时补 ENABLE/FORCE RLS + 租户谓词。
--   RLS 谓词取严格形态 tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid：
--   GUC 未设置/为空时比较结果为 NULL（不放行），不设 nil UUID 无条件放行分支，
--   也不设默认租户兜底——与「写入方不显式提供就报错」同一口径。
--
-- 幂等：ADD COLUMN IF NOT EXISTS + 存在性守卫；索引 IF NOT EXISTS。
-- 回滚：
--   ALTER TABLE erp.erp_production_orders DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE erp.event_idempotency DROP COLUMN IF EXISTS tenant_id;

-- ---------- erp.payables ----------
ALTER TABLE erp.payables
    ADD COLUMN IF NOT EXISTS category varchar(100),
    ADD COLUMN IF NOT EXISTS supplier_name varchar(255),
    ADD COLUMN IF NOT EXISTS invoice_date timestamptz,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS invoice_number varchar(100),
    ADD COLUMN IF NOT EXISTS paid_amount numeric(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE amount IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN amount SET NOT NULL;
    ELSE
        RAISE NOTICE 'P5 B2：erp.payables.amount 存在 NULL 行，保留可空（DDL 为 NOT NULL，待业务回填）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE invoice_number IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN invoice_number SET NOT NULL;
    ELSE
        RAISE NOTICE 'P5 B2：erp.payables.invoice_number 存在 NULL 行，保留可空（DDL 为 NOT NULL，待业务回填）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE paid_amount IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN paid_amount SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE status IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN status SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE created_at IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN created_at SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.payables WHERE updated_at IS NULL) THEN
        ALTER TABLE erp.payables ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;

-- ---------- erp.receivables ----------
ALTER TABLE erp.receivables
    ADD COLUMN IF NOT EXISTS customer_name varchar(255),
    ADD COLUMN IF NOT EXISTS project_name varchar(255),
    ADD COLUMN IF NOT EXISTS invoice_date timestamptz,
    ADD COLUMN IF NOT EXISTS tenant_id uuid,
    ADD COLUMN IF NOT EXISTS amount numeric(15,2),
    ADD COLUMN IF NOT EXISTS invoice_number varchar(100),
    ADD COLUMN IF NOT EXISTS received_amount numeric(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status varchar(50) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE amount IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN amount SET NOT NULL;
    ELSE
        RAISE NOTICE 'P5 B2：erp.receivables.amount 存在 NULL 行，保留可空（DDL 为 NOT NULL，待业务回填）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE invoice_number IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN invoice_number SET NOT NULL;
    ELSE
        RAISE NOTICE 'P5 B2：erp.receivables.invoice_number 存在 NULL 行，保留可空（DDL 为 NOT NULL，待业务回填）';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE received_amount IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN received_amount SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE status IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN status SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE created_at IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN created_at SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM erp.receivables WHERE updated_at IS NULL) THEN
        ALTER TABLE erp.receivables ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;

-- ---------- B3：ON CONFLICT 依赖的唯一索引 ----------
CREATE UNIQUE INDEX IF NOT EXISTS payables_invoice_number_key
    ON erp.payables (invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS receivables_invoice_number_key
    ON erp.receivables (invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS materials_code_key
    ON erp.materials (code);

-- ---------- erp.erp_production_orders.tenant_id ----------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'erp_production_orders'
          AND column_name = 'tenant_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM erp.erp_production_orders) THEN
            RAISE EXCEPTION 'P5 B2：erp.erp_production_orders 存在存量行，tenant_id 不能无回填直接 NOT NULL';
        END IF;
        -- 生产实测 0 行；不设 DEFAULT，写入方必须显式提供租户。
        ALTER TABLE erp.erp_production_orders ADD COLUMN tenant_id uuid NOT NULL;
    ELSE
        ALTER TABLE erp.erp_production_orders ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

ALTER TABLE erp.erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.erp_production_orders FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'erp' AND tablename = 'erp_production_orders'
    ) THEN
        CREATE POLICY tenant_isolation ON erp.erp_production_orders
          USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
          WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
    END IF;
END $$;

-- ---------- erp.event_idempotency.tenant_id ----------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'event_idempotency'
          AND column_name = 'tenant_id'
    ) THEN
        IF EXISTS (SELECT 1 FROM erp.event_idempotency) THEN
            RAISE EXCEPTION 'P5 B2：erp.event_idempotency 存在存量行，tenant_id 不能无回填直接 NOT NULL';
        END IF;
        ALTER TABLE erp.event_idempotency ADD COLUMN tenant_id uuid NOT NULL;
    ELSE
        ALTER TABLE erp.event_idempotency ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

ALTER TABLE erp.event_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.event_idempotency FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'erp' AND tablename = 'event_idempotency'
    ) THEN
        CREATE POLICY tenant_isolation ON erp.event_idempotency
          USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
          WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
    END IF;
END $$;

-- ---------- owner 归一 + 服务角色 GRANT（已咬过两次的坑） ----------
DO $$
DECLARE
    svc_role text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P5 B2：未找到服务运行角色（topems_prod/topems_app），跳过 owner/GRANT';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE erp.payables OWNER TO %I', svc_role);
    EXECUTE format('ALTER TABLE erp.receivables OWNER TO %I', svc_role);
    EXECUTE format('ALTER TABLE erp.materials OWNER TO %I', svc_role);
    EXECUTE format('ALTER TABLE erp.erp_production_orders OWNER TO %I', svc_role);
    EXECUTE format('ALTER TABLE erp.event_idempotency OWNER TO %I', svc_role);

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON erp.payables TO %I', svc_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON erp.receivables TO %I', svc_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON erp.materials TO %I', svc_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON erp.erp_production_orders TO %I', svc_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON erp.event_idempotency TO %I', svc_role);

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON erp.payables TO topems_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON erp.receivables TO topems_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON erp.materials TO topems_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON erp.erp_production_orders TO topems_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON erp.event_idempotency TO topems_app;
    END IF;
END $$;
