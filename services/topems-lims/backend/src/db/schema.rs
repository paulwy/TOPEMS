#![allow(dead_code)]

pub const CREATE_SAMPLES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS lims.samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sample_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    received_date DATE NOT NULL,
    analysis_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON lims.samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON lims.samples(status);
"#;

pub const CREATE_TEST_RECORDS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS lims.test_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES lims.samples(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    test_method VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result TEXT,
    unit VARCHAR(50),
    standard TEXT,
    tested_by UUID,
    tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_records_sample_id ON lims.test_records(sample_id);
CREATE INDEX IF NOT EXISTS idx_test_records_status ON lims.test_records(status);
"#;

pub const CREATE_EQUIPMENTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS lims.equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    location VARCHAR(255),
    last_calibration_date DATE,
    next_calibration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipments_status ON lims.equipments(status);
CREATE INDEX IF NOT EXISTS idx_equipments_serial_number ON lims.equipments(serial_number);
"#;
