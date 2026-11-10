-- ============================================================
-- W7 · B2 前置数据迁移：4 张全局内容表的系统行 → NULL（全局行）
-- 版本：20261110110500
--
-- 背景（设计 §6.3 / 裁决 2）：B2 的全局只读策略只覆盖 tenant_id IS NULL 的行。
-- 设计复核的生产现状：
--   ai.ai_models             4 行 tenant_id = NULL（已是全局目录）
--   ai.ai_prompt_templates   3 行 tenant_id = NULL（已是全局模板）
--   mobile.sync_policies     1 行 tenant_id = NULL（已是全局默认策略）
--   pm.project_type_configs  1 行 tenant_id = ...0000（nil 占位，需归一 NULL）
-- 因此本文件对前三张表是"语义确认 + 幂等清 nil"，对 pm.project_type_configs
-- 是真正的数据归一（其 tenant_id 生产为 NOT NULL，须先 DROP NOT NULL）。
--
-- 只动 nil（...0000），不动 ...0001：...0001 是真实默认租户的业务行，
-- 翻成 NULL 会把租户数据升级成全局数据（B1 对菜单/字典做 ...0001 归一是因为
-- 那 5 张表登记为系统内容表，本批 4 张里没有这种情况）。
--
-- 前置：20261110110000~20261110110400 已把这 4 张表 FORCE。
--       本文件必须在事务内执行（apply-forward.sh / sqlx migrate run 均为事务），
--       靠 SET LOCAL app.rls_system='on' 进入系统通道；非事务执行时下方 guard
--       直接报错中止。
--
-- 断言（任一不满足即 RAISE EXCEPTION，整个事务回滚）：
--   1) 迁移后 tenant_id = ...0000 的行数 = 0
--   2) 迁移后总行数 = 迁移前总行数
--   3) 迁移后 NULL 行数 = 迁移前 NULL 行数 + 迁移前 nil 行数
--   4) 幂等：重复执行 UPDATE 影响 0 行
--
-- 回滚（手工，须在事务内 + SET LOCAL app.rls_system='on'）：
--   UPDATE pm.project_type_configs SET tenant_id = '00000000-0000-0000-0000-000000000000'
--    WHERE tenant_id IS NULL;
--   ⚠️ 仅当「迁移前 NULL 行数 = 0」时逐行等价（生产 project_type_configs 复核为 0，
--      它的 1 行原本就是 ...0000）。其余 3 张表迁移前就是 NULL，回滚不得翻转。
--      完整回滚入口见 scripts/ops/w7_b2_rollback.sql。
-- ============================================================

SET lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';

-- 守卫：确认已进入系统通道（非事务执行时 SET LOCAL 不生效，这里响亮失败）
DO $w7b2_guard$
BEGIN
    IF COALESCE(current_setting('app.rls_system', true), 'off') <> 'on' THEN
        RAISE EXCEPTION 'W7-B2 数据迁移必须在事务内执行：SET LOCAL app.rls_system 未生效';
    END IF;
END
$w7b2_guard$;

DO $w7b2_mig$
DECLARE
    v_nil CONSTANT uuid := '00000000-0000-0000-0000-000000000000';
    r record;
    pre_total bigint;
    pre_nil bigint;
    pre_null bigint;
    updated bigint;
    post_total bigint;
    post_nil bigint;
    post_null bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai',     'ai_models'),
            ('ai',     'ai_prompt_templates'),
            ('mobile', 'sync_policies'),
            ('pm',     'project_type_configs')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE WARNING 'W7-B2 数据迁移跳过 %.%：表不存在', r.sch, r.tbl;
            CONTINUE;
        END IF;

        -- 全局行用 NULL 表达；仅 project_type_configs 生产为 NOT NULL，幂等
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = r.sch AND table_name = r.tbl
              AND column_name = 'tenant_id' AND is_nullable = 'NO'
        ) THEN
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN tenant_id DROP NOT NULL',
                           r.sch, r.tbl);
            RAISE NOTICE 'W7-B2/%.%: tenant_id DROP NOT NULL', r.sch, r.tbl;
        END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO pre_total;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = $1', r.sch, r.tbl)
            USING v_nil INTO pre_nil;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl)
            INTO pre_null;

        RAISE NOTICE 'W7-B2/%.% 迁移前: total=% nil_0000=% global_null=%',
            r.sch, r.tbl, pre_total, pre_nil, pre_null;

        EXECUTE format('UPDATE %I.%I SET tenant_id = NULL WHERE tenant_id = $1', r.sch, r.tbl)
            USING v_nil;
        GET DIAGNOSTICS updated = ROW_COUNT;
        RAISE NOTICE 'W7-B2/%.% 更新行数=%', r.sch, r.tbl, updated;

        EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO post_total;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = $1', r.sch, r.tbl)
            USING v_nil INTO post_nil;
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id IS NULL', r.sch, r.tbl)
            INTO post_null;

        RAISE NOTICE 'W7-B2/%.% 迁移后: total=% nil_0000=% global_null=%',
            r.sch, r.tbl, post_total, post_nil, post_null;

        IF post_nil <> 0 THEN
            RAISE EXCEPTION 'W7-B2/%.%: 迁移后仍有 % 行 tenant_id = ...0000',
                r.sch, r.tbl, post_nil;
        END IF;
        IF post_total <> pre_total THEN
            RAISE EXCEPTION 'W7-B2/%.%: 行数变化 % -> %', r.sch, r.tbl, pre_total, post_total;
        END IF;
        IF post_null <> pre_null + pre_nil THEN
            RAISE EXCEPTION 'W7-B2/%.%: NULL 行数 % <> 迁移前 NULL % + nil %',
                r.sch, r.tbl, post_null, pre_null, pre_nil;
        END IF;
    END LOOP;
END
$w7b2_mig$;

-- 收尾断言：4 张表全局行只以 NULL 形态存在
DO $w7b2_assert$
DECLARE
    r record;
    v_nil bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai',     'ai_models'),
            ('ai',     'ai_prompt_templates'),
            ('mobile', 'sync_policies'),
            ('pm',     'project_type_configs')
        ) AS v(sch, tbl)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            CONTINUE;
        END IF;
        EXECUTE format(
            'SELECT count(*) FROM %I.%I WHERE tenant_id = ''00000000-0000-0000-0000-000000000000''',
            r.sch, r.tbl) INTO v_nil;
        IF v_nil <> 0 THEN
            RAISE EXCEPTION 'W7-B2 收尾断言失败：%.% 仍有 % 行 nil 租户', r.sch, r.tbl, v_nil;
        END IF;
    END LOOP;
    RAISE NOTICE 'W7-B2 全局行归一断言通过';
END
$w7b2_assert$;
