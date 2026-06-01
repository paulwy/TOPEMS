-- 项目合同表
CREATE TABLE IF NOT EXISTS project_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    contract_no VARCHAR(100) NOT NULL,
    contract_type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    party_a VARCHAR(200) NOT NULL,
    party_b VARCHAR(200) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    tax_amount NUMERIC(18,2),
    total_amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    signing_date TIMESTAMPTZ NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    expiration_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    payment_terms JSONB,
    attachment_ids JSONB,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON project_contracts(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_contracts_contract_no ON project_contracts(contract_no);
CREATE INDEX IF NOT EXISTS idx_project_contracts_status ON project_contracts(status);