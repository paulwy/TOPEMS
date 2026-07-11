-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_no VARCHAR(64),
    product_code VARCHAR(64) NOT NULL,
    product_name VARCHAR(256) NOT NULL,
    work_station_id UUID REFERENCES work_stations(id),
    process_id UUID REFERENCES production_processes(id),
    planned_quantity DECIMAL(12,2) NOT NULL,
    completed_quantity DECIMAL(12,2) DEFAULT 0,
    plan_start_date TIMESTAMP,
    plan_end_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    team_id UUID,
    operator VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending',
    priority VARCHAR(32) DEFAULT 'normal',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Material Requirements
CREATE TABLE IF NOT EXISTS material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrp_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_number VARCHAR(64),
    product_code VARCHAR(64),
    product_name VARCHAR(256),
    material_code VARCHAR(64) NOT NULL,
    material_name VARCHAR(256) NOT NULL,
    specification VARCHAR(256),
    unit VARCHAR(32) NOT NULL,
    required_quantity DECIMAL(12,4) NOT NULL,
    required_date TIMESTAMP,
    priority VARCHAR(32) DEFAULT 'normal',
    source_type VARCHAR(32) DEFAULT 'manual',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_no ON work_orders(work_order_no);
CREATE INDEX IF NOT EXISTS idx_work_orders_order_id ON work_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_station_id ON work_orders(work_station_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_process_id ON work_orders(process_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_material_requirements_mrp_no ON material_requirements(mrp_no);
CREATE INDEX IF NOT EXISTS idx_material_requirements_order_id ON material_requirements(order_id);
CREATE INDEX IF NOT EXISTS idx_material_requirements_material_code ON material_requirements(material_code);
CREATE INDEX IF NOT EXISTS idx_material_requirements_required_date ON material_requirements(required_date);
CREATE INDEX IF NOT EXISTS idx_material_requirements_priority ON material_requirements(priority);
