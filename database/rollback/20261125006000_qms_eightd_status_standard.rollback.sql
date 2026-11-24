-- 回滚 B277：恢复 8D 状态可空、默认 'new'，移除八态 CHECK
ALTER TABLE qms.qa_eightd_reports
    DROP CONSTRAINT IF EXISTS ck_qa_eightd_reports_status_standard;

ALTER TABLE qms.qa_eightd_reports
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE qms.qa_eightd_reports
    ALTER COLUMN status SET DEFAULT 'new';
