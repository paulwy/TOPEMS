-- ERP 财务对账相关表
-- V19.2: 新增对账主表、明细表、规则表

CREATE TABLE IF NOT EXISTS erp.fin_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_no VARCHAR(50) NOT NULL,
    reconciliation_type VARCHAR(20) NOT NULL,  -- bank/ar/ap/manual
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending/in_progress/completed/cancelled
    period VARCHAR(20) NOT NULL,
    reference_id VARCHAR(100),
    total_amount DECIMAL(15,2) DEFAULT 0,
    reconciled_amount DECIMAL(15,2) DEFAULT 0,
    discrepancy_amount DECIMAL(15,2) DEFAULT 0,
    tenant_id UUID NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reconciliation_no, tenant_id)
);

CREATE TABLE IF NOT EXISTS erp.fin_reconciliation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_id UUID NOT NULL REFERENCES erp.fin_reconciliations(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL,  -- invoice/payment/receipt/bank_transaction
    record_id VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    matched_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unmatched',  -- unmatched/matched/ignored
    matched_record_id UUID,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp.fin_reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    reconciliation_type VARCHAR(20) NOT NULL,
    match_field VARCHAR(50) NOT NULL,  -- amount/date/reference
    tolerance DECIMAL(15,2) DEFAULT 0,
    priority INT DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_reconciliations_tenant ON erp.fin_reconciliations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliations_status ON erp.fin_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliations_period ON erp.fin_reconciliations(period);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliation_records_recon ON erp.fin_reconciliation_records(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliation_records_tenant ON erp.fin_reconciliation_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliation_rules_tenant ON erp.fin_reconciliation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_reconciliation_rules_type ON erp.fin_reconciliation_rules(reconciliation_type);
