-- 回滚入口（B 类 4/7）· 对应 database/migrations/20261115141500_b_class_portal_todos_2cols.sql
-- 口径：仅本次新增才删；逐列判断，列内一旦出现非空数据即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. portal.portal_todos.user_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 user_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141500_b_class_portal_todos_2cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM portal.portal_todos WHERE user_id IS NOT NULL) THEN
        ALTER TABLE portal.portal_todos DROP COLUMN IF EXISTS user_id;
    ELSE
        RAISE NOTICE 'portal.portal_todos.user_id 存在非空值，保留列';
    END IF;
END $$;

-- 2. portal.portal_todos.completed
--    completed 带 DEFAULT false：新增后的行即使未显式赋值也是 false（非 NULL），
--    因此有数据时本块会保留该列，这是有意的数据保护。
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 completed 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141500_b_class_portal_todos_2cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM portal.portal_todos WHERE completed IS NOT NULL) THEN
        ALTER TABLE portal.portal_todos DROP COLUMN IF EXISTS completed;
    ELSE
        RAISE NOTICE 'portal.portal_todos.completed 存在非空值，保留列';
    END IF;
END $$;
