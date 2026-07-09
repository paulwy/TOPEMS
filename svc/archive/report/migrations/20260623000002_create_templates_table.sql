CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    report_type VARCHAR(50) NOT NULL,
    data_source JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    filter_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    style_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    columns JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_format VARCHAR(20) NOT NULL DEFAULT 'pdf',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_name ON report_templates(name);
CREATE INDEX IF NOT EXISTS idx_report_templates_code ON report_templates(code);
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_active ON report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON report_templates(created_at);
