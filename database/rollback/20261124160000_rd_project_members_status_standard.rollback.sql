-- B260 回滚：恢复默认值与大写存量，DROP 约束。
-- 仅在代码回退到 MemberStatus::to_string()（大写）版本时使用。

DO $$
BEGIN
    IF to_regclass('rs.project_members') IS NULL THEN
        RAISE NOTICE '跳过：rs.project_members 不存在';
        RETURN;
    END IF;

    ALTER TABLE rs.project_members
        DROP CONSTRAINT IF EXISTS ck_project_members_status_standard;

    ALTER TABLE rs.project_members
        ALTER COLUMN status SET DEFAULT 'ACTIVE';

    UPDATE rs.project_members
       SET status = upper(status)
     WHERE status <> upper(status);

    RAISE NOTICE 'B260 回滚完成：默认值恢复 ACTIVE，存量恢复大写';
END $$;
