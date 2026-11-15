-- ============================================================
-- 回滚：20261115000000_w7_b4_status_check_widen_forward.sql
--
-- 把 17 条 ck_*_status_standard 恢复为「20261114100000 目标定义」——
-- 这也是 dev 在应用本前向补丁之前的实际定义。
--
-- 范围说明（2026-11-15 窗口 E）：本补丁为 17 表口径，
-- wms.purchase_order_snapshots 已排除（生产缺 status 列，见
-- topems-table-inventory-2026-11-14.md §7 K7），本回滚同样不触碰该表。
--
-- ⚠️ 已知代价：
--   1) 一旦写入过本批新增值（suspended / pending_review / completed / failed /
--      open / draft …），本回滚的 ADD CONSTRAINT 会因存量行校验失败而中止：
--        ERROR: check constraint "ck_..." of relation "..." is violated by some row
--      回滚前必须先停写并清理/迁移这些新值，不能只回滚迁移文件。
--   2) analytics.report_execution_records 的旧值域只有 running；回滚后代码写入
--      completed/failed 会返回 23514。该表回滚必须与二进制回滚/停写配合。
--   3) 生产 crm.billing_records / iam.users / analytics.report_execution_records
--      三表在应用本补丁前没有同名约束；本回滚会按旧目标定义创建它们。若生产
--      需要严格恢复到「无约束」状态，请人工改为 DROP CONSTRAINT。
--
-- 执行方式（文件自带事务，勿叠加 --single-transaction）：
--   psql "$DSN" -v ON_ERROR_STOP=1 -f \
--     database/rollback/20261115000000_w7_b4_status_check_widen_forward.rollback.sql
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

BEGIN;

DO $status_widen_rollback$
DECLARE
    r          record;
    v_rel      regclass;
    v_bad      bigint;
    v_samples  text;
    v_def      text;
    v_count    integer := 0;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            -- schema, table, constraint, 20261114100000 目标值域
            ('ehs',        'qa_ehs_disease_cases',              'ck_qa_ehs_disease_cases_status_standard',              ARRAY['active','inactive','archived','suspected']),
            ('ehs',        'qa_ehs_environmental_regulations',  'ck_qa_ehs_environmental_regulations_status_standard',  ARRAY['active','inactive','archived','draft']),
            ('ehs',        'health_records',                    'ck_health_records_status_standard',                    ARRAY['active','inactive','archived','pending']),
            ('finance',    'reconciliation_snapshots',          'ck_reconciliation_snapshots_status_standard',          ARRAY['active','inactive','archived','draft','approved']),
            ('finance',    'settlement_snapshots',              'ck_settlement_snapshots_status_standard',              ARRAY['active','inactive','archived','draft','approved','rejected']),
            ('finance',    'finance_v60_alerts',                'ck_finance_v60_alerts_status_standard',                ARRAY['active','inactive','archived','acknowledged','resolved']),
            ('crm',        'billing_records',                   'ck_billing_records_status_standard',                   ARRAY['active','inactive','archived','pending','paid']),
            ('erp',        'erp_master_data_refs',              'ck_erp_master_data_refs_status_standard',              ARRAY['active','inactive','archived','pending_destruction','destroyed']),
            ('master_data','mdm_subscriptions',                 'ck_mdm_subscriptions_status_standard',                 ARRAY['active','inactive','archived','cancelled']),
            ('qms',        'qa_alert_messages',                 'ck_qa_alert_messages_status_standard',                 ARRAY['active','inactive','archived','acknowledged']),
            ('tms',        'tms_carriers',                      'ck_tms_carriers_status_standard',                      ARRAY['active','inactive','archived','rejected']),
            ('tms',        'tms_drivers',                       'ck_tms_drivers_status_standard',                       ARRAY['active','inactive','archived','suspended']),
            ('tms',        'tms_vehicles',                      'ck_tms_vehicles_status_standard',                      ARRAY['active','inactive','archived','maintenance']),
            ('integration', 'integration_sync_logs',            'ck_integration_sync_logs_status_standard',             ARRAY['active','inactive','archived','triggered']),
            ('integration', 'mes_erp_sync_logs',                'ck_mes_erp_sync_logs_status_standard',                 ARRAY['active','inactive','archived','success','failed']),
            ('iam',        'users',                             'ck_users_status_standard',                             ARRAY['active','inactive','archived','pending']),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard',          ARRAY['active','inactive','archived','running'])
        ) AS t(sch, tbl, con, vals)
    LOOP
        v_count := v_count + 1;

        v_rel := to_regclass(format('%I.%I', r.sch, r.tbl));
        IF v_rel IS NULL THEN
            RAISE EXCEPTION 'status-unwiden ABORT: 表 %.% 不存在', r.sch, r.tbl;
        END IF;

        -- 回滚到窄值域前，先确认没有存量行会被新约束拒绝
        EXECUTE format(
            'SELECT count(*) FROM %s WHERE status IS NOT NULL AND status <> ALL (%L::text[])',
            v_rel, r.vals
        ) INTO v_bad;

        IF v_bad > 0 THEN
            EXECUTE format(
                'SELECT string_agg(s.status, %L ORDER BY s.status) FROM (SELECT DISTINCT status FROM %s WHERE status IS NOT NULL AND status <> ALL (%L::text[]) LIMIT 20) s',
                ', ', v_rel, r.vals
            ) INTO v_samples;

            RAISE EXCEPTION 'status-unwiden ABORT: %.% 有 % 行 status 不在回滚值域内 [%]，请先停写并清理数据',
                r.sch, r.tbl, v_bad, coalesce(v_samples, '<unreadable>');
        END IF;

        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', v_rel, r.con);
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I CHECK (status IS NULL OR status = ANY (%L::text[]))',
            v_rel, r.con, r.vals
        );

        SELECT pg_get_constraintdef(k.oid)
          INTO v_def
          FROM pg_constraint k
         WHERE k.conrelid = v_rel
           AND k.conname  = r.con
           AND k.contype  = 'c';

        IF v_def IS NULL THEN
            RAISE EXCEPTION 'status-unwiden VERIFY FAIL: %.% 回滚后仍不存在', r.sch, r.con;
        END IF;

        RAISE NOTICE 'status-unwiden OK: %.% → [%]', r.sch, r.con, r.vals;
    END LOOP;

    RAISE NOTICE 'status-unwiden ROLLBACK OK: % 条约束已恢复到 20261114100000 目标定义', v_count;
END
$status_widen_rollback$;

COMMIT;
