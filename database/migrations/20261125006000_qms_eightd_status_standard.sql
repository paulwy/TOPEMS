-- B277: qms.qa_eightd_reports.status 对齐 EIGHT_D FSM
-- 背景：FSM 八态为 initiated/in_progress/containment/root_cause/permanent_action/verified/closed/cancelled，
--   但列可空、无 CHECK、默认 'new'，创建写 'new'，update 直接覆盖任意字符串。
-- 处置：'new'/NULL 归 initiated、默认 initiated、SET NOT NULL、新增八态 CHECK 并 VALIDATE。
-- 回滚：database/rollback/20261125006000_qms_eightd_status_standard.rollback.sql

ALTER TABLE qms.qa_eightd_reports
    ALTER COLUMN status SET DEFAULT 'initiated';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 8D 报告旧初始态 'new' 与空值统一归到 FSM 起点 initiated
-- destructive-owner: qms-core
-- destructive-ticket: W5-B-B277
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前 pg_dump -t qms.qa_eightd_reports
UPDATE qms.qa_eightd_reports
SET status = 'initiated'
WHERE status IS NULL OR status = 'new';

ALTER TABLE qms.qa_eightd_reports
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE qms.qa_eightd_reports
    DROP CONSTRAINT IF EXISTS ck_qa_eightd_reports_status_standard;

ALTER TABLE qms.qa_eightd_reports
    ADD CONSTRAINT ck_qa_eightd_reports_status_standard
    CHECK (status IN (
        'initiated',
        'in_progress',
        'containment',
        'root_cause',
        'permanent_action',
        'verified',
        'closed',
        'cancelled'
    ))
    NOT VALID;

ALTER TABLE qms.qa_eightd_reports
    VALIDATE CONSTRAINT ck_qa_eightd_reports_status_standard;
