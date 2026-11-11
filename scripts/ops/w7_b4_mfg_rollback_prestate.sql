-- ============================================================
-- W7 · B4 制造（mes / srm）生产回滚脚本（数据侧，语句级）
-- 目标：把六笔迁移 20261112090000–20261112095000 的数据侧效果恢复到生产 PRE 形态
--
-- PRE 基线（生产只读实测，2026-11-11）：
--   mes 51 表 / 33 RLS / 32 FORCE / 40 策略
--   srm 21 表 / 20 RLS / 20 FORCE / 26 策略 / RESTRICTIVE 0
--   19 表 tenant_id 列 0/19；19 表全 0 行；work_orders 0 行
--   19 表中仅 material_categories / material_requirement_items 有策略（mes_allow_all_*，USING true）
--
-- 依赖回滚物：
--   backups/w7_b4_srm_policies_prod_pre_20261111.sql   26 条生产 srm CREATE POLICY
--     sha256=fed37caf9e8a8a3f2a69ce01313d73e3c65ffcf7e9cc8b6d5f73f78edc17639f
--   （由 backups/w7_b4_srm_schema_prod_20261111.sql 抽取，存档 sha256=88308295…）
--
-- 用法：
--   生产执行： psql -X -v ON_ERROR_STOP=1 -f scripts/ops/w7_b4_mfg_rollback_prestate.sql
--   可执行性预演：psql -X -v ON_ERROR_STOP=1 -v rehearse=1 -f <本文件>
--   自定义策略文件：加 -v rollback_policies='<path>'
--
-- 顺序：先跑本脚本 → 再换回旧二进制 → 再起服务（旧代码不设 app.tenant_id）
-- ============================================================

\set ON_ERROR_STOP on
\if :{?rollback_policies}
\else
\set rollback_policies 'backups/w7_b4_srm_policies_prod_pre_20261111.sql'
\endif

BEGIN;
SET lock_timeout = '5s';

-- ---------- A（20261112090000）：srm 策略还原为生产 26 条 ----------
DO $a$
DECLARE p record;
BEGIN
    FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'srm' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON srm.%I', p.policyname, p.tablename);
    END LOOP;
END
$a$;
\i :rollback_policies

-- ---------- C（20261112092000）：移除隔离表与缺口视图 ----------
-- 生产 19 表全 0 行 → 13 条 UPDATE 命中 0 行，无需还原数据。
-- 必须先于 B/D：缺口视图与 tenant_id 策略都依赖 tenant_id 列。
DROP VIEW IF EXISTS mes.v_tenant_backfill_gaps;
DROP TABLE IF EXISTS mes.tenant_backfill_quarantine;

-- ---------- D（20261112093000）：19 表策略与 RLS 标志还原 ----------
DO $d$
DECLARE
    t text;
    p record;
BEGIN
    -- 17 张 PRE 无 RLS 的表：DROP 新策略 + DISABLE
    FOREACH t IN ARRAY ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_issue_items','material_issues','material_requirements',
        'material_return_items','material_returns','production_lines','quality_records',
        'shifts','team_members','wip_transfers','wips','work_calendars','workshops'
    ] LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='mes' AND tablename=t LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON mes.%I', p.policyname, t);
        END LOOP;
        EXECUTE format('ALTER TABLE mes.%I NO FORCE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE mes.%I DISABLE ROW LEVEL SECURITY', t);
    END LOOP;

    -- 2 张 PRE 已 ENABLE+FORCE 且各 1 条 mes_allow_all_* 的表：DROP 新策略后按原文重建
    FOREACH t IN ARRAY ARRAY['material_categories','material_requirement_items'] LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='mes' AND tablename=t LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON mes.%I', p.policyname, t);
        END LOOP;
        EXECUTE format(
            'CREATE POLICY %I ON mes.%I FOR ALL TO PUBLIC USING (true) WITH CHECK (true)',
            'mes_allow_all_' || t, t
        );
    END LOOP;
END
$d$;

-- ---------- B（20261112091000）：19 张表删除 tenant_id 列 ----------
-- 置于 C/D 之后：视图与策略均依赖该列。
DO $b$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'batch_records','bom_items','equipment_inspections','material_boms',
        'material_categories','material_issue_items','material_issues',
        'material_requirement_items','material_requirements','material_return_items',
        'material_returns','production_lines','quality_records','shifts',
        'team_members','wip_transfers','wips','work_calendars','workshops'
    ] LOOP
        EXECUTE format('ALTER TABLE mes.%I DROP COLUMN IF EXISTS tenant_id', t);
    END LOOP;
END
$b$;

-- ---------- E（20261112094000）：work_orders 恢复 NO FORCE + fail-open 策略 ----------
ALTER TABLE mes.work_orders NO FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.work_orders;
CREATE POLICY rls_tenant_isolation ON mes.work_orders FOR ALL TO PUBLIC
    USING (current_setting('app.tenant_id', true) IS NULL
           OR current_setting('app.tenant_id', true) = ''
           OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
           OR tenant_id IS NULL
           OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid);

-- ---------- F（20261112095000）：生产 no-op，无需数据回滚 ----------

-- ---------- G：删除六笔账本行（必须恰好 6 行） ----------
DO $g$
DECLARE n int;
BEGIN
    DELETE FROM _sqlx_migrations
     WHERE version IN (20261112090000, 20261112091000, 20261112092000,
                       20261112093000, 20261112094000, 20261112095000);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 6 THEN
        RAISE EXCEPTION '回滚失败：账本删除 % 行（期望 6）', n;
    END IF;
END
$g$;

-- ---------- H：终态断言（PRE 形态） ----------
DO $h$
DECLARE
    v_srm_pol int; v_mes_rls int; v_mes_force int; v_mes_pol int;
    v_cols int; v_wo_force boolean;
BEGIN
    SELECT count(*) INTO v_srm_pol FROM pg_policies WHERE schemaname = 'srm';
    IF v_srm_pol <> 26 THEN
        RAISE EXCEPTION '断言失败：srm 策略 %（期望 26）', v_srm_pol;
    END IF;

    SELECT count(*) INTO v_mes_rls FROM pg_class
     WHERE relnamespace = 'mes'::regnamespace AND relrowsecurity;
    IF v_mes_rls <> 33 THEN
        RAISE EXCEPTION '断言失败：mes RLS %（期望 33）', v_mes_rls;
    END IF;

    SELECT count(*) INTO v_mes_force FROM pg_class
     WHERE relnamespace = 'mes'::regnamespace AND relforcerowsecurity;
    IF v_mes_force <> 32 THEN
        RAISE EXCEPTION '断言失败：mes FORCE %（期望 32）', v_mes_force;
    END IF;

    SELECT count(*) INTO v_mes_pol FROM pg_policies WHERE schemaname = 'mes';
    IF v_mes_pol <> 40 THEN
        RAISE EXCEPTION '断言失败：mes 策略 %（期望 40）', v_mes_pol;
    END IF;

    SELECT count(*) INTO v_cols FROM information_schema.columns
     WHERE table_schema = 'mes' AND column_name = 'tenant_id'
       AND table_name IN ('batch_records','bom_items','equipment_inspections','material_boms',
                          'material_categories','material_issue_items','material_issues',
                          'material_requirement_items','material_requirements','material_return_items',
                          'material_returns','production_lines','quality_records','shifts',
                          'team_members','wip_transfers','wips','work_calendars','workshops');
    IF v_cols <> 0 THEN
        RAISE EXCEPTION '断言失败：19 表 tenant_id 残留 % 列（期望 0）', v_cols;
    END IF;

    SELECT relforcerowsecurity INTO v_wo_force FROM pg_class
     WHERE relnamespace = 'mes'::regnamespace AND relname = 'work_orders';
    IF coalesce(v_wo_force, true) THEN
        RAISE EXCEPTION '断言失败：work_orders 仍为 FORCE';
    END IF;

    RAISE NOTICE '回滚断言通过：mes 33/32/40、srm 26、19 表无 tenant_id、work_orders NO FORCE';
END
$h$;

\if :{?rehearse}
\echo '== 预演模式：ROLLBACK（不落任何变更）'
ROLLBACK;
\else
\echo '== 生产模式：COMMIT'
COMMIT;
\endif
