-- Report Service Schema Migration
-- 报表服务

-- Create schema
CREATE SCHEMA IF NOT EXISTS report;

-- Set search path
SET search_path TO report;

-- ==================== 报表模板表 ====================

-- 报表模板表
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    columns JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 报表记录表 ====================

-- 报表记录表
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL,
    template_id UUID REFERENCES report.report_templates(id),
    data JSONB,
    row_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 报表导出记录表 ====================

-- 报表导出记录表
CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id),
    export_format VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    exported_by VARCHAR(100),
    exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 报表类型配置表 ====================

-- 报表类型配置表
CREATE TABLE IF NOT EXISTS report_type_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    default_columns JSONB,
    available_filters JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report.report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_name ON report.report_templates(name);
CREATE INDEX IF NOT EXISTS idx_reports_template ON report.reports(template_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON report.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_report_exports_report ON report.report_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_format ON report.report_exports(export_format);
CREATE INDEX IF NOT EXISTS idx_report_type_configs_code ON report.report_type_configs(type_code);
CREATE INDEX IF NOT EXISTS idx_report_type_configs_module ON report.report_type_configs(module);

-- Reset search path
RESET search_path;