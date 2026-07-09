-- Add missing columns to production_orders
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS start_time TIMESTAMP;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Add missing columns to process_flow_steps
ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS wait_time DECIMAL(8,2);

-- Process Route Steps
CREATE TABLE IF NOT EXISTS process_route_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES process_routes(id) ON DELETE CASCADE,
    process_id UUID REFERENCES production_processes(id),
    sequence INT NOT NULL,
    standard_time DECIMAL(8,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_number VARCHAR(64),
    product_code VARCHAR(64),
    product_name VARCHAR(256),
    batch_no VARCHAR(64),
    inspector VARCHAR(128),
    inspection_date TIMESTAMP,
    status VARCHAR(32) DEFAULT 'pending',
    pass_rate DECIMAL(5,2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_process_route_steps_route_id ON process_route_steps(route_id);
CREATE INDEX IF NOT EXISTS idx_process_route_steps_sequence ON process_route_steps(route_id, sequence);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspection_no ON quality_inspections(inspection_no);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_order_id ON quality_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status);
