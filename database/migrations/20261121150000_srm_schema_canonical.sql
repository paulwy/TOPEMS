-- 20261121150000: srm 16 张运行期表收口（W2-D2 第二十个模块）
--
-- 背景：svc/srm/src/schema_defense.rs 的 TABLE_DEFS 声明 16 张表，启动时由
-- schema_defense 建表/补列。live srm 另有 bidding_suppliers/biddings/quotations/
-- scoring_dimensions 等由既有迁移维护，不在 TABLE_DEFS 内，本迁移不纳入、不改动。
-- 迁移内容：16 表 / 244 列 / 125 约束 / 18 索引 / 16 策略 / 16 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS srm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    entity_type text,
    entity_id uuid,
    entity_ids jsonb,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(32),
    error_message text,
    success boolean,
    action character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by uuid,
    ip_address character varying(50),
    new_values jsonb,
    old_values jsonb,
    organization_id uuid,
    record_id uuid NOT NULL,
    table_name character varying(50) DEFAULT ''::character varying NOT NULL,
    tenant_id uuid,
    user_agent character varying(200)
);

CREATE TABLE IF NOT EXISTS srm.bid_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    deadline timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS srm.bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    price numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    valid_until timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    comparison_note text
);

CREATE TABLE IF NOT EXISTS srm.contract_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    content text,
    contract_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    tenant_id uuid,
    term_type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inquiry_no character varying(50) NOT NULL,
    title character varying(200),
    description text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    creator uuid,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    actual_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    expected_date timestamp with time zone,
    order_date timestamp with time zone DEFAULT now() NOT NULL,
    po_no character varying(50) NOT NULL,
    remarks text,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id uuid,
    total_amount numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.scm_supplier_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_code character varying(50),
    name character varying(200) NOT NULL,
    short_name character varying(200),
    contact_name character varying(100),
    contact_phone text,
    email text,
    address character varying(500),
    tax_number character varying(50),
    bank_account character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    synced_at timestamp with time zone,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.supplier_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    category_no character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    name character varying(100) NOT NULL,
    parent_id uuid,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.supplier_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    contract_no character varying(50) NOT NULL,
    contract_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    end_date timestamp with time zone,
    remarks text,
    sign_date timestamp with time zone,
    start_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    supplier_name character varying(200),
    tenant_id uuid,
    title character varying(200) NOT NULL,
    total_amount numeric(15,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.supplier_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    delivery_score numeric(5,2),
    evaluation_date timestamp with time zone NOT NULL,
    evaluation_no character varying(50) NOT NULL,
    evaluator character varying(100),
    overall_score numeric(5,2),
    price_score numeric(5,2),
    quality_score numeric(5,2),
    service_score numeric(5,2),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.supplier_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    order_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(15,2),
    last_order_date timestamp with time zone,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.supplier_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    category character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    description text,
    lead_time_days integer,
    min_order_qty integer,
    name character varying(200) NOT NULL,
    product_no character varying(50) NOT NULL,
    specifications text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id uuid,
    unit character varying(20),
    unit_price numeric(10,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS srm.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_no character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    category character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tax_id character varying(50),
    address character varying(500),
    contact_person character varying(100),
    phone text,
    email text,
    website character varying(200),
    credit_rating character varying(20),
    risk_level character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    bank_name character varying(100),
    bank_account character varying(50),
    sync_from_scm boolean DEFAULT false NOT NULL,
    scm_supplier_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS srm.tender_awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    award_no character varying(50) NOT NULL,
    tender_id uuid NOT NULL,
    bid_id uuid NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    award_price numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.tender_bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bid_no character varying(50) NOT NULL,
    tender_id uuid NOT NULL,
    supplier_id uuid,
    supplier_name character varying(200),
    bid_price numeric(15,2),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    bid_date timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    technical_score numeric(5,2),
    commercial_score numeric(5,2),
    total_score numeric(5,2),
    remarks text,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS srm.tenders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tender_no character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    type character varying(50),
    budget numeric(15,2),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_srm_supplier_performance ON srm.supplier_performance USING btree (supplier_id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_srm_suppliers_no ON srm.suppliers USING btree (supplier_no);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.audit_logs'::regclass AND conname='audit_logs_pkey') THEN
        ALTER TABLE srm.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.bid_requests'::regclass AND conname='bid_requests_pkey') THEN
        ALTER TABLE srm.bid_requests ADD CONSTRAINT "bid_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.bids'::regclass AND conname='bids_pkey') THEN
        ALTER TABLE srm.bids ADD CONSTRAINT "bids_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.contract_terms'::regclass AND conname='contract_terms_pkey') THEN
        ALTER TABLE srm.contract_terms ADD CONSTRAINT "contract_terms_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.inquiries'::regclass AND conname='inquiries_pkey') THEN
        ALTER TABLE srm.inquiries ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.purchase_orders'::regclass AND conname='purchase_orders_pkey') THEN
        ALTER TABLE srm.purchase_orders ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.scm_supplier_snapshots'::regclass AND conname='scm_supplier_snapshots_pkey') THEN
        ALTER TABLE srm.scm_supplier_snapshots ADD CONSTRAINT "scm_supplier_snapshots_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.supplier_categories'::regclass AND conname='supplier_categories_pkey') THEN
        ALTER TABLE srm.supplier_categories ADD CONSTRAINT "supplier_categories_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.supplier_contracts'::regclass AND conname='supplier_contracts_pkey') THEN
        ALTER TABLE srm.supplier_contracts ADD CONSTRAINT "supplier_contracts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.supplier_evaluations'::regclass AND conname='supplier_evaluations_pkey') THEN
        ALTER TABLE srm.supplier_evaluations ADD CONSTRAINT "supplier_evaluations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.supplier_performance'::regclass AND conname='supplier_performance_pkey') THEN
        ALTER TABLE srm.supplier_performance ADD CONSTRAINT "supplier_performance_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.supplier_products'::regclass AND conname='supplier_products_pkey') THEN
        ALTER TABLE srm.supplier_products ADD CONSTRAINT "supplier_products_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.suppliers'::regclass AND conname='suppliers_pkey') THEN
        ALTER TABLE srm.suppliers ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.tender_awards'::regclass AND conname='tender_awards_pkey') THEN
        ALTER TABLE srm.tender_awards ADD CONSTRAINT "tender_awards_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.tender_bids'::regclass AND conname='tender_bids_pkey') THEN
        ALTER TABLE srm.tender_bids ADD CONSTRAINT "tender_bids_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.tenders'::regclass AND conname='tenders_pkey') THEN
        ALTER TABLE srm.tenders ADD CONSTRAINT "tenders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='srm.inquiries'::regclass AND conname='ck_inquiries_status_standard') THEN
        ALTER TABLE srm.inquiries ADD CONSTRAINT "ck_inquiries_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY (ARRAY['draft'::text, 'published'::text, 'in_progress'::text, 'closed'::text, 'awarded'::text, 'cancelled'::text, 'active'::text, 'inactive'::text, 'archived'::text]))));
    END IF;
END $$;


ALTER TABLE srm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.bid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.bid_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.bids FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.contract_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.contract_terms FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.scm_supplier_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.scm_supplier_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_performance FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.supplier_products FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.suppliers FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.tender_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.tender_awards FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.tender_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.tender_bids FORCE ROW LEVEL SECURITY;
ALTER TABLE srm.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE srm.tenders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON srm.audit_logs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.bid_requests;
CREATE POLICY "rls_tenant_isolation" ON srm.bid_requests AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.bids;
CREATE POLICY "rls_tenant_isolation" ON srm.bids AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.contract_terms;
CREATE POLICY "rls_tenant_isolation" ON srm.contract_terms AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.inquiries;
CREATE POLICY "rls_tenant_isolation" ON srm.inquiries AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.purchase_orders;
CREATE POLICY "rls_tenant_isolation" ON srm.purchase_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.scm_supplier_snapshots;
CREATE POLICY "rls_tenant_isolation" ON srm.scm_supplier_snapshots AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.supplier_categories;
CREATE POLICY "rls_tenant_isolation" ON srm.supplier_categories AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.supplier_contracts;
CREATE POLICY "rls_tenant_isolation" ON srm.supplier_contracts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.supplier_evaluations;
CREATE POLICY "rls_tenant_isolation" ON srm.supplier_evaluations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.supplier_performance;
CREATE POLICY "rls_tenant_isolation" ON srm.supplier_performance AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.supplier_products;
CREATE POLICY "rls_tenant_isolation" ON srm.supplier_products AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.suppliers;
CREATE POLICY "rls_tenant_isolation" ON srm.suppliers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.tender_awards;
CREATE POLICY "rls_tenant_isolation" ON srm.tender_awards AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.tender_bids;
CREATE POLICY "rls_tenant_isolation" ON srm.tender_bids AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON srm.tenders;
CREATE POLICY "rls_tenant_isolation" ON srm.tenders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
