-- ============================================================
-- 回滚：20261114100000_w7_b4_status_check_widen_business_states.sql
--
-- 把 18 条 ck_*_status_standard 恢复为 active/inactive/archived 三值。
--
-- ⚠️ 已知代价（实测）：
--   前向迁移一旦写入过新增值（draft/suspected/paid/running…），
--   本回滚的 ADD CONSTRAINT 会因存量行校验失败而中止：
--     ERROR: check constraint "ck_..." of relation "..." is violated by some row
--   回滚前必须先清理/迁移这些新值，不能只回滚迁移文件。
--
-- 本文件按原定义逐字恢复（含 NULL 允许），便于与迁移前 pg_get_constraintdef 对比。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

BEGIN;

DO $status_unwiden$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            ('ehs',        'qa_ehs_disease_cases',              'ck_qa_ehs_disease_cases_status_standard'),
            ('ehs',        'qa_ehs_environmental_regulations',  'ck_qa_ehs_environmental_regulations_status_standard'),
            ('ehs',        'health_records',                    'ck_health_records_status_standard'),
            ('finance',    'reconciliation_snapshots',          'ck_reconciliation_snapshots_status_standard'),
            ('finance',    'settlement_snapshots',              'ck_settlement_snapshots_status_standard'),
            ('finance',    'finance_v60_alerts',                'ck_finance_v60_alerts_status_standard'),
            ('crm',        'billing_records',                   'ck_billing_records_status_standard'),
            ('erp',        'erp_master_data_refs',              'ck_erp_master_data_refs_status_standard'),
            ('master_data','mdm_subscriptions',                 'ck_mdm_subscriptions_status_standard'),
            ('qms',        'qa_alert_messages',                 'ck_qa_alert_messages_status_standard'),
            ('tms',        'tms_carriers',                      'ck_tms_carriers_status_standard'),
            ('tms',        'tms_drivers',                       'ck_tms_drivers_status_standard'),
            ('tms',        'tms_vehicles',                      'ck_tms_vehicles_status_standard'),
            ('wms',        'purchase_order_snapshots',          'ck_purchase_order_snapshots_status_standard'),
            ('integration','integration_sync_logs',             'ck_integration_sync_logs_status_standard'),
            ('integration','mes_erp_sync_logs',                 'ck_mes_erp_sync_logs_status_standard'),
            ('iam',        'users',                             'ck_users_status_standard'),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard')
        ) AS t(sch, tbl, con)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE EXCEPTION 'status-unwiden ABORT: 表 %.% 不存在', r.sch, r.tbl;
        END IF;

        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.sch, r.tbl, r.con);
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (status IS NULL OR status = ANY (%L::text[]))',
            r.sch, r.tbl, r.con, ARRAY['active','inactive','archived']
        );
        RAISE NOTICE 'status-unwiden OK: %.% → active/inactive/archived', r.sch, r.con;
    END LOOP;
END
$status_unwiden$;

COMMIT;
