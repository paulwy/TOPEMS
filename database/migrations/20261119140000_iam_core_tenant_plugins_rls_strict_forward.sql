-- Batch G-FWD · iam.core_tenant_plugins 严格 B 范式（前向补丁，取代 20261118124000）
--
-- 背景：20261118124000_iam_tenant_plugins_rls_strict.sql 未落生产（生产账本无该版本，
--       iam.core_tenant_plugins 0 行 / RLS 关闭 / 0 策略，2026-11-19 只读实测）。
--       该版本已低于账本水位（20261119000002），按「不得 in-place 重放」改由本前向补丁承载，
--       20261118124000 在 manifest 中标记 superseded。本文件 DDL 与 18124000 等价，幂等可重跑。
--
-- 定性（沿用 2026-11-17 结论）：租户私有安装记录，不是平台语料，不需要平台读策略。
--   读/写路径均显式绑定请求租户；生产 0 行；tenant_id / plugin_id NOT NULL。
--
-- 变更内容：动态清空既有策略 → ENABLE + FORCE → rls_tenant_isolation（ALL，严格 B）
--           → 断言策略数/定义/RLS 状态/既有唯一约束与索引。不改列、不改数据、不加索引。
-- 幂等性：每次都先 DROP 该表全部策略再 CREATE，重复执行无副作用。
-- 锁影响：ENABLE/FORCE（ACCESS EXCLUSIVE 瞬时）+ CREATE POLICY（0 行表，毫秒级）。
-- 回滚：database/rollback/20261119140000_iam_core_tenant_plugins_rls_strict_forward.rollback.sql
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    n_rows bigint;
    n_nulls bigint;
    v_notnull text;
    n_pol int;
BEGIN
    IF to_regclass('iam.core_tenant_plugins') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：iam.core_tenant_plugins 不存在';
    END IF;

    SELECT is_nullable INTO v_notnull
    FROM information_schema.columns
    WHERE table_schema = 'iam' AND table_name = 'core_tenant_plugins'
      AND column_name = 'tenant_id';
    IF v_notnull IS DISTINCT FROM 'NO' THEN
        RAISE EXCEPTION '前置断言失败：iam.core_tenant_plugins.tenant_id 不是 NOT NULL（当前 %）', v_notnull;
    END IF;

    SELECT count(*) INTO n_rows FROM iam.core_tenant_plugins;
    SELECT count(*) INTO n_nulls FROM iam.core_tenant_plugins
     WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid;
    IF n_nulls > 0 THEN
        RAISE EXCEPTION '前置断言失败：iam.core_tenant_plugins 存在 % 行零/NULL 租户，需先定性', n_nulls;
    END IF;

    SELECT count(*) INTO n_pol FROM pg_policies
     WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins';

    RAISE NOTICE '前置读数：iam.core_tenant_plugins = % 行，零/NULL 租户 % 行，既有策略 % 条',
        n_rows, n_nulls, n_pol;
END $$;

-- 2. 动态清空既有策略（幂等）
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins'
    LOOP
        EXECUTE format('DROP POLICY %I ON iam.core_tenant_plugins', r.policyname);
        RAISE NOTICE '已删除策略 iam.core_tenant_plugins.%', r.policyname;
    END LOOP;
END $$;

-- 3. 严格 B 范式：仅本租户行；系统通道放行
ALTER TABLE iam.core_tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.core_tenant_plugins FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON iam.core_tenant_plugins
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
     WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins';
    IF n_pol <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数应为 1，实际 %', n_pol;
    END IF;

    SELECT qual, with_check INTO v_qual, v_check
    FROM pg_policies
    WHERE schemaname = 'iam' AND tablename = 'core_tenant_plugins'
      AND policyname = 'rls_tenant_isolation';
    IF v_qual IS NULL OR v_qual NOT LIKE '%app.rls_system%' OR v_qual NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：USING 定义不符合严格 B 范式：%', v_qual;
    END IF;
    IF v_check IS NULL OR v_check NOT LIKE '%app.rls_system%' OR v_check NOT LIKE '%app.tenant_id%' THEN
        RAISE EXCEPTION '后置断言失败：WITH CHECK 定义不符合严格 B 范式：%', v_check;
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
    FROM pg_class WHERE oid = 'iam.core_tenant_plugins'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '后置断言失败：RLS/FORCE 未同时开启（rls=%, force=%）', v_rls, v_force;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'iam.core_tenant_plugins'::regclass
          AND conname = 'core_tenant_plugins_tenant_id_plugin_id_key'
    ) THEN
        RAISE EXCEPTION '后置断言失败：唯一约束 (tenant_id, plugin_id) 缺失';
    END IF;

    -- tenant_id 必须有索引（不绑定具体索引名：同一张表在不同环境曾被建过多种命名）
    IF NOT EXISTS (
        SELECT 1
          FROM pg_index i
          JOIN pg_attribute a
            ON a.attrelid = 'iam.core_tenant_plugins'::regclass
           AND a.attnum = i.indkey[0]
         WHERE i.indrelid = 'iam.core_tenant_plugins'::regclass
           AND a.attname = 'tenant_id'
    ) THEN
        RAISE EXCEPTION '后置断言失败：iam.core_tenant_plugins 缺少 tenant_id 前导索引';
    END IF;

    RAISE NOTICE '后置断言通过：iam.core_tenant_plugins 严格 B（1 策略，RLS+FORCE）';
END $$;
