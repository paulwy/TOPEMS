ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS quality_check_required BOOLEAN DEFAULT false;
ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS transfer_time DECIMAL(8,2);
ALTER TABLE process_flow_steps ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES production_processes(id);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS process_name VARCHAR(256);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(64);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS qualified_quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS unqualified_quantity DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS qualification_rate DECIMAL(5,2);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS inspection_time TIMESTAMP;
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS result VARCHAR(64);
ALTER TABLE quality_inspections ADD COLUMN IF NOT EXISTS memo TEXT;

ALTER TABLE stocktake_records ADD COLUMN IF NOT EXISTS counted_by VARCHAR(128);
ALTER TABLE stocktake_records ADD COLUMN IF NOT EXISTS counted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS stocktake_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(256) NOT NULL,
    warehouse VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending',
    total_items INT DEFAULT 0,
    counted_items INT DEFAULT 0,
    assignee VARCHAR(128),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stocktake_tasks_status ON stocktake_tasks(status);
CREATE INDEX IF NOT EXISTS idx_stocktake_tasks_assignee ON stocktake_tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_stocktake_tasks_due_date ON stocktake_tasks(due_date);