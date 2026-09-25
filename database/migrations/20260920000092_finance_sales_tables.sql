-- 000092: 冒烟 finance 缺表补建（sales_invoices / erp_collection_records）
-- 5432 缺 finance.sales_invoices（5433 已存在则跳过），DDL 与 5433 对齐
CREATE TABLE IF NOT EXISTS finance.sales_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    invoice_number character varying,
    customer_id uuid,
    customer_name character varying,
    invoice_date date,
    due_date date,
    amount numeric,
    tax_amount numeric,
    total_amount numeric,
    paid_amount numeric,
    status character varying,
    invoice_type character varying,
    cancel_reason text,
    red_flush_of uuid,
    issued_at timestamptz,
    cancelled_at timestamptz,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT sales_invoices_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant ON finance.sales_invoices USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_no ON finance.sales_invoices USING btree (invoice_number);

-- 5432 缺 finance.erp_collection_records（回款记录表，sales-collections 路由使用）
CREATE TABLE IF NOT EXISTS finance.erp_collection_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    invoice_no text,
    amount numeric,
    status text,
    confirmed_by character varying,
    confirmed_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT erp_collection_records_pkey PRIMARY KEY (id)
);
-- 5433 该表残缺（仅 id/deleted_at/confirmed_by/confirmed_at），补代码引用列
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS invoice_no text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
