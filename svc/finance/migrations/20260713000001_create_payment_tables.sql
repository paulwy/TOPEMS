
-- 付款单扩展表（基于凭证系统，补充业务字段）
CREATE TABLE IF NOT EXISTS core_finance_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    voucher_id UUID NOT NULL REFERENCES core_finance_vouchers(id) ON DELETE CASCADE,
    payment_no VARCHAR(50) NOT NULL,
    supplier_id UUID,
    supplier_name VARCHAR(255),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    bank_account_id UUID,
    bank_name VARCHAR(255),
    bank_account_no VARCHAR(100),
    total_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    exchange_rate NUMERIC(18,6) DEFAULT 1,
    payment_date DATE,
    actual_payment_date DATE,
    remark TEXT,
    attachment_url TEXT,
    created_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_tenant_id ON core_finance_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_voucher_id ON core_finance_payments(voucher_id);
CREATE INDEX IF NOT EXISTS idx_payment_supplier_id ON core_finance_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_no ON core_finance_payments(tenant_id, payment_no);

-- 付款核销明细表
CREATE TABLE IF NOT EXISTS core_finance_payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core_tenants(id),
    payment_id UUID NOT NULL REFERENCES core_finance_payments(id) ON DELETE CASCADE,
    line_no INT NOT NULL,
    invoice_id UUID,
    invoice_no VARCHAR(50),
    payable_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    payment_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_item_payment_id ON core_finance_payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_item_invoice_id ON core_finance_payment_items(invoice_id);
