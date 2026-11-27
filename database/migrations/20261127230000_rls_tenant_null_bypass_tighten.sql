-- 20261127230000: 收紧 RLS 策略里的「tenant_id IS NULL」旁路（仅限零 NULL 行的标准模板策略）
--
-- 背景：`public._sqlx_migrations` 之外，全库 RLS 策略普遍写成
--   ((tenant_id = NULLIF(current_setting('app.tenant_id'),'')::uuid)
--    OR (tenant_id IS NULL)
--    OR (NULLIF(current_setting('app.tenant_id'),'') = '00000000-...-000000000000'))
-- 其中 `tenant_id IS NULL` 是「无租户行对所有租户可见」的旁路。只要表里出现一行 tenant_id 为空的记录，
--   任何租户都能读到它（写也同样放行）。20261127190000 已对 mes.work_stations / mes.production_orders
--   手工收口，本条对全库做同类收口。
--
-- 收口范围（三重过滤，缺一不可）：
--   1) 列 tenant_id 当前可空（NOT NULL 的表该分支本来就是死代码，不动）；
--   2) 该表当前 tenant_id IS NULL 的行数 = 0（有 NULL 行的表留给业务判定，本条一律跳过）；
--   3) 策略名属于标准模板 tenant_isolation_* / rls_tenant_isolation，且表达式确实是上面那套模板
--      （含 NULLIF(current_setting('app.tenant_id'::text) ...)）。
--   刻意豁免（不动）：`*_public_read` / `rls_platform_read` / `rls_global_read` / `*_platform_maintain`
--      这类「平台共享主数据 / 平台级配置」策略，其 tenant_id IS NULL 是有意为之（erp 主数据共享、
--      core_menus 平台菜单、system_settings/monitor_settings 平台行），移除会把共享数据变成不可见。
--
-- 语义变化：仅删除 ` OR (tenant_id IS NULL)` 片段，其余判定逐字保留 → 对「当前 0 行 NULL」的表，
--   行为与今日完全一致（该分支从未命中），但旁路从此关闭，未来即使写入 NULL 行也不会跨租户可见。
--
-- 幂等：候选按运行时目录发现；已无该片段的策略自动落选；重复执行 NO-OP。
--
-- 回滚：database/rollback/20261127230000_rls_tenant_null_bypass_tighten.rollback.sql
--   从 archive.rls_policy_before_20261127 还原原始 qual / with_check。
--
-- 事务：由 scripts/migration/apply-forward.sh 单事务执行，本文件不含 BEGIN/COMMIT。

SET LOCAL search_path = pg_catalog, public, pg_temp;

CREATE TABLE IF NOT EXISTS archive.rls_policy_before_20261127 (
  schemaname text NOT NULL,
  tablename  text NOT NULL,
  policyname text NOT NULL,
  qual_before text,
  with_check_before text,
  snapshotted_at timestamptz NOT NULL DEFAULT now(),
  batch text NOT NULL DEFAULT 'RLS-NULL-BYPASS-20261127',
  PRIMARY KEY (schemaname, tablename, policyname)
);

DO $$
DECLARE
    r record;
    n_zero bigint;
    n_fixed int := 0;
    n_skip_rows int := 0;
    n_skip_pattern int := 0;
    new_qual text;
    new_check text;
BEGIN
    FOR r IN
        SELECT p.schemaname AS sch, p.tablename AS tbl, p.policyname AS pol,
               p.qual, p.with_check
        FROM pg_policies p
        JOIN information_schema.columns c
          ON c.table_schema = p.schemaname AND c.table_name = p.tablename
         AND c.column_name = 'tenant_id' AND c.is_nullable = 'YES'
        WHERE (p.policyname LIKE 'tenant_isolation%' OR p.policyname = 'rls_tenant_isolation')
          AND (coalesce(p.qual,'') || coalesce(p.with_check,'')) ILIKE '%tenant_id is null%'
        ORDER BY 1, 2, 3
    LOOP
        -- 模板校验：必须是标准 app.tenant_id 模板，否则不猜、不动物
        IF coalesce(r.qual,'') NOT LIKE '%NULLIF(current_setting(''app.tenant_id''::text)%'
           AND coalesce(r.with_check,'') NOT LIKE '%NULLIF(current_setting(''app.tenant_id''::text)%' THEN
            RAISE NOTICE 'skip 非标准模板：%.%.%', r.sch, r.tbl, r.pol;
            n_skip_pattern := n_skip_pattern + 1;
            CONTINUE;
        END IF;

        -- 0 NULL 行断言（有 NULL 行 → 业务判定，跳过）
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl) INTO n_zero;
        IF n_zero <> 0 THEN
            RAISE NOTICE 'skip 有 % 行 tenant_id 为空，留待业务判定：%.%', n_zero, r.sch, r.tbl;
            n_skip_rows := n_skip_rows + 1;
            CONTINUE;
        END IF;

        new_qual  := regexp_replace(coalesce(r.qual,''),       ' OR \(tenant_id IS NULL\)', '', 'gi');
        new_check := regexp_replace(coalesce(r.with_check,''), ' OR \(tenant_id IS NULL\)', '', 'gi');

        IF new_qual = coalesce(r.qual,'') AND new_check = coalesce(r.with_check,'') THEN
            RAISE NOTICE 'skip 未命中片段：%.%.%', r.sch, r.tbl, r.pol;
            n_skip_pattern := n_skip_pattern + 1;
            CONTINUE;
        END IF;

        INSERT INTO archive.rls_policy_before_20261127 (schemaname, tablename, policyname, qual_before, with_check_before)
        VALUES (r.sch, r.tbl, r.pol, r.qual, r.with_check)
        ON CONFLICT (schemaname, tablename, policyname) DO UPDATE
          SET qual_before = EXCLUDED.qual_before,
              with_check_before = EXCLUDED.with_check_before,
              snapshotted_at = now();

        IF r.with_check IS NULL THEN
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', r.pol, r.sch, r.tbl, new_qual);
        ELSE
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)', r.pol, r.sch, r.tbl, new_qual, new_check);
        END IF;

        n_fixed := n_fixed + 1;
        RAISE NOTICE 'tightened %.%.%', r.sch, r.tbl, r.pol;
    END LOOP;

    RAISE NOTICE '完成：收紧 % 条策略，跳过（有 NULL 行）% 条，跳过（非标准模板/未命中）% 条', n_fixed, n_skip_rows, n_skip_pattern;
END $$;

-- 后置断言：仍带 tenant_id IS NULL 的「标准模板策略」只允许出现在仍有 NULL 行的表上
DO $$
DECLARE
    bad text;
    n_zero bigint;
    r record;
BEGIN
    FOR r IN
        SELECT p.schemaname AS sch, p.tablename AS tbl, p.policyname AS pol
        FROM pg_policies p
        JOIN information_schema.columns c
          ON c.table_schema = p.schemaname AND c.table_name = p.tablename
         AND c.column_name = 'tenant_id' AND c.is_nullable = 'YES'
        WHERE (p.policyname LIKE 'tenant_isolation%' OR p.policyname = 'rls_tenant_isolation')
          AND coalesce(p.qual,'') LIKE '%(tenant_id IS NULL)%'
          AND coalesce(p.qual,'') LIKE '%NULLIF(current_setting(''app.tenant_id''::text)%'
        ORDER BY 1, 2, 3
    LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl) INTO n_zero;
        IF n_zero = 0 THEN
            bad := coalesce(bad || ', ', '') || format('%s.%s(%s)', r.sch, r.tbl, r.pol);
        END IF;
    END LOOP;
    IF bad IS NOT NULL THEN
        RAISE EXCEPTION '后置断言失败：以下零 NULL 行表的策略仍带旁路：%', bad;
    END IF;
    RAISE NOTICE '后置断言通过：零 NULL 行表已无 tenant_id IS NULL 旁路';
END $$;
