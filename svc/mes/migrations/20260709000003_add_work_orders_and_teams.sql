-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_no VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    department_id UUID,
    status VARCHAR(32) DEFAULT 'active',
    leader_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_id UUID,
    member_name VARCHAR(128),
    role VARCHAR(32) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

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
    team_id UUID REFERENCES teams(id),
    operator VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending',
    priority VARCHAR(32) DEFAULT 'medium',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Material Requirements
CREATE TABLE IF NOT EXISTS material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrp_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_no VARCHAR(64),
    bom_id UUID REFERENCES material_boms(id),
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Material Requirement Items
CREATE TABLE IF NOT EXISTS material_requirement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES material_requirements(id) ON DELETE CASCADE,
    material_id UUID,
    material_code VARCHAR(64) NOT NULL,
    material_name VARCHAR(256) NOT NULL,
    specification VARCHAR(256),
    unit VARCHAR(32) NOT NULL,
    required_quantity DECIMAL(12,4) NOT NULL,
    issued_quantity DECIMAL(12,4) DEFAULT 0,
    remaining_quantity DECIMAL(12,4) NOT NULL,
    batch_no VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Production Kanban
CREATE TABLE IF NOT EXISTS production_kanbans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kanban_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_no VARCHAR(64),
    product_code VARCHAR(64) NOT NULL,
    product_name VARCHAR(256) NOT NULL,
    target_quantity DECIMAL(12,2) NOT NULL,
    completed_quantity DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'active',
    priority INT DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Traceability Records
CREATE TABLE IF NOT EXISTS quality_traceability_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_no VARCHAR(64),
    product_id UUID,
    product_code VARCHAR(64),
    product_name VARCHAR(256),
    batch_no VARCHAR(64),
    material_batch_no VARCHAR(64),
    inspector VARCHAR(128),
    inspection_time TIMESTAMP,
    trace_type VARCHAR(32) DEFAULT 'production',
    status VARCHAR(32) DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_team_no ON teams(team_no);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_order_no ON work_orders(work_order_no);
CREATE INDEX IF NOT EXISTS idx_work_orders_order_id ON work_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_work_station_id ON work_orders(work_station_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_process_id ON work_orders(process_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_team_id ON work_orders(team_id);
CREATE INDEX IF NOT EXISTS idx_material_requirements_mrp_no ON material_requirements(mrp_no);
CREATE INDEX IF NOT EXISTS idx_material_requirements_order_id ON material_requirements(order_id);
CREATE INDEX IF NOT EXISTS idx_material_requirement_items_requirement_id ON material_requirement_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_production_kanbans_kanban_no ON production_kanbans(kanban_no);
CREATE INDEX IF NOT EXISTS idx_production_kanbans_order_id ON production_kanbans(order_id);
CREATE INDEX IF NOT EXISTS idx_production_kanbans_status ON production_kanbans(status);
CREATE INDEX IF NOT EXISTS idx_quality_traceability_records_trace_no ON quality_traceability_records(trace_no);
CREATE INDEX IF NOT EXISTS idx_quality_traceability_records_order_id ON quality_traceability_records(order_id);
CREATE INDEX IF NOT EXISTS idx_quality_traceability_records_batch_no ON quality_traceability_records(batch_no);