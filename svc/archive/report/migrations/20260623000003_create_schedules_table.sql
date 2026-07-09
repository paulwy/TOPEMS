CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL,
    schedule_type VARCHAR(20) NOT NULL,
    schedule_expression VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_template_id ON report_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_status ON report_schedules(status);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run_at ON report_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_created_at ON report_schedules(created_at);

ALTER TABLE report_schedules 
    ADD CONSTRAINT fk_report_schedules_template 
    FOREIGN KEY (template_id) REFERENCES report_templates(id);
