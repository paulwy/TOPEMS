-- B 类列补齐（4/7）· portal · portal.portal_todos（1 表 2 列）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   portal.portal_todos.user_id    varchar(100)  NOT NULL  （无默认值）
--   portal.portal_todos.completed  boolean       NOT NULL  DEFAULT false
--
-- 证据（取证门已回读，行号直接引用）：
--   写：svc/portal/src/modules/todos.rs:159-165
--       INSERT INTO portal.portal_todos
--           (user_id, title, service_code, service_name, due_date, priority, todo_type, tenant_id)
--       VALUES ($1::uuid, ...)
--       RETURNING id, title, ..., completed, todo_type, link_url
--   读写：svc/portal/src/modules/todos.rs:217-222
--       UPDATE portal.portal_todos
--          SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
--        WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
--
--   prod 缺列时的失败方式：
--     * INSERT（:159-165）：user_id 在列清单、completed 在 RETURNING → SQLSTATE 42703
--       undefined_column（column "user_id" / "completed" does not exist），建待办整条路径 500；
--     * UPDATE（:217-222）：SET completed 与 WHERE user_id 同时缺 → 42703，完成待办路径 500。
--     均为稳定报错，不是"更新 0 行"这类静默失败。
--
-- 前置断言：表存在；user_id / completed 均不存在；表 0 行（两列 dev 均为 NOT NULL，非 0 行则拒绝直加）。
--   注：completed 带 DEFAULT false，即使将来有行也可安全加；user_id 无默认值，故行数门必须生效。
-- 同名对象冲突：本迁移不创建索引；prod 侧 idx_todos_* / pkey 均不引用这两列（列不存在，必然不引用）。
-- 后置断言：user_id = (varchar(100), NOT NULL, 无默认)；completed = (boolean, NOT NULL, default false)。
--
-- RLS 副作用核查（prod 实测）：portal_todos 为 relrowsecurity=true / relforcerowsecurity=true，
--   策略 rls_tenant_isolation = COALESCE(current_setting('app.rls_system',true),'off')='on'
--   OR tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid，只引用已存在的 tenant_id。
--   本次新增的两列不进入任何策略谓词，补列前后可见行集合与写入许可均不变，无 RLS 副作用。
--
-- 残余缺列（不在本批，按 §4.2.3/§4.4 另行处置）：prod 的 portal_todos 还缺 service_code /
--   service_name / todo_type / link_url / sort_order，其中前三个出现在 :161-164 的同一语句里；
--   本迁移只补 user_id / completed，该路径要端到端可用仍需该批落地。
--
-- 回滚：database/rollback/20261115141500_b_class_portal_todos_2cols.rollback.sql
--   （逐列：仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
BEGIN
    IF to_regclass('portal.portal_todos') IS NULL THEN
        RAISE EXCEPTION 'B 类前置断言失败：表 portal.portal_todos 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'portal' AND table_name = 'portal_todos'
           AND column_name IN ('user_id', 'completed')
    ) THEN
        RAISE EXCEPTION 'B 类前置断言失败：portal.portal_todos 的 user_id/completed 已有存在项，本迁移只补缺失列';
    END IF;

    EXECUTE 'SELECT count(*) FROM portal.portal_todos' INTO n_rows;
    IF n_rows <> 0 THEN
        RAISE EXCEPTION 'B 类前置断言失败：portal_todos 有 % 行，user_id 在 dev 为 NOT NULL 且无默认值，禁止直接加', n_rows;
    END IF;
END $$;

-- 2. 补列
ALTER TABLE portal.portal_todos
    ADD COLUMN IF NOT EXISTS user_id   varchar(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('user_id',   'character varying', 100,        'NO', NULL::text),
            ('completed', 'boolean',           NULL::int, 'NO', 'false')
        ) AS v(col, typ, maxlen, nullable, dflt)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'portal'
            AND table_name = 'portal_todos'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND (
                 (r.col = 'user_id' AND column_default IS NULL)
                 OR (r.col = 'completed' AND column_default LIKE 'false%')
            );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'B 类后置断言失败：portal.portal_todos.% 形状与目标定义不一致', r.col;
        END IF;
    END LOOP;
END $$;
