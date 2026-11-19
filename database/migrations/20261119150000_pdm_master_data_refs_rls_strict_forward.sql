-- P1 · pdm.pdm_master_data_refs 读侧严格 B 收紧（USING(true) 定性 2026-11-19）
--
-- 背景：docs/database/rls-using-true-triage-2026-11-19.md §3 P1。
--   迁移前策略集合（生产只读实测 + database/rls_policy_expected.json）：
--     1) pdm_master_data_refs_read   SELECT USING (true)                —— 任意租户可读全部租户行
--     2) pdm_master_data_refs_write  ALL    USING/WITH CHECK (app.rls_system='on')
--   写入路径仅 svc/pdm/src/event_handlers/mod.rs:255-300（scope_system()，系统通道）；
--   全仓无该表 SELECT 代码路径，收紧读策略不会造成读空集，无需补 scope_with。
--
-- 变更内容：动态清空既有策略 → ENABLE + FORCE → rls_tenant_isolation（ALL，严格 B）。
--          严格 B 表达式逐字取自 database/migrations/20261119140000_iam_core_tenant_plugins_rls_strict_forward.sql。
--          不改列、不改数据、不加索引。
-- 幂等性：每次都先 DROP 该表全部策略再 CREATE，重复执行无副作用。
-- 锁影响：ENABLE/FORCE（ACCESS EXCLUSIVE 瞬时）+ CREATE POLICY（0 行表，毫秒级）。
-- 回滚：database/rollback/20261119150000_pdm_master_data_refs_rls_strict_forward.rollback.sql
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

SET lock_timeout = '5s';

-- 1. 前置断言与读数
DO $$
DECLARE
    v_nullable text;
    n_rows bigint;
    n_nulls bigint;
    n_zero bigint;
    n_pol int;
    v_rls boolean;
    v_force boolean;
BEGIN
    IF to_regclass('pdm.pdm_master_data_refs') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：pdm.pdm_master_data_refs 不存在';
    END IF;

    SELECT is_nullable INTO v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'pdm' AND table_name = 'pdm_master_data_refs'
      AND column_name = 'tenant_id';
    IF v_nullable IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION '前置断言失败：pdm.pdm_master_data_refs.tenant_id 不是 NOT NULL（当前 %）', v_nullable;
    END IF;

    SELECT count(*) INTO n_rows FROM pdm.pdm_master_data_refs;
    SELECT count(*) INTO n_nulls FROM pdm.pdm_master_data_refs WHERE tenant_id IS NULL;
    SELECT count(*) INTO n_zero FROM pdm.pdm_master_data_refs
     WHERE tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
    IF n_nulls > 0 THEN
        RAISE EXCEPTION '前置断言失败：pdm.pdm_master_data_refs 存在 % 行 NULL 租户，需先定性', n_nulls;
    END IF;
    IF n_zero > 0 THEN
        RAISE EXCEPTION '前置断言失败：pdm.pdm_master_data_refs 存在 % 行零租户，需先定性', n_zero;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs';
    IF n_pol <> 2 THEN
        RAISE EXCEPTION '前置断言失败：预期 2 条策略（read SELECT true + write 系统通道），实际 %', n_pol;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_read'
          AND cmd = 'SELECT' AND qual = 'true'
    ) THEN
        RAISE EXCEPTION '前置断言失败：pdm_master_data_refs_read(SELECT USING true) 缺失或定义不符';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
          AND policyname = 'pdm_master_data_refs_write'
          AND cmd = 'ALL'
          AND qual LIKE '%app.rls_system%'
          AND with_check LIKE '%app.rls_system%'
    ) THEN
        RAISE EXCEPTION '前置断言失败：pdm_master_data_refs_write(系统通道) 缺失或定义不符';
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'pdm.pdm_master_data_refs'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '前置断言失败：RLS/FORCE 未同时开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    RAISE NOTICE '前置读数：pdm.pdm_master_data_refs = % 行，NULL/零租户 0 行，既有策略 2 条，RLS+FORCE 已开启', n_rows;
END $$;

-- 2. 动态清空既有策略（幂等）
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
    LOOP
        EXECUTE format('DROP POLICY %I ON pdm.pdm_master_data_refs', r.policyname);
        RAISE NOTICE '已删除策略 pdm.pdm_master_data_refs.%', r.policyname;
    END LOOP;
END $$;

-- 3. 严格 B 范式：仅本租户行；系统通道放行
ALTER TABLE pdm.pdm_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_master_data_refs FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON pdm.pdm_master_data_refs
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

-- 4. 后置断言
DO $$
DECLARE
    n_pol int;
    v_qual text;
    v_check text;
    v_rls boolean;
    v_force boolean;
BEGIN
    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数应为 1，实际 %', n_pol;
    END IF;

    SELECT qual, with_check INTO v_qual, v_check
    FROM pg_policies
    WHERE schemaname = 'pdm' AND tablename = 'pdm_master_data_refs'
      AND policyname = 'rls_tenant_isolation';
    IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' OR v_qual NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：USING 定义不符合严格 B 范式：%', v_qual;
    END IF;
    IF v_check IS NULL OR v_check NOT LIKE '%app.rls_system%' OR v_check NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：WITH CHECK 定义不符合严格 B 范式：%', v_check;
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'pdm.pdm_master_data_refs'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '后置断言失败：RLS/FORCE 未同时开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    RAISE NOTICE '后置断言通过：pdm.pdm_master_data_refs 严格 B（1 策略，RLS+FORCE）';
END $$;
