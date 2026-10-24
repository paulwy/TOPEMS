-- =============================================================
-- 20261016000085: 链内 17 表 tenant_id varchar/text → uuid 收敛
--
-- 背景：
--   20261016000089 动态扫描"有 tenant_id 但未启用 RLS"的表，按
--   `tenant_id = current_setting('app.tenant_id')::uuid` 模板建策略。
--   空库重放实测：integration.erp_connections / erp_mappings /
--   external_erp_sync_logs 三表 tenant_id 为 varchar，CREATE POLICY 时
--   报错 `operator does not exist: character varying = uuid`（089 从未在任何库成功）。
--   同族另 14 表（mobile.oa_* 4 / mes.tenant_permissions / mes.permission_audit_logs /
--   mes.material_plans / master_data.mdm_subscriptions / mdm_usage_records /
--   mdm_billing_records / mdm_sla_measurements / mdm_sla_incidents /
--   public.tenant_permissions / public.permission_audit_logs）tenant_id 仍为
--   varchar/text，但已开 RLS（089 扫描不命中）。若不提前收敛，后续
--   20261021000013 全局收敛按"原策略文本原样重建"，mobile.oa_* 旧策略为
--   text=text 比较，uuid 化后重建即炸。
--
-- 方案（与 20261021000013 同族的防御式模式，提前到 089 之前执行）：
--   1. 动态扫描 tenant_id 为 character varying/text 的 BASE TABLE（即上述 17 表全集，
--      空库实测集合精确一致）；
--   2. 先摘除该表全部既有 RLS 策略（PostgreSQL 不允许直接改被策略引用的列类型；
--      旧 text=text 语义策略在 uuid 化后已失效）；
--   3. DROP DEFAULT → ALTER TYPE uuid（合法 uuid 字符串直转；非法/空串回填全零，
--      保守保留行；空库无数据天然通过）→ SET DEFAULT 主租户 0001；
--   4. 原本已开 RLS 的表，按 089 标准模板重建 rls_tenant_isolation（uuid 表达式）；
--      原本未开 RLS 的表（integration.erp_*）不接管，留给 089 统一开启。
--
-- 幂等：列已是 uuid 后，data_type 守卫不命中，整段循环跳过（可重复执行）。
-- =============================================================

DO $$
DECLARE
    r record;
    p record;
    v_default uuid := '00000000-0000-0000-0000-000000000001';
    v_zero    uuid := '00000000-0000-0000-0000-000000000000';
    pol_expr text := $POL$
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = ''::text)
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    $POL$;
    had_rls boolean;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.column_name = 'tenant_id'
          AND c.data_type IN ('character varying', 'text')
          AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
        GROUP BY c.table_schema, c.table_name
    LOOP
        IF to_regclass(quote_ident(r.table_schema) || '.' || quote_ident(r.table_name)) IS NULL THEN
            CONTINUE;
        END IF;

        SELECT c2.relrowsecurity INTO had_rls
          FROM pg_class c2
          JOIN pg_namespace n ON c2.relnamespace = n.oid
         WHERE n.nspname = r.table_schema AND c2.relname = r.table_name;

        -- 1) 摘除既有策略（被改列引用的策略无法随列改类型；旧 text 语义策略已失效）
        FOR p IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = r.table_schema AND tablename = r.table_name
        LOOP
            EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, r.table_schema, r.table_name);
        END LOOP;

        -- 2) 收敛列类型：合法 uuid 串直转；非法值回填全零；空库天然无数据
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id DROP DEFAULT',
                       r.table_schema, r.table_name);
        EXECUTE format($f$
            ALTER TABLE %I.%I ALTER COLUMN tenant_id TYPE uuid
            USING CASE WHEN tenant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                       THEN tenant_id::uuid
                       ELSE %L::uuid
                  END
        $f$, r.table_schema, r.table_name, v_zero);
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id SET DEFAULT %L::uuid',
                       r.table_schema, r.table_name, v_default);

        -- 3) 原已开 RLS 的表：按 089 标准模板重建 rls_tenant_isolation
        IF had_rls THEN
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL USING (%s) WITH CHECK (%s)',
                r.table_schema, r.table_name, pol_expr, pol_expr
            );
        END IF;
    END LOOP;
END $$;
