-- =============================================================================
-- 窗口前预检（只读）：TOPEMS R5 归档三批（2026-11-19 重算版）
--
-- 用法（非特权只读，日常/窗口前）：
--   PGPASSFILE=$HOME/.pgpass psql "postgresql://topems_drift@127.0.0.1:5432/topems_prod" \
--     -f docs/database/window-preflight-2026-11-19.sql \
--     > preflight_$(date +%Y%m%d_%H%M%S).txt 2>&1
--
-- 用法（DBA 特权只读，补齐 C16 行数门禁）：
--   用同一文件、同一只读事务设置，换有 132 张表 SELECT 权限的只读账号执行。
--
-- 判读：
--   * exit 0，且输出中不得出现 ERROR。
--   * 第 9 节 C1–C15、C17 必须 PASS、第 7.5 节 C18 必须 PASS；C16 在 topems_drift 下为 NEEDS_DBA，
--     必须由 DBA 特权只读会话复跑本文件后转为 PASS。
--   * 本脚本不建临时表、不写任何生产对象；只查询 pg_catalog / pg_policies /
--     pg_proc / pg_constraint 与账本。
--   * 窗口前基线：prod 账本 721/721、max 20261119000002、failed 0。
-- =============================================================================
\set ON_ERROR_STOP on
\pset pager off
SET default_transaction_read_only = on;
SET statement_timeout = '600s';

\echo '== 0. 会话身份（只读）=='
SELECT current_user,
       current_database(),
       coalesce(inet_server_addr()::text, 'local') AS server_addr,
       current_setting('transaction_read_only') AS txn_read_only;

\echo '== 1. 账本水位与四条窗口版本 =='
SELECT count(*) AS ledger_rows,
       count(*) FILTER (WHERE success) AS success_rows,
       count(*) FILTER (WHERE NOT success) AS failed_rows,
       min(version) AS min_version,
       max(version) AS max_version
FROM _sqlx_migrations;

SELECT version,
       success,
       installed_on,
       encode(checksum, 'hex') AS sha384
FROM _sqlx_migrations
WHERE version IN (20261119160000, 20261119180000, 20261119200000, 20261119233000)
ORDER BY version;
-- 期望：0 行（四条均未应用）

\echo '== 2. 全局表 / RLS / 策略基线（窗口前 1344 / 959 / 1050）=='
SELECT count(*) FILTER (WHERE c.relkind IN ('r','p')) AS tables_rp,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND c.relrowsecurity) AS rls_enabled,
       count(*) FILTER (WHERE c.relkind IN ('r','p') AND c.relforcerowsecurity) AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema');

SELECT count(*) AS policies
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog','information_schema');

\echo '== 3. archive schema 与簿记表（窗口前应不存在）=='
SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'archive') AS archive_schema_exists,
       (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'archive' AND c.relkind = 'r') AS archive_tables;

\echo '== 4. 三批汇总（在位 / 缺失 / RLS / 策略 / 入向 FK / 外部 FK / 视图 / 触发器）=='
WITH b(sch, tbl, wave) AS (
  SELECT sch, tbl, 'W1' FROM (VALUES
    ('doc','document_versions'),('doc','documents'),('doc','folders'),('doc','templates'),
    ('doc_service','archives'),('doc_service','files'),('doc_service','folders'),('doc_service','templates'),
    ('flow','notifications'),('flow','workflows'),('iam','permissions'),
    ('mail','emails'),('mail','templates'),('notification','notifications'),
    ('report','reports'),('storage','files')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W2' FROM (VALUES
    ('analytics','analytics_comparison_analyses'),('analytics','analytics_comparison_results'),('analytics','analytics_dashboard_shares'),('analytics','analytics_dashboard_templates'),('analytics','analytics_dashboards'),('analytics','analytics_datasets'),('analytics','analytics_datasources'),('analytics','analytics_drilldown_history'),('analytics','analytics_drilldown_paths'),('analytics','analytics_row_level_permissions'),('analytics','analytics_self_service_reports'),('analytics','analytics_sync_records'),('analytics','analytics_widgets'),('analytics','report_schedules'),('analytics','report_subscriptions'),('analytics','report_templates'),('analytics','reports'),('communication','core_email_templates'),('doc_service','core_doc_documents'),('doc_service','core_doc_folders'),('doc_service','core_doc_templates'),('flow','approval_records'),('flow','approvals'),('flow','audit_logs'),('flow','core_file_folders'),('flow','core_file_permissions'),('flow','core_files'),('flow','core_flow_delegates'),('flow','core_flow_rules'),('flow','core_flow_variable_history'),('flow','core_flow_variables'),('flow','core_master_data_refs'),('flow','core_mdm_reconciliation_log'),('flow','core_migration_history'),('flow','core_workflow_instances'),('flow','core_workflow_tasks'),('flow','core_workflow_versions'),('flow','core_workflows'),('iam','audit_logs'),('iam','auth_sessions'),('iam','core_billing_invoices'),('iam','core_billing_plans'),('iam','core_chat_members'),('iam','core_chat_messages'),('iam','core_chat_rooms'),('iam','core_dashboard_refresh_log'),('iam','core_dict_items'),('iam','core_dict_types'),('iam','core_email_queue'),('iam','core_email_templates'),('iam','core_emails'),('iam','core_faqs'),('iam','core_file_folders'),('iam','core_files'),('iam','core_guide_lessons'),('iam','core_guide_progress'),('iam','core_guides'),('iam','core_inter_module_sync'),('iam','core_login_logs'),('iam','core_menu_groups'),('iam','core_menus'),('iam','core_migration_history'),('iam','core_mobile_offline_records'),('iam','core_notification_templates'),('iam','core_notifications'),('iam','core_plugin_categories'),('iam','core_plugin_instances'),('iam','core_plugin_permissions'),('iam','core_plugin_pricing'),('iam','core_plugin_reviews'),('iam','core_plugin_versions'),('iam','core_plugins'),('iam','core_subscriptions'),('iam','core_tenant_modules'),('iam','core_tenant_settings'),('iam','core_tenant_usage'),('iam','core_tenant_users'),('iam','core_usage_records'),('iam','core_workflow_instances'),('iam','core_workflow_tasks'),('iam','core_workflows'),('iam','crm_dashboard_snapshots'),('iam','data_permissions'),('iam','dynamic_data'),('iam','ehs_dashboard_snapshots'),('iam','hrm_dashboard_snapshots'),('iam','lims_dashboard_snapshots'),('iam','password_reset_tokens'),('iam','pdm_dashboard_snapshots'),('iam','permission_audit_logs'),('iam','permission_templates'),('iam','refresh_tokens'),('iam','schema_registry'),('iam','sessions'),('iam','tenant_users'),('iam','user_access_logs'),('iam','user_roles'),('iam','wms_dashboard_snapshots'),('plugin_erp','accounting_subjects'),('plugin_finance','difference_adjustments'),('plugin_finance','reconciliation_item_snapshots'),('plugin_finance','reconciliation_settlement_links'),('plugin_finance','reconciliation_snapshots'),('plugin_finance','settlement_snapshots'),('plugin_finance','source_amount_snapshots'),('plugin_mes','audit_logs'),('plugin_wms','purchase_order_snapshots'),('unified_core','documents')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W3' FROM (VALUES
    ('flow','core_tenants'),('iam','core_tenants'),('iam','core_users'),
    ('iam','core_user_roles'),
    ('flow','_deprecated_core_tenant_modules'),('flow','_deprecated_core_tenant_settings'),
    ('flow','_deprecated_core_tenant_usage'),('flow','_deprecated_core_tenant_users')
  ) v(sch, tbl)
),
pres AS (
  SELECT b.wave,
         count(*) AS total,
         count(c.oid) AS present,
         count(*) FILTER (WHERE c.oid IS NOT NULL AND c.relrowsecurity) AS rls_tables,
         count(*) FILTER (WHERE c.oid IS NOT NULL AND has_table_privilege(c.oid, 'SELECT')) AS readable
  FROM b
  LEFT JOIN pg_namespace n ON n.nspname = b.sch
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.tbl AND c.relkind = 'r'
  GROUP BY b.wave
),
pol AS (
  SELECT b.wave, count(*) AS policies
  FROM b
  JOIN pg_policies p ON p.schemaname = b.sch AND p.tablename = b.tbl
  GROUP BY b.wave
),
fk AS (
  SELECT b.wave,
         count(*) AS inbound_fk,
         count(*) FILTER (WHERE NOT EXISTS (
           SELECT 1
           FROM pg_class rc
           JOIN pg_namespace rn ON rn.oid = rc.relnamespace
           JOIN b b2 ON b2.wave = b.wave AND b2.sch = rn.nspname AND b2.tbl = rc.relname
           WHERE rc.oid = k.conrelid
         )) AS external_fk
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_constraint k ON k.confrelid = t.oid AND k.contype = 'f'
  GROUP BY b.wave
),
vw AS (
  SELECT b.wave, count(DISTINCT v.oid) AS dependent_views
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_depend d ON d.refobjid = t.oid AND d.classid = 'pg_class'::regclass
  JOIN pg_rewrite rw ON rw.oid = d.objid
  JOIN pg_class v ON v.oid = rw.ev_class
  WHERE v.relkind IN ('v','m') AND v.oid <> t.oid
  GROUP BY b.wave
),
tg AS (
  SELECT b.wave, count(*) AS triggers
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_trigger g ON g.tgrelid = t.oid AND NOT g.tgisinternal
  GROUP BY b.wave
)
SELECT w.wave,
       p.total,
       p.present,
       p.total - p.present AS missing,
       p.rls_tables,
       coalesce(pol.policies, 0) AS policies,
       coalesce(fk.inbound_fk, 0) AS inbound_fk,
       coalesce(fk.external_fk, 0) AS external_fk,
       coalesce(vw.dependent_views, 0) AS dependent_views,
       coalesce(tg.triggers, 0) AS triggers
FROM (VALUES ('W1'), ('W2'), ('W3')) w(wave)
LEFT JOIN pres p ON p.wave = w.wave
LEFT JOIN pol ON pol.wave = w.wave
LEFT JOIN fk  ON fk.wave  = w.wave
LEFT JOIN vw  ON vw.wave  = w.wave
LEFT JOIN tg  ON tg.wave  = w.wave
ORDER BY w.wave;
-- 期望：W1 16/16、W2 108/108、W3 8/8；W1/W2 external_fk=0；dependent_views 全 0；triggers 全 0
-- W3 external_fk=8 是窗口前的正确值（7 来自 W2 + 1 core_tenant_plugins），W2 应用后应降为 0
-- 窗口前 RLS/策略：W1 16/16、W2 30/31、W3 0/0

\echo '== 4.5 缺失表（期望 0 行）=='
WITH b(sch, tbl, wave) AS (
  SELECT sch, tbl, 'W1' FROM (VALUES
    ('doc','document_versions'),('doc','documents'),('doc','folders'),('doc','templates'),
    ('doc_service','archives'),('doc_service','files'),('doc_service','folders'),('doc_service','templates'),
    ('flow','notifications'),('flow','workflows'),('iam','permissions'),
    ('mail','emails'),('mail','templates'),('notification','notifications'),
    ('report','reports'),('storage','files')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W2' FROM (VALUES
    ('analytics','analytics_comparison_analyses'),('analytics','analytics_comparison_results'),('analytics','analytics_dashboard_shares'),('analytics','analytics_dashboard_templates'),('analytics','analytics_dashboards'),('analytics','analytics_datasets'),('analytics','analytics_datasources'),('analytics','analytics_drilldown_history'),('analytics','analytics_drilldown_paths'),('analytics','analytics_row_level_permissions'),('analytics','analytics_self_service_reports'),('analytics','analytics_sync_records'),('analytics','analytics_widgets'),('analytics','report_schedules'),('analytics','report_subscriptions'),('analytics','report_templates'),('analytics','reports'),('communication','core_email_templates'),('doc_service','core_doc_documents'),('doc_service','core_doc_folders'),('doc_service','core_doc_templates'),('flow','approval_records'),('flow','approvals'),('flow','audit_logs'),('flow','core_file_folders'),('flow','core_file_permissions'),('flow','core_files'),('flow','core_flow_delegates'),('flow','core_flow_rules'),('flow','core_flow_variable_history'),('flow','core_flow_variables'),('flow','core_master_data_refs'),('flow','core_mdm_reconciliation_log'),('flow','core_migration_history'),('flow','core_workflow_instances'),('flow','core_workflow_tasks'),('flow','core_workflow_versions'),('flow','core_workflows'),('iam','audit_logs'),('iam','auth_sessions'),('iam','core_billing_invoices'),('iam','core_billing_plans'),('iam','core_chat_members'),('iam','core_chat_messages'),('iam','core_chat_rooms'),('iam','core_dashboard_refresh_log'),('iam','core_dict_items'),('iam','core_dict_types'),('iam','core_email_queue'),('iam','core_email_templates'),('iam','core_emails'),('iam','core_faqs'),('iam','core_file_folders'),('iam','core_files'),('iam','core_guide_lessons'),('iam','core_guide_progress'),('iam','core_guides'),('iam','core_inter_module_sync'),('iam','core_login_logs'),('iam','core_menu_groups'),('iam','core_menus'),('iam','core_migration_history'),('iam','core_mobile_offline_records'),('iam','core_notification_templates'),('iam','core_notifications'),('iam','core_plugin_categories'),('iam','core_plugin_instances'),('iam','core_plugin_permissions'),('iam','core_plugin_pricing'),('iam','core_plugin_reviews'),('iam','core_plugin_versions'),('iam','core_plugins'),('iam','core_subscriptions'),('iam','core_tenant_modules'),('iam','core_tenant_settings'),('iam','core_tenant_usage'),('iam','core_tenant_users'),('iam','core_usage_records'),('iam','core_workflow_instances'),('iam','core_workflow_tasks'),('iam','core_workflows'),('iam','crm_dashboard_snapshots'),('iam','data_permissions'),('iam','dynamic_data'),('iam','ehs_dashboard_snapshots'),('iam','hrm_dashboard_snapshots'),('iam','lims_dashboard_snapshots'),('iam','password_reset_tokens'),('iam','pdm_dashboard_snapshots'),('iam','permission_audit_logs'),('iam','permission_templates'),('iam','refresh_tokens'),('iam','schema_registry'),('iam','sessions'),('iam','tenant_users'),('iam','user_access_logs'),('iam','user_roles'),('iam','wms_dashboard_snapshots'),('plugin_erp','accounting_subjects'),('plugin_finance','difference_adjustments'),('plugin_finance','reconciliation_item_snapshots'),('plugin_finance','reconciliation_settlement_links'),('plugin_finance','reconciliation_snapshots'),('plugin_finance','settlement_snapshots'),('plugin_finance','source_amount_snapshots'),('plugin_mes','audit_logs'),('plugin_wms','purchase_order_snapshots'),('unified_core','documents')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W3' FROM (VALUES
    ('flow','core_tenants'),('iam','core_tenants'),('iam','core_users'),
    ('iam','core_user_roles'),
    ('flow','_deprecated_core_tenant_modules'),('flow','_deprecated_core_tenant_settings'),
    ('flow','_deprecated_core_tenant_usage'),('flow','_deprecated_core_tenant_users')
  ) v(sch, tbl)
)
SELECT b.wave, b.sch, b.tbl
FROM b
LEFT JOIN pg_namespace n ON n.nspname = b.sch
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.tbl AND c.relkind = 'r'
WHERE c.oid IS NULL
ORDER BY 1, 2, 3;

\echo '== 5. W3 依赖面：分目标入向 FK（窗口前 8/1/4，W2 后 1/1/4）=='
WITH w3t(sch, tbl, label) AS (VALUES
  ('iam','core_tenants','iam.core_tenants'),
  ('iam','core_users','iam.core_users'),
  ('flow','core_tenants','flow.core_tenants')
)
SELECT w.label,
       count(k.oid) AS inbound_fk
FROM w3t w
LEFT JOIN pg_namespace n ON n.nspname = w.sch
LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = w.tbl AND c.relkind = 'r'
LEFT JOIN pg_constraint k ON k.confrelid = c.oid AND k.contype = 'f'
GROUP BY w.label
ORDER BY w.label;

\echo '-- 5.1 W3 入向 FK 明细（窗口前 13 条 = 7 来自 W2 + 4 flow 引用方 + 1 core_user_roles + 1 core_tenant_plugins）'
WITH w3t(sch, tbl) AS (VALUES
  ('iam','core_tenants'), ('iam','core_users'), ('iam','core_user_roles'),
  ('flow','core_tenants'),
  ('flow','_deprecated_core_tenant_modules'), ('flow','_deprecated_core_tenant_settings'),
  ('flow','_deprecated_core_tenant_usage'), ('flow','_deprecated_core_tenant_users')
)
SELECT format('%I.%I', rn.nspname, rc.relname) AS referencing_table,
       k.conname,
       format('%I.%I', tn.nspname, tc.relname) AS referenced_table
FROM pg_constraint k
JOIN pg_class tc ON tc.oid = k.confrelid
JOIN pg_namespace tn ON tn.oid = tc.relnamespace
JOIN w3t w ON w.sch = tn.nspname AND w.tbl = tc.relname
JOIN pg_class rc ON rc.oid = k.conrelid
JOIN pg_namespace rn ON rn.oid = rc.relnamespace
WHERE k.contype = 'f'
ORDER BY 1, 2;

\echo '-- 5.2 public 权威表（4/4 必须存在）'
SELECT v.sch, v.tbl,
       EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_class c ON c.relnamespace = n.oid
               WHERE n.nspname = v.sch AND c.relname = v.tbl AND c.relkind = 'r') AS present
FROM (VALUES
  ('public','core_tenants'), ('public','core_users'),
  ('public','core_user_roles'), ('public','core_tenant_plugins')
) v(sch, tbl)
ORDER BY 1, 2;

\echo '-- 5.3 iam.core_tenant_plugins 外键（窗口前必须指向 iam.core_tenants）'
SELECT k.conname,
       pg_get_constraintdef(k.oid) AS definition
FROM pg_constraint k
WHERE k.conrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'iam' AND c.relname = 'core_tenant_plugins')
  AND k.contype = 'f'
ORDER BY k.conname;

\echo '-- 5.4 finance.bootstrap_defaults() 引用面（窗口前 iam/flow/core_tenant_users/public 均须为 true）'
SELECT p.oid::regprocedure AS function,
       position('iam.core_tenants' in p.prosrc) > 0        AS refs_iam_tenants,
       position('flow.core_tenants' in p.prosrc) > 0       AS refs_flow_tenants,
       position('iam.core_tenant_users' in p.prosrc) > 0   AS refs_iam_tenant_users,
       position('public.core_tenants' in p.prosrc) > 0     AS refs_public_tenants
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults';

\echo '-- 5.5 其他函数对三目标的引用（期望 0）'
SELECT count(*) AS other_function_refs
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE (p.prosrc LIKE '%iam.core_tenants%'
    OR p.prosrc LIKE '%iam.core_users%'
    OR p.prosrc LIKE '%flow.core_tenants%')
  AND NOT (n.nspname = 'finance' AND p.proname = 'bootstrap_defaults');

\echo '== 6. W1/W2 批次外引用（external_fk 必须 0；W2 的 19 条 FK 必须全部在批次内）=='
-- 明细已由第 4 节的 external_fk 汇总；此处给出 W2 批次内 FK 计数。
WITH b(sch, tbl) AS (VALUES
    ('analytics','analytics_comparison_analyses'),('analytics','analytics_comparison_results'),('analytics','analytics_dashboard_shares'),('analytics','analytics_dashboard_templates'),('analytics','analytics_dashboards'),('analytics','analytics_datasets'),('analytics','analytics_datasources'),('analytics','analytics_drilldown_history'),('analytics','analytics_drilldown_paths'),('analytics','analytics_row_level_permissions'),('analytics','analytics_self_service_reports'),('analytics','analytics_sync_records'),('analytics','analytics_widgets'),('analytics','report_schedules'),('analytics','report_subscriptions'),('analytics','report_templates'),('analytics','reports'),('communication','core_email_templates'),('doc_service','core_doc_documents'),('doc_service','core_doc_folders'),('doc_service','core_doc_templates'),('flow','approval_records'),('flow','approvals'),('flow','audit_logs'),('flow','core_file_folders'),('flow','core_file_permissions'),('flow','core_files'),('flow','core_flow_delegates'),('flow','core_flow_rules'),('flow','core_flow_variable_history'),('flow','core_flow_variables'),('flow','core_master_data_refs'),('flow','core_mdm_reconciliation_log'),('flow','core_migration_history'),('flow','core_workflow_instances'),('flow','core_workflow_tasks'),('flow','core_workflow_versions'),('flow','core_workflows'),('iam','audit_logs'),('iam','auth_sessions'),('iam','core_billing_invoices'),('iam','core_billing_plans'),('iam','core_chat_members'),('iam','core_chat_messages'),('iam','core_chat_rooms'),('iam','core_dashboard_refresh_log'),('iam','core_dict_items'),('iam','core_dict_types'),('iam','core_email_queue'),('iam','core_email_templates'),('iam','core_emails'),('iam','core_faqs'),('iam','core_file_folders'),('iam','core_files'),('iam','core_guide_lessons'),('iam','core_guide_progress'),('iam','core_guides'),('iam','core_inter_module_sync'),('iam','core_login_logs'),('iam','core_menu_groups'),('iam','core_menus'),('iam','core_migration_history'),('iam','core_mobile_offline_records'),('iam','core_notification_templates'),('iam','core_notifications'),('iam','core_plugin_categories'),('iam','core_plugin_instances'),('iam','core_plugin_permissions'),('iam','core_plugin_pricing'),('iam','core_plugin_reviews'),('iam','core_plugin_versions'),('iam','core_plugins'),('iam','core_subscriptions'),('iam','core_tenant_modules'),('iam','core_tenant_settings'),('iam','core_tenant_usage'),('iam','core_tenant_users'),('iam','core_usage_records'),('iam','core_workflow_instances'),('iam','core_workflow_tasks'),('iam','core_workflows'),('iam','crm_dashboard_snapshots'),('iam','data_permissions'),('iam','dynamic_data'),('iam','ehs_dashboard_snapshots'),('iam','hrm_dashboard_snapshots'),('iam','lims_dashboard_snapshots'),('iam','password_reset_tokens'),('iam','pdm_dashboard_snapshots'),('iam','permission_audit_logs'),('iam','permission_templates'),('iam','refresh_tokens'),('iam','schema_registry'),('iam','sessions'),('iam','tenant_users'),('iam','user_access_logs'),('iam','user_roles'),('iam','wms_dashboard_snapshots'),('plugin_erp','accounting_subjects'),('plugin_finance','difference_adjustments'),('plugin_finance','reconciliation_item_snapshots'),('plugin_finance','reconciliation_settlement_links'),('plugin_finance','reconciliation_snapshots'),('plugin_finance','settlement_snapshots'),('plugin_finance','source_amount_snapshots'),('plugin_mes','audit_logs'),('plugin_wms','purchase_order_snapshots'),('unified_core','documents')
)
SELECT count(*) AS inbound_fk_total,
       count(*) FILTER (WHERE NOT EXISTS (
         SELECT 1 FROM pg_class rc JOIN pg_namespace rn ON rn.oid = rc.relnamespace
         JOIN b b2 ON b2.sch = rn.nspname AND b2.tbl = rc.relname
         WHERE rc.oid = k.conrelid
       )) AS inbound_fk_outside_batch
FROM b
JOIN pg_namespace tn ON tn.nspname = b.sch
JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
JOIN pg_constraint k ON k.confrelid = t.oid AND k.contype = 'f';
-- 期望：19 / 0

-- C16 交接（路径 A）：本节必须由 DBA 用 topems_prod 在只读事务中复跑本文件。
-- 角色口径：topems_prod = 非 superuser、非 BYPASSRLS、132/132 表覆盖、15/15 schema USAGE；
--           不要用 topems / xingzhai（superuser / BYPASSRLS，权限与行数判定会恒真）。
-- 完整命令：
--   PGPASSFILE=<DBA pgpass> \
--   PGOPTIONS="-c default_transaction_read_only=on -c app.rls_system=on" \
--   psql "postgresql://topems_prod@127.0.0.1:5432/topems_prod" \
--     -f docs/database/window-preflight-2026-11-19.sql \
--     > preflight_c16_$(date +%Y%m%d_%H%M%S).txt 2>&1
-- 判定口径：132 张全部 READABLE 且 rows=0，本节例外查询 0 行 → C16 PASS。
--           出现任何 NO_PRIV、任一 rows>0、或缺 app.rls_system=on 导致过滤，均算未通过。
-- 假 PASS 风险：132 张中 46 张为 FORCE RLS（18 张 allow_all + 28 张 tenant_isolation）；
--           owner 同样受 FORCE 约束，非 BYPASSRLS 且不带 app.rls_system=on 时，
--           28 张 tenant_isolation 的 count(*) 会被策略过滤成 0。
--           apply-forward.sh 的破坏性预演段现已自行注入 app.rls_system=on 与文件声明的
--           app.*_gate；但 apply 段在 prod 不自行注入（--drill-gate-guc-auto 仅限演练），
--           开窗执行 apply-forward.sh 时仍必须在 PGOPTIONS 中带上 -c app.rls_system=on。
-- 回报格式：一行结论（C16 PASS / C16 NOT PASS）+ 本节输出原文（或 NO_PRIV 行数统计）
--           + 实际执行命令与时间戳。
\echo '== 7. 行数门禁明细（每张必须 0；topems_drift 下显示 NO_PRIV，需 DBA 用 topems_prod 只读复跑）=='
WITH b(sch, tbl, wave) AS (
  SELECT sch, tbl, 'W1' FROM (VALUES
    ('doc','document_versions'),('doc','documents'),('doc','folders'),('doc','templates'),
    ('doc_service','archives'),('doc_service','files'),('doc_service','folders'),('doc_service','templates'),
    ('flow','notifications'),('flow','workflows'),('iam','permissions'),
    ('mail','emails'),('mail','templates'),('notification','notifications'),
    ('report','reports'),('storage','files')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W2' FROM (VALUES
    ('analytics','analytics_comparison_analyses'),('analytics','analytics_comparison_results'),('analytics','analytics_dashboard_shares'),('analytics','analytics_dashboard_templates'),('analytics','analytics_dashboards'),('analytics','analytics_datasets'),('analytics','analytics_datasources'),('analytics','analytics_drilldown_history'),('analytics','analytics_drilldown_paths'),('analytics','analytics_row_level_permissions'),('analytics','analytics_self_service_reports'),('analytics','analytics_sync_records'),('analytics','analytics_widgets'),('analytics','report_schedules'),('analytics','report_subscriptions'),('analytics','report_templates'),('analytics','reports'),('communication','core_email_templates'),('doc_service','core_doc_documents'),('doc_service','core_doc_folders'),('doc_service','core_doc_templates'),('flow','approval_records'),('flow','approvals'),('flow','audit_logs'),('flow','core_file_folders'),('flow','core_file_permissions'),('flow','core_files'),('flow','core_flow_delegates'),('flow','core_flow_rules'),('flow','core_flow_variable_history'),('flow','core_flow_variables'),('flow','core_master_data_refs'),('flow','core_mdm_reconciliation_log'),('flow','core_migration_history'),('flow','core_workflow_instances'),('flow','core_workflow_tasks'),('flow','core_workflow_versions'),('flow','core_workflows'),('iam','audit_logs'),('iam','auth_sessions'),('iam','core_billing_invoices'),('iam','core_billing_plans'),('iam','core_chat_members'),('iam','core_chat_messages'),('iam','core_chat_rooms'),('iam','core_dashboard_refresh_log'),('iam','core_dict_items'),('iam','core_dict_types'),('iam','core_email_queue'),('iam','core_email_templates'),('iam','core_emails'),('iam','core_faqs'),('iam','core_file_folders'),('iam','core_files'),('iam','core_guide_lessons'),('iam','core_guide_progress'),('iam','core_guides'),('iam','core_inter_module_sync'),('iam','core_login_logs'),('iam','core_menu_groups'),('iam','core_menus'),('iam','core_migration_history'),('iam','core_mobile_offline_records'),('iam','core_notification_templates'),('iam','core_notifications'),('iam','core_plugin_categories'),('iam','core_plugin_instances'),('iam','core_plugin_permissions'),('iam','core_plugin_pricing'),('iam','core_plugin_reviews'),('iam','core_plugin_versions'),('iam','core_plugins'),('iam','core_subscriptions'),('iam','core_tenant_modules'),('iam','core_tenant_settings'),('iam','core_tenant_usage'),('iam','core_tenant_users'),('iam','core_usage_records'),('iam','core_workflow_instances'),('iam','core_workflow_tasks'),('iam','core_workflows'),('iam','crm_dashboard_snapshots'),('iam','data_permissions'),('iam','dynamic_data'),('iam','ehs_dashboard_snapshots'),('iam','hrm_dashboard_snapshots'),('iam','lims_dashboard_snapshots'),('iam','password_reset_tokens'),('iam','pdm_dashboard_snapshots'),('iam','permission_audit_logs'),('iam','permission_templates'),('iam','refresh_tokens'),('iam','schema_registry'),('iam','sessions'),('iam','tenant_users'),('iam','user_access_logs'),('iam','user_roles'),('iam','wms_dashboard_snapshots'),('plugin_erp','accounting_subjects'),('plugin_finance','difference_adjustments'),('plugin_finance','reconciliation_item_snapshots'),('plugin_finance','reconciliation_settlement_links'),('plugin_finance','reconciliation_snapshots'),('plugin_finance','settlement_snapshots'),('plugin_finance','source_amount_snapshots'),('plugin_mes','audit_logs'),('plugin_wms','purchase_order_snapshots'),('unified_core','documents')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W3' FROM (VALUES
    ('flow','core_tenants'),('iam','core_tenants'),('iam','core_users'),
    ('iam','core_user_roles'),
    ('flow','_deprecated_core_tenant_modules'),('flow','_deprecated_core_tenant_settings'),
    ('flow','_deprecated_core_tenant_usage'),('flow','_deprecated_core_tenant_users')
  ) v(sch, tbl)
),
x AS (
  SELECT b.wave,
         format('%I.%I', b.sch, b.tbl) AS object,
         c.oid,
         CASE
           WHEN c.oid IS NULL THEN 'MISSING'
           WHEN has_table_privilege(c.oid, 'SELECT') THEN 'READABLE'
           ELSE 'NO_PRIV'
         END AS access,
         CASE
           WHEN c.oid IS NULL THEN NULL
           WHEN has_table_privilege(c.oid, 'SELECT')
             THEN (xpath('/row/c/text()',
                    query_to_xml(format('SELECT count(*) AS c FROM %I.%I', b.sch, b.tbl),
                                 false, true, '')))[1]::text::bigint
           ELSE NULL
         END AS rows
  FROM b
  LEFT JOIN pg_namespace n ON n.nspname = b.sch
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.tbl AND c.relkind = 'r'
)
SELECT wave, object, access, rows
FROM x
WHERE access <> 'READABLE' OR rows > 0
ORDER BY wave, object;
-- DBA 特权会话下期望：0 行（全部 READABLE 且 rows=0）
-- topems_drift 下：132 行 NO_PRIV（预期）

\echo '== 7.5 W4 权限码窗口前状态（C18：legacy=0 / grants=0 / dict=0）=='
WITH legacy(code) AS (VALUES
  ('attendance_read'),('attendance_write'),('company_read'),('company_write'),
  ('department_read'),('department_write'),
  ('doc:documents_create'),('doc:documents_delete'),('doc:documents_read'),('doc:documents_update'),
  ('employee_read'),('employee_write'),
  ('iam:audit_read'),('iam:permissions_read'),('iam:permissions_update'),
  ('iam:plugins_read'),('iam:plugins_update'),
  ('iam:roles_create'),('iam:roles_delete'),('iam:roles_read'),('iam:roles_update'),
  ('iam:system_export'),('iam:system_logs'),('iam:system_monitor'),
  ('iam:system_read'),('iam:system_settings'),('iam:system_update'),
  ('iam:users_create'),('iam:users_delete'),('iam:users_update'),
  ('leave_read'),('leave_write'),('payroll_read'),('payroll_write'),
  ('performance_read'),('performance_write'),
  ('pm:projects_create'),('pm:projects_delete'),('pm:projects_read'),('pm:projects_update'),
  ('workflow:workflows_create'),('workflow:workflows_delete'),
  ('workflow:workflows_read'),('workflow:workflows_update')
),
c AS (
  SELECT (SELECT count(*) FROM legacy l JOIN public.core_permissions p ON p.code = l.code) AS legacy_present,
         (SELECT count(*) FROM legacy l
            JOIN public.core_permissions p ON p.code = l.code
            JOIN public.core_role_permissions rp ON rp.permission_id = p.id) AS legacy_grants,
         (SELECT count(*) FROM public.core_permissions
           WHERE code IN ('iam:dictionaries_read','iam:dictionaries_update')) AS dict_present,
         (SELECT count(*) FROM public.core_permissions) AS total_permissions
)
SELECT 'C18' AS id,
       'W4 权限码窗口前状态（44 遗留=0、授权=0、字典码未插入）' AS item,
       'legacy=0/0, dict=0' AS expect,
       'legacy_present=' || c.legacy_present
         || ', legacy_grants=' || c.legacy_grants
         || ', dict_present=' || c.dict_present
         || ', total=' || c.total_permissions AS actual,
       CASE WHEN c.legacy_present = 0 AND c.legacy_grants = 0 AND c.dict_present = 0
            THEN 'PASS' ELSE 'FAIL' END AS status
FROM c;
-- 期望：PASS；若 W4 已应用则本节 FAIL（同时第 1 节会出现该版本），属正常「已开窗」状态

\echo '== 8. 环境变量 / 命令提醒（SQL 无法校验，开窗前人工确认）=='
SELECT 'PGOPTIONS gate W1: -c app.drop_zero_path_tables_gate=zero-path-20261119' AS item
UNION ALL SELECT 'PGOPTIONS gate W2: -c app.archive_legacy_copies_gate=legacy-copies-20261119'
UNION ALL SELECT 'PGOPTIONS gate W3: -c app.tenant_unblock_archive_gate=tenant-unblock-20261119'
UNION ALL SELECT 'PROD_CHANGE_TICKET W1: ZERO-PATH-20261119'
UNION ALL SELECT 'PROD_CHANGE_TICKET W2: LEGACY-COPY-20261119'
UNION ALL SELECT 'PROD_CHANGE_TICKET W3: TENANT-UNBLOCK-20261119'
UNION ALL SELECT 'PROD_CHANGE_TICKET W4: IAM-PERM-20261119（无闸门 GUC，需 --allow-destructive=20261119233000）'
UNION ALL SELECT 'apply-forward.sh: --apply-deferred <version> --ticket <ticket> --allow-destructive=<version>'
UNION ALL SELECT 'node: prod 主机必须可用，否则脚本 DENIED';

\echo '== 9. 就绪门禁汇总（C1–C15、C17 必须 PASS；C18 见 7.5；C16 特权会话下必须 PASS）=='
WITH b(sch, tbl, wave) AS (
  SELECT sch, tbl, 'W1' FROM (VALUES
    ('doc','document_versions'),('doc','documents'),('doc','folders'),('doc','templates'),
    ('doc_service','archives'),('doc_service','files'),('doc_service','folders'),('doc_service','templates'),
    ('flow','notifications'),('flow','workflows'),('iam','permissions'),
    ('mail','emails'),('mail','templates'),('notification','notifications'),
    ('report','reports'),('storage','files')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W2' FROM (VALUES
    ('analytics','analytics_comparison_analyses'),('analytics','analytics_comparison_results'),('analytics','analytics_dashboard_shares'),('analytics','analytics_dashboard_templates'),('analytics','analytics_dashboards'),('analytics','analytics_datasets'),('analytics','analytics_datasources'),('analytics','analytics_drilldown_history'),('analytics','analytics_drilldown_paths'),('analytics','analytics_row_level_permissions'),('analytics','analytics_self_service_reports'),('analytics','analytics_sync_records'),('analytics','analytics_widgets'),('analytics','report_schedules'),('analytics','report_subscriptions'),('analytics','report_templates'),('analytics','reports'),('communication','core_email_templates'),('doc_service','core_doc_documents'),('doc_service','core_doc_folders'),('doc_service','core_doc_templates'),('flow','approval_records'),('flow','approvals'),('flow','audit_logs'),('flow','core_file_folders'),('flow','core_file_permissions'),('flow','core_files'),('flow','core_flow_delegates'),('flow','core_flow_rules'),('flow','core_flow_variable_history'),('flow','core_flow_variables'),('flow','core_master_data_refs'),('flow','core_mdm_reconciliation_log'),('flow','core_migration_history'),('flow','core_workflow_instances'),('flow','core_workflow_tasks'),('flow','core_workflow_versions'),('flow','core_workflows'),('iam','audit_logs'),('iam','auth_sessions'),('iam','core_billing_invoices'),('iam','core_billing_plans'),('iam','core_chat_members'),('iam','core_chat_messages'),('iam','core_chat_rooms'),('iam','core_dashboard_refresh_log'),('iam','core_dict_items'),('iam','core_dict_types'),('iam','core_email_queue'),('iam','core_email_templates'),('iam','core_emails'),('iam','core_faqs'),('iam','core_file_folders'),('iam','core_files'),('iam','core_guide_lessons'),('iam','core_guide_progress'),('iam','core_guides'),('iam','core_inter_module_sync'),('iam','core_login_logs'),('iam','core_menu_groups'),('iam','core_menus'),('iam','core_migration_history'),('iam','core_mobile_offline_records'),('iam','core_notification_templates'),('iam','core_notifications'),('iam','core_plugin_categories'),('iam','core_plugin_instances'),('iam','core_plugin_permissions'),('iam','core_plugin_pricing'),('iam','core_plugin_reviews'),('iam','core_plugin_versions'),('iam','core_plugins'),('iam','core_subscriptions'),('iam','core_tenant_modules'),('iam','core_tenant_settings'),('iam','core_tenant_usage'),('iam','core_tenant_users'),('iam','core_usage_records'),('iam','core_workflow_instances'),('iam','core_workflow_tasks'),('iam','core_workflows'),('iam','crm_dashboard_snapshots'),('iam','data_permissions'),('iam','dynamic_data'),('iam','ehs_dashboard_snapshots'),('iam','hrm_dashboard_snapshots'),('iam','lims_dashboard_snapshots'),('iam','password_reset_tokens'),('iam','pdm_dashboard_snapshots'),('iam','permission_audit_logs'),('iam','permission_templates'),('iam','refresh_tokens'),('iam','schema_registry'),('iam','sessions'),('iam','tenant_users'),('iam','user_access_logs'),('iam','user_roles'),('iam','wms_dashboard_snapshots'),('plugin_erp','accounting_subjects'),('plugin_finance','difference_adjustments'),('plugin_finance','reconciliation_item_snapshots'),('plugin_finance','reconciliation_settlement_links'),('plugin_finance','reconciliation_snapshots'),('plugin_finance','settlement_snapshots'),('plugin_finance','source_amount_snapshots'),('plugin_mes','audit_logs'),('plugin_wms','purchase_order_snapshots'),('unified_core','documents')
  ) v(sch, tbl)
  UNION ALL
  SELECT sch, tbl, 'W3' FROM (VALUES
    ('flow','core_tenants'),('iam','core_tenants'),('iam','core_users'),
    ('iam','core_user_roles'),
    ('flow','_deprecated_core_tenant_modules'),('flow','_deprecated_core_tenant_settings'),
    ('flow','_deprecated_core_tenant_usage'),('flow','_deprecated_core_tenant_users')
  ) v(sch, tbl)
),
pres AS (
  SELECT b.wave,
         count(*) AS total,
         count(c.oid) AS present,
         count(*) FILTER (WHERE c.oid IS NOT NULL AND has_table_privilege(c.oid, 'SELECT')) AS readable
  FROM b
  LEFT JOIN pg_namespace n ON n.nspname = b.sch
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.tbl AND c.relkind = 'r'
  GROUP BY b.wave
),
pol AS (
  SELECT b.wave, count(*) AS policies
  FROM b
  JOIN pg_policies p ON p.schemaname = b.sch AND p.tablename = b.tbl
  GROUP BY b.wave
),
fk AS (
  SELECT b.wave,
         count(*) AS inbound_fk,
         count(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM pg_class rc
           JOIN pg_namespace rn ON rn.oid = rc.relnamespace
           JOIN b b2 ON b2.wave = b.wave AND b2.sch = rn.nspname AND b2.tbl = rc.relname
           WHERE rc.oid = k.conrelid
         )) AS external_fk
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_constraint k ON k.confrelid = t.oid AND k.contype = 'f'
  GROUP BY b.wave
),
vw AS (
  SELECT b.wave, count(DISTINCT v.oid) AS dependent_views
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_depend d ON d.refobjid = t.oid AND d.classid = 'pg_class'::regclass
  JOIN pg_rewrite rw ON rw.oid = d.objid
  JOIN pg_class v ON v.oid = rw.ev_class
  WHERE v.relkind IN ('v','m') AND v.oid <> t.oid
  GROUP BY b.wave
),
tg AS (
  SELECT b.wave, count(*) AS triggers
  FROM b
  JOIN pg_namespace tn ON tn.nspname = b.sch
  JOIN pg_class t ON t.relnamespace = tn.oid AND t.relname = b.tbl AND t.relkind = 'r'
  JOIN pg_trigger g ON g.tgrelid = t.oid AND NOT g.tgisinternal
  GROUP BY b.wave
),
rc AS (
  SELECT b.wave,
         count(*) AS total,
         count(*) FILTER (WHERE c.oid IS NULL) AS missing,
         count(*) FILTER (WHERE c.oid IS NOT NULL AND NOT has_table_privilege(c.oid, 'SELECT')) AS no_priv,
         count(*) FILTER (WHERE c.oid IS NOT NULL AND has_table_privilege(c.oid, 'SELECT')
           AND (CASE WHEN has_table_privilege(c.oid, 'SELECT')
                     THEN (xpath('/row/c/text()',
                            query_to_xml(format('SELECT count(*) AS c FROM %I.%I', b.sch, b.tbl),
                                         false, true, '')))[1]::text::bigint
                     ELSE 0 END) > 0) AS nonzero
  FROM b
  LEFT JOIN pg_namespace n ON n.nspname = b.sch
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = b.tbl AND c.relkind = 'r'
  GROUP BY b.wave
),
w3t(sch, tbl, label) AS (VALUES
  ('iam','core_tenants','iam.core_tenants'),
  ('iam','core_users','iam.core_users'),
  ('flow','core_tenants','flow.core_tenants')
),
w3in AS (
  SELECT w.label, count(k.oid) AS inbound_fk
  FROM w3t w
  LEFT JOIN pg_namespace n ON n.nspname = w.sch
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = w.tbl AND c.relkind = 'r'
  LEFT JOIN pg_constraint k ON k.confrelid = c.oid AND k.contype = 'f'
  GROUP BY w.label
),
led AS (
  SELECT
    (SELECT count(*) FROM _sqlx_migrations) AS ledger_rows,
    (SELECT count(*) FILTER (WHERE success) FROM _sqlx_migrations) AS ledger_success,
    (SELECT count(*) FILTER (WHERE NOT success) FROM _sqlx_migrations) AS ledger_failed,
    (SELECT max(version) FROM _sqlx_migrations) AS ledger_max,
    (SELECT count(*) FROM _sqlx_migrations
      WHERE version IN (20261119160000,20261119180000,20261119200000)) AS versions_present,
    (SELECT count(*) FROM _sqlx_migrations
      WHERE version IN (20261119160000,20261119180000,20261119200000) AND success) AS versions_success,
    EXISTS (SELECT 1 FROM _sqlx_migrations WHERE version = 20261119160000 AND success) AS w1,
    EXISTS (SELECT 1 FROM _sqlx_migrations WHERE version = 20261119180000 AND success) AS w2,
    EXISTS (SELECT 1 FROM _sqlx_migrations WHERE version = 20261119200000 AND success) AS w3,
    EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'archive') AS archive_schema,
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'archive' AND c.relkind = 'r') AS archive_tables,
    (SELECT count(*) FROM pg_class c
      WHERE c.relkind IN ('r','p')
        AND c.relnamespace NOT IN (SELECT oid FROM pg_namespace
                                   WHERE nspname IN ('pg_catalog','information_schema'))) AS tables_rp,
    (SELECT count(*) FROM pg_class c
      WHERE c.relkind IN ('r','p') AND c.relrowsecurity
        AND c.relnamespace NOT IN (SELECT oid FROM pg_namespace
                                   WHERE nspname IN ('pg_catalog','information_schema'))) AS rls_enabled,
    (SELECT count(*) FROM pg_policies
      WHERE schemaname NOT IN ('pg_catalog','information_schema')) AS policies,
    (SELECT count(*) FROM (VALUES
        ('public','core_tenants'), ('public','core_users'),
        ('public','core_user_roles'), ('public','core_tenant_plugins')
      ) v(sch, tbl)
      WHERE EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_class c ON c.relnamespace = n.oid
                    WHERE n.nspname = v.sch AND c.relname = v.tbl AND c.relkind = 'r')) AS auth_tables,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') AS fn_count,
    (SELECT coalesce(bool_or(position('iam.core_tenants' in p.prosrc) > 0), false)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') AS fn_iam,
    (SELECT coalesce(bool_or(position('flow.core_tenants' in p.prosrc) > 0), false)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') AS fn_flow,
    (SELECT coalesce(bool_or(position('iam.core_tenant_users' in p.prosrc) > 0), false)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') AS fn_tu,
    (SELECT coalesce(bool_or(position('public.core_tenants' in p.prosrc) > 0), false)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'finance' AND p.proname = 'bootstrap_defaults') AS fn_pub,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE (p.prosrc LIKE '%iam.core_tenants%'
          OR p.prosrc LIKE '%iam.core_users%'
          OR p.prosrc LIKE '%flow.core_tenants%')
        AND NOT (n.nspname = 'finance' AND p.proname = 'bootstrap_defaults')) AS other_fn_refs,
    (SELECT pg_get_constraintdef(k.oid) FROM pg_constraint k
      WHERE k.conrelid = (SELECT c.oid FROM pg_class c
                          JOIN pg_namespace n ON n.oid = c.relnamespace
                          WHERE n.nspname = 'iam' AND c.relname = 'core_tenant_plugins')
        AND k.conname = 'core_tenant_plugins_tenant_id_fkey') AS plugin_fk_def
)
SELECT 'C1' AS id, '会话：topems_prod + 只读' AS item,
       'db=topems_prod, ro=on' AS expected,
       current_user || ' @ ' || current_database() || ' | ro=' ||
       current_setting('transaction_read_only') AS actual,
       CASE WHEN current_database() = 'topems_prod'
                 AND current_setting('transaction_read_only') = 'on'
            THEN 'PASS' ELSE 'FAIL' END AS status
UNION ALL
SELECT 'C2', '账本：721/721、max 20261119000002、failed 0',
       '721/721/20261119000002/0',
       led.ledger_rows || '/' || led.ledger_success || '/' ||
       coalesce(led.ledger_max::text, '-') || '/' || led.ledger_failed,
       CASE WHEN led.ledger_rows = 721 AND led.ledger_success = 721
                 AND led.ledger_failed = 0 AND led.ledger_max = 20261119000002
            THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C3', '四条窗口版本均未应用', 'present=0',
       'present=' || led.versions_present || ', success=' || led.versions_success,
       CASE WHEN led.versions_present = 0 THEN 'PASS'
            WHEN led.versions_success = led.versions_present THEN 'ALREADY_APPLIED'
            ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C4', 'archive schema 不存在', 'absent',
       CASE WHEN led.archive_schema THEN 'present' ELSE 'absent' END,
       CASE WHEN NOT led.archive_schema THEN 'PASS' ELSE 'ALREADY_APPLIED' END
FROM led
UNION ALL
SELECT 'C5', 'W1 16 张在位', '16/16',
       coalesce((SELECT present::text FROM pres WHERE wave = 'W1'), '0') || '/16',
       CASE WHEN led.w1 THEN 'ALREADY_APPLIED'
            WHEN (SELECT present FROM pres WHERE wave = 'W1') = 16 THEN 'PASS'
            ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C6', 'W2 108 张在位', '108/108',
       coalesce((SELECT present::text FROM pres WHERE wave = 'W2'), '0') || '/108',
       CASE WHEN led.w2 THEN 'ALREADY_APPLIED'
            WHEN (SELECT present FROM pres WHERE wave = 'W2') = 108 THEN 'PASS'
            ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C7', 'W3 8 张在位', '8/8',
       coalesce((SELECT present::text FROM pres WHERE wave = 'W3'), '0') || '/8',
       CASE WHEN led.w3 THEN 'ALREADY_APPLIED'
            WHEN (SELECT present FROM pres WHERE wave = 'W3') = 8 THEN 'PASS'
            ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C8', 'W1 批次外入向 FK / 依赖视图', '0 / 0',
       coalesce((SELECT external_fk::text FROM fk WHERE wave = 'W1'), '0') || ' / ' ||
       coalesce((SELECT dependent_views::text FROM vw WHERE wave = 'W1'), '0'),
       CASE WHEN coalesce((SELECT external_fk FROM fk WHERE wave = 'W1'), 0) = 0
                 AND coalesce((SELECT dependent_views FROM vw WHERE wave = 'W1'), 0) = 0
            THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C9', 'W2 入向 FK 19（全批次内）/ 视图 0 / 触发器 0', '19 / 0 / 0 / 0',
       coalesce((SELECT inbound_fk::text FROM fk WHERE wave = 'W2'), '0') || ' / ' ||
       coalesce((SELECT external_fk::text FROM fk WHERE wave = 'W2'), '0') || ' / ' ||
       coalesce((SELECT dependent_views::text FROM vw WHERE wave = 'W2'), '0') || ' / ' ||
       coalesce((SELECT triggers::text FROM tg WHERE wave = 'W2'), '0'),
       CASE WHEN led.w2 THEN 'ALREADY_APPLIED'
            WHEN coalesce((SELECT inbound_fk FROM fk WHERE wave = 'W2'), 0) = 19
                 AND coalesce((SELECT external_fk FROM fk WHERE wave = 'W2'), 0) = 0
                 AND coalesce((SELECT dependent_views FROM vw WHERE wave = 'W2'), 0) = 0
                 AND coalesce((SELECT triggers FROM tg WHERE wave = 'W2'), 0) = 0
            THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C10', 'W3 分目标入向 FK（窗口前 8/1/4；W2 后 1/1/4）',
       'pre 8/1/4；post-W2 1/1/4',
       coalesce((SELECT inbound_fk::text FROM w3in WHERE label = 'iam.core_tenants'), '0') || ' / ' ||
       coalesce((SELECT inbound_fk::text FROM w3in WHERE label = 'iam.core_users'), '0') || ' / ' ||
       coalesce((SELECT inbound_fk::text FROM w3in WHERE label = 'flow.core_tenants'), '0'),
       CASE
         WHEN led.w3 THEN 'ALREADY_APPLIED'
         WHEN led.w2 AND (SELECT inbound_fk FROM w3in WHERE label = 'iam.core_tenants') = 1
                     AND (SELECT inbound_fk FROM w3in WHERE label = 'iam.core_users') = 1
                     AND (SELECT inbound_fk FROM w3in WHERE label = 'flow.core_tenants') = 4
           THEN 'PASS'
         WHEN NOT led.w2 AND (SELECT inbound_fk FROM w3in WHERE label = 'iam.core_tenants') = 8
                          AND (SELECT inbound_fk FROM w3in WHERE label = 'iam.core_users') = 1
                          AND (SELECT inbound_fk FROM w3in WHERE label = 'flow.core_tenants') = 4
           THEN 'PASS_PRE'
         ELSE 'FAIL'
       END
FROM led
UNION ALL
SELECT 'C11', 'public 权威表 4/4 存在', '4/4',
       led.auth_tables || '/4',
       CASE WHEN led.auth_tables = 4 THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C12', '插件 FK 指向 iam.core_tenants（窗口前）', 'REFERENCES iam.core_tenants(id)',
       coalesce(led.plugin_fk_def, 'missing'),
       CASE WHEN led.plugin_fk_def IS NULL THEN 'FAIL'
            WHEN led.w3 THEN CASE WHEN led.plugin_fk_def LIKE '%iam.core_tenants%'
                                  THEN 'FAIL' ELSE 'ALREADY_APPLIED' END
            ELSE CASE WHEN led.plugin_fk_def LIKE '%iam.core_tenants%'
                      THEN 'PASS' ELSE 'FAIL' END END
FROM led
UNION ALL
SELECT 'C13', 'bootstrap_defaults 引用面（窗口前含 iam/flow/legacy_users/public）',
       'pre: T/T/T/T；post-W3: F/F/F/T',
       led.fn_count || ' fn; ' ||
       led.fn_iam::text || '/' || led.fn_flow::text || '/' || led.fn_tu::text || '/' || led.fn_pub::text,
       CASE WHEN led.fn_count <> 1 THEN 'FAIL'
            WHEN led.w3 THEN CASE WHEN NOT led.fn_iam AND NOT led.fn_flow
                                   AND NOT led.fn_tu AND led.fn_pub
                                  THEN 'ALREADY_APPLIED' ELSE 'FAIL' END
            ELSE CASE WHEN led.fn_iam AND led.fn_flow AND led.fn_tu AND led.fn_pub
                      THEN 'PASS' ELSE 'FAIL' END END
FROM led
UNION ALL
SELECT 'C14', '其他函数引用三目标', '0',
       led.other_fn_refs::text,
       CASE WHEN led.other_fn_refs = 0 THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C15', '全局 RLS / 策略按波次递减',
       'pre 959/1050；W1 943/1034；W1+W2 913/1003',
       led.rls_enabled || '/' || led.policies,
       CASE WHEN led.rls_enabled =
                  959 - (CASE WHEN led.w1 THEN 16 ELSE 0 END)
                      - (CASE WHEN led.w2 THEN 30 ELSE 0 END)
                 AND led.policies =
                  1050 - (CASE WHEN led.w1 THEN 16 ELSE 0 END)
                       - (CASE WHEN led.w2 THEN 31 ELSE 0 END)
            THEN 'PASS' ELSE 'FAIL' END
FROM led
UNION ALL
SELECT 'C16', '132 张表行数为 0（DROP 硬闸门）', '0',
       'readable=' || coalesce((SELECT sum(total - no_priv - missing) FROM rc), 0)
         || ', no_priv=' || coalesce((SELECT sum(no_priv) FROM rc), 0)
         || ', nonzero=' || coalesce((SELECT sum(nonzero) FROM rc), 0)
         || ', missing=' || coalesce((SELECT sum(missing) FROM rc), 0),
       CASE WHEN coalesce((SELECT sum(no_priv) FROM rc), 0) > 0 THEN 'NEEDS_DBA'
            WHEN coalesce((SELECT sum(missing) FROM rc), 0) > 0 THEN 'FAIL'
            WHEN coalesce((SELECT sum(nonzero) FROM rc), 0) > 0 THEN 'FAIL'
            ELSE 'PASS' END
FROM led
UNION ALL
SELECT 'C17', 'archive 表数符合已应用波次', '0→22→130→139',
       led.archive_tables::text,
       CASE WHEN led.archive_tables =
                  16 * (CASE WHEN led.w1 THEN 1 ELSE 0 END)
                + 108 * (CASE WHEN led.w2 THEN 1 ELSE 0 END)
                + 8 * (CASE WHEN led.w3 THEN 1 ELSE 0 END)
                + 6 * (CASE WHEN led.w1 OR led.w2 THEN 1 ELSE 0 END)
                + 1 * (CASE WHEN led.w3 THEN 1 ELSE 0 END)
            THEN 'PASS' ELSE 'FAIL' END
FROM led;

\echo '== 完：C1–C15、C17 与 7.5 的 C18 必须 PASS；C16 在特权只读会话下必须 PASS =='
