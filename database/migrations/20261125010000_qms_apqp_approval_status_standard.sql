-- B281: qms.qa_apqp_approvals.status 值域与非空收口
-- 背景：审批状态只有 pending/approved/rejected，但列可空、无 CHECK，
--   process 入口无来源态条件，已拒绝/已通过记录可被反复覆盖。
-- 处置：NULL 归 pending、默认 pending、SET NOT NULL、新增三态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125010000_qms_apqp_approval_status_standard.rollback.sql

ALTER TABLE qms.qa_apqp_approvals
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 APQP 审批空状态补为 pending，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B281
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_apqp_approvals
UPDATE qms.qa_apqp_approvals
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE qms.qa_apqp_approvals
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_apqp_approvals
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_approvals_status_standard;

ALTER TABLE qms.qa_apqp_approvals
    ADD CONSTRAINT ck_qa_apqp_approvals_status_standard
    CHECK (status IN ('pending', 'approved', 'rejected'))
    NOT VALID;

ALTER TABLE qms.qa_apqp_approvals
    VALIDATE CONSTRAINT ck_qa_apqp_approvals_status_standard;
