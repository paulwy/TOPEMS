-- ============================================================
-- W7-B4：`status` 标准 CHECK 扩容（补齐代码真实写入的业务态）
--
-- 背景：
--   全库 ck_*_status_standard 统一为 active/inactive/archived 三值，
--   但 18 张表的代码写入点会写入流程态（draft/suspected/paid/running…），
--   导致接口 500（23514 check_violation）。业务口径（2026-11-14 确认）：
--   这些流程态必须保留，改约束、不改代码。
--
-- 口径：
--   每张表的目标值 = 「现状允许值 ∪ 代码字面量」，不整表放宽、不加任意值；
--   每个新增值都能指到一处真实写入代码（清单见
--   status约束清单-2026-11-14.md）。
--
-- 安全：
--   1. 表/约束缺失即 RAISE EXCEPTION，不静默跳过；
--   2. 重建前校验「现状定义中没有目标集合外的值」——定义已漂移时中止，
--      避免 DROP+ADD 静默收窄值域；
--   3. 约束保持 `status IS NULL OR ...`，NULL 语义不变；
--   4. ADD CONSTRAINT 会校验存量行（本批 18 张表现存值全在目标集合内）。
--
-- 幂等：
--   已包含全部目标值时 NOTICE 跳过；DROP+ADD 位于同一事务，失败整体回滚。
--
-- 回滚：
--   database/rollback/20261114100000_w7_b4_status_check_widen_business_states.rollback.sql
--   注意：一旦写入过新增值（如 draft），回滚会因存量行校验失败而中止。
--
-- 锁：ADD CONSTRAINT 对每表取 ACCESS EXCLUSIVE 并全表校验；本批 18 张表
--     生产存量均 ≤ 40 行（2026-11-14 只读核实），窗口内执行即可。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

BEGIN;

DO $status_widen$
DECLARE
    r          record;
    v_def      text;
    v_cur      text[];
    v_outside  text;
    v_missing  text;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            -- schema, table, constraint, 现状三值 ∪ 代码字面量
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
            ('wms',        'purchase_order_snapshots',          'ck_purchase_order_snapshots_status_standard',          ARRAY['active','inactive','archived','pending','approved']),
            ('integration','integration_sync_logs',             'ck_integration_sync_logs_status_standard',             ARRAY['active','inactive','archived','triggered']),
            ('integration','mes_erp_sync_logs',                 'ck_mes_erp_sync_logs_status_standard',                 ARRAY['active','inactive','archived','success','failed']),
            ('iam',        'users',                             'ck_users_status_standard',                             ARRAY['active','inactive','archived','pending']),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard',          ARRAY['active','inactive','archived','running'])
        ) AS t(sch, tbl, con, vals)
    LOOP
        IF to_regclass(format('%I.%I', r.sch, r.tbl)) IS NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: 表 %.% 不存在', r.sch, r.tbl;
        END IF;

        SELECT pg_get_constraintdef(k.oid)
          INTO v_def
          FROM pg_constraint k
         WHERE k.conrelid = format('%I.%I', r.sch, r.tbl)::regclass
           AND k.conname  = r.con
           AND k.contype  = 'c';

        IF v_def IS NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: 约束 %.% 不存在', r.sch, r.con;
        END IF;

        -- 解析现状允许值：兼容 ARRAY['a','b'] 与 '{a,b}' 两种渲染形式，
        -- 按逗号拆分后精确比较（避免 'active' 命中 'inactive' 的子串误判）。
        SELECT array_agg(DISTINCT btrim(trim(x), '{}'))
          INTO v_cur
          FROM regexp_matches(v_def, '''([^'']*)''', 'g') AS m(chunk),
               unnest(string_to_array(m[1], ',')) AS x;

        IF v_cur IS NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: %.% 定义中解析不出允许值 [%]', r.sch, r.con, v_def;
        END IF;

        -- 现状定义必须被目标集合完全覆盖；出现目标外的字面量说明已漂移，
        -- 此时 DROP+ADD 会静默收窄值域，故中止人工处理。
        SELECT string_agg(u.val, ',')
          INTO v_outside
          FROM unnest(v_cur) AS u(val)
         WHERE NOT (u.val = ANY (r.vals));

        IF v_outside IS NOT NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: %.% 现有定义含目标集合外的值 [%]，拒绝静默收窄',
                r.sch, r.con, v_outside;
        END IF;

        -- 已包含全部目标值 → 幂等跳过
        SELECT string_agg(u.val, ',')
          INTO v_missing
          FROM unnest(r.vals) AS u(val)
         WHERE NOT (u.val = ANY (v_cur));

        IF v_missing IS NULL THEN
            RAISE NOTICE 'status-widen SKIP: %.%（已含全部目标值）', r.sch, r.con;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.sch, r.tbl, r.con);
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I CHECK (status IS NULL OR status = ANY (%L::text[]))',
            r.sch, r.tbl, r.con, r.vals
        );
        RAISE NOTICE 'status-widen OK: %.% + [%]', r.sch, r.con, v_missing;
    END LOOP;
END
$status_widen$;

-- 终态校验：18 条约束都必须存在且包含全部目标值
DO $status_widen_verify$
DECLARE
    r         record;
    v_def     text;
    v_cur     text[];
    v_missing text;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
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
            ('wms',        'purchase_order_snapshots',          'ck_purchase_order_snapshots_status_standard',          ARRAY['active','inactive','archived','pending','approved']),
            ('integration','integration_sync_logs',             'ck_integration_sync_logs_status_standard',             ARRAY['active','inactive','archived','triggered']),
            ('integration','mes_erp_sync_logs',                 'ck_mes_erp_sync_logs_status_standard',                 ARRAY['active','inactive','archived','success','failed']),
            ('iam',        'users',                             'ck_users_status_standard',                             ARRAY['active','inactive','archived','pending']),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard',          ARRAY['active','inactive','archived','running'])
        ) AS t(sch, tbl, con, vals)
    LOOP
        SELECT pg_get_constraintdef(k.oid)
          INTO v_def
          FROM pg_constraint k
         WHERE k.conrelid = format('%I.%I', r.sch, r.tbl)::regclass
           AND k.conname  = r.con
           AND k.contype  = 'c';

        IF v_def IS NULL THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: 约束 %.% 缺失', r.sch, r.con;
        END IF;

        SELECT array_agg(DISTINCT btrim(trim(x), '{}'))
          INTO v_cur
          FROM regexp_matches(v_def, '''([^'']*)''', 'g') AS m(chunk),
               unnest(string_to_array(m[1], ',')) AS x;

        SELECT string_agg(u.val, ',')
          INTO v_missing
          FROM unnest(r.vals) AS u(val)
         WHERE NOT (u.val = ANY (v_cur));

        IF v_missing IS NOT NULL THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 缺少 [%]', r.sch, r.con, v_missing;
        END IF;
    END LOOP;

    RAISE NOTICE 'status-widen VERIFY OK: 18 条约束全部包含目标值';
END
$status_widen_verify$;

COMMIT;
