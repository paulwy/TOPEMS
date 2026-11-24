-- 回滚 B280：APQP 阶段/任务 status 恢复可空并移除三态 CHECK
ALTER TABLE qms.qa_apqp_phases
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_phases_status_standard;

ALTER TABLE qms.qa_apqp_tasks
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_tasks_status_standard;

ALTER TABLE qms.qa_apqp_phases
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE qms.qa_apqp_tasks
    ALTER COLUMN status DROP NOT NULL;
