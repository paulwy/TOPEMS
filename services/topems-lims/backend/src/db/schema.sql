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
