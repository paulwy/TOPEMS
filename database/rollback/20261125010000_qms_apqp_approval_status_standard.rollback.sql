-- 回滚 B281：qms.qa_apqp_approvals.status 恢复可空并移除三态 CHECK
ALTER TABLE qms.qa_apqp_approvals
    DROP CONSTRAINT IF EXISTS ck_qa_apqp_approvals_status_standard;

ALTER TABLE qms.qa_apqp_approvals
    ALTER COLUMN status DROP NOT NULL;
