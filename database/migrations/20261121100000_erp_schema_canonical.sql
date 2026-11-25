-- 20261121100000: erp 27 张运行期表收口（W2-D2 第十五个模块）
--
-- 背景：svc/erp/src/schema_defense.rs 的 TABLE_DEFS 声明 25 张表（417 列），
-- 启动时建骨架表并逐列补列；阶段 0.5 另对 erp.asset_categories 补 name_en；
-- server erp_real_module 与独立部署 main.rs 的 default_init_db(..., true)
-- 另创建 erp.erp_master_data_refs（13 列）。
-- 除 TABLE_DEFS 25 张外，erp.asset_categories（10 列，已有独立迁移建表）与
-- erp.erp_master_data_refs（13 列，event_handlers/mod.rs 的 INSERT 活跃使用）
-- 一并固化，共 27 张。25 张 TABLE_DEFS 表与 batch1/batch2 死表清单无冲突。
-- fixed_assets.net_value/monthly_depreciation 是 GENERATED STORED 生成列，按原定义保留。
-- canonical 内显式 ADD COLUMN IF NOT EXISTS name_en，兼容历史库已建表但缺该列。
-- 以 baseline+forward 库真实形状固化：27 表 / 501 列 / 44 约束 / 17 附加索引 /
-- 25 策略 / 27 RLS，列、约束、索引、策略、RLS 五项 diff 为 0。
-- 删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；ADD COLUMN IF NOT EXISTS；
-- 约束用 pg_constraint 存在性守卫；索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。
-- 不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

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
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS erp.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_number character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100),
    brand character varying(100),
    model character varying(100),
    purchase_date timestamp with time zone,
    purchase_amount numeric(15,2),
    location character varying(255),
    responsible_id uuid,
    status character varying(50) DEFAULT 'in_use'::character varying NOT NULL,
    serial_number character varying(100),
    manufacturer character varying(200),
    rated_power numeric(10,2),
    rated_voltage numeric(10,2),
    rated_current numeric(10,2),
    specifications jsonb,
    image_url character varying(500),
    department character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    company_id uuid,
    asset_code character varying(64),
    purchase_price double precision DEFAULT 0,
    current_value double precision DEFAULT 0,
    department_id uuid,
    employee_id uuid,
    description text,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    action character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    entity_type character varying(50) NOT NULL,
    error_message text,
    ip_address character varying(255),
    organization_id uuid DEFAULT gen_random_uuid(),
    request_details jsonb,
    response_details jsonb,
    status character varying(50) NOT NULL,
    tenant_id uuid,
    user_agent text,
    user_id character varying(255),
    user_name character varying(255)
);

CREATE TABLE IF NOT EXISTS erp.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    bank_code text,
    currency text DEFAULT 'CNY'::text,
    balance numeric(20,4) DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_type character varying(20) DEFAULT 'general'::character varying NOT NULL,
    branch_name character varying(200),
    company_id uuid NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS erp.company_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    child_company_id uuid NOT NULL,
    child_company_name character varying(200),
    control_percentage numeric(10,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    effective_date date NOT NULL,
    expiry_date date,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ownership_percentage numeric(10,4) DEFAULT 0 NOT NULL,
    parent_company_id uuid NOT NULL,
    parent_company_name character varying(200),
    relation_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.consolidation_report_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    company_breakdown jsonb,
    current_period numeric(20,2) DEFAULT 0 NOT NULL,
    elimination_breakdown jsonb,
    formula text,
    item_code character varying(50),
    item_level integer DEFAULT 1 NOT NULL,
    item_name character varying(200) NOT NULL,
    line_no integer NOT NULL,
    notes text,
    prior_period numeric(20,2),
    report_id uuid NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS erp.consolidation_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    company_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    eliminated_company_count integer DEFAULT 0 NOT NULL,
    generated_at timestamp with time zone,
    generated_by uuid,
    minority_interest numeric(20,2),
    month integer,
    net_profit numeric(20,2),
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_net_profit numeric(20,2),
    period character varying(7) NOT NULL,
    published_at timestamp with time zone,
    published_by uuid,
    quarter integer,
    report_no character varying(50) NOT NULL,
    report_type character varying(50) NOT NULL,
    scope_id uuid NOT NULL,
    scope_name character varying(200),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    tenant_id uuid,
    total_assets numeric(20,2),
    total_equity numeric(20,2),
    total_liabilities numeric(20,2),
    total_profit numeric(20,2),
    total_revenue numeric(20,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    year integer NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.consolidation_scope_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    company_code character varying(50),
    company_id uuid NOT NULL,
    company_name character varying(200),
    consolidation_percentage numeric(10,4) DEFAULT 100 NOT NULL,
    control_type character varying(20) DEFAULT 'full_control'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    effective_date date,
    expiry_date date,
    is_parent boolean DEFAULT false NOT NULL,
    minority_interest numeric(20,2) DEFAULT 0 NOT NULL,
    ownership_percentage numeric(10,4) DEFAULT 0 NOT NULL,
    scope_id uuid NOT NULL,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.consolidation_scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying(50) NOT NULL,
    consolidation_method character varying(20) DEFAULT 'full'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    description text,
    name character varying(200) NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    address character varying(500),
    city character varying(100),
    code character varying(50) NOT NULL,
    contact_person character varying(100),
    contact_phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_limit numeric(15,2),
    customer_type character varying(50),
    district character varying(100),
    email text,
    industry character varying(100),
    name character varying(200) NOT NULL,
    province character varying(100),
    scale character varying(50),
    short_name character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group_company boolean DEFAULT false NOT NULL,
    group_company_id uuid
);

CREATE TABLE IF NOT EXISTS erp.dict_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    code character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dict_type_id uuid NOT NULL,
    extra_data jsonb,
    name character varying(200) NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    sort_order integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    value text
);

CREATE TABLE IF NOT EXISTS erp.dict_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    category character varying(50) NOT NULL,
    code character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    name character varying(200) NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.elimination_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    auto_elimination boolean DEFAULT true NOT NULL,
    code character varying(50) NOT NULL,
    company_pairs jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_account_codes jsonb,
    debit_account_codes jsonb,
    description text,
    direction character varying(20) DEFAULT 'both'::character varying NOT NULL,
    name character varying(200) NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    scope_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    type character varying(50) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.erp_master_data_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    archive_reason text,
    archived_at timestamp with time zone,
    archived_by uuid,
    destroy_reason text,
    destroy_scheduled_at timestamp with time zone,
    destroy_scheduled_by uuid,
    destroyed_at timestamp with time zone,
    destroyed_by uuid,
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.erp_production_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no character varying(100) NOT NULL,
    product_id uuid,
    product_name character varying(255) NOT NULL,
    product_code character varying(100),
    quantity numeric(15,2) DEFAULT 0 NOT NULL,
    completed_quantity numeric(15,2) DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    source character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    source_order_id character varying(100),
    source_order_number character varying(255),
    planned_start_date date,
    planned_end_date date,
    actual_start_date timestamp with time zone,
    actual_end_date timestamp with time zone,
    workshop_id uuid,
    workshop_name character varying(255),
    priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.fin_reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reconciliation_no character varying(50) NOT NULL,
    reconciliation_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    period character varying(20) NOT NULL,
    reference_id character varying(100),
    total_amount numeric(15,2) DEFAULT 0,
    reconciled_amount numeric(15,2) DEFAULT 0,
    discrepancy_amount numeric(15,2) DEFAULT 0,
    tenant_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS erp.financial_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    attachment_count integer DEFAULT 0,
    bookkeeper_id uuid,
    bookkeeper_name character varying(200),
    checker_id uuid,
    checker_name character varying(200),
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    maker_id uuid,
    maker_name character varying(200),
    organization_id uuid,
    period character varying(20) NOT NULL,
    project_id uuid,
    source_id character varying(100),
    source_system character varying(50),
    summary text,
    tenant_id uuid,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    voucher_date timestamp with time zone NOT NULL,
    voucher_number character varying(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.fixed_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    useful_life_months integer DEFAULT 0 NOT NULL,
    depreciation_period character varying(64) DEFAULT ''::character varying NOT NULL,
    original_value double precision DEFAULT 0 NOT NULL,
    accumulated_depreciation double precision DEFAULT 0,
    salvage_value double precision DEFAULT 0,
    expected_life integer DEFAULT 36 NOT NULL,
    asset_category character varying(100),
    asset_code character varying(50) NOT NULL,
    asset_name character varying(200) NOT NULL,
    asset_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id uuid,
    depreciation_method character varying(50) DEFAULT 'straight_line'::character varying NOT NULL,
    location character varying(200),
    purchase_date date NOT NULL,
    responsible_id uuid,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    net_value numeric(20,4) GENERATED ALWAYS AS ((original_value - accumulated_depreciation)) STORED,
    monthly_depreciation numeric(20,4) GENERATED ALWAYS AS (((original_value - salvage_value) / (expected_life)::double precision)) STORED
);

CREATE TABLE IF NOT EXISTS erp.internal_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    amount numeric(20,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    description text,
    eliminated_amount numeric(20,2) DEFAULT 0 NOT NULL,
    elimination_status character varying(20) DEFAULT 'unmatched'::character varying NOT NULL,
    elimination_voucher_id uuid,
    from_company_id uuid NOT NULL,
    from_company_name character varying(200),
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    period character varying(7) NOT NULL,
    remaining_amount numeric(20,2) DEFAULT 0 NOT NULL,
    tenant_id uuid,
    to_company_id uuid NOT NULL,
    to_company_name character varying(200),
    transaction_date date NOT NULL,
    transaction_no character varying(50) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    voucher_id uuid,
    confirmed_at timestamp with time zone,
    confirmed_by character varying(100),
    disputed_at timestamp with time zone,
    disputed_by character varying(100),
    disputed_reason text
);

CREATE TABLE IF NOT EXISTS erp.inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    material_id uuid,
    material_code character varying(64),
    material_name character varying(255) NOT NULL,
    warehouse_id uuid,
    warehouse_name character varying(255),
    location_code character varying(64),
    quantity double precision DEFAULT 0 NOT NULL,
    available_quantity double precision DEFAULT 0 NOT NULL,
    reserved_quantity double precision DEFAULT 0 NOT NULL,
    unit character varying(32),
    unit_price double precision DEFAULT 0,
    total_amount double precision DEFAULT 0,
    batch_no character varying(64),
    expire_date timestamp with time zone,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS erp.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    employee_name character varying(128) NOT NULL,
    leave_type character varying(32) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    start_half_day boolean DEFAULT false NOT NULL,
    end_half_day boolean DEFAULT false NOT NULL,
    days double precision NOT NULL,
    reason text NOT NULL,
    status character varying(16) DEFAULT 'draft'::character varying NOT NULL,
    approved_by character varying(128),
    approved_at timestamp with time zone,
    rejected_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    specification character varying(500),
    unit character varying(20) NOT NULL,
    category character varying(100),
    brand character varying(100),
    model character varying(100),
    barcode character varying(100),
    safety_stock numeric(15,2),
    unit_price numeric(15,4),
    tax_rate numeric(5,2),
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS erp.opening_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_balance numeric(20,4) DEFAULT 0,
    debit_balance numeric(20,4) DEFAULT 0,
    period character varying(6) NOT NULL,
    subject_code character varying(50) NOT NULL,
    subject_name character varying(200) NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid
);

CREATE TABLE IF NOT EXISTS erp.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no character varying(100) NOT NULL,
    supplier_id uuid,
    supplier_name character varying(255),
    order_date timestamp with time zone NOT NULL,
    delivery_date timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    discount_amount double precision DEFAULT 0 NOT NULL,
    payable_amount double precision DEFAULT 0 NOT NULL,
    remark text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS erp.sales_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_id uuid,
    customer_name character varying(200),
    delivery_date timestamp with time zone,
    discount_amount numeric(15,2),
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    order_no character varying(50) NOT NULL,
    payable_amount numeric(15,2),
    remark text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    tax_amount numeric(15,2),
    tenant_id uuid,
    total_amount numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    address character varying(500),
    city character varying(100),
    code character varying(50) NOT NULL,
    contact_person character varying(100),
    contact_phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    district character varying(100),
    email text,
    industry character varying(100),
    name character varying(200) NOT NULL,
    province character varying(100),
    qualification_level character varying(50),
    short_name character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    supplier_type character varying(50),
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_group_company boolean DEFAULT false NOT NULL,
    group_company_id uuid
);

CREATE TABLE IF NOT EXISTS erp.voucher_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    line_number integer NOT NULL,
    subject_code character varying(50) NOT NULL,
    subject_name character varying(200),
    summary text,
    debit_amount numeric(18,4) DEFAULT 0 NOT NULL,
    credit_amount numeric(18,4) DEFAULT 0 NOT NULL,
    quantity numeric(15,4),
    unit character varying(50),
    price numeric(15,4),
    department_id uuid,
    project_id uuid,
    contract_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_asset_categories_parent_id ON erp.asset_categories USING btree (parent_id);
CREATE INDEX IF NOT EXISTS idx_asset_categories_status ON erp.asset_categories USING btree (status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON erp.bank_accounts USING btree (is_default);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON erp.bank_accounts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_customers_group_company ON erp.customers USING btree (tenant_id, group_company_id) WHERE (group_company_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_dict_items_tenant_id ON erp.dict_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_dict_types_tenant_id ON erp.dict_types USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS erp_master_data_refs_domain_idx ON erp.erp_master_data_refs USING btree (domain);
CREATE INDEX IF NOT EXISTS idx_erp_master_data_refs_tenant ON erp.erp_master_data_refs USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_voucher_tenant_period_no ON erp.financial_vouchers USING btree (tenant_id, period, voucher_number) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_internal_transactions_tenant_period_pair ON erp.internal_transactions USING btree (tenant_id, period, from_company_id, to_company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_material_id ON erp.inventory USING btree (material_id);
CREATE UNIQUE INDEX IF NOT EXISTS materials_code_key ON erp.materials USING btree (code);
CREATE INDEX IF NOT EXISTS idx_opening_balances_account ON erp.opening_balances USING btree (tenant_id, company_id, account_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_tenant_company ON erp.opening_balances USING btree (tenant_id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_opening_balance_company_period_subject ON erp.opening_balances USING btree (tenant_id, company_id, subject_code, period);
CREATE INDEX IF NOT EXISTS idx_suppliers_group_company ON erp.suppliers USING btree (tenant_id, group_company_id) WHERE (group_company_id IS NOT NULL);
ALTER TABLE erp.asset_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.asset_categories'::regclass AND contype='p') THEN
        ALTER TABLE erp.asset_categories ADD CONSTRAINT "asset_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.assets'::regclass AND contype='p') THEN
        ALTER TABLE erp.assets ADD CONSTRAINT "assets_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.audit_logs'::regclass AND contype='p') THEN
        ALTER TABLE erp.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.bank_accounts'::regclass AND contype='p') THEN
        ALTER TABLE erp.bank_accounts ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.company_relations'::regclass AND contype='p') THEN
        ALTER TABLE erp.company_relations ADD CONSTRAINT "company_relations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.consolidation_report_lines'::regclass AND contype='p') THEN
        ALTER TABLE erp.consolidation_report_lines ADD CONSTRAINT "consolidation_report_lines_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.consolidation_reports'::regclass AND contype='p') THEN
        ALTER TABLE erp.consolidation_reports ADD CONSTRAINT "consolidation_reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.consolidation_scope_companies'::regclass AND contype='p') THEN
        ALTER TABLE erp.consolidation_scope_companies ADD CONSTRAINT "consolidation_scope_companies_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.consolidation_scopes'::regclass AND contype='p') THEN
        ALTER TABLE erp.consolidation_scopes ADD CONSTRAINT "consolidation_scopes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.customers'::regclass AND contype='p') THEN
        ALTER TABLE erp.customers ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.dict_items'::regclass AND contype='p') THEN
        ALTER TABLE erp.dict_items ADD CONSTRAINT "dict_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.dict_types'::regclass AND contype='p') THEN
        ALTER TABLE erp.dict_types ADD CONSTRAINT "dict_types_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.elimination_rules'::regclass AND contype='p') THEN
        ALTER TABLE erp.elimination_rules ADD CONSTRAINT "elimination_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.erp_master_data_refs'::regclass AND contype='p') THEN
        ALTER TABLE erp.erp_master_data_refs ADD CONSTRAINT "erp_master_data_refs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.erp_production_orders'::regclass AND contype='p') THEN
        ALTER TABLE erp.erp_production_orders ADD CONSTRAINT "erp_production_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.fin_reconciliations'::regclass AND contype='p') THEN
        ALTER TABLE erp.fin_reconciliations ADD CONSTRAINT "fin_reconciliations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.financial_vouchers'::regclass AND contype='p') THEN
        ALTER TABLE erp.financial_vouchers ADD CONSTRAINT "financial_vouchers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.fixed_assets'::regclass AND contype='p') THEN
        ALTER TABLE erp.fixed_assets ADD CONSTRAINT "fixed_assets_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.internal_transactions'::regclass AND contype='p') THEN
        ALTER TABLE erp.internal_transactions ADD CONSTRAINT "internal_transactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.inventory'::regclass AND contype='p') THEN
        ALTER TABLE erp.inventory ADD CONSTRAINT "inventory_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.leave_requests'::regclass AND contype='p') THEN
        ALTER TABLE erp.leave_requests ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.materials'::regclass AND contype='p') THEN
        ALTER TABLE erp.materials ADD CONSTRAINT "materials_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.opening_balances'::regclass AND contype='p') THEN
        ALTER TABLE erp.opening_balances ADD CONSTRAINT "opening_balances_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.purchase_orders'::regclass AND contype='p') THEN
        ALTER TABLE erp.purchase_orders ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.sales_orders'::regclass AND contype='p') THEN
        ALTER TABLE erp.sales_orders ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.suppliers'::regclass AND contype='p') THEN
        ALTER TABLE erp.suppliers ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.voucher_items'::regclass AND contype='p') THEN
        ALTER TABLE erp.voucher_items ADD CONSTRAINT "voucher_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.asset_categories'::regclass AND conname='asset_categories_code_key') THEN
        ALTER TABLE erp.asset_categories ADD CONSTRAINT "asset_categories_code_key" UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.erp_master_data_refs'::regclass AND conname='erp_master_data_refs_master_data_id_key') THEN
        ALTER TABLE erp.erp_master_data_refs ADD CONSTRAINT "erp_master_data_refs_master_data_id_key" UNIQUE (master_data_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.internal_transactions'::regclass AND conname='uq_internal_transactions_tenant_no') THEN
        ALTER TABLE erp.internal_transactions ADD CONSTRAINT "uq_internal_transactions_tenant_no" UNIQUE (tenant_id, transaction_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.materials'::regclass AND conname='materials_tenant_id_code_key') THEN
        ALTER TABLE erp.materials ADD CONSTRAINT "materials_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.purchase_orders'::regclass AND conname='purchase_orders_tenant_id_order_no_key') THEN
        ALTER TABLE erp.purchase_orders ADD CONSTRAINT "purchase_orders_tenant_id_order_no_key" UNIQUE (tenant_id, order_no);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.suppliers'::regclass AND conname='suppliers_tenant_id_code_key') THEN
        ALTER TABLE erp.suppliers ADD CONSTRAINT "suppliers_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.customers'::regclass AND conname='ck_customers_group_company_consistency') THEN
        ALTER TABLE erp.customers ADD CONSTRAINT "ck_customers_group_company_consistency" CHECK (((NOT is_group_company) OR (group_company_id IS NOT NULL)));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.erp_master_data_refs'::regclass AND conname='ck_erp_master_data_refs_status_standard') THEN
        ALTER TABLE erp.erp_master_data_refs ADD CONSTRAINT "ck_erp_master_data_refs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,pending_destruction,destroyed}'::text[]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.internal_transactions'::regclass AND conname='ck_internal_transactions_amount_conservation') THEN
        ALTER TABLE erp.internal_transactions ADD CONSTRAINT "ck_internal_transactions_amount_conservation" CHECK (((eliminated_amount >= (0)::numeric) AND (remaining_amount >= (0)::numeric) AND (remaining_amount = (amount - eliminated_amount))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.internal_transactions'::regclass AND conname='ck_internal_transactions_elimination_status') THEN
        ALTER TABLE erp.internal_transactions ADD CONSTRAINT "ck_internal_transactions_elimination_status" CHECK (((elimination_status)::text = ANY (ARRAY[('unmatched'::character varying)::text, ('confirmed'::character varying)::text, ('eliminated'::character varying)::text, ('disputed'::character varying)::text])));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.suppliers'::regclass AND conname='ck_suppliers_group_company_consistency') THEN
        ALTER TABLE erp.suppliers ADD CONSTRAINT "ck_suppliers_group_company_consistency" CHECK (((NOT is_group_company) OR (group_company_id IS NOT NULL)));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.asset_categories'::regclass AND conname='asset_categories_parent_id_fkey') THEN
        ALTER TABLE erp.asset_categories ADD CONSTRAINT "asset_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES erp.asset_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.company_relations'::regclass AND conname='fk_company_relations_child_company') THEN
        ALTER TABLE erp.company_relations ADD CONSTRAINT "fk_company_relations_child_company" FOREIGN KEY (tenant_id, child_company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.company_relations'::regclass AND conname='fk_company_relations_parent_company') THEN
        ALTER TABLE erp.company_relations ADD CONSTRAINT "fk_company_relations_parent_company" FOREIGN KEY (tenant_id, parent_company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.consolidation_scope_companies'::regclass AND conname='fk_scope_companies_company') THEN
        ALTER TABLE erp.consolidation_scope_companies ADD CONSTRAINT "fk_scope_companies_company" FOREIGN KEY (tenant_id, company_id) REFERENCES hrm.companies(tenant_id, id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.customers'::regclass AND conname='fk_customers_group_company') THEN
        ALTER TABLE erp.customers ADD CONSTRAINT "fk_customers_group_company" FOREIGN KEY (group_company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='erp.suppliers'::regclass AND conname='fk_suppliers_group_company') THEN
        ALTER TABLE erp.suppliers ADD CONSTRAINT "fk_suppliers_group_company" FOREIGN KEY (group_company_id) REFERENCES hrm.companies(id) ON DELETE SET NULL;
    END IF;
END $$;


ALTER TABLE erp.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.assets FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.bank_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.company_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.company_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_report_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scope_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scope_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.consolidation_scopes FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.dict_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.dict_items FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.dict_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.dict_types FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.elimination_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.erp_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.erp_master_data_refs FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.erp_production_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.fin_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.fin_reconciliations FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.financial_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.financial_vouchers FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.fixed_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.internal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.internal_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.leave_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.materials FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.opening_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.suppliers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.assets;
CREATE POLICY "rls_tenant_isolation" ON erp.assets AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON erp.audit_logs AS PERMISSIVE FOR ALL USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)) WITH CHECK ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.bank_accounts;
CREATE POLICY "rls_tenant_isolation" ON erp.bank_accounts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.company_relations;
CREATE POLICY "rls_tenant_isolation" ON erp.company_relations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.consolidation_report_lines;
CREATE POLICY "rls_tenant_isolation" ON erp.consolidation_report_lines AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.consolidation_reports;
CREATE POLICY "rls_tenant_isolation" ON erp.consolidation_reports AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.consolidation_scope_companies;
CREATE POLICY "rls_tenant_isolation" ON erp.consolidation_scope_companies AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.consolidation_scopes;
CREATE POLICY "rls_tenant_isolation" ON erp.consolidation_scopes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.customers;
CREATE POLICY "rls_tenant_isolation" ON erp.customers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.dict_items;
CREATE POLICY "rls_tenant_isolation" ON erp.dict_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.dict_types;
CREATE POLICY "rls_tenant_isolation" ON erp.dict_types AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.elimination_rules;
CREATE POLICY "rls_tenant_isolation" ON erp.elimination_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.erp_master_data_refs;
CREATE POLICY "rls_tenant_isolation" ON erp.erp_master_data_refs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.erp_production_orders;
CREATE POLICY "rls_tenant_isolation" ON erp.erp_production_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.fin_reconciliations;
CREATE POLICY "rls_tenant_isolation" ON erp.fin_reconciliations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.financial_vouchers;
CREATE POLICY "rls_tenant_isolation" ON erp.financial_vouchers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.fixed_assets;
CREATE POLICY "rls_tenant_isolation" ON erp.fixed_assets AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.internal_transactions;
CREATE POLICY "rls_tenant_isolation" ON erp.internal_transactions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.inventory;
CREATE POLICY "rls_tenant_isolation" ON erp.inventory AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.leave_requests;
CREATE POLICY "rls_tenant_isolation" ON erp.leave_requests AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.materials;
CREATE POLICY "rls_tenant_isolation" ON erp.materials AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.opening_balances;
CREATE POLICY "rls_tenant_isolation" ON erp.opening_balances AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.purchase_orders;
CREATE POLICY "rls_tenant_isolation" ON erp.purchase_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.sales_orders;
CREATE POLICY "rls_tenant_isolation" ON erp.sales_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON erp.suppliers;
CREATE POLICY "rls_tenant_isolation" ON erp.suppliers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
