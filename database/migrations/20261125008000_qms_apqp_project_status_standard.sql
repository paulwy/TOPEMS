-- B279: qms.qa_apqp_projects.status 值域与非空收口
-- 背景：APQP 六态已由 shared/fsm::APQP 定义，status 列可空、无 CHECK，
--   update 直接覆盖任意 status，approve/complete/cancel 无并发来源态谓词。
-- 处置：NULL 归 planning、默认 planning、SET NOT NULL、新增六态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125008000_qms_apqp_project_status_standard.rollback.sql

ALTER TABLE qms.qa_apqp_projects
    ALTER COLUMN status SET DEFAULT 'planning';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 APQP 项目空状态补为 planning，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B279
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_apqp_projects
UPDATE qms.qa_apqp_projects
SET status = 'planning'
WHERE status IS NULL;

ALTER TABLE qms.qa_apqp_projects
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_apqp_projects
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_projects_status_standard;

ALTER TABLE qms.qa_apqp_projects
    ADD CONSTRAINT ck_qa_apqp_projects_status_standard
    CHECK (status IN ('planning', 'in_design', 'in_pilot', 'in_production', 'completed', 'cancelled'))
    NOT VALID;

ALTER TABLE qms.qa_apqp_projects
    VALIDATE CONSTRAINT ck_qa_apqp_projects_status_standard;
