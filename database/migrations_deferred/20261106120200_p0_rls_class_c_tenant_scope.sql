-- P0 地基 · C 类：184 张「有租户列但仅 allow_all」表的租户隔离
--
-- 状态：**本轮不执行、不提交**。保留待下一窗口（需先完成 pool 连接 GUC 绑定改造）。
--
-- 背景
--   这批表当前只有 allow_all 策略（历史遗留：建表时就没做租户收缩），
--   P0 窗口只处理 A/B 类（已有 GUC 策略、仅去豁免分支）与特例，风险可控；
--   C 类属于「从全公开 → 按租户隔离」的行为变化，必须单独窗口验证。
--
-- 谓词与 A/B 类完全一致（唯一真相源，勿另起形态）：
--   (NULLIF(current_setting('app.tenant_id', true), ''))::uuid = '000..000'::uuid
--   OR <tenant_col> = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--
-- 前置条件（缺一不可）
--   1) 应用侧所有业务查询已改为 Claims 显式绑定，或连接级 GUC 已可靠设置；
--      否则 fail-closed 下 pool 查询会全部返回 0 行。
--   2) 已复核这 184 张表的历史数据中不存在跨租户共用行（如全局字典）。
--   3) A/B 类窗口已稳定观察，回滚脚本可重放。
--
-- 幂等：先 DROP 全部旧策略再重建。

DO $$
DECLARE
    r record;
    v_pred text;
    v_pols text[];
    v_pol text;
    v_processed int := 0;
BEGIN
    -- 只处理「有租户列 + 已启用 RLS + 没有任何引用 app.tenant_id 的策略」的表；
    -- 已登记的全局/认证例外（core_menus / core_menu_groups / core_sessions /
    -- core_refresh_tokens）必须排除，它们由 P0 主窗口的 allow_all 例外覆盖。
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
          AND NOT EXISTS (
              SELECT 1 FROM pg_policy p
              WHERE p.polrelid = c.oid
                AND pg_get_expr(p.polqual, p.polrelid) LIKE '%current_setting%')
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
            'P0 class-C tenant scope (20261106120200): tenant match or nil superuser; unset GUC denies all');
        v_processed := v_processed + 1;
    END LOOP;

    IF v_processed < 180 THEN
        RAISE EXCEPTION 'P0-C abort: only % class-C tables matched (expected >= 180)', v_processed;
    END IF;
    RAISE NOTICE 'P0-C tenant scope: % class-C tables rewritten', v_processed;
END $$;

-- 断言：改写后不得再有「有租户列、RLS 已启用、却只有 allow_all」的业务表。
DO $assert$
DECLARE
    v_left int;
BEGIN
    SELECT count(*) INTO v_left
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND c.relrowsecurity
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND (n.nspname || '.' || c.relname) NOT IN (
          'public.core_sessions', 'public.core_refresh_tokens',
          'public.core_menus', 'public.core_menu_groups')
      AND EXISTS (
          SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = n.nspname
            AND col.table_name = c.relname
            AND col.column_name IN ('tenant_id', 'tenant_uid'))
      AND NOT EXISTS (
          SELECT 1 FROM pg_policy p
          WHERE p.polrelid = c.oid
            AND pg_get_expr(p.polqual, p.polrelid) LIKE '%current_setting%');
    IF v_left > 0 THEN
        RAISE EXCEPTION 'P0-C assertion failed: % tenant table(s) still only allow_all', v_left;
    END IF;
END $assert$;
