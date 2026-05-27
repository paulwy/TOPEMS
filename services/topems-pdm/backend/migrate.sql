
-- Create tables for TOPEMS-PDM
CREATE TABLE IF NOT EXISTS production_processes (
    id UUID PRIMARY KEY,
    process_no VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_steps (
    id UUID PRIMARY KEY,
    process_id UUID NOT NULL,
    step_no VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration BIGINT,
    equipment_required TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_formulas (
    id UUID PRIMARY KEY,
    formula_no VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    process_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formula_ingredients (
    id UUID PRIMARY KEY,
    formula_id UUID NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit VARCHAR(50) NOT NULL,
    percentage NUMERIC,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY,
    batch_no VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    formula_id UUID,
    process_id UUID,
    planned_quantity NUMERIC,
    actual_quantity NUMERIC,
    unit VARCHAR(50),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'planning',
    operator VARCHAR(255),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_statistics (
    id UUID PRIMARY KEY,
    batch_id UUID,
    stat_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    output_quantity NUMERIC,
    reject_quantity NUMERIC,
    pass_rate NUMERIC,
    cycle_time BIGINT,
    energy_consumption NUMERIC,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verify tables created
SELECT tablename FROM pg_tables WHERE tablename LIKE 'production%' OR tablename LIKE 'formula%';
