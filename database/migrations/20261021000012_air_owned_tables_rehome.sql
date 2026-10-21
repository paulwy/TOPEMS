-- =============================================================
-- air 遗留 owner 表归位 topems_app
--
-- 背景：本地开发库早前以 peer 认证用户 air（superuser）建表，owner 仍为 air，
-- 业务连接 topems_app 无任何表权限 → 实跑 500：
--   - finance.expense_approvals / finance.core_finance_currencies:
--     permission denied for table ...
--   - communication.core_notification_deliveries/preferences/subscriptions
--   - public.erp_dictionaries / production_lines / qa_* / shifts / work_calendars / workshops
--
-- 处理：与 20261015000077 一致，owner 迁移到 topems_app（air 连接执行时生效）；
-- 若当前迁移角色不是 owner 且无权限，逐表捕获 insufficient_privilege 跳过并记 NOTICE，
-- 不再中断整批迁移。
-- =============================================================

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          AND tableowner = 'air'
        ORDER BY schemaname, tablename
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I OWNER TO topems_app', r.schemaname, r.tablename);
            RAISE NOTICE 'owner -> topems_app: %.%', r.schemaname, r.tablename;
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'skip (not owner): %.%', r.schemaname, r.tablename;
        END;
    END LOOP;

    -- 序列（自增列依赖）同步归位
    FOR r IN
        SELECT n.nspname AS schemaname, c.relname AS seqname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S'
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND pg_get_userbyid(c.relowner) = 'air'
    LOOP
        BEGIN
            EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO topems_app', r.schemaname, r.seqname);
        EXCEPTION WHEN insufficient_privilege THEN
            RAISE NOTICE 'skip sequence (not owner): %.%', r.schemaname, r.seqname;
        END;
    END LOOP;
END $$;
