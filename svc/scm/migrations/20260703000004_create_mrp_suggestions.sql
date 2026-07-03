CREATE TABLE IF NOT EXISTS scm.mrp_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_number VARCHAR(100) NOT NULL,
    material_code VARCHAR(100) NOT NULL,
    material_name VARCHAR(500) NOT NULL,
    specification TEXT,
    unit VARCHAR(50),
    current_stock NUMERIC(18, 4) NOT NULL DEFAULT 0,
    required_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    suggested_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    supplier_id UUID,
    supplier_name VARCHAR(200),
    lead_time_days INTEGER,
    suggested_order_date DATE,
    suggested_delivery_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    source_type VARCHAR(50),
    source_order_id UUID,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mrp_suggestions_status ON scm.mrp_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_mrp_suggestions_material_code ON scm.mrp_suggestions(material_code);
CREATE INDEX IF NOT EXISTS idx_mrp_suggestions_supplier_id ON scm.mrp_suggestions(supplier_id);