-- B263：RD 变更请求状态落库约束（2026-11-24）
--
-- 背景：rs.change_requests.status 默认 'submitted'，Rust 已有
--   change_request_can_transition 状态机，但 DB 无 CHECK；列表/流转入口接受任意字符串，
--   非法值只能等状态机拦截，直接 UPDATE 或外部写入会落库。
--
-- 本次：已知别名归一 → 默认值固定 'submitted' → ADD CHECK + VALIDATE。
-- 值集与 ChangeRequestStatus::DB_VALUES 同源：submitted/under_review/approved/rejected/closed。
-- fail-closed：归一后仍存在值集外数据则 RAISE EXCEPTION。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('rs.change_requests') IS NULL THEN
        RAISE NOTICE '跳过：rs.change_requests 不存在';
        RETURN;
    END IF;

    UPDATE rs.change_requests
       SET status = CASE lower(btrim(status))
           WHEN 'submitted' THEN 'submitted'
           WHEN 'under_review' THEN 'under_review'
           WHEN 'in_review' THEN 'under_review'
           WHEN 'reviewing' THEN 'under_review'
           WHEN 'approved' THEN 'approved'
           WHEN 'rejected' THEN 'rejected'
           WHEN 'denied' THEN 'rejected'
           WHEN 'closed' THEN 'closed'
           WHEN 'done' THEN 'closed'
           ELSE lower(btrim(status))
       END
     WHERE status IS NOT NULL
       AND status <> CASE lower(btrim(status))
           WHEN 'submitted' THEN 'submitted'
           WHEN 'under_review' THEN 'under_review'
           WHEN 'in_review' THEN 'under_review'
           WHEN 'reviewing' THEN 'under_review'
           WHEN 'approved' THEN 'approved'
           WHEN 'rejected' THEN 'rejected'
           WHEN 'denied' THEN 'rejected'
           WHEN 'closed' THEN 'closed'
           WHEN 'done' THEN 'closed'
           ELSE lower(btrim(status))
       END;

    ALTER TABLE rs.change_requests
        ALTER COLUMN status SET DEFAULT 'submitted';

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'rs.change_requests'::regclass
           AND conname = 'ck_change_requests_status_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE rs.change_requests
            VALIDATE CONSTRAINT ck_change_requests_status_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    SELECT count(*) FROM rs.change_requests
     WHERE status IS NOT NULL
       AND status NOT IN ('submitted', 'under_review', 'approved', 'rejected', 'closed')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B263 前置断言失败：% 行 status 落在 submitted/under_review/approved/rejected/closed 之外', n_bad;
    END IF;

    ALTER TABLE rs.change_requests
        ADD CONSTRAINT ck_change_requests_status_standard
        CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'closed')) NOT VALID;
    ALTER TABLE rs.change_requests
        VALIDATE CONSTRAINT ck_change_requests_status_standard;

    RAISE NOTICE 'B263 完成：rs.change_requests.status 已建立五态约束';
END $$;
