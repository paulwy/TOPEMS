-- B276: qms.qa_corrective_actions.status 值域与非空收口
-- 背景：QMS FSM 已定义 ACTION 五态（pending/in_progress/completed/verified/cancelled），
--   但列可空且无 CHECK，update_action 直接写 status，complete_action 只排除 completed。
-- 处置：NULL 归 pending、默认 pending、SET NOT NULL、新增五态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125005000_qms_corrective_action_status_standard.rollback.sql

ALTER TABLE qms.qa_corrective_actions
    ALTER COLUMN status SET DEFAULT 'pending';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把整改措施空状态补为 pending，随后收紧 NOT NULL
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B276
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_corrective_actions
UPDATE qms.qa_corrective_actions
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE qms.qa_corrective_actions
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_corrective_actions
    DROP CONSTRAINT IF EXISTS ck_qa_corrective_actions_status_standard;

ALTER TABLE qms.qa_corrective_actions
    ADD CONSTRAINT ck_qa_corrective_actions_status_standard
    CHECK (status IN ('pending', 'in_progress', 'completed', 'verified', 'cancelled'))
    NOT VALID;

ALTER TABLE qms.qa_corrective_actions
    VALIDATE CONSTRAINT ck_qa_corrective_actions_status_standard;
