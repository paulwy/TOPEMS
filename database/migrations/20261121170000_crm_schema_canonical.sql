-- 20261121170000: crm 13 张运行期表收口（W2-D2 第二十二个模块）
--
-- 背景：svc/crm/src/schema_defense.rs 的 TABLE_DEFS 声明 12 张表，启动时由
-- schema_defense 建骨架/补列。crm_master_data_refs 虽在 batch1 死表清单，
-- 但 event_handlers 仍通过 MasterDataRefService 活跃写入，且 server default_init_db(true)
-- 会重建，属活跃依赖；本迁移保留并固化，待业务评审。
-- live crm 另有 billing_records/contracts/sales_* 等由既有迁移维护，不纳入。
-- 迁移内容：13 表 / 260 列 / 92 约束 / 36 索引 / 12 策略 / 13 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE IF NOT EXISTS crm.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    action character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    entity_type character varying(50) NOT NULL,
    error_message text,
    ip_address character varying(45),
    org_id uuid,
    request_details jsonb,
    response_details jsonb,
    tenant_id uuid,
    user_agent text,
    user_id uuid,
    user_name text
);

CREATE TABLE IF NOT EXISTS crm.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    org_id uuid,
    customer_id uuid,
    first_name text NOT NULL,
    last_name text,
    email text,
    phone text,
    position text,
    notes text,
    status text DEFAULT 'active'::text,
    approval_status text DEFAULT 'none'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    address text,
    birthday date,
    created_by uuid,
    department character varying(100),
    full_name character varying(255),
    gender character varying(20),
    is_decision_maker boolean DEFAULT false,
    is_primary boolean DEFAULT false,
    mobile text,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS crm.crm_master_data_refs (
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.customer_finance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    customer_name character varying(255) DEFAULT ''::character varying NOT NULL,
    credit_limit numeric(15,2) DEFAULT 0 NOT NULL,
    credit_used numeric(15,2) DEFAULT 0 NOT NULL,
    credit_available numeric(15,2) DEFAULT 0 NOT NULL,
    credit_term_days integer DEFAULT 0 NOT NULL,
    receivable_balance numeric(15,2) DEFAULT 0 NOT NULL,
    accounts_receivable numeric(15,2) DEFAULT 0 NOT NULL,
    overdue_amount numeric(15,2) DEFAULT 0 NOT NULL,
    overdue_receivable numeric(15,2) DEFAULT 0 NOT NULL,
    avg_collection_days integer DEFAULT 0 NOT NULL,
    total_sales numeric(15,2) DEFAULT 0 NOT NULL,
    total_received numeric(15,2) DEFAULT 0 NOT NULL,
    last_transaction_date timestamp with time zone,
    payment_terms character varying(100) DEFAULT ''::character varying NOT NULL,
    risklevel character varying(20) DEFAULT 'low'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    bank_name character varying(255),
    bank_account character varying(255),
    account_name character varying(255),
    tax_number character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS crm.customer_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    order_date date NOT NULL,
    order_amount numeric(15,2) NOT NULL,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    order_no character varying(100)
);

CREATE TABLE IF NOT EXISTS crm.customer_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    tag_id uuid,
    tag text,
    tenant_id uuid,
    org_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS crm.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    org_id uuid,
    name text NOT NULL,
    customer_type text,
    industry text,
    rating text DEFAULT 'C'::text,
    region text,
    owner_id uuid,
    tags text[] DEFAULT '{}'::text[],
    code text,
    email text,
    phone text,
    website text,
    address text,
    city text,
    province text,
    country text,
    company_size text,
    employee_count integer,
    revenue numeric(15,2),
    source text,
    status text,
    approval_status text DEFAULT 'none'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    organization_id uuid,
    name_en character varying(255),
    created_by uuid,
    fax character varying(50),
    notes text,
    postal_code character varying(20),
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS crm.interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    org_id uuid,
    customer_id uuid,
    contact_id uuid,
    opportunity_id uuid,
    interaction_type text NOT NULL,
    subject text,
    content text,
    status text DEFAULT 'pending'::text,
    scheduled_at timestamp with time zone,
    follow_up_required boolean DEFAULT false,
    follow_up_date timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    interaction_time timestamp with time zone,
    type character varying(50),
    assigned_to uuid,
    attachments jsonb,
    created_by uuid,
    duration_minutes integer,
    follow_up_notes text,
    location character varying(255),
    outcome character varying(50),
    started_at timestamp with time zone,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS crm.opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    org_id uuid,
    opp_no text,
    name text NOT NULL,
    customer_id uuid,
    customer_name text,
    stage text DEFAULT 'new'::text,
    priority text,
    value numeric(15,2),
    probability integer,
    close_date timestamp with time zone,
    owner_id uuid,
    status text DEFAULT 'open'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255),
    actual_close_date date,
    assigned_to uuid,
    campaign_id uuid,
    code character varying(100),
    competitor text,
    contact_id uuid,
    created_by uuid,
    description text,
    expected_revenue numeric(15,2),
    loss_reason text,
    next_step text,
    source character varying(50),
    updated_by uuid,
    win_rate integer,
    win_reason text
);

CREATE TABLE IF NOT EXISTS crm.return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_id uuid NOT NULL,
    tenant_id uuid,
    product_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(15,2),
    total_amount numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS crm.returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_no text,
    tenant_id uuid NOT NULL,
    customer_id uuid,
    order_id uuid,
    ticket_id uuid,
    warehouse_id uuid,
    return_type text,
    reason text,
    reason_detail text,
    status text DEFAULT 'pending'::text,
    refund_amount numeric(15,2) DEFAULT 0,
    exchange_product_id uuid,
    received boolean DEFAULT false,
    created_by uuid,
    updated_by uuid,
    received_at timestamp with time zone,
    approved_at timestamp with time zone,
    completed_at timestamp with time zone,
    resolved_at timestamp with time zone,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS crm.rfm_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    recency_days integer,
    frequency integer,
    monetary numeric(15,2),
    r_score integer,
    f_score integer,
    m_score integer,
    rfm_score numeric(10,2),
    segment text,
    analyzed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS crm.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    org_id uuid,
    name text NOT NULL,
    color text DEFAULT '#8BC8EA'::text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name_en character varying(255),
    category character varying(50),
    created_by uuid,
    deleted_at timestamp with time zone,
    is_system boolean DEFAULT false,
    updated_by uuid,
    usage_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON crm.contacts USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm.contacts USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_customer_orders_customer ON crm.customer_orders USING btree (customer_id, tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON crm.customer_tags USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON crm.customer_tags USING btree (tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_customer_tags_customer_tag ON crm.customer_tags USING btree (customer_id, tag);
CREATE INDEX IF NOT EXISTS idx_crm_customers_owner ON crm.customers USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_tenant ON crm.customers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_industry ON crm.customers USING btree (tenant_id, industry);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created ON crm.interactions USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON crm.interactions USING btree (contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON crm.interactions USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_opportunity_id ON crm.interactions USING btree (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON crm.opportunities USING btree (stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_tenant ON crm.opportunities USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON crm.opportunities USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON crm.opportunities USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_stage_created ON crm.opportunities USING btree (tenant_id, stage, created_at);
CREATE INDEX IF NOT EXISTS idx_crm_return_items_return ON crm.return_items USING btree (return_id);
CREATE INDEX IF NOT EXISTS idx_crm_returns_tenant ON crm.returns USING btree (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_rfm_results_tenant ON crm.rfm_results USING btree (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tags_tenant ON crm.tags USING btree (tenant_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.audit_logs'::regclass AND conname='audit_logs_pkey') THEN
        ALTER TABLE crm.audit_logs ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.contacts'::regclass AND conname='contacts_pkey') THEN
        ALTER TABLE crm.contacts ADD CONSTRAINT "contacts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.crm_master_data_refs'::regclass AND conname='crm_master_data_refs_pkey') THEN
        ALTER TABLE crm.crm_master_data_refs ADD CONSTRAINT "crm_master_data_refs_pkey" PRIMARY KEY (master_data_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.customer_finance'::regclass AND conname='customer_finance_pkey') THEN
        ALTER TABLE crm.customer_finance ADD CONSTRAINT "customer_finance_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.customer_orders'::regclass AND conname='customer_orders_pkey') THEN
        ALTER TABLE crm.customer_orders ADD CONSTRAINT "customer_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.customer_tags'::regclass AND conname='customer_tags_pkey') THEN
        ALTER TABLE crm.customer_tags ADD CONSTRAINT "customer_tags_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.customers'::regclass AND conname='customers_pkey') THEN
        ALTER TABLE crm.customers ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.interactions'::regclass AND conname='interactions_pkey') THEN
        ALTER TABLE crm.interactions ADD CONSTRAINT "interactions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.opportunities'::regclass AND conname='opportunities_pkey') THEN
        ALTER TABLE crm.opportunities ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.return_items'::regclass AND conname='return_items_pkey') THEN
        ALTER TABLE crm.return_items ADD CONSTRAINT "return_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.returns'::regclass AND conname='returns_pkey') THEN
        ALTER TABLE crm.returns ADD CONSTRAINT "returns_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.rfm_results'::regclass AND conname='rfm_results_pkey') THEN
        ALTER TABLE crm.rfm_results ADD CONSTRAINT "rfm_results_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.tags'::regclass AND conname='tags_pkey') THEN
        ALTER TABLE crm.tags ADD CONSTRAINT "tags_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.customer_tags'::regclass AND conname='customer_tags_customer_id_tag_id_key') THEN
        ALTER TABLE crm.customer_tags ADD CONSTRAINT "customer_tags_customer_id_tag_id_key" UNIQUE (customer_id, tag_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.audit_logs'::regclass AND conname='ck_audit_logs_status_standard') THEN
        ALTER TABLE crm.audit_logs ADD CONSTRAINT "ck_audit_logs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('archived'::character varying)::text, ('success'::character varying)::text, ('failure'::character varying)::text, ('failed'::character varying)::text, ('error'::character varying)::text, ('pending'::character varying)::text, ('unknown'::character varying)::text]))));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='crm.returns'::regclass AND conname='ck_returns_status_standard') THEN
        ALTER TABLE crm.returns ADD CONSTRAINT "ck_returns_status_standard" CHECK (((status IS NULL) OR (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'approved'::text, 'rejected'::text, 'processing'::text, 'completed'::text, 'cancelled'::text]))));
    END IF;
END $$;


ALTER TABLE crm.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_finance FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.interactions FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.opportunities FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.return_items FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.returns FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.rfm_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.rfm_results FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.tags FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.audit_logs;
CREATE POLICY "rls_tenant_isolation" ON crm.audit_logs AS PERMISSIVE FOR ALL USING ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)) WITH CHECK ((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.contacts;
CREATE POLICY "rls_tenant_isolation" ON crm.contacts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.customer_finance;
CREATE POLICY "rls_tenant_isolation" ON crm.customer_finance AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.customer_orders;
CREATE POLICY "rls_tenant_isolation" ON crm.customer_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.customer_tags;
CREATE POLICY "rls_tenant_isolation" ON crm.customer_tags AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.customers;
CREATE POLICY "rls_tenant_isolation" ON crm.customers AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.interactions;
CREATE POLICY "rls_tenant_isolation" ON crm.interactions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.opportunities;
CREATE POLICY "rls_tenant_isolation" ON crm.opportunities AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.return_items;
CREATE POLICY "rls_tenant_isolation" ON crm.return_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.returns;
CREATE POLICY "rls_tenant_isolation" ON crm.returns AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.rfm_results;
CREATE POLICY "rls_tenant_isolation" ON crm.rfm_results AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), ''::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON crm.tags;
CREATE POLICY "rls_tenant_isolation" ON crm.tags AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
