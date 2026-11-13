-- ============================================================
-- W7 · B4-EHS：ehs 全 schema RLS 策略收敛为 fail-closed
-- 版本：20261112190000
--
-- 背景（见 docs/quality/w7-b4-ehs-plan-2026-11-12.md §1）：
--   1. ehs 71 张表里 70 张带 tenant_id，但策略形状极不统一：
--      17 条 true/true 全放行、20 张 fail-open（IS NULL / = '' / nil 分支 / ::text）、
--      6 张双策略并存；5 张只 ENABLE 未 FORCE，且所有策略都没有 WITH CHECK。
--   2. 这 5 张表的属主就是生产应用用户 topems_prod（rolsuper=false/rolbypassrls=false），
--      FORCE=false 时属主完全绕过 RLS —— 等于没有保护。
--   3. 31 张租户表 RLS 关闭（含 10 张仅声明、无运行时 SQL 的空占位表，本笔一并开启，
--      不因“当前没人用”跳过）。
--   4. schema_defense_ledger 无 tenant_id，是系统账本；门禁禁止对其 ENABLE/FORCE，
--      本笔不触碰（保持 RLS 关闭、0 策略）。
--
-- 本笔统一（70 张租户表）：
--   1. DROP 每张 ehs 表的全部既有策略；
--   2. ENABLE + FORCE ROW LEVEL SECURITY；
--   3. CREATE POLICY rls_tenant_isolation FOR ALL
--        USING      (系统通道 OR tenant_id = 当前租户)
--        WITH CHECK (同形)
--      系统通道 = `app.rls_system='on'`（仅 shared-db scope_system / 服务身份），
--      当前租户 = `app.tenant_id`（tenant_middleware 每请求 set_config，空串视为未设）。
--      不含 `tenant_id IS NULL`、`= ''`、nil 分支、`::text`。
--
-- qa_ehs_sync_records：按租户收口，不开系统通道。写入点先验结论见方案附录 E
--   （QMS/LIMS 对该表写入点 = 0；EHS 侧仅 data_sync retry/delete 两处变更，
--    路由在 tenant_middleware 之后，改为从请求上下文取租户）。
--
-- 可重复执行；形状不符或存在 tenant_id IS NULL 行时整笔 ROLLBACK。
--
-- 回滚：database/rollback/20261112190000_w7_b4_ehs_rls_fail_closed.rollback.sql
--   （按生产基线 45 条策略快照逐表重建；不提供 DISABLE RLS 路径）
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------- 前置断言 ----------
DO $w7b4ehs_pre$
DECLARE
    n_tables int;
    n_tenant int;
    extra_missing text;
    bad_unforced text;
    n_policies int;
BEGIN
    SELECT count(*) INTO n_tables
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'ehs' AND c.relkind = 'r';

    IF n_tables <> 71 THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：ehs 表数为 %，期望 71', n_tables;
    END IF;

    SELECT count(*) INTO n_tenant
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      JOIN information_schema.columns col
        ON col.table_schema = 'ehs'
       AND col.table_name = c.relname
       AND col.column_name = 'tenant_id'
     WHERE ns.nspname = 'ehs' AND c.relkind = 'r';

    IF n_tenant <> 70 THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：含 tenant_id 的表为 %，期望 70', n_tenant;
    END IF;

    -- 缺 tenant_id 的只允许 schema_defense_ledger
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
      INTO extra_missing
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'ehs'
       AND c.relkind = 'r'
       AND c.relname <> 'schema_defense_ledger'
       AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'ehs'
              AND col.table_name = c.relname
              AND col.column_name = 'tenant_id'
       );

    IF extra_missing IS NOT NULL THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：以下 ehs 表缺 tenant_id 列 → %', extra_missing;
    END IF;

    -- 已 ENABLE 但未 FORCE 的表只允许基线那 5 张（迁移可重复执行：全 FORCE 后为空）
    SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
      INTO bad_unforced
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'ehs'
       AND c.relkind = 'r'
       AND c.relrowsecurity
       AND NOT c.relforcerowsecurity
       AND c.relname NOT IN (
           'qa_ehs_compliance_evaluations',
           'qa_ehs_discharge_permits',
           'qa_ehs_env_monitor_records',
           'qa_ehs_environment_incidents',
           'qa_ehs_environmental_regulations'
       );

    IF bad_unforced IS NOT NULL THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：出现名单外未 FORCE 表 → %', bad_unforced;
    END IF;

    -- 策略总数只允许基线 45 或收敛后 70（重复执行）
    SELECT count(*) INTO n_policies FROM pg_policies WHERE schemaname = 'ehs';
    IF n_policies NOT IN (45, 70) THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：ehs 策略数为 %，期望 45（基线）或 70（已收敛）', n_policies;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'ehs'
           AND table_name = 'schema_defense_ledger'
           AND column_name = 'tenant_id'
    ) THEN
        RAISE EXCEPTION 'B4-EHS 前置不满足：schema_defense_ledger 不应有 tenant_id 列';
    END IF;
END
$w7b4ehs_pre$;

-- ---------- 策略重建（70 张租户表，含 10 张空占位表） ----------
DO $w7b4ehs_apply$
DECLARE
    t record;
    pol record;
    n_tables int := 0;
BEGIN
    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
          JOIN information_schema.columns col
            ON col.table_schema = 'ehs'
           AND col.table_name = c.relname
           AND col.column_name = 'tenant_id'
         WHERE ns.nspname = 'ehs' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        FOR pol IN
            SELECT policyname FROM pg_policies
             WHERE schemaname = 'ehs' AND tablename = t.relname
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON ehs.%I', pol.policyname, t.relname);
        END LOOP;

        EXECUTE format('ALTER TABLE ehs.%I ENABLE ROW LEVEL SECURITY', t.relname);
        EXECUTE format('ALTER TABLE ehs.%I FORCE ROW LEVEL SECURITY', t.relname);
        EXECUTE format(
            'CREATE POLICY rls_tenant_isolation ON ehs.%I FOR ALL TO PUBLIC '
            'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
            '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) '
            'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
            '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
            t.relname
        );

        n_tables := n_tables + 1;
    END LOOP;

    RAISE NOTICE 'B4-EHS 已收敛 % 张租户表为 fail-closed', n_tables;
END
$w7b4ehs_apply$;

-- ---------- 形状自检 ----------
DO $w7b4ehs_verify$
DECLARE
    r record;
    bad int := 0;
    n_policies int;
    detail text;
BEGIN
    SELECT count(*) INTO n_policies FROM pg_policies WHERE schemaname = 'ehs';
    IF n_policies <> 70 THEN
        RAISE EXCEPTION 'B4-EHS 校验失败：策略总数为 %，期望 70', n_policies;
    END IF;

    FOR r IN
        SELECT c.relname,
               c.relrowsecurity,
               c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname) AS pols,
               (SELECT p.policyname FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname LIMIT 1) AS polname,
               (SELECT p.cmd FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname LIMIT 1) AS cmd,
               (SELECT p.permissive FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname LIMIT 1) AS permissive,
               (SELECT p.qual FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname LIMIT 1) AS qual,
               (SELECT p.with_check FROM pg_policies p
                 WHERE p.schemaname = 'ehs' AND p.tablename = c.relname LIMIT 1) AS wc
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
          JOIN information_schema.columns col
            ON col.table_schema = 'ehs'
           AND col.table_name = c.relname
           AND col.column_name = 'tenant_id'
         WHERE ns.nspname = 'ehs' AND c.relkind = 'r'
    LOOP
        detail := format('%s rls=%s force=%s pols=%s name=%s cmd=%s',
                         r.relname, r.relrowsecurity, r.relforcerowsecurity,
                         r.pols, r.polname, r.cmd);

        IF NOT r.relrowsecurity OR NOT r.relforcerowsecurity
           OR r.pols <> 1 OR r.polname <> 'rls_tenant_isolation'
           OR r.cmd <> 'ALL' OR r.permissive <> 'PERMISSIVE'
           OR r.qual IS NULL OR r.wc IS NULL OR r.qual <> r.wc THEN
            RAISE WARNING 'B4-EHS 校验异常: %', detail;
            bad := bad + 1;
            CONTINUE;
        END IF;

        IF r.qual NOT LIKE '%app.rls_system%' OR r.qual NOT LIKE '%app.tenant_id%' THEN
            RAISE WARNING 'B4-EHS 校验异常: % 策略缺通道', r.relname;
            bad := bad + 1;
            CONTINUE;
        END IF;

        -- fail-open 残留
        IF r.qual LIKE '%IS NULL%'
           OR r.qual LIKE '%00000000-0000-0000-0000-000000000000%' THEN
            RAISE WARNING 'B4-EHS 校验异常: % 仍含 fail-open 分支', r.relname;
            bad := bad + 1;
        END IF;
    END LOOP;

    -- schema_defense_ledger 必须保持关闭且 0 策略
    IF EXISTS (
        SELECT 1 FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'ehs' AND c.relname = 'schema_defense_ledger'
           AND (c.relrowsecurity OR c.relforcerowsecurity)
    ) THEN
        RAISE EXCEPTION 'B4-EHS 校验失败：schema_defense_ledger 不应启用 RLS';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'ehs' AND tablename = 'schema_defense_ledger') THEN
        RAISE EXCEPTION 'B4-EHS 校验失败：schema_defense_ledger 不应有策略';
    END IF;

    IF bad > 0 THEN
        RAISE EXCEPTION 'B4-EHS 校验失败：% 处异常（见上方 WARNING）', bad;
    END IF;
END
$w7b4ehs_verify$;

-- ---------- 租户归属自查（只读；出现 NULL 即中止，禁止静默回填） ----------
DO $w7b4ehs_audit$
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
            ON col.table_schema = 'ehs'
           AND col.table_name = c.relname
           AND col.column_name = 'tenant_id'
         WHERE ns.nspname = 'ehs' AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        EXECUTE format('SELECT count(*) FROM ehs.%I WHERE tenant_id IS NULL', t.relname) INTO n;
        IF n > 0 THEN
            msg := msg || format('%s=%s ', t.relname, n);
        END IF;
    END LOOP;

    IF msg <> '' THEN
        RAISE EXCEPTION 'B4-EHS 租户自查失败：存在 tenant_id IS NULL 行 → %（需人工裁决，禁止自动回填）', msg;
    END IF;

    RAISE NOTICE 'B4-EHS 租户自查：全部租户表 tenant_id IS NULL 行数 = 0';
END
$w7b4ehs_audit$;
