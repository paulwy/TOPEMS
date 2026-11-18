# TOPEMS 功能闭环性普查（只读）

- 日期：2026-11-18
- 审计基线：`git HEAD` = `7ed8d26c6`（2026-11-18 14:06:53 +0800）；工作区有未提交改动，见 §2.3
- 生产库：`topems_prod`（只读，`default_transaction_read_only=on`，仅 `SELECT` 元数据）
- 代码范围：`svc/`、`lib/`、`cli/`、`tests/`、`examples/` 的 Rust 源码 + `database/migrations/`（DDL 仅作定义，不计业务引用）
- 生产元数据：`pg_class` / `pg_stat_user_tables` / `pg_trigger` / `pg_constraint`，共 1345 张表/分区（`relkind in ('r','p')`）

> 结论先行：三张清单分别 **34 / 32 / 475** 条。整体以「功能半成品 + 跨 schema 影子表」为主，纯历史遗留集中在 `iam`/`flow`/`doc`/`analytics` 旧 schema 与 `portal` 预留表。最值得先修的三条见 §6。

## 1. 口径与判定方法

### 1.1 两侧证据

| 侧 | 证据 | 用途 |
|---|---|---|
| 代码 | 仅在 **Rust 字符串字面量内的 SQL** 中匹配表名（`FROM/JOIN` 记为读，`INSERT INTO/UPDATE/DELETE FROM/COPY/MERGE` 记为写，`CREATE/ALTER/DROP TABLE` 记为 DDL） | 避免把变量名、路由路径、注释误判为表引用 |
| 代码 | 顶层 `pub async fn` 定义 + 全仓标识符引用（屏蔽字符串字面量，避免 `TopemsError::internal("x_handler")` 误算引用） | handler 是否有定义外引用 |
| 代码 | 路由注册匹配 `get/post/put/patch/delete/any/on(...)`，含 `axum::routing::get(...)` 形式 | handler 是否注册 |
| 生产 | `pg_stat_user_tables.n_tup_ins/n_tup_upd/n_live_tup` | 历史上是否有写入、当前是否有数据 |
| 生产 | `pg_trigger`（排除 `tgisinternal`）、`pg_constraint(contype='f')` | 是否有触发器代写、外键依赖 |
| 代码 | `database/migrations/*.sql` 的 `INSERT/COPY` | 判断是否为迁移期种子字典表 |

未限定 schema 的表名按服务 `SEARCH_PATH` 解析到实际 schema（`svc/*/src/main.rs` 的 `SEARCH_PATH`；缺省按服务主 schema → `public` → `shared`）。无法归属的 `lib/`/测试引用按「可能命中所有同名 schema」保守计为已引用，避免误报零引用。

### 1.2 清单 1：有接口无写入方

纳入条件（全部满足）：

1. 生产表 `relkind='r'`，且代码中存在 **SQL 读引用**；
2. 全仓（含测试）**没有** 该表的 `INSERT/UPDATE/DELETE/COPY/MERGE`，也没有 `CREATE/ALTER TABLE`；
3. 该表 **没有用户触发器**（排除触发器代写）；
4. 迁移链中 **没有** `INSERT/COPY` 种子（排除纯只读字典表）；
5. 生产 `n_tup_ins=0` 且 `n_tup_upd=0`（排除历史写入/已停写但曾有数据）；
6. 读引用所在文件存在已注册路由的 handler（确保确有对外读接口）。

按口径排除、不计入清单 1：

| 对象 | 排除理由 |
|---|---|
| `erp.audit_logs` | 审计表（按口径排除）；3 处 SELECT，0 写入，当前审计查询恒空 |
| `finance.finance_audit_log` | 审计表（按口径排除）；1 处 SELECT，0 写入 |
| `portal.portal_quick_actions` | 平台级只读配置（迁移 20261118113000 明确「严格 B + 平台读」，5 行为平台语料） |

### 1.3 清单 2：有 handler 无路由

纳入条件（全部满足）：

1. 顶层 `pub async fn`，签名含 axum 提取器（`State/Extension/Path/Query/Json/...`）且返回 `ApiResponse/Json/.../Result`；
2. 全仓 **没有任何** `get/post/put/patch/delete/any/on(name)` 路由注册；
3. 定义处之外 **零代码引用**（字符串字面量已屏蔽，错误标签不算引用）。

排除：中间件（`from_fn` 用）、权限校验辅助函数、审计写入辅助函数、非 HTTP 签名的内部函数。

### 1.4 清单 3：有表无代码引用

纳入条件：生产 `relkind in ('r','p')`，全仓 Rust 源码 **零 SQL 引用**（读/写/DDL 均无，测试也算引用）。

排除：

- `_sqlx_migrations`、`_archive_*`（迁移账本/归档）；
- 视图/物化视图（`relkind in ('v','m')`）；
- `_sqlx_test` 测试 schema；
- `portal` schema 的 111 张已登记「预留未启用」表：不重复判定，指引至既有登记（仍在本报告 §5.5 列出对象名）。

### 1.5 置信度

- **确定**：两侧证据一致，且无动态表名/跨 schema 影子写/前端契约歧义。
- **需人工确认**：存在以下任一情况——同名表在其它 schema 有写路径（影子表）、SQL 由动态表名拼接（`format!`/配置）、仅被未注册路由的 handler 读取、历史 schema 副本、前端/契约仍引用、MDM 动态表名可能命中。

### 1.6 局限

- 静态检索覆盖不到 `format!`/配置驱动的动态表名；此类表一律降为「需人工确认」。
- `n_tup_ins` 是统计累计值，若生产执行过 `pg_stat_reset` 会归零；本报告同时给出 `n_live_tup`，两者都为 0 才判「从未写入」。
- 生产连接从 `.env` 的 `DATABASE_URL` 解析 host/user/db（不用于测试库），会话强制 `default_transaction_read_only=on`，所有查询包在 `BEGIN READ ONLY ... ROLLBACK` 中；未执行任何 `INSERT/UPDATE/DELETE/DDL`。
- 未改任何代码、未暂存、未提交、未 push；工作区唯一新增文件即本报告。

## 2. 样本校验

### 2.1 `public.core_doc_document_versions`

- 代码：`svc/unified-core/src/modules/doc/handlers.rs` 仅 3 处 `SELECT`（1102 / 1162 / 1225 行），全仓 0 处 `INSERT/UPDATE/DELETE`；
- 路由：`handlers.rs:722/726/876` 分别注册 `list_document_versions`、`get_document_version`、`restore_document_version`；
- 生产：`n_tup_ins=0`、`n_live_tup=0`、无触发器；
- 结果：命中清单 1（置信度：确定）。`restore_document_version` 的 `SELECT content ... WHERE document_id=$1 AND version=$2` 永远查不到行，接口必然返回「版本不存在」。

### 2.2 master 模块 10 个 handler + 5 张表

- 基线 `7ed8d26c6`：`svc/unified-core/src/modules/master/handlers.rs` 中审批 4、数据质量 3、对账 3 共 10 个 handler，均未出现在 `routes/master.rs` 的任何 `.route(...)`；定义外零引用；
- 生产：`public.core_master_data_refs`、`public.core_mdm_approvals`、`public.core_mdm_reconciliation_log`、`public.core_master_data_change_log`、`public.core_master_data_event_outbox` 全部 `n_tup_ins=0/n_live_tup=0`；`master_data` schema 下的同名副本命中清单 3；
- 结果：命中清单 2（10 条，置信度：确定）+ 清单 3（5 张 `master_data.*` 空副本）。

### 2.3 工作区差异（重要）

审计期间工作区存在未提交改动：`svc/unified-core/src/routes/master.rs` 已新增上述 10 条路由（`git diff` 可见，+40 行），`handlers.rs` 与 `lib/shared-db/src/reconciliation_log.rs` 亦有改动。因此：

- 本报告清单 2 以 **HEAD 基线** 为准，10 条在 HEAD 上成立；
- 若按当前工作区再跑，这 10 条会从「无路由」中消失，但这 5 张表仍 0 行、写入路径仍需端到端验证；
- 工作区另新增未跟踪测试 `svc/unified-core/tests/master_closed_loop_e2e.rs`，声明覆盖「写入 → 读回 → 状态流转 → 失败反馈」；它不在 HEAD 内，本次只读审计 **未执行** 该测试。
- 本报告未修改、未暂存、未提交这些改动。

## 3. 清单 1：有接口无写入方（34 条）

排序：确定在前。「代码位置」为读引用（文件:行，函数）。

| # | 对象 | 读接口/代码位置 | 判定依据 | 置信度 |
|---:|---|---|---|---|
| 1 | `ai.model_usage_stats` | GET /models/usage / GET /models/usage/{tail}<br>`svc/ai/src/handlers/model_admin_handlers.rs:718` `get_model_usage` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 2 | `core.core_plugin_categories` | GET /api/plugin/marketplace / GET /api/plugin/marketplace/categories<br>`svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs:82` `get_marketplace_summary` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 3 | `ehs.hazard_risk_assessments` | GET /hazards/{id}/assessments<br>`svc/ehs/src/modules/hazard.rs:2306` `list_risk_assessments_db` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 4 | `ehs.qa_ehs_contraindications` | GET /occupational-health/contraindications / GET /occupational-health/contraindications/{id}<br>`svc/ehs/src/modules/occupational_health.rs:911` `list_contraindications` | 读 3 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 5 | `ehs.qa_ehs_drill_problems` | GET /drills/statistics<br>`svc/ehs/src/modules/emergency_drill.rs:1294` `get_drill_statistics` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 6 | `ehs.qa_ehs_emergency_plan_approvals` | GET /plans/{id}<br>`svc/ehs/src/modules/emergency_plan.rs:434` `get_plan` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 7 | `ehs.qa_ehs_emergency_plan_supplies` | GET /plans/{id}<br>`svc/ehs/src/modules/emergency_plan.rs:404` `get_plan` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 8 | `ehs.qa_ehs_hazard_factors` | GET /occupational-diseases/factors / GET /occupational-diseases/factors/{id}<br>`svc/ehs/src/modules/occupational_disease.rs:369` `list_hazard_factors` | 读 4 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 9 | `ehs.qa_ehs_health_exam_plans` | GET /occupational-health/check-plans / GET /occupational-health/check-plans/{id}<br>`svc/ehs/src/modules/occupational_health.rs:429` `list_exam_plans` | 读 3 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；occupational_health.rs:483 注释确认真表为空、写接口被刻意禁用以免造假数据 | 确定 |
| 10 | `ehs.qa_ehs_health_exam_records` | GET /occupational-health/check-records / GET /occupational-health/check-records/{id}<br>`svc/ehs/src/modules/occupational_health.rs:654` `list_exam_records` | 读 5 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；occupational_health.rs:483 注释确认真表为空、写接口被刻意禁用以免造假数据 | 确定 |
| 11 | `ehs.qa_ehs_msds` | GET /hazardous-materials/{id}/msds<br>`svc/ehs/src/modules/hazardous_material.rs:914` `get_material_msds` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 12 | `ehs.qa_ehs_stock_records` | GET /hazardous-materials/movements / GET /hazardous-materials/movements/{id}<br>`svc/ehs/src/modules/hazardous_material.rs:741` `list_stock_records` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 13 | `erp.consolidation_report_lines` | GET /consolidation/reports/{reportId}/lines<br>`svc/erp/src/modules/consolidation/reports.rs:177` `get_report_lines` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 14 | `mes.production_costs` | GET /analytics/energy-cost / GET /analytics/energy-cost/{_id}<br>`svc/mes/src/modules/analytics.rs:355` `get_energy_cost` | 读 3 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 15 | `mobile.oa_announcements` | GET /announcements / GET /announcements/{id}<br>`svc/mobile/src/modules/oa.rs:1537` `list_announcements` | 读 4 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 16 | `public.approval_records` | GET /instances<br>`svc/unified-core/src/modules/flow/instance.rs:108` `list_instances` | 读 4 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 17 | `public.approvals` | GET /instances<br>`svc/unified-core/src/modules/flow/instance.rs:104` `list_instances` | 读 8 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 18 | `public.core_doc_document_versions` | GET /documents/{document_id}/versions / GET /documents/{document_id}/versions/{version}<br>`svc/unified-core/src/modules/doc/handlers.rs:1102` `list_document_versions` | 读 3 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；三处 SELECT（handlers.rs:1102/1162/1225），无 INSERT/UPDATE；路由见 handlers.rs:722/726/876 | 确定 |
| 19 | `public.sys_db_changes` | GET /db/changes<br>`svc/erp/src/modules/db_structure.rs:350` `list_db_changes` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 20 | `scm.demand_forecast` | `svc/scm/src/modules/mrp.rs:609` `compute_mrp` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；读方 compute_mrp 已注册 POST /mrp/suggestions（mrp.rs:151） | 确定 |
| 21 | `scm.purchase_inquiries` | GET /comparisons / GET /comparisons/{id}<br>`svc/scm/src/modules/price_comparison.rs:756` `list_comparisons` | 读 3 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 22 | `scm.purchase_inquiry_items` | GET /quotes/{id}<br>`svc/scm/src/modules/price_comparison.rs:567` `get_quote` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 23 | `scm.sales_order_items` | `svc/scm/src/modules/mrp.rs:601` `compute_mrp` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；读方 compute_mrp 已注册 POST /mrp/suggestions（mrp.rs:151） | 确定 |
| 24 | `scm.supplier_quote_items` | GET /quotes/{id}<br>`svc/scm/src/modules/price_comparison.rs:566` `get_quote` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 25 | `scm.wms_replenishment_suggestion_snapshots` | GET /dashboard/real-time-status<br>`svc/scm/src/modules/supply_chain_dashboard.rs:702` `real_time_status` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 26 | `srm.bidding_suppliers` | GET /biddings/{id}/suppliers<br>`svc/srm/src/modules/bidding.rs:667` `list_bidding_suppliers` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 27 | `srm.contract_terms` | GET /supplier-contracts/{id}/terms<br>`svc/srm/src/modules/supplier_contract.rs:581` `get_contract_terms` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器 | 确定 |
| 28 | `iam.resource_permissions` | `svc/unified-core/src/modules/iam/permission_verify.rs:217` `check_user_resource_permission` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；权限校验内部读（permission_verify.rs:217），非独立只读端点；空表导致资源级校验恒 false | 需人工确认 |
| 29 | `master_data.mdm_data_asset_categories` | `svc/master-data/src/modules/knowledge_v53.rs:1237` `jaccard_similarity` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；仅被 jaccard_similarity 辅助函数读取，未找到对外端点 | 需人工确认 |
| 30 | `mobile.mobile_attendance` | GET /analytics/usage<br>`svc/mobile/src/modules/missing_endpoints.rs:161` `get_usage_stats` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；仅在 get_usage_stats 的 COUNT 子查询中出现；同名 handler 与 finance 冲突，需人工确认接口归属 | 需人工确认 |
| 31 | `public.alerts` | `svc/monitor/src/modules/monitor/metrics.rs:488` `get_realtime_metrics` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；唯一读方 get_realtime_metrics 本身未注册路由（见清单 2），实际无对外接口 | 需人工确认 |
| 32 | `scm.materials` | `svc/scm/src/modules/mrp.rs:598` `compute_mrp` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；同名写路径在 master_data.materials / erp.materials；scm.materials 是空影子表，MRP 读取空主数据 | 需人工确认 |
| 33 | `scm.supplier_products` | `svc/scm/src/modules/mrp.rs:626` `compute_mrp` | 读 1 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；同名写路径在 srm.supplier_products；属跨 schema 影子表 | 需人工确认 |
| 34 | `scm.sync_record_details` | GET /sync-records/{id}/details<br>`svc/scm/src/modules/sync_records.rs:490` `list_sync_details` | 读 2 处、写 0；`n_tup_ins=0`、`n_live_tup=0`；无触发器；同名写路径在 wms.sync_record_details；属跨 schema 影子表 | 需人工确认 |

## 4. 清单 2：有 handler 无路由（32 条）

`HEAD` 基线下，这些函数满足「handler 签名 + 无路由注册 + 定义外零引用」。

| # | handler | 代码位置 | 判定依据 | 置信度 |
|---:|---|---|---|---|
| 1 | `run_schedule` | `svc/analytics/src/modules/report/schedule.rs:587` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 2 | `list_receivables_handler` | `svc/finance/src/modules/mod.rs:3548` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 3 | `list_payables_handler` | `svc/finance/src/modules/mod.rs:3753` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 4 | `toggle_template` | `svc/finance/src/modules/voucher_template.rs:127` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 5 | `toggle_generate_rule` | `svc/finance/src/modules/voucher_template.rs:408` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 6 | `create_entry` | `svc/finance/src/modules/voucher_template_entries.rs:119` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 7 | `update_entry` | `svc/finance/src/modules/voucher_template_entries.rs:196` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 8 | `delete_entry` | `svc/finance/src/modules/voucher_template_entries.rs:270` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 9 | `reorder_entries` | `svc/finance/src/modules/voucher_template_entries.rs:315` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 10 | `batch_upload_positions` | `svc/gis/src/modules/sync.rs:130` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 11 | `batch_upload_evidence` | `svc/gis/src/modules/sync.rs:188` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 12 | `download_offline_data` | `svc/gis/src/modules/sync.rs:289` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 13 | `create_calibration_record` | `svc/lims/src/modules/instrument.rs:697` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 14 | `get_calibration_schedule` | `svc/lims/src/modules/instrument.rs:816` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 15 | `get_overdue_calibrations` | `svc/lims/src/modules/instrument.rs:901` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 16 | `export_report_pdf` | `svc/lims/src/modules/report.rs:477` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 17 | `get_test_results` | `svc/master-data/src/modules/disaster_v56.rs:1669` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 18 | `get_realtime_metrics` | `svc/monitor/src/modules/monitor/metrics.rs:440` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 19 | `update_version_status` | `svc/unified-core/src/middleware/versioning.rs:603` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 20 | `get_version_statistics` | `svc/unified-core/src/middleware/versioning.rs:674` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 21 | `set_file_permission` | `svc/unified-core/src/modules/file/manage.rs:1146` | 无任何 `.route` 注册，定义外零引用 | 确定 |
| 22 | `get_quality_report_handler` | `svc/unified-core/src/modules/master/handlers.rs:1204` | master 审批/质量/对账 | 确定 |
| 23 | `list_duplicates_handler` | `svc/unified-core/src/modules/master/handlers.rs:1220` | master 审批/质量/对账 | 确定 |
| 24 | `list_stale_handler` | `svc/unified-core/src/modules/master/handlers.rs:1234` | master 审批/质量/对账 | 确定 |
| 25 | `run_reconciliation_handler` | `svc/unified-core/src/modules/master/handlers.rs:1252` | master 审批/质量/对账 | 确定 |
| 26 | `list_reconciliation_logs_handler` | `svc/unified-core/src/modules/master/handlers.rs:1266` | master 审批/质量/对账 | 确定 |
| 27 | `resolve_reconciliation_issue_handler` | `svc/unified-core/src/modules/master/handlers.rs:1286` | master 审批/质量/对账 | 确定 |
| 28 | `create_approval_handler` | `svc/unified-core/src/modules/master/handlers.rs:1329` | master 审批/质量/对账 | 确定 |
| 29 | `review_approval_handler` | `svc/unified-core/src/modules/master/handlers.rs:1367` | master 审批/质量/对账 | 确定 |
| 30 | `list_pending_approvals_handler` | `svc/unified-core/src/modules/master/handlers.rs:1416` | master 审批/质量/对账 | 确定 |
| 31 | `list_approval_history_handler` | `svc/unified-core/src/modules/master/handlers.rs:1447` | master 审批/质量/对账 | 确定 |
| 32 | `onboard_tenant` | `svc/unified-core/src/modules/tenant/handlers.rs:562` | 无任何 `.route` 注册，定义外零引用 | 确定 |

## 5. 清单 3：有表无代码引用（475 条）

### 5.1 汇总

| 分组 | 数量 | 说明 |
|---|---:|---|
| 活跃 schema（需处置） | 224 | 含 public 影子表、服务自有空表 |
| 历史 schema（旧架构副本） | 140 | iam/flow/doc/analytics 等 |
| portal 预留（已登记） | 111 | 见 portal-reserved-tables-register-2026-11-14.md |
| 合计 | 475 | 全部 `n_tup_ins=0`、`n_live_tup=0` |

按 schema：

| schema | 数量 | schema | 数量 |
|---|---:|---|---:|
| `public` | 134 | `shared` | 1 |
| `ehs` | 21 | `mobile` | 1 |
| `lims` | 10 | `iam` | 64 |
| `master_data` | 10 | `flow` | 32 |
| `qms` | 8 | `doc` | 4 |
| `finance` | 5 | `doc_service` | 7 |
| `mes` | 5 | `analytics` | 17 |
| `hrm` | 6 | `plugin_finance` | 6 |
| `pm` | 4 | `plugin_erp` | 1 |
| `wms` | 3 | `plugin_mes` | 1 |
| `tms` | 2 | `plugin_wms` | 1 |
| `rs` | 3 | `mail` | 2 |
| `gis` | 3 | `notification` | 1 |
| `erp` | 3 | `report` | 1 |
| `bi` | 2 | `storage` | 1 |
| `crm` | 1 | `unified_core` | 1 |
| `core` | 1 | `communication` | 1 |
| `scm` | 1 | `portal` | 111 |

### 5.2 活跃 schema 明细

| # | 对象 | 代码位置 | 行数(ins/live) | 判定依据 | 置信度 |
|---:|---|---|---:|---|---|
| 1 | `public.alert_rules` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 2 | `public.analytics_sync_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 3 | `public.announcements` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/api/erp-admin.spec.ts） | 需人工确认 |
| 4 | `public.conversion_executions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 5 | `public.conversion_rules` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 6 | `public.core_faqs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 7 | `public.core_file_folders` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 8 | `public.core_finance_account_opening_balances` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 9 | `public.core_finance_accounts` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/c2-form-submit-ext.spec.ts） | 需人工确认 |
| 10 | `public.core_finance_approval_workflows` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 11 | `public.core_finance_aux_accounts` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 12 | `public.core_finance_aux_balances` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 13 | `public.core_finance_ledger` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 14 | `public.core_finance_periods` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 15 | `public.core_finance_reconciliation_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 16 | `public.core_finance_reconciliation_sessions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 17 | `public.core_finance_voucher_entries` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 18 | `public.core_finance_voucher_lines` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 19 | `public.core_finance_voucher_templates` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 20 | `public.core_finance_vouchers` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 21 | `public.core_guide_lessons` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 22 | `public.core_guide_progress` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 23 | `public.core_guides` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 24 | `public.core_inter_module_sync` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 25 | `public.core_master_data_event_outbox` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 26 | `public.core_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 27 | `public.core_mdm_reconciliation_log` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 28 | `public.core_plugin_categories` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 29 | `public.core_plugin_instances` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 30 | `public.core_plugin_navigation` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 31 | `public.core_plugin_permissions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 32 | `public.core_plugin_reviews` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 33 | `public.core_plugin_versions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 34 | `public.core_plugins` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 35 | `public.core_tenant_plugins` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 36 | `public.core_ticket_activities` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 37 | `public.core_ticket_comments` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 38 | `public.core_ticket_sla_escalations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 39 | `public.core_ticket_sla_policies` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 40 | `public.core_tickets` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 41 | `public.core_users` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 42 | `public.cqrs_events` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 43 | `public.crm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 44 | `public.ehs_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 45 | `public.equipment` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/mes-equipment.spec.ts） | 需人工确认 |
| 46 | `public.equipment_inspections` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 47 | `public.equipment_maintenance_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 48 | `public.finance_voucher_templates` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 49 | `public.financial_reports` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 50 | `public.hrm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 51 | `public.lims_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 52 | `public.material_boms` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 53 | `public.material_categories` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 54 | `public.material_issue_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 55 | `public.material_issues` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 56 | `public.material_requirement_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 57 | `public.material_requirements` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 58 | `public.material_return_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 59 | `public.material_returns` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 60 | `public.meeting_bookings` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 61 | `public.meeting_rooms` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 62 | `public.navigation_menu` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 63 | `public.pdm_change_notices` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 64 | `public.pdm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 65 | `public.pdm_materials` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 66 | `public.pdm_products` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 67 | `public.pinned_apps` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 68 | `public.pm_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 69 | `public.process_flow_steps` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 70 | `public.process_flows` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 71 | `public.qa_ehs_accident_investigations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 72 | `public.qa_ehs_accident_reviews` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 73 | `public.qa_ehs_accident_treatments` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 74 | `public.qa_ehs_accidents` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 75 | `public.qa_ehs_compliance_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 76 | `public.qa_ehs_contraindications` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 77 | `public.qa_ehs_detection_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 78 | `public.qa_ehs_emergency_plans` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 79 | `public.qa_ehs_environment` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 80 | `public.qa_ehs_hazard_rectifications` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 81 | `public.qa_ehs_hazard_verifications` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 82 | `public.qa_ehs_hazardous_materials` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 83 | `public.qa_ehs_hazards` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 84 | `public.qa_ehs_health_abnormalities` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 85 | `public.qa_ehs_health_exam_plans` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 86 | `public.qa_ehs_health_exam_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 87 | `public.qa_ehs_health_trainings` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 88 | `public.qa_ehs_inspection_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 89 | `public.qa_ehs_inspection_plans` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 90 | `public.qa_ehs_material_stocks` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 91 | `public.qa_ehs_protection_measures` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 92 | `public.qa_ehs_risks` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 93 | `public.qa_ehs_stock_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 94 | `public.qa_ehs_sync_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 95 | `public.qa_ehs_trainings` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 96 | `public.qa_lab_calibration_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 97 | `public.qa_lab_reagent_alerts` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 98 | `public.qa_lab_reagent_history` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 99 | `public.qa_lab_reagents` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 100 | `public.qa_lims_audit_logs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 101 | `public.qa_lims_barcode_scan_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 102 | `public.qa_lims_collection_tasks` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 103 | `public.qa_lims_instrument_data` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 104 | `public.qa_lims_method_categories` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 105 | `public.qa_lims_method_validations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 106 | `public.qa_lims_method_versions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 107 | `public.qa_lims_parse_rules` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 108 | `public.qa_lims_pt_corrective_actions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 109 | `public.qa_lims_pt_evaluations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 110 | `public.qa_lims_pt_plans` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 111 | `public.qa_lims_pt_results` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 112 | `public.qa_lims_pt_samples` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 113 | `public.qa_lims_rfid_tags` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 114 | `public.qa_lims_sample_barcodes` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 115 | `public.qa_lims_sync_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 116 | `public.qa_lims_test_methods` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 117 | `public.qa_lims_uncertainty_components` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 118 | `public.qa_lims_uncertainty_projects` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 119 | `public.qa_lims_uncertainty_sources` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 120 | `public.qa_qms_sync_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 121 | `public.quality_inspections` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 122 | `public.quality_patrol_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 123 | `public.quality_patrols` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 124 | `public.quality_standard_values` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 125 | `public.quality_standards` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/i18n/locales/zh/qms.json） | 需人工确认 |
| 126 | `public.refresh_tokens` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 127 | `public.tenants` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/components/TenantSwitcher/TenantSwitcher.tsx） | 需人工确认 |
| 128 | `public.ticket_automation_rules` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 129 | `public.ticket_knowledge_articles` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 130 | `public.todos` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/lib/reactQuery.ts） | 需人工确认 |
| 131 | `public.user_settings` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 132 | `public.vehicle_requests` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/module-configs/oa/config.ts） | 需人工确认 |
| 133 | `public.vehicles` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/tms-shipment.spec.ts） | 需人工确认 |
| 134 | `public.wms_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 135 | `ehs.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 136 | `ehs.drill_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 137 | `ehs.emergency_plans` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 138 | `ehs.environmental_alerts` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 139 | `ehs.environmental_data` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 140 | `ehs.health_checkups` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 141 | `ehs.monitoring_points` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 142 | `ehs.qa_ehs_accident_investigations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 143 | `ehs.qa_ehs_accident_reviews` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 144 | `ehs.qa_ehs_accident_treatments` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 145 | `ehs.qa_ehs_compliance_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 146 | `ehs.qa_ehs_detection_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 147 | `ehs.qa_ehs_environment` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 148 | `ehs.qa_ehs_health_abnormalities` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 149 | `ehs.qa_ehs_health_trainings` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 150 | `ehs.qa_ehs_material_stocks` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 151 | `ehs.qa_ehs_protection_measures` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 152 | `ehs.risk_assessments` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 153 | `ehs.risk_controls` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 154 | `ehs.safety_incidents` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 155 | `ehs.vaccination_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 156 | `lims.ai_analyses` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 157 | `lims.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 158 | `lims.document_relations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 159 | `lims.lab_ledger` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 160 | `lims.qa_lab_inspection_reports` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 161 | `lims.qa_lab_reagent_alerts` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 162 | `lims.qa_lab_reagent_history` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 163 | `lims.qa_lab_sample_lifecycle` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 164 | `lims.reagent_usages` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 165 | `lims.reagents` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/schemas/lims/reagent.ts） | 需人工确认 |
| 166 | `master_data.core_master_data_change_log` | 无（零 SQL 引用） | 0/0 | MDM 权威表在 public；本表为 0 行副本，仅动态表名可能命中 | 需人工确认 |
| 167 | `master_data.core_master_data_event_outbox` | 无（零 SQL 引用） | 0/0 | MDM 权威表在 public；本表为 0 行副本，仅动态表名可能命中 | 需人工确认 |
| 168 | `master_data.core_master_data_refs` | 无（零 SQL 引用） | 0/0 | MDM 权威表在 public；本表为 0 行副本，仅动态表名可能命中 | 需人工确认 |
| 169 | `master_data.core_mdm_approvals` | 无（零 SQL 引用） | 0/0 | MDM 权威表在 public；本表为 0 行副本，仅动态表名可能命中 | 需人工确认 |
| 170 | `master_data.core_mdm_reconciliation_log` | 无（零 SQL 引用） | 0/0 | MDM 权威表在 public；本表为 0 行副本，仅动态表名可能命中 | 需人工确认 |
| 171 | `master_data.dynamic_data` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 172 | `master_data.mdm_critical_functions` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 173 | `master_data.mdm_fix_strategies` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 174 | `master_data.mdm_quality_loop_configs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 175 | `master_data.schema_registry` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/module-configs/master/config.ts） | 需人工确认 |
| 176 | `qms.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 177 | `qms.corrective_actions` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/pm/quality.ts） | 需人工确认 |
| 178 | `qms.dashboard_metrics` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 179 | `qms.inspection_items` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/scm/types.ts） | 需人工确认 |
| 180 | `qms.qa_ehs_hazards` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 181 | `qms.quality_inspections` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 182 | `qms.quality_issues` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 183 | `qms.quality_standards` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/i18n/locales/zh/qms.json） | 需人工确认 |
| 184 | `finance.accounting_subjects` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/c2-form-submit-ext.spec.ts） | 需人工确认 |
| 185 | `finance.core_finance_approval_workflows` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 186 | `finance.core_finance_currencies` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 187 | `finance.reconciliation_orders` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 188 | `finance.settlement_center_dashboards` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 189 | `mes.dashboard_stats` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 190 | `mes.financial_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 191 | `mes.material_requirement_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 192 | `mes.supply_chain_orders` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 193 | `mes.tenant_backfill_quarantine` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 194 | `hrm.hrm_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 195 | `hrm.payroll_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 196 | `hrm.performance_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 197 | `hrm.recruitment_applications` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 198 | `hrm.recruitment_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 199 | `hrm.training_participants` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 200 | `pm.acceptances` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 201 | `pm.documents` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/api/pdm-product.spec.ts） | 需人工确认 |
| 202 | `pm.pm_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 203 | `pm.service_integrations` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 204 | `wms.transfer_items` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 205 | `wms.transfers` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/module-configs/asset/config.ts） | 需人工确认 |
| 206 | `wms.wms_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 207 | `tms.carriers` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/module-configs/tms/config.ts） | 需人工确认 |
| 208 | `tms.drivers` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/module-configs/tms/config.ts） | 需人工确认 |
| 209 | `rs.equipment` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/mes-equipment.spec.ts） | 需人工确认 |
| 210 | `rs.equipment_inspections` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 211 | `rs.equipment_maintenance_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 212 | `gis.audit_log` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/schemas/monitor/auditLog.tsx） | 需人工确认 |
| 213 | `gis.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 214 | `gis.geofence_alerts` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 215 | `erp.expenses` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/erp-cost.spec.ts） | 需人工确认 |
| 216 | `erp.voucher_items` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/i18n/locales/zh/erp.json） | 需人工确认 |
| 217 | `erp.vouchers` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/e2e/ui/finance-voucher.spec.ts） | 需人工确认 |
| 218 | `bi.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 219 | `bi.report_execution_records` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 220 | `crm.crm_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 221 | `core.core_tenant_plugins` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 222 | `scm.scm_master_data_refs` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |
| 223 | `shared.audit_logs` | 无（零 SQL 引用） | 0/0 | 前端/契约仍引用（apps/web/src/api/lims/audit.ts） | 需人工确认 |
| 224 | `mobile.mobile_leave_applications` | 无（零 SQL 引用） | 0/0 | 全仓零引用，生产 0 行 | 确定 |

### 5.3 历史 schema 明细

这些 schema 来自旧架构（`iam`/`flow`/`doc`/`doc_service`/`analytics`/`unified_core` 等），生产仍有表但现行代码不再读写，均为 0 行。

| # | 对象 | 代码位置 | 行数(ins/live) | 判定依据 | 置信度 |
|---:|---|---|---:|---|---|
| 1 | `iam.audit_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 2 | `iam.auth_sessions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 3 | `iam.core_billing_invoices` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 4 | `iam.core_billing_plans` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 5 | `iam.core_chat_members` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 6 | `iam.core_chat_messages` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 7 | `iam.core_chat_rooms` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 8 | `iam.core_dashboard_refresh_log` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 9 | `iam.core_dict_items` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 10 | `iam.core_dict_types` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 11 | `iam.core_email_queue` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 12 | `iam.core_email_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 13 | `iam.core_emails` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 14 | `iam.core_faqs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 15 | `iam.core_file_folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 16 | `iam.core_files` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 17 | `iam.core_guide_lessons` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 18 | `iam.core_guide_progress` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 19 | `iam.core_guides` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 20 | `iam.core_inter_module_sync` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 21 | `iam.core_login_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 22 | `iam.core_menu_groups` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 23 | `iam.core_menus` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 24 | `iam.core_migration_history` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 25 | `iam.core_mobile_offline_records` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 26 | `iam.core_notification_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 27 | `iam.core_notifications` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 28 | `iam.core_plugin_categories` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 29 | `iam.core_plugin_instances` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 30 | `iam.core_plugin_permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 31 | `iam.core_plugin_pricing` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 32 | `iam.core_plugin_reviews` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 33 | `iam.core_plugin_versions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 34 | `iam.core_plugins` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 35 | `iam.core_subscriptions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 36 | `iam.core_tenant_modules` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 37 | `iam.core_tenant_settings` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 38 | `iam.core_tenant_usage` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 39 | `iam.core_tenant_users` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 40 | `iam.core_tenants` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 41 | `iam.core_usage_records` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 42 | `iam.core_users` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 43 | `iam.core_workflow_instances` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 44 | `iam.core_workflow_tasks` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 45 | `iam.core_workflows` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 46 | `iam.crm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 47 | `iam.data_permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 48 | `iam.dynamic_data` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 49 | `iam.ehs_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 50 | `iam.hrm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 51 | `iam.lims_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 52 | `iam.password_reset_tokens` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 53 | `iam.pdm_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 54 | `iam.permission_audit_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 55 | `iam.permission_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 56 | `iam.permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 57 | `iam.refresh_tokens` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 58 | `iam.schema_registry` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 59 | `iam.sessions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 60 | `iam.tenant_permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 61 | `iam.tenant_users` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 62 | `iam.user_access_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 63 | `iam.user_roles` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 64 | `iam.wms_dashboard_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 65 | `flow.approval_records` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 66 | `flow.approvals` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 67 | `flow.audit_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 68 | `flow.core_doc_document_versions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 69 | `flow.core_doc_documents` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 70 | `flow.core_doc_folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 71 | `flow.core_doc_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 72 | `flow.core_file_folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 73 | `flow.core_file_permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 74 | `flow.core_files` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 75 | `flow.core_flow_categories` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 76 | `flow.core_flow_delegates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 77 | `flow.core_flow_rules` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 78 | `flow.core_flow_variable_history` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 79 | `flow.core_flow_variables` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 80 | `flow.core_master_data_change_log` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 81 | `flow.core_master_data_refs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 82 | `flow.core_mdm_approvals` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 83 | `flow.core_mdm_reconciliation_log` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 84 | `flow.core_migration_history` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 85 | `flow.core_operation_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 86 | `flow.core_tenant_modules` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 87 | `flow.core_tenant_settings` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 88 | `flow.core_tenant_usage` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 89 | `flow.core_tenant_users` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 90 | `flow.core_tenants` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 91 | `flow.core_workflow_instances` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 92 | `flow.core_workflow_tasks` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 93 | `flow.core_workflow_versions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 94 | `flow.core_workflows` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 95 | `flow.notifications` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 96 | `flow.workflows` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 97 | `doc.document_versions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 98 | `doc.documents` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 99 | `doc.folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 100 | `doc.templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 101 | `doc_service.archives` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 102 | `doc_service.core_doc_documents` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 103 | `doc_service.core_doc_folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 104 | `doc_service.core_doc_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 105 | `doc_service.files` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 106 | `doc_service.folders` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 107 | `doc_service.templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 108 | `analytics.analytics_comparison_analyses` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 109 | `analytics.analytics_comparison_results` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 110 | `analytics.analytics_dashboard_shares` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 111 | `analytics.analytics_dashboard_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 112 | `analytics.analytics_dashboards` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 113 | `analytics.analytics_datasets` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 114 | `analytics.analytics_datasources` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 115 | `analytics.analytics_drilldown_history` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 116 | `analytics.analytics_drilldown_paths` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 117 | `analytics.analytics_row_level_permissions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 118 | `analytics.analytics_self_service_reports` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 119 | `analytics.analytics_sync_records` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 120 | `analytics.analytics_widgets` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 121 | `analytics.report_schedules` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 122 | `analytics.report_subscriptions` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 123 | `analytics.report_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 124 | `analytics.reports` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 125 | `plugin_finance.difference_adjustments` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 126 | `plugin_finance.reconciliation_item_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 127 | `plugin_finance.reconciliation_settlement_links` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 128 | `plugin_finance.reconciliation_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 129 | `plugin_finance.settlement_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 130 | `plugin_finance.source_amount_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 131 | `plugin_erp.accounting_subjects` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 132 | `plugin_mes.audit_logs` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 133 | `plugin_wms.purchase_order_snapshots` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 134 | `mail.emails` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 135 | `mail.templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 136 | `notification.notifications` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 137 | `report.reports` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 138 | `storage.files` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 139 | `unified_core.documents` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |
| 140 | `communication.core_email_templates` | 无（零 SQL 引用） | 0/0 | 历史 schema 副本 | 需人工确认 |

### 5.4 重点：public 影子表

`public` 下 134 张零引用表中，有 46 张与其它 schema 的表同名（`core_finance_*`、`core_doc_*`、`core_flow_*`、`approvals`、`audit_logs` 等），典型形态是「旧单体留下的空壳副本」。它们不是简单的死表：当服务 `search_path` 回退到 `public`、或服务 schema 无同名表时，未限定 schema 的 SQL 会命中这些空副本而不是权威表，属于**功能性风险**，不能直接按历史遗留删除。建议先做同名表归属登记，再决定「删副本 / 建视图指向权威表」。

### 5.5 portal 预留表（111 张，列出对象名，不重复判定）

既有登记：`docs/quality/portal-reserved-tables-register-2026-11-14.md`（115 张，含 3 张有 `tenant_id` 的表）。本报告命中的 111 张均为 0 行、零静态 SQL 引用，处置口径沿用「登记、不删」。

上列 111 个对象适用同一判定：代码位置 = 无（零 SQL 引用）；判定依据 = 0 行 + 无静态 SQL + 已登记预留；置信度 = 需人工确认。

`core_guide_progress`、`federation_compensation_logs`、`federation_execution_logs`、`federation_query_plans`、`federation_subgraphs`、`federation_transaction_steps`、`federation_transactions`、`gateway_degradation_policies`、`gateway_health_metrics`、`gateway_protocols`、`gateway_routes`、`graphql_breaking_changes`、`graphql_execution_metrics`、`graphql_execution_profiles`、`graphql_optimization_history`、`graphql_schema_versions`、`graphql_stream_events`、`graphql_stream_subscribers`、`graphql_streams`、`graphql_suggestions`、`graphql_version_negotiations`、`intelligent_gw_affinities`、`intelligent_gw_conflicts`、`intelligent_gw_routing_table`、`intelligent_gw_stitch_logs`、`intelligent_gw_stitch_plans`、`portal_accel_configs`、`portal_acceleration_configs`、`portal_acceleration_results`、`portal_access_decisions`、`portal_access_policies`、`portal_aggregation_configs`、`portal_aggregation_results`、`portal_alert_thresholds`、`portal_announcements`、`portal_anomalies`、`portal_api_versions`、`portal_audit_entries`、`portal_audit_exports`、`portal_auth_policies`、`portal_backpressure_configs`、`portal_backpressure_states`、`portal_cache_entries`、`portal_cache_policies`、`portal_cache_versions`、`portal_canary_configs`、`portal_canary_results`、`portal_compatibility_policies`、`portal_compatibility_reports`、`portal_compilation_rules`、`portal_compiled_queries`、`portal_config_diffs`、`portal_config_environments`、`portal_consistency_checks`、`portal_dead_letter_queue`、`portal_dedup_results`、`portal_dedup_rules`、`portal_deployment_steps`、`portal_deployments`、`portal_detection_models`、`portal_distributed_queries`、`portal_edge_cache`、`portal_edge_deployments`、`portal_edge_entries`、`portal_edge_functions`、`portal_edge_replication`、`portal_execution_plans`、`portal_execution_steps`、`portal_federated_identities`、`portal_gateway_configs`、`portal_healing_actions`、`portal_health_checks`、`portal_identity_policies`、`portal_invalidation_events`、`portal_latency_stats`、`portal_masking_rules`、`portal_metrics`、`portal_orchestration_plans`、`portal_persisted_queries`、`portal_persisted_query_versions`、`portal_plan_steps`、`portal_push_stats`、`portal_queue_configs`、`portal_queue_messages`、`portal_recovery_plans`、`portal_replay_requests`、`portal_replay_results`、`portal_resolver_timings`、`portal_rollback_actions`、`portal_rollback_policies`、`portal_route_rules`、`portal_routing_decisions`、`portal_routing_rules`、`portal_security_events`、`portal_security_incidents`、`portal_security_policies`、`portal_service_descriptors`、`portal_service_heartbeats`、`portal_service_loads`、`portal_stream_events`、`portal_streams`、`portal_sub_queries`、`portal_subscribers`、`portal_subscription_channels`、`portal_subscription_events`、`portal_subscription_records`、`portal_traces`、`portal_trust_decisions`、`portal_version_mappings`、`portal_version_vectors`、`user_preferences`

## 6. 结论与优先修复

### 6.1 半成品还是历史遗留

**以「功能半成品 + 影子表」为主，历史遗留次之。**

- 清单 1 的 34 条中，EHS 职业健康/危化品 10 张（其中体检计划/记录在 occupational_health.rs:483 明确注释「真表当前空表，写接口假装成功会制造假数据」）、SCM MRP/比价 9 张、`iam.resource_permissions`、`public.sys_db_changes`、`mes.production_costs` 等都有完整读接口，但没有任何写入方——典型「先做查询页、没做写入链路」的半成品。
- 清单 2 的 32 条是「代码写了、路由没接」：master 10 条已在工作区补路由；finance 凭证模板/分录 6 条、应收应付 2 条、GIS 离线同步 3 条、LIMS 仪器校准/报告 4 条仍是纯死代码。
- 清单 3 的 475 条中，140 条在 `iam`/`flow`/`doc`/`analytics` 旧 schema，111 条是 `portal` 已登记预留，这两类属历史遗留；`public` 的 134 张零引用表中有 46 张是跨 schema 同名空副本，属「历史遗留 + 影子表风险」的混合体。

### 6.2 最值得先修的三条

1. **SCM MRP 读到影子表 `scm.materials`**（`svc/scm/src/modules/mrp.rs:598`）。物料主数据实际写在 `master_data.materials`（`svc/master-data/src/modules/master_data.rs:277`），`scm.materials` 是 0 行空表；`compute_mrp` 的物料/在途/需求 JOIN 全部基于空表，MRP 结果会系统性失真。同一模块的 `scm.demand_forecast`、`scm.sales_order_items`、`scm.supplier_products`、`scm.purchase_inquiries` 也都只有读没有写。先统一表名或建视图，再补预测/订单/供应商报价的写入链路。
2. **`public.core_doc_document_versions` 永远为空**（`svc/unified-core/src/modules/doc/handlers.rs:1102/1162/1225`）。文档保存/更新路径没有插入版本行，导致版本列表为空、`restore_document_version` 必然返回「版本不存在」。这是用户可直接感知的功能缺口，修写入点即可闭环。
3. **master MDM 10 个 handler / 5 张表**（`svc/unified-core/src/modules/master/handlers.rs:1204-1447`）。HEAD 上无路由；工作区已补路由并新增未跟踪的 `master_closed_loop_e2e.rs`，但 `public.core_mdm_approvals`、`public.core_mdm_reconciliation_log` 等仍 0 行。合并前必须在显式 `TEST_DATABASE_URL` 下跑通该用例，并确认生产表从 0 行变为有数据，否则只是把「调不到」变成「调到空」。

紧随其后：`iam.resource_permissions`（`permission_verify.rs:217`）全仓无写入，资源级权限校验对普通用户恒为 `false`；若该接口已对外，应优先确认是否符合预期。

## 附录 A：复核命令

```sql
-- 生产只读（禁止任何写操作）
BEGIN READ ONLY;
SELECT n.nspname, c.relname, s.n_tup_ins, s.n_tup_upd, s.n_live_tup
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid=c.oid
WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY 1,2;
ROLLBACK;
```

```bash
# 代码侧复核示例
rg -n 'FROM public\.core_doc_document_versions' svc/unified-core/src
rg -n 'INSERT INTO.*core_doc_document_versions' svc lib
rg -n 'create_approval_handler|run_reconciliation_handler' svc/unified-core/src/routes
```

