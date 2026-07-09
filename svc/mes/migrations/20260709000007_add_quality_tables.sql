-- Quality Patrols
CREATE TABLE IF NOT EXISTS quality_patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_no VARCHAR(64) NOT NULL UNIQUE,
    production_line VARCHAR(128),
    workstation_id UUID REFERENCES work_stations(id),
    workstation_name VARCHAR(128),
    inspector VARCHAR(128),
    patrol_date TIMESTAMP,
    status VARCHAR(32) DEFAULT 'pending',
    memo TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Patrol Items
CREATE TABLE IF NOT EXISTS quality_patrol_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_id UUID REFERENCES quality_patrols(id) ON DELETE CASCADE,
    item_name VARCHAR(256) NOT NULL,
    standard VARCHAR(256),
    actual_value VARCHAR(256),
    status VARCHAR(32) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Standards
CREATE TABLE IF NOT EXISTS quality_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(256) NOT NULL,
    product_code VARCHAR(64),
    product_name VARCHAR(256),
    description TEXT,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Quality Standard Values
CREATE TABLE IF NOT EXISTS quality_standard_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID REFERENCES quality_standards(id) ON DELETE CASCADE,
    item_name VARCHAR(256) NOT NULL,
    lower_limit DECIMAL(12,4),
    upper_limit DECIMAL(12,4),
    unit VARCHAR(32),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quality_patrols_patrol_no ON quality_patrols(patrol_no);
CREATE INDEX IF NOT EXISTS idx_quality_patrols_workstation_id ON quality_patrols(workstation_id);
CREATE INDEX IF NOT EXISTS idx_quality_patrol_items_patrol_id ON quality_patrol_items(patrol_id);
CREATE INDEX IF NOT EXISTS idx_quality_standards_code ON quality_standards(code);
CREATE INDEX IF NOT EXISTS idx_quality_standard_values_standard_id ON quality_standard_values(standard_id);
