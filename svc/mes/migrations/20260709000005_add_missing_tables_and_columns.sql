-- Add missing columns to production_orders
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS workstation VARCHAR(256);

-- Add missing columns to work_reports
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS workstation VARCHAR(256);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS operator VARCHAR(128);
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS good_quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS bad_quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
ALTER TABLE work_reports ADD COLUMN IF NOT EXISTS duration DECIMAL(8,2);

-- Add missing columns to equipment
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_type VARCHAR(128);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMP;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_maintenance TIMESTAMP;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS running_hours DECIMAL(10,2) DEFAULT 0;

-- Add missing columns to process_flow_steps
ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS equipment_ids TEXT;
ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS standard_time DECIMAL(8,2);

-- Process Routes
CREATE TABLE IF NOT EXISTS process_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(256) NOT NULL,
    description TEXT,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stocktake Records
CREATE TABLE IF NOT EXISTS stocktake_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name VARCHAR(256),
    sku VARCHAR(64),
    system_quantity DECIMAL(12,2) DEFAULT 0,
    actual_quantity DECIMAL(12,2) DEFAULT 0,
    difference DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inbound Orders
CREATE TABLE IF NOT EXISTS inbound_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) NOT NULL UNIQUE,
    supplier VARCHAR(256),
    order_type VARCHAR(32),
    status VARCHAR(32) DEFAULT 'pending',
    total_items INT DEFAULT 0,
    total_quantity DECIMAL(12,2) DEFAULT 0,
    expected_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Outbound Orders
CREATE TABLE IF NOT EXISTS outbound_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(64) NOT NULL UNIQUE,
    customer VARCHAR(256),
    order_type VARCHAR(32),
    status VARCHAR(32) DEFAULT 'pending',
    total_items INT DEFAULT 0,
    total_quantity DECIMAL(12,2) DEFAULT 0,
    expected_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quality Tasks
CREATE TABLE IF NOT EXISTS quality_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(64) NOT NULL UNIQUE,
    task_type VARCHAR(32),
    product_name VARCHAR(256),
    batch_no VARCHAR(64),
    quantity DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'pending',
    inspector VARCHAR(128),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Defect Records
CREATE TABLE IF NOT EXISTS defect_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES quality_tasks(id) ON DELETE SET NULL,
    product_name VARCHAR(256),
    batch_no VARCHAR(64),
    defect_type VARCHAR(128),
    severity VARCHAR(32),
    quantity DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    images TEXT,
    reporter VARCHAR(128),
    reported_at TIMESTAMP,
    status VARCHAR(32) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_routes_code ON process_routes(code);
CREATE INDEX IF NOT EXISTS idx_process_routes_status ON process_routes(status);
CREATE INDEX IF NOT EXISTS idx_stocktake_records_task_id ON stocktake_records(task_id);
CREATE INDEX IF NOT EXISTS idx_stocktake_records_item_id ON stocktake_records(item_id);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_order_no ON inbound_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_inbound_orders_status ON inbound_orders(status);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_order_no ON outbound_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_outbound_orders_status ON outbound_orders(status);
CREATE INDEX IF NOT EXISTS idx_quality_tasks_task_no ON quality_tasks(task_no);
CREATE INDEX IF NOT EXISTS idx_quality_tasks_status ON quality_tasks(status);
CREATE INDEX IF NOT EXISTS idx_defect_records_task_id ON defect_records(task_id);
CREATE INDEX IF NOT EXISTS idx_defect_records_status ON defect_records(status);
