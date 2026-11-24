-- B260：RD 项目成员状态大小写收口（2026-11-24）
--
-- 背景：rs.project_members.status 没有 CHECK，列默认值是 'ACTIVE'，Rust 写入
--   MemberStatus::Active.to_string() 也是 'ACTIVE'；但权限查询用 status = 'active'，
--   新建成员后权限判定会落空（当前表 0 行，尚未爆发）。
--
-- 本次：存量大小写归一为 lower(status) → 默认值改 'active' → ADD CHECK + VALIDATE。
-- fail-closed：归一后仍存在 active/inactive 之外的值则 RAISE EXCEPTION。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('rs.project_members') IS NULL THEN
        RAISE NOTICE '跳过：rs.project_members 不存在';
        RETURN;
    END IF;

    UPDATE rs.project_members
       SET status = lower(status)
     WHERE status <> lower(status);

    ALTER TABLE rs.project_members
        ALTER COLUMN status SET DEFAULT 'active';

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'rs.project_members'::regclass
           AND conname = 'ck_project_members_status_standard'
    ) INTO exists_already;

    IF exists_already THEN
        ALTER TABLE rs.project_members
            VALIDATE CONSTRAINT ck_project_members_status_standard;
        RAISE NOTICE '跳过 ADD：约束已存在，已重新 VALIDATE';
        RETURN;
    END IF;

    SELECT count(*) FROM rs.project_members
     WHERE status NOT IN ('active', 'inactive')
      INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B260 前置断言失败：% 行 status 落在 active/inactive 之外', n_bad;
    END IF;

    ALTER TABLE rs.project_members
        ADD CONSTRAINT ck_project_members_status_standard
        CHECK (status IN ('active', 'inactive')) NOT VALID;
    ALTER TABLE rs.project_members
        VALIDATE CONSTRAINT ck_project_members_status_standard;

    RAISE NOTICE 'B260 完成：rs.project_members.status 已归一为小写并建立约束';
END $$;
