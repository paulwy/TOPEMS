-- ============================================================
-- W7 · B2：SCM 全表 RLS 策略收敛为 fail-closed（WITH CHECK + FORCE）
-- 版本：20261112104000
--
-- 背景（见 docs/quality/w7-b4-scm-ehs-wms-readonly-assessment-2026-11-12.md §1/§2.1）：
--   scm 37 张表里 31 张开了 RLS，但策略形状全部 fail-open：
--   `current_setting('app.tenant_id', true) IS NULL / = '' / tenant_id IS NULL / true`
--   任一命中即放行；另有若干策略只有 USING、没有 WITH CHECK（插入不受限）。
--
-- 本笔对 scm 下**所有带 tenant_id 列的表**（B1 之后 = 全部 37 张）统一：
--   1. DROP 全部既有策略；
--   2. ENABLE + FORCE ROW LEVEL SECURITY；
--   3. CREATE POLICY rls_tenant_isolation FOR ALL
--        USING      (系统通道 OR tenant_id = 当前租户)
--        WITH CHECK (系统通道 OR tenant_id = 当前租户)
--      系统通道 = `app.rls_system='on'`（服务身份 / shared-db scope_system），
--      当前租户 = `app.tenant_id`（tenant_middleware 每请求 set_config，空串视为未设）。
--
-- 例外：scm.schema_defense_ledger 是系统账本（无租户归属，由 schema defense 工具在
--   表属主连接上写）。给它 system-only 策略但**不 FORCE**：租户侧完全不可见（fail-closed），
--   属主工具仍可写，避免把离线治理脚本锁死。
--
-- 前置：B1（20261112103000）已补齐 tenant_id 列。缺列时本迁移直接中止。
-- 可重复执行。
--
-- 回滚（急停，恢复 fail-open 放行）：
--   对每张表：
--     ALTER TABLE scm.<t> NO FORCE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS rls_tenant_isolation ON scm.<t>;
--     CREATE POLICY <原策略名> ...（原策略见 database/migrations 历史文件）
--   或整体：ALTER TABLE scm.<t> DISABLE ROW LEVEL SECURITY;
-- ============================================================

SET lock_timeout = '5s';

DO $w7b2$
DECLARE
    t record;
    pol record;
    n_tables int := 0;
    missing_col text;
BEGIN
    SELECT string_agg(relname, ', ')
      INTO missing_col
      FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'scm'
       AND c.relkind = 'r'
       AND NOT EXISTS (
           SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema = 'scm'
              AND col.table_name = c.relname
              AND col.column_name = 'tenant_id'
       );

    IF missing_col IS NOT NULL THEN
        RAISE EXCEPTION 'B2 前置不满足：以下 scm 表仍缺 tenant_id 列 → %', missing_col;
    END IF;

    FOR t IN
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'scm'
           AND c.relkind = 'r'
         ORDER BY c.relname
    LOOP
        -- 1) 清掉所有既有策略（fail-open 的、true/true 的、只有 USING 的）
        FOR pol IN
            SELECT policyname FROM pg_policies
             WHERE schemaname = 'scm' AND tablename = t.relname
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON scm.%I', pol.policyname, t.relname);
        END LOOP;

        EXECUTE format('ALTER TABLE scm.%I ENABLE ROW LEVEL SECURITY', t.relname);

        IF t.relname = 'schema_defense_ledger' THEN
            -- 系统账本：仅系统通道可见/可写；不 FORCE，保留表属主治理脚本写入能力。
            EXECUTE format('ALTER TABLE scm.%I NO FORCE ROW LEVEL SECURITY', t.relname);
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON scm.%I FOR ALL TO PUBLIC '
                'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'') '
                'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'')',
                t.relname
            );
        ELSE
            EXECUTE format('ALTER TABLE scm.%I FORCE ROW LEVEL SECURITY', t.relname);
            EXECUTE format(
                'CREATE POLICY rls_tenant_isolation ON scm.%I FOR ALL TO PUBLIC '
                'USING (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) '
                'WITH CHECK (COALESCE(current_setting(''app.rls_system'', true), ''off'') = ''on'' '
                '       OR tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
                t.relname
            );
        END IF;

        n_tables := n_tables + 1;
    END LOOP;

    RAISE NOTICE 'B2 已收敛 % 张 scm 表的 RLS 策略', n_tables;
END
$w7b2$;

-- ---- 校验：策略齐备 + FORCE 状态 ----
DO $w7b2_verify$
DECLARE
    r record;
    bad int := 0;
BEGIN
    FOR r IN
        SELECT c.relname,
               c.relrowsecurity,
               c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = 'scm' AND p.tablename = c.relname) AS pols,
               (SELECT count(*) FROM pg_policies p
                 WHERE p.schemaname = 'scm' AND p.tablename = c.relname
                   AND p.qual IS NOT NULL AND p.with_check IS NOT NULL) AS pols_both
          FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
         WHERE ns.nspname = 'scm' AND c.relkind = 'r'
    LOOP
        IF NOT r.relrowsecurity OR r.pols <> 1 OR r.pols_both <> 1 THEN
            RAISE WARNING 'B2 校验异常: %.rls=% policies=% both=%',
                r.relname, r.relrowsecurity, r.pols, r.pols_both;
            bad := bad + 1;
        END IF;
        IF r.relname <> 'schema_defense_ledger' AND NOT r.relforcerowsecurity THEN
            RAISE WARNING 'B2 校验异常: % 未 FORCE', r.relname;
            bad := bad + 1;
        END IF;
    END LOOP;

    IF bad > 0 THEN
        RAISE EXCEPTION 'B2 校验失败：% 处异常（见上方 WARNING）', bad;
    END IF;
END
$w7b2_verify$;
