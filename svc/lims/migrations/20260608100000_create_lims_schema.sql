-- LIMS 服务数据库迁移脚本
-- 创建 lims schema
CREATE SCHEMA IF NOT EXISTS lims;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 样品表 ====================
CREATE TABLE IF NOT EXISTS lims.samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
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
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 检验流程表 ====================
CREATE TABLE IF NOT EXISTS lims.inspection_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 检验任务表 ====================
CREATE TABLE IF NOT EXISTS lims.inspection_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES lims.samples(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES lims.inspection_processes(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inspector VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 检验记录表 ====================
CREATE TABLE IF NOT EXISTS lims.inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES lims.inspection_tasks(id) ON DELETE CASCADE,
    step_id UUID NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    result TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    inspector VARCHAR(255) NOT NULL,
    attachments JSONB DEFAULT '[]',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 仪器表 ====================
CREATE TABLE IF NOT EXISTS lims.instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    instrument_type VARCHAR(255) NOT NULL,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 仪器校准记录表 ====================
CREATE TABLE IF NOT EXISTS lims.instrument_calibrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    instrument_id UUID NOT NULL REFERENCES lims.instruments(id) ON DELETE CASCADE,
    calibration_date TIMESTAMPTZ NOT NULL,
    calibrated_by VARCHAR(255) NOT NULL,
    calibration_results JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 仪器维护记录表 ====================
CREATE TABLE IF NOT EXISTS lims.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    instrument_id UUID NOT NULL REFERENCES lims.instruments(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL,
    next_maintenance_date TIMESTAMPTZ,
    cost DECIMAL(18, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 试剂表 ====================
CREATE TABLE IF NOT EXISTS lims.reagents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    specification VARCHAR(255),
    supplier VARCHAR(255),
    batch_number VARCHAR(100),
    quantity DECIMAL(18, 4) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    storage_condition VARCHAR(255),
    expiration_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 试剂使用记录表 ====================
CREATE TABLE IF NOT EXISTS lims.reagent_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    reagent_id UUID NOT NULL REFERENCES lims.reagents(id) ON DELETE CASCADE,
    quantity DECIMAL(18, 4) NOT NULL,
    usage_date TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(255),
    used_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 实验室台账表 ====================
CREATE TABLE IF NOT EXISTS lims.lab_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    ledger_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 文档关联表 ====================
CREATE TABLE IF NOT EXISTS lims.document_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    doc_service_file_id UUID NOT NULL,
    doc_service_url VARCHAR(500),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    description TEXT,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== AI分析记录表 ====================
CREATE TABLE IF NOT EXISTS lims.ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    analysis_type VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    ai_service_url VARCHAR(500),
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 审计日志表 ====================
CREATE TABLE IF NOT EXISTS lims.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    target_name VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    details JSONB NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 创建索引 ====================

-- 样品表索引
CREATE INDEX IF NOT EXISTS idx_samples_organization_id ON lims.samples(organization_id);
CREATE INDEX IF NOT EXISTS idx_samples_code ON lims.samples(code);
CREATE INDEX IF NOT EXISTS idx_samples_status ON lims.samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_deleted_at ON lims.samples(deleted_at);

-- 检验流程索引
CREATE INDEX IF NOT EXISTS idx_inspection_processes_organization_id ON lims.inspection_processes(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_processes_code ON lims.inspection_processes(code);
CREATE INDEX IF NOT EXISTS idx_inspection_processes_status ON lims.inspection_processes(status);
CREATE INDEX IF NOT EXISTS idx_inspection_processes_deleted_at ON lims.inspection_processes(deleted_at);

-- 检验任务索引
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_organization_id ON lims.inspection_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_sample_id ON lims.inspection_tasks(sample_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_process_id ON lims.inspection_tasks(process_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON lims.inspection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_deleted_at ON lims.inspection_tasks(deleted_at);

-- 检验记录索引
CREATE INDEX IF NOT EXISTS idx_inspection_records_organization_id ON lims.inspection_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_task_id ON lims.inspection_records(task_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_deleted_at ON lims.inspection_records(deleted_at);

-- 仪器索引
CREATE INDEX IF NOT EXISTS idx_instruments_organization_id ON lims.instruments(organization_id);
CREATE INDEX IF NOT EXISTS idx_instruments_code ON lims.instruments(code);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON lims.instruments(status);
CREATE INDEX IF NOT EXISTS idx_instruments_deleted_at ON lims.instruments(deleted_at);

-- 仪器校准索引
CREATE INDEX IF NOT EXISTS idx_instrument_calibrations_organization_id ON lims.instrument_calibrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_instrument_calibrations_instrument_id ON lims.instrument_calibrations(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instrument_calibrations_deleted_at ON lims.instrument_calibrations(deleted_at);

-- 仪器维护索引
CREATE INDEX IF NOT EXISTS idx_maintenance_records_organization_id ON lims.maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_instrument_id ON lims.maintenance_records(instrument_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_deleted_at ON lims.maintenance_records(deleted_at);

-- 试剂索引
CREATE INDEX IF NOT EXISTS idx_reagents_organization_id ON lims.reagents(organization_id);
CREATE INDEX IF NOT EXISTS idx_reagents_code ON lims.reagents(code);
CREATE INDEX IF NOT EXISTS idx_reagents_status ON lims.reagents(status);
CREATE INDEX IF NOT EXISTS idx_reagents_deleted_at ON lims.reagents(deleted_at);

-- 试剂使用索引
CREATE INDEX IF NOT EXISTS idx_reagent_usages_organization_id ON lims.reagent_usages(organization_id);
CREATE INDEX IF NOT EXISTS idx_reagent_usages_reagent_id ON lims.reagent_usages(reagent_id);
CREATE INDEX IF NOT EXISTS idx_reagent_usages_deleted_at ON lims.reagent_usages(deleted_at);

-- 实验室台账索引
CREATE INDEX IF NOT EXISTS idx_lab_ledger_organization_id ON lims.lab_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_ledger_code ON lims.lab_ledger(code);
CREATE INDEX IF NOT EXISTS idx_lab_ledger_deleted_at ON lims.lab_ledger(deleted_at);

-- 文档关联索引
CREATE INDEX IF NOT EXISTS idx_document_relations_organization_id ON lims.document_relations(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_relations_entity ON lims.document_relations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_relations_deleted_at ON lims.document_relations(deleted_at);

-- AI分析索引
CREATE INDEX IF NOT EXISTS idx_ai_analyses_organization_id ON lims.ai_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_entity ON lims.ai_analyses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_deleted_at ON lims.ai_analyses(deleted_at);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON lims.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON lims.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON lims.audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON lims.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON lims.audit_logs(deleted_at);