-- ============================================================
-- W7 · B4-WMS：WMS 全表 RLS 策略收敛为 fail-closed
-- 版本：20261112105000
--
-- 背景（见 docs/quality/w7-b4-wms-plan-2026-11-12.md §1）：
--   1. wms 39 张表里 37 张带 tenant_id，但策略形状全部 fail-open：
--      `app.tenant_id IS NULL / = '' / tenant_id IS NULL / true`
--      任一命中即放行；16 条策略是 true/true，13 条只有 USING、没有 WITH CHECK。
--      inventory / inventory_movements / slotting_* 等 5 张表还并存两条策略。
--   2. safety_stock_settings 有 tenant_id 但 RLS 关闭、无策略。
--   3. schema_defense_ledger 无 tenant_id，是系统账本。
--   4. wms_master_data_refs 无 tenant_id（生产基线），且全仓库无代码引用；
--      D4 自查结论：scripts/、database/ 与 svc/wms 均无以属主直连读写该表的路径
--      （仅 provision-env.sh / ensure-tenant-users-seed.sh 操作 wms.batches，
--       check-rls-permissions.cjs 只做目录级覆盖检查），故 FORCE + 仅系统通道。
--      若某副本上该表已有 tenant_id（历史 ensure 函数漂移），仍按系统通道处理，
--      只输出 NOTICE，不改变判定。
--
-- 本笔统一：
--   1. DROP 全部既有策略；
--   2. ENABLE + FORCE ROW LEVEL SECURITY（schema_defense_ledger 除外）；
--   3. CREATE POLICY rls_tenant_isolation FOR ALL
--        USING      (系统通道 OR tenant_id = 当前租户)
--        WITH CHECK (同形)
--      系统通道 = `app.rls_system='on'`（服务身份 / shared-db scope_system），
--      当前租户 = `app.tenant_id`（tenant_middleware 每请求 set_config，空串视为未设）。
--   4. schema_defense_ledger：ENABLE + NO FORCE，仅系统通道（沿用 SCM B2 先例，
--      避免把属主侧治理脚本锁死）。
--   5. wms_master_data_refs：ENABLE + FORCE，仅系统通道（fail-closed）。
--
-- 可重复执行。形状不符时整笔 ROLLBACK。
--
-- 回滚：database/rollback/20261112105000_w7_b4_wms_rls_fail_closed.rollback.sql
--   （按生产基线快照逐表重建原策略；不提供 DISABLE RLS 路径）
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- ---------- 前置断言 ----------
DO $w7b4wms_pre$
DECLARE
    n_tables int;
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

-- ---------- 租户归属自查（只读，不修改数据） ----------
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

    IF msg = '' THEN
        RAISE NOTICE 'B4-WMS 租户自查：全部租户表 tenant_id IS NULL 行数 = 0';
    ELSE
        RAISE NOTICE 'B4-WMS 租户自查（tenant_id IS NULL 行数）：%', msg;
    END IF;
END
$w7b4wms_audit$;
