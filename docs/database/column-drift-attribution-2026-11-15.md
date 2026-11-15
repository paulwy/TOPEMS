# dev / prod 列级漂移归属与处置清单（2026-11-15）

> **库身份与账本水位**  
> dev：本机 socket 库 `topems`（PostgreSQL 18.4），`_sqlx_migrations` **689 行**，max version `20261115130000`。  
> prod：生产主库 `topems_prod`（unix socket，PostgreSQL 18.4），`_sqlx_migrations` **684 行**，max version `20261115130000`。  
> 采集时间：2026-11-15。本轮全程只读：两库未执行任何 DDL/DML，未改迁移文件，未 commit/push；prod 连接固定 `default_transaction_read_only=on`。
>
> **账本水位与你给的初始事实差 1 行**：任务是 `688 行 / max 20261115120000`（dev）、`683 行 / max 20261115120000`（prod）；本轮采集时为 `689 / 684 行、max 均为 20261115130000`。原因是另一会话在此期间提交并应用了 `20261115130000_drop_shell_tables_crm_erp_2.sql`（两侧账本均为 `success=true`），非本会话写入。以下所有统计均以采集时水位为准。

## 0. 结论摘要

1. **旧口径作废**：“dev 缺 29 列 / 7 表、dev 多 39 列 / 10 表”来自未登记的 56 表子集，不可复现，已作废（§1）。
2. **全库实测**：两侧均存在的 1327 张公共表内，列级差分 **3341 列**；另有整表独有（dev 153 张 / prod 19 张）与 82 列基础设施噪声。
3. **必须先定权威表**：137 个“一侧独有成员”的表族牵动 **613 列**，在权威表未定前不做列级硬判（§3）。
4. **可立即处置**：A 补 dev **15** 列、B 补 prod **18** 列（原始差异 135 列，经取证门复核后 **117 列转 D**，见 §4.2）、C-dev 删除 **563** 列、C-prod 只做“归档标记不删” **374** 列、D 定义/数据待判 **1745** 列（含 B 取证转出 117 列）、D 代际分叉 **11** 列（§4）。
5. **prod 侧不存在任何删除建议**：prod 只允许“标记历史残留、待归档”，删除类处置一律只落在 dev 侧（§4.3、§6）。
6. **生产在跑件已核清**：`sha256 99f00cef…c794af8a4c`，构建 base `936f7e888`（2026-11-15 09:42）；先前写的 `e136614` 是**部署目录的 git HEAD**，不是构建来源，已更正（§7.2）。

## 1. 旧口径作废声明

上一轮结论“dev 缺 29 列 / 7 表、dev 多 39 列 / 10 表”出自 `docs/database/schema-baseline-drift-2026-11-14.md` 第 391 行所述的“按表+列名逐列比对 **56 张表**”。该 56 表清单未登记在任何文档或脚本中，**无法复现**，因此该数字及基于它的判断**全部作废**。

- 该文档第 391 行已就地标注为失效来源。
- “只差几十列即可收敛”的结论不成立：实测差集是 29/39 口径的 40 倍量级。
- 旧清单点名的 7 张表确实存在差异，其中 29 列里：**11 列经人工复核确认为 A**（`finance.reconciliation_snapshots` 4 + `integration.integration_sync_logs` 7），**3 列待表族定权威表后归 A**（`mes.equipment`），**2 列同为族内待定**（`erp.erp_master_data_refs`），其余落在 C/D（见 §4.1、§6）。

## 2. 差集总览（实测）

| 维度 | dev | prod | 说明 |
|---|---|---|---|
| 表总数 | 1480 | 1346 | 两侧均存在 1327 张 |
| 列总数 | 19743 | 17261 | 公共表列数 dev 17739 / prod 17039 |
| 整表独有 | 153 张 | 19 张 | 在 §3 表族层面处理，其 2146 列不重复计入列级 |
| 列级：prod 有 dev 无 | — | 524 | A / C-prod / D |
| 列级：dev 有 prod 无 | 1224 | — | B / C-dev / D |
| 列级：两侧定义不一致 | — | — | 1593 列，432 种精确签名，归并为 13 类根因（§4.4） |
| 基础设施噪声 | 82 | — | `_sqlx_migrations`/`pg_stat_statements`/PostGIS 元表，不计入处置 |

## 3. 表族归并总纲（先定权威表）

> **owner 评审请用新清单**：[table-family-authority-recommendations-2026-11-15.md](table-family-authority-recommendations-2026-11-15.md)。该版补了“服务目录内裸名 SQL 按 SERVICE_SCHEMA 归属”和证据分级（A1/A2/B1–B3），并按“引用与数据落点矛盾”修正了本表若干结论（如 `guides`/`faqs` 由 portal 改为待定）。本表保留作差异对照。


| # | 表族 | 成员（列数 dev/prod · 行数 dev/prod · 最近写入） | 代码限定引用 | 建议权威表 | 依据 | 非权威成员处置 |
|---|---|---|---|---|---|---|
| 1 | `accounting_subjects` | `finance.accounting_subjects` 14/14 列 · 5/0 行 · 2026-09-24 07:59:07<br>`plugin_erp.accounting_subjects` —/14 列 · —/0 行 · —<br>`plugin_finance.accounting_subjects` —/14 列 · —/0 行 · — | svc/finance/src/modules/accounting_subjects.rs:118 等 1 处 | `finance.accounting_subjects` | 唯一有数据（5 行） | `plugin_erp.accounting_subjects`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`plugin_finance.accounting_subjects`：dev 无此表（仅 prod 存在）→ prod 标记归档不删 |
| 2 | `analytics_comparison_analyses` | `analytics.analytics_comparison_analyses` 15/15 列 · 0/0 行 · —<br>`bi.analytics_comparison_analyses` 15/15 列 · 0/0 行 · —<br>`public.analytics_comparison_analyses` 15/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/comparison_analysis.rs:145 | `bi.analytics_comparison_analyses` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_comparison_analyses`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_comparison_analyses`：空表 → dev 删除；prod 侧标记归档不删 |
| 3 | `analytics_comparison_results` | `analytics.analytics_comparison_results` 10/10 列 · 0/0 行 · —<br>`bi.analytics_comparison_results` 8/8 列 · 0/0 行 · —<br>`public.analytics_comparison_results` 8/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/comparison_analysis.rs:611 | `bi.analytics_comparison_results` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_comparison_results`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_comparison_results`：空表 → dev 删除；prod 侧标记归档不删 |
| 4 | `analytics_dashboard_shares` | `analytics.analytics_dashboard_shares` 9/9 列 · 0/0 行 · —<br>`bi.analytics_dashboard_shares` 8/8 列 · 0/0 行 · —<br>`public.analytics_dashboard_shares` 8/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/dashboard/share.rs:35 | `bi.analytics_dashboard_shares` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_dashboard_shares`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_dashboard_shares`：空表 → dev 删除；prod 侧标记归档不删 |
| 5 | `analytics_dashboard_templates` | `analytics.analytics_dashboard_templates` 12/12 列 · 0/0 行 · —<br>`bi.analytics_dashboard_templates` 12/12 列 · 0/0 行 · —<br>`public.analytics_dashboard_templates` 12/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/dashboard/templates.rs:30 | `bi.analytics_dashboard_templates` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_dashboard_templates`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_dashboard_templates`：空表 → dev 删除；prod 侧标记归档不删 |
| 6 | `analytics_dashboards` | `analytics.analytics_dashboards` 12/12 列 · 0/0 行 · —<br>`bi.analytics_dashboards` 12/12 列 · 2/0 行 · 2026-11-09 10:17:58<br>`public.analytics_dashboards` 12/— 列 · 0/— 行 · — | svc/analytics/tests/integration_tests.rs:63 等 1 处 | `bi.analytics_dashboards` | 唯一有 schema 限定代码引用 | `analytics.analytics_dashboards`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_dashboards`：空表 → dev 删除；prod 侧标记归档不删 |
| 7 | `analytics_datasets` | `analytics.analytics_datasets` 16/16 列 · 0/0 行 · —<br>`bi.analytics_datasets` 17/20 列 · 0/0 行 · —<br>`public.analytics_datasets` 17/— 列 · 0/— 行 · — | svc/analytics/src/modules/bi/dataset.rs:132 等 1 处 | `bi.analytics_datasets` | 唯一有 schema 限定代码引用 | `analytics.analytics_datasets`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_datasets`：空表 → dev 删除；prod 侧标记归档不删 |
| 8 | `analytics_datasources` | `analytics.analytics_datasources` 21/21 列 · 0/0 行 · —<br>`bi.analytics_datasources` 21/21 列 · 4/0 行 · 2026-11-09 10:17:58<br>`public.analytics_datasources` 21/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/datasource.rs:283 | `bi.analytics_datasources` | 服务边界（bi） | `analytics.analytics_datasources`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_datasources`：空表 → dev 删除；prod 侧标记归档不删 |
| 9 | `analytics_drilldown_history` | `analytics.analytics_drilldown_history` 13/13 列 · 0/0 行 · —<br>`bi.analytics_drilldown_history` 12/12 列 · 0/0 行 · —<br>`public.analytics_drilldown_history` 12/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/data_drilldown.rs:417 | `bi.analytics_drilldown_history` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_drilldown_history`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_drilldown_history`：空表 → dev 删除；prod 侧标记归档不删 |
| 10 | `analytics_drilldown_paths` | `analytics.analytics_drilldown_paths` 11/11 列 · 0/0 行 · —<br>`bi.analytics_drilldown_paths` 11/11 列 · 0/0 行 · —<br>`public.analytics_drilldown_paths` 11/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/data_drilldown.rs:100 | `bi.analytics_drilldown_paths` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_drilldown_paths`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_drilldown_paths`：空表 → dev 删除；prod 侧标记归档不删 |
| 11 | `analytics_row_level_permissions` | `analytics.analytics_row_level_permissions` 15/15 列 · 0/0 行 · —<br>`bi.analytics_row_level_permissions` 15/15 列 · 0/0 行 · —<br>`public.analytics_row_level_permissions` 15/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/row_level_permission.rs:161 | `bi.analytics_row_level_permissions` | 服务边界（bi）；全族空表且无限定引用，需 owner 确认 | `analytics.analytics_row_level_permissions`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_row_level_permissions`：空表 → dev 删除；prod 侧标记归档不删 |
| 12 | `analytics_self_service_reports` | `analytics.analytics_self_service_reports` 13/13 列 · 0/0 行 · —<br>`bi.analytics_self_service_reports` 13/13 列 · 1/0 行 · 2026-11-09 10:17:58<br>`public.analytics_self_service_reports` 13/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/self_service_report.rs:108 | `bi.analytics_self_service_reports` | 服务边界（bi） | `analytics.analytics_self_service_reports`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_self_service_reports`：空表 → dev 删除；prod 侧标记归档不删 |
| 13 | `analytics_widgets` | `analytics.analytics_widgets` 13/13 列 · 0/0 行 · —<br>`bi.analytics_widgets` 13/13 列 · 1/0 行 · 2026-11-09 10:17:58<br>`public.analytics_widgets` 13/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/bi/websocket.rs:167 | `bi.analytics_widgets` | 服务边界（bi） | `analytics.analytics_widgets`：空表 → dev 删除；prod 侧标记归档不删；`public.analytics_widgets`：空表 → dev 删除；prod 侧标记归档不删 |
| 14 | `assets` | `erp.assets` 31/31 列 · 1/0 行 · 2026-08-06 06:46:27<br>`public.assets` 31/— 列 · 1/— 行 · 2026-08-06 06:46:27 | lib/shared-db/src/schema.rs:830 等 2 处 | `erp.assets` | 唯一有 schema 限定代码引用 | `public.assets`：dev 有 1 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 15 | `billing_invoices` | `iam.core_billing_invoices` —/18 列 · —/0 行 · —<br>`mes.core_billing_invoices` 18/— 列 · 0/— 行 · — | — | `iam.core_billing_invoices` | 证据不足，需 owner 确认；全族空表且无限定引用，需 owner 确认 | `mes.core_billing_invoices`：空表 → dev 删除；prod 侧标记归档不删 |
| 16 | `billing_plans` | `iam.core_billing_plans` —/20 列 · —/0 行 · —<br>`mes.core_billing_plans` 20/— 列 · 0/— 行 · — | — | `iam.core_billing_plans` | 证据不足，需 owner 确认；全族空表且无限定引用，需 owner 确认 | `mes.core_billing_plans`：空表 → dev 删除；prod 侧标记归档不删 |
| 17 | `business_locations` | `gis.business_locations` 21/24 列 · 6/0 行 · 2026-09-30 00:57:39<br>`public.business_locations` 20/— 列 · 0/— 行 · — | svc/gis/src/modules/import_export.rs:319 等 4 处 | `gis.business_locations` | 唯一有 schema 限定代码引用 | `public.business_locations`：空表 → dev 删除；prod 侧标记归档不删 |
| 18 | `chat_members` | `iam.core_chat_members` 5/5 列 · 0/0 行 · —<br>`mes.core_chat_members` 5/— 列 · 0/— 行 · — | — | `iam.core_chat_members` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `mes.core_chat_members`：空表 → dev 删除；prod 侧标记归档不删 |
| 19 | `chat_messages` | `iam.core_chat_messages` 11/11 列 · 0/0 行 · —<br>`mes.core_chat_messages` 11/— 列 · 0/— 行 · — | — | `iam.core_chat_messages` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `mes.core_chat_messages`：空表 → dev 删除；prod 侧标记归档不删 |
| 20 | `chat_rooms` | `iam.core_chat_rooms` 8/8 列 · 0/0 行 · —<br>`mes.core_chat_rooms` 8/— 列 · 0/— 行 · — | — | `iam.core_chat_rooms` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `mes.core_chat_rooms`：空表 → dev 删除；prod 侧标记归档不删 |
| 21 | `cqrs_snapshots` | `finance.cqrs_snapshots` 5/5 列 · 0/0 行 · —<br>`public.cqrs_snapshots` 6/— 列 · 0/— 行 · — | 未限定名 svc/finance/src/domain/pg_event_store.rs:148 | `finance.cqrs_snapshots` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.cqrs_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 22 | `crm_dashboard_snapshots` | `iam.crm_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.crm_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.crm_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.crm_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.crm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.crm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 23 | `crm_master_data_refs` | `crm.crm_master_data_refs` 13/13 列 · 832/0 行 · 2026-11-14 14:51:09<br>`public.crm_master_data_refs` 13/— 列 · 0/— 行 · — | — | `crm.crm_master_data_refs` | 服务边界（crm） | `public.crm_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 24 | `dashboard_refresh_log` | `iam.core_dashboard_refresh_log` 10/10 列 · 0/0 行 · —<br>`mes.core_dashboard_refresh_log` 10/— 列 · 0/— 行 · — | — | `iam.core_dashboard_refresh_log` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `mes.core_dashboard_refresh_log`：空表 → dev 删除；prod 侧标记归档不删 |
| 25 | `device_locations` | `gis.device_locations` 14/22 列 · 2/0 行 · 2026-06-19 11:12:30<br>`public.device_locations` 13/— 列 · 0/— 行 · — | svc/gis/src/embedded.rs:466 等 6 处 | `gis.device_locations` | 唯一有 schema 限定代码引用 | `public.device_locations`：空表 → dev 删除；prod 侧标记归档不删 |
| 26 | `dict_items` | `erp.dict_items` 14/14 列 · 0/0 行 · —<br>`iam.core_dict_items` 13/13 列 · 0/0 行 · —<br>`mes.core_dict_items` 13/— 列 · 0/— 行 · —<br>`public.core_dict_items` 14/14 列 · 379/397 行 · 2026-11-06 17:05:52 | svc/master-data/src/modules/dict/handlers.rs:459 等 3 处 | `public.core_dict_items` | core 共享表约定位于 public | `erp.dict_items`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_dict_items`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_dict_items`：空表 → dev 删除；prod 侧标记归档不删 |
| 27 | `dict_types` | `erp.dict_types` 11/11 列 · 44/0 行 · 2026-07-26 00:37:25<br>`iam.core_dict_types` 10/10 列 · 0/0 行 · —<br>`mes.core_dict_types` 10/— 列 · 0/— 行 · —<br>`public.core_dict_types` 11/11 列 · 73/77 行 · 2026-11-06 17:05:52 | svc/master-data/src/modules/dict/handlers.rs:103 等 3 处 | `public.core_dict_types` | core 共享表约定位于 public | `erp.dict_types`：dev 有 44 行 → 先迁移数据后删除；prod 侧标记归档不删；`iam.core_dict_types`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_dict_types`：空表 → dev 删除；prod 侧标记归档不删 |
| 28 | `dynamic_data` | `iam.dynamic_data` 6/6 列 · 0/0 行 · —<br>`master_data.dynamic_data` 6/6 列 · 0/0 行 · —<br>`mes.dynamic_data` 6/— 列 · 0/— 行 · —<br>`public.dynamic_data` 6/6 列 · 0/0 行 · — | svc/master-data/src/modules/schema_registry.rs:443 等 1 处 | `public.dynamic_data` | 唯一有 schema 限定代码引用 | `iam.dynamic_data`：空表 → dev 删除；prod 侧标记归档不删；`master_data.dynamic_data`：空表 → dev 删除；prod 侧标记归档不删；`mes.dynamic_data`：空表 → dev 删除；prod 侧标记归档不删 |
| 29 | `ehs_dashboard_snapshots` | `iam.ehs_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.ehs_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.ehs_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.ehs_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.ehs_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.ehs_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 30 | `email_queue` | `iam.core_email_queue` 17/17 列 · 0/0 行 · —<br>`mes.core_email_queue` 17/— 列 · 0/— 行 · —<br>`public.core_email_queue` 17/17 列 · 0/0 行 · — | 未限定名 svc/communication/src/mail.rs:1072 | `public.core_email_queue` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.core_email_queue`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_email_queue`：空表 → dev 删除；prod 侧标记归档不删 |
| 31 | `email_templates` | `communication.core_email_templates` —/10 列 · —/0 行 · —<br>`iam.core_email_templates` 9/9 列 · 0/0 行 · —<br>`mes.core_email_templates` 9/— 列 · 0/— 行 · — | — | `iam.core_email_templates` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `communication.core_email_templates`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`mes.core_email_templates`：空表 → dev 删除；prod 侧标记归档不删 |
| 32 | `emails` | `iam.core_emails` 14/14 列 · 0/0 行 · —<br>`mail.emails` 21/2 列 · 23/0 行 · 2026-06-16 22:52:07<br>`mes.core_emails` 14/— 列 · 0/— 行 · —<br>`public.core_emails` 14/14 列 · 0/0 行 · — | svc/communication/src/mail.rs:231 等 1 处 | `public.core_emails` | 唯一有 schema 限定代码引用 | `iam.core_emails`：空表 → dev 删除；prod 侧标记归档不删；`mail.emails`：dev 有 23 行 → 先迁移数据后删除；prod 侧标记归档不删；`mes.core_emails`：空表 → dev 删除；prod 侧标记归档不删 |
| 33 | `employees` | `hrm.employees` 43/43 列 · 19/1 行 · 2026-11-15 11:03:00<br>`public.employees` 41/— 列 · 19/— 行 · 2026-10-29 08:49:28 | svc/hrm/src/modules/attendance.rs:74 等 9 处 | `hrm.employees` | 唯一有 schema 限定代码引用 | `public.employees`：dev 有 19 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 34 | `equipment` | `mes.equipment` 62/65 列 · 11/0 行 · 2026-10-15 07:20:50<br>`public.equipment` —/20 列 · —/0 行 · —<br>`rs.equipment` —/18 列 · —/0 行 · — | apps/web/src/schemas/mes/equipment.ts:6 等 8 处 | `mes.equipment` | 唯一有 schema 限定代码引用 | `public.equipment`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`rs.equipment`：dev 无此表（仅 prod 存在）→ prod 标记归档不删 |
| 35 | `erp_connections` | `integration.erp_connections` 21/22 列 · 57/0 行 · 2026-11-06 08:40:33<br>`public.erp_connections` 16/— 列 · 38/— 行 · 2026-10-07 07:01:17 | svc/integration/src/sync_scheduler.rs:411 等 1 处 | `integration.erp_connections` | 唯一有 schema 限定代码引用 | `public.erp_connections`：dev 有 38 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 36 | `erp_mappings` | `integration.erp_mappings` 16/16 列 · 55/0 行 · 2026-10-23 22:46:33<br>`public.erp_mappings` 15/— 列 · 31/— 行 · 2026-10-07 07:01:18 | 未限定名 svc/integration/src/openapi.rs:70 | `integration.erp_mappings` | 唯一有数据（55 行） | `public.erp_mappings`：dev 有 31 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 37 | `erp_master_data_refs` | `erp.erp_master_data_refs` 21/23 列 · 40/0 行 · 2026-11-14 14:51:09<br>`public.erp_master_data_refs` 13/— 列 · 0/— 行 · — | svc/erp/src/modules/master_data_lineage.rs:66 等 10 处 | `erp.erp_master_data_refs` | 唯一有 schema 限定代码引用 | `public.erp_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 38 | `external_erp_sync_logs` | `integration.external_erp_sync_logs` 14/35 列 · 477/0 行 · 2026-10-23 22:46:35<br>`public.external_erp_sync_logs` 13/— 列 · 315/— 行 · 2026-10-07 07:01:18 | 未限定名 svc/integration/src/external_erp.rs:1177 | `integration.external_erp_sync_logs` | 唯一有数据（477 行） | `public.external_erp_sync_logs`：dev 有 315 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 39 | `factory_maps` | `gis.factory_maps` 12/17 列 · 11/0 行 · 2026-09-30 00:57:53<br>`public.factory_maps` 11/— 列 · 0/— 行 · — | svc/gis/src/services/tenant_service.rs:29 等 2 处 | `gis.factory_maps` | 唯一有 schema 限定代码引用 | `public.factory_maps`：空表 → dev 删除；prod 侧标记归档不删 |
| 40 | `faqs` | `iam.core_faqs` 11/11 列 · 0/0 行 · —<br>`mes.core_faqs` 11/— 列 · 0/— 行 · —<br>`portal.core_faqs` 11/10 列 · 0/0 行 · —<br>`public.core_faqs` 11/11 列 · 12/12 行 · 2026-10-26 14:19:13 | 未限定名 svc/portal/src/modules/help/faq.rs:96 | `public.core_faqs` | core 共享表约定位于 public | `iam.core_faqs`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_faqs`：空表 → dev 删除；prod 侧标记归档不删；`portal.core_faqs`：空表 → dev 删除；prod 侧标记归档不删 |
| 41 | `file_folders` | `flow.core_file_folders` 7/7 列 · 0/0 行 · —<br>`iam.core_file_folders` 8/8 列 · 0/0 行 · —<br>`mes.core_file_folders` 8/— 列 · 0/— 行 · —<br>`public.core_file_folders` 8/8 列 · 0/0 行 · — | — | `public.core_file_folders` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `flow.core_file_folders`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_file_folders`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_file_folders`：空表 → dev 删除；prod 侧标记归档不删 |
| 42 | `files` | `doc_service.files` 11/2 列 · 9/0 行 · 2026-06-13 19:56:20<br>`flow.core_files` 13/13 列 · 0/0 行 · —<br>`iam.core_files` 14/14 列 · 0/0 行 · —<br>`mes.core_files` 14/— 列 · 0/— 行 · —<br>`public.core_files` 14/14 列 · 0/0 行 · —<br>`storage.files` 20/2 列 · 43/0 行 · 2026-06-16 22:52:05 | svc/unified-core/src/modules/tenant/handlers.rs:3441 等 4 处 | `public.core_files` | 唯一有 schema 限定代码引用 | `doc_service.files`：dev 有 9 行 → 先迁移数据后删除；prod 侧标记归档不删；`flow.core_files`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_files`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_files`：空表 → dev 删除；prod 侧标记归档不删；`storage.files`：dev 有 43 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 43 | `guide_lessons` | `iam.core_guide_lessons` 10/10 列 · 0/0 行 · —<br>`mes.core_guide_lessons` 10/— 列 · 0/— 行 · —<br>`portal.core_guide_lessons` 10/9 列 · 0/0 行 · —<br>`public.core_guide_lessons` 10/10 列 · 0/0 行 · — | 未限定名 svc/portal/src/modules/help/guide.rs:233 | `public.core_guide_lessons` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.core_guide_lessons`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_guide_lessons`：空表 → dev 删除；prod 侧标记归档不删；`portal.core_guide_lessons`：空表 → dev 删除；prod 侧标记归档不删 |
| 44 | `guide_progress` | `iam.core_guide_progress` 9/9 列 · 0/0 行 · —<br>`mes.core_guide_progress` 9/— 列 · 0/— 行 · —<br>`portal.core_guide_progress` 7/7 列 · 0/0 行 · —<br>`public.core_guide_progress` 9/9 列 · 0/0 行 · — | — | `public.core_guide_progress` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.core_guide_progress`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_guide_progress`：空表 → dev 删除；prod 侧标记归档不删；`portal.core_guide_progress`：空表 → dev 删除；prod 侧标记归档不删 |
| 45 | `guides` | `iam.core_guides` 12/12 列 · 0/0 行 · —<br>`mes.core_guides` 12/— 列 · 0/— 行 · —<br>`portal.core_guides` 12/11 列 · 0/0 行 · —<br>`public.core_guides` 12/12 列 · 12/12 行 · 2026-10-26 14:19:13 | 未限定名 svc/portal/src/modules/help/mod.rs:187 | `public.core_guides` | core 共享表约定位于 public | `iam.core_guides`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_guides`：空表 → dev 删除；prod 侧标记归档不删；`portal.core_guides`：空表 → dev 删除；prod 侧标记归档不删 |
| 46 | `hrm_dashboard_snapshots` | `iam.hrm_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.hrm_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.hrm_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.hrm_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.hrm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.hrm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 47 | `hrm_master_data_refs` | `hrm.hrm_master_data_refs` 13/13 列 · 0/0 行 · —<br>`public.hrm_master_data_refs` 13/— 列 · 0/— 行 · — | — | `hrm.hrm_master_data_refs` | 服务边界（hrm）；全族空表且无限定引用，需 owner 确认 | `public.hrm_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 48 | `inter_module_sync` | `iam.core_inter_module_sync` 17/17 列 · 0/0 行 · —<br>`integration.core_inter_module_sync` 18/16 列 · 0/0 行 · —<br>`mes.core_inter_module_sync` 17/— 列 · 0/— 行 · —<br>`public.core_inter_module_sync` 17/17 列 · 0/0 行 · —<br>`unified_core.inter_module_sync` 21/21 列 · 0/0 行 · — | 未限定名 svc/integration/src/handlers/sync.rs:167 | `public.core_inter_module_sync` | core 共享表约定位于 public | `iam.core_inter_module_sync`：空表 → dev 删除；prod 侧标记归档不删；`integration.core_inter_module_sync`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_inter_module_sync`：空表 → dev 删除；prod 侧标记归档不删；`unified_core.inter_module_sync`：空表 → dev 删除；prod 侧标记归档不删 |
| 49 | `inventory` | `erp.inventory` 20/20 列 · 0/0 行 · —<br>`public.inventory` 20/— 列 · 0/— 行 · —<br>`wms.inventory` 53/53 列 · 74/0 行 · 2026-11-14 22:12:05 | svc/wms/tests/integration_tests.rs:414 等 16 处 | `wms.inventory` | 唯一有数据（74 行） | `erp.inventory`：空表 → dev 删除；prod 侧标记归档不删；`public.inventory`：空表 → dev 删除；prod 侧标记归档不删 |
| 50 | `lims_dashboard_snapshots` | `iam.lims_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.lims_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.lims_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.lims_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.lims_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.lims_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 51 | `location_photos` | `gis.location_photos` 11/14 列 · 1/0 行 · 2026-06-19 11:12:30<br>`public.location_photos` 10/— 列 · 0/— 行 · — | svc/gis/src/modules/photo.rs:52 等 2 处 | `gis.location_photos` | 唯一有 schema 限定代码引用 | `public.location_photos`：空表 → dev 删除；prod 侧标记归档不删 |
| 52 | `login_logs` | `flow.core_login_logs` 11/— 列 · 0/— 行 · —<br>`iam.core_login_logs` 11/11 列 · 0/0 行 · —<br>`mes.core_login_logs` 11/— 列 · 0/— 行 · —<br>`public.core_login_logs` 11/11 列 · 181/137 行 · 2026-11-15 08:31:47 | svc/unified-core/tests/audit_e2e.rs:18 等 4 处 | `public.core_login_logs` | 唯一有 schema 限定代码引用 | `flow.core_login_logs`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_login_logs`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_login_logs`：空表 → dev 删除；prod 侧标记归档不删 |
| 53 | `map_markers` | `gis.map_markers` 18/17 列 · 2/0 行 · 2026-06-19 11:12:30<br>`public.map_markers` 17/— 列 · 0/— 行 · — | svc/gis/src/modules/marker.rs:55 等 2 处 | `gis.map_markers` | 唯一有 schema 限定代码引用 | `public.map_markers`：空表 → dev 删除；prod 侧标记归档不删 |
| 54 | `menu_groups` | `flow.core_menu_groups` 10/10 列 · 0/0 行 · —<br>`iam.core_menu_groups` 10/10 列 · 0/0 行 · —<br>`mes.core_menu_groups` 10/— 列 · 252/— 行 · 2026-11-07 05:07:33<br>`public.core_menu_groups` 10/10 列 · 62/130 行 · 2026-11-14 22:09:54 | svc/unified-core/tests/menu_e2e.rs:22 等 2 处 | `public.core_menu_groups` | core 共享表约定位于 public | `flow.core_menu_groups`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_menu_groups`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_menu_groups`：dev 有 252 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 55 | `menus` | `flow.core_menus` 14/14 列 · 0/0 行 · —<br>`iam.core_menus` 14/14 列 · 0/0 行 · —<br>`mes.core_menus` 14/— 列 · 877/— 行 · 2026-11-07 05:07:33<br>`public.core_menus` 14/14 列 · 213/452 行 · 2026-11-14 22:09:54 | svc/unified-core/tests/menu_e2e.rs:39 等 2 处 | `public.core_menus` | core 共享表约定位于 public | `flow.core_menus`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_menus`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_menus`：dev 有 877 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 56 | `mes_qms_sync` | `integration.mes_qms_sync` 25/25 列 · 0/0 行 · —<br>`public.mes_qms_sync` 24/— 列 · 0/— 行 · — | svc/integration/src/mes_qms_integration.rs:143 等 1 处 | `integration.mes_qms_sync` | 唯一有 schema 限定代码引用 | `public.mes_qms_sync`：空表 → dev 删除；prod 侧标记归档不删 |
| 57 | `migration_history` | `flow.core_migration_history` 11/11 列 · 0/0 行 · —<br>`iam.core_migration_history` 12/12 列 · 0/0 行 · —<br>`mes.core_migration_history` 12/— 列 · 0/— 行 · —<br>`public.core_migration_history` 12/12 列 · 5/0 行 · 2026-07-28 23:36:35 | 未限定名 svc/unified-core/src/modules/migration/service.rs:231 | `public.core_migration_history` | core 共享表约定位于 public | `flow.core_migration_history`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_migration_history`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_migration_history`：空表 → dev 删除；prod 侧标记归档不删 |
| 58 | `mobile_offline_records` | `iam.core_mobile_offline_records` 13/13 列 · 0/0 行 · —<br>`mes.core_mobile_offline_records` 13/— 列 · 0/— 行 · —<br>`mobile.core_mobile_offline_records` 13/16 列 · 0/0 行 · — | svc/mobile/src/modules/offline_records.rs:90 等 1 处 | `mobile.core_mobile_offline_records` | 唯一有 schema 限定代码引用 | `iam.core_mobile_offline_records`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_mobile_offline_records`：空表 → dev 删除；prod 侧标记归档不删 |
| 59 | `notification_channels` | `communication.notification_channels` 15/19 列 · 0/0 行 · —<br>`public.notification_channels` 14/— 列 · 0/— 行 · — | 未限定名 svc/communication/src/notification.rs:2982 | `communication.notification_channels` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.notification_channels`：空表 → dev 删除；prod 侧标记归档不删 |
| 60 | `notification_templates` | `iam.core_notification_templates` 11/11 列 · 0/0 行 · —<br>`mes.core_notification_templates` 11/— 列 · 0/— 行 · —<br>`public.core_notification_templates` 13/13 列 · 0/0 行 · —<br>`public.notification_templates` 14/— 列 · 0/— 行 · — | svc/communication/src/notification.rs:2317 等 1 处 | `public.core_notification_templates` | 唯一有 schema 限定代码引用 | `iam.core_notification_templates`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_notification_templates`：空表 → dev 删除；prod 侧标记归档不删；`public.notification_templates`：空表 → dev 删除；prod 侧标记归档不删 |
| 61 | `notifications` | `flow.notifications` 11/2 列 · 0/0 行 · —<br>`iam.core_notifications` 13/13 列 · 0/0 行 · —<br>`mes.core_notifications` 13/— 列 · 0/— 行 · —<br>`notification.notifications` 13/2 列 · 62/0 行 · —<br>`pm.notifications` 15/15 列 · 0/0 行 · —<br>`public.core_notifications` 13/13 列 · 4/0 行 · 2026-11-06 21:17:38 | svc/unified-core/src/modules/iam/auth.rs:1504 等 2 处 | `public.core_notifications` | core 共享表约定位于 public | `flow.notifications`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_notifications`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_notifications`：空表 → dev 删除；prod 侧标记归档不删；`notification.notifications`：dev 有 62 行 → 先迁移数据后删除；prod 侧标记归档不删；`pm.notifications`：空表 → dev 删除；prod 侧标记归档不删 |
| 62 | `pdm_bom_items` | `pdm.pdm_bom_items` 13/13 列 · 0/0 行 · —<br>`public.pdm_bom_items` 12/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/bom.rs:1093 | `pdm.pdm_bom_items` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_bom_items`：空表 → dev 删除；prod 侧标记归档不删 |
| 63 | `pdm_boms` | `pdm.pdm_boms` 12/12 列 · 0/0 行 · —<br>`public.pdm_boms` 11/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/bom.rs:631 | `pdm.pdm_boms` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_boms`：空表 → dev 删除；prod 侧标记归档不删 |
| 64 | `pdm_configurations` | `pdm.pdm_configurations` 12/12 列 · 0/0 行 · —<br>`public.pdm_configurations` 12/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/configuration.rs:121 | `pdm.pdm_configurations` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_configurations`：空表 → dev 删除；prod 侧标记归档不删 |
| 65 | `pdm_dashboard_snapshots` | `iam.pdm_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.pdm_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.pdm_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.pdm_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.pdm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.pdm_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 66 | `pdm_document_versions` | `pdm.pdm_document_versions` 21/21 列 · 0/0 行 · —<br>`public.pdm_document_versions` 21/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/document_version.rs:437 | `pdm.pdm_document_versions` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_document_versions`：空表 → dev 删除；prod 侧标记归档不删 |
| 67 | `pdm_documents` | `pdm.pdm_documents` 14/14 列 · 0/0 行 · —<br>`public.pdm_documents` 14/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/document.rs:168 | `pdm.pdm_documents` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_documents`：空表 → dev 删除；prod 侧标记归档不删 |
| 68 | `pdm_master_data_refs` | `pdm.pdm_master_data_refs` 13/2 列 · 1/0 行 · 2026-11-07 05:37:39<br>`public.pdm_master_data_refs` 13/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/event_handlers/mod.rs:269 | `pdm.pdm_master_data_refs` | 服务边界（pdm） | `public.pdm_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 69 | `pdm_production_batches` | `pdm.pdm_production_batches` 14/14 列 · 0/0 行 · —<br>`public.pdm_production_batches` 14/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/production_statistics.rs:114 | `pdm.pdm_production_batches` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_production_batches`：空表 → dev 删除；prod 侧标记归档不删 |
| 70 | `pdm_production_formulas` | `pdm.pdm_production_formulas` 12/12 列 · 0/0 行 · —<br>`public.pdm_production_formulas` 11/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/production_formula.rs:399 | `pdm.pdm_production_formulas` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_production_formulas`：空表 → dev 删除；prod 侧标记归档不删 |
| 71 | `pdm_production_processes` | `pdm.pdm_production_processes` 13/13 列 · 0/0 行 · —<br>`public.pdm_production_processes` 12/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/production_statistics.rs:217 | `pdm.pdm_production_processes` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_production_processes`：空表 → dev 删除；prod 侧标记归档不删 |
| 72 | `pdm_production_steps` | `pdm.pdm_production_steps` 11/11 列 · 0/0 行 · —<br>`public.pdm_production_steps` 11/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/production_step.rs:114 | `pdm.pdm_production_steps` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_production_steps`：空表 → dev 删除；prod 侧标记归档不删 |
| 73 | `pdm_project_members` | `pdm.pdm_project_members` 10/10 列 · 0/0 行 · —<br>`public.pdm_project_members` 9/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/project.rs:184 | `pdm.pdm_project_members` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_project_members`：空表 → dev 删除；prod 侧标记归档不删 |
| 74 | `pdm_project_phases` | `pdm.pdm_project_phases` 13/13 列 · 0/0 行 · —<br>`public.pdm_project_phases` 12/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/project.rs:928 | `pdm.pdm_project_phases` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_project_phases`：空表 → dev 删除；prod 侧标记归档不删 |
| 75 | `pdm_projects` | `pdm.pdm_projects` 17/17 列 · 0/0 行 · —<br>`public.pdm_projects` 17/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/project.rs:228 | `pdm.pdm_projects` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_projects`：空表 → dev 删除；prod 侧标记归档不删 |
| 76 | `pdm_versions` | `pdm.pdm_versions` 13/13 列 · 0/0 行 · —<br>`public.pdm_versions` 13/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/version.rs:120 | `pdm.pdm_versions` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_versions`：空表 → dev 删除；prod 侧标记归档不删 |
| 77 | `pdm_workflow_instances` | `pdm.pdm_workflow_instances` 14/14 列 · 0/0 行 · —<br>`public.pdm_workflow_instances` 13/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/workflow.rs:552 | `pdm.pdm_workflow_instances` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_workflow_instances`：空表 → dev 删除；prod 侧标记归档不删 |
| 78 | `pdm_workflows` | `pdm.pdm_workflows` 12/12 列 · 0/0 行 · —<br>`public.pdm_workflows` 12/— 列 · 0/— 行 · — | 未限定名 svc/pdm/src/modules/workflow.rs:142 | `pdm.pdm_workflows` | 服务边界（pdm）；全族空表且无限定引用，需 owner 确认 | `public.pdm_workflows`：空表 → dev 删除；prod 侧标记归档不删 |
| 79 | `pipelines` | `gis.pipelines` 14/13 列 · 4/0 行 · 2026-11-06 07:20:18<br>`public.pipelines` 12/— 列 · 0/— 行 · — | svc/gis/src/modules/stats.rs:66 等 5 处 | `gis.pipelines` | 唯一有 schema 限定代码引用 | `public.pipelines`：空表 → dev 删除；prod 侧标记归档不删 |
| 80 | `plugin_categories` | `core.core_plugin_categories` 10/10 列 · 9/0 行 · 2026-09-01 06:02:18<br>`iam.core_plugin_categories` 11/11 列 · 0/0 行 · —<br>`mes.core_plugin_categories` 11/— 列 · 0/— 行 · —<br>`public.core_plugin_categories` 11/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs:80 等 1 处 | `core.core_plugin_categories` | 唯一有 schema 限定代码引用 | `iam.core_plugin_categories`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_categories`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugin_categories`：空表 → dev 删除；prod 侧标记归档不删 |
| 81 | `plugin_instances` | `core.core_plugin_instances` 11/9 列 · 36/0 行 · 2026-10-19 02:23:41<br>`iam.core_plugin_instances` 11/11 列 · 0/0 行 · —<br>`mes.core_plugin_instances` 11/— 列 · 0/— 行 · —<br>`public.core_plugin_instances` 11/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:195 等 5 处 | `core.core_plugin_instances` | 唯一有 schema 限定代码引用 | `iam.core_plugin_instances`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_instances`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugin_instances`：空表 → dev 删除；prod 侧标记归档不删 |
| 82 | `plugin_permissions` | `core.core_plugin_permissions` 9/7 列 · 8/0 行 · 2026-10-19 02:23:41<br>`iam.core_plugin_permissions` 9/9 列 · 0/0 行 · —<br>`mes.core_plugin_permissions` 9/— 列 · 0/— 行 · —<br>`public.core_plugin_permissions` 9/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:173 等 2 处 | `core.core_plugin_permissions` | 唯一有 schema 限定代码引用 | `iam.core_plugin_permissions`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_permissions`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugin_permissions`：空表 → dev 删除；prod 侧标记归档不删 |
| 83 | `plugin_pricing` | `iam.core_plugin_pricing` 10/10 列 · 0/0 行 · —<br>`mes.core_plugin_pricing` 10/— 列 · 0/— 行 · —<br>`public.core_plugin_pricing` 10/— 列 · 0/— 行 · — | — | `public.core_plugin_pricing` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.core_plugin_pricing`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_pricing`：空表 → dev 删除；prod 侧标记归档不删 |
| 84 | `plugin_reviews` | `core.core_plugin_reviews` 13/13 列 · 0/0 行 · —<br>`iam.core_plugin_reviews` 14/14 列 · 0/0 行 · —<br>`mes.core_plugin_reviews` 14/— 列 · 0/— 行 · —<br>`public.core_plugin_reviews` 14/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/marketplace.rs:370 等 1 处 | `core.core_plugin_reviews` | 唯一有 schema 限定代码引用 | `iam.core_plugin_reviews`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_reviews`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugin_reviews`：空表 → dev 删除；prod 侧标记归档不删 |
| 85 | `plugin_versions` | `core.core_plugin_versions` 12/12 列 · 0/0 行 · —<br>`iam.core_plugin_versions` 12/12 列 · 0/0 行 · —<br>`mes.core_plugin_versions` 12/— 列 · 0/— 行 · —<br>`public.core_plugin_versions` 13/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/versioning.rs:190 等 4 处 | `core.core_plugin_versions` | 唯一有 schema 限定代码引用 | `iam.core_plugin_versions`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugin_versions`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugin_versions`：空表 → dev 删除；prod 侧标记归档不删 |
| 86 | `plugins` | `core.core_plugins` 34/34 列 · 36/0 行 · 2026-10-19 02:23:41<br>`iam.core_plugins` 33/33 列 · 0/0 行 · —<br>`mes.core_plugins` 33/— 列 · 0/— 行 · —<br>`public.core_plugins` 33/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:137 等 7 处 | `core.core_plugins` | 唯一有 schema 限定代码引用 | `iam.core_plugins`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_plugins`：空表 → dev 删除；prod 侧标记归档不删；`public.core_plugins`：空表 → dev 删除；prod 侧标记归档不删 |
| 87 | `production_lines` | `mes.production_lines` 10/10 列 · 0/0 行 · —<br>`public.production_lines` 9/— 列 · 0/— 行 · — | 未限定名 svc/mes/src/modules/basics.rs:509 | `mes.production_lines` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.production_lines`：空表 → dev 删除；prod 侧标记归档不删 |
| 88 | `qa_alert_messages` | `public.qa_alert_messages` 15/— 列 · 0/— 行 · —<br>`qms.qa_alert_messages` 15/15 列 · 0/0 行 · — | svc/qms/src/modules/quality_dashboard.rs:691 等 1 处 | `qms.qa_alert_messages` | 唯一有 schema 限定代码引用 | `public.qa_alert_messages`：空表 → dev 删除；prod 侧标记归档不删 |
| 89 | `qa_alert_rules` | `public.qa_alert_rules` 17/— 列 · 0/— 行 · —<br>`qms.qa_alert_rules` 17/17 列 · 0/0 行 · — | svc/qms/src/modules/quality_dashboard.rs:414 等 1 处 | `qms.qa_alert_rules` | 唯一有 schema 限定代码引用 | `public.qa_alert_rules`：空表 → dev 删除；prod 侧标记归档不删 |
| 90 | `qa_apqp_approvals` | `public.qa_apqp_approvals` 12/— 列 · 0/— 行 · —<br>`qms.qa_apqp_approvals` 12/11 列 · 0/0 行 · — | svc/qms/src/modules/apqp.rs:1683 等 1 处 | `qms.qa_apqp_approvals` | 唯一有 schema 限定代码引用 | `public.qa_apqp_approvals`：空表 → dev 删除；prod 侧标记归档不删 |
| 91 | `qa_apqp_phases` | `public.qa_apqp_phases` 16/— 列 · 0/— 行 · —<br>`qms.qa_apqp_phases` 16/24 列 · 0/0 行 · — | svc/qms/src/modules/apqp.rs:219 等 1 处 | `qms.qa_apqp_phases` | 唯一有 schema 限定代码引用 | `public.qa_apqp_phases`：空表 → dev 删除；prod 侧标记归档不删 |
| 92 | `qa_apqp_projects` | `public.qa_apqp_projects` 21/— 列 · 0/— 行 · —<br>`qms.qa_apqp_projects` 21/21 列 · 0/0 行 · — | svc/qms/src/modules/apqp.rs:66 等 1 处 | `qms.qa_apqp_projects` | 唯一有 schema 限定代码引用 | `public.qa_apqp_projects`：空表 → dev 删除；prod 侧标记归档不删 |
| 93 | `qa_apqp_risks` | `public.qa_apqp_risks` 17/— 列 · 0/— 行 · —<br>`qms.qa_apqp_risks` 17/24 列 · 0/0 行 · — | svc/qms/src/modules/apqp.rs:1206 等 1 处 | `qms.qa_apqp_risks` | 唯一有 schema 限定代码引用 | `public.qa_apqp_risks`：空表 → dev 删除；prod 侧标记归档不删 |
| 94 | `qa_apqp_tasks` | `public.qa_apqp_tasks` 16/— 列 · 0/— 行 · —<br>`qms.qa_apqp_tasks` 16/20 列 · 0/0 行 · — | svc/qms/src/modules/apqp.rs:847 等 1 处 | `qms.qa_apqp_tasks` | 唯一有 schema 限定代码引用 | `public.qa_apqp_tasks`：空表 → dev 删除；prod 侧标记归档不删 |
| 95 | `qa_audit_findings` | `public.qa_audit_findings` 18/— 列 · 0/— 行 · —<br>`qms.qa_audit_findings` 18/18 列 · 0/0 行 · — | svc/qms/src/modules/audit.rs:555 等 1 处 | `qms.qa_audit_findings` | 唯一有 schema 限定代码引用 | `public.qa_audit_findings`：空表 → dev 删除；prod 侧标记归档不删 |
| 96 | `qa_audit_plans` | `public.qa_audit_plans` 16/— 列 · 0/— 行 · —<br>`qms.qa_audit_plans` 16/16 列 · 0/0 行 · — | svc/qms/src/modules/audit.rs:53 等 2 处 | `qms.qa_audit_plans` | 唯一有 schema 限定代码引用 | `public.qa_audit_plans`：空表 → dev 删除；prod 侧标记归档不删 |
| 97 | `qa_audit_tasks` | `public.qa_audit_tasks` 13/— 列 · 0/— 行 · —<br>`qms.qa_audit_tasks` 13/13 列 · 0/0 行 · — | svc/qms/src/modules/audit.rs:358 等 1 处 | `qms.qa_audit_tasks` | 唯一有 schema 限定代码引用 | `public.qa_audit_tasks`：空表 → dev 删除；prod 侧标记归档不删 |
| 98 | `qa_corrective_action_items` | `public.qa_corrective_action_items` 11/— 列 · 0/— 行 · —<br>`qms.qa_corrective_action_items` 11/11 列 · 0/0 行 · — | svc/qms/src/modules/corrective_action.rs:215 等 1 处 | `qms.qa_corrective_action_items` | 唯一有 schema 限定代码引用 | `public.qa_corrective_action_items`：空表 → dev 删除；prod 侧标记归档不删 |
| 99 | `qa_corrective_actions` | `public.qa_corrective_actions` 17/— 列 · 0/— 行 · —<br>`qms.qa_corrective_actions` 18/18 列 · 0/0 行 · — | svc/qms/src/modules/integration.rs:65 等 4 处 | `qms.qa_corrective_actions` | 唯一有 schema 限定代码引用 | `public.qa_corrective_actions`：空表 → dev 删除；prod 侧标记归档不删 |
| 100 | `qa_eightd_audit_logs` | `public.qa_eightd_audit_logs` 9/— 列 · 0/— 行 · —<br>`qms.qa_eightd_audit_logs` 9/9 列 · 0/0 行 · — | svc/qms/src/modules/eight_d.rs:217 等 1 处 | `qms.qa_eightd_audit_logs` | 唯一有 schema 限定代码引用 | `public.qa_eightd_audit_logs`：空表 → dev 删除；prod 侧标记归档不删 |
| 101 | `qa_eightd_reports` | `public.qa_eightd_reports` 27/— 列 · 0/— 行 · —<br>`qms.qa_eightd_reports` 27/34 列 · 0/0 行 · — | svc/qms/src/modules/eight_d.rs:88 等 2 处 | `qms.qa_eightd_reports` | 唯一有 schema 限定代码引用 | `public.qa_eightd_reports`：空表 → dev 删除；prod 侧标记归档不删 |
| 102 | `qa_fmea_analyses` | `public.qa_fmea_analyses` 19/— 列 · 0/— 行 · —<br>`qms.qa_fmea_analyses` 19/19 列 · 0/0 行 · — | svc/qms/src/modules/fmea.rs:60 等 1 处 | `qms.qa_fmea_analyses` | 唯一有 schema 限定代码引用 | `public.qa_fmea_analyses`：空表 → dev 删除；prod 侧标记归档不删 |
| 103 | `qa_fmea_items` | `public.qa_fmea_items` 25/— 列 · 0/— 行 · —<br>`qms.qa_fmea_items` 25/25 列 · 0/0 行 · — | svc/qms/src/modules/fmea.rs:359 等 1 处 | `qms.qa_fmea_items` | 唯一有 schema 限定代码引用 | `public.qa_fmea_items`：空表 → dev 删除；prod 侧标记归档不删 |
| 104 | `qa_inspection_audits` | `public.qa_inspection_audits` 10/— 列 · 0/— 行 · —<br>`qms.qa_inspection_audits` 10/10 列 · 1/0 行 · 2026-11-10 23:24:25 | svc/qms/src/modules/quality_inspection.rs:515 等 1 处 | `qms.qa_inspection_audits` | 唯一有 schema 限定代码引用 | `public.qa_inspection_audits`：空表 → dev 删除；prod 侧标记归档不删 |
| 105 | `qa_inspection_results` | `public.qa_inspection_results` 10/— 列 · 0/— 行 · —<br>`qms.qa_inspection_results` 11/11 列 · 0/0 行 · — | svc/qms/src/modules/quality_task.rs:317 等 3 处 | `qms.qa_inspection_results` | 唯一有 schema 限定代码引用 | `public.qa_inspection_results`：空表 → dev 删除；prod 侧标记归档不删 |
| 106 | `qa_quality_costs` | `public.qa_quality_costs` 14/— 列 · 0/— 行 · —<br>`qms.qa_quality_costs` 14/14 列 · 0/0 行 · — | svc/qms/src/modules/quality_cost.rs:98 等 1 处 | `qms.qa_quality_costs` | 唯一有 schema 限定代码引用 | `public.qa_quality_costs`：空表 → dev 删除；prod 侧标记归档不删 |
| 107 | `qa_quality_inspections` | `public.qa_quality_inspections` 21/— 列 · 0/— 行 · —<br>`qms.qa_quality_inspections` 23/23 列 · 2/0 行 · 2026-11-10 23:24:25 | svc/qms/src/modules/quality_task.rs:108 等 6 处 | `qms.qa_quality_inspections` | 唯一有 schema 限定代码引用 | `public.qa_quality_inspections`：空表 → dev 删除；prod 侧标记归档不删 |
| 108 | `qa_quality_issues` | `public.qa_quality_issues` 14/— 列 · 0/— 行 · —<br>`qms.qa_quality_issues` 15/15 列 · 15/0 行 · 2026-11-11 07:04:38 | svc/qms/src/modules/quality_issue.rs:76 等 6 处 | `qms.qa_quality_issues` | 唯一有 schema 限定代码引用 | `public.qa_quality_issues`：空表 → dev 删除；prod 侧标记归档不删 |
| 109 | `qa_spc_charts` | `public.qa_spc_charts` 20/— 列 · 0/— 行 · —<br>`qms.qa_spc_charts` 29/29 列 · 0/0 行 · — | svc/qms/src/modules/spc.rs:170 等 1 处 | `qms.qa_spc_charts` | 唯一有 schema 限定代码引用 | `public.qa_spc_charts`：空表 → dev 删除；prod 侧标记归档不删 |
| 110 | `qa_spc_data_points` | `public.qa_spc_data_points` 11/— 列 · 0/— 行 · —<br>`qms.qa_spc_data_points` 15/15 列 · 0/0 行 · — | svc/qms/src/modules/spc.rs:463 等 1 处 | `qms.qa_spc_data_points` | 唯一有 schema 限定代码引用 | `public.qa_spc_data_points`：空表 → dev 删除；prod 侧标记归档不删 |
| 111 | `qa_standard_revisions` | `public.qa_standard_revisions` 13/— 列 · 0/— 行 · —<br>`qms.qa_standard_revisions` 13/13 列 · 3/0 行 · 2026-10-25 08:10:45 | svc/qms/src/modules/quality_standard.rs:222 等 1 处 | `qms.qa_standard_revisions` | 唯一有 schema 限定代码引用 | `public.qa_standard_revisions`：空表 → dev 删除；prod 侧标记归档不删 |
| 112 | `qa_standards` | `public.qa_standards` 14/— 列 · 0/— 行 · —<br>`qms.qa_standards` 14/14 列 · 3/0 行 · 2026-10-25 08:10:45 | svc/qms/src/main.rs:144 等 4 处 | `qms.qa_standards` | 唯一有 schema 限定代码引用 | `public.qa_standards`：空表 → dev 删除；prod 侧标记归档不删 |
| 113 | `refresh_tokens` | `iam.refresh_tokens` —/2 列 · —/0 行 · —<br>`public.core_refresh_tokens` 12/11 列 · 1388/106 行 · 2026-11-15 08:31:47<br>`public.refresh_tokens` —/6 列 · —/0 行 · — | svc/unified-core/src/modules/iam/auth.rs:492 等 1 处 | `public.core_refresh_tokens` | 唯一有 schema 限定代码引用 | `iam.refresh_tokens`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`public.refresh_tokens`：dev 无此表（仅 prod 存在）→ prod 标记归档不删 |
| 114 | `report_execution_records` | `analytics.report_execution_records` 11/11 列 · 0/0 行 · —<br>`bi.report_execution_records` 2/9 列 · 0/0 行 · —<br>`public.report_execution_records` 10/— 列 · 0/— 行 · — | svc/analytics/src/modules/report/schedule.rs:448 等 2 处 | `analytics.report_execution_records` | 唯一有 schema 限定代码引用 | `bi.report_execution_records`：空表 → dev 删除；prod 侧标记归档不删；`public.report_execution_records`：空表 → dev 删除；prod 侧标记归档不删 |
| 115 | `report_subscriptions` | `analytics.report_subscriptions` 9/9 列 · 0/0 行 · —<br>`bi.report_subscriptions` 8/8 列 · 0/0 行 · —<br>`public.report_subscriptions` 9/— 列 · 0/— 行 · — | 未限定名 svc/analytics/src/modules/report/scheduler.rs:361 | `analytics.report_subscriptions` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `bi.report_subscriptions`：空表 → dev 删除；prod 侧标记归档不删；`public.report_subscriptions`：空表 → dev 删除；prod 侧标记归档不删 |
| 116 | `report_templates` | `analytics.report_templates` 16/16 列 · 0/0 行 · —<br>`bi.report_templates` 21/21 列 · 0/0 行 · —<br>`pm.report_templates` 11/14 列 · 0/0 行 · —<br>`report.report_templates` 8/— 列 · 0/— 行 · — | svc/analytics/tests/integration_tests.rs:181 等 1 处 | `bi.report_templates` | 列定义最完整 | `analytics.report_templates`：空表 → dev 删除；prod 侧标记归档不删；`pm.report_templates`：空表 → dev 删除；prod 侧标记归档不删；`report.report_templates`：空表 → dev 删除；prod 侧标记归档不删 |
| 117 | `scm_master_data_refs` | `public.scm_master_data_refs` 13/— 列 · 0/— 行 · —<br>`scm.scm_master_data_refs` 13/13 列 · 644/0 行 · 2026-11-01 06:06:53 | — | `scm.scm_master_data_refs` | 服务边界（scm） | `public.scm_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 118 | `sessions` | `iam.sessions` —/11 列 · —/0 行 · —<br>`public.core_sessions` 12/11 列 · 1388/106 行 · 2026-11-15 08:31:47 | svc/unified-core/src/modules/iam/auth.rs:479 等 1 处 | `public.core_sessions` | 唯一有 schema 限定代码引用 | `iam.sessions`：dev 无此表（仅 prod 存在）→ prod 标记归档不删 |
| 119 | `shifts` | `mes.shifts` 12/12 列 · 0/0 行 · —<br>`public.shifts` 11/— 列 · 0/— 行 · — | 未限定名 svc/mes/src/modules/basics.rs:786 | `mes.shifts` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.shifts`：空表 → dev 删除；prod 侧标记归档不删 |
| 120 | `subscriptions` | `iam.core_subscriptions` —/13 列 · —/0 行 · —<br>`mes.core_subscriptions` 13/— 列 · 0/— 行 · —<br>`public.subscriptions` 9/9 列 · 1/0 行 · 2026-11-06 05:49:52 | svc/server/src/modules/subscription_module.rs:89 等 1 处 | `public.subscriptions` | 唯一有 schema 限定代码引用 | `iam.core_subscriptions`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`mes.core_subscriptions`：空表 → dev 删除；prod 侧标记归档不删 |
| 121 | `tenant_modules` | `flow.core_tenant_modules` —/9 列 · —/0 行 · —<br>`iam.core_tenant_modules` 9/8 列 · 0/0 行 · —<br>`public.core_tenant_modules` 9/9 列 · 0/0 行 · — | 未限定名 svc/unified-core/src/modules/tenant/handlers.rs:492 | `public.core_tenant_modules` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `flow.core_tenant_modules`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`iam.core_tenant_modules`：空表 → dev 删除；prod 侧标记归档不删 |
| 122 | `tenant_permissions` | `iam.tenant_permissions` —/8 列 · —/0 行 · —<br>`public.tenant_permissions` 8/8 列 · 0/0 行 · — | 未限定名 svc/unified-core/src/routes/business_tools/database_permission_store.rs:211 | `public.tenant_permissions` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `iam.tenant_permissions`：dev 无此表（仅 prod 存在）→ prod 标记归档不删 |
| 123 | `tenant_plugins` | `core.core_tenant_plugins` 14/2 列 · 4/0 行 · 2026-08-17 22:53:58<br>`iam.core_tenant_plugins` 14/14 列 · 0/0 行 · —<br>`mes.core_tenant_plugins` 14/— 列 · 0/— 行 · —<br>`public.core_tenant_plugins` 14/2 列 · 0/0 行 · — | svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:492 等 3 处 | `iam.core_tenant_plugins` | 唯一有 schema 限定代码引用 | `core.core_tenant_plugins`：dev 有 4 行 → 先迁移数据后删除；prod 侧标记归档不删；`mes.core_tenant_plugins`：空表 → dev 删除；prod 侧标记归档不删；`public.core_tenant_plugins`：空表 → dev 删除；prod 侧标记归档不删 |
| 124 | `tenant_settings` | `flow.core_tenant_settings` 7/7 列 · 0/0 行 · —<br>`iam.core_tenant_settings` 7/7 列 · 0/0 行 · —<br>`mes.core_tenant_settings` 7/— 列 · 0/— 行 · —<br>`public.core_tenant_settings` 7/7 列 · 4/4 行 · 2026-11-05 09:36:56 | svc/unified-core/tests/settings_e2e.rs:20 等 5 处 | `public.core_tenant_settings` | 唯一有 schema 限定代码引用 | `flow.core_tenant_settings`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_tenant_settings`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_tenant_settings`：空表 → dev 删除；prod 侧标记归档不删 |
| 125 | `tenant_usage` | `flow.core_tenant_usage` 13/13 列 · 0/0 行 · —<br>`iam.core_tenant_usage` —/13 列 · —/0 行 · —<br>`mes.core_tenant_usage` 13/— 列 · 0/— 行 · —<br>`public.core_tenant_usage` 13/13 列 · 0/0 行 · — | svc/unified-core/src/modules/tenant/handlers.rs:3438 等 1 处 | `public.core_tenant_usage` | 唯一有 schema 限定代码引用 | `flow.core_tenant_usage`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_tenant_usage`：dev 无此表（仅 prod 存在）→ prod 标记归档不删；`mes.core_tenant_usage`：空表 → dev 删除；prod 侧标记归档不删 |
| 126 | `tenant_users` | `flow.core_tenant_users` 9/9 列 · 1/0 行 · 2026-09-19 07:28:05<br>`iam.core_tenant_users` 9/9 列 · 0/0 行 · —<br>`iam.tenant_users` 9/9 列 · 0/0 行 · —<br>`mes.core_tenant_users` 9/— 列 · 0/— 行 · —<br>`public.core_tenant_users` 9/9 列 · 27/3 行 · 2026-11-11 21:02:32 | svc/unified-core/tests/p1_company_scopes_migration_tests.rs:40 等 7 处 | `public.core_tenant_users` | 唯一有 schema 限定代码引用 | `flow.core_tenant_users`：dev 有 1 行 → 先迁移数据后删除；prod 侧标记归档不删；`iam.core_tenant_users`：空表 → dev 删除；prod 侧标记归档不删；`iam.tenant_users`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_tenant_users`：空表 → dev 删除；prod 侧标记归档不删 |
| 127 | `tenants` | `flow.core_tenants` 22/22 列 · 1/0 行 · 2026-09-19 07:28:05<br>`iam.core_tenants` 22/22 列 · 0/0 行 · —<br>`mes.core_tenants` 22/— 列 · 0/— 行 · —<br>`public.core_tenants` 23/23 列 · 797/1 行 · 2026-11-13 23:31:59<br>`public.tenants` 10/9 列 · 1/0 行 · 2026-06-21 20:17:06 | svc/unified-core/src/modules/tenant/handlers.rs:2189 等 4 处 | `public.core_tenants` | core 共享表约定位于 public | `flow.core_tenants`：dev 有 1 行 → 先迁移数据后删除；prod 侧标记归档不删；`iam.core_tenants`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_tenants`：空表 → dev 删除；prod 侧标记归档不删；`public.tenants`：dev 有 1 行 → 先迁移数据后删除；prod 侧标记归档不删 |
| 128 | `usage_records` | `iam.core_usage_records` 11/11 列 · 0/0 行 · —<br>`mes.core_usage_records` 11/— 列 · 0/— 行 · — | — | `iam.core_usage_records` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `mes.core_usage_records`：空表 → dev 删除；prod 侧标记归档不删 |
| 129 | `vectors` | `ai.vectors` 5/5 列 · 0/0 行 · —<br>`hrm.vectors` 5/— 列 · 0/— 行 · — | svc/ai/src/handlers/model_admin_handlers.rs:253 等 1 处 | `ai.vectors` | 唯一有 schema 限定代码引用 | `hrm.vectors`：空表 → dev 删除；prod 侧标记归档不删 |
| 130 | `warehouse_locations` | `gis.warehouse_locations` 14/19 列 · 2/0 行 · 2026-06-19 11:12:30<br>`public.warehouse_locations` 12/— 列 · 0/— 行 · — | svc/gis/src/modules/stats.rs:76 等 5 处 | `gis.warehouse_locations` | 唯一有 schema 限定代码引用 | `public.warehouse_locations`：空表 → dev 删除；prod 侧标记归档不删 |
| 131 | `wms_dashboard_snapshots` | `iam.wms_dashboard_snapshots` 12/12 列 · 0/0 行 · —<br>`mes.wms_dashboard_snapshots` 12/— 列 · 0/— 行 · —<br>`public.wms_dashboard_snapshots` 12/12 列 · 0/0 行 · — | — | `public.wms_dashboard_snapshots` | core 共享表约定位于 public；全族空表且无限定引用，需 owner 确认 | `iam.wms_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删；`mes.wms_dashboard_snapshots`：空表 → dev 删除；prod 侧标记归档不删 |
| 132 | `wms_master_data_refs` | `public.wms_master_data_refs` 13/— 列 · 0/— 行 · —<br>`wms.wms_master_data_refs` 12/2 列 · 0/0 行 · — | — | `wms.wms_master_data_refs` | 服务边界（wms）；全族空表且无限定引用，需 owner 确认 | `public.wms_master_data_refs`：空表 → dev 删除；prod 侧标记归档不删 |
| 133 | `work_calendars` | `mes.work_calendars` 12/12 列 · 0/0 行 · —<br>`public.work_calendars` 11/— 列 · 0/— 行 · — | 未限定名 svc/mes/src/modules/basics.rs:1066 | `mes.work_calendars` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.work_calendars`：空表 → dev 删除；prod 侧标记归档不删 |
| 134 | `workflow_instances` | `flow.core_workflow_instances` 13/15 列 · 0/0 行 · —<br>`iam.core_workflow_instances` 13/13 列 · 0/0 行 · —<br>`mes.core_workflow_instances` 13/— 列 · 0/— 行 · —<br>`public.core_workflow_instances` 13/13 列 · 2/0 行 · 2026-09-23 20:49:57 | svc/unified-core/src/modules/flow/statistics.rs:31 等 5 处 | `public.core_workflow_instances` | 唯一有 schema 限定代码引用 | `flow.core_workflow_instances`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_workflow_instances`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_workflow_instances`：空表 → dev 删除；prod 侧标记归档不删 |
| 135 | `workflow_tasks` | `flow.core_workflow_tasks` 14/14 列 · 0/0 行 · —<br>`iam.core_workflow_tasks` 10/10 列 · 0/0 行 · —<br>`mes.core_workflow_tasks` 10/— 列 · 0/— 行 · —<br>`public.core_workflow_tasks` 14/14 列 · 0/0 行 · — | svc/unified-core/src/modules/flow/statistics.rs:58 等 5 处 | `public.core_workflow_tasks` | 唯一有 schema 限定代码引用 | `flow.core_workflow_tasks`：空表 → dev 删除；prod 侧标记归档不删；`iam.core_workflow_tasks`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_workflow_tasks`：空表 → dev 删除；prod 侧标记归档不删 |
| 136 | `workflows` | `flow.core_workflows` 14/15 列 · 20/0 行 · 2026-09-20 00:05:46<br>`flow.workflows` 10/2 列 · 18/0 行 · 2026-06-13 07:14:11<br>`iam.core_workflows` 12/12 列 · 0/0 行 · —<br>`mes.core_workflows` 12/— 列 · 0/— 行 · —<br>`public.core_workflows` 14/14 列 · 1/0 行 · 2026-09-24 04:27:01 | svc/unified-core/src/modules/flow/statistics.rs:19 等 6 处 | `public.core_workflows` | 唯一有 schema 限定代码引用 | `flow.core_workflows`：dev 有 20 行 → 先迁移数据后删除；prod 侧标记归档不删；`flow.workflows`：dev 有 18 行 → 先迁移数据后删除；prod 侧标记归档不删；`iam.core_workflows`：空表 → dev 删除；prod 侧标记归档不删；`mes.core_workflows`：空表 → dev 删除；prod 侧标记归档不删 |
| 137 | `workshops` | `mes.workshops` 11/11 列 · 0/0 行 · —<br>`public.workshops` 10/— 列 · 0/— 行 · — | 未限定名 svc/mes/src/modules/basics.rs:233 | `mes.workshops` | 列定义最完整；全族空表且无限定引用，需 owner 确认 | `public.workshops`：空表 → dev 删除；prod 侧标记归档不删 |

> 共 137 个族（已剔除 `_sqlx_migrations` 基础设施族）。prod 侧**不删除任何列/表**，只允许标记“历史残留、待归档”。


### 3.1 整表独有的非族表

| 表 | 侧 | 行数（该侧） | 代码引用 | 分类 | 处置 |
|---|---|---|---|---|---|
| `bi.report_stats` | dev | — | - | C | dev 删除（空表、0 引用） |
| `finance.finance_alert_configs_v` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `finance.finance_alert_history_v` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `finance.finance_anomaly_alerts_v` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `finance.finance_audit_findings_v` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `finance.finance_detection_configs_v` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `finance.finance_u8_import_records` | dev | 0 | b | D | D：需人工确认（有裸名引用，表族不清） |
| `finance.reconciliation_orders` | prod | 0 | - | C | prod 标记归档不删 |
| `iam.auth_sessions` | prod | 0 | - | C | prod 标记归档不删 |
| `iam.tool_permissions` | prod | 0 | b | D | D：需人工确认（有裸名引用，表族不清） |
| `lims.samples_tenant_null_backup_20260919` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `mail.email_stats` | dev | — | - | C | dev 删除（空表、0 引用） |
| `public.archived_notifications` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `public.configurations` | dev | 0 | b | D | D：需人工确认（有裸名引用，表族不清） |
| `public.core_feedbacks` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `public.geography_columns` | dev | — | - | — | 保留（扩展/PostGIS 元表，不处置） |
| `public.geometry_columns` | dev | — | - | — | 保留（扩展/PostGIS 元表，不处置） |
| `public.pg_stat_statements` | dev | — | - | — | 保留（扩展/PostGIS 元表，不处置） |
| `public.pg_stat_statements_info` | dev | — | - | — | 保留（扩展/PostGIS 元表，不处置） |
| `public.qa_lab_samples_merge_backup_20260919` | dev | 0 | - | C | dev 删除（空表、0 引用） |
| `public.search_recent` | prod | 0 | q | A | A：dev 补建该表（整表缺失） |
| `public.spatial_ref_sys` | dev | 0 | - | — | 保留（扩展/PostGIS 元表，不处置） |
| `public.versions` | dev | 0 | b | D | D：需人工确认（有裸名引用，表族不清） |

> 共 23 张非族整表独有；其余整表独有均在 §3 的 137 个族内。

## 4. 列级四类归属

口径：只对**两侧都存在**的表做逐列归属。整表独有（dev 独有 153 张 / prod 独有 19 张）在 §3 表族层面处理，其 2146 列不重复计入。

| 归类 | 两侧表的列数 | 表数 | 处置方向 |
|---|---|---|---|
| A 补 dev | 15（自动复核 4 + 人工复核 11） | — | dev 侧 `ALTER TABLE ADD COLUMN` |
| B 补 prod（取证门后） | 18 | 11 | 新迁移补 prod（prod 不删）；原始 135 列 / 42 表中 117 列 / 31 表无代码引用，转 D（§4.2.3） |
| C-dev 删除 | 563 | 118 | 仅 dev 侧删除 |
| C-prod 归档 | 374 | 112 | prod **不删**，只标记“历史残留、待归档”（其中 11 列经人工复核转 A） |
| D 族内待定 | 613 | — | 先按 §3 定权威表 |
| D 代际分叉 | 11 | 1 | `flow.approvals` dev/prod 两套实现 |
| D 定义/数据待判 | 1745 | — | 见 §4.4（含 §4.2.3 从 B 转出的 117 列） |

> 合计 3339 列 = 15 + 18 + 563 + 374 + 613 + 11 + 1745（两侧均存在的 1327 张公共表内的列级差分；B 的 117 列已移入 D，总计不变）。
### 4.1 A 类：prod 有、dev 无，代码已依赖 → 补 dev

#### 4.1.1 人工复核确认（点名 7 表中的 11 列）

| 表.列 | prod 定义 | 代码证据 | 迁移来源 | dev 现状 | 判定依据 |
|---|---|---|---|---|---|
| `finance.reconciliation_snapshots.total_amount` | numeric default 0 | `svc/finance/src/modules/settlement_center/service.rs:155/243`（INSERT/UPDATE 显式列） | `20260725000000`, `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `finance.reconciliation_snapshots.matched_amount` | numeric default 0 | `svc/finance/src/modules/settlement_center/service.rs:155/243`（INSERT/UPDATE 显式列） | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `finance.reconciliation_snapshots.unmatched_amount` | numeric default 0 | `svc/finance/src/modules/settlement_center/service.rs:155/243`（INSERT/UPDATE 显式列） | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `finance.reconciliation_snapshots.project_id` | uuid | `svc/finance/src/modules/settlement_center/service.rs:155/243`（INSERT/UPDATE 显式列） | `20260725000000`, `20260824000002`… | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.total_count` | integer default 0 | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.success_count` | integer default 0 | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.failed_count` | integer default 0 | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.completed_at` | timestamp with time zone | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.error_message` | text | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.created_at` | timestamp with time zone default now() | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |
| `integration.integration_sync_logs.updated_at` | timestamp with time zone default now() | `svc/integration/src/event_handlers/mod.rs:159/184/209` → `record_sync_log` 落库 | `20261007140000` | 缺 | 写入路径显式引用该列，dev 缺列会在写日志/落快照时报错 |

> `integration.integration_sync_logs` 在本次自动扫描中未命中，原因是 SQL 位于 `record_sync_log` 辅助函数内、表名出现在 `status约束清单-2026-11-14.md` 与约束脚本中的次数多于业务代码；已人工核实写入路径存在。

#### 4.1.2 自动判定 A 类（复核后保留 4 列）

自动匹配命中 14 列，逐条回读引用行后只有 4 列是真实生产 SQL 读取/写入：

| 表.列 | prod 定义 | 代码引用（已回读） | 数据依赖（prod） | 迁移来源 |
|---|---|---|---|---|
| `doc_service.core_doc_documents.tags` | array | `svc/unified-core/src/modules/doc/services/document.rs:41` → `SELECT ... tags ... FROM core_doc_documents` | 0/0 非空 | `20260725000000`, `20260924110000`… |
| `pm.documents.tags` | array | `svc/pm/src/modules/document.rs:81` → `only_own_schema_query!("pm", "SELECT ... tags ...")` | 0/0 非空 | `20260725000000`, `20260909000004`… |
| `pm.risks.mitigation_strategy` | text | `svc/pm/src/modules/risk.rs:98` → `only_own_schema_query!("pm", "SELECT ... mitigation_strategy ...")` | 0/0 非空 | `20260725000000`, `20261007140000` |
| `public.process_flows.name` | character varying | `svc/mes/src/modules/process_flow.rs:1320` → `SELECT id, name, capacity FROM process_flows`（mes 无同名表，落 public） | 0/0 非空 | `20260725000000`, `20260920000094`… |

#### 4.1.2b 自动判定误判（10 列，改判 D，不出 DDL）

| 表.列 | prod 定义 | 原命中 | 误判原因 |
|---|---|---|---|
| `finance.budgets.description` | text | `svc/pm/src/modules/statistics.rs:1134` | 命中行是 `#[utoipa::path]` 的接口描述，不是 SQL |
| `mes.production_orders.product_id` | uuid | `svc/mes/src/modules/aps_scheduling.rs:775` | 命中行是 `product_id: None, // production_orders 表无 product_id 列`，代码明确未使用该列 |
| `mes.work_stations.name` | character varying(128) | `apps/web/src/api/mes/types.ts:450` | 前端 TS 类型声明，非 DB 读写；Rust 侧用 `station_name` |
| `plugin_mes.audit_logs.success` | boolean | `svc/portal/src/modules/graphql_security.rs:1122` | 命中的是 Rust 结构体字段过滤 `l.success`，未证明查询/写入该列 |
| `public.conversion_rules.code` | character varying(64) | `svc/integration/src/handlers/sync.rs:1172` | 命中的是配置项字符串 `"conversion_rules"`，与列无关 |
| `public.monitor_settings.description` | text | `apps/web/src/pages/monitor/MonitorSettingsPage.tsx:207` | 前端页面字段，非 DB 读写 |
| `public.process_flows.capacity` | numeric | `apps/web/src/pages/mes/ProcessFlowPage.tsx:48` | 前端页面字段，非 DB 读写 |
| `wms.batches.org_id` | uuid | `svc/wms/tests/batch_e2e.rs:98` | 仅测试 SQL，测试不构成生产依赖 |
| `wms.locations.code` | character varying(100) | `svc/wms/src/modules/location.rs:377` | SQL 里是 `location_code AS code` **别名**，不引用 `code` 列 |
| `wms.locations.name` | character varying(255) | `svc/wms/src/modules/location.rs:377` | SQL 里是 `location_name AS name` **别名**，不引用 `name` 列 |

> 这 10 列与 `mes.production_records` 的 9 个 `RETURNING ... AS` 同属一类陷阱：**列名出现在代码里不等于列被依赖**。改判 D 后不再计入 A 类可执行清单，需 owner 按 §6 取证。

#### 4.1.3 A 类 DDL（dev 侧，按表合并）

只保留复核通过的 4 列 + §4.1.1 的 11 列人工项：

```sql
-- 人工复核 11 列（§4.1.1）
ALTER TABLE finance.reconciliation_snapshots
  ADD COLUMN IF NOT EXISTS total_amount      numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_amount    numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unmatched_amount  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_id        uuid;

ALTER TABLE integration.integration_sync_logs
  ADD COLUMN IF NOT EXISTS total_count     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS error_message   text,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- 自动判定复核保留 4 列（§4.1.2）
ALTER TABLE doc_service.core_doc_documents ADD COLUMN IF NOT EXISTS "tags" ARRAY;
ALTER TABLE pm.documents   ADD COLUMN IF NOT EXISTS "tags" ARRAY;
ALTER TABLE pm.risks       ADD COLUMN IF NOT EXISTS "mitigation_strategy" text;
ALTER TABLE public.process_flows ADD COLUMN IF NOT EXISTS "name" character varying;
```

### 4.2 B 类：dev 有、prod 无，代码已在用 → 补 prod

取证门之前实测 **135 列 / 42 张表**；逐列取证后**仅 18 列 / 11 表**满足“有真实代码写入或读取”的条件，保留为 B 类（§4.2.2）；其余 **117 列 / 31 表**无代码引用，转 D（§4.2.3）。prod 侧一律**不删除**。

> **交叉说明（`mes.production_records` 9 列）**：这 9 列在 dev 侧确实缺失，但**不属于 B 类**，也不做补列处置；其归属见 §4.3（`mes.production_records` 行，prod 归档不删）。原因是代码用 `RETURNING ... AS 列名` 造结果集别名（示例见 `svc/mes/src/modules/production_record.rs:351-355`：`NULL::uuid AS equipment_id`、`completed_quantity AS quantity_produced`、`rejected_quantity AS quantity_defective`），补真实列会让原查询撞 `duplicate column`，比缺列更糟。此处仅作交叉说明，B 类总数与表数以 §4.2.2 取证结果为准。

> 关键事实：prod 在跑件 `sha256 99f00cef…c794af8a4c`（构建 base `936f7e888`），与本地 HEAD `4b55e04` 在这批表的代码引用上**完全一致**（两树索引均命中同一批文件），因此 B 类不是“代码未上线”，而是**代码已上线、prod 库缺列**——一旦走到该路径即运行时报错。
>
> **注意：下表是取证门之前的原始差异底稿（135 列 / 42 表），已不再作为 B 类判定依据。** 经逐列取证，仅 **11 表 18 列**有真实写入/读取点（§4.2.2）；其余 **117 列 / 31 表**无代码引用，转 D（§4.2.3），补列无运行时收益。

| 表 | 列数 | prod 行数 | 列清单（dev 定义） | 迁移来源 |
|---|---|---|---|---|
| `doc.documents` | 7 | 0 | `description` text, `version` integer default 1, `status` character varying(50) default 'draft'::character varying, `title` character varying(500), `updated_at` timestamp with time zone default now(), `content` text, `tenant_id` uuid | `20260725000000`, `20260907000001`… |
| `doc.folders` | 2 | — | `name` character varying(200), `updated_at` timestamp with time zone default now() | `20260725000000`, `20261007000009` |
| `doc.templates` | 9 | — | `updated_at` timestamp with time zone default now(), `created_by` character varying(100), `fields` jsonb default '[]'::jsonb, `created_at` timestamp with time zone default now(), `content` text, `tenant_id` uuid, `category` character varying(100), `name` character varying(200), `description` text | `20260725000000`, `20261007000009`… |
| `doc_service.archives` | 1 | — | `created_at` timestamp with time zone default now() | `20260725000000`, `20261107000026` |
| `doc_service.folders` | 2 | — | `updated_at` timestamp with time zone default now(), `name` character varying(255) | `20260725000000`, `20261007000009` |
| `doc_service.templates` | 12 | — | `description` text, `code` character varying(100), `created_by` character varying(255), `created_at` timestamp with time zone default now(), `content` text, `tenant_id` uuid, `name` character varying(255), `variables` jsonb, `updated_at` timestamp with time zone default now(), `version` integer default 1, `type` character varying(50) default 'document'::character varying, `is_active` boolean default true | `20260725000000`, `20261007000009` |
| `ehs.audit_logs` | 3 | — | `action` character varying(50), `user_name` character varying(100), `user_id` character varying(100) | `20260725000000`, `20260824000001`… |
| `erp.expenses` | 6 | 0 | `amount` numeric(15,2), `expense_number` character varying(100), `expense_type` character varying(100), `department_id` uuid, `status` character varying(50) default 'pending'::character varying, `applicant_name` character varying(255) | `20260725000000`, `20260920000085`… |
| `erp.holidays` | 1 | 0 | `date` date | `20260725000000` |
| `erp.payables` | 2 | 0 | `project_id` uuid, `contract_id` uuid | `20260725000000`, `20260920000085`… |
| `erp.receivables` | 2 | 0 | `project_id` uuid, `contract_id` uuid | `20260725000000`, `20261007140000`… |
| `finance.finance_voucher_template_lines` | 4 | 0 | `debit_amount` numeric(18,2), `credit_amount` numeric(18,2), `account_id` uuid, `account_name` character varying(255) | `20260725000000` |
| `finance.finance_voucher_templates` | 2 | 0 | `voucher_type` character varying(255), `is_default` boolean default false | `20260725000000` |
| `finance.voucher_lines` | 1 | — | `tenant_id` uuid default '00000000-0000-0000-0000-000000000001':: | `20260908000011`, `20260924000017`… |
| `gis.audit_log` | 1 | — | `tenant_id` uuid | `20260725000000`, `20260908000016`… |
| `gis.audit_logs` | 2 | 0 | `user_id` uuid, `action` character varying(100) | `20260725000000`, `20260810000001`… |
| `gis.geodata` | 1 | — | `tenant_id` uuid | `20260725000000`, `20260908000016`… |
| `gis.geofeatures` | 1 | — | `tenant_id` uuid | `20260725000000`, `20260908000016`… |
| `gis.map_layers` | 1 | — | `tenant_id` uuid | `20260725000000`, `20260908000016`… |
| `gis.spatial_analysis` | 1 | — | `tenant_id` uuid | `20260725000000`, `20260908000016`… |
| `hrm.companies` | 1 | 1 | `email` text | `20260725000000`, `20261007000010` |
| `iam.audit_logs` | 2 | 0 | `action` character varying(100) default ''::character varying, `user_id` uuid | `20260725000000`, `20260824000001`… |
| `iam.permissions` | 5 | 0 | `resource` character varying(100), `description` text, `tenant_id` uuid, `name` character varying(100), `action` character varying(50) | `20260724000004`, `20260724000005`… |
| `lims.audit_logs` | 2 | 0 | `user_name` character varying(255), `user_id` character varying(255) | `20260725000000`, `20260824000001`… |
| `lims.instruments` | 1 | 0 | `description` text | `20260725000000`, `20260926120000`… |
| `lims.reagents` | 8 | 0 | `unit` character varying(50), `name` character varying(255), `status` character varying(50) default 'in_stock'::character varying, `specification` character varying(255), `quantity` numeric(18,4) default 0, `updated_at` timestamp with time zone default now(), `created_at` timestamp with time zone default now(), `description` text | `20260725000000`, `20260926120000`… |
| `lims.samples` | 4 | 0 | `sample_type` character varying(100), `sample_no` text, `description` text, `source` character varying(255) | `20260725000000`, `20260921000100`… |
| `mail.templates` | 11 | — | `variables` jsonb default '[]'::jsonb, `status` character varying(50) default 'active'::character varying, `tags` jsonb default '[]'::jsonb, `updated_at` timestamp with time zone default now(), `description` text, `code` character varying(100), `created_by` uuid, `created_at` timestamp with time zone default now(), `tenant_id` uuid, `category` character varying(50) default 'general'::character varying, `name` character varying(255) | `20261007000009`, `20261107000025` |
| `portal.portal_todos` | 2 | 0 | `completed` boolean default false, `user_id` character varying(100) | `20260725000000` |
| `public.alert_rules` | 2 | 0 | `name` character varying(255), `description` text | `20260725000000` |
| `public.alerts` | 10 | 0 | `resolved_at` timestamp with time zone, `created_at` timestamp with time zone default CURRENT_TIMESTAMP, `tenant_id` uuid, `severity` character varying(20), `status` character varying(20) default 'active'::character varying, `acknowledged_at` timestamp with time zone, `message` text, `acknowledged_by` character varying(255), `title` character varying(255), `service_name` character varying(255) | `20260725000000` |
| `public.core_file_permissions` | 1 | — | `tenant_id` uuid | `20261007000004`, `20261007000005`… |
| `public.core_role_permissions` | 1 | — | `tenant_id` uuid | `001_iam.sql`, `20260724000004`… |
| `public.core_user_roles` | 1 | — | `tenant_id` uuid | `001_iam.sql`, `20260924110000`… |
| `public.search_logs` | 1 | — | `query` text | 无 |
| `public.todos` | 8 | 0 | `service` character varying(100), `priority` character varying(20) default 'medium'::character varying, `title` character varying(255), `due_date` date, `completed` boolean default false, `user_id` character varying(255), `created_at` timestamp with time zone default CURRENT_TIMESTAMP, `tenant_id` uuid | `20260908000017` |
| `qms.audit_logs` | 2 | 0 | `action` character varying(100), `user_id` uuid | `20260725000000`, `20260824000001`… |
| `qms.corrective_actions` | 3 | 0 | `status` character varying(20) default 'planned'::character varying, `tenant_id` uuid, `attachments` jsonb | `20260725000000`, `20260926120000`… |
| `qms.inspection_items` | 4 | 0 | `status` character varying(20) default 'pending'::character varying, `updated_at` timestamp with time zone default now(), `created_at` timestamp with time zone default now(), `tenant_id` uuid | `20260725000000`, `20260908000009`… |
| `qms.quality_inspections` | 1 | 0 | `tenant_id` uuid | `20260725000000`, `20260909000004`… |
| `qms.quality_standards` | 1 | 0 | `tenant_id` uuid | `20260725000000`, `20260909000004`… |
| `report.reports` | 3 | 0 | `tenant_id` uuid, `data` jsonb, `template_id` uuid | `20260724000005`, `20260725000000`… |

#### 4.2.1 取证门口径

逐表逐列回读应用代码（`svc/`、`lib/`、`apps/` 的 `.rs/.ts/.tsx`），只有满足任一条才保留在 B：

- **KEEP-W**：代码有显式 SQL 写入该列（`INSERT INTO` 列清单 / `UPDATE ... SET` 列）。
- **KEEP-R**：代码有显式 SQL 读取或过滤该列（`SELECT` 列清单、`WHERE/ORDER BY/GROUP BY`），prod 缺列会直接报错。

不计为证据：迁移/`database/` 下的 DDL、`schema_defense.rs` 的 `TABLE_DEFS`、测试代码、前端类型声明，以及 `RETURNING ... AS 列名` 结果集别名（别名不要求真实列存在）。所有命中均回读原文核对行号。

#### 4.2.2 保留的 B 类（18 列 / 11 表）

| 表 | 列 | 证据（file:line，已回读） | 类型 |
|---|---|---|---|
| `erp.holidays` | `date` | `svc/erp/src/modules/holidays.rs:107-108`（`FROM erp.holidays` + `WHERE ... date = $3`） | KEEP-R |
| `finance.finance_voucher_template_lines` | `debit_amount`, `credit_amount`, `account_id`, `account_name` | `svc/finance/src/services/finance/voucher_template.rs:189`（SELECT 列清单） | KEEP-R |
| `finance.finance_voucher_templates` | `voucher_type`, `is_default` | 同文件 `:215`（INSERT 列清单）、`:443`（UPDATE SET `is_default`） | KEEP-W |
| `gis.geodata` | `tenant_id` | `svc/gis/src/modules/geodata.rs:127-131`（INSERT 列清单） | KEEP-W |
| `gis.geofeatures` | `tenant_id` | `svc/gis/src/modules/geodata.rs:186-190`（INSERT 列清单） | KEEP-W |
| `gis.map_layers` | `tenant_id` | `svc/gis/src/modules/map.rs:391`（INSERT）、`:351-353`（WHERE） | KEEP-W |
| `gis.spatial_analysis` | `tenant_id` | `svc/gis/src/modules/spatial.rs:94-97`（INSERT 列清单） | KEEP-W |
| `portal.portal_todos` | `completed`, `user_id` | `svc/portal/src/modules/todos.rs:159-163`（INSERT）、`:217-221`（UPDATE SET `completed`） | KEEP-W |
| `public.alerts` | `tenant_id`, `severity`, `status` | `svc/monitor/src/modules/monitor/metrics.rs:475-478`（COUNT FILTER + WHERE） | KEEP-R |
| `public.core_file_permissions` | `tenant_id` | `svc/unified-core/src/modules/file/manage.rs:1023-1024`（INSERT + ON CONFLICT） | KEEP-W |
| `public.search_logs` | `query` | `svc/search/src/handlers.rs:479-482`（SELECT + WHERE + GROUP BY） | KEEP-R |

按模块重排后的批次（仅作口径，未开工）：`erp` 1 表 1 列；`finance` 2 表 6 列；`gis` 4 表 4 列；`portal` 1 表 2 列；`monitor` 1 表 3 列；`unified-core` 1 表 1 列；`search` 1 表 1 列。

#### 4.2.3 转 D 的 117 列（32 表，其中 `public.alerts` 部分转出）

| 表 | 转出列数 | 列清单 | 转出理由（取证结论） |
|---|---|---|---|
| `doc.documents` | 7 | `description`, `version`, `status`, `title`, `updated_at`, `content`, `tenant_id` | 代码实际读写 `core_doc_documents`（`svc/unified-core/src/modules/doc/services/document.rs:39`），未引用本表 |
| `doc.folders` | 2 | `name`, `updated_at` | 代码实际读写 `core_doc_folders`（`.../folder.rs:39`），未引用本表 |
| `doc.templates` | 9 | `updated_at`, `created_by`, `fields`, `created_at`, `content`, `tenant_id`, `category`, `name`, `description` | 代码实际读写 `core_doc_templates`（`.../template.rs:39`），未引用本表 |
| `doc_service.archives` | 1 | `created_at` | 仓库无 `doc_service` schema 的代码引用 |
| `doc_service.folders` | 2 | `updated_at`, `name` | 同上 |
| `doc_service.templates` | 12 | `description`, `code`, `created_by`, `created_at`, `content`, `tenant_id`, `name`, `variables`, `updated_at`, `version`, `type`, `is_active` | 同上 |
| `ehs.audit_logs` | 3 | `action`, `user_name`, `user_id` | 无代码引用；通用审计写入落 `public.audit_logs`（`lib/shared-auth/src/security/audit_logger.rs:466`），`schema_defense` 未声明这些列 |
| `erp.expenses` | 6 | `amount`, `expense_number`, `expense_type`, `department_id`, `status`, `applicant_name` | 仓库无本表 SQL 引用 |
| `erp.payables` | 2 | `project_id`, `contract_id` | `svc/erp/src/event_handlers/mod.rs:370/449` 的 INSERT/UPDATE 列清单不含这两列 |
| `erp.receivables` | 2 | `project_id`, `contract_id` | 同上（`:622/726` 的列清单不含这两列） |
| `finance.voucher_lines` | 1 | `tenant_id` | 代码实际用 `finance.core_finance_voucher_lines`；本表仅被 forecast 查询读 `amount/account_code`，未引用 `tenant_id` |
| `gis.audit_log` | 1 | `tenant_id` | 无代码引用 |
| `gis.audit_logs` | 2 | `user_id`, `action` | 无代码引用（仅测试） |
| `hrm.companies` | 1 | `email` | 仅 `contact_email as email` 结果集别名（`svc/hrm/src/modules/company.rs:177`），非真实列 |
| `iam.audit_logs` | 2 | `action`, `user_id` | IAM 审计实际写 `public.audit_logs`（`svc/unified-core/src/modules/iam/user/models.rs:58`） |
| `iam.permissions` | 5 | `resource`, `description`, `tenant_id`, `name`, `action` | 仓库无 `iam.permissions` 的 SQL 引用（权限走 `public.core_*`） |
| `lims.audit_logs` | 2 | `user_name`, `user_id` | 无代码引用；LIMS 审计实际读写 `qa_lims_audit_logs`（`svc/lims/src/modules/audit.rs:114-117`） |
| `lims.instruments` | 1 | `description` | 代码使用 `qa_lims_*` 表；`instruments` 在本表相关查询中是列名而非表引用 |
| `lims.reagents` | 8 | `unit`, `name`, `status`, `specification`, `quantity`, `updated_at`, `created_at`, `description` | 同上（`reagents` 是 `qa_lims_test_methods` 的列名，不是本表） |
| `lims.samples` | 4 | `sample_type`, `sample_no`, `description`, `source` | 代码使用 `qa_lims_*` 表，未引用本表 |
| `mail.templates` | 11 | `variables`, `status`, `tags`, `updated_at`, `description`, `code`, `created_by`, `created_at`, `tenant_id`, `category`, `name` | 通知模板实际落 `public.core_notification_templates`（`svc/communication/src/notification.rs:2637`） |
| `public.alert_rules` | 2 | `name`, `description` | 无 SQL 引用（规则在内存中） |
| `public.alerts` | 7 | `resolved_at`, `created_at`, `acknowledged_at`, `message`, `acknowledged_by`, `title`, `service_name` | 代码只读 `tenant_id/severity/status`（§4.2.2），这 7 列无引用 |
| `public.core_role_permissions` | 1 | `tenant_id` | 查询只读 `permission_id/role_id`，未引用 `tenant_id` |
| `public.core_user_roles` | 1 | `tenant_id` | 查询只读 `user_id/role_id`，未引用 `tenant_id` |
| `public.todos` | 8 | `service`, `priority`, `title`, `due_date`, `completed`, `user_id`, `created_at`, `tenant_id` | 代码实际用 `portal.portal_todos` |
| `qms.audit_logs` | 2 | `action`, `user_id` | 无代码引用 |
| `qms.corrective_actions` | 3 | `status`, `tenant_id`, `attachments` | 代码使用 `qms.qa_*` 业务表（如 `qa_approval_events`，`svc/qms/src/models/audit_log.rs:29`） |
| `qms.inspection_items` | 4 | `status`, `updated_at`, `created_at`, `tenant_id` | 同上，未引用本表 |
| `qms.quality_inspections` | 1 | `tenant_id` | 同上（业务表为 `qa_quality_inspections`） |
| `qms.quality_standards` | 1 | `tenant_id` | 同上 |
| `report.reports` | 3 | `tenant_id`, `data`, `template_id` | 仓库无本表 SQL 引用 |

**处置口径**：以上 117 列只登记、不补列；补列无运行时收益，且会让 prod 结构偏离最小必要集。prod 侧依旧**不删除**。后续如要清理 dev 侧存量，需另案并入 C-dev 评审。

迁移要点（仅对 §4.2.2 的 18 列生效）：
- 全部 `ADD COLUMN IF NOT EXISTS`，可重复执行；prod 表 0 行的表加列无数据风险。
- `NOT NULL` 列必须带默认值或分三步（加可空列 → 回填 → 设 NOT NULL）；有存量数据时不许直接加 `NOT NULL`。
- 迁移版本号需接在 `20261115130000` 之后；需与另一会话的“空壳表拆除”迁移错开版本，避免冲突。

#### 4.2.4 与「代码 → schema 缺口扫描」的口径边界（2026-11-15 追加）

本章只回答“两份 schema 差哪些列”，**不回答“运行时会在哪条路径炸”**。两者不是同一集合，不能互相替代。详见 [code-schema-gap-2026-11-15.md](./code-schema-gap-2026-11-15.md)。

- **子集截取会漏**：B 类收敛为 18 列 / 11 表时，`portal_todos` 只登记了 `user_id`、`completed`。HEAD 代码在同表还写 `service_code`、`service_name`、`todo_type`、`link_url` 四列（`svc/portal/src/modules/graphql_mutation_impls.rs:104`、`svc/portal/src/modules/todos.rs:59`）。这 4 列在 dev 里本来就有，差集能看见，是“只取已登记 18 列”这个子集动作漏掉的。
- **差集本身也会漏**：`iam.users.tenant_id` 在 dev 与 prod **都不存在**（`svc/communication/src/notification.rs:354`），两侧差集为空，但线上必然 42703。这类只有从代码侧扫才看得见。

**结论：补完本章 18 列 ≠ 运行路径修复完成。** 列集归属仍以本章（§4.1–§4.4）为准；运行期修复清单以代码侧扫描为准——那边另有 35 列 A 类缺口、8 列 B 类代码缺陷（dev 也没有）、9 张空壳表共 159 列、16 处类型漂移。

### 4.3 C 类：无代码引用、无数据依赖

**C-dev（仅 dev 删除）563 列 / 118 表**；**C-prod（prod 归档标记，不删）374 列 / 112 表**（另有 11 列经人工复核由 C-prod 转 A，见 §4.1）。

判定标准：HEAD 源码无窗口级代码引用（含前端类型/接口文件），且所属侧该表 0 行、该列无非空值。

**抽样复核（2026-11-15，10 表 / 34 列）**：按等距抽样回读代码，词法扫描初筛命中 2 列（`mes.production_orders.source`、`qualified_quantity`），逐行回读后确认前者是 `RETURNING ... AS source` 结果集别名、后者来自 `qi.qualified_quantity`（质量检验表），**均非本表真实列引用**。抽样确认引用率 **0/34**；按 rule of three，真实比例 95% 上界约 8.8%（全量 374 列的上界约 33 列）。结论：本抽样未见 C-prod 判定基础被系统性推翻，但 `mes.production_orders` 这类“代码用别名遮蔽同名列”的表存在词法误判风险，全量复核时应剔除别名后再判。

| 表 | 侧 | 列数 | 列清单 | 处置 |
|---|---|---|---|---|
| `ai.ai_settings` | prod | 2 | `deleted_at`, `id` | prod 归档（不删） |
| `ai.model_usage_stats` | dev | 6 | `updated_at`, `created_at`, `cost`, `input_tokens`, `output_tokens`, `requests` | dev 删除 |
| `ai.usage_logs` | prod | 1 | `token_count` | prod 归档（不删） |
| `analytics.reports` | prod | 1 | `output_format` | prod 归档（不删） |
| `communication.core_notification_deliveries` | dev | 1 | `deleted_at` | dev 删除 |
| `communication.core_notification_subscriptions` | dev | 1 | `deleted_at` | dev 删除 |
| `crm.interactions` | prod | 2 | `interaction_time`, `type` | prod 归档（不删） |
| `doc.document_versions` | dev | 8 | `version`, `document_id`, `content_type`, `change_log`, `created_by`, `created_at`, `content`, `tenant_id` | dev 删除 |
| `doc.documents` | dev | 17 | `published_at`, `file_size`, `folder_id`, `file_name`, `archived_by`, `published_by`, `template_id`, `content_type`, `archived_at`, `created_by`, `file_path`, `created_at`, `content_hash`, `chunk_count`, `processed_at`, `error_message`, `knowledge_base_id` | dev 删除 |
| `doc.folders` | dev | 7 | `sort_order`, `created_at`, `description`, `created_by`, `tenant_id`, `parent_id`, `is_enabled` | dev 删除 |
| `doc.templates` | dev | 3 | `is_default`, `is_enabled`, `content_type` | dev 删除 |
| `doc_service.archives` | dev | 19 | `archived_at`, `created_by`, `creator`, `retention_period`, `tenant_id`, `keywords`, `category_id`, `source_id`, `department_id`, `status`, `created_date`, `updated_at`, `summary`, `security_level`, `archived_by`, `source_module`, `archive_no`, `file_id`, `title` | dev 删除 |
| `doc_service.folders` | dev | 4 | `created_by`, `created_at`, `parent_id`, `tenant_id` | dev 删除 |
| `ehs.audit_logs` | dev | 7 | `resource_type`, `ip_address`, `old_values`, `resource_id`, `new_values`, `module`, `created_at` | dev 删除 |
| `ehs.drill_records` | dev | 14 | `updated_at`, `issues_found`, `drill_date`, `created_by`, `plan_id`, `created_at`, `attachments`, `duration_hours`, `participants`, `location`, `summary`, `drill_no`, `improvements`, `drill_name` | dev 删除 |
| `ehs.emergency_plans` | dev | 12 | `trigger_conditions`, `created_by`, `plan_no`, `responsible_persons`, `created_at`, `name`, `plan_type`, `status`, `scope`, `updated_at`, `contact_info`, `response_procedures` | dev 删除 |
| `ehs.environmental_alerts` | dev | 12 | `alert_time`, `created_at`, `point_id`, `alert_type`, `parameter`, `actual_value`, `alert_level`, `status`, `handled_time`, `threshold_value`, `handle_result`, `handled_by` | dev 删除 |
| `ehs.environmental_data` | dev | 8 | `created_at`, `remarks`, `data_time`, `point_id`, `unit`, `parameter`, `value`, `quality` | dev 删除 |
| `ehs.health_checkups` | dev | 14 | `attachments`, `status`, `updated_at`, `next_checkup_date`, `checkup_date`, `employee_id`, `abnormal_items`, `checkup_type`, `created_by`, `institution`, `created_at`, `recommendations`, `employee_name`, `result_summary` | dev 删除 |
| `ehs.health_records` | dev | 2 | `allergies`, `created_by` | dev 删除 |
| `ehs.qa_ehs_hazards` | prod | 2 | `controls`, `assessments` | prod 归档（不删） |
| `ehs.qa_ehs_risks` | prod | 4 | `location`, `mitigation`, `department_id`, `created_by` | prod 归档（不删） |
| `ehs.risk_controls` | dev | 12 | `implementation_plan`, `responsible_person`, `created_by`, `completion_date`, `assessment_id`, `created_at`, `control_type`, `control_measure`, `target_date`, `effectiveness`, `status`, `updated_at` | dev 删除 |
| `ehs.vaccination_records` | dev | 16 | `created_by`, `institution`, `dose_number`, `created_at`, `employee_name`, `vaccine_name`, `expiry_date`, `attachments`, `remarks`, `status`, `batch_number`, `next_dose_date`, `updated_at`, `vaccination_date`, `vaccine_type`, `employee_id` | dev 删除 |
| `erp.bank_accounts` | prod | 1 | `bank_code` | prod 归档（不删） |
| `erp.core_erp_materials` | dev | 10 | `unit`, `status`, `specification`, `updated_at`, `price`, `created_at`, `tenant_id`, `category`, `name`, `code` | dev 删除 |
| `erp.documents` | prod | 7 | `mime_type`, `chunk_count`, `processed_at`, `error_message`, `knowledge_base_id`, `tags`, `content_hash` | prod 归档（不删） |
| `erp.expenses` | dev | 9 | `updated_at`, `description`, `approved_at`, `approver_id`, `created_at`, `expense_date`, `receipt_count`, `organization_id`, `reimbursed_at` | dev 删除 |
| `erp.holidays` | dev | 6 | `tenant_id`, `name`, `year`, `kind`, `deleted_at`, `id` | dev 删除 |
| `erp.inventory_items` | dev | 1 | `deleted_at` | dev 删除 |
| `erp.meeting_bookings` | dev | 2 | `notes`, `attendees` | dev 删除 |
| `erp.payables` | dev | 3 | `due_date`, `payment_schedule`, `organization_id` | dev 删除 |
| `erp.vehicle_requests` | dev | 5 | `reason`, `department`, `applicant`, `passengers`, `destination` | dev 删除 |
| `finance.budgets` | prod | 6 | `total_amount`, `approved_at`, `created_by`, `start_date`, `approver_id`, `end_date` | prod 归档（不删） |
| `finance.core_finance_approval_nodes` | prod | 2 | `approver_id`, `node_config` | prod 归档（不删） |
| `finance.core_finance_payment_workflow` | dev | 5 | `approval_history`, `workflow_name`, `approved_at`, `comment`, `created_by` | dev 删除 |
| `finance.core_finance_payments` | prod | 1 | `approved_at` | prod 归档（不删） |
| `finance.cqrs_events` | dev | 1 | `tenant_id` | dev 删除 |
| `finance.erp_collection_records` | prod | 3 | `fiscal_year`, `category`, `invoice_date` | prod 归档（不删） |
| `finance.erp_payables` | prod | 2 | `category`, `paid_at` | prod 归档（不删） |
| `finance.erp_payment_records` | prod | 1 | `due_date` | prod 归档（不删） |
| `finance.expenses` | prod | 3 | `paid_amount`, `remaining_amount`, `created_by` | prod 归档（不删） |
| `finance.finance_audit_log` | dev | 1 | `deleted_at` | dev 删除 |
| `finance.finance_budget_variances_v53` | dev | 1 | `deleted_at` | dev 删除 |
| `finance.finance_cash_flow_predictions_v53` | dev | 1 | `deleted_at` | dev 删除 |
| `finance.finance_prediction_models_v53` | dev | 1 | `deleted_at` | dev 删除 |
| `finance.finance_v55_invoices` | prod | 1 | `project_id` | prod 归档（不删） |
| `finance.finance_v55_payment_requests` | prod | 1 | `status` | prod 归档（不删） |
| `finance.finance_v55_reconciliation_results` | prod | 1 | `status` | prod 归档（不删） |
| `finance.finance_v55_reconciliation_rules` | prod | 1 | `recon_code` | prod 归档（不删） |
| `finance.finance_voucher_template_lines` | dev | 1 | `updated_at` | dev 删除 |
| `finance.finance_voucher_templates` | dev | 2 | `default_credit_account`, `default_debit_account` | dev 删除 |
| `finance.financial_reports` | prod | 1 | `name` | prod 归档（不删） |
| `finance.mv_receivable_aging` | dev | 8 | `deleted_at`, `days_overdue`, `received_amount`, `created_at`, `amount`, `receivable_no`, `due_date`, `invoice_no` | dev 删除 |
| `finance.mv_voucher_summary` | dev | 4 | `deleted_at`, `total_credit`, `period`, `total_debit` | dev 删除 |
| `finance.payables` | prod | 4 | `approved_at`, `amount_paid`, `approver_id`, `remaining_amount` | prod 归档（不删） |
| `finance.receivables` | prod | 5 | `remaining_amount`, `approved_at`, `amount_received`, `approver_id`, `paid_amount` | prod 归档（不删） |
| `finance.reconciliation_item_snapshots` | dev | 10 | `recon_id`, `debit_amount`, `credit_amount`, `business_no`, `amount`, `business_id`, `item_type`, `reconciliation_id`, `status`, `remark` | dev 删除 |
| `finance.reconciliation_snapshots` | prod | 4 | `unmatched_amount`, `project_id`, `matched_amount`, `total_amount` | prod 归档（不删） |
| `flow.approval_records` | dev | 4 | `tenant_id`, `new_status`, `previous_status`, `actor_name` | dev 删除 |
| `flow.core_doc_document_versions` | dev | 1 | `deleted_at` | dev 删除 |
| `flow.core_favorites` | dev | 1 | `deleted_at` | dev 删除 |
| `flow.core_workflow_versions` | prod | 7 | `updated_at`, `status`, `description`, `tenant_id`, `code`, `name`, `published_at` | prod 归档（不删） |
| `gis.device_location_records` | prod | 1 | `located_at` | prod 归档（不删） |
| `gis.geofence_alerts` | dev | 7 | `triggered_at`, `device_code`, `acknowledged`, `position`, `geofence_id`, `tenant_id`, `alert_type` | dev 删除 |
| `hrm.hrm_cache_invalidation_logs` | dev | 1 | `deleted_at` | dev 删除 |
| `iam.audit_logs` | dev | 7 | `user_agent`, `created_at`, `tenant_id`, `details`, `resource`, `ip_address`, `resource_id` | dev 删除 |
| `iam.position_permissions` | dev | 1 | `created_at` | dev 删除 |
| `iam.position_roles` | dev | 1 | `created_at` | dev 删除 |
| `iam.user_positions` | dev | 1 | `created_at` | dev 删除 |
| `integration.crm_erp_sync` | dev | 2 | `updated_at`, `crm_product_id` | dev 删除 |
| `integration.crm_scm_sync` | dev | 1 | `updated_at` | dev 删除 |
| `integration.erp_wms_sync` | dev | 2 | `erp_sales_order_id`, `updated_at` | dev 删除 |
| `integration.hrm_finance_sync` | dev | 1 | `updated_at` | dev 删除 |
| `integration.integration_sync_logs` | dev | 8 | `deleted_at`, `total_count`, `success_count`, `completed_at`, `error_message`, `created_at`, `updated_at`, `failed_count` | dev 删除 |
| `lims.ai_analyses` | dev | 8 | `prompt`, `entity_type`, `analysis_type`, `created_by`, `ai_service_url`, `created_at`, `entity_id`, `response` | dev 删除 |
| `lims.audit_logs` | dev | 7 | `details`, `target_type`, `target_id`, `created_at`, `action_type`, `ip_address`, `target_name` | dev 删除 |
| `lims.document_relations` | dev | 11 | `created_at`, `doc_service_file_id`, `description`, `doc_service_url`, `entity_id`, `file_size`, `entity_type`, `file_name`, `file_type`, `updated_at`, `created_by` | dev 删除 |
| `lims.inspection_records` | dev | 9 | `attachments`, `instrument_id`, `inspection_no`, `updated_at`, `sample_code`, `sample_id`, `inspection_type`, `status`, `inspected_at` | dev 删除 |
| `lims.instruments` | dev | 5 | `responsible_person`, `next_calibration_date`, `purchase_date`, `maintenance_history`, `calibration_date` | dev 删除 |
| `lims.lab_ledger` | dev | 10 | `description`, `code`, `created_by`, `created_at`, `name`, `ledger_type`, `status`, `location`, `quantity`, `updated_at` | dev 删除 |
| `lims.maintenance_records` | prod | 6 | `result`, `status`, `planned_date`, `actual_end_date`, `actual_start_date`, `conclusion` | prod 归档（不删） |
| `lims.reagent_usages` | dev | 6 | `usage_date`, `created_at`, `reagent_id`, `used_by`, `quantity`, `purpose` | dev 删除 |
| `lims.reagents` | dev | 7 | `category`, `supplier`, `location`, `batch_number`, `storage_condition`, `expiration_date`, `code` | dev 删除 |
| `master_data.mdm_billing_records` | dev | 1 | `deleted_at` | dev 删除 |
| `master_data.mdm_sla_incidents` | dev | 1 | `deleted_at` | dev 删除 |
| `master_data.mdm_sla_measurements` | dev | 1 | `deleted_at` | dev 删除 |
| `master_data.mdm_subscriptions` | dev | 1 | `deleted_at` | dev 删除 |
| `master_data.mdm_usage_records` | dev | 1 | `deleted_at` | dev 删除 |
| `mes.process_flow_steps` | prod | 6 | `operation_type`, `step_no`, `process_flow_id`, `step_name`, `updated_at`, `duration_seconds` | prod 归档（不删） |
| `mes.production_orders` | prod | 2 | `source`, `qualified_quantity` | prod 归档（不删） |
| `mes.production_records` | prod | 9 | `equipment_id`, `product_name`, `qualified_quantity`, `quantity`, `quantity_produced`, `unqualified_quantity`, `record_no`, `quantity_defective`, `product_code` | prod 归档（不删） |
| `mes.work_reports` | dev | 1 | `organization_id` | dev 删除 |
| `mobile.documents` | prod | 7 | `content_hash`, `processed_at`, `error_message`, `knowledge_base_id`, `mime_type`, `tags`, `chunk_count` | prod 归档（不删） |
| `mobile.oa_announcement_reads` | prod | 1 | `created_at` | prod 归档（不删） |
| `pm.acceptance_items` | prod | 1 | `expected_result` | prod 归档（不删） |
| `pm.acceptance_records` | prod | 10 | `acceptance_type`, `record_code`, `accepted_at`, `participants`, `actual_result`, `result`, `is_passed`, `attachments`, `record_name`, `required_standard` | prod 归档（不删） |
| `pm.budget_items` | prod | 6 | `name`, `status`, `budget_code`, `actual_amount`, `planned_amount`, `remaining_amount` | prod 归档（不删） |
| `pm.contract_milestones` | prod | 3 | `amount`, `planned_date`, `milestone_type` | prod 归档（不删） |
| `pm.contract_payment_schedule` | dev | 6 | `expense_ref_id`, `actual_payment_amount`, `invoice_number`, `payment_type`, `payment_date`, `amount` | dev 删除 |
| `pm.contract_templates` | prod | 3 | `version`, `code`, `template_type` | prod 归档（不删） |
| `pm.defects` | prod | 2 | `description`, `assignee_id` | prod 归档（不删） |
| `pm.document_folders` | prod | 1 | `name` | prod 归档（不删） |
| `pm.document_versions` | prod | 2 | `document_name`, `document_code` | prod 归档（不删） |
| `pm.documents` | prod | 6 | `chunk_count`, `content_hash`, `processed_at`, `error_message`, `knowledge_base_id`, `mime_type` | prod 归档（不删） |
| `pm.notification_settings` | prod | 2 | `notify_events`, `notify_channels` | prod 归档（不删） |
| `pm.pm_budget_items` | dev | 1 | `deleted_at` | dev 删除 |
| `pm.pm_master_data_refs` | dev | 14 | `payload_snapshot`, `updated_at`, `code`, `last_synced_at`, `created_at`, `local_entity_id`, `name`, `source_service`, `local_entity_type`, `status`, `master_data_id`, `domain`, `deleted_at`, `id` | dev 删除 |
| `pm.project_documents` | prod | 7 | `title`, `change_note`, `file_name`, `folder_name`, `file_type`, `category`, `folder_id` | prod 归档（不删） |
| `pm.project_members` | dev | 4 | `leave_date`, `status`, `user_name`, `join_date` | dev 删除 |
| `pm.project_reports` | dev | 1 | `generated_by` | dev 删除 |
| `pm.project_risks` | dev | 1 | `created_by` | dev 删除 |
| `pm.risk_events` | prod | 6 | `updated_at`, `description`, `event_date`, `created_by`, `event_name`, `impact` | prod 归档（不删） |
| `pm.service_integrations` | dev | 9 | `api_base_url`, `api_key`, `sync_config`, `sync_enabled`, `service_name`, `updated_at`, `created_at`, `tenant_id`, `is_active` | dev 删除 |
| `pm.settlement_adjustments` | prod | 3 | `adjustment_name`, `status`, `updated_at` | prod 归档（不删） |
| `pm.settlement_items` | prod | 3 | `amount`, `name`, `status` | prod 归档（不删） |
| `portal.graphql_breaking_changes` | prod | 1 | `version_id` | prod 归档（不删） |
| `portal.graphql_execution_profiles` | prod | 1 | `query_hash` | prod 归档（不删） |
| `portal.graphql_stream_events` | prod | 1 | `stream_id` | prod 归档（不删） |
| `portal.graphql_stream_subscribers` | prod | 1 | `stream_id` | prod 归档（不删） |
| `portal.portal_accel_configs` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_acceleration_configs` | prod | 1 | `strategy` | prod 归档（不删） |
| `portal.portal_announcements` | dev | 10 | `publish_date`, `updated_at`, `announcement_type`, `created_at`, `content`, `author`, `expire_date`, `priority`, `status`, `title` | dev 删除 |
| `portal.portal_api_versions` | prod | 1 | `version` | prod 归档（不删） |
| `portal.portal_cache_entries` | prod | 2 | `cache_key`, `checksum` | prod 归档（不删） |
| `portal.portal_cache_versions` | prod | 1 | `version_id` | prod 归档（不删） |
| `portal.portal_compatibility_policies` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_compiled_queries` | prod | 1 | `hash` | prod 归档（不删） |
| `portal.portal_config_environments` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_consistency_checks` | prod | 1 | `checked_at` | prod 归档（不删） |
| `portal.portal_edge_cache` | prod | 1 | `cache_key` | prod 归档（不删） |
| `portal.portal_edge_functions` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_health_checks` | prod | 1 | `check_type` | prod 归档（不删） |
| `portal.portal_identity_policies` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_metrics` | prod | 1 | `checked_at` | prod 归档（不删） |
| `portal.portal_notifications` | dev | 1 | `deleted_at` | dev 删除 |
| `portal.portal_persisted_queries` | prod | 1 | `query_hash` | prod 归档（不删） |
| `portal.portal_queue_configs` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_security_policies` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_service_descriptors` | prod | 1 | `name` | prod 归档（不删） |
| `portal.portal_service_heartbeats` | prod | 1 | `checked_at` | prod 归档（不删） |
| `portal.portal_service_loads` | prod | 1 | `service_id` | prod 归档（不删） |
| `portal.portal_subscription_channels` | prod | 1 | `channel` | prod 归档（不删） |
| `portal.portal_version_vectors` | prod | 1 | `entity_id` | prod 归档（不删） |
| `public._archive_core_doc_documents` | dev | 21 | `file_name`, `template_id`, `status`, `content_type`, `title`, `folder_id`, `updated_at`, `version`, `archived_by`, `published_by`, `created_at`, `content`, `description`, `archived_at`, `created_by`, `file_path`, `file_size`, `tags`, `tenant_id`, `mime_type`, `published_at` | dev 删除 |
| `public._archive_core_doc_folders` | dev | 9 | `updated_at`, `tenant_id`, `sort_order`, `description`, `created_by`, `created_at`, `name`, `parent_id`, `is_enabled` | dev 删除 |
| `public._archive_core_doc_templates` | dev | 12 | `created_by`, `fields`, `created_at`, `content`, `tenant_id`, `category`, `name`, `is_default`, `is_enabled`, `content_type`, `updated_at`, `description` | dev 删除 |
| `public.alert_rules` | dev | 8 | `enabled`, `actions`, `condition`, `service_name`, `updated_at`, `created_at`, `tenant_id`, `severity` | dev 删除 |
| `public.analytics_sync_records` | dev | 12 | `affected_records`, `sync_type`, `error_message`, `created_at`, `tenant_id`, `status`, `records_count`, `completed_at`, `duration_ms`, `updated_at`, `started_at`, `data_source_id` | dev 删除 |
| `public.automation_rules` | prod | 1 | `trigger_type` | prod 归档（不删） |
| `public.automation_runs` | prod | 3 | `updated_at`, `finished_at`, `output` | prod 归档（不删） |
| `public.conversion_executions` | prod | 12 | `target_data`, `started_at`, `rule_id`, `status`, `tenant_id`, `source_data`, `source_record_id`, `rule_code`, `completed_at`, `retry_count`, `error_message`, `target_record_id` | prod 归档（不删） |
| `public.conversion_rules` | prod | 19 | `stop_on_failure`, `trigger_type`, `is_enabled`, `updated_at`, `target_entity`, `retry_interval_secs`, `priority`, `created_at`, `status`, `transform_script`, `description`, `tenant_id`, `field_mappings`, `max_retries`, `target_system`, `trigger_condition`, `name`, `source_entity`, `source_system` | prod 归档（不删） |
| `public.core_api_version_configs` | dev | 1 | `tenant_id` | dev 删除 |
| `public.core_doc_document_versions` | dev | 1 | `deleted_at` | dev 删除 |
| `public.core_flow_delegates` | prod | 1 | `tenant_id` | prod 归档（不删） |
| `public.core_flow_rules` | prod | 1 | `tenant_id` | prod 归档（不删） |
| `public.core_flow_variable_history` | dev | 2 | `deleted_at`, `tenant_id` | dev 删除 |
| `public.core_flow_variables` | prod | 1 | `tenant_id` | prod 归档（不删） |
| `public.core_ticket_activities` | prod | 6 | `action`, `from_value`, `tenant_id`, `user_id`, `to_value`, `ticket_id` | prod 归档（不删） |
| `public.core_ticket_comments` | prod | 6 | `is_internal`, `content`, `tenant_id`, `user_id`, `ticket_id`, `user_name` | prod 归档（不删） |
| `public.core_ticket_sla_escalations` | prod | 6 | `escalated_to`, `escalation_time`, `level`, `tenant_id`, `ticket_id`, `reason` | prod 归档（不删） |
| `public.core_ticket_sla_policies` | prod | 19 | `resolution_hours`, `updated_at`, `ticket_type`, `is_active`, `is_default`, `created_at`, `working_hours_only`, `response_hours`, `description`, `tenant_id`, `weekend_excluded`, `escalation_levels`, `business_hours_start`, `business_hours_end`, `name`, `severity`, `escalation_hours_3`, `escalation_hours_1`, `escalation_hours_2` | prod 归档（不删） |
| `public.core_tickets` | prod | 17 | `source_business_id`, `ticket_no`, `closed_at`, `reporter_id`, `source_service`, `sla_due_at`, `created_at`, `updated_at`, `ticket_type`, `tags`, `tenant_id`, `status`, `resolved_at`, `description`, `title`, `assignee_id`, `severity` | prod 归档（不删） |
| `public.core_workflow_versions` | prod | 1 | `updated_at` | prod 归档（不删） |
| `public.cqrs_events` | dev | 10 | `payload`, `aggregate_type`, `event_type`, `aggregate_id`, `occurred_at`, `metadata`, `deleted_at`, `version`, `created_at`, `updated_at` | dev 删除 |
| `public.pdm_change_notices` | prod | 1 | `change_no` | prod 归档（不删） |
| `public.pdm_materials` | prod | 1 | `description` | prod 归档（不删） |
| `public.pdm_products` | prod | 1 | `code` | prod 归档（不删） |
| `public.permission_audit_logs` | prod | 1 | `metadata` | prod 归档（不删） |
| `public.process_flow_steps` | prod | 8 | `work_station_id`, `quality_check_required`, `process_id`, `sequence`, `standard_time`, `equipment_ids`, `wait_time`, `transfer_time` | prod 归档（不删） |
| `public.process_flows` | prod | 5 | `route_id`, `production_line`, `version`, `code`, `unit` | prod 归档（不删） |
| `public.qa_ehs_accident_investigations` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_accident_reviews` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_accident_treatments` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_accidents` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_compliance_items` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_contraindications` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_detection_records` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_emergency_plans` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_environment` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_hazard_rectifications` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_hazard_verifications` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_hazardous_materials` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_health_abnormalities` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_health_exam_plans` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_health_exam_records` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_health_trainings` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_inspection_items` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_inspection_plans` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_material_stocks` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_protection_measures` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_risks` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_stock_records` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_sync_records` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_ehs_trainings` | dev | 1 | `tenant_id` | dev 删除 |
| `public.qa_qms_sync_records` | dev | 1 | `updated_at` | dev 删除 |
| `public.system_settings` | prod | 1 | `is_active` | prod 归档（不删） |
| `public.user_settings` | dev | 9 | `timezone`, `default_dashboard`, `auto_refresh`, `tenant_id`, `notification_sound`, `refresh_interval`, `sound_enabled`, `auto_sync`, `sync_interval` | dev 删除 |
| `qms.audit_logs` | dev | 10 | `user_agent`, `created_at`, `tenant_id`, `details`, `resource`, `ip_address`, `organization_id`, `old_values`, `resource_id`, `new_values` | dev 删除 |
| `qms.corrective_actions` | dev | 42 | `verified_by_id`, `estimated_cost`, `implementation_date`, `effectiveness_result`, `actual_start_date`, `assigned_to_id`, `organization_id`, `resources_required`, `planned_end_date`, `root_cause_analysis`, `notes`, `verified_by`, `title`, `verification_date`, `verification_notes`, `assigned_to`, `updated_at`, `created_by`, `issue_id`, `verification_criteria`, `recurrence_check_date`, `department`, `verification_result`, `progress_percentage`, `follow_up_actions`, `verification_method`, `created_at`, `action_number`, `effectiveness_review_date`, `immediate_action`, `action_type`, `actual_end_date`, `category`, `preventive_action`, `planned_start_date`, `description`, `actual_cost`, `implementation_details`, `recurrence_found`, `effectiveness`, `long_term_action`, `updated_by` | dev 删除 |
| `qms.inspection_items` | dev | 18 | `actual_value`, `organization_id`, `notes`, `specification`, `item_category`, `requirement`, `expected_value`, `tolerance`, `result`, `item_number`, `created_by`, `is_critical`, `inspection_id`, `updated_by`, `unit`, `item_name`, `deviation`, `test_method` | dev 删除 |
| `qms.qa_approval_events` | dev | 1 | `deleted_at` | dev 删除 |
| `qms.qa_inspection_plan_items` | dev | 1 | `deleted_at` | dev 删除 |
| `qms.quality_issues` | dev | 47 | `regulatory_body`, `location`, `updated_at`, `root_cause`, `assigned_to_id`, `related_inspection_id`, `customer_name`, `impact_analysis`, `reported_date`, `affected_quantity`, `discovered_date`, `title`, `due_date`, `recurrence_probability`, `reported_by`, `customer_impacted`, `affected_object_name`, `issue_type`, `assigned_to`, `assigned_date`, `description`, `actual_cost`, `created_by`, `source`, `issue_number`, `cost_estimate`, `resolution_time_hours`, `customer_notification_date`, `discovered_by`, `risk_level`, `updated_by`, `created_at`, `tenant_id`, `category`, `regulatory_impact`, `source_reference`, `organization_id`, `severity`, `attachments`, `affected_object_id`, `priority`, `notes`, `affected_batch`, `status`, `resolved_date`, `related_standard_id`, `affected_object_type` | dev 删除 |
| `report.reports` | prod | 1 | `output_format` | prod 归档（不删） |
| `rs.equipment_inspections` | prod | 15 | `location`, `vibration`, `inspection_date`, `abnormalities`, `remarks`, `created_at`, `updated_at`, `status`, `inspector`, `equipment_code`, `items`, `equipment_name`, `noiselevel`, `temperature`, `equipment_id` | prod 归档（不删） |
| `rs.equipment_maintenance_records` | prod | 12 | `maintenance_type`, `cost`, `equipment_id`, `remarks`, `updated_at`, `result`, `end_time`, `maintainer`, `created_at`, `status`, `description`, `start_time` | prod 归档（不删） |
| `rs.rs_experiments` | dev | 1 | `deleted_at` | dev 删除 |
| `rs.rs_formulas` | dev | 1 | `deleted_at` | dev 删除 |
| `srm.bids` | prod | 1 | `comparison_note` | prod 归档（不删） |
| `unified_core.documents` | prod | 7 | `content_hash`, `mime_type`, `chunk_count`, `processed_at`, `error_message`, `knowledge_base_id`, `tags` | prod 归档（不删） |
| `wms.locations` | prod | 2 | `address`, `properties` | prod 归档（不删） |
| `wms.replenishment_suggestions` | prod | 1 | `org_id` | prod 归档（不删） |
| `wms.sync_record_details` | dev | 1 | `deleted_at` | dev 删除 |
| `wms.wms_approval_events` | dev | 1 | `created_at` | dev 删除 |

> prod 侧的 C-prod 列**不进入任何删除建议**：prod 在跑二进制仍可能按 `SELECT *` / 结构体映射读取这些列，删除会直接破坏现网。仅在 §6 的“待立项”中列出归档评估前置条件。


### 4.4 D 类：口径不一 / 无法判定

两侧表上的 D 类共 **1745 列**（原 1618 + 由 A 复核改判 10 + 由 B 取证门转出 117，见 §4.2.3），按根因归并。

**计数口径对齐（重要）**：实测定义不一致共 **1593 列 / 522 表 / 433 种逐字签名**（签名 = dev 与 prod 的 `(udt,len,prec,scale,null,default,identity,generated)` 全要素组合）；按 `(类型族, 可空, 默认值类别)` 粗抽象为 **148 种模式**；再按根因聚为下表 **13 类**。你提到的“**174 个模式**”我**无法复现**——它不对应上述任何一种抽象粒度的计数，也没有找到对应的生成脚本或维度定义。因此本节按 13 类根因分组，不逐列铺 1593 行；如要与 174 严格对齐，需要补充该计数的抽象维度或脚本。

| # | 根因 | 列数 | 典型差异（dev → prod） | 影响面 | 判定所需补充证据 |
|---|---|---|---|---|---|
| 1 | 可空性不同 | 589 | uuid NN D:'00000000-0000-0000-0000-000 → uuid D:'00000000-0000-0000-0000-000 | 代表列：`wms.stock_takes.org_id`, `flow.core_workflow_versions.workflow_id`, `flow.core_workflow_versions.definition` | 需确认业务是否依赖“必须非空”的写入约束；前端表单校验与后端 insert 是否一致 |
| 2 | dev 有数据但无代码引用 | 287 | 仅dev侧存在 | 代表列：`public.navigation_menu.order`, `public.navigation_menu.is_visible`, `public.navigation_menu.service` | 需确认是否为试验数据，可先导出再删 |
| 3 | 其他默认值不同 | 242 | integer D:0 → integer | 代表列：`wms.stock_takes.discrepancy_items`, `wms.stock_takes.counted_items`, `wms.stock_takes.organization_id` | 需确认默认值语义 |
| 4 | 长度不同 | 138 | character varying(256) NN → character varying(200) NN D:''::character varying | 代表列：`public.system_settings.key`, `ehs.training_records.certificate_no`, `ehs.training_records.employee_id` | 需确认最长值；dev 可先用 `max(length(col))` 实测 |
| 5 | varchar ↔ text | 132 | character varying(50) → text | 代表列：`wms.stock_takes.material_category`, `wms.stock_takes.material_code`, `wms.stock_takes.location_code` | 需确认是否有长度上限校验依赖 DB 约束 |
| 6 | uuid 默认值实现不同 | 109 | uuid NN D:uuid_generate_v4() → uuid NN D:gen_random_uuid() | 代表列：`wms.stock_takes.id`, `finance.expenses.id`, `wms.cycle_count_configs.id` | 纯实现差异，功能等价；统一到一个函数即可，需确认扩展 `uuid-ossp` 是否在两侧都可用 |
| 7 | 其他类型族不同 | 41 | timestamp with time zone → time without time zone | 代表列：`wms.stock_takes.start_time`, `wms.stock_takes.end_time`, `flow.core_workflow_versions.version` | 需按列单独确认 |
| 8 | date ↔ timestamptz | 33 | date → timestamp with time zone | 代表列：`wms.stock_takes.adjustment_date`, `wms.stock_takes.planned_date`, `wms.stock_takes.actual_date` | 语义不同（日期 vs 时刻），需确认前端传参与时区口径 |
| 9 | now() ↔ CURRENT_TIMESTAMP | 23 | timestamp with time zone NN D:CURRENT_TIMESTAMP → timestamp with time zone NN D:now() | 代表列：`finance.core_finance_payment_workflow.updated_at`, `finance.core_finance_payment_workflow.created_at`, `erp.meeting_rooms.updated_at` | 语义等价（同事务时间），可低风险统一 |
| 10 | 未判定 | 13 | numeric(5,2) → numeric(8,2) | 代表列：`pm.acceptance_records.score`, `ehs.training_records.score`, `finance.receivables.received_amount` | 需人工看图确认 |
| 11 | 有数据但无代码引用 | 5 | 仅prod侧存在 | 代表列：`pm.project_type_configs.name_en`, `ai.ai_models.token_count`, `ai.ai_models.usage` | 需确认该列是否被外部报表/BI/手工 SQL 使用 |
| 12 | jsonb ↔ 数组/文本 | 5 | jsonb D:'[]'::jsonb → array | 代表列：`erp.meeting_rooms.facilities`, `ehs.qa_ehs_hazardous_materials.hazard_class`, `ehs.qa_ehs_hazard_factors.sources` | 序列化格式不同，跨库读写会失败，需统一 |
| 13 | 整型宽度 | 1 | integer D:0 → bigint D:0 | 代表列：`crm.customer_segments.customer_count` | 需确认是否可能溢出 |

#### 4.4.1 D 类按表分布（每列都可回溯到上表根因）

| 表 | 定义不一致 | prod 有 dev 无（有数据/待判） | dev 有 prod 无（有数据/待判） | 合计 |
|---|---|---|---|---|
| `qms.quality_inspections` | 1 | 0 | 42 | 43 |
| `qms.quality_standards` | 1 | 0 | 25 | 26 |
| `finance.core_finance_vouchers` | 0 | 0 | 26 | 26 |
| `qms.dashboard_metrics` | 1 | 0 | 20 | 21 |
| `wms.stock_takes` | 21 | 0 | 0 | 21 |
| `ehs.safety_incidents` | 0 | 0 | 20 | 20 |
| `ehs.risk_assessments` | 0 | 0 | 20 | 20 |
| `wms.replenishment_suggestions` | 19 | 0 | 0 | 19 |
| `ehs.training_programs` | 8 | 0 | 10 | 18 |
| `crm.customers` | 17 | 0 | 0 | 17 |
| `rs.experiments` | 14 | 0 | 0 | 14 |
| `wms.batches` | 14 | 0 | 0 | 14 |
| `wms.discrepancy_records` | 14 | 0 | 0 | 14 |
| `mes.equipment_oee` | 14 | 0 | 0 | 14 |
| `wms.stock_take_items` | 14 | 0 | 0 | 14 |
| `ehs.monitoring_points` | 0 | 0 | 13 | 13 |
| `pm.project_risks` | 13 | 0 | 0 | 13 |
| `public.navigation_menu` | 1 | 0 | 11 | 12 |
| `mes.work_reports` | 12 | 0 | 0 | 12 |
| `portal.portal_quick_actions` | 0 | 0 | 11 | 11 |
| `ai.documents` | 10 | 0 | 1 | 11 |
| `finance.mv_receivable_aging` | 11 | 0 | 0 | 11 |
| `integration.crm_scm_sync` | 11 | 0 | 0 | 11 |
| `crm.opportunities` | 11 | 0 | 0 | 11 |
| `hrm.audit_logs` | 3 | 0 | 7 | 10 |
| `lims.samples` | 7 | 0 | 3 | 10 |
| `ehs.safety_checks` | 9 | 0 | 1 | 10 |
| `crm.rfm_results` | 10 | 0 | 0 | 10 |
| `ehs.safety_hazards` | 10 | 0 | 0 | 10 |
| `lims.instruments` | 10 | 0 | 0 | 10 |
| `finance.erp_payment_records` | 10 | 0 | 0 | 10 |
| `gis.audit_logs` | 1 | 0 | 8 | 9 |
| `public.pinned_apps` | 1 | 0 | 8 | 9 |
| `portal.portal_todos` | 4 | 0 | 5 | 9 |
| `finance.core_finance_payments` | 9 | 0 | 0 | 9 |
| `lims.inspection_records` | 9 | 0 | 0 | 9 |
| `rs.formulas` | 9 | 0 | 0 | 9 |
| `ehs.health_records` | 9 | 0 | 0 | 9 |
| `pm.contract_milestones` | 9 | 0 | 0 | 9 |
| `lims.inspection_tasks` | 9 | 0 | 0 | 9 |
| `doc_service.templates` | 0 | 0 | 8 | 8 |
| `crm.audit_logs` | 3 | 0 | 5 | 8 |
| `lims.inspection_processes` | 7 | 0 | 1 | 8 |
| `ehs.training_records` | 8 | 0 | 0 | 8 |
| `finance.receivables` | 8 | 0 | 0 | 8 |
| `ehs.qa_ehs_hazardous_materials` | 8 | 0 | 0 | 8 |
| `pm.contract_payment_schedule` | 8 | 0 | 0 | 8 |
| `lims.maintenance_records` | 8 | 0 | 0 | 8 |
| `pm.project_documents` | 8 | 0 | 0 | 8 |
| `wms.inbound_orders` | 8 | 0 | 0 | 8 |
| `finance.erp_receivables` | 8 | 0 | 0 | 8 |
| `pdm.pdm_drawings` | 8 | 0 | 0 | 8 |
| `mobile.mobile_users` | 8 | 0 | 0 | 8 |
| `finance.payables` | 8 | 0 | 0 | 8 |
| `erp.vehicle_requests` | 8 | 0 | 0 | 8 |
| `finance.finance_voucher_templates` | 8 | 0 | 0 | 8 |
| `pm.project_reports` | 8 | 0 | 0 | 8 |
| `public.pdm_change_notices` | 8 | 0 | 0 | 8 |
| `finance.core_finance_payment_approval_config` | 8 | 0 | 0 | 8 |
| `finance.expenses` | 7 | 0 | 0 | 7 |
| `wms.cycle_count_configs` | 7 | 0 | 0 | 7 |
| `pm.settlement_items` | 7 | 0 | 0 | 7 |
| `erp.meeting_rooms` | 7 | 0 | 0 | 7 |
| `finance.core_finance_approval_nodes` | 7 | 0 | 0 | 7 |
| `mobile.devices` | 7 | 0 | 0 | 7 |
| `ehs.qa_ehs_hazard_factors` | 7 | 0 | 0 | 7 |
| `ehs.qa_ehs_hazards` | 7 | 0 | 0 | 7 |
| `wms.warehouses` | 7 | 0 | 0 | 7 |
| `mobile.documents` | 7 | 0 | 0 | 7 |
| `wms.locations` | 7 | 0 | 0 | 7 |
| `crm.sales_forecasts` | 7 | 0 | 0 | 7 |
| `public.pdm_materials` | 7 | 0 | 0 | 7 |
| `erp.meeting_bookings` | 7 | 0 | 0 | 7 |
| `crm.contacts` | 7 | 0 | 0 | 7 |
| `finance.erp_payables` | 7 | 0 | 0 | 7 |
| `plugin_mes.audit_logs` | 7 | 0 | 0 | 7 |
| `portal.user_preferences` | 0 | 0 | 6 | 6 |
| `mes.quality_inspections` | 5 | 0 | 1 | 6 |
| `pm.acceptance_records` | 6 | 0 | 0 | 6 |
| `public.automation_rules` | 6 | 0 | 0 | 6 |
| `iam.positions` | 6 | 0 | 0 | 6 |
| `integration.erp_wms_sync` | 6 | 0 | 0 | 6 |
| `crm.interactions` | 6 | 0 | 0 | 6 |
| `ai.ai_training_samples` | 6 | 0 | 0 | 6 |
| `pm.defects` | 6 | 0 | 0 | 6 |
| `lims.instrument_calibrations` | 6 | 0 | 0 | 6 |
| `mobile.patrol_records` | 6 | 0 | 0 | 6 |
| `public.pdm_products` | 6 | 0 | 0 | 6 |
| `ticket.core_tickets` | 6 | 0 | 0 | 6 |
| `crm.returns` | 6 | 0 | 0 | 6 |
| `mobile.photo_uploads` | 6 | 0 | 0 | 6 |
| `finance.finance_voucher_generation_rules` | 6 | 0 | 0 | 6 |
| `integration.crm_erp_sync` | 6 | 0 | 0 | 6 |
| `gis.maps` | 6 | 0 | 0 | 6 |
| `mobile.media_files` | 6 | 0 | 0 | 6 |
| `public.user_settings` | 6 | 0 | 0 | 6 |
| `public.search_logs` | 0 | 0 | 5 | 5 |
| `public.todos` | 1 | 0 | 4 | 5 |
| `pm.document_versions` | 5 | 0 | 0 | 5 |
| `finance.core_finance_payment_workflow` | 5 | 0 | 0 | 5 |
| `mobile.push_devices` | 5 | 0 | 0 | 5 |
| `integration.hrm_finance_sync` | 5 | 0 | 0 | 5 |
| `public.core_workflow_versions` | 5 | 0 | 0 | 5 |
| `pm.notification_settings` | 5 | 0 | 0 | 5 |
| `public.qa_qms_sync_records` | 5 | 0 | 0 | 5 |
| `crm.tags` | 5 | 0 | 0 | 5 |
| `erp.audit_logs` | 5 | 0 | 0 | 5 |
| `finance.settlement_snapshots` | 5 | 0 | 0 | 5 |
| `public.monitor_settings` | 5 | 0 | 0 | 5 |
| `pm.contract_templates` | 5 | 0 | 0 | 5 |
| `pm.budget_items` | 5 | 0 | 0 | 5 |
| `pm.acceptance_plans` | 5 | 0 | 0 | 5 |
| `ticket.core_ticket_sla_escalations` | 5 | 0 | 0 | 5 |
| `ticket.core_ticket_comments` | 5 | 0 | 0 | 5 |
| `crm.customer_scores` | 5 | 0 | 0 | 5 |
| `finance.mv_voucher_summary` | 5 | 0 | 0 | 5 |
| `erp.vehicles` | 5 | 0 | 0 | 5 |
| `wms.audit_logs` | 5 | 0 | 0 | 5 |
| `erp.fixed_assets` | 5 | 0 | 0 | 5 |
| `ai.ai_models` | 0 | 4 | 0 | 4 |
| `report.reports` | 0 | 0 | 4 | 4 |
| `mail.templates` | 0 | 0 | 4 | 4 |
| `erp.receivables` | 1 | 0 | 3 | 4 |
| `ticket.core_ticket_activities` | 4 | 0 | 0 | 4 |
| `public.system_settings` | 4 | 0 | 0 | 4 |
| `erp.bank_accounts` | 4 | 0 | 0 | 4 |
| `ai.model_usage_stats` | 4 | 0 | 0 | 4 |
| `mobile.offline_operations` | 4 | 0 | 0 | 4 |
| `rs.projects` | 4 | 0 | 0 | 4 |
| `wms.alerts` | 4 | 0 | 0 | 4 |
| `finance.source_amount_snapshots` | 4 | 0 | 0 | 4 |
| `crm.return_items` | 4 | 0 | 0 | 4 |
| `pm.acceptance_items` | 4 | 0 | 0 | 4 |
| `finance.erp_collection_records` | 4 | 0 | 0 | 4 |
| `hrm.training_records` | 4 | 0 | 0 | 4 |
| `flow.approval_records` | 4 | 0 | 0 | 4 |
| `scm.purchase_items` | 4 | 0 | 0 | 4 |
| `bi.report_schedules` | 4 | 0 | 0 | 4 |
| `public.automation_variables` | 4 | 0 | 0 | 4 |
| `iam.core_users` | 4 | 0 | 0 | 4 |
| `pm.risk_events` | 4 | 0 | 0 | 4 |
| `crm.customer_orders` | 4 | 0 | 0 | 4 |
| `mobile.push_notifications` | 4 | 0 | 0 | 4 |
| `pm.settlement_adjustments` | 4 | 0 | 0 | 4 |
| `iam.resource_permissions` | 4 | 0 | 0 | 4 |
| `wms.wms_approval_events` | 4 | 0 | 0 | 4 |
| `finance.core_finance_payment_items` | 4 | 0 | 0 | 4 |
| `public.alerts` | 1 | 0 | 2 | 3 |
| `public.qa_ehs_hazards` | 2 | 0 | 1 | 3 |
| `mobile.oa_announcement_reads` | 0 | 0 | 3 | 3 |
| `flow.core_workflow_versions` | 3 | 0 | 0 | 3 |
| `finance.budgets` | 3 | 0 | 0 | 3 |
| `public.automation_runs` | 3 | 0 | 0 | 3 |
| `mes.quality_standard_values` | 3 | 0 | 0 | 3 |
| `bi.reports` | 3 | 0 | 0 | 3 |
| `hrm.positions` | 3 | 0 | 0 | 3 |
| `hrm.initialization_status` | 3 | 0 | 0 | 3 |
| `finance.finance_cash_flow_predictions_v53` | 3 | 0 | 0 | 3 |
| `hrm.initialization_logs` | 3 | 0 | 0 | 3 |
| `crm.contracts` | 3 | 0 | 0 | 3 |
| `finance.financial_reports` | 3 | 0 | 0 | 3 |
| `mobile.oa_tasks` | 3 | 0 | 0 | 3 |
| `finance.finance_budget_variances_v53` | 3 | 0 | 0 | 3 |
| `mes.quality_standards` | 3 | 0 | 0 | 3 |
| `finance.finance_prediction_models_v53` | 3 | 0 | 0 | 3 |
| `mobile.oa_calendar_events` | 3 | 0 | 0 | 3 |
| `pm.document_folders` | 3 | 0 | 0 | 3 |
| `rs.audit_logs` | 3 | 0 | 0 | 3 |
| `mobile.barcode_scans` | 3 | 0 | 0 | 3 |
| `mobile.oa_meetings` | 3 | 0 | 0 | 3 |
| `ticket.core_ticket_sla_policies` | 3 | 0 | 0 | 3 |
| `finance.reconciliation_snapshots` | 3 | 0 | 0 | 3 |
| `public.core_permissions` | 1 | 0 | 1 | 2 |
| `gis.devices` | 1 | 0 | 1 | 2 |
| `gis.device_location_records` | 1 | 0 | 1 | 2 |
| `mes.production_processes` | 2 | 0 | 0 | 2 |
| `public.qa_lims_sync_records` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_health_abnormalities` | 2 | 0 | 0 | 2 |
| `public.qa_lab_samples` | 2 | 0 | 0 | 2 |
| `lims.document_relations` | 2 | 0 | 0 | 2 |
| `scm.supplier_quotes` | 2 | 0 | 0 | 2 |
| `public.core_doc_documents` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_sync_records` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_health_exam_plans` | 2 | 0 | 0 | 2 |
| `scm.supplier_admissions` | 2 | 0 | 0 | 2 |
| `public.approval_records` | 2 | 0 | 0 | 2 |
| `public.qa_lims_instrument_data` | 2 | 0 | 0 | 2 |
| `public.approvals` | 2 | 0 | 0 | 2 |
| `iam.position_permissions` | 2 | 0 | 0 | 2 |
| `mes.process_flow_steps` | 2 | 0 | 0 | 2 |
| `public.qa_lims_uncertainty_sources` | 2 | 0 | 0 | 2 |
| `public.core_flow_variables` | 2 | 0 | 0 | 2 |
| `public.qa_lab_processes` | 2 | 0 | 0 | 2 |
| `mobile.offline_sync_records` | 2 | 0 | 0 | 2 |
| `iam.core_roles` | 2 | 0 | 0 | 2 |
| `hrm.departments` | 2 | 0 | 0 | 2 |
| `public.core_flow_delegates` | 2 | 0 | 0 | 2 |
| `scm.audit_logs` | 2 | 0 | 0 | 2 |
| `public.qa_lims_uncertainty_components` | 2 | 0 | 0 | 2 |
| `erp.consolidation_reports` | 2 | 0 | 0 | 2 |
| `public.qa_lims_test_methods` | 2 | 0 | 0 | 2 |
| `lims.reagent_usages` | 2 | 0 | 0 | 2 |
| `lims.ai_analyses` | 2 | 0 | 0 | 2 |
| `crm.customer_segments` | 2 | 0 | 0 | 2 |
| `mes.quality_patrol_items` | 2 | 0 | 0 | 2 |
| `public.qa_lab_instruments` | 2 | 0 | 0 | 2 |
| `public.core_doc_folders` | 2 | 0 | 0 | 2 |
| `public.core_flow_rules` | 2 | 0 | 0 | 2 |
| `public.qa_lims_pt_results` | 2 | 0 | 0 | 2 |
| `rs.project_members` | 2 | 0 | 0 | 2 |
| `erp.internal_transactions` | 2 | 0 | 0 | 2 |
| `public.qa_lims_uncertainty_projects` | 2 | 0 | 0 | 2 |
| `mobile.oa_announcements` | 2 | 0 | 0 | 2 |
| `erp.company_relations` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_risks` | 2 | 0 | 0 | 2 |
| `bi.audit_logs` | 2 | 0 | 0 | 2 |
| `lims.reagents` | 2 | 0 | 0 | 2 |
| `public.qa_lims_collection_tasks` | 2 | 0 | 0 | 2 |
| `public.financial_reports` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_trainings` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_environment` | 2 | 0 | 0 | 2 |
| `public.qa_lims_method_categories` | 2 | 0 | 0 | 2 |
| `wms.outbound_orders` | 2 | 0 | 0 | 2 |
| `lims.lab_ledger` | 2 | 0 | 0 | 2 |
| `public.qa_lab_reagents` | 2 | 0 | 0 | 2 |
| `lims.audit_logs` | 2 | 0 | 0 | 2 |
| `public.core_flow_categories` | 2 | 0 | 0 | 2 |
| `hrm.attendance_records` | 2 | 0 | 0 | 2 |
| `crm.sales_orders` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_health_exam_records` | 2 | 0 | 0 | 2 |
| `public.qa_lims_sample_barcodes` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_inspection_plans` | 2 | 0 | 0 | 2 |
| `erp.consolidation_scopes` | 2 | 0 | 0 | 2 |
| `mobile.push_templates` | 2 | 0 | 0 | 2 |
| `public.qa_lims_pt_plans` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_contraindications` | 2 | 0 | 0 | 2 |
| `crm.customer_recommendations` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_hazard_rectifications` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_material_stocks` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_emergency_plans` | 2 | 0 | 0 | 2 |
| `scm.purchase_contracts` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_inspection_items` | 2 | 0 | 0 | 2 |
| `public.finance_voucher_templates` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_accident_treatments` | 2 | 0 | 0 | 2 |
| `scm.supplier_admission_audit_items` | 2 | 0 | 0 | 2 |
| `public.core_doc_templates` | 2 | 0 | 0 | 2 |
| `mes.team_members` | 2 | 0 | 0 | 2 |
| `wms.inbound_order_items` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_health_trainings` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_protection_measures` | 2 | 0 | 0 | 2 |
| `mes.process_flows` | 2 | 0 | 0 | 2 |
| `scm.mrp_suggestions` | 2 | 0 | 0 | 2 |
| `scm.purchase_contract_items` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_detection_records` | 2 | 0 | 0 | 2 |
| `public.qa_lims_parse_rules` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_accident_investigations` | 2 | 0 | 0 | 2 |
| `srm.audit_logs` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_hazardous_materials` | 2 | 0 | 0 | 2 |
| `public.qa_lims_rfid_tags` | 2 | 0 | 0 | 2 |
| `mes.production_orders` | 2 | 0 | 0 | 2 |
| `rs.project_milestones` | 2 | 0 | 0 | 2 |
| `public.qa_lims_pt_corrective_actions` | 2 | 0 | 0 | 2 |
| `public.qa_lab_tasks` | 2 | 0 | 0 | 2 |
| `public.qa_lab_inspection_reports` | 2 | 0 | 0 | 2 |
| `ehs.qa_ehs_risk_controls` | 2 | 0 | 0 | 2 |
| `public.qa_ehs_accidents` | 2 | 0 | 0 | 2 |
| `pm.project_type_configs` | 0 | 1 | 0 | 1 |
| `wms.sync_records` | 0 | 0 | 1 | 1 |
| `finance.core_finance_currencies` | 0 | 0 | 1 | 1 |
| `lims.lims_inspection_records` | 0 | 0 | 1 | 1 |
| `gis.gis_map_markers` | 0 | 0 | 1 | 1 |
| `rs.rs_projects` | 0 | 0 | 1 | 1 |
| `lims.lims_safety_tasks` | 0 | 0 | 1 | 1 |
| `pm.service_integrations` | 1 | 0 | 0 | 1 |
| `scm.sync_logs` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_inspection_record_items` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_inspection_plans` | 1 | 0 | 0 | 1 |
| `public.qa_lab_records` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_pt_evaluations` | 1 | 0 | 0 | 1 |
| `hrm.payroll_records` | 1 | 0 | 0 | 1 |
| `iam.position_roles` | 1 | 0 | 0 | 1 |
| `crm.customer_tags` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_environment` | 1 | 0 | 0 | 1 |
| `public.qa_lims_pt_samples` | 1 | 0 | 0 | 1 |
| `mes.production_records` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_records` | 1 | 0 | 0 | 1 |
| `iam.permission_audit_logs` | 1 | 0 | 0 | 1 |
| `public.qa_lims_pt_evaluations` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_health_abnormalities` | 1 | 0 | 0 | 1 |
| `rs.change_orders` | 1 | 0 | 0 | 1 |
| `public.qa_lims_method_versions` | 1 | 0 | 0 | 1 |
| `iam.core_role_permissions` | 1 | 0 | 0 | 1 |
| `erp.opening_balances` | 1 | 0 | 0 | 1 |
| `public.qa_lab_calibration_records` | 1 | 0 | 0 | 1 |
| `ai.qa_history` | 1 | 0 | 0 | 1 |
| `public.qa_lims_method_validations` | 1 | 0 | 0 | 1 |
| `pm.pm_master_data_refs` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_calibration_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_trainings` | 1 | 0 | 0 | 1 |
| `erp.voucher_items` | 1 | 0 | 0 | 1 |
| `finance.reconcile_items` | 1 | 0 | 0 | 1 |
| `scm.purchase_requisitions` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_inspection_records` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_pt_results` | 1 | 0 | 0 | 1 |
| `hrm.companies` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_contraindications` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_hazard_rectifications` | 1 | 0 | 0 | 1 |
| `mes.equipment_maintenance_records` | 1 | 0 | 0 | 1 |
| `mes.equipment_inspection_records` | 1 | 0 | 0 | 1 |
| `wms.outbound_order_items` | 1 | 0 | 0 | 1 |
| `scm.incoming_inspections` | 1 | 0 | 0 | 1 |
| `scm.incoming_notices` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_rfid_tags` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_method_categories` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_sample_lifecycle` | 1 | 0 | 0 | 1 |
| `erp.consolidation_report_lines` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_environmental_regulations` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_hazard_verifications` | 1 | 0 | 0 | 1 |
| `qms.inspection_items` | 1 | 0 | 0 | 1 |
| `iam.core_permissions` | 1 | 0 | 0 | 1 |
| `wms.safety_stock_settings` | 1 | 0 | 0 | 1 |
| `hrm.salary_adjustments` | 1 | 0 | 0 | 1 |
| `wms.transfers` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_pt_corrective_actions` | 1 | 0 | 0 | 1 |
| `public.qa_ehs_hazard_verifications` | 1 | 0 | 0 | 1 |
| `wms.purchase_order_snapshots` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_inspection_reports` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_instruments` | 1 | 0 | 0 | 1 |
| `hrm.recruitment_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_accident_treatments` | 1 | 0 | 0 | 1 |
| `iam.audit_logs` | 1 | 0 | 0 | 1 |
| `scm.price_comparisons` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_environment_incidents` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_emergency_plans` | 1 | 0 | 0 | 1 |
| `finance.core_finance_voucher_lines` | 1 | 0 | 0 | 1 |
| `scm.purchase_inquiry_items` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_material_stocks` | 1 | 0 | 0 | 1 |
| `hrm.recruitment_applications` | 1 | 0 | 0 | 1 |
| `public.qa_ehs_accident_reviews` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_accidents` | 1 | 0 | 0 | 1 |
| `public.cqrs_events` | 1 | 0 | 0 | 1 |
| `mes.process_route_steps` | 1 | 0 | 0 | 1 |
| `erp.elimination_rules` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_employees` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_barcode_scan_records` | 1 | 0 | 0 | 1 |
| `mobile.video_recordings` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_health_exam_records` | 1 | 0 | 0 | 1 |
| `erp.consolidation_scope_companies` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_reagent_history` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_reagents` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_uncertainty_components` | 1 | 0 | 0 | 1 |
| `public._archive_core_workflow_instances` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_alerts` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_parse_rules` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_pt_samples` | 1 | 0 | 0 | 1 |
| `public.alert_rules` | 1 | 0 | 0 | 1 |
| `erp.financial_vouchers` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_sync_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_detection_records` | 1 | 0 | 0 | 1 |
| `iam.core_user_roles` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_collection_tasks` | 1 | 0 | 0 | 1 |
| `mobile.mobile_scan_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_accident_investigations` | 1 | 0 | 0 | 1 |
| `rd.bugs` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_inspection_items` | 1 | 0 | 0 | 1 |
| `public.core_flow_variable_history` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_emergency_plan_supplies` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_stock_records` | 1 | 0 | 0 | 1 |
| `pm.pm_tasks` | 1 | 0 | 0 | 1 |
| `public.audit_logs` | 1 | 0 | 0 | 1 |
| `iam.data_permissions` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_compliance_items` | 1 | 0 | 0 | 1 |
| `hrm.performance_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_accident_reviews` | 1 | 0 | 0 | 1 |
| `mobile.audio_recordings` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_risks` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_drill_evaluations` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_method_versions` | 1 | 0 | 0 | 1 |
| `wms.inventory_alert_records` | 1 | 0 | 0 | 1 |
| `public.qa_lab_reagent_alerts` | 1 | 0 | 0 | 1 |
| `erp.expenses` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_sync_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_env_monitor_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_msds` | 1 | 0 | 0 | 1 |
| `finance.reconciliation_item_snapshots` | 1 | 0 | 0 | 1 |
| `wms.inventory_alert_rules` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_health_trainings` | 1 | 0 | 0 | 1 |
| `finance.cqrs_projection_progress` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_drill_problems` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_sample_barcodes` | 1 | 0 | 0 | 1 |
| `public.qa_lims_audit_logs` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_uncertainty_sources` | 1 | 0 | 0 | 1 |
| `scm.supplier_quote_items` | 1 | 0 | 0 | 1 |
| `mobile.sync_policies` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_uncertainty_projects` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_drill_records` | 1 | 0 | 0 | 1 |
| `wms.wave_picks` | 1 | 0 | 0 | 1 |
| `qms.corrective_actions` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_protection_measures` | 1 | 0 | 0 | 1 |
| `iam.permissions` | 1 | 0 | 0 | 1 |
| `erp.erp_master_data_audit_trail` | 1 | 0 | 0 | 1 |
| `finance.finance_voucher_template_lines` | 1 | 0 | 0 | 1 |
| `mes.capacities` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_health_exam_plans` | 1 | 0 | 0 | 1 |
| `wms.wave_pick_items` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_audit_logs` | 1 | 0 | 0 | 1 |
| `public.qa_lab_sample_lifecycle` | 1 | 0 | 0 | 1 |
| `pm.project_members` | 1 | 0 | 0 | 1 |
| `hrm.training_participants` | 1 | 0 | 0 | 1 |
| `ai.document_chunks` | 1 | 0 | 0 | 1 |
| `rs.project_phases` | 1 | 0 | 0 | 1 |
| `lims.qa_lab_reagent_alerts` | 1 | 0 | 0 | 1 |
| `public.qa_ehs_compliance_items` | 1 | 0 | 0 | 1 |
| `mes.work_stations` | 1 | 0 | 0 | 1 |
| `qms.audit_logs` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_compliance_evaluations` | 1 | 0 | 0 | 1 |
| `iam.user_positions` | 1 | 0 | 0 | 1 |
| `scm.sync_record_details` | 1 | 0 | 0 | 1 |
| `scm.materials` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_discharge_permits` | 1 | 0 | 0 | 1 |
| `gis.locations` | 1 | 0 | 0 | 1 |
| `mobile.push_config` | 1 | 0 | 0 | 1 |
| `finance.core_finance_accounts` | 1 | 0 | 0 | 1 |
| `public.qa_lab_reagent_history` | 1 | 0 | 0 | 1 |
| `mobile.mobile_tasks` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_emergency_plan_approvals` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_disease_cases` | 1 | 0 | 0 | 1 |
| `ai.analysis_results` | 1 | 0 | 0 | 1 |
| `mobile.photo_evidences` | 1 | 0 | 0 | 1 |
| `public.core_users` | 1 | 0 | 0 | 1 |
| `mes.process_routes` | 1 | 0 | 0 | 1 |
| `qms.quality_issues` | 1 | 0 | 0 | 1 |
| `hrm.leave_records` | 1 | 0 | 0 | 1 |
| `scm.purchase_inquiries` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_test_methods` | 1 | 0 | 0 | 1 |
| `wms.transfer_items` | 1 | 0 | 0 | 1 |
| `mobile.scan_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_drill_plans` | 1 | 0 | 0 | 1 |
| `wms.labor_shifts` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_method_validations` | 1 | 0 | 0 | 1 |
| `erp.payables` | 1 | 0 | 0 | 1 |
| `hrm.contracts` | 1 | 0 | 0 | 1 |
| `lims.qa_lims_instrument_data` | 1 | 0 | 0 | 1 |
| `scm.price_comparison_items` | 1 | 0 | 0 | 1 |
| `public.qa_ehs_stock_records` | 1 | 0 | 0 | 1 |
| `ehs.qa_ehs_emergency_plan_versions` | 1 | 0 | 0 | 1 |

> 完整逐列明细（含每列的 dev/prod 定义、引用点、迁移来源、数据依赖）保存在本轮只读采集结果中，可用同一 SQL（`information_schema.columns` 全量导出后按 `(schema,table,column)` 对比）复现；为避免文档铺 1600 行，此处按表汇总、按根因分组。


## 5. 按风险排序的执行顺序建议

| 序 | 动作 | 规模 | 风险 | 前置条件 |
|---|---|---|---|---|
| 1 | 补 dev：`finance.reconciliation_snapshots` 4 列 + `integration.integration_sync_logs` 7 列 | 11 列 | **高**（写入路径明确，缺列即报错） | 无；仅 dev，可直接执行 |
| 2 | 补 prod：B 类 135 列（42 张表） | 135 列 | **高**（代码已上线、库缺列，触发即 500） | 版本号接在 `20261115130000` 之后；避开另一会话的空壳表迁移 |
| 3 | 定 137 个表族的权威表（见[族权威清单](table-family-authority-recommendations-2026-11-15.md)） | 137 族 | 中（决策成本，非技术风险） | owner 只需否掉不同意的；B 组 34 族逐条定性 |
| 4 | 补 dev：A 类其余 4 列（`tags`×2、`mitigation_strategy`、`process_flows.name`） | 4 列 | 中 | 与序 1 同批 |
| 5 | 删 dev：C-dev 563 列（118 张表） | 563 列 | 低（0 引用、0 数据） | 建议先 `pg_dump -t` 备份 |
| 6 | 统一 D 类口径（按 §4.4 根因分批） | 1639 列 | 中（跨端序列化/时区/约束） | 先做“纯实现差异”三组（uuid 默认值 109、now() 23、可空性 589 需逐表核） |
| 7 | prod 归档标记（C-prod 374 列） | 374 列 | 无（不改结构） | 只写标记文档/注释，不动 DDL |

> 顺序理由：A/B 是“代码已依赖但库没有”，会在运行时直接报错；表族不定则 2599 列无法归属；删除类必须在备份与族定之后。

## 6. 本轮未判定项清单（缺什么证据，不猜）

| 项 | 规模 | 为什么没判 | 需要什么证据 |
|---|---|---|---|
| 137 个表族的列级归属 | 613 列 | 同一逻辑表存在多代/多 schema 实现，列差异无法单独判定 | §3 的权威表结论（owner 确认“需确认”项） |
| `flow.approvals` | 11 列 | dev / prod 两套实现同时存在，A/B 各占一半 | 确认 flow 服务的权威表与迁移顺序 |
| `mes.production_records` 9 列 | 9 列 | 代码用 `RETURNING ... AS 列名` 生成同名列（`svc/mes/src/modules/production_record.rs:345-355`），无法判断列应落表还是仅作别名 | **已裁决（2026-11-15）**：不补列——别名会让补真列撞 `duplicate column`；归属 §4.3，prod 侧仅标记历史残留、待归档（**prod 不删**） |
| `erp.erp_master_data_refs.id/deleted_at` | 2 列 | 属表族待定；`id` 为主键类列，dev 缺主键需先确认该表在 dev 的实际主键 | 族定结论 + dev 表约束现状 |
| prod 有数据但无代码引用的列 | 5 列 | 可能被外部报表/BI/手工 SQL 使用 | 确认是否有库外消费方 |
| dev 有数据但无代码引用的列 | 287 列 | 可能是试验数据；删除前需确认 | 导出样本 + owner 确认 |
| 基础设施列 | 82 列 | `_sqlx_migrations`/`pg_stat_statements`/PostGIS 元表不属于业务结构 | 无需处置 |

## 7. 方法学与版本核对

### 7.1 采集方法

- 列清单：两侧 `information_schema.columns` 全量导出（schema/table/column/type/length/precision/nullable/default/ordinal/identity/generated/udt），按 `(schema,table,column)` 对齐比较。
- 数据依赖：按表 `count(*)` + 逐列 `count(col)`（只对差分列）；索引/约束用 `pg_index`/`pg_constraint`，视图用 `information_schema.view_column_usage`。
- 代码引用：扫描 `apps/lib/svc/packages/cli/shared/tools/tests/examples/config/deploy/docker` 下 `.rs/.ts/.tsx/.js/.jsx/.sql/.py/.sh`（跳过 `node_modules/target/dist/docs/migrations`），先剔除注释行，再按“文件内出现 schema 限定表名 + 列名出现在该表引用行 ±40 行内”判定强引用；仅裸表名同行的判为弱引用。
- 迁移来源：在 `database/migrations/*.sql` 中同时命中表名与列名的最早版本号；并核对版本是否在两侧账本中。
- 人工复核：对旧清单点名的 7 张表逐条查写入 SQL，修正自动扫描漏检（11 列）。

### 7.2 生产在跑件核对（更正）

| 项 | 值 | 来源 |
|---|---|---|
| 进程 | PID 84543，`<prod-deploy-dir>/bin/topems-server`，启动 2026-11-15 10:06:11 | `launchctl list`（com.topems.server）+ `ps` |
| 二进制指纹 | `sha256 99f00cef…c794af8a4c` | `shasum -a 256` 实测，与部署记录一致 |
| 构建 base | `936f7e888`（2026-11-15 09:42） | 部署记录；本地仓库可解析该提交 |
| 部署目录 git HEAD | `e136614`（2026-11-10 21:37） | `git -C <prod-deploy-dir> log -1` |
| 二进制内嵌版本 | 无（三个 sha 在二进制中均 0 命中） | `grep -a` 实测 |

**更正说明**：上一份报告写的“prod 在跑二进制是 e136614”是错误归因——`e136614` 只是部署目录当时的 git HEAD，而实际产物是由 `936f7e888` 构建的 `99f00cef…`。二进制不内嵌 commit，无法用字符串自证；因此以 **sha256 + 部署记录** 为准。

**对 B 类结论的影响**：我把构建 base `936f7e888` 的源码树导出到临时目录，与本地 HEAD `4b55e04` 分别建索引比对，两者在这批表的引用点**完全一致**（差分 6 个提交均为 docs/db 变更）。所以 B 类“prod 未上”的正确表述是：**代码已随 `99f00cef…` 上线，但 prod 库缺列**；一旦请求走到该路径即运行时报错，而不是“等下次部署再说”。

### 7.3 复现命令

```bash
# dev
psql -d topems -c "\copy (select table_schema,table_name,column_name,data_type,character_maximum_length,is_nullable,column_default from information_schema.columns where table_schema not in ('pg_catalog','information_schema','pg_toast') order by 1,2,ordinal_position) to '$TMPDIR/dev_cols.csv' csv header"
# prod（只读）
ssh <prod-host> 'PGOPTIONS="-c default_transaction_read_only=on" psql -d topems_prod -c "\copy (select ... ) to '"'"'$TMPDIR/prod_cols.csv'"'"' csv header"'
```

