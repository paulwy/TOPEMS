# dev 已移除影子表清单（2026-11-15 第二步）

> 背景：`docs/database/table-family-authority-recommendations-2026-11-15.md` 判定 103 个表族里 145 张 dev 侧成员为空壳影子表。
> 本步只做 **dev 侧物理删除**，prod 侧一张不动（按「标残留不删」口径）。

## 为什么需要这份清单

这 145 张由历史迁移（`20260725000000_business_base_tables.sql`、`20261007000006_rebuild_orphan_tables.sql`、`003_plugin.sql` 等）与 init 脚本创建。
**在空库重放迁移会把它们原样重建**，删表结果不可由迁移链复现。若不留登记，新建 dev/验证库会再次漂出这 145 张影子表，族判定又要重做一遍。
因此：

- 删除动作由 `scripts/db/drop-shadow-tables-step2.sh` 执行（dev 专用，幂等），**不进 `database/migrations/`**——迁移会在 prod 执行，与「prod 不删」冲突。
- 本清单是唯一权威登记；新环境重建后按本清单再执行一次脚本即可回到同一状态。
- 每批的 DDL 快照（含可重建的 `restore.sql`）在仓库外：`/Users/air/topems-db-snapshots/20261115-step2/<batch>/`，不入 git。

## 统计

- 清单总数 **145**：本轮删除 **138**，保留 **7**。
- 保留理由逐条见文末「本轮不删」。
- 执行顺序：B6 → B1 → B2 → B7 → B8 → B3 → B4 → B5 → B9 → B10（先小后大）。

## 执行记录

| 批 | 日期 | 结果 |
|---|---|---|
| B6 | 2026-11-15 | 删 7 张（保留 `public.core_guide_lessons`）；快照 `/Users/air/topems-db-snapshots/20261115-step2/B6/`；回滚演练通过（7 张全部重建，索引 29/29、策略 7/7） |

## 逐批清单

### B6 插件/核心影子族（public.core_plugin_* 等） —— 删 7 / 保留 1

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `public.core_guide_lessons` | guide_lessons | 0 | 保留（portal search_path=public,portal） |
| `public.core_plugin_categories` | plugin_categories | 0 | 已移除 |
| `public.core_plugin_instances` | plugin_instances | 0 | 已移除 |
| `public.core_plugin_permissions` | plugin_permissions | 0 | 已移除 |
| `public.core_plugin_reviews` | plugin_reviews | 0 | 已移除 |
| `public.core_plugin_versions` | plugin_versions | 0 | 已移除 |
| `public.core_plugins` | plugins | 0 | 已移除 |
| `public.core_tenant_plugins` | tenant_plugins | 0 | 已移除 |

### B1 iam 影子族 —— 删 21 / 保留 0

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `iam.core_emails` | emails | 0 | 待执行 |
| `iam.core_files` | files | 0 | 待执行 |
| `iam.core_guide_lessons` | guide_lessons | 0 | 待执行 |
| `iam.core_login_logs` | login_logs | 0 | 待执行 |
| `iam.core_migration_history` | migration_history | 0 | 待执行 |
| `iam.core_mobile_offline_records` | mobile_offline_records | 0 | 待执行 |
| `iam.core_notification_templates` | notification_templates | 0 | 待执行 |
| `iam.core_plugin_categories` | plugin_categories | 0 | 待执行 |
| `iam.core_plugin_instances` | plugin_instances | 0 | 待执行 |
| `iam.core_plugin_permissions` | plugin_permissions | 0 | 待执行 |
| `iam.core_plugin_reviews` | plugin_reviews | 0 | 待执行 |
| `iam.core_plugin_versions` | plugin_versions | 0 | 待执行 |
| `iam.core_plugins` | plugins | 0 | 待执行 |
| `iam.core_tenant_modules` | tenant_modules | 0 | 待执行 |
| `iam.core_tenant_settings` | tenant_settings | 0 | 待执行 |
| `iam.core_tenant_users` | tenant_users | 0 | 待执行 |
| `iam.core_workflow_instances` | workflow_instances | 0 | 待执行 |
| `iam.core_workflow_tasks` | workflow_tasks | 0 | 待执行 |
| `iam.core_workflows` | workflows | 0 | 待执行 |
| `iam.dynamic_data` | dynamic_data | 0 | 待执行 |
| `iam.tenant_users` | tenant_users | 0 | 待执行 |

### B2 flow 影子族 —— 删 4 / 保留 3

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `flow.core_files` | files | 0 | 待执行 |
| `flow.core_login_logs` | login_logs | 0 | 待执行 |
| `flow.core_migration_history` | migration_history | 0 | 保留（池基线 search_path=flow,public，裸名引用待证） |
| `flow.core_tenant_settings` | tenant_settings | 0 | 保留（池基线 search_path=flow,public，裸名引用待证） |
| `flow.core_tenant_usage` | tenant_usage | 0 | 保留（池基线 search_path=flow,public，裸名引用待证） |
| `flow.core_workflow_instances` | workflow_instances | 0 | 待执行 |
| `flow.core_workflow_tasks` | workflow_tasks | 0 | 待执行 |

### B7 analytics schema 影子 —— 删 12 / 保留 0

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `analytics.analytics_comparison_analyses` | analytics_comparison_analyses | 0 | 待执行 |
| `analytics.analytics_comparison_results` | analytics_comparison_results | 0 | 待执行 |
| `analytics.analytics_dashboard_shares` | analytics_dashboard_shares | 0 | 待执行 |
| `analytics.analytics_dashboard_templates` | analytics_dashboard_templates | 0 | 待执行 |
| `analytics.analytics_dashboards` | analytics_dashboards | 0 | 待执行 |
| `analytics.analytics_datasets` | analytics_datasets | 0 | 待执行 |
| `analytics.analytics_datasources` | analytics_datasources | 0 | 待执行 |
| `analytics.analytics_drilldown_history` | analytics_drilldown_history | 0 | 待执行 |
| `analytics.analytics_drilldown_paths` | analytics_drilldown_paths | 0 | 待执行 |
| `analytics.analytics_row_level_permissions` | analytics_row_level_permissions | 0 | 待执行 |
| `analytics.analytics_self_service_reports` | analytics_self_service_reports | 0 | 待执行 |
| `analytics.analytics_widgets` | analytics_widgets | 0 | 待执行 |

### B8 public analytics/report 镜像 —— 删 16 / 保留 0

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `analytics.report_subscriptions` | report_subscriptions | 0 | 待执行 |
| `bi.report_execution_records` | report_execution_records | 0 | 待执行 |
| `public.analytics_comparison_analyses` | analytics_comparison_analyses | 0 | 待执行 |
| `public.analytics_comparison_results` | analytics_comparison_results | 0 | 待执行 |
| `public.analytics_dashboard_shares` | analytics_dashboard_shares | 0 | 待执行 |
| `public.analytics_dashboard_templates` | analytics_dashboard_templates | 0 | 待执行 |
| `public.analytics_dashboards` | analytics_dashboards | 0 | 待执行 |
| `public.analytics_datasets` | analytics_datasets | 0 | 待执行 |
| `public.analytics_datasources` | analytics_datasources | 0 | 待执行 |
| `public.analytics_drilldown_history` | analytics_drilldown_history | 0 | 待执行 |
| `public.analytics_drilldown_paths` | analytics_drilldown_paths | 0 | 待执行 |
| `public.analytics_row_level_permissions` | analytics_row_level_permissions | 0 | 待执行 |
| `public.analytics_self_service_reports` | analytics_self_service_reports | 0 | 待执行 |
| `public.analytics_widgets` | analytics_widgets | 0 | 待执行 |
| `public.report_execution_records` | report_execution_records | 0 | 待执行 |
| `public.report_subscriptions` | report_subscriptions | 0 | 待执行 |

### B3 mes 影子族 —— 删 21 / 保留 1

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `mes.core_emails` | emails | 0 | 待执行 |
| `mes.core_files` | files | 0 | 待执行 |
| `mes.core_guide_lessons` | guide_lessons | 0 | 待执行 |
| `mes.core_login_logs` | login_logs | 0 | 待执行 |
| `mes.core_migration_history` | migration_history | 0 | 待执行 |
| `mes.core_mobile_offline_records` | mobile_offline_records | 0 | 待执行 |
| `mes.core_notification_templates` | notification_templates | 0 | 待执行 |
| `mes.core_plugin_categories` | plugin_categories | 0 | 待执行 |
| `mes.core_plugin_instances` | plugin_instances | 0 | 待执行 |
| `mes.core_plugin_permissions` | plugin_permissions | 0 | 待执行 |
| `mes.core_plugin_reviews` | plugin_reviews | 0 | 待执行 |
| `mes.core_plugin_versions` | plugin_versions | 0 | 待执行 |
| `mes.core_plugins` | plugins | 0 | 待执行 |
| `mes.core_subscriptions` | subscriptions | 0 | 保留（被 mes.core_billing_invoices 入向外键引用） |
| `mes.core_tenant_plugins` | tenant_plugins | 0 | 待执行 |
| `mes.core_tenant_settings` | tenant_settings | 0 | 待执行 |
| `mes.core_tenant_usage` | tenant_usage | 0 | 待执行 |
| `mes.core_tenant_users` | tenant_users | 0 | 待执行 |
| `mes.core_workflow_instances` | workflow_instances | 0 | 待执行 |
| `mes.core_workflow_tasks` | workflow_tasks | 0 | 待执行 |
| `mes.core_workflows` | workflows | 0 | 待执行 |
| `mes.dynamic_data` | dynamic_data | 0 | 待执行 |

### B4 pdm 影子族 —— 删 16 / 保留 0

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `public.pdm_bom_items` | pdm_bom_items | 0 | 待执行 |
| `public.pdm_boms` | pdm_boms | 0 | 待执行 |
| `public.pdm_configurations` | pdm_configurations | 0 | 待执行 |
| `public.pdm_document_versions` | pdm_document_versions | 0 | 待执行 |
| `public.pdm_documents` | pdm_documents | 0 | 待执行 |
| `public.pdm_master_data_refs` | pdm_master_data_refs | 0 | 待执行 |
| `public.pdm_production_batches` | pdm_production_batches | 0 | 待执行 |
| `public.pdm_production_formulas` | pdm_production_formulas | 0 | 待执行 |
| `public.pdm_production_processes` | pdm_production_processes | 0 | 待执行 |
| `public.pdm_production_steps` | pdm_production_steps | 0 | 待执行 |
| `public.pdm_project_members` | pdm_project_members | 0 | 待执行 |
| `public.pdm_project_phases` | pdm_project_phases | 0 | 待执行 |
| `public.pdm_projects` | pdm_projects | 0 | 待执行 |
| `public.pdm_versions` | pdm_versions | 0 | 待执行 |
| `public.pdm_workflow_instances` | pdm_workflow_instances | 0 | 待执行 |
| `public.pdm_workflows` | pdm_workflows | 0 | 待执行 |

### B5 qms/qa 影子族 —— 删 25 / 保留 0

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `public.qa_alert_messages` | qa_alert_messages | 0 | 待执行 |
| `public.qa_alert_rules` | qa_alert_rules | 0 | 待执行 |
| `public.qa_apqp_approvals` | qa_apqp_approvals | 0 | 待执行 |
| `public.qa_apqp_phases` | qa_apqp_phases | 0 | 待执行 |
| `public.qa_apqp_projects` | qa_apqp_projects | 0 | 待执行 |
| `public.qa_apqp_risks` | qa_apqp_risks | 0 | 待执行 |
| `public.qa_apqp_tasks` | qa_apqp_tasks | 0 | 待执行 |
| `public.qa_audit_findings` | qa_audit_findings | 0 | 待执行 |
| `public.qa_audit_plans` | qa_audit_plans | 0 | 待执行 |
| `public.qa_audit_tasks` | qa_audit_tasks | 0 | 待执行 |
| `public.qa_corrective_action_items` | qa_corrective_action_items | 0 | 待执行 |
| `public.qa_corrective_actions` | qa_corrective_actions | 0 | 待执行 |
| `public.qa_eightd_audit_logs` | qa_eightd_audit_logs | 0 | 待执行 |
| `public.qa_eightd_reports` | qa_eightd_reports | 0 | 待执行 |
| `public.qa_fmea_analyses` | qa_fmea_analyses | 0 | 待执行 |
| `public.qa_fmea_items` | qa_fmea_items | 0 | 待执行 |
| `public.qa_inspection_audits` | qa_inspection_audits | 0 | 待执行 |
| `public.qa_inspection_results` | qa_inspection_results | 0 | 待执行 |
| `public.qa_quality_costs` | qa_quality_costs | 0 | 待执行 |
| `public.qa_quality_inspections` | qa_quality_inspections | 0 | 待执行 |
| `public.qa_quality_issues` | qa_quality_issues | 0 | 待执行 |
| `public.qa_spc_charts` | qa_spc_charts | 0 | 待执行 |
| `public.qa_spc_data_points` | qa_spc_data_points | 0 | 待执行 |
| `public.qa_standard_revisions` | qa_standard_revisions | 0 | 待执行 |
| `public.qa_standards` | qa_standards | 0 | 待执行 |

### B9 mes 基础主数据 public 镜像 —— 删 3 / 保留 1

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `public.production_lines` | production_lines | 0 | 待执行 |
| `public.shifts` | shifts | 0 | 待执行 |
| `public.work_calendars` | work_calendars | 0 | 待执行 |
| `public.workshops` | workshops | 0 | 保留（被 mes.production_orders / mes.work_stations 入向外键引用） |

### B10 其他 public 影子 —— 删 13 / 保留 1

| 表 | 族 | 行数 | 状态 |
|---|---|---|---|
| `hrm.vectors` | vectors | 0 | 待执行 |
| `master_data.dynamic_data` | dynamic_data | 0 | 待执行 |
| `public.business_locations` | business_locations | 0 | 待执行 |
| `public.cqrs_snapshots` | cqrs_snapshots | 0 | 待执行 |
| `public.device_locations` | device_locations | 0 | 待执行 |
| `public.erp_master_data_refs` | erp_master_data_refs | 0 | 待执行 |
| `public.factory_maps` | factory_maps | 0 | 待执行 |
| `public.location_photos` | location_photos | 0 | 待执行 |
| `public.map_markers` | map_markers | 0 | 待执行 |
| `public.mes_qms_sync` | mes_qms_sync | 0 | 待执行 |
| `public.notification_channels` | notification_channels | 0 | 待执行 |
| `public.notification_templates` | notification_templates | 0 | 保留（来源不明（仓库内无 CREATE TABLE，仅被 RLS/资源码迁移引用）） |
| `public.pipelines` | pipelines | 0 | 待执行 |
| `public.warehouse_locations` | warehouse_locations | 0 | 待执行 |

## 本轮不删（7 张）

- **`public.core_guide_lessons`** —— portal search_path=public,portal；guide.rs 无前缀读写直接命中本表
- **`public.workshops`** —— 被 mes.production_orders / mes.work_stations 入向外键引用
- **`mes.core_subscriptions`** —— 被 mes.core_billing_invoices 入向外键引用
- **`flow.core_tenant_settings`** —— 池基线 search_path=flow,public，裸名引用待证
- **`flow.core_tenant_usage`** —— 池基线 search_path=flow,public，裸名引用待证
- **`flow.core_migration_history`** —— 池基线 search_path=flow,public，裸名引用待证
- **`public.notification_templates`** —— 来源不明（仓库内无 CREATE TABLE，仅被 RLS/资源码迁移引用）

- `public.notification_templates`：按 owner 裁决单独保留；取证结论见 `docs/database/` 提交说明——仓库内检索不到任何 `CREATE TABLE`（迁移、init、Rust `schema_defense`/`TABLE_DEFS`、脚本均无），仅被 `20261006000017_public_rls_guard_fix.sql`（DROP POLICY IF EXISTS）与 `20261015000081`（改策略）、`20261107000011_resource_crud_codes_batch24.sql`（登记 `notification:template` 的 4 个资源码）引用，判定为历史手工建表。来源查清前不碰。

## 回滚

逐批 `restore.sql` 回灌即可重建表、列、默认值、约束、索引、触发器、RLS、策略、属主、ACL、注释。
注意 `pg_dump -t` 不包含「别的表指向本表的入向外键」；本步没有删除任何批外约束，所以无需补 `ADD CONSTRAINT`。

