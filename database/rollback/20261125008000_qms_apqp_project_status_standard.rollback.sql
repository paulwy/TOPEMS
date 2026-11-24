-- 回滚 B279：qms.qa_apqp_projects.status 恢复可空并移除六态 CHECK
ALTER TABLE qms.qa_apqp_projects
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_projects_status_standard;

ALTER TABLE qms.qa_apqp_projects
    ALTER COLUMN status DROP NOT NULL;
