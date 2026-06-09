-- 创建财务凭证表
CREATE TABLE IF NOT EXISTS public.financial_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    voucher_number VARCHAR(100) NOT NULL UNIQUE,
    voucher_date TIMESTAMPTZ NOT NULL,
    period VARCHAR(20) NOT NULL,
    attachment_count INT DEFAULT 0,
    summary TEXT,
    maker_id UUID,
    maker_name VARCHAR(200),
    checker_id UUID,
    checker_name VARCHAR(200),
    bookkeeper_id UUID,
    bookkeeper_name VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
    total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
    source_system VARCHAR(50),
    source_id UUID,
    project_id UUID,
    contract_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建凭证明细表
CREATE TABLE IF NOT EXISTS public.voucher_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID NOT NULL,
    line_number INT NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(200),
    summary TEXT,
    debit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    credit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    quantity NUMERIC(15,4),
    unit VARCHAR(50),
    price NUMERIC(15,4),
    department_id UUID,
    project_id UUID,
    contract_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_period ON public.financial_vouchers(period);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_status ON public.financial_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_financial_vouchers_deleted_at ON public.financial_vouchers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_voucher_items_voucher_id ON public.voucher_items(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_items_subject_code ON public.voucher_items(subject_code);
