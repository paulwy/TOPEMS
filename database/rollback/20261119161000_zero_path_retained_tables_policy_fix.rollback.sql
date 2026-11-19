-- 回滚：20261119161000_zero_path_retained_tables_policy_fix
-- 删除本迁移建立的策略，按 archive._rls_policy_snapshot 恢复原策略（含原 allow-all）。
-- 事务：由调用方以 psql --single-transaction 执行，本文件不含 BEGIN/COMMIT。
SET search_path = public;
SET statement_timeout = '300s';

DO $rollback$
DECLARE
  r record; polrec record;
  role_list text; stmt text;
  n int;
BEGIN
  IF to_regclass('archive._rls_policy_snapshot') IS NULL THEN
    RAISE NOTICE 'rollback: archive._rls_policy_snapshot missing; nothing to restore';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM archive._rls_policy_snapshot
  WHERE migration_version = '20261119161000';
  IF n = 0 THEN
    RAISE NOTICE 'rollback: no policy snapshot for 20261119161000; nothing to restore';
    RETURN;
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('core', 'core_tenant_plugins'),
    ('portal', 'user_preferences'),
    ('iam', 'roles')
  ) AS x(sch, tbl)
  LOOP
    IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS rls_system_only ON %I.%I', r.sch, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS rls_global_read ON %I.%I', r.sch, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS rls_system_write ON %I.%I', r.sch, r.tbl);
  END LOOP;

  FOR polrec IN SELECT * FROM archive._rls_policy_snapshot
                WHERE migration_version = '20261119161000'
  LOOP
    role_list := CASE WHEN polrec.roles IS NULL OR cardinality(polrec.roles) = 0 THEN 'PUBLIC'
                      ELSE (SELECT string_agg(CASE WHEN x = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(x) END, ', ')
                            FROM unnest(polrec.roles) x) END;
    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                   polrec.polname, polrec.schema_name, polrec.table_name,
                   polrec.permissive, polrec.cmd, role_list);
    IF polrec.cmd IN ('ALL','SELECT','UPDATE','DELETE') THEN
      stmt := stmt || format(' USING (%s)', coalesce(polrec.qual, 'true'));
    END IF;
    IF polrec.cmd IN ('ALL','INSERT','UPDATE') THEN
      stmt := stmt || format(' WITH CHECK (%s)', coalesce(polrec.with_check, 'true'));
    END IF;
    BEGIN
      EXECUTE stmt;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;

  RAISE NOTICE 'rollback complete: original policies restored for retained zero-path tables';
END
$rollback$;
