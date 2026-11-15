-- ============================================================
-- W7-B4 重写：`status` 标准 CHECK 扩容（前向补丁，替代 20261114100000）
--
-- reason:
--   20261114100000（w7_b4_status_check_widen_business_states）经 2026-11-15 复核
--   确认不可投递：
--     1) 对生产不存在的约束直接 RAISE EXCEPTION。生产 crm.billing_records /
--        iam.users / analytics.report_execution_records 三张目标表没有
--        ck_*_status_standard，迁移会在第一处断言失败并整笔回滚；
--     2) 6 张表的目标值域窄于代码真实写入：tms_carriers 缺 suspended，
--        mes_erp_sync_logs 缺 pending，integration_sync_logs 缺
--        pending/success/failed，report_execution_records 缺 completed/failed，
--        finance_v60_alerts 缺 draft/pending，qa_alert_messages 缺 open/pending。
--   历史迁移已推送不可改；本文件以更高版本号前向承接：约束不存在则创建，
--   存在但值域不符则按新定义重建。
--
-- 2026-11-15 窗口 E 修订（17 表口径）：
--   排除 wms.purchase_order_snapshots。生产该表只有 3 列
--   （id / deleted_at / tenant_id），没有 status 列；dev 为 14 列，属已登记的
--   生产列漂移（见 topems-table-inventory-2026-11-14.md §7 K7，缺 11 列）。
--   本迁移的前置断言会在该表直接 ABORT，故本窗口不纳入；待补列后由后续
--   迁移单独建立 ck_purchase_order_snapshots_status_standard。
--   版本号保持 20261115000000：本文件尚未进入任何账本，同一件事不拆成两笔。
--
-- owner:  platform-db
-- ticket: TOPEMS-W7-B4-STATUS-WIDEN-20261115
--
-- 口径：
--   目标值域 = 现状 active/inactive/archived ∪ 代码实际写入的流程态；
--   每个新增值都能指到一处真实写入点，见
--   docs/database/status-check-widen-forward-20261115.md。
--
-- 安全 / 幂等：
--   1. 前置断言：表存在、status 列存在且为字符类型；
--   2. 重建前全表校验存量行：出现目标集合外的值立即 RAISE，拒绝静默收窄；
--   3. 同表其他引用 status 列的 CHECK 也必须接受全部目标值，否则扩容无效，RAISE；
--   4. 约束定义已与目标一致则 NOTICE 跳过；否则 DROP + ADD（动态 SQL）；
--   5. 后置断言：约束存在、包含全部目标值、保留 NULL 语义、存量行无越界值；
--      并对实际约束表达式逐值求值，证明全部目标值可被接受；
--   6. 文件内不写 BEGIN/COMMIT，由 apply-forward.sh 的 --single-transaction
--      把 DDL 与 _sqlx_migrations 账本写入包在同一事务里。
--
-- 回滚：
--   database/rollback/20261115000000_w7_b4_status_check_widen_forward.rollback.sql
--   回滚把 17 条约束恢复到 20261114100000 的目标定义（即 dev 在应用本补丁前的
--   状态）。注意：一旦写入过本批新增值（suspended/completed/open…），回滚的
--   ADD CONSTRAINT 会因存量行校验失败而中止，这是预期行为。
--
-- 锁：ADD CONSTRAINT 对每表取 ACCESS EXCLUSIVE 并全表校验；生产窗口需先停写。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ---------------------------------------------------------------------------
-- 1) 应用：按目标值域创建或重建 17 条 ck_*_status_standard
-- ---------------------------------------------------------------------------
DO $status_widen_forward$
DECLARE
    r          record;
    v_rel      regclass;
    v_attnum   int2;
    v_type     text;
    v_contype  "char";
    v_def      text;
    v_expr     text;
    v_cur      text[];
    v_eq       boolean;
    v_bad      bigint;
    v_samples  text;
    v_other    text;
    v_conkey   int2[];
    v_val      text;
    v_ok       boolean;
    v_count    integer := 0;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            -- schema, table, constraint, 目标值域
            ('ehs',        'qa_ehs_disease_cases',              'ck_qa_ehs_disease_cases_status_standard',              ARRAY['active','inactive','archived','suspected']),
            ('ehs',        'qa_ehs_environmental_regulations',  'ck_qa_ehs_environmental_regulations_status_standard',  ARRAY['active','inactive','archived','draft']),
            ('ehs',        'health_records',                    'ck_health_records_status_standard',                    ARRAY['active','inactive','archived','pending']),
            ('finance',    'reconciliation_snapshots',          'ck_reconciliation_snapshots_status_standard',          ARRAY['active','inactive','archived','draft','approved']),
            ('finance',    'settlement_snapshots',              'ck_settlement_snapshots_status_standard',              ARRAY['active','inactive','archived','draft','approved','rejected']),
            ('finance',    'finance_v60_alerts',                'ck_finance_v60_alerts_status_standard',                ARRAY['active','inactive','archived','draft','pending','acknowledged','resolved']),
            ('crm',        'billing_records',                   'ck_billing_records_status_standard',                   ARRAY['active','inactive','archived','pending','paid']),
            ('erp',        'erp_master_data_refs',              'ck_erp_master_data_refs_status_standard',              ARRAY['active','inactive','archived','pending_destruction','destroyed']),
            ('master_data','mdm_subscriptions',                 'ck_mdm_subscriptions_status_standard',                 ARRAY['active','inactive','archived','cancelled']),
            ('qms',        'qa_alert_messages',                 'ck_qa_alert_messages_status_standard',                 ARRAY['active','inactive','archived','open','pending','acknowledged']),
            ('tms',        'tms_carriers',                      'ck_tms_carriers_status_standard',                      ARRAY['active','inactive','archived','pending_review','suspended','blacklisted','rejected']),
            ('tms',        'tms_drivers',                       'ck_tms_drivers_status_standard',                       ARRAY['active','inactive','archived','suspended']),
            ('tms',        'tms_vehicles',                      'ck_tms_vehicles_status_standard',                      ARRAY['active','inactive','archived','maintenance']),
            ('integration','integration_sync_logs',             'ck_integration_sync_logs_status_standard',             ARRAY['active','inactive','archived','pending','triggered','success','failed']),
            ('integration','mes_erp_sync_logs',                 'ck_mes_erp_sync_logs_status_standard',                 ARRAY['active','inactive','archived','pending','success','failed']),
            ('iam',        'users',                             'ck_users_status_standard',                             ARRAY['active','inactive','archived','pending']),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard',          ARRAY['active','inactive','archived','running','completed','failed'])
        ) AS t(sch, tbl, con, vals)
    LOOP
        v_count := v_count + 1;

        -- 前置断言 1：表必须存在
        v_rel := to_regclass(format('%I.%I', r.sch, r.tbl));
        IF v_rel IS NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: 表 %.% 不存在', r.sch, r.tbl;
        END IF;

        -- 前置断言 2：status 列必须存在且为字符类型
        SELECT a.attnum, format_type(a.atttypid, a.atttypmod)
          INTO v_attnum, v_type
          FROM pg_attribute a
         WHERE a.attrelid = v_rel
           AND a.attname  = 'status'
           AND NOT a.attisdropped;

        IF v_attnum IS NULL THEN
            RAISE EXCEPTION 'status-widen ABORT: %.%.status 列不存在', r.sch, r.tbl;
        END IF;

        IF NOT (v_type = 'text'
                OR v_type LIKE 'character varying%'
                OR v_type LIKE 'character(%') THEN
            RAISE EXCEPTION 'status-widen ABORT: %.%.status 类型为 [%]，非字符类型，拒绝自动处理',
                r.sch, r.tbl, v_type;
        END IF;

        -- 前置断言 3：存量行不得出现目标集合外的值（DROP/ADD 前先拒收窄）
        EXECUTE format(
            'SELECT count(*) FROM %s WHERE status IS NOT NULL AND status <> ALL (%L::text[])',
            v_rel, r.vals
        ) INTO v_bad;

        IF v_bad > 0 THEN
            EXECUTE format(
                'SELECT string_agg(s.status, %L ORDER BY s.status) FROM (SELECT DISTINCT status FROM %s WHERE status IS NOT NULL AND status <> ALL (%L::text[]) LIMIT 20) s',
                ', ', v_rel, r.vals
            ) INTO v_samples;

            RAISE EXCEPTION 'status-widen ABORT: %.% 有 % 行 status 不在目标值域内 [%]，拒绝静默收窄',
                r.sch, r.tbl, v_bad, coalesce(v_samples, '<unreadable>');
        END IF;

        -- 前置断言 4：同表其他引用 status 列的 CHECK 必须接受目标值，否则扩容无效
        FOR v_other, v_expr, v_conkey IN
            SELECT k.conname, pg_get_expr(k.conbin, k.conrelid), k.conkey
              FROM pg_constraint k
             WHERE k.conrelid = v_rel
               AND k.contype  = 'c'
               AND k.conname <> r.con
               AND v_attnum   = ANY (k.conkey)
        LOOP
            IF array_length(v_conkey, 1) IS DISTINCT FROM 1 THEN
                RAISE EXCEPTION 'status-widen ABORT: %.% 存在多列约束 [%] 引用 status，需人工确认后再执行',
                    r.sch, r.tbl, v_other;
            END IF;

            FOREACH v_val IN ARRAY r.vals LOOP
                BEGIN
                    EXECUTE format(
                        'SELECT coalesce((%s)::boolean, false) FROM (SELECT %L::text AS status) s',
                        v_expr, v_val
                    ) INTO v_ok;
                EXCEPTION WHEN others THEN
                    RAISE EXCEPTION 'status-widen ABORT: %.% 同列约束 [%] 无法求值（%）',
                        r.sch, r.tbl, v_other, SQLERRM;
                END;

                IF NOT v_ok THEN
                    RAISE EXCEPTION 'status-widen ABORT: %.% 同列约束 [%] 会拒绝目标值 [%]',
                        r.sch, r.tbl, v_other, v_val;
                END IF;
            END LOOP;
        END LOOP;

        -- 读取既有同名约束（存在则必须且只能是 CHECK）
        SELECT k.contype, pg_get_constraintdef(k.oid)
          INTO v_contype, v_def
          FROM pg_constraint k
         WHERE k.conrelid = v_rel
           AND k.conname  = r.con;

        IF v_contype IS NOT NULL AND v_contype <> 'c' THEN
            RAISE EXCEPTION 'status-widen ABORT: %.% 已是 % 类型约束，非 CHECK，拒绝处理',
                r.sch, r.con, v_contype;
        END IF;

        -- 解析既有值域，判断是否已经与目标一致
        v_cur := NULL;
        v_eq  := false;
        IF v_def IS NOT NULL THEN
            SELECT array_agg(DISTINCT btrim(btrim(x), '{}'))
              INTO v_cur
              FROM regexp_matches(v_def, '''([^'']*)''', 'g') AS m(chunk),
                   LATERAL unnest(string_to_array(m[1], ',')) AS x;

            IF v_cur IS NOT NULL AND v_def LIKE '%status IS NULL%' THEN
                v_eq := NOT EXISTS (
                            SELECT 1 FROM unnest(r.vals) u(val)
                             WHERE NOT (u.val = ANY (v_cur)))
                        AND NOT EXISTS (
                            SELECT 1 FROM unnest(v_cur) u(val)
                             WHERE NOT (u.val = ANY (r.vals)));
            END IF;
        END IF;

        IF v_eq THEN
            RAISE NOTICE 'status-widen SKIP: %.%（定义已与目标一致）', r.sch, r.con;
        ELSE
            IF v_def IS NOT NULL THEN
                EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', v_rel, r.con);
            END IF;

            EXECUTE format(
                'ALTER TABLE %s ADD CONSTRAINT %I CHECK (status IS NULL OR status = ANY (%L::text[]))',
                v_rel, r.con, r.vals
            );

            IF v_def IS NULL THEN
                RAISE NOTICE 'status-widen OK: %.% 新建（目标值域 [%]）', r.sch, r.con, r.vals;
            ELSE
                RAISE NOTICE 'status-widen OK: %.% 重建（原定义：%）', r.sch, r.con, v_def;
            END IF;
        END IF;

        -- 后置断言：对实际落地的约束表达式逐值求值，证明全部目标值可被接受
        SELECT pg_get_expr(k.conbin, k.conrelid), pg_get_constraintdef(k.oid)
          INTO v_expr, v_def
          FROM pg_constraint k
         WHERE k.conrelid = v_rel
           AND k.conname  = r.con
           AND k.contype  = 'c';

        IF v_expr IS NULL THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 重建后仍不存在', r.sch, r.con;
        END IF;

        IF v_def NOT LIKE '%status IS NULL%' THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 丢失 NULL 语义（定义：%）',
                r.sch, r.con, v_def;
        END IF;

        FOREACH v_val IN ARRAY r.vals LOOP
            EXECUTE format(
                'SELECT coalesce((%s)::boolean, false) FROM (SELECT %L::text AS status) s',
                v_expr, v_val
            ) INTO v_ok;

            IF NOT v_ok THEN
                RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 拒绝目标值 [%]',
                    r.sch, r.con, v_val;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'status-widen APPLY OK: % 张表的约束均已落地并通过逐值验证', v_count;
END
$status_widen_forward$;

-- ---------------------------------------------------------------------------
-- 2) 终态校验：重新读取全部约束，确认存在、值域覆盖、存量无越界
-- ---------------------------------------------------------------------------
DO $status_widen_forward_verify$
DECLARE
    r          record;
    v_rel      regclass;
    v_def      text;
    v_expr     text;
    v_cur      text[];
    v_missing  text;
    v_bad      bigint;
    v_val      text;
    v_ok       boolean;
    v_count    integer := 0;
BEGIN
    FOR r IN
        SELECT *
        FROM (VALUES
            ('ehs',        'qa_ehs_disease_cases',              'ck_qa_ehs_disease_cases_status_standard',              ARRAY['active','inactive','archived','suspected']),
            ('ehs',        'qa_ehs_environmental_regulations',  'ck_qa_ehs_environmental_regulations_status_standard',  ARRAY['active','inactive','archived','draft']),
            ('ehs',        'health_records',                    'ck_health_records_status_standard',                    ARRAY['active','inactive','archived','pending']),
            ('finance',    'reconciliation_snapshots',          'ck_reconciliation_snapshots_status_standard',          ARRAY['active','inactive','archived','draft','approved']),
            ('finance',    'settlement_snapshots',              'ck_settlement_snapshots_status_standard',              ARRAY['active','inactive','archived','draft','approved','rejected']),
            ('finance',    'finance_v60_alerts',                'ck_finance_v60_alerts_status_standard',                ARRAY['active','inactive','archived','draft','pending','acknowledged','resolved']),
            ('crm',        'billing_records',                   'ck_billing_records_status_standard',                   ARRAY['active','inactive','archived','pending','paid']),
            ('erp',        'erp_master_data_refs',              'ck_erp_master_data_refs_status_standard',              ARRAY['active','inactive','archived','pending_destruction','destroyed']),
            ('master_data','mdm_subscriptions',                 'ck_mdm_subscriptions_status_standard',                 ARRAY['active','inactive','archived','cancelled']),
            ('qms',        'qa_alert_messages',                 'ck_qa_alert_messages_status_standard',                 ARRAY['active','inactive','archived','open','pending','acknowledged']),
            ('tms',        'tms_carriers',                      'ck_tms_carriers_status_standard',                      ARRAY['active','inactive','archived','pending_review','suspended','blacklisted','rejected']),
            ('tms',        'tms_drivers',                       'ck_tms_drivers_status_standard',                       ARRAY['active','inactive','archived','suspended']),
            ('tms',        'tms_vehicles',                      'ck_tms_vehicles_status_standard',                      ARRAY['active','inactive','archived','maintenance']),
            ('integration','integration_sync_logs',             'ck_integration_sync_logs_status_standard',             ARRAY['active','inactive','archived','pending','triggered','success','failed']),
            ('integration','mes_erp_sync_logs',                 'ck_mes_erp_sync_logs_status_standard',                 ARRAY['active','inactive','archived','pending','success','failed']),
            ('iam',        'users',                             'ck_users_status_standard',                             ARRAY['active','inactive','archived','pending']),
            ('analytics',  'report_execution_records',          'ck_report_execution_records_status_standard',          ARRAY['active','inactive','archived','running','completed','failed'])
        ) AS t(sch, tbl, con, vals)
    LOOP
        v_count := v_count + 1;
        v_rel := to_regclass(format('%I.%I', r.sch, r.tbl));

        SELECT pg_get_constraintdef(k.oid), pg_get_expr(k.conbin, k.conrelid)
          INTO v_def, v_expr
          FROM pg_constraint k
         WHERE k.conrelid = v_rel
           AND k.conname  = r.con
           AND k.contype  = 'c';

        IF v_def IS NULL THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: 约束 %.% 缺失', r.sch, r.con;
        END IF;

        IF v_def NOT LIKE '%status IS NULL%' THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 丢失 NULL 语义（定义：%）',
                r.sch, r.con, v_def;
        END IF;

        SELECT array_agg(DISTINCT btrim(btrim(x), '{}'))
          INTO v_cur
          FROM regexp_matches(v_def, '''([^'']*)''', 'g') AS m(chunk),
               LATERAL unnest(string_to_array(m[1], ',')) AS x;

        SELECT string_agg(u.val, ',')
          INTO v_missing
          FROM unnest(r.vals) AS u(val)
         WHERE v_cur IS NULL OR NOT (u.val = ANY (v_cur));

        IF v_missing IS NOT NULL THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 缺少目标值 [%]', r.sch, r.con, v_missing;
        END IF;

        FOREACH v_val IN ARRAY r.vals LOOP
            EXECUTE format(
                'SELECT coalesce((%s)::boolean, false) FROM (SELECT %L::text AS status) s',
                v_expr, v_val
            ) INTO v_ok;

            IF NOT v_ok THEN
                RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 拒绝目标值 [%]',
                    r.sch, r.con, v_val;
            END IF;
        END LOOP;

        EXECUTE format(
            'SELECT count(*) FROM %s WHERE status IS NOT NULL AND status <> ALL (%L::text[])',
            v_rel, r.vals
        ) INTO v_bad;

        IF v_bad > 0 THEN
            RAISE EXCEPTION 'status-widen VERIFY FAIL: %.% 仍有 % 行越界值', r.sch, r.tbl, v_bad;
        END IF;
    END LOOP;

    RAISE NOTICE 'status-widen VERIFY OK: % 条约束存在、值域覆盖目标、存量无越界', v_count;
END
$status_widen_forward_verify$;
