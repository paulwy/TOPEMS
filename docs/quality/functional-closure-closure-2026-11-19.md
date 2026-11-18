# TOPEMS 功能闭环三清单收口记录（2026-11-19）

- 口径与判定方法沿用 [functional-closure-census-2026-11-18.md](./functional-closure-census-2026-11-18.md)
- 基线：`831d60b75`（2026-11-19 02:09）之后的收口提交
- 生产库：只读元数据沿用 2026-11-18 采集（`default_transaction_read_only=on`），本轮零写入
- 代码检索已按当前 HEAD 重跑（`/tmp/topems_audit`）

## 0. 结论

| 清单 | 收口前 | 收口后 | 说明 |
|---|---:|---:|---|
| 清单 2：有 handler 无路由 | 22 | **0** | 11 条补路由、11 条删重复死代码 |
| 清单 1：有接口无写入方 | 33 | **0 条待定** | 每条均有结论：刻意禁用 10、历史残留 6、影子表 4、口径修正 2、功能半成品 11 |
| 清单 3：有表无代码引用 | 475 | **477** | 逐表登记处置，见 [table-disposition-2026-11-19.md](./table-disposition-2026-11-19.md) |

- 清单 2 已归零（`unrouted.py` 剩余候选全部为非 HTTP helper，已排除）。
- 清单 1 的 11 条「功能半成品」不是漏一条 `INSERT`：上游业务链路（计量/成本/预测/快照/轨迹/合并报表）在仓库里没有数据来源，补写入方等同新建功能，本轮只给结论与证据，不臆造写入。
- 清单 3 只登记处置，不生成 DROP 迁移。

## 1. 清单 2：22 → 0（逐条）

### 1.1 补路由（11 条）

| # | handler | 新增路由 | 落点 | commit |
|---:|---|---|---|---|
| 1 | GIS `batch_upload_positions` | `POST /api/gis/sync/positions/batch` | `svc/gis/src/embedded.rs` | `2a2724261` |
| 2 | GIS `batch_upload_evidence` | `POST /api/gis/sync/evidence/batch` | 同上 | `2a2724261` |
| 3 | GIS `download_offline_data` | `POST /api/gis/sync/offline-data` | 同上 | `2a2724261` |
| 4 | LIMS `create_calibration_record` | `POST /api/lims/calibration-records` | `svc/lims/src/main.rs` | `958f92469` |
| 5 | LIMS `get_calibration_schedule` | `GET /api/lims/calibration-schedules` | 同上 | `958f92469` |
| 6 | LIMS `get_overdue_calibrations` | `GET /api/lims/calibrations/overdue` | 同上 | `958f92469` |
| 7 | LIMS `export_report_pdf` | `GET /api/lims/reports/{id}/export-pdf` | `report::create_routes`（整模块挂载） | `958f92469` |
| 8 | unified-core `onboard_tenant` | `POST /api/core/tenant/onboard` | `svc/unified-core/src/routes/master.rs` | `db61cbce2` |
| 9 | unified-core `update_version_status` | `PUT /api/core/versions/{version}` | `svc/unified-core/src/routes/mod.rs` | `db61cbce2` |
| 10 | unified-core `get_version_statistics` | `GET /api/core/versions/statistics` | 同上 | `db61cbce2` |
| 11 | master-data `get_test_results` | `GET /api/master-data/continuity/tests` | `svc/master-data/src/modules/mod.rs` | `7cfbcee66` |

补充说明：

- LIMS `report` 模块 5 个 handler（list/get/generate/approve/export）此前整体未 merge 进 `modules::create_api_routes()`，本次整组挂载，不是只挂导出一个。
- unified-core `versioning.rs` 是完整的 API 版本配置 CRUD（写 `core_api_version_configs`），整组挂到 `/api/core/versions`；读接口用 `system:read`，写接口用 `system:write`。
- master-data `get_test_results` 查询 `mdm_bc_tests`，挂到扁平契约，与 `/mdm-v56/*` 版本组同一 handler。

### 1.2 删除重复死代码（11 条）

| # | handler | 删除依据 | commit |
|---:|---|---|---|
| 1 | finance `list_receivables_handler` | 与已路由 `operational::list_receivables`（`/receivables`）同功能 | `e863247ce` |
| 2 | finance `list_payables_handler` | 与 `operational::list_payables`（`/payables`）同功能 | `e863247ce` |
| 3 | finance `toggle_template` | 与已路由 `toggle_template_handler` 同 SQL | `e863247ce` |
| 4 | finance `toggle_generate_rule` | 与 `toggle_generation_rule_handler` 同 SQL | `e863247ce` |
| 5 | finance `create_entry` | 与 `add_template_entry_handler` 同 SQL | `e863247ce` |
| 6 | finance `update_entry` | 与 `update_template_entry_handler` 同 SQL | `e863247ce` |
| 7 | finance `delete_entry` | 与 `delete_template_entry_handler` 同 SQL | `e863247ce` |
| 8 | finance `reorder_entries` | 与 `reorder_template_entries_handler` 同 SQL | `e863247ce` |
| 9 | analytics `run_schedule` | 与已路由 `execute_schedule` 逐行相同 | `fa18ed670` |
| 10 | monitor `get_realtime_metrics` | `/metrics/realtime` 已由 `get_system_metrics` 承载 | `7d852ebf1` |
| 11 | unified-core `set_file_permission` | `routes/file.rs` 已注明删除单数别名，保留复数 `set_file_permissions` | `db61cbce2` |

## 2. 清单 1：33 条逐条结论

口径沿用普查文档：已排除 `erp.audit_logs`、`finance.finance_audit_log`（审计表）与 `portal.portal_quick_actions`（平台只读配置）。
`public.core_doc_document_versions` 已在 `3f3acd77e` 修复（`services/document.rs` 的 `append_version` 在 create/update/restore 三处调用），不再是缺口。

分类含义：

- **刻意禁用**：写接口存在但固定返回 501，代码注释明确「真表为空，写入会造假数据」。
- **历史残留**：权威表已迁移，旧表只读不写。
- **影子表**：本 schema 是同名表的副本，写入发生在其它 schema。
- **口径修正**：读引用来自鉴权/算法内部函数，不是对外读接口。
- **功能半成品**：上游业务链路未实现，读接口按设计返回空。

| # | 对象 | 读位置（文件:行，函数） | 结论 | 依据 |
|---:|---|---|---|---|
| 1 | `ai.model_usage_stats` | `svc/ai/src/handlers/model_admin_handlers.rs:718` `get_model_usage` | 功能半成品 | 无 token 计量写入；统计接口恒 0 |
| 2 | `core.core_plugin_categories` | `svc/plugin-registry/.../marketplace.rs:82` `get_marketplace_summary` | 功能半成品 | 分类字典无种子、无写入，市场分类恒空 |
| 3 | `ehs.hazard_risk_assessments` | `svc/ehs/src/modules/hazard.rs:2306` `list_risk_assessments_db` | 刻意禁用 | 写接口 501；`occupational_health.rs:483` 注释 |
| 4 | `ehs.qa_ehs_contraindications` | `svc/ehs/src/modules/occupational_health.rs:911` `list_contraindications` | 刻意禁用 | 同上（职业健康数据源未启用） |
| 5 | `ehs.qa_ehs_drill_problems` | `svc/ehs/src/modules/emergency_drill.rs:1294` `get_drill_statistics` | 刻意禁用 | 同上 |
| 6 | `ehs.qa_ehs_emergency_plan_approvals` | `svc/ehs/src/modules/emergency_plan.rs:434` `get_plan` | 刻意禁用 | 同上 |
| 7 | `ehs.qa_ehs_emergency_plan_supplies` | `svc/ehs/src/modules/emergency_plan.rs:404` `get_plan` | 刻意禁用 | 同上 |
| 8 | `ehs.qa_ehs_hazard_factors` | `svc/ehs/src/modules/occupational_disease.rs:369` `list_hazard_factors` | 刻意禁用 | 同上 |
| 9 | `ehs.qa_ehs_health_exam_plans` | `svc/ehs/src/modules/occupational_health.rs:429` `list_exam_plans` | 刻意禁用 | 同上 |
| 10 | `ehs.qa_ehs_health_exam_records` | `svc/ehs/src/modules/occupational_health.rs:654` `list_exam_records` | 刻意禁用 | 同上 |
| 11 | `ehs.qa_ehs_msds` | `svc/ehs/src/modules/hazardous_material.rs:914` `get_material_msds` | 刻意禁用 | 同上 |
| 12 | `ehs.qa_ehs_stock_records` | `svc/ehs/src/modules/hazardous_material.rs:741` `list_stock_records` | 刻意禁用 | 同上 |
| 13 | `erp.consolidation_report_lines` | `svc/erp/src/modules/consolidation/reports.rs:177` `get_report_lines` | 功能半成品 | 全仓无 `INSERT erp.consolidation_reports`，报表头都未落库 |
| 14 | `gis.track_positions` | `svc/gis/src/modules/sync.rs:355` `download_offline_data` | 功能半成品 | 无轨迹生成任务；新挂载的 offline-data 返回空轨迹 |
| 15 | `gis.track_records` | `svc/gis/src/modules/sync.rs:328` `download_offline_data` | 功能半成品 | 同上 |
| 16 | `iam.resource_permissions` | `svc/unified-core/src/modules/iam/permission_verify.rs:217` `check_user_resource_permission` | 口径修正 + 真缺口 | 非对外读接口；资源级 ACL 无授予入口，检查恒 false |
| 17 | `master_data.mdm_data_asset_categories` | `svc/master-data/src/modules/knowledge_v53.rs:1237` `jaccard_similarity` | 口径修正 + 功能半成品 | 相似度算法内部读；分类字典无种子 |
| 18 | `mes.production_costs` | `svc/mes/src/modules/analytics.rs:355` `get_energy_cost` | 功能半成品 | 成本归集未实现，能源成本恒 0 |
| 19 | `mobile.mobile_attendance` | `svc/mobile/src/modules/missing_endpoints.rs:161` `get_usage_stats` | 影子表 | 权威表 `hrm.attendance_records`（hrm 有写入） |
| 20 | `mobile.oa_announcements` | `svc/mobile/src/modules/oa.rs:1537` `list_announcements` | 影子表 | 权威表 `erp.announcements`（ERP 有写入） |
| 21 | `public.approval_records` | `svc/unified-core/src/modules/flow/instance.rs:108` `list_instances` | 历史残留 | 流程引擎写 `core_workflow_instances`，此为旧表 |
| 22 | `public.approvals` | `svc/unified-core/src/modules/flow/instance.rs:104` `list_instances` | 历史残留 | 同上 |
| 23 | `public.sys_db_changes` | `svc/erp/src/modules/db_structure.rs:350` `list_db_changes` | 历史残留 | 运维变更日志，应用无写入方 |
| 24 | `scm.demand_forecast` | `svc/scm/src/modules/mrp.rs:609` `compute_mrp` | 功能半成品 | 预测导入未实现，MRP 按 0 预测 |
| 25 | `scm.purchase_inquiries` | `svc/scm/src/modules/price_comparison.rs:756` `list_comparisons` | 历史残留 | 被 `scm.supplier_quotes` 取代 |
| 26 | `scm.purchase_inquiry_items` | `svc/scm/src/modules/price_comparison.rs:567` `get_quote` | 历史残留 | 被 `scm.price_comparison_items` 取代 |
| 27 | `scm.sales_order_items` | `svc/scm/src/modules/mrp.rs:601` `compute_mrp` | 真缺口（跨线） | ERP 销售订单只写头、无行项目，MRP 毛需求恒 0；需业务定权威表 |
| 28 | `scm.supplier_products` | `svc/scm/src/modules/mrp.rs:627` `compute_mrp` | 影子表 | 权威表 `srm.supplier_products`（SRM 有写入） |
| 29 | `scm.supplier_quote_items` | `svc/scm/src/modules/price_comparison.rs:566` `get_quote` | 历史残留 | 被 `scm.price_comparison_items` 取代 |
| 30 | `scm.sync_record_details` | `svc/scm/src/modules/sync_records.rs:490` `list_sync_details` | 影子表 | 权威表 `wms.sync_record_details`（WMS 有写入） |
| 31 | `scm.wms_replenishment_suggestion_snapshots` | `svc/scm/src/modules/supply_chain_dashboard.rs:702` `real_time_status` | 功能半成品 | 补货快照任务未实现，看板恒空 |
| 32 | `srm.bidding_suppliers` | `svc/srm/src/modules/bidding.rs:667` `list_bidding_suppliers` | 功能半成品 | 招标创建请求无供应商列表，关联表无写入 |
| 33 | `srm.contract_terms` | `svc/srm/src/modules/supplier_contract.rs:581` `get_contract_terms` | 功能半成品 | 只有 `CreateContractTermRequest` 模型，无写入 handler |

统计：刻意禁用 10、历史残留 6、影子表 4、口径修正 2（其中 1 条同时是真缺口）、功能半成品 11（含跨线真缺口 1）。合计 33。

## 3. 清单 3：477 条处置

逐表登记见 [table-disposition-2026-11-19.md](./table-disposition-2026-11-19.md)：

- 保留 131：portal 预留 111、迁移种子字典 19、外键依赖 1
- 归档候选 139：历史 schema 副本
- 删除候选 207：活跃 schema、生产 0 行、代码零引用、无种子/触发器/外键

本轮不生成 DROP 迁移、不连生产写入。

## 4. 最值得先修的三条

1. `scm.sales_order_items`：ERP 销售订单无行项目落库，MRP 毛需求恒 0（跨线，需先定权威表）。
2. `iam.resource_permissions`：资源级 ACL 无授予入口，`check_user_resource_permission` 恒 false（安全向）。
3. `public.core_doc_document_versions` 已修复，但需端到端验证 create/update/restore 三处版本快照真实落库（建议补 e2e 断言）。

## 5. 边界

- 未 push；按模块单独 commit（`2a2724261`、`958f92469`、`db61cbce2`、`7cfbcee66`、`e863247ce`、`fa18ed670`、`7d852ebf1`）。
- 未触碰 `scripts/ci/check-rls-permissions.cjs` 及门禁脚本；只同步了 OpenAPI 契约文件。
- 生产只读，未做任何写入，未动迁移窗口。
