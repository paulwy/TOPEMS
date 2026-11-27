-- 20261127270000 回滚：按 archive.rls_failclose_before_20261127 快照还原 crm/qms/finance/hrm 策略
--
-- 本波只改策略表达式（USING / WITH CHECK），因此回滚 = 逐条 DROP + CREATE 还原原始定义
-- （含 polcmd / permissive / roles / qual / with_check）。
-- 只处理 batch = 'RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127' 且 action = 'tightened' 的行；
-- skip_* 行本就没有改动，不需要回滚。
--
-- 事务：由 scripts/migration/apply-forward.sh 单事务执行，本文件不含 BEGIN/COMMIT。

SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
DECLARE
    r record;
    roles_txt text;
    sql text;
    n_restored int := 0;
BEGIN
    FOR r IN
        SELECT *
        FROM archive.rls_failclose_before_20261127
        WHERE batch = 'RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127'
          AND action = 'tightened'
        ORDER BY schemaname, tablename, policyname
    LOOP
        -- TO 列表：PUBLIC 不加引号，其余按标识符引用
        SELECT string_agg(CASE WHEN role_name = 'PUBLIC' THEN 'PUBLIC'
                               ELSE quote_ident(role_name) END, ', ')
          INTO roles_txt
          FROM unnest(r.roles) AS role_name;

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

        sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s',
                      r.policyname, r.schemaname, r.tablename,
                      CASE WHEN r.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                      r.polcmd);
        IF roles_txt IS NOT NULL AND roles_txt <> '' THEN
            sql := sql || format(' TO %s', roles_txt);
        END IF;
        IF r.qual_before IS NOT NULL THEN
            sql := sql || format(' USING (%s)', r.qual_before);
        END IF;
        IF r.with_check_before IS NOT NULL THEN
            sql := sql || format(' WITH CHECK (%s)', r.with_check_before);
        END IF;

        EXECUTE sql;
        n_restored := n_restored + 1;
    END LOOP;

    RAISE NOTICE '回滚完成：还原 % 条策略（batch=RLS-FAILCLOSE-WAVE2-CRM-QMS-FINANCE-HRM-20261127）', n_restored;
END $$;
