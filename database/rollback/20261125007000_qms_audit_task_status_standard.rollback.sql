-- 回滚 B278：qms.qa_audit_tasks.status 恢复可空并移除三态 CHECK
ALTER TABLE qms.qa_audit_tasks
    DROP CONSTRAINT IF EXISTS ck_qa_audit_tasks_status_standard;

ALTER TABLE qms.qa_audit_tasks
    ALTER COLUMN status DROP NOT NULL;
