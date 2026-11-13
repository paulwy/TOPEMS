-- ============================================================
-- W7 · B4-WMS：WMS 全表 RLS 策略收敛为 fail-closed（前向承接补丁）
-- 版本：20261113100000
--
-- 背景：
--   原迁移 20261112105000_w7_b4_wms_rls_fail_closed.sql 从未投递到生产
--   （11-12 窗口仅以单文件方式应用了 20261112160000，生产账本无 105000）。
--   生产账本 max 已到 20261112190000，按仓库纪律 version <= 账本 max 不得
--   in-place 重放，故以本前向补丁复刻 105000 的最终效果：
--   1. DROP 全部既有策略；
--   2. ENABLE + FORCE ROW LEVEL SECURITY（schema_defense_ledger 仅 ENABLE）；
--   3. CREATE POLICY rls_tenant_isolation FOR ALL
--        USING      (系统通道 OR tenant_id = 当前租户)
--        WITH CHECK (同形)
--      系统通道 = `app.rls_system='on'`，当前租户 = `app.tenant_id`
--      （tenant_middleware 每请求 set_config，空串视为未设）。
--   4. schema_defense_ledger：ENABLE + NO FORCE，仅系统通道。
--   5. wms_master_data_refs：ENABLE + FORCE，仅系统通道（fail-closed）。
--
-- 前置断言与形状自检与原迁移一致：表数 39、带 tenant_id 表数 37、
-- 缺列集恰为 {schema_defense_ledger, wms_master_data_refs}、tenant_id 全为 uuid。
-- 断言失败即 RAISE EXCEPTION，整笔回滚。
--
-- 可重复执行。形状不符或存在 tenant_id IS NULL 行时整笔 ROLLBACK。
--
-- 回滚：database/rollback/20261113100000_w7_b4_wms_rls_fail_closed_forward.rollback.sql
--   （按生产基线快照逐表重建原策略；不提供 DISABLE RLS 路径）
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- ---------- 前置断言 ----------
DO $w7b4wms_pre$
DECLARE
    n_tables int;
    n_tenant_tables int;
    n_bad_type int;
    extra_missing text;
BEGIN
    SELECT count(*) INTO n_tables
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'wms' AND c.relkind = 'r';

    IF n_tables <> 39 THEN
        RAISE EXCEPTION 'B4-WMS 前置不满足：wms 表数为 %，期望 39', n_tables;
    END IF;

    -- 允许缺 tenant_id 的只有系统账本与 master_data_refs；其它表缺列直接中止。
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
      INTO extra_missing
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'wms'
       AND c.relkind = 'r'
       AND c.relname NOT IN ('schema_defense_ledger', 'wms_master_data_refs')
       AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'wms'
              AND col.table_name = c.relname
              AND col.column_name = 'tenant_id'
       );

    IF extra_missing IS NOT NULL THEN
        RAISE EXCEPTION 'B4-WMS 前置不满足：以下 wms 表缺 tenant_id 列 → %', extra_missing;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'wms'
           AND table_name = 'schema_defense_ledger'
           AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'B4-WMS 前置不满足：schema_defense_ledger 不应有 tenant_id 列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'wms'
           AND table_name = 'wms_master_data_refs'
           AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE 'B4-WMS 注意：当前库 wms_master_data_refs 已有 tenant_id（历史漂移），仍按系统通道收敛';
    END IF;

    SELECT count(*) INTO n_tenant_tables
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'wms'
       AND c.relkind = 'r'
       AND EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'wms'
              AND col.table_name = c.relname
              AND col.column_name = 'tenant_id'
       );

    IF n_tenant_tables <> 37 THEN
        RAISE EXCEPTION 'B4-WMS 前置不满足：带 tenant_id 的 wms 表数为 %，期望 37', n_tenant_tables;
    END IF;

    SELECT count(*) INTO n_bad_type
      FROM information_schema.columns
     WHERE table_schema = 'wms'
       AND column_name = 'tenant_id'
       AND udt_name <> 'uuid';

    IF n_bad_type <> 0 THEN
        RAISE EXCEPTION 'B4-WMS 前置不满足：% 张表的 tenant_id 不是 uuid 类型', n_bad_type;
    END IF;
END
$w7b4wms_pre$;

-- ---------- 策略重建 ----------
DO $w7b4wms_apply$
DECLARE
    t record;
    pol record;
    n_tables int := 0;
    n_tenant int := 0;
    n_system int := 0;
BEGIN
    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        FOR pol IN
            SELECT policyname FROM pg_policies
             WHERE schemaname = 'wms' AND tablename = t.relname
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON wms.%I', pol.policyname, t.relname);
        END LOOP;

        EXECUTE format('ALTER TABLE wms.%I ENABLE ROW LEVEL SECURITY', t.relname);

        IF t.relname = 'schema_defense_ledger' THEN
            EXECUTE format('ALTER TABLE wms.%I NO FORCE ROW LEVEL SECURITY', t.relname);
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON wms.%I FOR ALL TO PUBLIC '
                'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'') '
                'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'')',
                t.relname
            );
            n_system := n_system + 1;
        ELSIF t.relname = 'wms_master_data_refs' THEN
            EXECUTE format('ALTER TABLE wms.%I FORCE ROW LEVEL SECURITY', t.relname);
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON wms.%I FOR ALL TO PUBLIC '
                'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'') '
                'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'')',
                t.relname
            );
            n_system := n_system + 1;
        ELSE
            EXECUTE format('ALTER TABLE wms.%I FORCE ROW LEVEL SECURITY', t.relname);
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON wms.%I FOR ALL TO PUBLIC '
                'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) '
                'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
                t.relname
            );
            n_tenant := n_tenant + 1;
        END IF;

        n_tables := n_tables + 1;
    END LOOP;

    RAISE NOTICE 'B4-WMS 已收敛 % 张表：租户表 %，系统通道表 %', n_tables, n_tenant, n_system;
END
$w7b4wms_apply$;

-- ---------- 形状自检 ----------
DO $w7b4wms_verify$
DECLARE
    r record;
    bad int := 0;
    legacy int;
    detail text;
BEGIN
    SELECT count(*) INTO legacy
      FROM pg_policies
     WHERE schemaname = 'wms' AND policyname LIKE 'wms_allow_all_%';
    IF legacy <> 0 THEN
        RAISE EXCEPTION 'B4-WMS 校验失败：仍存在 % 条旧策略（wms_allow_all_*）', legacy;
    END IF;

    FOR r IN
        SELECT c.relname,
               c.relrowsecurity,
               c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = 'wms' AND p.tablename = c.relname) AS pols,
               (SELECT p.policyname FROM pg_policies p
                 WHERE p.schemaname = 'wms' AND p.tablename = c.relname LIMIT 1) AS polname,
               (SELECT p.qual FROM pg_policies p
                 WHERE p.schemaname = 'wms' AND p.tablename = c.relname LIMIT 1) AS qual,
               (SELECT p.with_check FROM pg_policies p
                 WHERE p.schemaname = 'wms' AND p.tablename = c.relname LIMIT 1) AS wc,
               EXISTS (
                   SELECT 1 FROM information_schema.columns col
                    WHERE col.table_schema = 'wms'
                      AND col.table_name = c.relname
                      AND col.column_name = 'tenant_id'
               ) AS has_tenant
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
    LOOP
        detail := format('%s rls=%s force=%s pols=%s name=%s',
                         r.relname, r.relrowsecurity, r.relforcerowsecurity, r.pols, r.polname);

        IF NOT r.relrowsecurity OR r.pols <> 1 OR r.polname <> 'rls_tenant_isolation'
           OR r.qual IS NULL OR r.wc IS NULL OR r.qual <> r.wc THEN
            RAISE WARNING 'B4-WMS 校验异常: %', detail;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.relname <> 'schema_defense_ledger' AND NOT r.relforcerowsecurity THEN
            RAISE WARNING 'B4-WMS 校验异常: % 未 FORCE', r.relname;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.qual NOT LIKE '%app.rls_system%' THEN
            RAISE WARNING 'B4-WMS 校验异常: % 策略缺系统通道', r.relname;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.relname IN ('schema_defense_ledger', 'wms_master_data_refs') THEN
            IF r.qual LIKE '%app.tenant_id%' THEN
                RAISE WARNING 'B4-WMS 校验异常: % 应仅系统通道', r.relname;
                bad := bad + 1;
            END IF;
        ELSIF r.qual NOT LIKE '%app.tenant_id%' THEN
            RAISE WARNING 'B4-WMS 校验异常: % 策略缺租户通道', r.relname;
            bad := bad + 1;
        END IF;

        -- fail-open 残留：IS NULL 放行、uuid=0 放行
        IF r.qual LIKE '%IS NULL%'
           OR r.qual LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE WARNING 'B4-WMS 校验异常: % 仍含 fail-open 分支', r.relname;
            bad := bad + 1;
        END IF;
    END LOOP;

    IF bad > 0 THEN
        RAISE EXCEPTION 'B4-WMS 校验失败：% 处异常（见上方 WARNING）', bad;
    END IF;
END
$w7b4wms_verify$;

-- ---------- 租户归属自查（只读；出现 NULL 即中止，禁止静默回填） ----------
DO $w7b4wms_audit$
DECLARE
    t record;
    n bigint;
    msg text := '';
BEGIN
    PERFORM set_config('app.rls_system', 'on', true);

    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
          JOIN information_schema.columns col
            ON col.table_schema = 'wms'
           AND col.table_name = c.relname
           AND col.column_name = 'tenant_id'
         WHERE ns.nspname = 'wms' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        EXECUTE format('SELECT count(*) FROM wms.%I WHERE tenant_id IS NULL', t.relname) INTO n;
        IF n > 0 THEN
            msg := msg || format('%s=%s ', t.relname, n);
        END IF;
    END LOOP;

    IF msg <> '' THEN
        RAISE EXCEPTION 'B4-WMS 租户自查失败：存在 tenant_id IS NULL 行 → %（需人工裁决，禁止自动回填）', msg;
    END IF;

    RAISE NOTICE 'B4-WMS 租户自查：全部租户表 tenant_id IS NULL 行数 = 0';
END
$w7b4wms_audit$;
