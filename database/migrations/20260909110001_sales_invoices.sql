-- crmFinance known_gap B 组（2026-09-09）：
-- 归属决策：销售发票/回款/应收报表域归 finance（财务域）。
-- 前端 apps/web/src/api/crmFinance 17 个方法改指 apiClient.finance；
-- finance 补 sales-invoices CRUD/状态机 + collections + receivable 报表端点。
-- finance_v55_invoices 为采购/应付发票（vendor 维度），本表为销售发票（customer 维度），语义独立。

-- 2026-09-18 防御化（空库重建链卡点）：若 finance.sales_invoices 仅为 business_base_tables 建的 2 列裸骨架
-- （无 tenant_id 列）则 DROP 重建（骨架无数据）；结构完整或不存在则跳过。
DO $skel$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='finance' AND table_name='sales_invoices')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='finance' AND table_name='sales_invoices' AND column_name='tenant_id')
  THEN
    DROP TABLE finance.sales_invoices;
  END IF;
END $skel$;

CREATE TABLE IF NOT EXISTS finance.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL DEFAULT '',
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'tax'
        CHECK (invoice_type IN ('tax', '普通发票', '专用发票')),
    cancel_reason TEXT,
    red_flush_of UUID,
    issued_at timestamptz WITH TIME ZONE,
    cancelled_at timestamptz WITH TIME ZONE,
    created_by UUID,
    created_at timestamptz WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at timestamptz WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant ON finance.sales_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON finance.sales_invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON finance.sales_invoices (status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date ON finance.sales_invoices (due_date);

-- 回款确认人/时间列（对齐前端 CollectionRecord.confirmed_by/confirmed_at）
ALTER TABLE finance.erp_collection_records
    ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS confirmed_at timestamptz WITH TIME ZONE;

-- ========== RLS：启用 + 租户隔离策略（对齐 20260908000016 现有模式）+ FORCE ==========
ALTER TABLE finance.sales_invoices ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'finance' AND tablename = 'sales_invoices' AND policyname = 'rls_tenant_isolation'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON finance.sales_invoices USING (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
ALTER TABLE finance.sales_invoices FORCE ROW LEVEL SECURITY;

-- erp_collection_records 若未启用 RLS（早期 erp 表），补启用（幂等）
DO $$
BEGIN
    EXECUTE 'ALTER TABLE finance.erp_collection_records ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'finance' AND tablename = 'erp_collection_records' AND policyname = 'rls_tenant_isolation'
    ) AND EXISTS (
        -- 2026-09-18 防御化（空库重建链卡点）：骨架表无 tenant_id 列时跳过策略
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'finance' AND table_name = 'erp_collection_records'
          AND column_name = 'tenant_id'
    ) THEN
        EXECUTE $policy$CREATE POLICY rls_tenant_isolation ON finance.erp_collection_records USING (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        ) WITH CHECK (
            current_setting('app.current_tenant_id', true) IS NULL
            OR current_setting('app.current_tenant_id', true) = ''
            OR tenant_id IS NULL
            OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )$policy$;
    END IF;
END $$;
ALTER TABLE finance.erp_collection_records FORCE ROW LEVEL SECURITY;
