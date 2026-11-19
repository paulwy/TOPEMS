# dev 库账本 vs 真实 schema 一致性复核（2026-11-19）

> 只读审计对象：本机 dev 库 `topems`；生产仅用 `topems_drift` 非特权连接只读比对账本；**未对任何库执行写操作**（无迁移重放、无账本增删）。

> 审计日期：2026-11-19　仓库 HEAD：`c7cc6f0061bf261a3b2a4b6d1031564be8546cea`

---

## 0. 结论摘要

| 指标 | 读数 |
|---|---|
| dev 账本 | 693 行，success 693 / failed 0，max `20261119000002` |
| 覆盖断言 | 693 个已记账版本，13466 条对象断言（表/列/类型/枚举值/RLS/策略/索引） |
| **假 applied** | **93 个版本**，1021 个核心对象断言失败（表 132、列 570、表缺致列 196、RLS 关闭 71、RLS 表缺 51、枚举值 1） |
| 假 applied 分类 | 回归空壳 24 条（403 对象）· 无法判定 35 条（153 对象）· 已迁 schema 33 条 · 已被后续删除 1 条 |
| **对象存在但账本无记录** | **15 个版本 / 66 个对象**；其中 6 个版本在 prod 账本已记为 applied |
| 账本有记录但仓库无文件 | 1 条：`20261103000005` |
| checksum 与文件不一致 | 1 条：`20261007000012`（dev 应用的是旧版文件） |
| prod 已应用但 dev 账本缺 | 29 条 |
| 仅索引/策略不匹配（软告警） | 56 个版本（索引缺失或多库，多为 relocated 的伴生现象，未计入假 applied） |

**未执行任何修复**。按“执行前先给清单”的要求，本文只交付清单、分类与重放方案；所有建议均为待批准状态。

---

## 1. 范围、方法与边界

- 对象：本机 `topems`（dev），以 `_sqlx_migrations` 与 `database/migrations/*.sql` 双向比对。
- 生产只读：`postgresql://topems_drift@127.0.0.1:5432/topems_prod`，仅查 `_sqlx_migrations`，未读取业务表。
- 未连接、未修改 `topems_prod`、`topems_snap_*`；未执行 `apply-forward`、未重放迁移、未改账本。
- 断言来源：解析每个迁移文件中的 `CREATE TABLE`、`ALTER TABLE ... ADD COLUMN`、`CREATE TYPE/DOMAIN`、`ALTER TYPE ... ADD VALUE`、`ENABLE ROW LEVEL SECURITY`、`CREATE POLICY`、`CREATE INDEX`，再对系统目录（`pg_class`/`pg_attribute`/`pg_type`/`pg_enum`/`pg_policies`/`pg_indexes`）逐条核对；仅当账本 `success=true` 时才要求对象必须存在。
- 分类规则：
  - **regression（空壳表）**：目标表存在但列数 ≤2（通常只剩 `id, deleted_at`），后续列迁移的效果丢失。
  - **relocated（已迁 schema）**：同名对象存在于其他 schema（如 `public.*` → `iam.*`），按后续迁移设计视为已迁移。
  - **superseded**：后续已记账迁移明确 `DROP`/`RENAME` 该对象。
  - **unknown**：目录中找不到对象，也找不到后续迁移的删除/迁移证据。
- 解析脚本与中间结果保存在 `/tmp`（`audit_dev_ledger.mjs`、`/tmp/audit_dev_ledger.json`、`/tmp/classify2.json`），不进入仓库。

---

## 2. 发现 A：假 applied 清单（93 条）

### 2.1 regression：表存在但只剩空壳（最高优先级）

这些表当前只有 `id`/`deleted_at` 等 1–2 列，此前已记账的补列迁移效果不在库中。`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 全部幂等，**可安全重放**。

| 版本 | 文件 | 空壳表 | 缺失对象数 |
|---|---|---|---|
| 20260901000024 | 20260901000024_auth_unify_fk.sql | `iam.password_reset_tokens`, `iam.refresh_tokens`, `iam.user_access_logs`, `iam.user_roles` | 25 |
| 20260918000014 | 20260918000014_align_business_tables.sql | `finance.budgets` | 11 |
| 20260918000033 | 20260918000033_audit_entity_type_align.sql | `bi.audit_logs` | 1 |
| 20260918000034 | 20260918000034_5433_audit_gap_fill.sql | `bi.audit_logs` | 1 |
| 20260920000094 | 20260920000094_public_schema_align.sql | `public.process_flows` | 8 |
| 20260921000103 | 20260921000103_backend_i18n_batch6_bilingual_columns.sql | `public.process_flows` | 1 |
| 20260923000003 | 20260923000003_erp_column_fixes.sql | `erp.meeting_bookings`, `erp.vehicle_requests` | 5 |
| 20261007000004 | 20261007000004_align_missing_columns_selfheal.sql | `finance.payables`, `finance.receivables` | 31 |
| 20261007000010 | 20261007000010_align_missing_columns_selfheal4.sql | `bi.audit_logs` | 15 |
| 20261007140000 | 20261007140000_align_stub_tables_handler_contract.sql | `finance.budgets`, `finance.expenses`, `finance.payables`, `finance.receivables`, `integration.erp_mappings` … | 126 |
| 20261017000001 | 20261017000001_web_contract_smoke_stub_cols_align.sql | `finance.expenses`, `finance.receivables` | 2 |
| 20261017000008 | 20261017000008_ehs_health_records_cols.sql | `ehs.health_records` | 7 |
| 20261017000015 | 20261017000015_ehs_health_monitor_cols.sql | `ehs.health_records` | 4 |
| 20261018000004 | 20261018000004_finance_expenses_add_cols.sql | `finance.expenses` | 6 |
| 20261020000020 | 20261020000020_ehs_tables_tenant_id.sql | `ehs.health_records`, `ehs.monitoring_points` | 6 |
| 20261026120000 | 20261026120000_ehs_ddl_dual_track_align.sql | `ehs.health_records` | 11 |
| 20261026230000 | 20261026230000_ehs_health_records_handler_cols.sql | `ehs.health_records` | 6 |
| 20261027140000 | 20261027140000_ehs_handler_columns_align.sql | `ehs.health_records`, `ehs.safety_checks` | 5 |
| 20261027150000 | 20261027150000_ehs_health_records_safety_checks_misc_cols.sql | `ehs.health_records`, `ehs.safety_checks` | 4 |
| 20261028000000 | 20261028000000_subscriptions_table_columns.sql | `public.subscriptions` | 7 |
| 20261029173000 | 20261029173000_schema_defense_columns_misc.sql | `doc.documents`, `public.core_ticket_activities`, `public.core_ticket_comments`, `public.core_ticket_sla_escalations`, `public.core_ticket_sla_policies` … | 104 |
| 20261029176000 | 20261029176000_schema_defense_columns_qms.sql | `public.qa_qms_sync_records` | 11 |
| 20261029200000 | 20261029200000_schema_defense_type_align.sql | `doc_service.core_doc_documents` | 1 |
| 20261030162000 | 20261030162000_fill_ehs_safety_checks_columns.sql | `ehs.safety_checks` | 5 |

### 2.2 unknown：对象缺失且无后续删除/迁移证据

| 版本 | 文件 | 主要缺失对象（最多 5 个） | 含 DML |
|---|---|---|---|
| 20260725000000 | 20260725000000_business_base_tables.sql | `crm.core_crm_customers`, `erp.core_erp_suppliers`, `finance.finance_alert_configs_v`, `finance.finance_alert_history_v`, `finance.finance_anomaly_alerts_v` … | 否 |
| 20260725000003 | 20260725000003_finance_account_voucher_add_fields.sql | `public.voucher_status::reversed` | 否 |
| 20260909000001 | 20260909000001_rls_event_chain_tenant.sql | `erp.voucher_items` | 否 |
| 20260909000003 | 20260909000003_ticket_ext_attachments.sql | `ticket.ticket_attachments` | 否 |
| 20260909110001 | 20260909110001_sales_invoices.sql | `finance.erp_collection_records` | 否 |
| 20260911000001 | 20260911000001_async_task_queue.sql | `integration.async_tasks` | 否 |
| 20260911000005 | 20260911000005_external_erp_staging_rls.sql | `integration.external_erp_staging` | 否 |
| 20260917000001 | 20260917000001_mobile_oa_tables.sql | `mobile.oa_announcement_reads` | 否 |
| 20260920000086 | 20260920000086_missing_columns_batch3.sql | `wms.inventory_alerts.rule_id`, `srm.bid_prices.tenant_id` | 否 |
| 20260921000107 | 20260921000107_backend_i18n_batch8_bilingual_columns.sql | `ehs.qa_ehs_hazard_factors.name_en` | 否 |
| 20261007000001 | 20261007000001_crm_return_event_outbox.sql | `crm.return_event_outbox` | 否 |
| 20261007000006 | 20261007000006_rebuild_orphan_tables.sql | `_sqlx_test.databases`, `mes.dashboard_stats`, `mes.financial_records`, `mes.supply_chain_orders`, `public._archive_core_workflow_versions` | 否 |
| 20261007000009 | 20261007000009_align_orphan_tables_selfheal3.sql | `qms.qa_alert_messages`, `qms.qa_apqp_projects`, `wms.replenishment_suggestions` | 否 |
| 20261007000018 | 20261007000018_create_hrm_cache_invalidation_logs.sql | `hrm.hrm_cache_invalidation_logs` | 是 |
| 20261007000020 | 20261007000020_create_integration_sync_logs.sql | `integration.integration_sync_logs` | 是 |
| 20261007000021 | 20261007000021_create_lims_inspection_records.sql | `lims.lims_inspection_records` | 是 |
| 20261007230000 | 20261007230000_create_lims_safety_tasks.sql | `lims.lims_safety_tasks` | 是 |
| 20261015000062 | 20261015000062_k1_mdm_knowledge_tables.sql | `master_data.mdm_asset_categories` | 是 |
| 20261017000006 | 20261017000006_ehs_env_compliance_assess_permits_cols.sql | `ehs.qa_ehs_compliance_evaluations.non_complianceitems`, `ehs.qa_ehs_compliance_evaluations.corrective_actions`, `ehs.qa_ehs_discharge_permits.permit_category`, `ehs.qa_ehs_discharge_permits.discharge_limits`, `ehs.qa_ehs_discharge_permits.monitoring_requirements` | 否 |
| 20261017000011 | 20261017000011_ehs_disease_cases_cols.sql | `ehs.qa_ehs_disease_cases.gender`, `ehs.qa_ehs_disease_cases.age`, `ehs.qa_ehs_disease_cases.hazard_factor`, `ehs.qa_ehs_disease_cases.work_related`, `ehs.qa_ehs_disease_cases.attachments` … | 否 |
| 20261017000012 | 20261017000012_ehs_hazardous_material_cols.sql | `ehs.qa_ehs_msds.product_name`, `ehs.qa_ehs_msds.manufacturer`, `ehs.qa_ehs_msds.emergency_phone` | 否 |
| 20261018000006 | 20261018000006_ai_conversations_copilot_cols.sql | `core.ai_conversations.module`, `core.ai_conversations.messages`, `core.ai_conversations.selected_records`, `core.ai_conversations.context_data` | 否 |
| 20261023000009 | 20261023000009_master_data_domain_rls.sql | `master_data.uoms` | 否 |
| 20261024000001 | 20261024000001_p2_four_tables_tenant_rls.sql | `finance.expense_approvals`, `ehs.qa_ehs_drill_evaluations` | 否 |
| 20261024000010 | 20261024000010_crm_segments_tenant_rls.sql | `crm.customer_segments`, `crm.customer_recommendations` | 否 |
| 20261024000012 | 20261024000012_srm_supplier_users.sql | `srm.supplier_users`, `srm.supplier_users` | 否 |
| 20261024000015 | 20261024000015_copilot_faq_table.sql | `core.ai_faqs` | 是 |
| 20261027100000 | 20261027100000_scenario_fix_contract_align.sql | `portal.portal_todos.service`, `portal.portal_todos.status`, `portal.portal_todos.description`, `portal.portal_todos.assigned_to`, `portal.portal_todos.completed_at` … | 否 |
| 20261027110000 | 20261027110000_mes_quality_standard_values_work_reports_tenant_id.sql | `mes.work_reports` | 否 |
| 20261027130000 | 20261027130000_fix_ehs_columns_and_mdm_v55_types.sql | `ehs.qa_ehs_training_certificates.program_no`, `ehs.qa_ehs_training_certificates.program_id`, `ehs.training_programs.program_id`, `ehs.qa_ehs_inspection_records.check_no`, `ehs.qa_ehs_msds.hazard_no` | 否 |
| 20261029175000 | 20261029175000_schema_defense_columns_portal.sql | `portal.graphql_breaking_changes.version_id`, `portal.graphql_execution_profiles.query_hash`, `portal.graphql_stream_events.stream_id`, `portal.graphql_stream_subscribers.stream_id`, `portal.portal_accel_configs.name` … | 否 |
| 20261029177000 | 20261029177000_schema_defense_columns_sync.sql | `integration.crm_erp_sync.created_at`, `integration.crm_erp_sync.crm_opportunity_id`, `integration.crm_erp_sync.customer_code`, `integration.crm_erp_sync.direction`, `integration.crm_erp_sync.last_synced_at` … | 否 |
| 20261030171000 | 20261030171000_fill_wms_outbound_orders_order_date.sql | `wms.outbound_orders.order_date` | 否 |
| 20261102220000 | 20261102220000_rls_enable_biz_batch1.sql | `ehs.qa_ehs_compliance_evaluations`, `ehs.qa_ehs_discharge_permits`, `ehs.qa_ehs_drill_evaluations`, `ehs.qa_ehs_env_monitor_records`, `ehs.qa_ehs_environment_incidents` … | 否 |
| 20261112095000 | 20261112095000_w7_b4_srm_supplier_users_restrictive.sql | `srm.supplier_users` | 否 |

### 2.3 relocated：同名对象已在其他 schema

| 版本 | 文件 | 对象数 | 目标 schema |
|---|---|---|---|
| 10 | 010_billing.sql | 5 | iam |
| 20260724000003 | 20260724000003_create_dashboard_tables.sql | 1 | iam |
| 20260825000000 | 20260825000000_rebuild_permission_tables.sql | 1 | iam |
| 20260827000000 | 20260827000000_v448_permission_tables.sql | 8 | iam |
| 20260831190850 | 20260831190850_restore_legacy_vectors.sql | 1 | ai |
| 20260907000001 | 20260907000001_erp_public_business_tables.sql | 5 | lims, mes, scm |
| 20260908000009 | 20260908000009_missing_tables.sql | 2 | public |
| 20260909090002 | 20260909090002_ticket_core_tickets_rls.sql | 1 | public, ticket |
| 20260916000001 | 20260916000001_crm_contracts.sql | 1 | crm, hrm, pm |
| 20260917000008 | 20260917000008_flow_authority_complete.sql | 2 | flow, iam, public |
| 20260918000019 | 20260918000019_align_5432_module_schemas.sql | 1 | public |
| 20260918000021 | 20260918000021_add_analytics_tenant_id.sql | 13 | analytics, bi, public |
| 20260918000022 | 20260918000022_align_reports_tables.sql | 50 | analytics, bi, pm, report |
| 20260918000049 | 20260918000049_scm_supplier_no_documents.sql | 1 | ai, doc, erp, mobile, pm, unified_core |
| 20260920000080 | 20260920000080_flow_workflows_columns.sql | 4 | flow, iam, public |
| 20260920000083 | 20260920000083_tenant_id_batch.sql | 24 | ehs, finance, flow, iam, lims, mes, portal, public, qms |
| 20260921000099 | 20260921000099_backend_i18n_batch2_bilingual_columns.sql | 2 | iam, public |
| 20260923150000 | 20260923150000_flow_public_tenant_rls.sql | 2 | flow, iam, public |
| 20260923160000 | 20260923160000_flow_remaining_tables_tenant_rls.sql | 4 | flow, iam, public |
| 20260926120000 | 20260926120000_app_schema_tables.sql | 2 | public |
| 20261007000011 | 20261007000011_align_missing_columns_selfheal5.sql | 18 | mes |
| 20261007000013 | 20261007000013_align_missing_columns_selfheal6.sql | 1 | finance, plugin_erp, plugin_finance |
| 20261013000000 | 20261013000000_align_runtime_contract_v2.sql | 2 | iam, public |
| 20261015000074 | 20261015000074_k1_missing_table_baselines.sql | 4 | analytics, bi, finance, pm, report |
| 20261019000001 | 20261019000001_notification_templates_tenant_id.sql | 1 | iam, public |
| 20261021000001 | 20261021000001_finance_currency_master.sql | 9 | finance |
| 20261024000011 | 20261024000011_gis_devices_token.sql | 1 | gis, mobile |
| 20261027200000 | 20261027200000_core_schema_duplicates_cleanup.sql | 4 | flow, public |
| 20261029120000 | 20261029120000_schema_defense_orphan_tables_to_authoritative.sql | 2 | flow |
| 20261029179000 | 20261029179000_schema_defense_columns_fix.sql | 11 | ai, gis, integration, srm, wms |
| 20261029185000 | 20261029185000_schema_defense_align_columns.sql | 2 | public, qms |
| 7 | 007_communication.sql | 4 | communication, iam |
| 9 | 009_sync.sql | 1 | iam, mobile |
### 2.4 superseded

- `20260918000011` 20260918000011_smoke_gap_fix.sql：后续迁移已删除/重命名

---

## 3. 发现 B：对象存在但账本无记录（15 个版本 / 66 个对象）

> 判定口径：迁移文件未记账（pending），但其解析出的对象已在 dev 存在。**其中部分对象可能由其他迁移/历史脚本创建**，需按“prod 是否已记账”分别处置。

| 版本 | 文件 | prod 账本 | 已存在对象数 | 示例 |
|---|---|---|---|---|
| 20261104050000 | 20261104050000_db16_5433_tenant_id_rls_decouple_14cols.sql | 否 | 5 | `policy:mes.material_plans::rls_tenant_isolation`, `policy:mobile.oa_announcements::rls_tenant_isolation`, `policy:mobile.oa_calendar_events::rls_tenant_isolation` |
| 20261105145000 | 20261105145000_finance_currency_master_fix.sql | 否 | 1 | `table:finance.core_finance_currencies` |
| 20261107000002 | 20261107000002_tenant_modules_tier_column.sql | 否 | 1 | `column:public.core_tenant_modules.tier` |
| 20261107000029 | 20261107000029_create_mdm_supplier_master_batch32.sql | 否 | 6 | `table:master_data.mdm_suppliers`, `policy:master_data.mdm_suppliers::tenant_isolation_mdm_suppliers`, `index:master_data.mdm_suppliers_supplier_no_idx` |
| 20261107000031 | 20261107000031_supplier_category_dict_and_backfill.sql | 否 | 6 | `table:master_data.mdm_supplier_categories`, `column:master_data.mdm_suppliers.category_code`, `policy:master_data.mdm_supplier_categories::tenant_isolation_mdm_supplier_categories` |
| 20261107000033 | 20261107000033_mdm_sync_dead_letter.sql | 否 | 6 | `table:master_data.mdm_sync_dead_letter`, `policy:master_data.mdm_sync_dead_letter::tenant_isolation_mdm_sync_dead_letter`, `index:master_data.mdm_sync_dead_letter_entity_idx` |
| 20261107000036 | 20261107000036_rd_deploy_formula_link_batch38.sql | 否 | 2 | `column:rd.deploys.formula_id`, `index:rd.idx_rd_deploys_formula` |
| 20261109110100 | 20261109110100_p3_report_line_map.sql | 否 | 3 | `table:finance.core_finance_report_line_map`, `index:finance.uq_report_line_map_scope_match`, `index:finance.idx_report_line_map_lookup` |
| 20261109160300 | 20261109160300_p5_b2_finance_columns.sql | 是 | 7 | `column:finance.finance_budget_variances_v53.created_at`, `column:finance.finance_budget_variances_v53.updated_at`, `column:finance.finance_budget_variances_v53.tenant_id` |
| 20261115120000 | 20261115120000_k8_crm_erp_rls_fail_closed_2.sql | 是 | 1 | `index:crm.idx_crm_billing_records_tenant` |
| 20261115141500 | 20261115141500_b_class_portal_todos_2cols.sql | 是 | 2 | `column:portal.portal_todos.user_id`, `column:portal.portal_todos.completed` |
| 20261115142400 | 20261115142400_public_platform_3tables_25cols.sql | 是 | 20 | `column:public.cqrs_events.deleted_at`, `column:public.analytics_sync_records.data_source_id`, `column:public.analytics_sync_records.status` |
| 20261115142500 | 20261115142500_shell_tail_7tables_13cols.sql | 是 | 4 | `column:portal.portal_todos.service_code`, `column:portal.portal_todos.service_name`, `column:portal.portal_todos.todo_type` |
| 20261118150000 | 20261118150000_batch0_active_residual_rls_strict.sql | 是 | 1 | `index:public.idx_core_file_permissions_tenant_id` |
| 20261119010000 | 20261119010000_iam_resource_permissions_role_grants.sql | 否 | 1 | `column:iam.resource_permissions.deleted_at` |

- **prod 已记账的 6 条**（`20261109160300`、`20261115120000`、`20261115141500`、`20261115142400`、`20261115142500`、`20261118150000`）：dev 账本属漏记，应核对对象后补账本行（checksum 用当前文件 sha384）。
- **两边都未记账的 9 条**：对象来源不明（手工执行/测试脚本）。其中 `20261119010000` 的 `deleted_at` 属迁移前既有列，属误报，可直接忽略。
- `20261104050000` 命中的是 `mes`/`mobile` 的既有 RLS 策略，非该迁移独有，需人工确认后再决定是否补账本。

---

## 4. 发现 C：账本有记录、仓库无文件

- `20261103000005`：dev 账本有 success 行，checksum `7b47f604830d699312ca04e964d40945bdbb269503cdd758e0e0cac7930a5287bfa9352036af063c0f15dfa71614c0c7`，但仓库及 git 历史均无 `20261103000005_*.sql`。
- 处置：先确认该版本是否为已删除的本地/定向迁移；若其对象已被后续迁移覆盖 → 标记 superseded 并保留；否则列为待定，**不要**直接删账本行。

---

## 5. 发现 D：checksum 与文件不一致（1 条）

`20261007000012_align_rebuild_selfheal.sql`：
- dev 账本 checksum：`79d1bb1d0efb2b20a847699e36d5192e7c3becb685439acac2dc067a6ec6ac179d406818034e4583c7a4aeab8af67fc1`= 提交 `ff88d906c^` 的旧版文件。
- 当前 HEAD 文件 sha384：`ace9d6be17946df511e1be593855b7fe3f1a5eca61380a6bff2003fe946fe9fd3c691917feb64832691c11491dc629d9`（`ff88d906c` 新增 56 行 / 删 4 行）。
- 结论：dev 应用的是旧版；**不是**对象缺失型假 applied，但 HEAD 文件的新增效果未落地。
- 处置：先审阅 `git diff ff88d906c^ ff88d906c -- <file>`，确认 56 行均为幂等 DDL 后，走“删账本行 → 重放 HEAD 文件”或新前向补丁；**禁止**仅改 checksum。

---

## 6. 发现 E：prod 已应用但 dev 账本缺（29 条）

```text
20261105100000 20261105235600 20261105235700 20261108091000 20261108135000 20261109160300 20261110110200 20261110120100 20261110210000 20261112190000 20261113100000 20261114120000 20261114201000 20261114202000 20261115000000 20261115110000 20261115120000 20261115141500 20261115142000 20261115142400 20261115142500 20261117120000 20261117220000 20261118090000 20261118110000 20261118112000 20261118113000 20261118125000 20261118150000
```

其中 6 条的对象已在 dev 出现（见 §3）；其余 23 条需先确认 dev 是否真的缺对象，再决定“补账本”还是“应用到 dev”。

---

## 7. 处置建议（逐条口径）

| 类别 | 条数 | 建议 | 是否可自动重放 |
|---|---|---|---|
| regression 空壳 | 24 | 按版本序重放对应 `ALTER TABLE ... ADD COLUMN` 文件；重放前后各跑一次列断言 | 是（幂等 DDL） |
| unknown（无 DML） | 29 | 先只读确认对象应存在 → 重放；失败即停 | 是（均为 IF NOT EXISTS） |
| unknown（含 DML） | 6 | **先人工审阅 DML 影响行数与语义**，未确认前不重放 | 否 |
| relocated | 33 | 标记 superseded，不重放；如应用仍读旧 schema 再评估兼容视图 | 否 |
| superseded | 1 | 标记 superseded，不重放 | 否 |
| 漏记账本（prod 已记） | 6 | 核对对象后补账本行（checksum = 当前文件 sha384），不执行迁移 | 否 |
| checksum 漂移 | 1 | 审阅 diff 后重放新文件或补前向补丁 | 否（需先审阅） |
| 孤儿账本 | 1 | 查清来源后决定 superseded/保留 | 否 |

### 7.1 重放模板（dev，逐条；执行前先备份）

```bash
# 0) 备份（dev）
pg_dump -d topems -Fc -f /tmp/topems_pre_devfix_$(date +%Y%m%d%H%M%S).dump
# 1) 仅删除该版本账本行（不批量）
psql -d topems -c "DELETE FROM _sqlx_migrations WHERE version = '<VERSION>' AND success"
# 2) 走正式入口重放单版本（写入新 checksum）
bash scripts/migration/apply-forward.sh --db topems \
  --apply-deferred <VERSION> --ticket DEV-CONSISTENCY-20261119
# 3) 失败即停：若第 2 步失败，重放不会写账本；从备份恢复前先记录错误原文
```

> 注意：`20260725000000`（52 表）虽含 13 个 unknown 对象，但其中 `finance.finance_u`/`finance.finance_v` 等为历史占位表，**不建议整条重放**，按 superseded 处理。

---

## 8. 抽样验证方案（3 条；待批准后执行）

> 目前未执行任何修复，因此以下为“修复后验证”的具体脚本；同时已用 SQL 读取证明 `bi.report_status` 现存 6 个枚举值（历史案例已恢复）。

| # | 目标 | 修复动作 | 验证 SQL |
|---|---|---|---|
| 1 | `ehs.health_records` | 重放 `20261017000008` 等列迁移 | `SELECT string_agg(attname,',' ORDER BY attnum) FROM pg_attribute WHERE attrelid='ehs.health_records'::regclass AND attnum>0 AND NOT attisdropped;` 期望含 `record_no,department,position,workplace,hazard_factors,allergy_history,contact_info` |
| 2 | `iam.user_roles` | 重放 `20260901000024` | 列期望含 `user_id,role_id,tenant_id,granted_by,granted_at,expires_at`；另查 `pg_constraint` 外键存在 |
| 3 | `bi.report_status`（正向对照） | 无需修复 | `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='report_status' ORDER BY enumsortorder;` 已得 6 值：draft/published/archived/pending/scheduled/cancelled |

行为验证（dev，事务内回滚，不留数据）：
```sql
BEGIN;
INSERT INTO ehs.health_records (id, tenant_id, record_no) VALUES (gen_random_uuid(), <TENANT>, 'VERIFY-001');
SELECT record_no FROM ehs.health_records WHERE record_no='VERIFY-001';
ROLLBACK;
```
> 若无可用 tenant，可改用 `EXPLAIN`/列断言 + 接口 smoke（`/health` 与对应业务 GET）验证。

---

## 9. 重放风险清单（可能破坏 dev 数据，需人工确认）

以下版本含 `INSERT/UPDATE/DELETE/TRUNCATE`，重放前必须逐条审阅 DML 与影响行数：

```text
20260917000008 20260918000019 20260920000080 20261007000018 20261007000020 20261007000021 20261007140000 20261007230000 20261015000062 20261021000001 20261024000015
```

- `20261007140000` 同时命中 118 个空壳列与 8 个 relocated 对象，且含 DML，风险最高；建议先做列级重放（拆出 ADD COLUMN），不要整条重放。
- `20261015000062` 含 DML 且 `master_data.mdm_asset_categories` 缺失，需先确认建表与数据种子是否可重入。
- `20260725000000` 会重建 52 张基础表（含 13 个 unknown），可能生成历史占位表，不建议重放。

---

## 10. 复现命令

```bash
# 账本水位
psql -d topems -X -A -F'|' -c "SELECT count(*),count(*) FILTER (WHERE success),max(version) FROM _sqlx_migrations;"
# 与 prod 账本集合比对（只读）
psql postgresql://topems_drift@127.0.0.1:5432/topems_prod -X -At -c "SELECT version FROM _sqlx_migrations WHERE success ORDER BY version" > /tmp/prod_v.txt
psql -d topems -X -At -c "SELECT version FROM _sqlx_migrations WHERE success ORDER BY version" > /tmp/dev_v.txt
comm -23 /tmp/prod_v.txt /tmp/dev_v.txt   # prod 有、dev 无
comm -13 /tmp/prod_v.txt /tmp/dev_v.txt   # dev 有、prod 无
# 全量对象审计（本机脚本，不提交）
node /tmp/audit_dev_ledger.mjs && python3 /tmp/classify2.py
```

---

## 11. 边界声明

- 仅对 dev 库 `topems` 做只读审计；未写 `topems_prod`、未连 `topems_snap_*`。
- 生产侧仅用 `topems_drift` 读取 `_sqlx_migrations`。
- 未执行迁移、未修改账本、未调用 `apply-forward`。
- 本文与审计脚本均未改动 `TODO.md` 及两份未跟踪文档。


---

## 12. 执行记录（2026-11-19 14:31–14:33，仅 dev `topems`）

### 12.1 备份

- 文件：`/tmp/topems_pre_devfix_20261119143121.dump`（4.1 MB，`pg_dump -Fc`）
- sha256：`d147cc77cab733b66fe3c7c8bb5134c4ec453e3b606de100fd259c926e3b5b8c`
- 恢复命令：`pg_restore -d topems --clean --if-exists /tmp/topems_pre_devfix_20261119143121.dump`

### 12.2 第一批：空壳回归（实际 23 条）

- 执行方式：逐条 `DELETE FROM _sqlx_migrations WHERE version=<v> AND success` → `apply-forward.sh --db topems --apply-deferred <v> --ticket DEV-CONSISTENCY-20261119`，全部 rc=0。
- 版本：`20260901000024 20260918000014 20260918000033 20260918000034 20260920000094 20260921000103 20260923000003 20261007000004 20261007000010 20261017000001 20261017000008 20261017000015 20261018000004 20261020000020 20261026120000 20261026230000 20261027140000 20261027150000 20261028000000 20261029173000 20261029176000 20261029200000 20261030162000`
- 未执行：`20261007140000`（含 DML，按“11 条 DML 一律不动”排除，故 24 条中实做 23 条）。
- 账本：693 行，success 693 / failed 0；23 个版本均重新记账。
- 断言语义复核：21/23 已无核心缺失；2 条残留属**迁移自带守卫**，不是假 applied：
  - `20261007000004`：`DO $$ ... IF EXISTS (pg_class ...) THEN ALTER ...`，`flow.core_master_data_*` 等表不存在时按设计跳过。
  - `20261029173000`：`ALTER TABLE IF EXISTS "public"/"analytics"."reports" ...`，表不存在时按设计跳过。
- 抽样验证输出：
  - `ehs.health_records` 列：`id,deleted_at,record_no,department,position,workplace,hazard_factors,allergy_history,contact_info,check_type,check_date,result,remarks,chronic_diseases,emergency_contact,emergency_phone,employee_id,employee_name,status,created_at,updated_at,tenant_id,birth_date,blood_type,medical_history`（24 列）
  - `iam.user_roles` 列：`id,deleted_at,user_id,role_id,tenant_id,granted_by,granted_at,expires_at`（8 列）
  - `bi.report_status`：`draft,published,archived,pending,scheduled,cancelled`（6 值）
  - 行为验证：`BEGIN; INSERT INTO ehs.health_records(id,tenant_id,record_no) VALUES (gen_random_uuid(),gen_random_uuid(),'VERIFY-001'); SELECT ...; ROLLBACK;` → `INSERT 0 1` / `VERIFY-001`，事务回滚，无残留。

### 12.3 第二批：已迁 schema（33 条，未执行，待确认）

- 其中 4 条在“11 条 DML 一律不动”清单内：`20260917000008`、`20260918000019`、`20260920000080`、`20261021000001`。
- 其余 29 条若重放，会在原 schema 新建 **29 张同名重复表**（同名对象已存在于 `iam`/`ai`/`qms`/`lims` 等），例如：
  - `010_billing.sql` → `public.core_billing_plans`（现存在于 `iam`）
  - `20260907000001` → `public.supply_chain_orders`、`public.production_plans`
  - `20260724000003` → `public.core_dashboard_refresh_log`（现存在于 `iam`）
- 风险：空表可能与现有 schema 同名，若代码以未限定名查询会被 `public` 空表遮蔽；与本文件 §7 “relocated = superseded，不重放”的建议一致，故**暂停执行并等待确认**。
