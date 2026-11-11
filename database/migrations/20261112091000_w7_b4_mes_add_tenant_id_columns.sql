-- ============================================================
-- W7 · B4-mes：19 张业务表补 tenant_id 列
-- 版本：20261112091000
--
-- 范围（与代码侧 19 处 INSERT 绑定租户的 19 张表一一对应）：
--   batch_records / bom_items / equipment_inspections / material_boms /
--   material_categories / material_issue_items / material_issues /
--   material_requirement_items / material_requirements / material_return_items /
--   material_returns / production_lines / quality_records / shifts /
--   team_members / wip_transfers / wips / work_calendars / workshops
--
-- 说明：
--   * 含 material_categories / material_requirement_items：本地与现网均 0 行，
--     代码侧无生产写入方（前者仅集成测试 INSERT，后者 0 处 INSERT），
--     一并补列避免第二个补列窗口。
--   * 列类型 uuid、可空：存量 nil 行（不可判定归属）保持 NULL 并登记 quarantine，
--     因此本批不能加 NOT NULL；后续确认归属后再收紧。
--   * 不做 DEFAULT、不回填：回填在 20261112092000 按父行继承执行。
--   * 幂等：ADD COLUMN IF NOT EXISTS。
--
-- 回滚（急停）：本笔只加列，不停写；回滚需先确认无代码写入 tenant_id，
--   ALTER TABLE mes.<t> DROP COLUMN IF EXISTS tenant_id;（19 张）
-- ============================================================

SET lock_timeout = '5s';

DO $w7b4_mes_add_cols$
DECLARE
    t text;
    v_missing text := '';
    v_added int := 0;
    v_existed int := 0;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_categories','material_issue_items','material_issues',
        'material_requirement_items','material_requirements','material_return_items',
        'material_returns','production_lines','quality_records','shifts',
        'team_members','wip_transfers','wips','work_calendars','workshops'
    ] LOOP
        IF to_regclass(format('mes.%I', t)) IS NULL THEN
            v_missing := v_missing || ' ' || t;
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'mes' AND table_name = t AND column_name = 'tenant_id'
        ) THEN
            v_existed := v_existed + 1;
        ELSE
            EXECUTE format('ALTER TABLE mes.%I ADD COLUMN tenant_id uuid', t);
            v_added := v_added + 1;
        END IF;
    END LOOP;

    IF v_missing <> '' THEN
        RAISE EXCEPTION 'W7-B4-MES 补列失败：表不存在 —%', v_missing;
    END IF;
    IF v_added + v_existed <> 19 THEN
        RAISE EXCEPTION 'W7-B4-MES 补列失败：覆盖 % 张（期望 19）', v_added + v_existed;
    END IF;
    RAISE NOTICE 'W7-B4-MES：tenant_id 列就绪（新加 % 张，已存在 % 张）', v_added, v_existed;
END
$w7b4_mes_add_cols$;

-- 结构断言：19 张表均可空 uuid 列
DO $w7b4_mes_add_cols_assert$
DECLARE
    v_bad text;
BEGIN
    SELECT string_agg(t, ' ') INTO v_bad
    FROM unnest(ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_categories','material_issue_items','material_issues',
        'material_requirement_items','material_requirements','material_return_items',
        'material_returns','production_lines','quality_records','shifts',
        'team_members','wip_transfers','wips','work_calendars','workshops'
    ]) AS t
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'mes' AND c.table_name = t
          AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND c.is_nullable = 'YES'
    );
    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'W7-B4-MES 断言失败：tenant_id 列缺失或类型不符 — %', v_bad;
    END IF;
    RAISE NOTICE 'W7-B4-MES 断言通过：19 张表 tenant_id uuid NULL';
END
$w7b4_mes_add_cols_assert$;
