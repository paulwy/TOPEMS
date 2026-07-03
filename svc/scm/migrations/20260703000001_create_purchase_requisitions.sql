CREATE TABLE IF NOT EXISTS scm.purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    applicant_id UUID,
    applicant_name VARCHAR(100),
    department_id UUID,
    department_name VARCHAR(100),
    request_date TIMESTAMPTZ NOT NULL,
    required_date TIMESTAMPTZ,
    total_amount DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'CNY',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'normal',
    supplier_id UUID,
    supplier_name VARCHAR(200),
    approval_status VARCHAR(50),
    approver VARCHAR(100),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON scm.purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_applicant_id ON scm.purchase_requisitions(applicant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_department_id ON scm.purchase_requisitions(department_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_supplier_id ON scm.purchase_requisitions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_request_date ON scm.purchase_requisitions(request_date);