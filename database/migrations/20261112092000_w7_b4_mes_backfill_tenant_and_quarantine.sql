-- ============================================================
-- W7 · B4-mes：tenant_id 回填（父行继承）+ 不可判定行隔离 + 缺口视图
-- 版本：20261112092000
--
-- 回填口径（13 张，父行继承，子表后于父表执行）：
--   bom_items            <- material_boms
--   material_issues      <- production_orders
--   material_issue_items <- material_issues
--   material_returns     <- production_orders
--   material_return_items<- material_returns
--   material_requirements<- production_orders
--   wips                 <- production_orders
--   wip_transfers        <- wips
--   team_members         <- teams
--   equipment_inspections<- equipment
--   production_lines     <- workshops
--   quality_records      <- production_orders
--   work_calendars       <- shifts
--
-- 不可判定行（保持 tenant_id IS NULL，登记 quarantine，不猜、不删）：
--   work_orders            order_id IS NULL（无工单关联）
--   wips                   order_id IS NULL
--   material_boms          无父行可继承
--
-- 明确不在本笔范围（保持现状，不清理、不回填、不删除）：
--   work_orders 47 行 tenant_id = '000…000'（nil UUID，非 SQL NULL）
--   production_orders 30 行 tenant_id IS NULL（旧策略族下 A/B 均不可见，nil 会话仅见自身）
--
-- 回滚（急停）：本笔只写 tenant_id 与 quarantine，不删业务行。
--   UPDATE 的反向语句不提供（继承结果无法区分原本 NULL / 继承值）；
--   回滚方式 = 窗口前超户备份恢复 13 张表 + quarantine 表。
-- ============================================================

-- 执行上下文：回填必须跑在系统通道内。
--   * 父表（teams / equipment / production_orders 等）已有 FORCE RLS，
--     且历史策略存在未带 missing_ok 的 current_setting('app.tenant_id')，
--     未设上下文时会直接报 unrecognized configuration parameter；
--   * 系统通道下可见全量父行，回填结果不受调用方租户影响；
--   * SET LOCAL 在迁移事务内生效，提交/回滚后自动失效（执行器保证单事务）。
SET LOCAL lock_timeout = '5s';
SET LOCAL app.rls_system = 'on';
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000000';

-- ---------- quarantine 表 ----------
CREATE TABLE IF NOT EXISTS mes.tenant_backfill_quarantine (
    table_name text NOT NULL,
    row_id uuid NOT NULL,
    reason text NOT NULL,
    detected_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (table_name, row_id)
);

-- ---------- 回填（13 条，逐条带破坏性豁免标记） ----------

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从物料 BOM 父行继承租户，修复 bom_items 无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.bom_items
UPDATE mes.bom_items c SET tenant_id = p.tenant_id
FROM mes.material_boms p
WHERE c.bom_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从生产工单父行继承租户，修复领料单无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.material_issues
UPDATE mes.material_issues c SET tenant_id = p.tenant_id
FROM mes.production_orders p
WHERE c.order_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从领料单父行继承租户（父行先回填），修复领料明细租户缺失
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.material_issue_items
UPDATE mes.material_issue_items c SET tenant_id = p.tenant_id
FROM mes.material_issues p
WHERE c.issue_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从生产工单父行继承租户，修复退料单无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.material_returns
UPDATE mes.material_returns c SET tenant_id = p.tenant_id
FROM mes.production_orders p
WHERE c.order_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从退料单父行继承租户（父行先回填），修复退料明细租户缺失
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.material_return_items
UPDATE mes.material_return_items c SET tenant_id = p.tenant_id
FROM mes.material_returns p
WHERE c.return_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从生产工单父行继承租户，修复物料需求无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.material_requirements
UPDATE mes.material_requirements c SET tenant_id = p.tenant_id
FROM mes.production_orders p
WHERE c.order_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从生产工单父行继承租户，修复在制品无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.wips
UPDATE mes.wips c SET tenant_id = p.tenant_id
FROM mes.production_orders p
WHERE c.order_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从在制品父行继承租户（父行先回填），修复在制品转移租户缺失
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.wip_transfers
UPDATE mes.wip_transfers c SET tenant_id = p.tenant_id
FROM mes.wips p
WHERE c.wip_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从班组父行继承租户，修复班组成员无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.team_members
UPDATE mes.team_members c SET tenant_id = p.tenant_id
FROM mes.teams p
WHERE c.team_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从设备父行继承租户，修复设备巡检无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.equipment_inspections
UPDATE mes.equipment_inspections c SET tenant_id = p.tenant_id
FROM mes.equipment p
WHERE c.equipment_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从车间父行继承租户，修复产线无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.production_lines
UPDATE mes.production_lines c SET tenant_id = p.tenant_id
FROM mes.workshops p
WHERE c.workshop_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从生产工单父行继承租户，修复质量记录无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.quality_records
UPDATE mes.quality_records c SET tenant_id = p.tenant_id
FROM mes.production_orders p
WHERE c.order_id = p.id AND c.tenant_id IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 从班次父行继承租户，修复工作日历无租户列导致的跨租户可见
-- destructive-owner: mes
-- destructive-ticket: W7-MES-RLS-20261112
-- destructive-expires: 2027-05-31
-- destructive-max-rows: 100000
-- destructive-backup: 窗口前超户 pg_dump -t mes.work_calendars
UPDATE mes.work_calendars c SET tenant_id = p.tenant_id
FROM mes.shifts p
WHERE c.shift_id = p.id AND c.tenant_id IS NULL;

-- ---------- 不可判定行：登记 quarantine（保持 NULL，不猜、不删） ----------
INSERT INTO mes.tenant_backfill_quarantine(table_name, row_id, reason)
SELECT 'work_orders', id, 'no_order_link'
FROM mes.work_orders WHERE tenant_id IS NULL AND order_id IS NULL
ON CONFLICT (table_name, row_id) DO NOTHING;

INSERT INTO mes.tenant_backfill_quarantine(table_name, row_id, reason)
SELECT 'wips', id, 'no_order_link'
FROM mes.wips WHERE tenant_id IS NULL AND order_id IS NULL
ON CONFLICT (table_name, row_id) DO NOTHING;

INSERT INTO mes.tenant_backfill_quarantine(table_name, row_id, reason)
SELECT 'material_boms', id, 'no_parent_link'
FROM mes.material_boms WHERE tenant_id IS NULL
ON CONFLICT (table_name, row_id) DO NOTHING;

-- ---------- 缺口视图：nil 行且未登记 quarantine ----------
CREATE OR REPLACE VIEW mes.v_tenant_backfill_gaps AS
SELECT 'batch_records'::text AS tbl, id FROM mes.batch_records WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='batch_records' AND q.row_id=id)
UNION ALL SELECT 'bom_items', id FROM mes.bom_items WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='bom_items' AND q.row_id=id)
UNION ALL SELECT 'equipment_inspections', id FROM mes.equipment_inspections WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='equipment_inspections' AND q.row_id=id)
UNION ALL SELECT 'material_boms', id FROM mes.material_boms WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_boms' AND q.row_id=id)
UNION ALL SELECT 'material_categories', id FROM mes.material_categories WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_categories' AND q.row_id=id)
UNION ALL SELECT 'material_issue_items', id FROM mes.material_issue_items WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_issue_items' AND q.row_id=id)
UNION ALL SELECT 'material_issues', id FROM mes.material_issues WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_issues' AND q.row_id=id)
UNION ALL SELECT 'material_requirement_items', id FROM mes.material_requirement_items WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_requirement_items' AND q.row_id=id)
UNION ALL SELECT 'material_requirements', id FROM mes.material_requirements WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_requirements' AND q.row_id=id)
UNION ALL SELECT 'material_return_items', id FROM mes.material_return_items WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_return_items' AND q.row_id=id)
UNION ALL SELECT 'material_returns', id FROM mes.material_returns WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='material_returns' AND q.row_id=id)
UNION ALL SELECT 'production_lines', id FROM mes.production_lines WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='production_lines' AND q.row_id=id)
UNION ALL SELECT 'quality_records', id FROM mes.quality_records WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='quality_records' AND q.row_id=id)
UNION ALL SELECT 'shifts', id FROM mes.shifts WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='shifts' AND q.row_id=id)
UNION ALL SELECT 'team_members', id FROM mes.team_members WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='team_members' AND q.row_id=id)
UNION ALL SELECT 'wip_transfers', id FROM mes.wip_transfers WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='wip_transfers' AND q.row_id=id)
UNION ALL SELECT 'wips', id FROM mes.wips WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='wips' AND q.row_id=id)
UNION ALL SELECT 'work_calendars', id FROM mes.work_calendars WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='work_calendars' AND q.row_id=id)
UNION ALL SELECT 'workshops', id FROM mes.workshops WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='workshops' AND q.row_id=id)
UNION ALL SELECT 'work_orders', id FROM mes.work_orders WHERE tenant_id IS NULL AND NOT EXISTS (SELECT 1 FROM mes.tenant_backfill_quarantine q WHERE q.table_name='work_orders' AND q.row_id=id);

-- ---------- 断言：缺口必须为 0，且 quarantine 覆盖所有剩余 nil 行 ----------
DO $w7b4_mes_bf_assert$
DECLARE
    v_gaps bigint;
    v_nil bigint;
    v_q bigint;
BEGIN
    PERFORM set_config('app.rls_system', 'on', true);

    SELECT count(*) INTO v_gaps FROM mes.v_tenant_backfill_gaps;
    IF v_gaps <> 0 THEN
        RAISE EXCEPTION 'W7-B4-MES 回填断言失败：v_tenant_backfill_gaps=%（期望 0）', v_gaps;
    END IF;

    SELECT
        (SELECT count(*) FROM mes.batch_records WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.bom_items WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.equipment_inspections WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_boms WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_categories WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_issue_items WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_issues WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_requirement_items WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_requirements WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_return_items WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.material_returns WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.production_lines WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.quality_records WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.shifts WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.team_members WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.wip_transfers WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.wips WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.work_calendars WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.workshops WHERE tenant_id IS NULL) +
        (SELECT count(*) FROM mes.work_orders WHERE tenant_id IS NULL)
    INTO v_nil;

    SELECT count(*) INTO v_q FROM mes.tenant_backfill_quarantine;
    IF v_nil <> v_q THEN
        RAISE EXCEPTION 'W7-B4-MES 回填断言失败：剩余 nil 行 % ≠ quarantine %', v_nil, v_q;
    END IF;

    PERFORM set_config('app.rls_system', 'off', true);
    RAISE NOTICE 'W7-B4-MES 回填断言通过：gaps=0，剩余 nil % 行全部登记 quarantine', v_nil;
END
$w7b4_mes_bf_assert$;
