-- 回滚 20261127240000：策略还原 → 回填行改回 NULL → DROP NOT NULL
SET LOCAL search_path = pg_catalog, public, pg_temp;

DO $$
DECLARE
    r record;
    sch text; tbl text; n int := 0;
    n_null int := 0;
BEGIN
    -- 1) 策略：从 20261127230000 建立的通用水位快照表还原
    FOR r IN SELECT * FROM archive.rls_policy_before_20261127 ORDER BY schemaname, tablename, policyname LOOP
        IF r.with_check_before IS NULL THEN
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.policyname, r.schemaname, r.tablename, r.qual_before);
        ELSE
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.policyname, r.schemaname, r.tablename, r.qual_before, r.with_check_before);
        END IF;
        n := n + 1;
    END LOOP;
    RAISE NOTICE '策略还原 % 条', n;

    -- 2) 数据：把本批回填的行改回 NULL（仅限快照里记录过的行）
    FOR r IN SELECT schemaname, tablename FROM archive.rls_backfill_tenant_before_20261127
             GROUP BY schemaname, tablename LOOP
        sch := r.schemaname; tbl := r.tablename;
        IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id DROP NOT NULL', sch, tbl);
        EXECUTE format(
            'UPDATE %I.%I t SET tenant_id = NULL
             FROM archive.rls_backfill_tenant_before_20261127 b
             WHERE b.schemaname = %L AND b.tablename = %L
               AND (to_jsonb(t) - ''tenant_id'') = (b.row_json - ''tenant_id'')',
            sch, tbl, sch, tbl);
        n_null := n_null + 1;
    END LOOP;
    RAISE NOTICE '数据还原 % 张表', n_null;
END $$;
