-- Batch G · iam.core_tenant_plugins 严格 B 范式（租户私有安装记录）
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 一、定性结论（2026-11-17，生产 topems_prod + 克隆库 m2_dryrun_20261116 只读核查）
--
--   结论：**租户私有安装记录**，不是平台语料，不需要平台读策略。
--
--   证据链：
--     1) 读路径：svc/plugin-registry 的租户插件列表/详情/激活/卸载全部带
--        `tenant_id = $请求租户` 或 `JOIN ... ON tp.tenant_id = $1`；
--        marketplace / runtime 走系统通道读目录，不读本表；
--        全仓无「跨租户读安装记录」的代码。
--     2) 写路径：install / uninstall / activate / deactivate 均显式绑定请求租户
--        （`tenant_id = $1` 或 INSERT 列显式赋值），无 NULL 写入点。
--     3) 数据：生产 0 行；tenant_id / plugin_id 均 NOT NULL、无默认；
--        唯一约束 (tenant_id, plugin_id) 已存在。
--     4) 策略：生产 **RLS 关闭且 0 条策略**（fail-open；database/init 里的
--        tenant_isolation_core_tenant_plugins 为宽松旧式，含 tenant_id IS NULL 旁路，
--        生产未生效）。这正是本批要收的口子。
--
--   可见范围对照（0 行现状下计数均为 0，下表描述策略容量与未来写入的可见性）：
--
--     | 上下文                     | 现状（无 RLS） | 收严后 strict B |
--     |----------------------------|----------------|-----------------|
--     | 未设 app.tenant_id         | 全部行         | 0 行            |
--     | 空串 app.tenant_id         | 全部行         | 0 行            |
--     | 全零 app.tenant_id         | 全部行         | 0 行（无哨兵行）|
--     | 租户 A                     | 全部行         | A 行            |
--     | 租户 B                     | 全部行         | B 行            |
--     | A + app.rls_system=on      | 全部行         | 全部行          |
--     | 租户 A 写                  | 任意行         | 仅 A 行         |
--
--   净变化：租户上下文从「可见全部行」收为「仅本租户行」，属净减少；系统通道不变。
--
--   与 20261118123000 的关系：该迁移已补 `plugin_id → core.core_plugins(id)` 外键，
--   本批不再改列/加约束，只收 RLS。
--
-- 二、变更内容
--   动态清空既有策略（生产 0 条）→ ENABLE + FORCE → rls_tenant_isolation（ALL，严格 B 范式）
--   → 断言策略数/定义/RLS 状态/既有唯一约束与索引。不改列、不改数据、不加索引。
--
-- 三、锁影响：1 次 ENABLE + 1 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ CREATE POLICY（0 行表，毫秒级）。
--
-- 四、回滚：database/rollback/20261118124000_iam_tenant_plugins_rls_strict.rollback.sql
--     删策略 → DISABLE RLS + NO FORCE，恢复生产迁移前「RLS 关闭、0 策略」原状。
--
-- 五、部署耦合：与 svc/plugin-registry 本波次代码同窗口。代码已显式绑定租户；
--     若 GUC 缺失，安装记录读写会 fail-closed（预期行为，不静默写 NULL）。
--
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

-- 2. 动态清空既有策略（生产 0 条，dev 若残留宽松旧策略一并替换）
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

    IF to_regclass('iam.idx_core_tenant_plugins_tenant') IS NULL THEN
        RAISE EXCEPTION '后置断言失败：idx_core_tenant_plugins_tenant 缺失';
    END IF;

    RAISE NOTICE '后置断言通过：iam.core_tenant_plugins 严格 B（1 策略，RLS+FORCE）';
END $$;
