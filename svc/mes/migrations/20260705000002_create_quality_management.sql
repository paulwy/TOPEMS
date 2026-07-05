-- Quality Inspections (质量检验记录)
CREATE TABLE IF NOT EXISTS quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_no VARCHAR(64) NOT NULL UNIQUE,
    order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
    order_number VARCHAR(64),
    product_code VARCHAR(64) NOT NULL,
    product_name VARCHAR(256) NOT NULL,
    process_id UUID REFERENCES production_processes(id) ON DELETE SET NULL,
    process_name VARCHAR(128),
    inspection_type VARCHAR(32) NOT NULL,
    quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    qualified_quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    unqualified_quantity DECIMAL(12,4) NOT NULL DEFAULT 0,
    qualification_rate DECIMAL(6,2) DEFAULT 0,
    inspector VARCHAR(128),
    inspection_time VARCHAR(32),
    status VARCHAR(32) DEFAULT 'pending',
    result VARCHAR(32),
    memo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Patrols (巡检记录)
CREATE TABLE IF NOT EXISTS quality_patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_no VARCHAR(64) NOT NULL UNIQUE,
    production_line VARCHAR(128),
    workstation_id UUID REFERENCES work_stations(id) ON DELETE SET NULL,
    workstation_name VARCHAR(256),
    inspector VARCHAR(128) NOT NULL,
    patrol_time VARCHAR(32),
    status VARCHAR(32) DEFAULT 'pending',
    result VARCHAR(32),
    findings TEXT,
    memo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Patrol Items (巡检项目)
CREATE TABLE IF NOT EXISTS quality_patrol_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_id UUID NOT NULL REFERENCES quality_patrols(id) ON DELETE CASCADE,
    item_name VARCHAR(256) NOT NULL,
    standard VARCHAR(256),
    actual_value VARCHAR(256),
    status VARCHAR(32) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Quality Standards (质量标准)
CREATE TABLE IF NOT EXISTS quality_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(256) NOT NULL,
    product_code VARCHAR(64),
    product_name VARCHAR(256),
    inspection_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    version VARCHAR(32),
    effective_date VARCHAR(32),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Standard Values (质量标准值)
CREATE TABLE IF NOT EXISTS quality_standard_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID NOT NULL REFERENCES quality_standards(id) ON DELETE CASCADE,
    item_name VARCHAR(256) NOT NULL,
    lower_limit DECIMAL(12,4),
    upper_limit DECIMAL(12,4),
    unit VARCHAR(32),
    inspection_method VARCHAR(256),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspection_no ON quality_inspections(inspection_no);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_quality_patrols_patrol_no ON quality_patrols(patrol_no);
CREATE INDEX IF NOT EXISTS idx_quality_patrols_status ON quality_patrols(status);
CREATE INDEX IF NOT EXISTS idx_quality_patrol_items_patrol_id ON quality_patrol_items(patrol_id);
CREATE INDEX IF NOT EXISTS idx_quality_standards_code ON quality_standards(code);
CREATE INDEX IF NOT EXISTS idx_quality_standards_status ON quality_standards(status);
CREATE INDEX IF NOT EXISTS idx_quality_standard_values_standard_id ON quality_standard_values(standard_id);
