-- ⚠️ 未应用至 prod，需在 pool 租户上下文收敛完成后执行。
-- 当前状态：仅在演练库 `topems_p0_rehearsal` 验证通过（策略 1066→867，FORCE 858→867，残留豁免 0）。
-- 阻塞原因：`svc/` 中有 2398 处 `&state.pool` / `&self.pool` 直查直写运行在没有 `app.tenant_id`
--   的 pool 连接上；fail-closed 后这些路径会静默返回 0 行（已实测 MES kanban 22→0）。
--   必须先完成 B 阶段（pool 租户上下文收敛），再按已验证模块的表子集分期应用。
-- 存放位置：`database/migrations_deferred/`，不在 `database/migrations/`，避免 migrate 时被自动应用。
--
-- P0 地基：RLS 收紧 fail-closed（A 类 + B 类 + 7 张未 FORCE 表 + 特例）
--
-- 目标谓词（每表一条 rls_tenant_isolation，FOR ALL）：
--   NULLIF(current_setting('app.tenant_id', true), '')::uuid = '000...000'::uuid
--   OR <tenant_col> = NULLIF(current_setting('app.tenant_id', true), '')::uuid
--   - GUC 未设 / 被 RESET 成空串 → 两侧为 NULL → 不命中（fail-closed）
--   - GUC = nil → 全量（超管 / 服务身份）
--   - 普通租户 → 仅本租户
-- 注意必须用 NULLIF(...,'')：unified-core 的 RESET 回落为空串而非 NULL。
--
-- 不含 C 类 184 张（见 database/migrations_deferred/，待下一窗口）
-- 不含 E 类 62 张无租户列表（保持 allow_all，登记为全局表）
--
-- 幂等：先 DROP 全部旧策略再重建；重复执行结果一致。

DO $$
DECLARE
    r record;
    v_pred text;
    v_pols text[];
    v_pol text;
    v_processed int := 0;
BEGIN
    -- 0) 清理挂在未启用 RLS 表上的悬空策略（不改变访问行为）
    DROP POLICY IF EXISTS gis_allow_all_track_positions ON gis.track_positions;

    -- 1) A/B 类：有租户列，且存在引用 app.tenant_id 的策略
    FOR r IN
        SELECT c.oid AS relid, n.nspname AS sch, c.relname AS tbl,
               CASE WHEN EXISTS (
                   SELECT 1 FROM information_schema.columns col
                   WHERE col.table_schema = n.nspname
                     AND col.table_name = c.relname
                     AND col.column_name = 'tenant_id')
               THEN 'tenant_id' ELSE 'tenant_uid' END AS tcol
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND c.relrowsecurity
          AND n.nspname NOT IN ('pg_catalog', 'information_schema')
          AND (n.nspname || '.' || c.relname) NOT IN (
              'public.core_sessions',
              'public.core_refresh_tokens',
              'public.core_menus',
              'public.core_menu_groups')
          AND EXISTS (
              SELECT 1 FROM information_schema.columns col
              WHERE col.table_schema = n.nspname
                AND col.table_name = c.relname
                AND col.column_name IN ('tenant_id', 'tenant_uid'))
          AND EXISTS (
              SELECT 1 FROM pg_policy p
              WHERE p.polrelid = c.oid
                AND pg_get_expr(p.polqual, p.polrelid) LIKE '%app.tenant_id%')
        ORDER BY 1
    LOOP
        v_pred := format(
            $p$(NULLIF(current_setting('app.tenant_id', true), ''))::uuid = '00000000-0000-0000-0000-000000000000'::uuid
             OR %I = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid$p$,
            r.tcol);

        SELECT coalesce(array_agg(polname), ARRAY[]::text[]) INTO v_pols
        FROM pg_policy WHERE polrelid = r.relid;

        FOREACH v_pol IN ARRAY v_pols LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_pol, r.sch, r.tbl);
        END LOOP;

        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON %I.%I FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
            r.sch, r.tbl, v_pred, v_pred);
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format(
            'COMMENT ON POLICY rls_tenant_isolation ON %I.%I IS %L',
            r.sch, r.tbl,
            'P0 fail-closed (20261106120100): tenant match or nil superuser; unset GUC denies all');
        v_processed := v_processed + 1;
    END LOOP;

    IF v_processed < 600 THEN
        RAISE EXCEPTION 'P0 abort: only % tenant tables matched (expected >= 600)', v_processed;
    END IF;
    RAISE NOTICE 'P0 fail-closed: % tenant tables rewritten', v_processed;

    -- 2) 全局菜单表：登记例外。实测 423/122 行全部归属租户 0001，但产品语义是
    --    "所有租户共用同一棵菜单树"；若按租户收紧，非 0001 租户会看不到任何菜单。
    --    与 auth 两表一样，用显式 allow_all 替代此前的隐式放行，并在清单中登记。
    FOR r IN
        SELECT n.nspname AS sch, c.relname AS tbl, c.oid AS relid
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND (n.nspname || '.' || c.relname) IN ('public.core_menus', 'public.core_menu_groups')
    LOOP
        SELECT coalesce(array_agg(polname), ARRAY[]::text[]) INTO v_pols
        FROM pg_policy WHERE polrelid = r.relid;
        FOREACH v_pol IN ARRAY v_pols LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_pol, r.sch, r.tbl);
        END LOOP;
        EXECUTE format(
            'CREATE POLICY menu_global_allow_all ON %I.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',
            r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format(
            'COMMENT ON POLICY menu_global_allow_all ON %I.%I IS %L',
            r.sch, r.tbl,
            'P0 registered exception: shared menu tree, rows are tenant 0001 but visible to all tenants');
    END LOOP;

    -- 3) auth 引导表：登记例外。登录/刷新/登出按 token_hash 直查且不带租户上下文，
    --    收紧会直接中断认证；显式 allow_all + FORCE，替代此前的"owner 隐式绕过"。
    FOR r IN
        SELECT n.nspname AS sch, c.relname AS tbl, c.oid AS relid
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND (n.nspname || '.' || c.relname) IN ('public.core_sessions', 'public.core_refresh_tokens')
    LOOP
        SELECT coalesce(array_agg(polname), ARRAY[]::text[]) INTO v_pols
        FROM pg_policy WHERE polrelid = r.relid;
        FOREACH v_pol IN ARRAY v_pols LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', v_pol, r.sch, r.tbl);
        END LOOP;
        EXECUTE format(
            'CREATE POLICY auth_bootstrap_allow_all ON %I.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',
            r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.sch, r.tbl);
        EXECUTE format(
            'COMMENT ON POLICY auth_bootstrap_allow_all ON %I.%I IS %L',
            r.sch, r.tbl,
            'P0 registered exception: auth bootstrap (token_hash lookup) has no tenant context');
    END LOOP;
END $$;

-- 4) 断言：任何引用 app.tenant_id 的策略都不得再含"未设即豁免"或硬编码租户 0001。
DO $assert$
DECLARE
    v_bad int;
    v_noforce int;
BEGIN
    SELECT count(*) INTO v_bad
    FROM pg_policy
    WHERE pg_get_expr(polqual, polrelid) LIKE '%current_setting%'
      AND (
          pg_get_expr(polqual, polrelid) LIKE '% IS NULL%'
          OR pg_get_expr(polqual, polrelid) LIKE '%00000000-0000-0000-0000-000000000001%'
      );
    IF v_bad > 0 THEN
        RAISE EXCEPTION 'P0 assertion failed: % policy(ies) still contain unset/empty exemption or hardcoded tenant 0001', v_bad;
    END IF;

    SELECT count(*) INTO v_noforce
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND (n.nspname || '.' || c.relname) IN (
          'public.core_sessions', 'public.core_refresh_tokens',
          'ehs.qa_ehs_compliance_evaluations', 'ehs.qa_ehs_discharge_permits',
          'ehs.qa_ehs_env_monitor_records', 'ehs.qa_ehs_environment_incidents',
          'ehs.qa_ehs_environmental_regulations', 'lims.qa_lims_analytes', 'mes.work_orders')
      AND NOT c.relforcerowsecurity;
    IF v_noforce > 0 THEN
        RAISE EXCEPTION 'P0 assertion failed: % targeted table(s) still lack FORCE ROW LEVEL SECURITY', v_noforce;
    END IF;
END $assert$;
