-- B280: qms.qa_apqp_phases / qms.qa_apqp_tasks.status 值域与非空收口
-- 背景：阶段与任务均为 pending/in_progress/completed 三态，但两列可空、无 CHECK，
--   update 直接覆盖任意 status。
-- 处置：NULL 归 pending、默认 pending、SET NOT NULL、新增三态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125009000_qms_apqp_item_status_standard.rollback.sql

ALTER TABLE qms.qa_apqp_phases
    ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE qms.qa_apqp_tasks
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 APQP 阶段/任务空状态补为 pending，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B280
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 200000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_apqp_phases -t qms.qa_apqp_tasks
UPDATE qms.qa_apqp_phases
SET status = 'pending'
WHERE status IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 APQP 任务空状态补为 pending，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B280
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 200000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_apqp_tasks
UPDATE qms.qa_apqp_tasks
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE qms.qa_apqp_phases
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_apqp_tasks
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_apqp_phases
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_phases_status_standard;

ALTER TABLE qms.qa_apqp_tasks
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_tasks_status_standard;

ALTER TABLE qms.qa_apqp_phases
    ADD CONSTRAINT ck_qa_apqp_phases_status_standard
    CHECK (status IN ('pending', 'in_progress', 'completed'))
    NOT VALID;

ALTER TABLE qms.qa_apqp_tasks
    ADD CONSTRAINT ck_qa_apqp_tasks_status_standard
    CHECK (status IN ('pending', 'in_progress', 'completed'))
    NOT VALID;

ALTER TABLE qms.qa_apqp_phases
    VALIDATE CONSTRAINT ck_qa_apqp_phases_status_standard;

ALTER TABLE qms.qa_apqp_tasks
    VALIDATE CONSTRAINT ck_qa_apqp_tasks_status_standard;
