CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 样品表
CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS inspection_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS inspection_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES inspection_processes(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES inspection_tasks(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS instrument_calibrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    calibration_date TIMESTAMPTZ NOT NULL,
    calibrated_by VARCHAR(255) NOT NULL,
    calibration_results JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 试剂表
CREATE TABLE IF NOT EXISTS reagents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS reagent_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reagent_id UUID NOT NULL REFERENCES reagents(id) ON DELETE CASCADE,
    quantity DECIMAL(18,4) NOT NULL,
    usage_date TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(255),
    used_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 实验室台账表
CREATE TABLE IF NOT EXISTS lab_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(code);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_inspection_processes_code ON inspection_processes(code);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_sample_id ON inspection_tasks(sample_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON inspection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_instruments_code ON instruments(code);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);
CREATE INDEX IF NOT EXISTS idx_reagents_code ON reagents(code);
CREATE INDEX IF NOT EXISTS idx_reagents_status ON reagents(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 文档关联表
CREATE TABLE IF NOT EXISTS document_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX IF NOT EXISTS idx_document_relations_entity ON document_relations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_entity ON ai_analyses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);

-- 插入示例数据
INSERT INTO samples (id, name, code, description, status, project_id, batch_number, sample_type, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441000', '样品-A001', 'SMP-2026-001', '高性能材料样品', 'pending', '550e8400-e29b-41d4-a716-446655440000', 'BATCH-A001', '原材料', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM samples WHERE code = 'SMP-2026-001');

INSERT INTO samples (id, name, code, description, status, project_id, batch_number, sample_type, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441001', '样品-B001', 'SMP-2026-002', '成品检验样品', 'in_progress', '550e8400-e29b-41d4-a716-446655440000', 'BATCH-B001', '成品', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM samples WHERE code = 'SMP-2026-002');

INSERT INTO inspection_processes (id, name, code, description, steps, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441002', '常规检验流程', 'PROC-001', '标准检验流程', '[{"id": "step1", "name": "外观检查", "order": 1}, {"id": "step2", "name": "成分分析", "order": 2}, {"id": "step3", "name": "性能测试", "order": 3}, {"id": "step4", "name": "报告生成", "order": 4}]', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM inspection_processes WHERE code = 'PROC-001');

INSERT INTO inspection_processes (id, name, code, description, steps, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441003', '快速检验流程', 'PROC-002', '简化检验流程', '[{"id": "step1", "name": "外观检查", "order": 1}, {"id": "step2", "name": "快速测试", "order": 2}]', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM inspection_processes WHERE code = 'PROC-002');

INSERT INTO instruments (id, name, code, model, manufacturer, serial_number, status, location, responsible_person)
SELECT '550e8400-e29b-41d4-a716-446655441004', '气相色谱仪', 'INST-001', 'GC-2010', 'Shimadzu', 'SN-001', 'active', '实验室A区', '李四'
WHERE NOT EXISTS (SELECT 1 FROM instruments WHERE code = 'INST-001');

INSERT INTO instruments (id, name, code, model, manufacturer, serial_number, status, location, responsible_person)
SELECT '550e8400-e29b-41d4-a716-446655441005', '高效液相色谱仪', 'INST-002', 'HPLC-1260', 'Agilent', 'SN-002', 'active', '实验室B区', '王五'
WHERE NOT EXISTS (SELECT 1 FROM instruments WHERE code = 'INST-002');

INSERT INTO instruments (id, name, code, model, manufacturer, serial_number, status, location, responsible_person)
SELECT '550e8400-e29b-41d4-a716-446655441006', '紫外可见分光光度计', 'INST-003', 'UV-2700', 'Shimadzu', 'SN-003', 'maintenance', '实验室C区', '赵六'
WHERE NOT EXISTS (SELECT 1 FROM instruments WHERE code = 'INST-003');

INSERT INTO reagents (id, name, code, category, specification, supplier, batch_number, quantity, unit, location, status)
SELECT '550e8400-e29b-41d4-a716-446655441007', '乙醇', 'REG-001', '溶剂', '分析纯', '供应商A', 'B-001', 1000.00, 'ml', '试剂柜A1', 'in_stock'
WHERE NOT EXISTS (SELECT 1 FROM reagents WHERE code = 'REG-001');

INSERT INTO reagents (id, name, code, category, specification, supplier, batch_number, quantity, unit, location, status)
SELECT '550e8400-e29b-41d4-a716-446655441008', '甲醇', 'REG-002', '溶剂', '分析纯', '供应商A', 'B-002', 500.00, 'ml', '试剂柜A2', 'in_stock'
WHERE NOT EXISTS (SELECT 1 FROM reagents WHERE code = 'REG-002');

INSERT INTO reagents (id, name, code, category, specification, supplier, batch_number, quantity, unit, location, status)
SELECT '550e8400-e29b-41d4-a716-446655441009', '标准品-A', 'REG-003', '标准品', '99.9%', '供应商B', 'STD-001', 5.00, 'g', '标准品柜', 'in_stock'
WHERE NOT EXISTS (SELECT 1 FROM reagents WHERE code = 'REG-003');

INSERT INTO lab_ledger (id, ledger_type, name, code, quantity, location, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441010', 'glassware', '烧杯500ml', 'LAB-001', 20, '实验室A区', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM lab_ledger WHERE code = 'LAB-001');

INSERT INTO lab_ledger (id, ledger_type, name, code, quantity, location, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441011', 'glassware', '容量瓶100ml', 'LAB-002', 15, '实验室A区', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM lab_ledger WHERE code = 'LAB-002');

INSERT INTO inspection_tasks (id, sample_id, process_id, current_step, status, inspector, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441012', '550e8400-e29b-41d4-a716-446655441000', '550e8400-e29b-41d4-a716-446655441002', 1, 'pending', '李四', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM inspection_tasks WHERE id = '550e8400-e29b-41d4-a716-446655441012');

INSERT INTO inspection_tasks (id, sample_id, process_id, current_step, status, inspector, created_by)
SELECT '550e8400-e29b-41d4-a716-446655441013', '550e8400-e29b-41d4-a716-446655441001', '550e8400-e29b-41d4-a716-446655441002', 2, 'in_progress', '王五', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM inspection_tasks WHERE id = '550e8400-e29b-41d4-a716-446655441013');

INSERT INTO inspection_records (id, task_id, step_id, step_name, result, conclusion, inspector)
SELECT '550e8400-e29b-41d4-a716-446655441014', '550e8400-e29b-41d4-a716-446655441013', 'step1', '外观检查', '样品外观正常，无异常变色', 'pass', '王五'
WHERE NOT EXISTS (SELECT 1 FROM inspection_records WHERE id = '550e8400-e29b-41d4-a716-446655441014');