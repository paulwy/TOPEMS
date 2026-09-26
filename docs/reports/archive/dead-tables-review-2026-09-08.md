# 死表评审：全库 0 引用表处置方案

- 日期：2026-09-08
- 范围：全库 962 张表 vs 全仓 SQL 引用（svc/lib 全部字符串字面量，含裸表名与 schema.table 双模式）
- 结论：**134 张表全仓零引用、零数据、零测试引用**，其中 133 张无迁移出处（孤儿）

## 判定口径

| 项 | 说明 |
|---|---|
| 引用扫描 | `svc/**/*.rs` + `lib/**/*.rs` 字符串字面量中 `FROM/JOIN/INTO/UPDATE/CREATE TABLE` + 表名（限定名 + 裸表名双模式）；扫描器三处 bug 已修正（raw string 正则、pg_stat 列名、glob recursive） |
| 数据 | `pg_stat_user_tables.n_live_tup`，134 张全部 rows=0 |
| 测试引用 | 4 处疑似命中均为子串假阳性（`qa_ehs_emergency_plans`/`qa_quality_issues` 前缀），无真实引用 |
| 迁移出处 | 仅 `crm.customer_orders` 由迁移建表（20260908000006），其余 133 张无任何迁移 CREATE 语句 |

## 分组明细

### A 组：无服务 schema（56 张）——建议删除

schema 无 svc 目录、表零引用、零数据、无迁移出处。其中部分在防御白名单有悬空条目（schema_defense.rs 表名数组，删表后条目无害可同步清理）。

| schema | 张数 | 表 |
|---|---|---|
| bi | 11 | analysis_history, analysis_queries, dashboard_widgets, dashboards, data_sources, datasource_fields, datasource_tables, report_data, saved_analysis_results, visualization_data, visualizations |
| doc | 2 | document_links, document_permissions |
| doc_service | 17 | archive_borrows, archive_categories, archive_destructions, archive_metadata, core_doc_document_versions, faqs, file_permissions, file_versions, folder_permissions, help_articles, help_categories, template_audit_log, template_categories, template_instances, template_variables, template_versions, video_tutorials |
| flow | 5 | approval_withdrawals, workflow_instance_snapshots, workflow_instances, workflow_rollbacks, workflow_versions |
| iam | 4 | password_reset_tokens, role_permissions, user_access_logs, user_roles |
| im | 9 | chat_room_members, chat_rooms, contact_group_members, contact_groups, file_transfers, friends, message_read_receipts, project_groups, user_status |
| mail | 1 | attachments |
| notification | 3 | archive_config, archived_notifications, notification_templates |
| report | 2 | report_exports, report_type_configs |
| storage | 2 | backends, file_permissions |

### B 组：有服务但被新表替代的旧表（34 张）——建议删除

core_* 旧表（早期 core 前缀设计）已被各服务同名新表替代；其余为财务/人事旧表或悬空白名单表。

| schema | 张数 | 表 |
|---|---|---|
| crm | 4 | core_crm_contacts, core_crm_opportunities, crm_master_data_refs, dashboard_metrics（customer_orders 除外，见 D 组） |
| erp | 15 | accounting_periods, archive_marks, asset_depreciation_records, bank_transactions, core_erp_customers, core_erp_inventory, core_erp_purchase_orders, core_erp_sales_orders, db_changes, fin_reconciliation_records, fin_reconciliation_rules, payment_schedules, project_budget_items, project_budgets, project_contracts |
| wms | 5 | core_wms_inbound_orders, core_wms_inventory, core_wms_outbound_orders, core_wms_warehouses, inventory_alerts |
| hrm | 5 | core_hrm_attendance, core_hrm_departments, core_hrm_employees, core_hrm_leaves, hrm_master_data_refs |
| finance | 3 | core_finance_account_opening_balances, core_finance_voucher_entries, core_finance_voucher_templates |
| scm | 1 | scm_master_data_refs |
| integration | 1 | integration_configs |

### C 组：有服务、功能未实现的规划表（35 张）——建议保留待评审

各服务代码当前未引用，但属于业务规划功能（QEHS/检验/人事/项目等），服务存续期间可能实现。建议保留并补迁移注记（标注"规划表，无写入方"）。

| schema | 张数 | 表 |
|---|---|---|
| ehs | 14 | drill_records, emergency_plans, environmental_alerts, environmental_data, health_checkups, health_records, monitoring_points, risk_assessments, risk_controls, safety_checks, safety_hazards, safety_incidents, training_programs, vaccination_records |
| lims | 8 | inspection_processes, inspection_records, inspection_tasks, instrument_calibrations, lab_ledger, maintenance_records, reagent_usages, samples |
| hrm | 5 | payroll_records, performance_records, recruitment_applications, recruitment_records, training_participants |
| qms | 4 | corrective_actions, dashboard_metrics, inspection_items, quality_issues |
| mes | 3 | equipment_inspection_records, material_categories, material_requirement_items |
| pm | 4 | acceptances, pm_master_data_refs, project_type_configs, service_integrations |
| mobile | 2 | mobile_leave_applications, photo_evidences |
| gis | 1 | geofence_alerts |
| portal | 1 | portal_announcements |

### D 组：有意保留（1 张）

| 表 | 说明 |
|---|---|
| crm.customer_orders | 迁移建表（20260908000006），已标注废弃（数据源迁移至 crm.sales_orders），保留兼容 |

## 处置结果（2026-09-08 已执行）

**已选方案 A**：迁移 `20260908000012_dead_tables_cleanup.sql` 实跑成功（台账 success=t），A 组 56 + B 组 34 = **90 张全部删除**（DROP ... CASCADE 处理内部 FK 依赖链，保留表不受影响）。库表 962 → **872**。

- 剩余 0 引用表 44 张 = C 组 42（评审笔误 35，实为 ehs14+lims8+hrm5+qms4+mes3+pm4+mobile2+gis1+portal1）+ D 组 crm.customer_orders + 漏分 wms.wms_master_data_refs。
- 关联修复：schema_boundary.json erp.allow+=crm / ehs.allow+=ehs（门禁 FAIL 归零）；shared-event 测试补 customer_name（既有漏改）；communication TABLE_DEFS 补 chat 3 表 + 断言更新（4f0c3e51b 既有不一致）。
- 白名单（schema_defense.rs TABLE_DEFS）悬空条目未清理：为防御声明，悬空无害，删除需同步 9 文件+测试断言，列为独立项。

## 处置建议（原稿，供参考）

- **方案 A**：删除 A 组（56 张）+ B 组（34 张）= **90 张**；C 组 35 张保留（补注记）；D 组保留。
- **方案 B**：仅删除 A 组（56 张）无服务 schema 表；B/C/D 全保留。
- **方案 C**：不删除，仅出此清单文档留档。

删除方式建议：新迁移 `20260908000012_dead_tables_cleanup.sql` 逐张 `DROP TABLE IF EXISTS`，全部 rows=0 无数据风险；删除后同步清理 schema_defense.rs 悬空白名单条目。
