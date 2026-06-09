-- EHS Schema Migration
-- 安全健康环境管理系统

-- Create schema
CREATE SCHEMA IF NOT EXISTS ehs;

-- Set search path
SET search_path TO ehs;

-- ==================== 安全管理表 ====================

-- 安全隐患表
CREATE TABLE IF NOT EXISTS safety_hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    risk_assessment TEXT,
    control_measures JSONB DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 安全检查表
CREATE TABLE IF NOT EXISTS safety_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_no VARCHAR(50) NOT NULL UNIQUE,
    check_type VARCHAR(50) NOT NULL,
    inspector VARCHAR(100) NOT NULL,
    check_date TIMESTAMPTZ,
    location VARCHAR(200),
    result VARCHAR(20) NOT NULL,
    issues JSONB DEFAULT '[]',
    attachments JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 应急预案表
CREATE TABLE IF NOT EXISTS emergency_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    scope TEXT,
    trigger_conditions TEXT,
    response_procedures TEXT,
    responsible_persons JSONB DEFAULT '[]',
    contact_info TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 演练记录表
CREATE TABLE IF NOT EXISTS drill_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_no VARCHAR(50) NOT NULL UNIQUE,
    plan_id UUID REFERENCES ehs.emergency_plans(id),
    drill_name VARCHAR(200) NOT NULL,
    drill_date TIMESTAMPTZ,
    participants JSONB DEFAULT '[]',
    duration_hours NUMERIC(10,2) NOT NULL,
    location VARCHAR(200),
    summary TEXT,
    issues_found TEXT,
    improvements TEXT,
    attachments JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 环境管理表 ====================

-- 监测点表
CREATE TABLE IF NOT EXISTS monitoring_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    point_type VARCHAR(50) NOT NULL,
    location VARCHAR(200),
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    parameters JSONB DEFAULT '[]',
    thresholds JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_data_time TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 环境数据表
CREATE TABLE IF NOT EXISTS environmental_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_id UUID NOT NULL REFERENCES ehs.monitoring_points(id),
    data_time TIMESTAMPTZ NOT NULL,
    parameter VARCHAR(50) NOT NULL,
    value NUMERIC(20,6) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 环境预警表
CREATE TABLE IF NOT EXISTS environmental_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_id UUID NOT NULL REFERENCES ehs.monitoring_points(id),
    alert_type VARCHAR(50) NOT NULL,
    alert_level VARCHAR(20) NOT NULL,
    parameter VARCHAR(50) NOT NULL,
    threshold_value NUMERIC(20,6) NOT NULL,
    actual_value NUMERIC(20,6) NOT NULL,
    alert_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    handled_by VARCHAR(100),
    handled_time TIMESTAMPTZ,
    handle_result TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 健康管理表 ====================

-- 健康档案表
CREATE TABLE IF NOT EXISTS health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    birth_date TIMESTAMPTZ,
    blood_type VARCHAR(5),
    allergies JSONB,
    chronic_diseases JSONB,
    medical_history TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 体检记录表
CREATE TABLE IF NOT EXISTS health_checkups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    checkup_date TIMESTAMPTZ NOT NULL,
    checkup_type VARCHAR(50) NOT NULL,
    institution VARCHAR(200),
    result_summary TEXT,
    abnormal_items JSONB,
    recommendations TEXT,
    attachments JSONB,
    next_checkup_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 疫苗接种记录表
CREATE TABLE IF NOT EXISTS vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    vaccine_name VARCHAR(100) NOT NULL,
    vaccine_type VARCHAR(50) NOT NULL,
    vaccination_date TIMESTAMPTZ NOT NULL,
    dose_number INTEGER NOT NULL,
    institution VARCHAR(200),
    batch_number VARCHAR(50),
    expiry_date TIMESTAMPTZ,
    next_dose_date TIMESTAMPTZ,
    remarks TEXT,
    attachments JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 安全事故表 ====================

-- 安全事故表
CREATE TABLE IF NOT EXISTS safety_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    incident_type VARCHAR(50) NOT NULL,
    incident_level VARCHAR(20) NOT NULL,
    location VARCHAR(200),
    incident_time TIMESTAMPTZ NOT NULL,
    description TEXT,
    casualties INTEGER DEFAULT 0,
    injuries INTEGER DEFAULT 0,
    economic_loss NUMERIC(15,2),
    cause_analysis TEXT,
    corrective_actions JSONB,
    responsible_persons JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    handled_by VARCHAR(100),
    handled_time TIMESTAMPTZ,
    attachments JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 风险评估表 ====================

-- 风险评估表
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    risk_source VARCHAR(100) NOT NULL,
    risk_category VARCHAR(50) NOT NULL,
    likelihood INTEGER NOT NULL,
    consequence INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    risk_score INTEGER NOT NULL,
    description TEXT,
    affected_area VARCHAR(200),
    affected_persons INTEGER,
    existing_controls JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    assessor VARCHAR(100),
    assessment_date TIMESTAMPTZ,
    review_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 风险控制措施表
CREATE TABLE IF NOT EXISTS risk_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES ehs.risk_assessments(id),
    control_type VARCHAR(50) NOT NULL,
    control_measure TEXT NOT NULL,
    implementation_plan TEXT,
    responsible_person VARCHAR(100),
    target_date TIMESTAMPTZ,
    completion_date TIMESTAMPTZ,
    effectiveness VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 培训管理表 ====================

-- 培训计划表
CREATE TABLE IF NOT EXISTS training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    training_type VARCHAR(50) NOT NULL,
    content TEXT,
    objectives TEXT,
    target_audience TEXT,
    duration_hours NUMERIC(10,2),
    training_method VARCHAR(50),
    instructor VARCHAR(100),
    location VARCHAR(200),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_participants INTEGER,
    materials JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    completion_rate NUMERIC(5,2),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 培训记录表
CREATE TABLE IF NOT EXISTS training_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES ehs.training_programs(id),
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    enrollment_date TIMESTAMPTZ NOT NULL,
    completion_date TIMESTAMPTZ,
    score NUMERIC(5,2),
    certificate_no VARCHAR(50),
    certificate_expiry TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 审计日志表 ====================

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    user_id VARCHAR(100),
    user_name VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_safety_hazards_no ON ehs.safety_hazards(hazard_no);
CREATE INDEX IF NOT EXISTS idx_safety_hazards_status ON ehs.safety_hazards(status);
CREATE INDEX IF NOT EXISTS idx_safety_checks_no ON ehs.safety_checks(check_no);
CREATE INDEX IF NOT EXISTS idx_safety_checks_status ON ehs.safety_checks(status);
CREATE INDEX IF NOT EXISTS idx_emergency_plans_no ON ehs.emergency_plans(plan_no);
CREATE INDEX IF NOT EXISTS idx_drill_records_no ON ehs.drill_records(drill_no);
CREATE INDEX IF NOT EXISTS idx_monitoring_points_no ON ehs.monitoring_points(point_no);
CREATE INDEX IF NOT EXISTS idx_environmental_data_point ON ehs.environmental_data(point_id);
CREATE INDEX IF NOT EXISTS idx_environmental_data_time ON ehs.environmental_data(data_time);
CREATE INDEX IF NOT EXISTS idx_environmental_alerts_point ON ehs.environmental_alerts(point_id);
CREATE INDEX IF NOT EXISTS idx_environmental_alerts_status ON ehs.environmental_alerts(status);
CREATE INDEX IF NOT EXISTS idx_health_records_employee ON ehs.health_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_health_checkups_employee ON ehs.health_checkups(employee_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_employee ON ehs.vaccination_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_no ON ehs.safety_incidents(incident_no);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON ehs.safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_no ON ehs.risk_assessments(assessment_no);
CREATE INDEX IF NOT EXISTS idx_risk_controls_assessment ON ehs.risk_controls(assessment_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_no ON ehs.training_programs(program_no);
CREATE INDEX IF NOT EXISTS idx_training_records_program ON ehs.training_records(program_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON ehs.training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON ehs.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON ehs.audit_logs(created_at);

-- Reset search path
RESET search_path;