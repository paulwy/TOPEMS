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

**执行状态（2026-11-19 更新）**：§2 为初始审计清单；已完成五批处置——空壳回归重放 23 条（§12.2）、relocated 按 superseded 关闭 29 条（§12.3）、unknown 非 DML 定性（§12.5）、真缺 27 条执行（§12.6：已补齐 22 / superseded 关闭 4 / 暂不动 1）、DML 11 条收尾（§12.8：原样重放 7 + RLS 定向补丁 3 + superseded 1），加上原 superseded 1 条，**合计已处置/关闭 92 / 93**。剩余仅 `20261024000012` 1 条（等 `20261105100000` 账本空洞定论）。归总见 §12.4/§12.8。

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
| unknown（无 DML） | 29 | **已定性并执行（§12.5/§12.6）：真缺 27 → 已补齐 22 / superseded 关闭 4 / 暂不动 1；no-op 2 已关闭** | 是 |
| unknown（含 DML） | 6 | **先人工审阅 DML 影响行数与语义**，未确认前不重放 | 否 |
| relocated | 33 | **已定：29 条非 DML 按 superseded 关闭、不重放（逐条见 §12.3）；4 条含 DML 留待评估** | 否 |
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

### 12.3 第二批：已迁 schema（29 条按 superseded 关闭，不重放）

**结论**：用户于 2026-11-19 确认按选项 A 收尾——29 条 relocated（非 DML）全部按 **superseded 关闭**，**不重放、不在 `public.*` 建任何表、不改账本行**；4 条含 DML 的 relocated 版本继续留在 DML 待评估清单，不在本轮处理。

**判定依据与来源**（只读，2026-11-19）：
1. `_sqlx_migrations` 中这些版本 `success=true`，且 **prod 账本同版本已 applied**——说明两侧都执行过，问题只是对象落点在别的 schema。
2. 在 dev 目录中按「同名 relname 跨 schema」检索 `pg_class`：迁移声明要写到 `public.<x>`（或 `hrm/erp/qms/lims/master_data/communication/rs` 等）的对象，实际已在 `iam`/`ai`/`flow`/`mes`/`analytics,bi`/`qms` 等 schema 存在。
3. 因此重放只会在原 schema 造出同名空表；若代码以未限定名查询会被 `public` 空表遮蔽，等价于数据“看起来丢了”。与 §7「relocated = superseded，不重放」一致。

**逐条关闭清单（29 条）**

| 版本 | 文件 | 迁移声明对象（应存在处） | 实际落点（只读核对） | 判定 |
|---|---|---|---|---|
| 10 | 010_billing.sql | `public.core_billing_plans`/`core_subscriptions`/`core_billing_invoices`/`core_usage_records`/`core_plugin_pricing` | `iam`（5 表） | relocated → iam，superseded |
| 20260724000003 | 20260724000003_create_dashboard_tables.sql | `public.core_dashboard_refresh_log` | `iam` | relocated → iam，superseded |
| 20260825000000 | 20260825000000_rebuild_permission_tables.sql | `public.tool_permissions` | `iam` | relocated → iam，superseded |
| 20260827000000 | 20260827000000_v448_permission_tables.sql | `public.tool_permissions`（8 对象） | `iam` | relocated → iam，superseded |
| 20260831190850 | 20260831190850_restore_legacy_vectors.sql | `hrm.vectors` | `ai` | relocated → ai，superseded |
| 20260907000001 | 20260907000001_erp_public_business_tables.sql | `public.production_plans`/`supply_chain_orders`/`financial_records`/`dashboard_stats`/`inspection_records` | `mes`（前 4）/`lims`,`scm`（inspection_records） | relocated → mes/lims/scm，superseded |
| 20260908000009 | 20260908000009_missing_tables.sql | `qms.qa_lab_samples`/`qa_lab_tasks` | `public` | relocated → public，superseded |
| 20260909090002 | 20260909090002_ticket_core_tickets_rls.sql | `ticket.core_tickets`（RLS 启用） | `ticket`/`public`（表存在；仅 RLS 未启用） | 对象已在权威 schema，RLS 项按 superseded 关闭 |
| 20260916000001 | 20260916000001_crm_contracts.sql | `crm.contracts` | `hrm`,`pm` | relocated → hrm/pm，superseded |
| 20260918000021 | 20260918000021_add_analytics_tenant_id.sql | `rs.analytics_*`（13 表 `tenant_id`） | `analytics`,`bi` | relocated → analytics/bi，superseded |
| 20260918000022 | 20260918000022_align_reports_tables.sql | `rs.reports`（50 列） | `analytics`,`bi`,`report` | relocated → analytics/bi/report，superseded |
| 20260918000049 | 20260918000049_scm_supplier_no_documents.sql | `erp.documents` | `ai`,`doc`,`mobile`,`pm`,`unified_core` | relocated → 多 schema，superseded |
| 20260920000083 | 20260920000083_tenant_id_batch.sql | `portal.core_faqs`/`core_guide_lessons`/`core_guides`.`tenant_id` | `iam`,`public` | relocated → iam/public，superseded |
| 20260921000099 | 20260921000099_backend_i18n_batch2_bilingual_columns.sql | `master_data.core_dict_types`/`core_dict_items`.`name_en` | `iam`,`public` | relocated → iam/public，superseded |
| 20260923150000 | 20260923150000_flow_public_tenant_rls.sql | `public.core_workflow_instances`/`core_workflow_tasks`（RLS） | `flow`,`iam`,`public` | relocated → flow/iam，superseded |
| 20260923160000 | 20260923160000_flow_remaining_tables_tenant_rls.sql | `public.core_workflows`/`core_workflow_versions`/`approvals`/`approval_records`（RLS） | `flow`,`iam` | relocated → flow/iam，superseded |
| 20260926120000 | 20260926120000_app_schema_tables.sql | `lims.qa_lab_samples`/`qa_lab_tasks` | `public` | relocated → public，superseded |
| 20261007000011 | 20261007000011_align_missing_columns_selfheal5.sql | `public.core_emails` 等 8 表列 | `public`（同名表存在且 8 个抽样列均已齐全） | 复核后断言已满足，无需重放 |
| 20261007000013 | 20261007000013_align_missing_columns_selfheal6.sql | `plugin_finance.accounting_subjects` | `finance`,`plugin_erp` | relocated → finance/plugin_erp，superseded |
| 20261013000000 | 20261013000000_align_runtime_contract_v2.sql | `communication.core_notification_templates`.`priority`/`data` | `iam`,`public` | relocated → iam/public，superseded |
| 20261015000074 | 20261015000074_k1_missing_table_baselines.sql | `public.cqrs_projection_progress`/`report_schedules`/`report_templates`/`reports` | `finance`/`analytics`,`bi`/`report` | relocated → 多 schema，superseded |
| 20261019000001 | 20261019000001_notification_templates_tenant_id.sql | `communication.core_notification_templates`.`tenant_id` | `iam`,`public` | relocated → iam/public，superseded |
| 20261024000011 | 20261024000011_gis_devices_token.sql | `gis.devices`.`device_token` | `mobile` | relocated → mobile，superseded |
| 20261027200000 | 20261027200000_core_schema_duplicates_cleanup.sql | `public.core_flow_variables`/`core_flow_rules`/`core_flow_delegates`/`core_flow_variable_history` | `flow`（另 `public` 有同名副本） | relocated → flow，superseded |
| 20261029120000 | 20261029120000_schema_defense_orphan_tables_to_authoritative.sql | `public.core_comments`/`core_favorites` | `flow` | relocated → flow，superseded |
| 20261029179000 | 20261029179000_schema_defense_columns_fix.sql | `public.analysis_results`/`document_chunks`/`maps`/`pipelines`/`qa_history`/`crm_erp_sync` 等（11） | `ai`,`gis`,`integration` | relocated → ai/gis/integration，superseded |
| 20261029185000 | 20261029185000_schema_defense_align_columns.sql | `mes.qa_sampling_plans`.`inspection_level`/`sample_size` | `qms`,`public` | relocated → qms/public，superseded |
| 7 | 007_communication.sql | `public.core_chat_rooms`/`core_chat_members`/`core_chat_messages`/`core_email_templates` | `iam`（email_templates 另在 `communication`） | relocated → iam，superseded |
| 9 | 009_sync.sql | `public.core_mobile_offline_records` | `iam`,`mobile` | relocated → iam/mobile，superseded |

**本轮明确不动（4 条 relocated 含 DML）**：`20260917000008`、`20260918000019`、`20260920000080`、`20261021000001`，继续留在 §9 DML 待评估清单。

> 本次收尾**未连接数据库做任何写入**；上述落点核对均为只读 `pg_class` 查询。账本保持第一批完成态（693 行 / success 693 / failed 0 / max `20261119000002`）。

### 12.4 「假 applied」93 条处置归总

| 处置 | 条数 | 备注 |
|---|---:|---|
| 已完成重放（空壳回归，§12.2） | 23 | 全部 rc=0；`20261007140000` 因 DML 未做，计入下项 |
| superseded 关闭（relocated 非 DML，§12.3） | 29 | 逐条落点见上表 |
| DML 已收尾（跨分类，§12.8） | 11 | 原样重放 7（含 2 条先过前置断言）+ RLS 定向补丁 3 + superseded 1；账本 checksum 均按文件 sha384 |
| unknown 真缺：已补齐（§12.6） | 22 | 19 条断言全清 + 3 条仅剩 relocated 残留（`20260921000107`、`20261024000001`、`20261102220000`） |
| unknown 真缺 → superseded 关闭（§12.6） | 4 | `20260725000000`（13 历史占位）、`20261007000006`、`20261007000009`、`20260920000086`（3 表 prod 亦无） |
| unknown 真缺：暂不动（§12.6） | 1 | `20261024000012`（`srm.supplier_users`，等 `20261105100000` 账本空洞定论） |
| unknown 定性：no-op（构造性/被取代，§12.5） | 2 | `20261007000001`、`20261112095000`，已关闭 |
| 其余：原 superseded | 1 | `20260918000011` |
| **合计** | **93** | 与 §2 分类（24+33+35+1）一致 |

> 口径说明：§2 的 unknown 共 35 条，其中 6 条含 DML 已单列进「DML 待评估」，故此处拆为 22 + 4 + 1 + 2 共 29 条，避免重复计数。23+29+11+22+4+1+2+1 = 93。
>
> **已处置/关闭：92 条** = 重放 23 + superseded 29 + 真缺已补齐 22 + 真缺 superseded 4 + no-op 2 + 原 superseded 1 + DML 11。
>
> **仍待处理：1 条** = `20261024000012`（暂不动，等 `20261105100000` 账本空洞定论）。

### 12.5 unknown（非 DML）29 条逐条定性

**方法（纯只读，2026-11-19）**：未写库、未动账本、未重放任何迁移。
1. 对每个版本解析出的声明对象，用 `pg_class` 在 dev 按「声明 schema 是否存在 / 同名 relname 在其他 schema 是否存在」批量核对（230 个表），列对象另查 `pg_attribute`。
2. 读取 prod 账本（`topems_drift`，只读）：29 条在 prod **均 success**（29/29），说明是 dev 侧未真正落地而非版本未发布。
3. 对「对象不存在」的版本，再读迁移原文的守卫（`to_regclass` / `DO $$ ... IF EXISTS` / `IF NOT EXISTS`）与后续迁移的 `DROP/RENAME`，判定是否构造性 no-op 或被取代。

**定性口径**：三选一——`relocated`（对象在他处）/ `no-op`（迁移本该跳过或被后续迁移取代）/ `真缺`（需补）。

| 版本 | 文件 | 定性 | 依据 |
|---|---|---|---|
| 20260725000000 | business_base_tables.sql | 真缺（需补） | 13 对象全库无同名表（`crm.core_crm_customers`、`erp.core_erp_suppliers`、`finance.finance_*_v`、`finance.finance_u/v`）；另 39 对象已在 lims/qms/master_data/communication；DO$$ 只守类型/schema，不放行缺表。历史占位，§9 不建议整条重放 |
| 20260725000003 | finance_account_voucher_add_fields.sql | 真缺（需补） | `public.voucher_status` 现有 `draft,submitted,approved,posted,rejected,cancelled`，**无 `reversed`** |
| 20260909000001 | rls_event_chain_tenant.sql | 真缺（需补） | `crm.sales_orders`/`erp.vouchers`/`erp.voucher_items`/`wms.purchase_order_snapshots` 均在声明 schema 存在，**RLS 未启用** |
| 20260909000003 | ticket_ext_attachments.sql | 真缺（需补） | `ticket.ticket_attachments` 存在，RLS 未启用 |
| 20260909110001 | sales_invoices.sql | 真缺（需补） | `finance.erp_collection_records` 存在，RLS 未启用 |
| 20260911000001 | async_task_queue.sql | 真缺（需补） | `integration.async_tasks` 存在，RLS 未启用 |
| 20260911000005 | external_erp_staging_rls.sql | 真缺（需补） | `integration.external_erp_staging` 存在，RLS 未启用 |
| 20260917000001 | mobile_oa_tables.sql | 真缺（需补） | `mobile.oa_announcement_reads` 存在，RLS 未启用 |
| 20260920000086 | missing_columns_batch3.sql | 真缺（需补） | `lims.samples.sample_no` 列缺；`wms.inventory_alerts.rule_id`、`srm.bid_prices.tenant_id`、`erp.sys_db_changes.old_definition` 三表全库无同名 |
| 20260921000107 | backend_i18n_batch8_bilingual_columns.sql | 真缺（需补） | `ehs.qa_ehs_hazard_factors`/`qa_ehs_hazardous_materials`/`qa_ehs_hazards`/`public.notification_channels` 的 `*_en` 列缺；`public.core_email_templates` 已 relocated 至 `iam`（1） |
| 20261007000001 | crm_return_event_outbox.sql | **no-op（被取代）** | 本迁移建 `crm.return_event_outbox`，后续 `20261014000020_drop_dead_outbox_tables.sql` 明确 `DROP TABLE`（该迁移已 applied） |
| 20261007000006 | rebuild_orphan_tables.sql | 真缺（需补） | 107 表已 relocated（`mes.*`/`public.*` → `iam` 等）；但 `analytics.analytics_*`（11）、`mes.dashboard_stats`/`financial_records`/`supply_chain_orders`、`public._archive_core_workflow_versions` 存在却 **RLS 未启用**；`_sqlx_test.databases` 为测试专用（非运行时） |
| 20261007000009 | align_orphan_tables_selfheal3.sql | 真缺（需补） | 12 表已 relocated；`qms.qa_alert_messages`/`qa_apqp_projects`/`wms.replenishment_suggestions` 存在但 **RLS 未启用** |
| 20261017000006 | ehs_env_compliance_assess_permits_cols.sql | 真缺（需补） | `ehs.qa_ehs_compliance_evaluations`/`qa_ehs_discharge_permits` 存在，5 列缺 |
| 20261017000011 | ehs_disease_cases_cols.sql | 真缺（需补） | `ehs.qa_ehs_disease_cases` 存在，6 列缺 |
| 20261017000012 | ehs_hazardous_material_cols.sql | 真缺（需补） | `ehs.qa_ehs_hazardous_materials`/`qa_ehs_msds` 存在，8 列缺 |
| 20261018000006 | ai_conversations_copilot_cols.sql | 真缺（需补） | `core.ai_conversations` 存在，`module`/`messages`/`selected_records`/`context_data` 4 列缺 |
| 20261023000009 | master_data_domain_rls.sql | 真缺（需补） | `master_data.materials`/`uoms`/`samples` 存在，RLS 未启用 |
| 20261024000001 | p2_four_tables_tenant_rls.sql | 真缺（需补） | `finance.expense_approvals`/`ehs.qa_ehs_drill_evaluations` 存在但 RLS 未启用；`communication.core_notification_templates` 已 relocated 至 `iam`/`public`（2） |
| 20261024000010 | crm_segments_tenant_rls.sql | 真缺（需补） | `crm.customer_segments`/`customer_recommendations` 存在，`tenant_id` 列缺 + RLS 未启用 |
| 20261024000012 | srm_supplier_users.sql | 真缺（需补） | `srm.supplier_users` 当前不存在；唯一删除来源 `20261105100000` 在 dev 账本**不存在（未应用）**；本迁移 `to_regclass IS NULL → CREATE TABLE`，故按真缺 |
| 20261027100000 | scenario_fix_contract_align.sql | 真缺（需补） | `portal.portal_todos` 存在，`service`/`status`/`description`/`assigned_to`/`completed_at` 等 8 列缺 |
| 20261027110000 | mes_quality_standard_values_work_reports_tenant_id.sql | 真缺（需补） | `mes.quality_standard_values`/`work_reports` 存在，RLS 未启用 |
| 20261027130000 | fix_ehs_columns_and_mdm_v55_types.sql | 真缺（需补） | `ehs.health_records` 等 11 表存在，15 列缺 |
| 20261029175000 | schema_defense_columns_portal.sql | 真缺（需补） | `portal.*` 26 表存在，27 列缺 |
| 20261029177000 | schema_defense_columns_sync.sql | 真缺（需补） | `integration.*`/`public.*` 6 表存在，96 列缺 |
| 20261030171000 | fill_wms_outbound_orders_order_date.sql | 真缺（需补） | `wms.outbound_orders` 存在，`order_date` 列缺 |
| 20261102220000 | rls_enable_biz_batch1.sql | 真缺（需补） | 21 表存在但 RLS 未启用；`lims.qa_lab_samples`/`qa_lab_tasks` 已 relocated 至 `public`（2） |
| 20261112095000 | w7_b4_srm_supplier_users_restrictive.sql | **no-op（构造性）** | 文件内 `IF to_regclass('srm.supplier_users') IS NULL THEN RAISE NOTICE ... no-op`；自述表已由 `20261105100000` 删除 |

**归总（29 条）**：`relocated` 0 条（无纯 relocated 版本）· `no-op` 2 条（已关闭）· `真缺（需补）` 27 条。

> 说明：relocated 对象并非没有，而是**都与其他缺口混在同一版本**——主要分布在 `20260725000000`(39)、`20261007000006`(107)、`20261007000009`(12)、`20260921000107`(1)、`20261024000001`(2)、`20261102220000`(2)。这些版本按「存在可补缺口」归入真缺，避免把 RLS/列缺口误当已解决。

### 12.6 真缺 27 条执行记录（2026-11-19 14:55–15:2x，仅 dev `topems`）

**备份与回滚**
- 备份：`/tmp/topems_pre_truefix_20261119145537.dump`（4.1 MB）
- sha256：`85f892de468331d1098f3b305523daf0437c829d7f64d537a3ced802b0ef70d5`
- 回滚：`pg_restore -d topems --clean --if-exists /tmp/topems_pre_truefix_20261119145537.dump`
- 执行后账本：`693 行 / success 693 / failed 0 / max 20261119000002`（与执行前一致，`20260917000001`、`20261102220000` 两处补投后回写）。

**批次与结果**

| 版本 | 处置 | 断言结果 |
|---|---|---|
| `20260725000003` | §7.1 重放 | 全清（`voucher_status.reversed` 已补） |
| `20260909000001` | §7.1 重放 | 全清（4 表 RLS 已启用） |
| `20260909000003` | §7.1 重放 | 全清 |
| `20260909110001` | §7.1 重放 | 全清 |
| `20260911000001` | §7.1 重放 | 全清 |
| `20260911000005` | §7.1 重放 | 全清 |
| `20260917000001` | **定向补齐 + 账本回写** | 全清；见下方类型漂移说明 |
| `20260920000086` | superseded 关闭 | 3 表 prod 亦无，不做 DDL |
| `20260921000107` | §7.1 重放 | 仅剩 `public.core_email_templates` relocated 残留 |
| `20261007000006` | superseded + 定向 RLS | 62 表/46 RLS 表均 relocated，无新增真缺 |
| `20261007000009` | superseded + 定向 RLS | 12 表均 relocated |
| `20261017000006` | §7.1 重放 | 全清 |
| `20261017000011` | §7.1 重放 | 全清 |
| `20261017000012` | §7.1 重放 | 全清 |
| `20261018000006` | §7.1 重放 | 全清 |
| `20261023000009` | §7.1 重放 | 全清 |
| `20261024000001` | §7.1 重放 | 仅剩 `communication.core_notification_templates` relocated 残留 |
| `20261024000010` | §7.1 重放 | 全清 |
| `20261024000012` | **暂不动** | `srm.supplier_users` 仍缺，等 `20261105100000` 账本空洞定论 |
| `20261027100000` | §7.1 重放 | 全清 |
| `20261027110000` | §7.1 重放 | 全清 |
| `20261027130000` | §7.1 重放 | 全清 |
| `20261029175000` | §7.1 重放 | 全清 |
| `20261029177000` | §7.1 重放 | 全清 |
| `20261030171000` | §7.1 重放 | 全清 |
| `20261102220000` | **定向补齐 + 账本回写** | 仅剩 `lims.qa_lab_samples`/`qa_lab_tasks` relocated（RLS 已落 public） |
| `20260725000000` | superseded 关闭 | 13 历史占位 + relocated，不整条重放 |

**类型漂移说明（`20260917000001`）**
- 迁移原文 `CREATE TABLE ... mobile.oa_announcements (tenant_id text)`，但 dev 该表早已存在且 `tenant_id` 为 **uuid**（`CREATE TABLE IF NOT EXISTS` 为 no-op）。
- 原文策略用 `tenant_id = NULLIF(current_setting('app.tenant_id',true),'')`，实际执行报 `operator does not exist: uuid = text`，整条回滚。
- 处置：dev 实际 DDL 改为 `tenant_id::text = NULLIF(current_setting('app.tenant_id',true),'')`，对 `oa_announcements`/`oa_meetings`/`oa_calendar_events`/`oa_tasks` 建/保留 `rls_tenant_isolation` 并 `ENABLE + FORCE ROW LEVEL SECURITY`；`oa_announcement_reads`（无 `tenant_id` 列）按原文语义仅 `ENABLE + FORCE`，不建策略。
- **账本与对象并非逐字一致**：账本 checksum 记录的是文件 sha384（`4b9b12f8…ed79`），实际 DDL 与原文存在上述 `::text` 差异。该差异已知、可追溯，原因是列类型漂移；后续若重放该文件仍需同样改写，建议前向补丁统一修正（`tenant_id::text`）。
- 同类做法：`20261102220000` 将 `lims.qa_lab_samples`/`qa_lab_tasks` 的 RLS 定向落到 `public` 同名表，账本按文件 sha384（`2345771f…8792`）回写。

**最终归总（93 条）**

| 状态 | 条数 |
|---|---:|
| 已关闭/已补齐 | **81** |
| ├ 空壳回归重放 | 23 |
| ├ relocated superseded 关闭 | 29 |
| ├ 真缺已补齐（含 relocated 残留） | 22 |
| ├ 真缺 superseded 关闭 | 4 |
| ├ no-op 关闭 | 2 |
| └ 原 superseded | 1 |
| 仍待处理 | **12** |
| ├ DML 待评估 | 11 |
| └ 暂不动 `20261024000012` | 1 |

### 12.7 DML 11 条只读评估（2026-11-19，未写库）

> 本轮仅只读评估：未重放、未改账本、未写业务表。依据为迁移原文 + dev 现表状态（`pg_class`/`pg_attribute`/`pg_constraint`/行数）。

**先修正一个口径**：11 条中有 **5 条实际没有任何可执行 DML**，只是注释/文档里提到 `INSERT`（被审计器按文本命中误纳入「含 DML」）。这 5 条本质是纯 DDL，重放风险与 DML 无关。

| # | 版本 | 真实 DML（目标 / 口径） | 幂等兜底 | 分档 |
|---|---|---|---|---|
| 1 | `20260917000008` | `INSERT INTO flow.core_workflows ← public.core_workflows` 全列拷贝 | `ON CONFLICT (id) DO NOTHING`；两表现均 0 行，PK=id | **可直接重放** |
| 2 | `20260918000019` | 30 组 `INSERT INTO qms/ticket/lims.X SELECT * FROM public.X` | 每组 `IF EXISTS(public 源表)` + `WHERE NOT EXISTS(目标任意行)` | **不宜重放（superseded）** |
| 3 | `20260920000080` | 无（仅注释） | 纯条件 `ALTER ... ADD COLUMN IF NOT EXISTS` | **可直接重放** |
| 4 | `20261007000018` | 无（仅注释） | `CREATE TABLE IF NOT EXISTS` | **可直接重放** |
| 5 | `20261007000020` | 无（仅注释） | `CREATE TABLE IF NOT EXISTS` + 唯一约束 | **可直接重放** |
| 6 | `20261007000021` | 无（仅注释） | `CREATE TABLE IF NOT EXISTS` | **可直接重放** |
| 7 | `20261007140000` | 6 行固定 id 种子：`public.core_users`、`mobile.mobile_users`、`mes.work_stations`、`bi.reports`、`ai.ai_models`、`qms.qa_eightd_reports` 各 1 行 | `ON CONFLICT (id) DO NOTHING`；6 表现均 0 行 | **需前置断言** |
| 8 | `20261007230000` | 无（仅注释） | `CREATE TABLE IF NOT EXISTS` | **可直接重放** |
| 9 | `20261015000062` | 8 表种子 `INSERT ... ON CONFLICT (id)/(key)` | 同文件先 `CREATE TABLE IF NOT EXISTS`（含 `mdm_asset_categories`）；PK 均在 | **可直接重放** |
| 10 | `20261021000001` | 8+8 行币种种子（NULL tenant 与 default tenant 各一份），`WHERE NOT EXISTS(tenant_id, code)` | `WHERE NOT EXISTS`；`UNIQUE(tenant_id,code)` 对 NULL 不去重，但 WHERE 兜底 | **需前置断言** |
| 11 | `20261024000015` | 15 行 FAQ 种子，`WHERE NOT EXISTS(tenant_id, module, question)` | `WHERE NOT EXISTS`；`core.ai_faqs` 现 0 行 | **可直接重放** |

**分档归总**：可直接重放 **8** · 需前置断言/改写 **2** · 不宜重放 **1**。

**第 2 档前置条件 / 最小改写**

- `20261007140000`（需前置断言）
  - 断言：`public.core_users` 中不存在 `username='test_admin'` 或 `email='smoke@test.local'` 且 `id<>'e91e2228-ab9d-4ac3-99f4-fdcd9c723f21'` 的行。原因：该表除 PK(id) 外还有 `UNIQUE(username)`、`UNIQUE(email)`，`ON CONFLICT (id)` 覆盖不到这两条。当前该表 0 行 → 满足。
  - 其余 5 张目标表只需 PK(id)，现均 0 行。

- `20261021000001`（需前置断言 / 可选改写）
  - 断言：`public.core_finance_currencies` 不存在，或存在但为空。当前**不存在** → 满足。
  - 原因：`CREATE TABLE IF NOT EXISTS` 只建 `id`，随后 `ADD COLUMN "code" VARCHAR(10) NOT NULL`；若表已有行且无 `code`，会因 NOT NULL 直接失败。
  - 最小改写：`ADD COLUMN code VARCHAR(10)`（可空）→ 回填/种子 → `ALTER COLUMN code SET NOT NULL`。

**第 3 档：`20260918000019` 为什么不宜重放**

- 30 组里 **25 组的 `public` 源表已不存在**（数据迁移完成后被清理），被 `IF EXISTS(源表)` 守卫跳过，属预期的 no-op。
- 剩 5 组源表存在，其中 **4 组目标表比源多 1 列**（`qms.qa_qms_sync_records` 14 vs 13、`ticket.core_ticket_activities` 9 vs 8、`ticket.core_ticket_comments` 9 vs 8、`ticket.core_tickets` 20 vs 19）。`INSERT INTO 目标 SELECT * FROM 源` 在解析期就要求列数一致，即使 `WHERE NOT EXISTS` 过滤掉全部行仍会报「target columns / expressions」错误。
- 第 5 组 `lims.qa_lab_tasks` 源表存在（18 列），重放会用 `CREATE TABLE ... (LIKE public.qa_lab_tasks)` 造出一个**新的 lims 重复表**，与「已 relocated 到 public」的既定处置冲突。
- 结论：该版本的数据搬运已完成，建议按 **superseded 关闭**。若确需重放，最小改写为：跳过全部 copy 块（只保留 DDL），或为每组改成显式列清单并在 `WHERE` 前加「源/目标列数相等」守卫。

**dev 现表读数（只读）**：`flow.core_workflows`/`public.core_workflows`/`public.core_users`/`mobile.mobile_users`/`mes.work_stations`/`bi.reports`/`ai.ai_models`/`qms.qa_eightd_reports`/`core.ai_faqs` 均存在且 0 行；`master_data.mdm_asset_categories` 与 `public.core_finance_currencies` 不存在（前者由 `20261015000062` 自建，后者由 `20261021000001` 自建）。

### 12.8 DML 11 条执行收尾（2026-11-19，dev）

**备份**：`/tmp/topems_pre_dmlfix_20261119150956.dump`（4.2 MB，sha256 `e1aa0ad2901de7d70641a62022e387d1b5b35b0dc3396bad70c1c55123b070bc`）；回滚方式 `pg_restore --clean --if-exists -d topems <dump>`。

**执行方式**：逐条 `DELETE FROM _sqlx_migrations WHERE version=<v> AND success` → `apply-forward.sh --db topems --apply-deferred <v> --ticket DEV-CONSISTENCY-20261119` → 断言；失败即停、不现场改写迁移文件。

| 版本 | 动作 | 断言结果 |
|---|---|---|
| `20260917000008` | 原样重放 | `flow.core_workflows.tenant_id/code`、`flow.core_workflow_tasks.priority/due_time/claimed_at` 全部就位；两流程表 0 行 |
| `20260920000080` | 原样重放 | 现存的 `public/core/rs` 流程表补 `tenant_id/code`，现存 `equipment` 表补 `equipment_no` |
| `20261007000018` | 原样重放 | `hrm.hrm_cache_invalidation_logs` RLS `t/t` + `tenant_isolation` 1 条 |
| `20261007000020` | RLS 定向补丁 | 唯一索引 `(source_type,source_id,tenant_id)` 定义核对一致；RLS `t/t` + 策略 1 条 |
| `20261007000021` | RLS 定向补丁 | 唯一索引 `(source_type,source_inspection_id)` 定义核对一致；RLS `t/t` + 策略 1 条 |
| `20261007230000` | RLS 定向补丁 | 唯一索引 `(source_type,source_hazard_id)` 定义核对一致；RLS `t/t` + 策略 1 条 |
| `20261015000062` | 原样重放 | 8 张 mdm 表 RLS `t/t` 各 1 条策略；`mdm_asset_categories` 已建 |
| `20261024000015` | 原样重放 | `core.ai_faqs` 15 条（5 个 module）；RLS `t/t` + 策略 1 条 |
| `20261007140000` | 临时默认值 + 原样重放 | 6 条种子各 1 行（core_users/mobile_users/work_stations/reports/ai_models/qa_eightd_reports）；默认值已撤除 |
| `20261021000001` | 原样重放 | 16 行（8 行 NULL tenant + 8 行 default tenant）；唯一约束 1 条 |
| `20260918000019` | superseded 关闭 | 不重放，理由见下 |

**3 条改走 RLS 定向补丁的原因**：原样重放报 `ERROR: relation "…_source_uniq" already exists`。根因是同名唯一索引已存在但为 index-only（`pg_class.relkind='i'`，未登记为约束），迁移守卫只查 `pg_constraint`，于是再次 `ADD CONSTRAINT` 撞索引名。落补丁前逐条核对 `pg_indexes` 的定义列与迁移原文一致（见上表），补丁只含 `ENABLE/FORCE ROW LEVEL SECURITY` + `tenant_isolation` 策略（谓词逐字取自原文），唯一性沿用既有索引。三条账本 checksum 按文件 sha384 回写：`578769d0…d3ab`（20）、`a2d6aae8…b78d`（21）、`64b002a0…39ed`（230000）。

**`20261007140000` 的临时补丁与撤除**：dev `ai.ai_models` 有 6 列 NOT NULL 且无默认值（`pricing` jsonb、`capabilities` jsonb、`temperature`/`top_p`/`frequency_penalty`/`presence_penalty` numeric），种子 INSERT 未提供这些列 → 首次重放 1030 行报 not-null，事务整体回滚。重放前临时 `SET DEFAULT`（`'{}'::jsonb`、`'[]'::jsonb`、0.7、1、0、0），成功后立即对 6 列 `DROP DEFAULT`；`information_schema.columns` 复核 `column_default` 全为 `<none>`，未留下迁移之外的结构偏差。

**`20260918000019` 按 superseded 关闭的理由**：①30 组中 25 组的 `public` 源表已清理，`IF EXISTS` 构造性跳过；②其余 4 组目标表比源多 1 列（`qms.qa_qms_sync_records` 14v13、`ticket.core_ticket_activities` 9v8、`ticket.core_ticket_comments` 9v8、`ticket.core_tickets` 20v19），`INSERT ... SELECT *` 解析期列数不匹配必失败；③`lims.qa_lab_tasks` 会重建重复 relocated 表。数据搬运已完成，故不重放。

**最终读数**：账本 `693 行 / success 693 / failed 0 / max 20261119000002`（未新增版本）。93 条中 92 条已处置/关闭，唯一未决为 `20261024000012`。全流程仅动 dev 库 `topems`，未 push，未连接 `topems_prod` 与 `topems_snap_*`。
