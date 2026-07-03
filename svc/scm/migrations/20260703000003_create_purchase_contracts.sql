CREATE TABLE IF NOT EXISTS scm.purchase_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_no VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    contract_type VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(200),
    sign_date DATE,
    effective_date DATE,
    expiry_date DATE,
    total_amount NUMERIC(18, 2),
    currency VARCHAR(10),
    payment_terms TEXT,
    delivery_terms TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    approval_status VARCHAR(50),
    approver VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    signed_by VARCHAR(100),
    contract_file VARCHAR(500),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS scm.purchase_contract_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES scm.purchase_contracts(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_code VARCHAR(100),
    product_name VARCHAR(500) NOT NULL,
    specification TEXT,
    unit VARCHAR(50),
    quantity NUMERIC(18, 4) NOT NULL,
    unit_price NUMERIC(18, 4),
    amount NUMERIC(18, 2),
    delivery_date DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_contracts_status ON scm.purchase_contracts(status);
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_supplier_id ON scm.purchase_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_contracts_contract_type ON scm.purchase_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_purchase_contract_items_contract_id ON scm.purchase_contract_items(contract_id);