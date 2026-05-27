CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL DEFAULT 'research',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    leader VARCHAR(255) NOT NULL,
    team_members JSONB DEFAULT '[]',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    budget NUMERIC(18,2),
    progress INT DEFAULT 0,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 配方表
CREATE TABLE IF NOT EXISTS formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    version INT DEFAULT 1,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    ingredients JSONB DEFAULT '[]',
    process_params JSONB DEFAULT '{}',
    properties JSONB DEFAULT '{}',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 配方版本表
CREATE TABLE IF NOT EXISTS formula_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    version INT NOT NULL,
    ingredients JSONB NOT NULL,
    process_params JSONB NOT NULL,
    properties JSONB NOT NULL,
    change_reason TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 试验表
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    formula_id UUID REFERENCES formulas(id) ON DELETE CASCADE,
    experiment_type VARCHAR(50) NOT NULL,
    phase VARCHAR(50) NOT NULL DEFAULT 'lab',
    status VARCHAR(50) NOT NULL DEFAULT 'planned',
    objective TEXT,
    method TEXT,
    results JSONB DEFAULT '{}',
    conclusions TEXT,
    experimenter VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    scale NUMERIC(18,4),
    scale_unit VARCHAR(50),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 试验记录表
CREATE TABLE IF NOT EXISTS experiment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    recorded_by VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 专利成果表
CREATE TABLE IF NOT EXISTS patents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    patent_number VARCHAR(100),
    application_date TIMESTAMPTZ,
    grant_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    type VARCHAR(50),
    inventors JSONB DEFAULT '[]',
    assignee VARCHAR(255),
    description TEXT,
    abstract TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 原料试验表
CREATE TABLE IF NOT EXISTS material_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    supplier VARCHAR(255),
    batch_number VARCHAR(100),
    test_results JSONB DEFAULT '{}',
    conclusion TEXT,
    tested_by VARCHAR(255) NOT NULL,
    tested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 批次追溯表
CREATE TABLE IF NOT EXISTS batch_trace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) NOT NULL,
    material_id UUID REFERENCES material_tests(id),
    formula_id UUID REFERENCES formulas(id),
    experiment_id UUID REFERENCES experiments(id),
    trace_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_formulas_code ON formulas(code);
CREATE INDEX IF NOT EXISTS idx_formulas_project_id ON formulas(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_phase ON experiments(phase);
CREATE INDEX IF NOT EXISTS idx_experiments_batch ON experiments(batch_number);
CREATE INDEX IF NOT EXISTS idx_patents_project_id ON patents(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_trace_number ON batch_trace(batch_number);

-- 插入示例数据
INSERT INTO projects (id, name, code, description, project_type, status, leader, start_date, budget, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440000', '高性能新材料研发项目', 'PRJ-2026-001', '开发新型高性能复合材料', 'research', 'active', '张三', '2026-01-01', 1000000.00, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PRJ-2026-001');

INSERT INTO formulas (id, name, code, version, description, project_id, status, ingredients, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440001', '基础配方A', 'FRM-001', 1, '基础实验配方', '550e8400-e29b-41d4-a716-446655440000', 'active', '[{"name": "原料A", "amount": 100, "unit": "kg"}, {"name": "原料B", "amount": 50, "unit": "kg"}]', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM formulas WHERE code = 'FRM-001');

INSERT INTO experiments (id, name, code, project_id, formula_id, experiment_type, phase, status, objective, experimenter)
SELECT '550e8400-e29b-41d4-a716-446655440002', '小试实验-001', 'EXP-2026-001', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'material', 'lab', 'completed', '验证基础配方可行性', '李四'
WHERE NOT EXISTS (SELECT 1 FROM experiments WHERE code = 'EXP-2026-001');

INSERT INTO experiments (id, name, code, project_id, formula_id, experiment_type, phase, status, objective, experimenter)
SELECT '550e8400-e29b-41d4-a716-446655440003', '中试实验-001', 'EXP-2026-002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'process', 'pilot', 'planned', '中试放大验证', '王五'
WHERE NOT EXISTS (SELECT 1 FROM experiments WHERE code = 'EXP-2026-002');

INSERT INTO experiments (id, name, code, project_id, formula_id, experiment_type, phase, status, objective, experimenter)
SELECT '550e8400-e29b-41d4-a716-446655440004', '放大试验-001', 'EXP-2026-003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'scale', 'scaleup', 'planned', '生产放大验证', '赵六'
WHERE NOT EXISTS (SELECT 1 FROM experiments WHERE code = 'EXP-2026-003');

INSERT INTO patents (id, name, patent_number, project_id, status, type, inventors, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440005', '一种高性能复合材料及其制备方法', 'CN202610000001.0', '550e8400-e29b-41d4-a716-446655440000', 'pending', 'invention', '["张三", "李四"]', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM patents WHERE patent_number = 'CN202610000001.0');

INSERT INTO material_tests (id, project_id, material_name, supplier, batch_number, test_results, tested_by)
SELECT '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', '原料A', '供应商A', 'MAT-001', '{"purity": 99.5, "moisture": 0.1, "test_date": "2026-05-01"}', '李四'
WHERE NOT EXISTS (SELECT 1 FROM material_tests WHERE batch_number = 'MAT-001');

INSERT INTO batch_trace (batch_number, formula_id, experiment_id, trace_data)
SELECT 'BATCH-2026-001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '{"materials": ["MAT-001"], "process": "小试", "operator": "李四", "date": "2026-05-15"}'
WHERE NOT EXISTS (SELECT 1 FROM batch_trace WHERE batch_number = 'BATCH-2026-001');

INSERT INTO experiment_records (id, experiment_id, record_type, content, recorded_by)
SELECT '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'observation', '实验过程正常，数据符合预期', '李四'
WHERE NOT EXISTS (SELECT 1 FROM experiment_records WHERE id = '550e8400-e29b-41d4-a716-446655440007');

INSERT INTO experiment_records (id, experiment_id, record_type, content, recorded_by)
SELECT '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'data', '{"temperature": 150, "pressure": 2.5, "time": 120, "yield": 85.5}', '李四'
WHERE NOT EXISTS (SELECT 1 FROM experiment_records WHERE id = '550e8400-e29b-41d4-a716-446655440008');

INSERT INTO formula_versions (id, formula_id, version, ingredients, process_params, properties, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440001', 1, '[{"name": "原料A", "amount": 100, "unit": "kg"}, {"name": "原料B", "amount": 50, "unit": "kg"}]', '{"temperature": 150, "pressure": 2.5}', '{"grade": "industrial"}', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM formula_versions WHERE formula_id = '550e8400-e29b-41d4-a716-446655440001' AND version = 1);

INSERT INTO formula_versions (id, formula_id, version, ingredients, process_params, properties, change_reason, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 2, '[{"name": "原料A", "amount": 105, "unit": "kg"}, {"name": "原料B", "amount": 48, "unit": "kg"}, {"name": "助剂C", "amount": 2, "unit": "kg"}]', '{"temperature": 145, "pressure": 2.3}', '{"grade": "industrial", "optimized": true}', '优化配方比例，提高产率', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM formula_versions WHERE formula_id = '550e8400-e29b-41d4-a716-446655440001' AND version = 2);

INSERT INTO projects (id, name, code, description, project_type, status, leader, start_date, budget, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440011', '催化剂研发项目', 'PRJ-2026-002', '新型催化剂开发', 'research', 'draft', '李四', '2026-03-01', 500000.00, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PRJ-2026-002');

INSERT INTO projects (id, name, code, description, project_type, status, leader, start_date, budget, created_by)
SELECT '550e8400-e29b-41d4-a716-446655440012', '工艺优化项目', 'PRJ-2026-003', '现有工艺改进', 'process', 'active', '王五', '2026-02-01', 300000.00, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PRJ-2026-003');

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

CREATE INDEX IF NOT EXISTS idx_doc_relations_entity ON document_relations(entity_type, entity_id);

-- AI分析记录表
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    ai_service_url VARCHAR(500),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_entity ON ai_analyses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);