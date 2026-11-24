-- 回滚 B276：qms.qa_corrective_actions.status 恢复可空并移除五态 CHECK
ALTER TABLE qms.qa_corrective_actions
    DROP CONSTRAINT IF EXISTS ck_qa_corrective_actions_status_standard;

ALTER TABLE qms.qa_corrective_actions
    ALTER COLUMN status DROP NOT NULL;
