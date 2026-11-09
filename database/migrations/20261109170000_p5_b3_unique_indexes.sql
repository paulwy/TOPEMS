-- P5 B3：补齐代码 ON CONFLICT / upsert 依赖的唯一索引
--
-- 依据：docs/quality/prod-column-drift-workorder-2026-11-09.md §2 M0（19 处）
-- 已完成（本批不重复）：erp.materials、finance.core_finance_periods、
--   finance.core_finance_vouchers（见 20261109160300 / 160400）。
-- 本批剩余 15 处，逐条幂等：
--   1) 表不存在 → NOTICE 跳过；
--   2) 索引列不存在 → NOTICE 跳过（不改结构，避免猜列）；
--   3) 已有同名索引但不是 UNIQUE → NOTICE 跳过（不静默替换）；
--   4) 存在重复键 → NOTICE 跳过（留给人工清数后重跑），不让迁移失败阻塞发布。
--
-- 例外说明：flow.core_migration_history 的代码写入列为
--   (script_name, checksum, status, applied_at, execution_time_ms)，
--   而库内只有 (name, applied_at, duration_ms, success)，
--   属于表结构与代码整体不一致，不是缺索引，故不在本批创建唯一索引。

DO $$
DECLARE
    r RECORD;
    exists_table boolean;
    missing_cols int;
    has_dup boolean;
    idx_is_unique boolean;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('ai',     'ai_training_samples',       'uq_ai_training_samples_source',     'source_type, source_id'),
            ('crm',    'customer_tags',             'uq_crm_customer_tags_customer_tag', 'customer_id, tag'),
            ('flow',   'core_flow_variables',       'uq_flow_core_flow_variables_scope', 'scope, instance_id, task_id, workflow_id, var_key'),
            ('mobile', 'mobile_push_notifications', 'uq_mobile_push_source',             'source_type, source_id'),
            ('pdm',    'pdm_project_members',       'uq_pdm_project_members_tenant_user','tenant_id, project_id, user_id'),
            ('pm',     'project_benefits',          'uq_pm_project_benefits_period',     'project_id, period_type, period_date'),
            ('pm',     'project_members',           'uq_pm_project_members_project_user','project_id, user_id'),
            ('public', 'automation_variables',      'uq_automation_variables_tenant_key','tenant_id, key'),
            ('public', 'monitor_settings',          'uq_monitor_settings_tenant_key',    'tenant_id, key'),
            ('public', 'system_settings',           'uq_system_settings_tenant_key',     'tenant_id, key'),
            ('qms',    'qa_corrective_actions',     'uq_qa_corrective_actions_no',       'action_no'),
            ('scm',    'suppliers',                 'uq_scm_suppliers_no',               'supplier_no'),
            ('scm',    'wms_inventory_snapshots',   'uq_wms_snapshot_wh_item',           'warehouse_id, item_code'),
            ('srm',    'supplier_performance',      'uq_srm_supplier_performance',       'supplier_id, tenant_id'),
            ('srm',    'suppliers',                 'uq_srm_suppliers_no',               'supplier_no')
        ) AS v(sch, tbl, idx, cols)
    LOOP
        exists_table := to_regclass(format('%I.%I', r.sch, r.tbl)) IS NOT NULL;
        IF NOT exists_table THEN
            RAISE NOTICE 'P5 B3: %.% 不存在，跳过索引 %', r.sch, r.tbl, r.idx;
            CONTINUE;
        END IF;

        SELECT count(*) INTO missing_cols
        FROM regexp_split_to_table(r.cols, '\s*,\s*') AS c(col)
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns ic
            WHERE ic.table_schema = r.sch
              AND ic.table_name = r.tbl
              AND ic.column_name = btrim(c.col)
        );
        IF missing_cols > 0 THEN
            RAISE NOTICE 'P5 B3: %.% 缺 % 个索引列，跳过索引 %', r.sch, r.tbl, missing_cols, r.idx;
            CONTINUE;
        END IF;

        SELECT i.indisunique INTO idx_is_unique
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = r.sch AND c.relname = r.idx;
        IF FOUND THEN
            IF NOT idx_is_unique THEN
                RAISE NOTICE 'P5 B3: 索引 %.% 已存在但非 UNIQUE，保留现状', r.sch, r.idx;
            END IF;
            CONTINUE;
        END IF;

        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM %I.%I GROUP BY %s HAVING count(*) > 1)',
            r.sch, r.tbl, r.cols
        ) INTO has_dup;
        IF has_dup THEN
            RAISE NOTICE 'P5 B3: %.% 在 (%s) 上存在重复键，跳过唯一索引 %，清数后重跑', r.sch, r.tbl, r.cols, r.idx;
            CONTINUE;
        END IF;

        EXECUTE format('CREATE UNIQUE INDEX %I ON %I.%I (%s)', r.idx, r.sch, r.tbl, r.cols);
        RAISE NOTICE 'P5 B3: 已创建唯一索引 %.%.%', r.sch, r.tbl, r.idx;
    END LOOP;
END $$;
