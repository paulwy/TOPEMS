-- TOPEMS-LIMS 数据库 Schema
-- 实验室信息管理系统

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 样品表
CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'received',
    project_id UUID,
    received_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_project_id ON samples(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at);

-- 2. 检验流程表
CREATE TABLE IF NOT EXISTS inspection_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_processes_status ON inspection_processes(status);

-- 3. 检验任务表
CREATE TABLE IF NOT EXISTS inspection_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    process_id UUID NOT NULL REFERENCES inspection_processes(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    inspector VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_tasks_sample_id ON inspection_tasks(sample_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_process_id ON inspection_tasks(process_id);
CREATE INDEX IF NOT EXISTS idx_inspection_tasks_status ON inspection_tasks(status);

-- 4. 检验记录表
CREATE TABLE IF NOT EXISTS inspection_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES inspection_tasks(id) ON DELETE CASCADE,
    step_id UUID NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    result TEXT NOT NULL,
    conclusion TEXT NOT NULL,
    inspector VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_records_task_id ON inspection_records(task_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_recorded_at ON inspection_records(recorded_at);

-- 初始化示例数据

-- 插入示例检验流程
INSERT INTO inspection_processes (name, description, steps, status)
VALUES (
    '催化剂常规检验',
    '适用于所有催化剂产品的常规检验流程',
    '[
        {"id": "550e8400-e29b-41d4-a716-446655440001", "name": "外观检查", "description": "检查样品外观是否正常", "order": 1, "required": true},
        {"id": "550e8400-e29b-41d4-a716-446655440002", "name": "化学成分分析", "description": "使用XRF分析仪测定化学成分", "order": 2, "required": true},
        {"id": "550e8400-e29b-41d4-a716-446655440003", "name": "活性测试", "description": "在标准条件下测定催化活性", "order": 3, "required": true}
    ]',
    'active'
)
ON CONFLICT DO NOTHING;

-- 插入示例样品
INSERT INTO samples (name, description, status, received_date)
VALUES 
    ('催化剂A样品 #001', '2026年批次催化剂A样品', 'received', NOW()),
    ('催化剂B样品 #001', '2026年批次催化剂B样品', 'testing', NOW())
ON CONFLICT DO NOTHING;

-- 8. 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_ids JSONB,
    user_id VARCHAR(100),
    user_name VARCHAR(100),
    request_details JSONB,
    response_details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- 9. 仪器设备表
CREATE TABLE IF NOT EXISTS instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,  -- 分析仪器, 测量仪器, 实验设备, 其他
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    serial_number VARCHAR(100),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'normal',  -- normal, maintenance, calibration, retired
    purchase_date TIMESTAMPTZ,
    calibration_date TIMESTAMPTZ,
    next_calibration_date TIMESTAMPTZ,
    responsible_person VARCHAR(100),
    description TEXT,
    maintenance_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_code ON instruments(code);
CREATE INDEX IF NOT EXISTS idx_instruments_type ON instruments(type);
CREATE INDEX IF NOT EXISTS idx_instruments_status ON instruments(status);
CREATE INDEX IF NOT EXISTS idx_instruments_location ON instruments(location);
CREATE INDEX IF NOT EXISTS idx_instruments_responsible_person ON instruments(responsible_person);

-- 10. 仪器校准记录表
CREATE TABLE IF NOT EXISTS instrument_calibrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    calibration_date TIMESTAMPTZ NOT NULL,
    calibrated_by VARCHAR(100) NOT NULL,
    calibration_results JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_calibrations_instrument_id ON instrument_calibrations(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instrument_calibrations_calibration_date ON instrument_calibrations(calibration_date);

-- 11. 仪器维护记录表
CREATE TABLE IF NOT EXISTS instrument_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instrument_id UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(50) NOT NULL,  -- 日常维护, 定期校准, 故障维修, 部件更换, 性能验证
    description TEXT NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at TIMESTAMPTZ NOT NULL,
    next_maintenance_date TIMESTAMPTZ,
    cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_instrument_id ON instrument_maintenance(instrument_id);
CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_type ON instrument_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_instrument_maintenance_performed_at ON instrument_maintenance(performed_at);

-- 创建触发器：自动更新 instruments 的 updated_at
CREATE OR REPLACE FUNCTION update_instruments_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instruments_updated_at BEFORE UPDATE ON instruments
    FOR EACH ROW EXECUTE FUNCTION update_instruments_updated_at_column();
