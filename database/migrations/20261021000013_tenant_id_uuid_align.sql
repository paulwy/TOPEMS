-- =============================================================
-- 租户列类型统一：tenant_id varchar -> uuid
--
-- 背景：web 契约实跑中 notification / integration / mobile 等端点 500：
--   - operator does not exist: character varying = uuid（RLS 策略按 uuid 比较）
--   - decode column "tenant_id": Rust Uuid 与 SQL VARCHAR 不兼容
-- 存量脏值仅为字面量 'default' 与空串，统一回填为默认租户
-- 00000000-0000-0000-0000-000000000001（20261021000005 已播种）。
--
-- 注意：PostgreSQL 禁止直接改「被 RLS 策略引用」的列类型，
-- 需先摘除策略、改类型、再按原定义重建（表达式中的 ::uuid / ::text 在改后仍兼容）。
-- =============================================================

DO $$
DECLARE
    r record;
    p record;
    v_default uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS _tenant_policy_backup (
        schemaname text,
        tablename text,
        policyname text,
        cmd text,
        permissive text,
        roles text,
        qual text,
        with_check text
    ) ON COMMIT DROP;
    TRUNCATE _tenant_policy_backup;

    FOR r IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.column_name = 'tenant_id'
          AND c.data_type = 'character varying'
    LOOP
        -- 1) 备份并摘除该表全部 RLS 策略
        INSERT INTO _tenant_policy_backup
        SELECT pol.schemaname, pol.tablename, pol.policyname, pol.cmd,
               pol.permissive, array_to_string(pol.roles, '","'), pol.qual, pol.with_check
        FROM pg_policies pol
        WHERE pol.schemaname = r.table_schema AND pol.tablename = r.table_name;

        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.table_schema AND tablename = r.table_name
        LOOP
            EXECUTE format('DROP POLICY %I ON %I.%I',
                           p.policyname, r.table_schema, r.table_name);
        END LOOP;

        -- 2) 清洗脏值并改类型（默认值随类型重建）
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id DROP DEFAULT',
                       r.table_schema, r.table_name);
        EXECUTE format($f$
            UPDATE %I.%I
               SET tenant_id = %L
             WHERE tenant_id = ''
                OR tenant_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        $f$, r.table_schema, r.table_name, v_default);
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid',
                       r.table_schema, r.table_name);
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id SET DEFAULT %L::uuid',
                       r.table_schema, r.table_name, v_default);

        -- 3) 按备份原样重建策略
        FOR p IN
            SELECT * FROM _tenant_policy_backup
            WHERE schemaname = r.table_schema AND tablename = r.table_name
        LOOP
            EXECUTE format(
                'CREATE POLICY %I ON %I.%I AS %s FOR %s TO "%s"%s%s',
                p.policyname, r.table_schema, r.table_name,
                lower(p.permissive), p.cmd, p.roles,
                CASE WHEN p.qual IS NOT NULL THEN ' USING (' || p.qual || ')' ELSE '' END,
                CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK (' || p.with_check || ')' ELSE '' END
            );
        END LOOP;
    END LOOP;
END $$;
