-- ============================================================
-- W7 · B1 前置数据迁移：菜单/字典的系统内容行 → NULL（全局行）
-- 版本：20261110100100
--
-- 背景（设计 §4.3 / 裁决 2）：全局行只读策略只覆盖 tenant_id IS NULL 的行。
-- 生产现存 core_menus 452、core_menu_groups 130、core_dict_types 77、
-- core_dict_items 397 行的 tenant_id 是 ...0001 而非 NULL；不迁移则多租户下
-- 菜单/字典全空。
--
-- 迁移范围（只这 5 张系统内容表，只动下面两种"非真实租户"值）：
--   ...0001  历史系统内容归属（生产菜单/字典全部行）
--   ...0000  nil 占位（core_roles 的 15 行系统角色；部分环境/种子代码也写 nil）
--   两者统一归一为 NULL，使全局行只有一种形态，SELECT 策略不再需要 nil 分支。
--
-- 前置：20261110100000_w7_b1_rls_policies.sql 已把这 5 张表 FORCE。
--       因此本文件必须在事务内执行（apply-forward.sh --single-transaction /
--       sqlx migrate run 均为事务），靠 SET LOCAL app.rls_system='on' 进入
--       系统通道；若不在事务内，下方 guard 会直接报错中止，不会静默少改。
--
-- 断言（任一不满足即 RAISE EXCEPTION，整个事务回滚）：
--   1) 迁移后 tenant_id = ...0001 的行数 = 0
--   2) 迁移后 tenant_id = ...0000 的行数 = 0
--   3) 迁移后 tenant_id IS NULL 的行数 = 迁移前 NULL + ...0001 + ...0000
--   4) 迁移后总行数 = 迁移前总行数（不增不减）
--   5) 幂等：重复执行时 UPDATE 影响 0 行，结果一致
--
-- 回滚 SQL（手工执行；须在事务内 + SET LOCAL app.rls_system='on'）：
--   UPDATE public.core_menus       SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
--   UPDATE public.core_menu_groups SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
--   UPDATE public.core_dict_types  SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
--   UPDATE public.core_dict_items  SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
--   UPDATE public.core_roles       SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;  -- 系统角色还原为 nil
--   ⚠️ 该回滚只在「迁移前 NULL 行数 = 0」时逐行等价（生产 5 张表复核均为 0）。
--      若迁移前已有 NULL 行（本地/测试库可能存在），回滚会把原有全局行一并翻成
--      ...0001 / ...0000，必须改用窗口前的行快照恢复。迁移前计数见下方 NOTICE 日志，
--      完整回滚入口见 scripts/ops/w7_b1_rollback.sql。
-- ============================================================

SET lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';

-- 0) 全局行用 NULL 表达，这 5 张表的 tenant_id 必须先允许 NULL
--    （生产/本地当前均为 NOT NULL；DROP NOT NULL 幂等）
ALTER TABLE public.core_menus       ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_menu_groups ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_dict_types  ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_dict_items  ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.core_roles       ALTER COLUMN tenant_id DROP NOT NULL;

-- 守卫：确认已进入系统通道（非事务执行时 SET LOCAL 不生效，这里响亮失败）
DO $guard$
BEGIN
    IF COALESCE(current_setting('app.rls_system', true), 'off') <> 'on' THEN
        RAISE EXCEPTION 'W7-B1 数据迁移必须在事务内执行：SET LOCAL app.rls_system 未生效';
    END IF;
END
$guard$;

DO $mig$
DECLARE
    v_tenant CONSTANT uuid := '00000000-0000-0000-0000-000000000001';
    v_nil    CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
    t text;
    pre_total bigint;
    pre_tenant bigint;
    pre_nil bigint;
    pre_null bigint;
    updated bigint;
    post_total bigint;
    post_tenant bigint;
    post_nil bigint;
    post_null bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'core_menus', 'core_menu_groups', 'core_dict_types', 'core_dict_items', 'core_roles'
    ]
    LOOP
        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO pre_total;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', t)
            USING v_tenant INTO pre_tenant;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', t)
            USING v_nil INTO pre_nil;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t)
            INTO pre_null;

        RAISE NOTICE 'W7-B1/% 迁移前: total=% tenant_0001=% nil_0000=% global_null=%',
            t, pre_total, pre_tenant, pre_nil, pre_null;

        EXECUTE format(
            'UPDATE public.%I SET tenant_id = NULL WHERE tenant_id IN ($1, $2)', t
        ) USING v_tenant, v_nil;
        GET DIAGNOSTICS updated = ROW_COUNT;
        RAISE NOTICE 'W7-B1/% 更新行数=%', t, updated;

        EXECUTE format('SELECT count(*) FROM public.%I', t) INTO post_total;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', t)
            USING v_tenant INTO post_tenant;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', t)
            USING v_nil INTO post_nil;
        EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', t)
            INTO post_null;

        RAISE NOTICE 'W7-B1/% 迁移后: total=% tenant_0001=% nil_0000=% global_null=%',
            t, post_total, post_tenant, post_nil, post_null;

        IF post_tenant <> 0 THEN
            RAISE EXCEPTION 'W7-B1/% 迁移后仍有 % 行 tenant_id = ...0001',
                t, post_tenant;
        END IF;
        IF post_nil <> 0 THEN
            RAISE EXCEPTION 'W7-B1/% 迁移后仍有 % 行 tenant_id = ...0000',
                t, post_nil;
        END IF;
        IF post_null <> pre_null + pre_tenant + pre_nil THEN
            RAISE EXCEPTION 'W7-B1/% 全局行数不符: 期望 %，实际 %',
                t, pre_null + pre_tenant + pre_nil, post_null;
        END IF;
        IF post_total <> pre_total THEN
            RAISE EXCEPTION 'W7-B1/% 总行数变化: 迁移前 %，迁移后 %',
                t, pre_total, post_total;
        END IF;
    END LOOP;
END
$mig$;

RESET app.rls_system;
