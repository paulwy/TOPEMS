CREATE TABLE IF NOT EXISTS report_execution_records (
    id UUID PRIMARY KEY,
    schedule_id UUID NOT NULL,
    schedule_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    output_path VARCHAR(500),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_execution_records_schedule_id ON report_execution_records(schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_execution_records_status ON report_execution_records(status);
CREATE INDEX IF NOT EXISTS idx_report_execution_records_started_at ON report_execution_records(started_at);

ALTER TABLE report_execution_records 
    ADD CONSTRAINT fk_report_execution_records_schedule 
    FOREIGN KEY (schedule_id) REFERENCES report_schedules(id);
