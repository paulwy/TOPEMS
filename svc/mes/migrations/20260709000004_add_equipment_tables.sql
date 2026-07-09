-- Equipment Maintenance Records
CREATE TABLE IF NOT EXISTS equipment_maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    maintenance_type VARCHAR(64) NOT NULL,
    description TEXT,
    maintainer VARCHAR(128),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    cost DECIMAL(12,2) DEFAULT 0,
    result VARCHAR(256),
    status VARCHAR(32) DEFAULT 'pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Inspections
CREATE TABLE IF NOT EXISTS equipment_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    equipment_code VARCHAR(64),
    equipment_name VARCHAR(256),
    inspector VARCHAR(128),
    inspection_date TIMESTAMP,
    location VARCHAR(256),
    temperature DECIMAL(8,2),
    vibration DECIMAL(8,2),
    noiselevel DECIMAL(8,2),
    status VARCHAR(32) DEFAULT 'pending',
    items TEXT,
    abnormalities TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Items (for mobile)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(64) NOT NULL,
    name VARCHAR(256) NOT NULL,
    category VARCHAR(128),
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(32) DEFAULT 'pcs',
    location VARCHAR(256),
    batch_no VARCHAR(64),
    expiry_date TIMESTAMP,
    status VARCHAR(32) DEFAULT 'active',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment_id ON equipment_maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_status ON equipment_maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_start_time ON equipment_maintenance_records(start_time);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_equipment_id ON equipment_inspections(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_status ON equipment_inspections(status);
CREATE INDEX IF NOT EXISTS idx_equipment_inspections_inspection_date ON equipment_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
