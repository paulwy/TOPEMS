-- 回滚：drop_dead_tables_batch1
-- 依据 archive._drop_manifest / _rls_policy_snapshot / _fk_snapshot / _view_snapshot 重建表、数据、RLS、外键与依赖视图。
-- 仅重建表结构与数据（LIKE INCLUDING ALL），不恢复 GRANT/COMMENT；如需完全还原请同时执行原迁移中的授权语句。
-- 事务：按仓库惯例由调用方用 psql --single-transaction 执行，本文件不含 BEGIN/COMMIT。
SET search_path = public;
SET statement_timeout = '300s';

DO $rollback$
DECLARE
  r record; polrec record; fkrec record; viewrec record; seqrec record; defrec record;
  role_list text; stmt text;
BEGIN
  IF to_regclass('archive._drop_manifest') IS NULL THEN
    RAISE EXCEPTION 'archive metadata missing: archive._drop_manifest';
  END IF;

  FOR r IN SELECT * FROM archive._drop_manifest
           WHERE migration_version = '20261119100000' ORDER BY schema_name, table_name
  LOOP
    IF to_regclass(format('%I.%I', r.schema_name, r.table_name)) IS NULL THEN
      EXECUTE format('CREATE TABLE %I.%I (LIKE archive.%I INCLUDING ALL)',
                     r.schema_name, r.table_name, r.archive_table);
      EXECUTE format('INSERT INTO %I.%I SELECT * FROM archive.%I',
                     r.schema_name, r.table_name, r.archive_table);
    END IF;
    IF r.relrowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    END IF;
    IF r.relforcerowsecurity THEN
      EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    END IF;
  END LOOP;

  FOR seqrec IN SELECT * FROM archive._sequence_snapshot
                WHERE migration_version = '20261119100000'
  LOOP
    IF to_regclass(format('%I.%I', seqrec.seq_schema, seqrec.seq_name)) IS NULL THEN
      EXECUTE format('CREATE SEQUENCE %I.%I AS %s INCREMENT BY %s MINVALUE %s MAXVALUE %s START WITH %s CACHE %s %s',
                     seqrec.seq_schema, seqrec.seq_name, seqrec.data_type,
                     seqrec.increment_by, seqrec.min_value, seqrec.max_value,
                     seqrec.start_value, seqrec.cache_size,
                     CASE WHEN seqrec.is_cycle THEN 'CYCLE' ELSE 'NO CYCLE' END);
      EXECUTE format('ALTER SEQUENCE %I.%I OWNED BY %I.%I.%I',
                     seqrec.seq_schema, seqrec.seq_name,
                     seqrec.owned_schema, seqrec.owned_table, seqrec.owned_column);
      IF seqrec.last_value IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, %s, true)', format('%I.%I', seqrec.seq_schema, seqrec.seq_name), seqrec.last_value);
      END IF;
    END IF;
  END LOOP;

  FOR defrec IN SELECT * FROM archive._column_defaults
                WHERE migration_version = '20261119100000'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s',
                   defrec.schema_name, defrec.table_name, defrec.column_name, defrec.default_expr);
  END LOOP;

  FOR polrec IN SELECT * FROM archive._rls_policy_snapshot
                WHERE migration_version = '20261119100000'
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

  FOR fkrec IN SELECT * FROM archive._fk_snapshot
               WHERE migration_version = '20261119100000'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
                     fkrec.src_schema, fkrec.src_table, fkrec.conname, fkrec.condef);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;

  FOR viewrec IN SELECT * FROM archive._view_snapshot
                 WHERE migration_version = '20261119100000'
  LOOP
    IF viewrec.object_kind = 'm' THEN
      EXECUTE format('CREATE MATERIALIZED VIEW %I.%I AS %s',
                     viewrec.view_schema, viewrec.view_name, viewrec.view_def);
    ELSE
      EXECUTE format('CREATE VIEW %I.%I AS %s',
                     viewrec.view_schema, viewrec.view_name, viewrec.view_def);
    END IF;
  END LOOP;
END
$rollback$;
