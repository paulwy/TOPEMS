CREATE TABLE IF NOT EXISTS scm.supplier_admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_no VARCHAR(100) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact_person VARCHAR(100),
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    business_license VARCHAR(200),
    tax_registration VARCHAR(200),
    organization_code VARCHAR(100),
    legal_representative VARCHAR(100),
    registered_capital VARCHAR(50),
    established_date DATE,
    business_scope TEXT,
    supplier_category VARCHAR(100),
    risk_level VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    approval_status VARCHAR(50),
    approver VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    applicant VARCHAR(100),
    application_date DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS scm.supplier_admission_audit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES scm.supplier_admissions(id) ON DELETE CASCADE,
    audit_item VARCHAR(200) NOT NULL,
    audit_result VARCHAR(50),
    auditor VARCHAR(100),
    audit_date TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_admissions_status ON scm.supplier_admissions(status);
CREATE INDEX IF NOT EXISTS idx_supplier_admissions_approval_status ON scm.supplier_admissions(approval_status);
CREATE INDEX IF NOT EXISTS idx_supplier_admissions_supplier_category ON scm.supplier_admissions(supplier_category);
CREATE INDEX IF NOT EXISTS idx_supplier_admission_audit_items_admission_id ON scm.supplier_admission_audit_items(admission_id);