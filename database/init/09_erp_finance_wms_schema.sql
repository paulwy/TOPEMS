-- =============================================================================
-- TOPEMS 09: ERP/Finance/WMS 域缺表补建 + 缺列对齐（幂等，可重跑）
-- 来源：topems_test 权威库 pg_dump --schema-only（erp.asset_categories /
--       finance.reconcile_orders / erp.bank_accounts / wms.stock_takes /
--       wms.transfer_orders / wms.warehouses）
-- 用途：主库缺失 erp.asset_categories（relation does not exist 500）、
--       finance.reconcile_orders（relation does not exist 500）、
--       erp.bank_accounts.status / wms.*(remarks,deleted_at,warehouse_name_en)
--       缺列（column does not exist 500）
-- 幂等：CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- ---------- 1. 缺表：erp.asset_categories ----------
CREATE TABLE IF NOT EXISTS erp.asset_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    parent_id uuid,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name_en character varying(255),
    deleted_at timestamp with time zone,
    CONSTRAINT asset_categories_code_key UNIQUE (code),
    CONSTRAINT asset_categories_pkey PRIMARY KEY (id),
    CONSTRAINT asset_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES erp.asset_categories(id) ON DELETE SET NULL
);

-- ---------- 2. 缺表：finance.reconcile_orders ----------
CREATE TABLE IF NOT EXISTS finance.reconcile_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no text NOT NULL,
    counterparty_id uuid,
    counterparty_name text,
    period text,
    start_date date,
    end_date date,
    total_amount double precision DEFAULT 0 NOT NULL,
    matched_amount double precision DEFAULT 0 NOT NULL,
    unmatched_amount double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    CONSTRAINT reconcile_orders_order_no_key UNIQUE (order_no),
    CONSTRAINT reconcile_orders_pkey PRIMARY KEY (id)
);

-- ---------- 3. 缺列：erp.bank_accounts（主库残壳仅 id+status，补全权威 16 列） ----------
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS bank_name text NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS account_number text NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS account_name text NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS bank_code text;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CNY'::text;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS balance double precision DEFAULT 0 NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS account_type character varying(20) DEFAULT 'general'::character varying NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS branch_name character varying(200);
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS company_id uuid NOT NULL;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- ---------- 3b. 缺列：erp.bank_accounts.status（首次 09 已补，保留幂等） ----------
ALTER TABLE erp.bank_accounts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text NOT NULL;

-- ---------- 4. 缺列：wms.stock_takes.remarks / deleted_at / org_id ----------
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE wms.stock_takes ADD COLUMN IF NOT EXISTS org_id uuid;

-- ---------- 5. 缺列：wms.transfer_orders.remarks / deleted_at ----------
ALTER TABLE wms.transfer_orders ADD COLUMN IF NOT EXISTS remarks text;
ALTER TABLE wms.transfer_orders ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- ---------- 6. 缺列：wms.warehouses.deleted_at / warehouse_name_en / name / org_id ----------
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS warehouse_name_en character varying(255);
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE wms.warehouses ADD COLUMN IF NOT EXISTS org_id uuid;
