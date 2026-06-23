CREATE TABLE IF NOT EXISTS qa_lab_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_no VARCHAR(50) UNIQUE NOT NULL,
    sample_name VARCHAR(200) NOT NULL,
    sample_type VARCHAR(100),
    source VARCHAR(200),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    storage_location VARCHAR(200),
    description TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_lab_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_no VARCHAR(50) UNIQUE NOT NULL,
    sample_id UUID NOT NULL REFERENCES qa_lab_samples(id),
    sample_no VARCHAR(50) NOT NULL,
    test_items JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(100),
    instrument_id UUID,
    planned_date TIMESTAMP,
    actual_start_date TIMESTAMP,
    actual_end_date TIMESTAMP,
    result JSONB,
    conclusion VARCHAR(500),
    recorded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_lab_instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_no VARCHAR(50) UNIQUE NOT NULL,
    instrument_name VARCHAR(200) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    purchase_date TIMESTAMP,
    location VARCHAR(200),
    status VARCHAR(50) DEFAULT 'available',
    calibration_date TIMESTAMP,
    next_calibration_date TIMESTAMP,
    calibration_certificate VARCHAR(200),
    responsible_person VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_lab_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES qa_lab_tasks(id),
    test_item VARCHAR(200) NOT NULL,
    test_method VARCHAR(200),
    equipment_used VARCHAR(200),
    raw_data JSONB,
    result_value VARCHAR(200),
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    is_abnormal BOOLEAN DEFAULT FALSE,
    conclusion VARCHAR(500),
    operator VARCHAR(100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_lab_reagents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reagent_no VARCHAR(50) UNIQUE NOT NULL,
    reagent_name VARCHAR(200) NOT NULL,
    specification VARCHAR(100),
    manufacturer VARCHAR(100),
    batch_no VARCHAR(50),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    location VARCHAR(200),
    expiration_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'available',
    storage_conditions VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_lab_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    steps JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_sample_no ON qa_lab_samples(sample_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_status ON qa_lab_samples(status);
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_received_date ON qa_lab_samples(received_date);

CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_task_no ON qa_lab_tasks(task_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_sample_id ON qa_lab_tasks(sample_id);
CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_status ON qa_lab_tasks(status);
CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_assigned_to ON qa_lab_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_instrument_no ON qa_lab_instruments(instrument_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_status ON qa_lab_instruments(status);
CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_next_calibration_date ON qa_lab_instruments(next_calibration_date);

CREATE INDEX IF NOT EXISTS idx_qa_lab_records_task_id ON qa_lab_records(task_id);
CREATE INDEX IF NOT EXISTS idx_qa_lab_records_is_abnormal ON qa_lab_records(is_abnormal);

CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_reagent_no ON qa_lab_reagents(reagent_no);
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_expiration_date ON qa_lab_reagents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_status ON qa_lab_reagents(status);