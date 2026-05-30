-- 样品表
CREATE TABLE IF NOT EXISTS lims.samples (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    project_id UUID,
    batch_number VARCHAR(100),
    source VARCHAR(255),
    sample_type VARCHAR(100),
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    storage_location VARCHAR(255),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 检验流程表
CREATE TABLE IF NOT EXISTS lims.inspection_processes (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 检验任务表
CREATE TABLE IF NOT EXISTS lims.inspection_tasks (
    id UUID PRIMARY KEY,
    sample_id UUID NOT NULL REFERENCES lims.samples(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES lims.inspection_processes(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inspector VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 检验记录表
CREATE TABLE IF NOT EXISTS lims.inspection_records (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES lims.inspection_tasks(id) ON DELETE CASCADE,
    step_id UUID NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    result TEXT NOT NULL,
    conclusion VARCHAR(50) NOT NULL,
    inspector VARCHAR(255) NOT NULL,
    attachments JSONB DEFAULT '[]',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 仪器表
CREATE TABLE IF NOT EXISTS lims.instruments (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    serial_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    location VARCHAR(255),
    purchase_date TIMESTAMPTZ,
    calibration_date TIMESTAMPTZ,
    next_calibration_date TIMESTAMPTZ,
    maintenance_history JSONB DEFAULT '[]',
    responsible_person VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 仪器校准记录表
CREATE TABLE IF NOT EXISTS lims.instrument_calibrations (
    id UUID PRIMARY KEY,
    instrument_id UUID NOT NULL REFERENCES lims.instruments(id) ON DELETE CASCADE,
    calibration_date TIMESTAMPTZ NOT NULL,
    calibrated_by VARCHAR(255) NOT NULL,
    calibration_results JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 试剂表
CREATE TABLE IF NOT EXISTS lims.reagents (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    specification VARCHAR(255),
    supplier VARCHAR(255),
    batch_number VARCHAR(100),
    quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    storage_condition VARCHAR(255),
    expiration_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 试剂使用记录表
CREATE TABLE IF NOT EXISTS lims.reagent_usages (
    id UUID PRIMARY KEY,
    reagent_id UUID NOT NULL REFERENCES lims.reagents(id) ON DELETE CASCADE,
    quantity DECIMAL(18,4) NOT NULL,
    usage_date TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(255),
    used_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS lims.audit_logs (
    id UUID PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    target_name VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    details JSONB NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档关联表
CREATE TABLE IF NOT EXISTS lims.document_relations (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    doc_service_file_id UUID NOT NULL,
    doc_service_url VARCHAR(500),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    description TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI分析记录表
CREATE TABLE IF NOT EXISTS lims.ai_analyses (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    analysis_type VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    ai_service_url VARCHAR(500),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lims_samples_code ON lims.samples(code);
CREATE INDEX IF NOT EXISTS idx_lims_samples_status ON lims.samples(status);
CREATE INDEX IF NOT EXISTS idx_lims_inspection_processes_code ON lims.inspection_processes(code);
CREATE INDEX IF NOT EXISTS idx_lims_inspection_tasks_sample_id ON lims.inspection_tasks(sample_id);
CREATE INDEX IF NOT EXISTS idx_lims_inspection_tasks_status ON lims.inspection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lims_instruments_code ON lims.instruments(code);
CREATE INDEX IF NOT EXISTS idx_lims_instruments_status ON lims.instruments(status);
CREATE INDEX IF NOT EXISTS idx_lims_reagents_code ON lims.reagents(code);
CREATE INDEX IF NOT EXISTS idx_lims_reagents_status ON lims.reagents(status);
CREATE INDEX IF NOT EXISTS idx_lims_audit_logs_target ON lims.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_lims_audit_logs_user ON lims.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_lims_document_relations_entity ON lims.document_relations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lims_ai_analyses_entity ON lims.ai_analyses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lims_ai_analyses_type ON lims.ai_analyses(analysis_type);
