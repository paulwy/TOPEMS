-- B278: qms.qa_audit_tasks.status 值域与非空收口
-- 背景：审核任务只有 pending/in_progress/completed 三态，但列可空、无 CHECK，
--   complete_audit_task 直接写 completed，不校验来源态。
-- 处置：NULL 归 pending、默认 pending、SET NOT NULL、新增三态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125007000_qms_audit_task_status_standard.rollback.sql

ALTER TABLE qms.qa_audit_tasks
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把审核任务空状态补为 pending，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B278
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_audit_tasks
UPDATE qms.qa_audit_tasks
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE qms.qa_audit_tasks
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_audit_tasks
    DROP CONSTRAINT IF EXISTS ck_qa_audit_tasks_status_standard;

ALTER TABLE qms.qa_audit_tasks
    ADD CONSTRAINT ck_qa_audit_tasks_status_standard
    CHECK (status IN ('pending', 'in_progress', 'completed'))
    NOT VALID;

ALTER TABLE qms.qa_audit_tasks
    VALIDATE CONSTRAINT ck_qa_audit_tasks_status_standard;
