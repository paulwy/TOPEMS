CREATE TABLE IF NOT EXISTS wms.batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_no VARCHAR(100) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    material_name VARCHAR(500) NOT NULL,
    specification TEXT,
    unit VARCHAR(50),
    quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    available_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    warehouse_id VARCHAR(100) NOT NULL,
    warehouse_name VARCHAR(200),
    location_id VARCHAR(100),
    location_code VARCHAR(100),
    supplier_id VARCHAR(100),
    supplier_name VARCHAR(200),
    production_date DATE,
    expiry_date DATE,
    receipt_date DATE,
    quality_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    manufacture_date DATE,
    shelf_life_days INTEGER,
    remaining_days INTEGER,
    unit_price NUMERIC(18, 4),
    total_value NUMERIC(18, 2),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_batch_no ON wms.batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_batches_sku ON wms.batches(sku);
CREATE INDEX IF NOT EXISTS idx_batches_warehouse_id ON wms.batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_batches_location_id ON wms.batches(location_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON wms.batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_quality_status ON wms.batches(quality_status);