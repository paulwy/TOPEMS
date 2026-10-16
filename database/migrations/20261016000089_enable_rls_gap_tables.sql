-- 20261016000089: 补齐含 tenant_id 但未启用 RLS 的表（隔离完整性收尾）
-- 背景：全库核查发现有 tenant_id 列但未启用 RLS 的表 83 张（公共/快照/EHS 旧套/core 平台表等），
-- 均为空表（rows=0），属预留/契约对齐建表。为隔离完整性统一补齐：
--   启用 RLS + FORCE + rls_tenant_isolation 策略（模板与既有表一致，USING=WITH CHECK）。
-- 跳过：spatial_ref_sys（PostGIS 系统表）、_archive_*（归档只读）、_sqlx_migrations（登记表）、
--       *_backup_20260919 / qa_lab_samples_merge_backup_20260919（备份表）。

DO $$
DECLARE
    r record;
    pol_expr text := $POL$
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    $POL$;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
        WHERE c.column_name = 'tenant_id'
          AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
        GROUP BY c.table_schema, c.table_name
        EXCEPT
        SELECT n.nspname, c2.relname
        FROM pg_class c2
        JOIN pg_namespace n ON c2.relnamespace = n.oid
        WHERE c2.relrowsecurity = true
    LOOP
        IF r.table_name = 'spatial_ref_sys'
           OR r.table_name LIKE '\_archive\_%'
           OR r.table_name = '_sqlx_migrations'
           OR r.table_name LIKE '%backup%'
        THEN
            CONTINUE;
        END IF;
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.table_schema, r.table_name);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.table_schema, r.table_name);
        IF NOT EXISTS (
            SELECT 1 FROM pg_policy p
            WHERE p.polrelid = format('%I.%I', r.table_schema, r.table_name)::regclass
              AND p.polname = 'rls_tenant_isolation'
        ) THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.table_schema, r.table_name, pol_expr, pol_expr
            );
            RAISE NOTICE 'RLS enabled: %.%', r.table_schema, r.table_name;
        END IF;
    END LOOP;
END $$;
