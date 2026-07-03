CREATE TABLE IF NOT EXISTS wms.serial_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no VARCHAR(100) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    specification VARCHAR(200),
    unit VARCHAR(50),
    warehouse_id VARCHAR(36) NOT NULL,
    warehouse_name VARCHAR(200),
    location_id VARCHAR(36),
    location_code VARCHAR(100),
    supplier_id VARCHAR(36),
    supplier_name VARCHAR(200),
    batch_no VARCHAR(100),
    production_date DATE,
    expiry_date DATE,
    quality_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    warranty_start_date DATE,
    warranty_end_date DATE,
    inbound_order_no VARCHAR(100),
    outbound_order_no VARCHAR(100),
    current_owner VARCHAR(200),
    unit_price DECIMAL(18,4),
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_serial_numbers_serial_no ON wms.serial_numbers(serial_no);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_sku ON wms.serial_numbers(sku);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse_id ON wms.serial_numbers(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_location_id ON wms.serial_numbers(location_id);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_batch_no ON wms.serial_numbers(batch_no);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON wms.serial_numbers(status);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_quality_status ON wms.serial_numbers(quality_status);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_expiry_date ON wms.serial_numbers(expiry_date);
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warranty_end_date ON wms.serial_numbers(warranty_end_date);