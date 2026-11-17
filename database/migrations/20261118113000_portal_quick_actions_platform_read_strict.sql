-- 决策 3 · Batch D：portal.portal_quick_actions 平台语料化（严格 B + 平台读）
--（本文件只出方案，生产另行开窗；生产零 DDL / 零数据修复 / 零停服）
--
-- 一、定性结论（2026-11-17，生产 topems_prod + 克隆库 m2_dryrun_20261116 只读核查）
--
--   结论：**平台语料（全局快捷入口配置）**，不是「超管私有行」。
--
--   证据链：
--     1) 读路径：svc/portal/src/modules/quick_actions.rs 的 load_quick_actions 走
--        db.scope_read_system()（系统通道），SQL 无任何租户谓词，按 is_active/deleted_at
--        过滤后对所有调用者返回同一份列表；代码内「块 D 登记」明确写明
--        「平台级快捷入口配置，对所有租户可见，不按请求租户过滤，否则会丢全局入口」。
--     2) 写路径：全仓无 INSERT/UPDATE/DELETE portal_quick_actions 的代码
--        （favorite 只写 IAM 用户偏好 quick_actions.favorites，不写本表）；
--        行只可能来自种子/运维写入，语义上属于平台配置而非某个租户的私有数据。
--     3) 数据：两库均 0 行；tenant_id 自 20261115141900 起为 NOT NULL、无默认，
--        「nil 租户行」已不可能出现（代码注释里的 nil 说法是补列前的历史描述）。
--     4) 策略：两库唯一策略 portal_allow_all_portal_quick_actions（ALL，USING/WITH CHECK = true），
--        RLS 已 ENABLE + FORCE；allow_all 让租户隔离形同虚设。
--
--   按已固化规则处理：平台语料 → 「NULL 归一 + 平台读策略」。
--   本表 tenant_id NOT NULL，归一为**空操作**（前置断言 NULL 行 = 0，本迁移不含任何 UPDATE）；
--   平台读策略按哨兵 PLATFORM_TENANT_ID = 00000000-0000-0000-0000-000000000000 实现。
--
--   可见范围对照（0 行现状下计数均为 0，下表描述策略容量与未来种子的可见性）：
--
--     | 上下文                     | 现状 allow_all        | 收严后 strict + platform_read |
--     |----------------------------|-----------------------|-------------------------------|
--     | 未设 app.tenant_id         | 全部行                | 0 行                          |
--     | 空串 app.tenant_id         | 全部行                | 0 行                          |
--     | 全零 app.tenant_id         | 全部行                | 哨兵（平台）行                |
--     | 租户 A                     | 全部行                | 哨兵行 + A 行                 |
--     | 租户 B                     | 全部行                | 哨兵行 + B 行                 |
--     | A + app.rls_system=on      | 全部行                | 全部行（系统通道）            |
--     | 租户 A 写                  | 任意行                | 仅 A 行（系统通道不受限）      |
--
--   净变化：租户上下文从「可见全部行」收为「平台哨兵行 + 本租户行」，属**净减少**
--   （与 Batch A 平台语料 5 表同口径）；系统通道读写不变。
--
--   种子约定：今后平台快捷入口必须以 tenant_id = 00000000-0000-0000-0000-000000000000 写入，
--   否则该行只对所属租户可见（当前读路径走系统通道，运维写入仍全量可见，但不得依赖这一点）。
--
-- 二、变更内容
--   动态清空既有策略 → ENABLE + FORCE → rls_tenant_isolation（ALL，严格 B 范式）
--   + rls_platform_read（SELECT，哨兵行且租户 GUC 非空）→ 断言。
--   既有索引 idx_quick_actions_tenant / idx_quick_actions_active / idx_quick_actions_service
--   已覆盖查询，本迁移不新增索引；不改列、不改数据。
--
-- 三、锁影响：1 次 ENABLE + 1 次 FORCE（ACCESS EXCLUSIVE 瞬时）+ DROP/CREATE POLICY（0 行表，毫秒级）。
--
-- 四、回滚：database/rollback/20261118113000_portal_quick_actions_platform_read_strict.rollback.sql
--     恢复生产迁移前原状 portal_allow_all_portal_quick_actions（ALL true/true）。
--     dev 环境的 fail-open 旧策略 tenant_isolation_portal_quick_actions 不回灌（那是本次要收的口子）。
--
-- 五、部署耦合：无。读路径走系统通道，收严不改变现有可见结果；无需与 svc/portal 同窗口。
--
-- destructive-gate: allow
-- ticket: RESIDUAL-RLS-20261118

-- 1. 前置断言与读数
DO $$
DECLARE
    n_rows bigint;
    n_nulls bigint;
    n_col int;
    v_notnull text;
    v_default text;
    n_pol int;
    v_qual text;
BEGIN
    IF to_regclass('portal.portal_quick_actions') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：表 portal.portal_quick_actions 不存在';
    END IF;

    SELECT count(*), max(is_nullable), max(coalesce(column_default, '-'))
      INTO n_col, v_notnull, v_default
      FROM information_schema.columns
     WHERE table_schema = 'portal'
       AND table_name = 'portal_quick_actions'
       AND column_name = 'tenant_id';
    IF n_col <> 1 THEN
        RAISE EXCEPTION '前置断言失败：portal.portal_quick_actions 缺少 tenant_id 列';
    END IF;
    IF v_notnull <> 'NO' THEN
        RAISE EXCEPTION '前置断言失败：tenant_id 可空（期望 NOT NULL，平台行须用哨兵）';
    END IF;
    IF v_default <> '-' THEN
        RAISE EXCEPTION '前置断言失败：tenant_id 存在默认值 %（禁止兜底，须显式绑定）', v_default;
    END IF;

    SELECT count(*), count(*) FILTER (WHERE tenant_id IS NULL)
      INTO n_rows, n_nulls
      FROM portal.portal_quick_actions;
    RAISE NOTICE '迁移前 portal_quick_actions：总行 %，NULL 租户行 %', n_rows, n_nulls;
    IF n_nulls <> 0 THEN
        RAISE EXCEPTION '前置断言失败：存在 % 行 NULL 租户（与 NOT NULL 约束矛盾）', n_nulls;
    END IF;
    IF n_rows > 0 THEN
        RAISE EXCEPTION '前置断言失败：出现 % 行数据（定性时为 0 行），需先确认是否为平台哨兵行再收严', n_rows;
    END IF;

    SELECT count(*), max(p.qual::text) INTO n_pol, v_qual
      FROM pg_policies p
     WHERE p.schemaname = 'portal' AND p.tablename = 'portal_quick_actions';
    IF n_pol <> 1 OR v_qual <> 'true' THEN
        RAISE EXCEPTION '前置断言失败：策略数 = %、USING = %（期望唯一 allow_all true）', n_pol, v_qual;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
         WHERE schemaname = 'portal' AND tablename = 'portal_quick_actions'
           AND indexdef LIKE '%(tenant_id)%'
    ) THEN
        RAISE EXCEPTION '前置断言失败：缺少 tenant_id 索引（idx_quick_actions_tenant）';
    END IF;

    RAISE NOTICE '前置断言通过：0 行、tenant_id NOT NULL 无默认、唯一 allow_all、tenant_id 索引在';
END $$;

-- 2. 迁移会话显式走系统通道
SELECT set_config('app.rls_system', 'on', false);
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', false);

-- 3. 清空既有策略
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.policyname FROM pg_policies p
         WHERE p.schemaname = 'portal' AND p.tablename = 'portal_quick_actions'
    LOOP
        EXECUTE format('DROP POLICY %I ON portal.portal_quick_actions', r.policyname);
        RAISE NOTICE '已删除策略 portal.portal_quick_actions.%', r.policyname;
    END LOOP;
END $$;

-- 4. 严格 B 范式 + 平台读
ALTER TABLE portal.portal_quick_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal.portal_quick_actions FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON portal.portal_quick_actions
    FOR ALL TO public
    USING (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    )
    WITH CHECK (
        COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
        OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
    );

CREATE POLICY rls_platform_read ON portal.portal_quick_actions
    FOR SELECT TO public
    USING (
        tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
        AND NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    );

-- 5. 后置断言
DO $$
DECLARE
    n_pol int;
    n_iso int;
    n_plat int;
    v_iso_using text;
    v_plat_using text;
    rls boolean;
    frls boolean;
BEGIN
    SELECT count(*),
           count(*) FILTER (WHERE policyname = 'rls_tenant_isolation' AND cmd = 'ALL'),
           count(*) FILTER (WHERE policyname = 'rls_platform_read' AND cmd = 'SELECT')
      INTO n_pol, n_iso, n_plat
      FROM pg_policies
     WHERE schemaname = 'portal' AND tablename = 'portal_quick_actions';

    IF n_pol <> 2 OR n_iso <> 1 OR n_plat <> 1 THEN
        RAISE EXCEPTION '后置断言失败：策略数=%（期望 2），isolation=%（期望 1），platform_read=%（期望 1）',
            n_pol, n_iso, n_plat;
    END IF;

    SELECT qual::text INTO v_iso_using FROM pg_policies
     WHERE schemaname = 'portal' AND tablename = 'portal_quick_actions'
       AND policyname = 'rls_tenant_isolation';
    IF position('app.rls_system' IN v_iso_using) = 0
       OR position('app.tenant_id' IN v_iso_using) = 0 THEN
        RAISE EXCEPTION '后置断言失败：isolation USING 缺少系统/租户分支：%', v_iso_using;
    END IF;

    SELECT qual::text INTO v_plat_using FROM pg_policies
     WHERE schemaname = 'portal' AND tablename = 'portal_quick_actions'
       AND policyname = 'rls_platform_read';
    IF position('00000000-0000-0000-0000-000000000000' IN v_plat_using) = 0
       OR position('IS NOT NULL' IN v_plat_using) = 0 THEN
        RAISE EXCEPTION '后置断言失败：platform_read USING 不是哨兵 + 非空 GUC：%', v_plat_using;
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO rls, frls
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'portal' AND c.relname = 'portal_quick_actions';
    IF NOT rls OR NOT frls THEN
        RAISE EXCEPTION '后置断言失败：rls/force = %/%（期望 true/true）', rls, frls;
    END IF;

    RAISE NOTICE '后置断言通过：portal_quick_actions = 严格 B 范式 + 平台读（哨兵行）';
END $$;
