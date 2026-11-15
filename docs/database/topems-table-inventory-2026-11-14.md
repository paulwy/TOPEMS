**库身份（首行）：`topems_prod` @ 192.168.3.129（ssh `xingzhai`；旧地址 192.168.110.115 已停用，2026-11-14 更正；psql 走 unix socket/loopback），PostgreSQL 18.4，87 MB；`_sqlx_migrations` 账本 **680 行**，min 0 / **max 20261115000000**，最后安装 2026-11-15 08:29:21+08（2026-11-15 入库校对实测；采集时点为 673 行 / max 20261114160000 / 86 MB）。对照库 `topems` @ 127.0.0.1，207 MB，账本 **572 行**，max 20261109101400（落后 prod 约 6 天，为 2026-11-14 采集值，未重跑）。两个会话均设 `default_transaction_read_only=on`，全程只读。**

# TOPEMS 表级只读盘点（2026-11-14）

> 入库状态：2026-11-15 入库，并按最新事实校对。**§1–§6 与 §2 主表是 2026-11-14 的采集时点快照**（除 `public._sqlx_migrations` 行数外未逐行重跑）；采集之后的结构/策略变化与事实差异集中记在 §0.1。
>
> 采集方式：`psql` 只读会话逐表 `count(*)`、`pg_class`/`pg_policy`/`pg_indexes` 元数据查询、`information_schema.columns`；代码侧在 `svc/**/*.rs`（1629 个文件）上统计。未执行任何 DDL/DML，未写迁移，未建分支，未投递。

## 0. 口径与判定规则

| 项 | 口径 |
|---|---|
| prod/dev 行数 | `count(*)` 精确值；`—` 表示该表在对方库不存在 |
| tenant_id / tenant_uid | `pg_attribute` 中是否存在该列（非继承、未删除） |
| RLS | `relrowsecurity / relforcerowsecurity / 策略数`，`t/f` 缩写 |
| fail-open | 策略表达式含 `tenant_id IS NULL` 记为 `NULL 分支`；含 `USING(true) WITH CHECK(true)` 记为 `true/true`；两者都有则并列 |
| 代码引用 | 在 `svc/**/*.rs` 中：① 含 SQL 关键字（SELECT/INSERT/UPDATE/DELETE/FROM/JOIN/INTO/TABLE/TRUNCATE/MERGE）的行内出现的**裸表名 token**；② 任意行的 **`schema.table` 限定名**；两者按文件去重后取并集。`文件/处`。同名表跨 schema 时裸名计数会共享，属引用上限 |
| 判定 | 空壳=0 行但有代码引用；死表=0 行且 0 引用；系统表=审计/账本/CQRS/平台身份；字典表=字典/参考/主数据；真实业务表=有数据 |
| schema_defense | 内容含运行期 DDL 自愈注册表；命中该注册的表即使 0 行 0 引用也**不建议直接删**（会被重建），已单独标注 |

## 0.1 入库校对记录（2026-11-15，只读实测）

入库前对可低成本复核的事实做了实测（prod 仅 `SELECT`，`default_transaction_read_only=on` + `statement_timeout`），差异如下。**以本表为准，正文对应位置已就地批注或改写。**

| # | 项 | 采集时点（2026-11-14） | 入库校对实测（2026-11-15） | 依据 |
|---:|---|---|---|---|
| 1 | prod 地址 | 正文 §附录 A 命令仍用 `192.168.110.115` | `xingzhai@192.168.3.129`（`hostname` = `xingzhaideMac-mini.local`） | ssh + `hostname` |
| 2 | 账本水位 | 673 行 / max `20261114160000` | **680 行 / max `20261115000000`**，最后安装 `2026-11-15 08:29:21+08` | `select count(*), max(version) from _sqlx_migrations` |
| 3 | prod 无 `tenant_id` 表数 | 393 | **379**（差 14 = `20261114201000`/`20261114202000` 补列 8 张 + `20261114170000` 删表 6 张） | `pg_class`/`pg_attribute` 反连接 |
| 4 | RLS 开但无 `tenant_id`（全库） | 67 | **59**（同上补列 8 张） | 同上 + `relrowsecurity` |
| 5 | 六 schema「无 tenant_id 且 RLS=on」 | 12 | **4**：`erp.core_erp_materials`、`erp.holidays`、`portal.portal_quick_actions`、`portal.user_preferences`（其余 8 张已由 `20261114201000`/`20261114202000` 补列） | §4.2 表逐表复核 |
| 6 | `finance` 表数与无 RLS 数 | 119 张 / 10 张无 RLS | **113 张 / 4 张无 RLS**（`20261114170000` 删 6 张死表：`finance_u`、`finance_v`、`finance_audit_rules_v`、`finance_budget_variances_v`、`finance_cash_flow_predictions_v`、`finance_prediction_models_v`） | `pg_class` 计数 + 迁移文件 |
| 7 | `mes` fail-open 策略 | 22 张（含 `mes.teams`） | **0 张**：50 条策略全部含 `app.rls_system` 系统通道 + 租户谓词（`20261114200000`） | `pg_policies` 全量判定 |
| 8 | `erp` 8 张合并域表 | 全部 `USING(true)`/NULL 哨兵 | 8 张策略均为 `tenant_id = erp.group_tenant_of(...)`，无 `true`/NULL 分支（`20261114180000`）；仍全部 0 行 | `pg_policies` |
| 9 | `mes.teams` 策略 | fail-open（nil 哨兵） | fail-closed（系统通道 + 租户谓词）；**仍缺 `ck_teams_status_standard`** | `pg_policies` / `pg_constraint` |
| 10 | §7 缺陷清单 | 只有 K1、K3、K4、K5、K7 | 补登 **K2**；K1/K2/K3/K4/K5 已修复并合入 `origin/main`，K7 于 2026-11-15 由 `20261115100000` 修复（见 §7） | git 提交 + 代码复核 |
| 11 | K7 工单位置 | 仅在 `/private/tmp/topems-dud-20261115/` | 仓库内已有同内容工单：`docs/database/workorder-wms-po-snapshot-backfill-20261115.md` | `git ls-tree origin/main docs/database/` |
| 12 | 其他未变项 | — | `public.core_menus` NULL 租户仍 452 行；`wms.purchase_order_snapshots` 校对时点仅 3 列（`id`/`deleted_at`/`tenant_id`）、0 行，后由 `20261115100000` 补齐至 14 列（见 §7 K7）；`plugin_wms.purchase_order_snapshots` 未被触碰 | 逐项 `SELECT` |

> 未重跑项：§2 主表其余 559 行的行数/列数、§4 nil 租户合计（1139 行）、§5 dev 侧账本与表集合差异，均为 2026-11-14 采集值。结构类结论（缺列、重复表、schema_defense 注册）不受上述迁移影响。

## 1. 先说结论

- 覆盖 **560 张表**（finance 119 + mes 52 + 全库无 tenant_id 393 + 8 张合并域，去重后；采集时点口径）。判定：真实业务表 5、空壳 293、死表 155、系统表 81、字典表 26。
- 建议动作：**A 可直接执行 72 条**、**B 需业务口径 154 条**、**C 只登记/保持不动 334 条**。
- prod 全库 **379 张表没有 tenant_id**（采集时 393；差值 = 补列 8 张 + 删表 6 张，见 §0.1）；其中 **59 张 RLS 已开启但无 tenant_id 列**（采集时 67）。六 schema（erp/mes/ticket/portal/crm/hrm）范围内**仅剩 4 张**（采集时 12 张）：`erp.core_erp_materials`、`erp.holidays`、`portal.portal_quick_actions`、`portal.user_preferences`。
- `finance` **113** 张（采集时 119，`20261114170000` 已删 6 张死表）：**9 张有数据、104 张为 0 行**；无 RLS **4 张**（采集时 10 张）。
- `mes` 52 张：**0 张策略仍 fail-open**（采集时 22 张，含 `mes.teams`；`20261114200000` 后 50/50 策略均带 `app.rls_system`）。
- 只有 `tenant_uid`、没有 `tenant_id` 的表 **10 张**（全在 `master_data`，另 4 张同时有两列）；不止已知的 2 张。
- prod 的 NULL 租户存量（采集时点）：**13 张表、1139 行**，最大是 `public.core_menus` 452 行（2026-11-15 复核仍为 452）。

### 最值得先动的 5 项

> 以下是 2026-11-14 采集时点的动作清单。截至 2026-11-15，第 1/2/3/4 项已由窗口 A–E 的迁移落地（差异见 §0.1），仅第 5 项（portal 115 张无租户列的门户/网关表）尚未处理。

1. **8 张合并域表（erp）仍是 `USING(true)`**：`company_relations`、`internal_transactions`、`consolidation_*`（4 张）、`elimination_*`（2 张）。任何租户可读写全部合并数据，是当前最高风险；需先定「集团租户 vs 成员公司租户」口径。
2. **mes 22 张 fail-open 策略**（含 `mes.teams`）：可直接改成 `租户谓词 + app.rls_system` 双通道，不依赖业务决策；顺带补 prod 缺失的 `ck_teams_status_standard`。
3. **六 schema 的 12 张「无 tenant_id 却开着 RLS」表**：策略实为 `true/true`，如 `erp.expenses`、`erp.vehicles`、`portal.user_preferences`。可补列的补列（均 0 行），属用户主体的登记白名单。
4. **finance 的 10 张无 RLS 表**：6 张死表（`finance_u/v` + 4 张 `_v`）建议删；`voucher_lines` 另因 0 行且仅 1 处 SQL 引用进删表清单；2 张 CQRS 系统表与 `schema_defense_ledger` 登记白名单；`account_balances` 属空壳另议。
5. **portal 115 张无租户列的门户/网关表全部 0 行**：其中仅 2 张有代码引用，其余 0 引用，多数还带 `schema_defense` 注册。建议按清单批量确认后删除或登记为预留，先消掉最大一片噪音。

## 2. 主表（一行一表，共 560 张）

| # | schema.table | prod 行 | dev 行 | tenant_id | tenant_uid | RLS on/force/策略 | fail-open | 代码引用(文件/处) | 判定 | 建议动作 |
|---:|---|---:|---:|:---:|:---:|:---:|:---:|---:|---|---|
| 1 | `_sqlx_test.databases` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 2 | `ai.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 3 | `ai.user_profiles` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 4 | `ai.vectors` | 0 | 0 | N | N | f/f/0 | 否 | 2/15 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 5 | `analytics.analytics_datasets` | 0 | 0 | N | N | f/f/0 | 否 | 1/10 | 空壳 | 需业务口径：与 `bi.analytics_datasets` 同名重复，需先定权威表；确认后删冗余副本 |
| 6 | `analytics.analytics_sync_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/8 | 空壳 | 需业务口径：与 `bi.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 7 | `analytics.report_execution_records` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：与 `bi.report_execution_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 8 | `analytics.report_schedules` | 0 | 0 | N | N | f/f/0 | 否 | 3/18 | 空壳 | 需业务口径：与 `bi.report_schedules` 同名重复，需先定权威表；确认后删冗余副本 |
| 9 | `analytics.report_subscriptions` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：与 `bi.report_subscriptions` 同名重复，需先定权威表；确认后删冗余副本 |
| 10 | `analytics.report_templates` | 0 | 0 | N | N | f/f/0 | 否 | 7/20 | 空壳 | 需业务口径：与 `bi.report_templates` 同名重复，需先定权威表；确认后删冗余副本 |
| 11 | `analytics.reports` | 0 | 0 | N | N | f/f/0 | 否 | 4/18 | 空壳 | 需业务口径：与 `bi.reports` 同名重复，需先定权威表；确认后删冗余副本 |
| 12 | `bi.analytics_sync_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/8 | 空壳 | 需业务口径：与 `analytics.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 13 | `bi.bi_datasets` | 0 | 0 | N | N | f/f/0 | 否 | 3/8 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 14 | `bi.report_execution_records` | 0 | 0 | N | N | f/f/0 | 否 | 2/4 | 空壳 | 需业务口径：与 `analytics.report_execution_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 15 | `bi.report_subscriptions` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：与 `analytics.report_subscriptions` 同名重复，需先定权威表；确认后删冗余副本 |
| 16 | `bi.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 17 | `communication.core_location_messages` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 18 | `communication.schema_defense_ledger` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 19 | `core.core_plugin_categories` | 0 | 9 | N | N | f/f/0 | 否 | 1/4 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 20 | `core.core_plugin_instances` | 0 | 36 | N | N | f/f/0 | 否 | 5/25 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 21 | `core.core_plugin_navigation` | 0 | 21 | N | N | f/f/0 | 否 | 1/2 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 22 | `core.core_plugin_permissions` | 0 | 8 | N | N | f/f/0 | 否 | 2/4 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 23 | `core.core_plugin_reviews` | 0 | 0 | N | N | f/f/0 | 否 | 1/4 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 24 | `core.core_plugin_versions` | 0 | 0 | N | N | f/f/0 | 否 | 4/14 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 25 | `core.core_tenant_plugins` | 0 | 4 | N | N | t/t/1 | true/true | 4/20 | 系统表 | 登记白名单：租户插件开通表，USING(true) 属平台级；需确认仅由系统通道写 |
| 26 | `crm.core_crm_customers` | 0 | — | N | N | t/t/1 | true/true | 0/0 | 空壳 | 需业务口径：crm 客户核心表缺 tenant_id，补列需先定与 customers 的关系 |
| 27 | `crm.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 28 | `doc.document_versions` | 0 | 0 | N | N | t/t/1 | true/true | 1/2 | 空壳 | 需业务口径：随 doc.documents 的归属口径 |
| 29 | `doc.documents` | 0 | 0 | N | N | t/t/1 | true/true | 13/50 | 空壳 | 需业务口径：文档归属按租户还是按用户未定；确认后补列 |
| 30 | `doc.folders` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 空壳 | 需业务口径：同 doc.documents，文档域租户归属未定 |
| 31 | `doc.templates` | 0 | 0 | N | N | t/t/1 | true/true | 2/3 | 空壳 | 需业务口径：模板是否全局共享未定 |
| 32 | `doc_service.archives` | 0 | 0 | N | N | t/t/1 | true/true | 3/3 | 空壳 | 需业务口径：同 doc_service.files |
| 33 | `doc_service.core_doc_documents` | 0 | 0 | N | N | f/f/0 | 否 | 3/8 | 空壳 | 需业务口径：与 `flow.core_doc_documents`、`public.core_doc_documents` 同名重复，需先定权威表；确认后删冗余副本 |
| 34 | `doc_service.core_doc_folders` | 0 | 0 | N | N | f/f/0 | 否 | 2/6 | 空壳 | 需业务口径：与 `flow.core_doc_folders`、`public.core_doc_folders` 同名重复，需先定权威表；确认后删冗余副本 |
| 35 | `doc_service.core_doc_templates` | 0 | 0 | N | N | f/f/0 | 否 | 2/7 | 空壳 | 需业务口径：与 `flow.core_doc_templates`、`public.core_doc_templates` 同名重复，需先定权威表；确认后删冗余副本 |
| 36 | `doc_service.files` | 0 | 9 | N | N | t/t/1 | true/true | 3/4 | 空壳 | 需业务口径：文档服务租户归属未定，且策略为 true/true |
| 37 | `doc_service.folders` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 空壳 | 需业务口径：同 doc_service.files |
| 38 | `doc_service.templates` | 0 | 13 | N | N | t/t/1 | true/true | 2/3 | 空壳 | 需业务口径：同 doc_service.files |
| 39 | `ehs.schema_defense_ledger` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 40 | `erp.account_balances` | 0 | 0 | N | N | f/f/0 | 否 | 1/5 | 空壳 | 可直接执行：补 tenant_id（0 行）并建 fail-closed（现无 RLS） |
| 41 | `erp.asset_categories` | 0 | 28 | N | N | f/f/0 | 否 | 2/15 | 字典表 | 可直接执行：补 tenant_id（0 行）并建 fail-closed（现无 RLS） |
| 42 | `erp.company_relations` | 0 | 0 | Y | N | t/t/1 | true/true | 2/16 | 空壳 | 需业务口径：合并域 tenant_id 应为集团租户还是成员公司租户、跨公司授权模型未定；现 USING(true) 全开 |
| 43 | `erp.consolidation_report_lines` | 0 | 0 | Y | N | t/t/1 | true/true | 2/3 | 空壳 | 需业务口径：报表行随报表主体的可见范围未定；现 USING(true) 全开 |
| 44 | `erp.consolidation_reports` | 0 | 0 | Y | N | t/t/1 | true/true | 1/17 | 空壳 | 需业务口径：合并报表的租户/公司可见范围未定；现 USING(true) 全开 |
| 45 | `erp.consolidation_scope_companies` | 0 | 0 | Y | N | t/t/1 | true/true | 4/23 | 空壳 | 需业务口径：范围内法人主体的租户归属未定；现 USING(true) 全开 |
| 46 | `erp.consolidation_scopes` | 0 | 0 | Y | N | t/t/1 | true/true | 4/23 | 空壳 | 需业务口径：合并范围的租户归属与跨公司可见性未定；现 USING(true) 全开 |
| 47 | `erp.core_erp_materials` | 0 | 0 | N | N | t/t/1 | true/true | 1/1 | 空壳 | 需业务口径：物料核心表缺 tenant_id，补列需先定与 materials 的关系 |
| 48 | `erp.core_erp_suppliers` | 0 | — | N | N | t/t/1 | true/true | 0/0 | 空壳 | 需业务口径：供应商核心表缺 tenant_id，补列需先定与 suppliers 的关系 |
| 49 | `erp.elimination_candidates` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 1/8 | 空壳 | 需业务口径：抵消候选的租户归属未定；现策略含 nil 哨兵 + tenant_id IS NULL |
| 50 | `erp.elimination_rules` | 0 | 0 | Y | N | t/t/1 | true/true | 2/15 | 空壳 | 需业务口径：抵消规则的租户归属未定；现 USING(true) 全开 |
| 51 | `erp.erp_master_data_audit_trail` | 0 | 0 | N | N | f/f/0 | 否 | 3/4 | 系统表 | 登记白名单：主数据审计轨迹，无租户列 |
| 52 | `erp.erp_master_data_conflicts` | 0 | 0 | N | N | f/f/0 | 否 | 2/13 | 空壳 | 需业务口径：主数据冲突是否跨租户共享；现 0 行 |
| 53 | `erp.erp_master_data_quality_reports` | 0 | 0 | N | N | f/f/0 | 否 | 4/7 | 空壳 | 需业务口径：主数据质量报告是否跨租户共享 |
| 54 | `erp.erp_master_data_quality_rules` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 字典表 | 需业务口径：质量规则是否全局共享 |
| 55 | `erp.erp_master_data_versions` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：主数据版本随主数据归属，补列口径未定 |
| 56 | `erp.expenses` | 0 | 0 | N | N | t/t/1 | true/true | 1/6 | 空壳 | 可直接执行：补 tenant_id（0 行）并改 fail-closed（现 true/true） |
| 57 | `erp.holidays` | 0 | 0 | N | N | t/t/1 | true/true | 1/8 | 字典表 | 需业务口径：节假日是全局还是按租户/地区；现 true/true，先登记 |
| 58 | `erp.internal_transactions` | 0 | 0 | Y | N | t/t/1 | true/true | 3/29 | 空壳 | 需业务口径：内部交易台账的 tenant_id 归属（集团/成员公司）未定；现 USING(true) 全开 |
| 59 | `erp.meeting_bookings` | 0 | 0 | N | N | t/t/1 | true/true | 1/9 | 空壳 | 可直接执行：补 tenant_id（0 行）并改 fail-closed |
| 60 | `erp.meeting_rooms` | 0 | 0 | N | N | t/t/1 | true/true | 1/8 | 字典表 | 可直接执行：补 tenant_id（0 行）并改 fail-closed |
| 61 | `erp.office_supplies` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 可直接执行：补 tenant_id（0 行）并建 fail-closed（现无 RLS） |
| 62 | `erp.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 63 | `erp.vehicle_requests` | 0 | 0 | N | N | t/t/1 | true/true | 1/9 | 空壳 | 可直接执行：补 tenant_id（0 行）并改 fail-closed |
| 64 | `erp.vehicles` | 0 | 0 | N | N | t/t/1 | true/true | 2/9 | 字典表 | 可直接执行：补 tenant_id（0 行）并改 fail-closed |
| 65 | `finance.accounting_subjects` | 0 | 5 | Y | N | t/t/1 | 否 | 2/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 66 | `finance.budgets` | 0 | 286 | Y | N | t/t/1 | 否 | 4/25 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 67 | `finance.core_finance_accounts` | 28 | 19746 | Y | N | t/t/1 | 否 | 12/71 | 真实业务表 | 保持不动：已有真实数据且已 fail-closed |
| 68 | `finance.core_finance_approval_nodes` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 69 | `finance.core_finance_approval_workflows` | 0 | 0 | Y | N | t/t/1 | 否 | 0/0 | 死表 | 保持不动：0 行，结构已 fail-closed |
| 70 | `finance.core_finance_aux_accounts` | 0 | 2 | Y | N | t/t/1 | 否 | 1/14 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 71 | `finance.core_finance_aux_balances` | 0 | 2 | Y | N | t/t/1 | 否 | 3/18 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 72 | `finance.core_finance_currencies` | 16 | 16 | Y | N | t/t/2 | NULL 分支 | 1/3 | 字典表 | 保持不动：8 行全局默认(tenant_id NULL)+8 行租户覆盖，rls_global_read 的 NULL 分支即全局默认；登记字典白名单 |
| 73 | `finance.core_finance_ledger` | 4 | 14 | Y | N | t/t/1 | 否 | 9/61 | 真实业务表 | 保持不动：已有真实数据且已 fail-closed |
| 74 | `finance.core_finance_payment_approval_config` | 0 | 0 | Y | N | t/t/1 | 否 | 2/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 75 | `finance.core_finance_payment_items` | 0 | 0 | Y | N | t/t/1 | 否 | 2/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 76 | `finance.core_finance_payment_workflow` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 77 | `finance.core_finance_payments` | 0 | 1 | Y | N | t/t/1 | 否 | 4/45 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 78 | `finance.core_finance_periods` | 1 | 1397 | Y | N | t/t/1 | 否 | 4/24 | 字典表 | 保持不动：字典表已 fail-closed |
| 79 | `finance.core_finance_reconciliation_items` | 0 | 0 | Y | N | t/t/1 | 否 | 2/45 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 80 | `finance.core_finance_reconciliation_sessions` | 0 | 0 | Y | N | t/t/1 | 否 | 2/17 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 81 | `finance.core_finance_report_line_map` | 48 | 48 | Y | N | t/t/2 | NULL 分支 | 1/5 | 真实业务表 | 需业务口径：48 行全为 NULL，需确认是全局映射模板还是漏回填；全局则登记字典，否则回填并去掉 NULL 读分支 |
| 82 | `finance.core_finance_voucher_lines` | 2 | 34 | Y | N | t/t/1 | 否 | 8/56 | 真实业务表 | 保持不动：已有真实数据且已 fail-closed |
| 83 | `finance.core_finance_vouchers` | 1 | 22 | Y | N | t/t/1 | 否 | 11/151 | 真实业务表 | 保持不动：已有真实数据且已 fail-closed |
| 84 | `finance.cqrs_events` | 0 | 0 | N | N | f/f/0 | 否 | 1/10 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 85 | `finance.cqrs_projection_progress` | 2 | 2 | Y | N | t/t/1 | 否 | 1/10 | 系统表 | 保持不动：系统表已 fail-closed |
| 86 | `finance.cqrs_snapshots` | 0 | — | N | N | f/f/0 | 否 | 1/3 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 87 | `finance.difference_adjustments` | 0 | 0 | Y | N | t/t/1 | 否 | 1/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 88 | `finance.erp_collection_records` | 0 | 553 | Y | N | t/t/1 | 否 | 2/26 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 89 | `finance.erp_payables` | 0 | 0 | Y | N | t/t/1 | 否 | 1/10 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 90 | `finance.erp_payment_records` | 0 | 281 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 91 | `finance.erp_receivables` | 0 | 0 | Y | N | t/t/1 | 否 | 2/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 92 | `finance.expense_approvals` | 0 | 178 | Y | N | t/t/1 | 否 | 1/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 93 | `finance.expenses` | 0 | 3 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 94 | `finance.finance_alert_configs_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 95 | `finance.finance_alert_history_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/4 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 96 | `finance.finance_anomaly_alerts_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/4 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 97 | `finance.finance_audit_findings_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 98 | `finance.finance_audit_log` | 0 | 0 | Y | N | t/t/1 | 否 | 1/1 | 系统表 | 保持不动：系统表已 fail-closed |
| 99 | `finance.finance_audit_rules_v` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，_v 后缀历史落表 |
| 100 | `finance.finance_audit_rules_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/8 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 101 | `finance.finance_budget_variances_v` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，_v 后缀历史落表 |
| 102 | `finance.finance_budget_variances_v53` | 0 | 0 | Y | N | t/t/1 | 否 | 1/2 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 103 | `finance.finance_cash_flow_predictions_v` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，_v 后缀历史落表 |
| 104 | `finance.finance_cash_flow_predictions_v53` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 105 | `finance.finance_compliance_issues` | 0 | 0 | Y | N | t/t/1 | 否 | 1/4 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 106 | `finance.finance_compliance_reports` | 0 | 0 | Y | N | t/t/1 | 否 | 1/8 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 107 | `finance.finance_control_matrices` | 0 | 0 | Y | N | t/t/1 | 否 | 1/8 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 108 | `finance.finance_control_points` | 0 | 0 | Y | N | t/t/1 | 否 | 1/14 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 109 | `finance.finance_detection_configs_v52` | 0 | 0 | Y | N | t/t/1 | 否 | 1/1 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 110 | `finance.finance_prediction_models_v` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，_v 后缀历史落表 |
| 111 | `finance.finance_prediction_models_v53` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 112 | `finance.finance_risk_assessments` | 0 | 0 | Y | N | t/t/1 | 否 | 1/10 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 113 | `finance.finance_u` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，历史视图落表残留 |
| 114 | `finance.finance_v` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用，历史视图落表残留 |
| 115 | `finance.finance_v54_fraud_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 116 | `finance.finance_v54_fraud_scores` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 117 | `finance.finance_v54_review_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 118 | `finance.finance_v54_review_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 119 | `finance.finance_v54_review_workflows` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 120 | `finance.finance_v54_risk_alerts` | 0 | 0 | Y | N | t/t/1 | 否 | 1/15 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 121 | `finance.finance_v54_risk_indicators` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 122 | `finance.finance_v55_invoice_items` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 123 | `finance.finance_v55_invoices` | 0 | 0 | Y | N | t/t/1 | 否 | 1/17 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 124 | `finance.finance_v55_payment_requests` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 125 | `finance.finance_v55_payment_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 126 | `finance.finance_v55_reconciliation_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 127 | `finance.finance_v55_reconciliation_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 128 | `finance.finance_v56_tax_brackets` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 129 | `finance.finance_v56_tax_forms` | 0 | 0 | Y | N | t/t/1 | 否 | 1/25 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 130 | `finance.finance_v56_tax_lines` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 131 | `finance.finance_v56_tax_plans` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 132 | `finance.finance_v56_tax_rates` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 133 | `finance.finance_v56_tax_suggestions` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 134 | `finance.finance_v57_analysis_dimensions` | 0 | 0 | Y | N | t/t/1 | 否 | 1/1 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 135 | `finance.finance_v57_analysis_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/19 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 136 | `finance.finance_v57_forecast_models` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 137 | `finance.finance_v57_generated_reports` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 138 | `finance.finance_v57_insights` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 139 | `finance.finance_v57_report_templates` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 140 | `finance.finance_v58_cash_pools` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 141 | `finance.finance_v58_forecast_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 142 | `finance.finance_v58_forecast_scenarios` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 143 | `finance.finance_v58_liquidity_targets` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 144 | `finance.finance_v58_optimization_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 145 | `finance.finance_v58_pool_allocations` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 146 | `finance.finance_v58_pool_transfers` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 147 | `finance.finance_v59_credit_profiles` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 148 | `finance.finance_v59_device_profiles` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 149 | `finance.finance_v59_fraud_decisions` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 150 | `finance.finance_v59_fraud_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 151 | `finance.finance_v59_fraud_signals` | 0 | 0 | Y | N | t/t/1 | 否 | 1/5 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 152 | `finance.finance_v59_scoring_models` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 153 | `finance.finance_v59_stress_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 154 | `finance.finance_v59_stress_scenarios` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 155 | `finance.finance_v60_alert_channels` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 156 | `finance.finance_v60_alert_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 157 | `finance.finance_v60_alerts` | 0 | 0 | Y | N | t/t/1 | 否 | 1/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 158 | `finance.finance_v60_decision_results` | 0 | 0 | Y | N | t/t/1 | 否 | 1/13 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 159 | `finance.finance_v60_decision_scenarios` | 0 | 0 | Y | N | t/t/1 | 否 | 1/13 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 160 | `finance.finance_v60_schedule_dependencies` | 0 | 0 | Y | N | t/t/1 | 否 | 1/1 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 161 | `finance.finance_v60_schedule_executions` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 162 | `finance.finance_v60_schedule_tasks` | 0 | 0 | Y | N | t/t/1 | 否 | 1/19 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 163 | `finance.finance_voucher_generation_rules` | 0 | 0 | Y | N | t/t/1 | 否 | 3/16 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 164 | `finance.finance_voucher_template_lines` | 0 | 0 | Y | N | t/t/1 | 否 | 3/23 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 165 | `finance.finance_voucher_templates` | 0 | 0 | Y | N | t/t/1 | 否 | 4/21 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 166 | `finance.financial_reports` | 0 | 0 | Y | N | t/t/1 | 否 | 2/10 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 167 | `finance.mv_receivable_aging` | 0 | 0 | Y | N | t/t/1 | 否 | 1/10 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 168 | `finance.mv_voucher_summary` | 0 | 0 | Y | N | t/t/1 | 否 | 2/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 169 | `finance.payables` | 0 | 0 | Y | N | t/t/1 | 否 | 2/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 170 | `finance.receivables` | 0 | 0 | Y | N | t/t/1 | 否 | 2/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 171 | `finance.reconcile_items` | 0 | 0 | Y | N | t/t/1 | 否 | 1/13 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 172 | `finance.reconcile_orders` | 0 | 0 | Y | N | t/t/1 | 否 | 2/24 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 173 | `finance.reconciliation_item_snapshots` | 0 | 0 | Y | N | t/t/1 | 否 | 1/10 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 174 | `finance.reconciliation_orders` | 0 | — | Y | N | t/t/1 | 否 | 0/0 | 死表 | 保持不动：0 行，结构已 fail-closed |
| 175 | `finance.reconciliation_settlement_links` | 0 | 0 | Y | N | t/t/1 | 否 | 1/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 176 | `finance.reconciliation_snapshots` | 0 | 0 | Y | N | t/t/1 | 否 | 2/32 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 177 | `finance.sales_invoices` | 0 | 0 | Y | N | t/t/1 | 否 | 1/49 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 178 | `finance.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 179 | `finance.settlement_center_dashboards` | 0 | 0 | Y | N | t/t/1 | 否 | 0/0 | 死表 | 保持不动：0 行，结构已 fail-closed |
| 180 | `finance.settlement_snapshots` | 0 | 0 | Y | N | t/t/1 | 否 | 2/24 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 181 | `finance.source_amount_snapshots` | 0 | 0 | Y | N | t/t/1 | 否 | 2/4 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 182 | `finance.voucher_lines` | 0 | 0 | N | N | f/f/0 | 否 | 1/1 | 死表 | 建议删表：已被 core_finance_voucher_lines 取代；仅剩 forecast_v53.rs:344 一处 SQL 引用，先清理再删 |
| 183 | `finance.vouchers` | 0 | 0 | Y | N | t/t/1 | 否 | 5/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 184 | `flow.approval_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/4 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 185 | `flow.approvals` | 0 | 0 | N | N | f/f/0 | 否 | 2/10 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 186 | `flow.audit_logs` | 0 | 0 | N | N | t/t/1 | true/true | 26/84 | 系统表 | 登记白名单：审计表无 tenant_id，须显式系统通道；建议补列后按系统通道读写 |
| 187 | `flow.core_doc_document_versions` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `public.core_doc_document_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| 188 | `flow.core_file_folders` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `iam.core_file_folders`、`public.core_file_folders` 同名重复，需先定权威表；确认后删冗余副本 |
| 189 | `flow.core_file_permissions` | 0 | 0 | N | N | f/f/0 | 否 | 1/1 | 空壳 | 需业务口径：与 `public.core_file_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| 190 | `flow.core_files` | 0 | 0 | N | N | f/f/0 | 否 | 5/20 | 空壳 | 需业务口径：与 `iam.core_files`、`public.core_files` 同名重复，需先定权威表；确认后删冗余副本 |
| 191 | `flow.core_flow_delegates` | 0 | 0 | N | N | f/f/0 | 否 | 1/10 | 空壳 | 需业务口径：与 `public.core_flow_delegates` 同名重复，需先定权威表；确认后删冗余副本 |
| 192 | `flow.core_flow_rules` | 0 | 0 | N | N | f/f/0 | 否 | 1/10 | 空壳 | 需业务口径：与 `public.core_flow_rules` 同名重复，需先定权威表；确认后删冗余副本 |
| 193 | `flow.core_flow_variable_history` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `public.core_flow_variable_history` 同名重复，需先定权威表；确认后删冗余副本 |
| 194 | `flow.core_flow_variables` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 空壳 | 需业务口径：与 `public.core_flow_variables` 同名重复，需先定权威表；确认后删冗余副本 |
| 195 | `flow.core_migration_history` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `iam.core_migration_history`、`public.core_migration_history` 同名重复，需先定权威表；确认后删冗余副本 |
| 196 | `flow.core_tenants` | 0 | 1 | N | N | f/f/0 | 否 | 8/39 | 空壳 | 需业务口径：与 `iam.core_tenants`、`public.core_tenants` 同名重复，需先定权威表；确认后删冗余副本 |
| 197 | `flow.core_workflow_tasks` | 0 | 0 | N | N | f/f/0 | 否 | 5/55 | 空壳 | 需业务口径：与 `iam.core_workflow_tasks`、`public.core_workflow_tasks` 同名重复，需先定权威表；确认后删冗余副本 |
| 198 | `flow.notifications` | 0 | 0 | N | N | t/t/1 | true/true | 2/3 | 空壳 | 可直接执行：补 tenant_id（0 行）并建 fail-closed |
| 199 | `flow.schema_defense_ledger` | 1 | 2 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 200 | `flow.workflows` | 0 | 18 | N | N | t/t/1 | true/true | 0/0 | 空壳 | 可直接执行：补 tenant_id（0 行）并建 fail-closed；另有 20 张 flow 有列无 RLS 表需一并处理 |
| 201 | `gis.audit_log` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 系统表 | 登记白名单：审计表，走显式系统通道 |
| 202 | `gis.audit_logs` | 0 | 1 | N | N | t/t/1 | true/true | 26/84 | 系统表 | 登记白名单：审计表，走显式系统通道 |
| 203 | `gis.geodata` | 0 | 2 | N | N | t/t/1 | true/true | 3/14 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 204 | `gis.geofeatures` | 0 | 0 | N | N | t/t/1 | true/true | 2/6 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 205 | `gis.geofence_alerts` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 206 | `gis.map_layers` | 0 | 0 | N | N | t/t/1 | true/true | 1/6 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 207 | `gis.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 208 | `gis.spatial_analysis` | 0 | 2 | N | N | t/t/1 | true/true | 1/6 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 209 | `gis.track_positions` | 0 | 0 | N | N | f/f/1 | true/true | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 210 | `hrm.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 211 | `iam._sqlx_migrations` | 0 | — | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 212 | `iam.audit_logs` | 0 | 0 | N | N | t/t/1 | true/true | 26/85 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 213 | `iam.auth_sessions` | 0 | — | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 214 | `iam.core_permissions` | 0 | 0 | N | N | f/f/0 | 否 | 14/31 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 215 | `iam.core_plugin_versions` | 0 | 0 | N | N | f/f/0 | 否 | 4/7 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 216 | `iam.core_role_permissions` | 0 | 0 | N | N | f/f/0 | 否 | 10/22 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 217 | `iam.core_tenants` | 0 | 0 | N | N | f/f/0 | 否 | 8/39 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 218 | `iam.core_user_roles` | 0 | 0 | N | N | f/f/0 | 否 | 13/26 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 219 | `iam.dynamic_data` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 220 | `iam.password_reset_tokens` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 221 | `iam.permissions` | 0 | 40 | N | N | t/t/1 | true/true | 12/23 | 系统表 | 登记白名单：权限字典，全局无租户列 |
| 222 | `iam.refresh_tokens` | 0 | — | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 223 | `iam.roles` | 4 | 9 | N | N | t/t/1 | true/true | 9/13 | 系统表 | 登记白名单：平台角色表，全局无租户列；当前策略含 NULL 分支 |
| 224 | `iam.schema_registry` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 225 | `iam.sessions` | 0 | — | N | N | f/f/0 | 否 | 1/1 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 226 | `iam.tool_permissions` | 0 | — | N | N | f/f/0 | 否 | 2/6 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 227 | `iam.user_access_logs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 228 | `iam.user_roles` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 229 | `iam.users` | 4 | 30 | N | N | f/f/0 | 否 | 35/200 | 系统表 | 登记白名单：平台身份表，租户归属由 core_tenant_users 承载；当前无 RLS，需确认是否全局共享 |
| 230 | `integration.mes_erp_sync_logs` | 0 | 0 | N | N | f/f/0 | 否 | 1/4 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 231 | `integration.schema_defense_ledger` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 232 | `mail.emails` | 0 | 23 | N | N | t/t/1 | true/true | 0/0 | 空壳 | 可直接执行：补 tenant_id（0 行）并改 fail-closed |
| 233 | `mail.templates` | 0 | 7 | N | N | t/t/1 | true/true | 2/3 | 死表 | 建议删表：0 行且无 SQL 引用；若保留邮件能力需随 mail.emails 一起补租户列 |
| 234 | `master_data.core_master_data_change_log` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `flow.core_master_data_change_log`、`public.core_master_data_change_log` 同名重复，需先定权威表；确认后删冗余副本 |
| 235 | `master_data.core_master_data_event_outbox` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `public.core_master_data_event_outbox` 同名重复，需先定权威表；确认后删冗余副本 |
| 236 | `master_data.core_master_data_refs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `flow.core_master_data_refs`、`public.core_master_data_refs` 同名重复，需先定权威表；确认后删冗余副本 |
| 237 | `master_data.core_mdm_approvals` | 0 | 0 | N | N | f/f/0 | 否 | 1/5 | 空壳 | 需业务口径：与 `flow.core_mdm_approvals`、`public.core_mdm_approvals` 同名重复，需先定权威表；确认后删冗余副本 |
| 238 | `master_data.core_mdm_reconciliation_log` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `flow.core_mdm_reconciliation_log`、`public.core_mdm_reconciliation_log` 同名重复，需先定权威表；确认后删冗余副本 |
| 239 | `master_data.dynamic_data` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 240 | `master_data.mdm_collections` | 0 | 57 | N | N | f/f/0 | 否 | 1/6 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 241 | `master_data.mdm_lifecycle_history` | 0 | 0 | N | Y | t/t/1 | 否 | 1/10 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 242 | `master_data.mdm_lifecycle_policies` | 0 | 1 | N | Y | t/t/1 | 否 | 1/11 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 243 | `master_data.mdm_lifecycle_stages` | 0 | 2 | N | Y | t/t/1 | 否 | 1/16 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 244 | `master_data.mdm_metadata_attributes` | 0 | 0 | N | Y | t/t/1 | 否 | 1/6 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 245 | `master_data.mdm_metadata_tags` | 0 | 3 | N | Y | t/t/1 | 否 | 1/5 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 246 | `master_data.mdm_quality_rules` | 0 | 67 | N | N | f/f/0 | 否 | 1/14 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 247 | `master_data.mdm_rate_cards` | 0 | 0 | N | Y | t/t/1 | 否 | 1/7 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 248 | `master_data.mdm_sla_configs` | 0 | 0 | N | Y | t/t/1 | 否 | 1/13 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 249 | `master_data.mdm_v60_lineage_edges` | 0 | 6 | N | Y | t/t/1 | 否 | 1/10 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 250 | `master_data.mdm_v60_lineage_graphs` | 0 | 2 | N | Y | t/t/1 | 否 | 1/8 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 251 | `master_data.mdm_v60_lineage_nodes` | 0 | 8 | N | Y | t/t/1 | 否 | 1/8 | 字典表 | 需业务口径：主数据是否跨租户全局共享未定；暂登记白名单 |
| 252 | `master_data.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 253 | `master_data.schema_registry` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 254 | `mes.audit_logs` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 26/93 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 255 | `mes.batch_records` | 0 | 0 | Y | N | t/t/1 | 否 | 2/11 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 256 | `mes.bom_items` | 0 | 0 | Y | N | t/t/1 | 否 | 4/9 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 257 | `mes.capacities` | 0 | 0 | Y | N | t/t/1 | 否 | 5/32 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 258 | `mes.dashboard_stats` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 0/0 | 死表 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 259 | `mes.demand_forecasts` | 0 | 0 | Y | N | t/t/1 | 否 | 2/21 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 260 | `mes.equipment` | 0 | 11 | Y | N | t/t/1 | NULL 分支 | 12/84 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 261 | `mes.equipment_inspection_records` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 1/8 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 262 | `mes.equipment_inspections` | 0 | 0 | Y | N | t/t/1 | 否 | 3/13 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 263 | `mes.equipment_maintenance_records` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 3/16 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 264 | `mes.equipment_oee` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 6/42 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 265 | `mes.financial_records` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 0/0 | 死表 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 266 | `mes.material_boms` | 0 | 0 | Y | N | t/t/1 | 否 | 5/22 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 267 | `mes.material_categories` | 0 | 0 | Y | N | t/t/1 | 否 | 1/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 268 | `mes.material_issue_items` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 269 | `mes.material_issues` | 0 | 0 | Y | N | t/t/1 | 否 | 2/16 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 270 | `mes.material_plans` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 3/27 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 271 | `mes.material_requirement_items` | 0 | 0 | Y | N | t/t/1 | 否 | 0/0 | 死表 | 保持不动：0 行，结构已 fail-closed |
| 272 | `mes.material_requirements` | 0 | 0 | Y | N | t/t/1 | 否 | 3/21 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 273 | `mes.material_return_items` | 0 | 0 | Y | N | t/t/1 | 否 | 1/3 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 274 | `mes.material_returns` | 0 | 0 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 275 | `mes.module_settings` | 0 | 3 | Y | N | t/t/1 | NULL 分支 | 7/23 | 字典表 | 保持不动：字典/默认数据，NULL 读分支为全局默认；登记字典白名单 |
| 276 | `mes.process_flow_steps` | 0 | 0 | Y | N | t/t/1 | 否 | 1/7 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 277 | `mes.process_flows` | 0 | 1 | Y | N | t/t/1 | 否 | 2/17 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 278 | `mes.process_route_steps` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 1/7 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 279 | `mes.process_routes` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 4/22 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 280 | `mes.production_costs` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 1/6 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 281 | `mes.production_lines` | 0 | 0 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 282 | `mes.production_orders` | 0 | 134 | Y | N | t/t/1 | NULL 分支 | 16/137 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 283 | `mes.production_plans` | 0 | 0 | Y | N | t/t/1 | 否 | 2/25 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 284 | `mes.production_processes` | 0 | 10 | Y | N | t/t/1 | NULL 分支 | 11/43 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 285 | `mes.production_records` | 0 | 3 | Y | N | t/t/1 | NULL 分支 | 4/31 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 286 | `mes.production_schedules` | 0 | 9678 | Y | N | t/t/1 | NULL 分支 | 3/31 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 287 | `mes.quality_inspections` | 0 | 2 | Y | N | t/t/1 | 否 | 3/18 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 288 | `mes.quality_patrol_items` | 0 | 0 | Y | N | t/t/1 | 否 | 2/12 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 289 | `mes.quality_patrols` | 0 | 0 | Y | N | t/t/1 | 否 | 2/20 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 290 | `mes.quality_records` | 0 | 0 | Y | N | t/t/1 | 否 | 4/22 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 291 | `mes.quality_standard_values` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 1/6 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 292 | `mes.quality_standards` | 0 | 1 | Y | N | t/t/1 | true/true | 2/16 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 293 | `mes.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 294 | `mes.shifts` | 0 | 0 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 295 | `mes.supply_chain_orders` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 0/0 | 死表 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 296 | `mes.team_members` | 0 | 0 | Y | N | t/t/1 | 否 | 3/18 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 297 | `mes.teams` | 0 | 0 | Y | N | t/t/1 | NULL 分支 | 5/32 | 空壳 | 可直接执行：删 nil/NULL 分支改 fail-closed(app.rls_system)；另补 prod 缺失的 ck_teams_status_standard |
| 298 | `mes.tenant_backfill_quarantine` | 0 | — | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 299 | `mes.wip_transfers` | 0 | 0 | Y | N | t/t/1 | 否 | 2/13 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 300 | `mes.wips` | 0 | 2 | Y | N | t/t/1 | 否 | 4/32 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 301 | `mes.work_calendars` | 0 | 0 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 302 | `mes.work_orders` | 0 | 56 | Y | N | t/t/1 | 否 | 4/67 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 303 | `mes.work_reports` | 0 | 0 | Y | N | t/t/2 | NULL 分支 | 1/9 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 304 | `mes.work_stations` | 0 | 79 | Y | N | t/t/1 | NULL 分支 | 11/50 | 空壳 | 可直接执行：改造为 fail-closed（去掉 tenant_id IS NULL / USING(true) 分支） |
| 305 | `mes.workshops` | 0 | 0 | Y | N | t/t/1 | 否 | 1/6 | 空壳 | 保持不动：0 行，结构已 fail-closed |
| 306 | `mobile.mobile_attendance` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 307 | `mobile.mobile_leave_applications` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 308 | `mobile.oa_announcement_reads` | 0 | 1 | N | N | t/t/1 | true/true | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 309 | `mobile.schema_defense_ledger` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 310 | `notification.notifications` | 0 | 62 | N | N | t/t/1 | true/true | 2/3 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 311 | `pdm.pdm_master_data_refs` | 0 | 1 | N | N | t/t/2 | true/true | 1/1 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 312 | `pdm.schema_defense_ledger` | 0 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 313 | `plugin_finance.source_amount_snapshots` | 0 | 0 | N | N | f/f/0 | 否 | 2/2 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 314 | `plugin_wms.purchase_order_snapshots` | 0 | 0 | N | N | f/f/0 | 否 | 2/2 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 315 | `pm.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 316 | `pm.service_integrations` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 317 | `portal.core_faqs` | 0 | 0 | N | N | f/f/0 | 否 | 2/11 | 空壳 | 需业务口径：与 `iam.core_faqs`、`public.core_faqs` 同名重复，需先定权威表；确认后删冗余副本 |
| 318 | `portal.core_guide_lessons` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `iam.core_guide_lessons`、`public.core_guide_lessons` 同名重复，需先定权威表；确认后删冗余副本 |
| 319 | `portal.core_guide_progress` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `iam.core_guide_progress`、`public.core_guide_progress` 同名重复，需先定权威表；确认后删冗余副本 |
| 320 | `portal.core_guides` | 0 | 0 | N | N | f/f/0 | 否 | 2/7 | 空壳 | 需业务口径：与 `iam.core_guides`、`public.core_guides` 同名重复，需先定权威表；确认后删冗余副本 |
| 321 | `portal.federation_compensation_logs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 322 | `portal.federation_execution_logs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 323 | `portal.federation_query_plans` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 324 | `portal.federation_subgraphs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 325 | `portal.federation_transaction_steps` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 326 | `portal.federation_transactions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 327 | `portal.gateway_degradation_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 328 | `portal.gateway_health_metrics` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 329 | `portal.gateway_protocols` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 330 | `portal.gateway_routes` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 331 | `portal.graphql_breaking_changes` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 332 | `portal.graphql_execution_metrics` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 333 | `portal.graphql_execution_profiles` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 334 | `portal.graphql_optimization_history` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 335 | `portal.graphql_schema_versions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 336 | `portal.graphql_stream_events` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 337 | `portal.graphql_stream_subscribers` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 338 | `portal.graphql_streams` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 339 | `portal.graphql_suggestions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 340 | `portal.graphql_version_negotiations` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 341 | `portal.intelligent_gw_affinities` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 342 | `portal.intelligent_gw_conflicts` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 343 | `portal.intelligent_gw_routing_table` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 344 | `portal.intelligent_gw_stitch_logs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 345 | `portal.intelligent_gw_stitch_plans` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 346 | `portal.portal_accel_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 347 | `portal.portal_acceleration_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 348 | `portal.portal_acceleration_results` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 349 | `portal.portal_access_decisions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 350 | `portal.portal_access_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 351 | `portal.portal_aggregation_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 352 | `portal.portal_aggregation_results` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 353 | `portal.portal_alert_thresholds` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 354 | `portal.portal_announcements` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并改 fail-closed |
| 355 | `portal.portal_anomalies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 356 | `portal.portal_api_versions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 357 | `portal.portal_audit_entries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 358 | `portal.portal_audit_exports` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 359 | `portal.portal_auth_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 360 | `portal.portal_backpressure_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 361 | `portal.portal_backpressure_states` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 362 | `portal.portal_cache_entries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 363 | `portal.portal_cache_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 364 | `portal.portal_cache_versions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 365 | `portal.portal_canary_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 366 | `portal.portal_canary_results` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 367 | `portal.portal_compatibility_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 368 | `portal.portal_compatibility_reports` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 369 | `portal.portal_compilation_rules` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 370 | `portal.portal_compiled_queries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 371 | `portal.portal_config_diffs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 372 | `portal.portal_config_environments` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 373 | `portal.portal_consistency_checks` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 374 | `portal.portal_dead_letter_queue` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 375 | `portal.portal_dedup_results` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 376 | `portal.portal_dedup_rules` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 377 | `portal.portal_deployment_steps` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 378 | `portal.portal_deployments` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 379 | `portal.portal_detection_models` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 380 | `portal.portal_distributed_queries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 381 | `portal.portal_edge_cache` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 382 | `portal.portal_edge_deployments` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 383 | `portal.portal_edge_entries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 384 | `portal.portal_edge_functions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 385 | `portal.portal_edge_replication` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 386 | `portal.portal_execution_plans` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 387 | `portal.portal_execution_steps` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 388 | `portal.portal_federated_identities` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 389 | `portal.portal_gateway_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 390 | `portal.portal_healing_actions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 391 | `portal.portal_health_checks` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 392 | `portal.portal_identity_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 393 | `portal.portal_invalidation_events` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 394 | `portal.portal_latency_stats` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 395 | `portal.portal_masking_rules` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 396 | `portal.portal_metrics` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 397 | `portal.portal_orchestration_plans` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 398 | `portal.portal_persisted_queries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 399 | `portal.portal_persisted_query_versions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 400 | `portal.portal_plan_steps` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 401 | `portal.portal_push_stats` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 402 | `portal.portal_queue_configs` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 403 | `portal.portal_queue_messages` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 404 | `portal.portal_quick_actions` | 0 | 5 | N | N | t/t/1 | true/true | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并改 fail-closed |
| 405 | `portal.portal_recovery_plans` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 406 | `portal.portal_replay_requests` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 407 | `portal.portal_replay_results` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 408 | `portal.portal_resolver_timings` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 409 | `portal.portal_rollback_actions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 410 | `portal.portal_rollback_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 411 | `portal.portal_route_rules` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 412 | `portal.portal_routing_decisions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 413 | `portal.portal_routing_rules` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 414 | `portal.portal_security_events` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 415 | `portal.portal_security_incidents` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 416 | `portal.portal_security_policies` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 417 | `portal.portal_service_descriptors` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 418 | `portal.portal_service_heartbeats` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 419 | `portal.portal_service_loads` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 420 | `portal.portal_stream_events` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 421 | `portal.portal_streams` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 422 | `portal.portal_sub_queries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 423 | `portal.portal_subscribers` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 424 | `portal.portal_subscription_channels` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 425 | `portal.portal_subscription_events` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 426 | `portal.portal_subscription_records` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 427 | `portal.portal_traces` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 428 | `portal.portal_trust_decisions` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 429 | `portal.portal_version_mappings` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 430 | `portal.portal_version_vectors` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 431 | `portal.user_preferences` | 0 | 3 | N | N | t/t/1 | true/true | 1/2 | 字典表 | 登记白名单：用户主体偏好，租户归属经 user→tenant 关联，不需 tenant_id |
| 432 | `public._archive_core_doc_documents` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 433 | `public._archive_core_doc_folders` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 434 | `public._archive_core_doc_templates` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 435 | `public._sqlx_migrations` | 680 | 572 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：迁移账本，全局（prod 行数为 2026-11-15 实测，采集时 673；dev 为采集值） |
| 436 | `public.alert_rules` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 437 | `public.alerts` | 0 | 4 | N | N | t/t/1 | true/true | 4/5 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 438 | `public.analytics_sync_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/8 | 空壳 | 需业务口径：与 `analytics.analytics_sync_records`、`bi.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 439 | `public.announcements` | 0 | 0 | N | N | f/f/0 | 否 | 2/10 | 空壳 | 需业务口径：与 `erp.announcements` 同名重复，需先定权威表；确认后删冗余副本 |
| 440 | `public.core_api_version_configs` | 0 | 0 | N | N | f/f/0 | 否 | 1/18 | 字典表 | 登记白名单：全局字典/配置，无租户列 |
| 441 | `public.core_doc_document_versions` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `flow.core_doc_document_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| 442 | `public.core_file_permissions` | 0 | 0 | N | N | f/f/0 | 否 | 1/1 | 空壳 | 需业务口径：与 `flow.core_file_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| 443 | `public.core_finance_account_opening_balances` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 444 | `public.core_finance_approval_workflows` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `finance.core_finance_approval_workflows` 同名重复，需先定权威表；确认后删冗余副本 |
| 445 | `public.core_finance_aux_accounts` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 空壳 | 需业务口径：与 `finance.core_finance_aux_accounts` 同名重复，需先定权威表；确认后删冗余副本 |
| 446 | `public.core_finance_aux_balances` | 0 | 0 | N | N | f/f/0 | 否 | 3/8 | 空壳 | 需业务口径：与 `finance.core_finance_aux_balances` 同名重复，需先定权威表；确认后删冗余副本 |
| 447 | `public.core_finance_ledger` | 0 | 0 | N | N | f/f/0 | 否 | 8/30 | 空壳 | 需业务口径：与 `finance.core_finance_ledger` 同名重复，需先定权威表；确认后删冗余副本 |
| 448 | `public.core_finance_periods` | 0 | 0 | N | N | f/f/0 | 否 | 4/12 | 空壳 | 需业务口径：与 `finance.core_finance_periods` 同名重复，需先定权威表；确认后删冗余副本 |
| 449 | `public.core_finance_reconciliation_items` | 0 | 0 | N | N | f/f/0 | 否 | 2/23 | 空壳 | 需业务口径：与 `finance.core_finance_reconciliation_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 450 | `public.core_finance_reconciliation_sessions` | 0 | 0 | N | N | f/f/0 | 否 | 2/9 | 空壳 | 需业务口径：与 `finance.core_finance_reconciliation_sessions` 同名重复，需先定权威表；确认后删冗余副本 |
| 451 | `public.core_finance_voucher_entries` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 452 | `public.core_finance_voucher_lines` | 0 | 0 | N | N | f/f/0 | 否 | 8/28 | 空壳 | 需业务口径：与 `finance.core_finance_voucher_lines` 同名重复，需先定权威表；确认后删冗余副本 |
| 453 | `public.core_finance_voucher_templates` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |
| 454 | `public.core_geofences` | 0 | 0 | N | N | f/f/0 | 否 | 1/16 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 455 | `public.core_master_data_event_outbox` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `master_data.core_master_data_event_outbox` 同名重复，需先定权威表；确认后删冗余副本 |
| 456 | `public.core_permissions` | 1157 | 1204 | N | N | f/f/0 | 否 | 14/58 | 系统表 | 登记白名单：平台权限字典，全局无租户列，无需补列 |
| 457 | `public.core_plugin_categories` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `core.core_plugin_categories`、`iam.core_plugin_categories` 同名重复，需先定权威表；确认后删冗余副本 |
| 458 | `public.core_plugin_instances` | 0 | 0 | N | N | f/f/0 | 否 | 5/12 | 空壳 | 需业务口径：与 `core.core_plugin_instances`、`iam.core_plugin_instances` 同名重复，需先定权威表；确认后删冗余副本 |
| 459 | `public.core_plugin_navigation` | 0 | 0 | N | N | f/f/0 | 否 | 1/1 | 空壳 | 需业务口径：与 `core.core_plugin_navigation` 同名重复，需先定权威表；确认后删冗余副本 |
| 460 | `public.core_plugin_permissions` | 0 | 0 | N | N | f/f/0 | 否 | 2/2 | 空壳 | 需业务口径：与 `core.core_plugin_permissions`、`iam.core_plugin_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| 461 | `public.core_plugin_reviews` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `core.core_plugin_reviews`、`iam.core_plugin_reviews` 同名重复，需先定权威表；确认后删冗余副本 |
| 462 | `public.core_plugin_versions` | 0 | 0 | N | N | f/f/0 | 否 | 4/7 | 空壳 | 需业务口径：与 `core.core_plugin_versions`、`iam.core_plugin_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| 463 | `public.core_plugins` | 0 | 0 | N | N | f/f/0 | 否 | 7/46 | 空壳 | 需业务口径：与 `core.core_plugins`、`iam.core_plugins` 同名重复，需先定权威表；确认后删冗余副本 |
| 464 | `public.core_role_permissions` | 2917 | 3542 | N | N | f/f/0 | 否 | 10/44 | 系统表 | 登记白名单：角色-权限映射，全局无租户列 |
| 465 | `public.core_tenant_plugins` | 0 | 0 | N | N | f/f/0 | 否 | 3/19 | 空壳 | 需业务口径：与 `core.core_tenant_plugins`、`iam.core_tenant_plugins` 同名重复，需先定权威表；确认后删冗余副本 |
| 466 | `public.core_user_roles` | 3 | 13 | N | N | f/f/0 | 否 | 13/49 | 系统表 | 登记白名单：用户-角色映射，全局无租户列 |
| 467 | `public.dynamic_data` | 0 | 0 | N | N | f/f/0 | 否 | 1/12 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 468 | `public.equipment` | 0 | — | N | N | f/f/0 | 否 | 12/58 | 空壳 | 需业务口径：与 `mes.equipment`、`rs.equipment` 同名重复，需先定权威表；确认后删冗余副本 |
| 469 | `public.equipment_inspections` | 0 | 0 | N | N | f/f/0 | 否 | 3/8 | 空壳 | 需业务口径：与 `mes.equipment_inspections`、`rs.equipment_inspections` 同名重复，需先定权威表；确认后删冗余副本 |
| 470 | `public.equipment_maintenance_records` | 0 | 0 | N | N | f/f/0 | 否 | 3/10 | 空壳 | 需业务口径：与 `mes.equipment_maintenance_records`、`rs.equipment_maintenance_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 471 | `public.material_boms` | 0 | 0 | N | N | f/f/0 | 否 | 5/15 | 空壳 | 需业务口径：与 `mes.material_boms` 同名重复，需先定权威表；确认后删冗余副本 |
| 472 | `public.material_categories` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 空壳 | 需业务口径：与 `mes.material_categories` 同名重复，需先定权威表；确认后删冗余副本 |
| 473 | `public.material_issue_items` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `mes.material_issue_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 474 | `public.material_issues` | 0 | 0 | N | N | f/f/0 | 否 | 2/11 | 空壳 | 需业务口径：与 `mes.material_issues` 同名重复，需先定权威表；确认后删冗余副本 |
| 475 | `public.material_requirement_items` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `mes.material_requirement_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 476 | `public.material_requirements` | 0 | 0 | N | N | f/f/0 | 否 | 3/16 | 空壳 | 需业务口径：与 `mes.material_requirements` 同名重复，需先定权威表；确认后删冗余副本 |
| 477 | `public.material_return_items` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `mes.material_return_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 478 | `public.material_returns` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 空壳 | 需业务口径：与 `mes.material_returns` 同名重复，需先定权威表；确认后删冗余副本 |
| 479 | `public.meeting_bookings` | 0 | 0 | N | N | f/f/0 | 否 | 1/9 | 空壳 | 需业务口径：与 `erp.meeting_bookings` 同名重复，需先定权威表；确认后删冗余副本 |
| 480 | `public.meeting_rooms` | 0 | 0 | N | N | f/f/0 | 否 | 1/8 | 空壳 | 需业务口径：与 `erp.meeting_rooms` 同名重复，需先定权威表；确认后删冗余副本 |
| 481 | `public.navigation_menu` | 0 | 8 | N | N | t/t/1 | true/true | 0/0 | 字典表 | 登记白名单：全局字典/配置，无租户列 |
| 482 | `public.pinned_apps` | 0 | 3 | N | N | t/t/1 | true/true | 0/0 | 字典表 | 登记白名单：全局字典/配置，无租户列 |
| 483 | `public.process_flow_steps` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 空壳 | 需业务口径：与 `mes.process_flow_steps` 同名重复，需先定权威表；确认后删冗余副本 |
| 484 | `public.process_flows` | 0 | 0 | N | N | f/f/0 | 否 | 2/12 | 空壳 | 需业务口径：与 `mes.process_flows` 同名重复，需先定权威表；确认后删冗余副本 |
| 485 | `public.qa_ehs_accident_investigations` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_accident_investigations` 同名重复，需先定权威表；确认后删冗余副本 |
| 486 | `public.qa_ehs_accident_reviews` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_accident_reviews` 同名重复，需先定权威表；确认后删冗余副本 |
| 487 | `public.qa_ehs_accident_treatments` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_accident_treatments` 同名重复，需先定权威表；确认后删冗余副本 |
| 488 | `public.qa_ehs_accidents` | 0 | 0 | N | N | f/f/0 | 否 | 3/12 | 空壳 | 需业务口径：与 `ehs.qa_ehs_accidents` 同名重复，需先定权威表；确认后删冗余副本 |
| 489 | `public.qa_ehs_compliance_items` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_compliance_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 490 | `public.qa_ehs_contraindications` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `ehs.qa_ehs_contraindications` 同名重复，需先定权威表；确认后删冗余副本 |
| 491 | `public.qa_ehs_detection_records` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_detection_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 492 | `public.qa_ehs_emergency_plans` | 0 | 0 | N | N | f/f/0 | 否 | 2/6 | 空壳 | 需业务口径：与 `ehs.qa_ehs_emergency_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| 493 | `public.qa_ehs_environment` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_environment` 同名重复，需先定权威表；确认后删冗余副本 |
| 494 | `public.qa_ehs_hazard_rectifications` | 0 | 0 | N | N | f/f/0 | 否 | 2/5 | 空壳 | 需业务口径：与 `ehs.qa_ehs_hazard_rectifications` 同名重复，需先定权威表；确认后删冗余副本 |
| 495 | `public.qa_ehs_hazard_verifications` | 0 | 0 | N | N | f/f/0 | 否 | 2/2 | 空壳 | 需业务口径：与 `ehs.qa_ehs_hazard_verifications` 同名重复，需先定权威表；确认后删冗余副本 |
| 496 | `public.qa_ehs_hazardous_materials` | 0 | 0 | N | N | f/f/0 | 否 | 2/12 | 空壳 | 需业务口径：与 `ehs.qa_ehs_hazardous_materials` 同名重复，需先定权威表；确认后删冗余副本 |
| 497 | `public.qa_ehs_hazards` | 0 | 87 | N | N | f/f/0 | 否 | 5/26 | 空壳 | 需业务口径：与 `ehs.qa_ehs_hazards`、`qms.qa_ehs_hazards` 同名重复，需先定权威表；确认后删冗余副本 |
| 498 | `public.qa_ehs_health_abnormalities` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_health_abnormalities` 同名重复，需先定权威表；确认后删冗余副本 |
| 499 | `public.qa_ehs_health_exam_plans` | 0 | 0 | N | N | f/f/0 | 否 | 1/3 | 空壳 | 需业务口径：与 `ehs.qa_ehs_health_exam_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| 500 | `public.qa_ehs_health_exam_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/5 | 空壳 | 需业务口径：与 `ehs.qa_ehs_health_exam_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 501 | `public.qa_ehs_health_trainings` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_health_trainings` 同名重复，需先定权威表；确认后删冗余副本 |
| 502 | `public.qa_ehs_inspection_items` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `ehs.qa_ehs_inspection_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 503 | `public.qa_ehs_inspection_plans` | 0 | 0 | N | N | f/f/0 | 否 | 2/6 | 空壳 | 需业务口径：与 `ehs.qa_ehs_inspection_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| 504 | `public.qa_ehs_material_stocks` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_material_stocks` 同名重复，需先定权威表；确认后删冗余副本 |
| 505 | `public.qa_ehs_protection_measures` | 0 | 0 | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `ehs.qa_ehs_protection_measures` 同名重复，需先定权威表；确认后删冗余副本 |
| 506 | `public.qa_ehs_risks` | 0 | 0 | N | N | f/f/0 | 否 | 2/12 | 空壳 | 需业务口径：与 `ehs.qa_ehs_risks` 同名重复，需先定权威表；确认后删冗余副本 |
| 507 | `public.qa_ehs_stock_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 空壳 | 需业务口径：与 `ehs.qa_ehs_stock_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 508 | `public.qa_ehs_sync_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/7 | 空壳 | 需业务口径：与 `ehs.qa_ehs_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| 509 | `public.qa_ehs_trainings` | 0 | 0 | N | N | f/f/0 | 否 | 3/10 | 空壳 | 需业务口径：与 `ehs.qa_ehs_trainings` 同名重复，需先定权威表；确认后删冗余副本 |
| 510 | `public.quality_inspections` | 0 | 0 | N | N | f/f/0 | 否 | 3/12 | 空壳 | 需业务口径：与 `mes.quality_inspections`、`qms.quality_inspections` 同名重复，需先定权威表；确认后删冗余副本 |
| 511 | `public.quality_patrol_items` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：与 `mes.quality_patrol_items` 同名重复，需先定权威表；确认后删冗余副本 |
| 512 | `public.quality_patrols` | 0 | 0 | N | N | f/f/0 | 否 | 2/13 | 空壳 | 需业务口径：与 `mes.quality_patrols` 同名重复，需先定权威表；确认后删冗余副本 |
| 513 | `public.quality_standard_values` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 空壳 | 需业务口径：与 `mes.quality_standard_values` 同名重复，需先定权威表；确认后删冗余副本 |
| 514 | `public.quality_standards` | 0 | 0 | N | N | f/f/0 | 否 | 2/11 | 空壳 | 需业务口径：与 `mes.quality_standards`、`qms.quality_standards` 同名重复，需先定权威表；确认后删冗余副本 |
| 515 | `public.refresh_tokens` | 0 | — | N | N | f/f/0 | 否 | 0/0 | 死表 | 需业务口径：与 `iam.refresh_tokens` 同名重复，需先定权威表；确认后删冗余副本 |
| 516 | `public.schema_defense_ledger` | 4 | 11 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：运行期防御账本，全局 |
| 517 | `public.schema_registry` | 0 | 0 | N | N | f/f/0 | 否 | 1/14 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 518 | `public.search_logs` | 0 | 11 | N | N | f/f/0 | 否 | 1/5 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 519 | `public.search_recent` | 0 | — | N | N | f/f/0 | 否 | 1/7 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 520 | `public.sys_db_changes` | 0 | 0 | N | N | f/f/0 | 否 | 1/2 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 521 | `public.tenants` | 0 | 1 | N | N | f/f/0 | 否 | 1/1 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 522 | `public.ticket_automation_rules` | 0 | 0 | N | N | f/f/0 | 否 | 2/8 | 空壳 | 需业务口径：与 `ticket.ticket_automation_rules` 同名重复，需先定权威表；确认后删冗余副本 |
| 523 | `public.ticket_knowledge_articles` | 0 | 0 | N | N | f/f/0 | 否 | 1/5 | 空壳 | 需业务口径：与 `ticket.ticket_knowledge_articles` 同名重复，需先定权威表；确认后删冗余副本 |
| 524 | `public.todos` | 0 | 4 | N | N | t/t/1 | true/true | 2/3 | 字典表 | 登记白名单：全局字典/配置，无租户列 |
| 525 | `public.user_settings` | 0 | 2 | N | N | t/t/1 | true/true | 0/0 | 字典表 | 登记白名单：全局字典/配置，无租户列 |
| 526 | `public.vehicle_requests` | 0 | 0 | N | N | f/f/0 | 否 | 1/9 | 空壳 | 需业务口径：与 `erp.vehicle_requests` 同名重复，需先定权威表；确认后删冗余副本 |
| 527 | `public.vehicles` | 0 | 0 | N | N | f/f/0 | 否 | 3/10 | 空壳 | 需业务口径：与 `erp.vehicles` 同名重复，需先定权威表；确认后删冗余副本 |
| 528 | `qms.audit_logs` | 0 | 0 | N | N | t/t/1 | true/true | 26/84 | 系统表 | 登记白名单：审计表，走显式系统通道 |
| 529 | `qms.corrective_actions` | 0 | 0 | N | N | t/t/1 | true/true | 1/2 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 530 | `qms.dashboard_metrics` | 0 | 10 | N | N | t/t/1 | true/true | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 531 | `qms.inspection_items` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 532 | `qms.qa_apqp_approvals` | 0 | 0 | N | N | f/f/0 | 否 | 1/8 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 533 | `qms.qa_inspection_plan_items` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 534 | `qms.quality_inspections` | 0 | 43 | N | N | t/t/1 | true/true | 3/12 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 535 | `qms.quality_issues` | 0 | 0 | N | N | t/t/1 | true/true | 0/0 | 死表 | 保持不动：0 行 0 引用，但运行期 schema_defense 会自愈重建；清理需先移除注册 |
| 536 | `qms.quality_standards` | 0 | 4 | N | N | t/t/1 | true/true | 2/11 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并建 fail-closed |
| 537 | `qms.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 538 | `rd.bugs` | 0 | 0 | N | N | f/f/0 | 否 | 1/9 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 539 | `rd.builds` | 0 | 218 | N | N | f/f/0 | 否 | 1/5 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 540 | `rd.deploys` | 0 | 218 | N | N | f/f/0 | 否 | 1/11 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 541 | `rd.test_cases` | 0 | 0 | N | N | f/f/0 | 否 | 1/9 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 542 | `report.reports` | 0 | 40 | N | N | t/t/1 | true/true | 4/18 | 空壳 | 可直接执行：补 tenant_id（0 行无回填成本）并改 fail-closed |
| 543 | `rs.ai_analyses` | 0 | 0 | N | N | f/f/0 | 否 | 1/10 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 544 | `rs.document_relations` | 0 | 0 | N | N | f/f/0 | 否 | 1/12 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 545 | `rs.equipment` | 0 | — | N | N | f/f/0 | 否 | 12/58 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 546 | `rs.equipment_inspections` | 0 | 0 | N | N | f/f/0 | 否 | 3/8 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 547 | `rs.equipment_maintenance_records` | 0 | 0 | N | N | f/f/0 | 否 | 3/10 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 548 | `rs.experiment_records` | 0 | 0 | N | N | f/f/0 | 否 | 1/4 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 549 | `rs.patents` | 0 | 0 | N | N | f/f/0 | 否 | 1/16 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 550 | `rs.research_costs` | 0 | 0 | N | N | f/f/0 | 否 | 1/18 | 空壳 | 需业务口径：rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| 551 | `rs.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 552 | `shared.audit_logs` | 0 | 0 | N | N | f/f/0 | 否 | 26/84 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 553 | `srm.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 554 | `storage.files` | 0 | 43 | N | N | t/t/1 | true/true | 3/4 | 空壳 | 需业务口径：文件归属按租户还是按业务对象未定；暂登记 |
| 555 | `ticket.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 556 | `tms.schema_defense_ledger` | 1 | 1 | N | N | f/f/0 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 557 | `unified_core.documents` | 0 | 0 | N | N | f/f/0 | 否 | 13/50 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 558 | `unified_core.password_resets` | 0 | 0 | N | N | f/f/0 | 否 | 1/6 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 559 | `wms.schema_defense_ledger` | 1 | 1 | N | N | t/f/1 | 否 | 0/0 | 系统表 | 登记白名单：系统表，无业务租户语义，不补列 |
| 560 | `wms.wms_master_data_refs` | 0 | 0 | N | N | t/t/1 | 否 | 0/0 | 死表 | 建议删表：0 行 0 引用且无 schema_defense 注册 |

## 3. 三节小结

### ① 可直接执行的动作（不需业务决策）— 72 条

**A1 建议删表（17 张，0 行 0 引用且无 schema_defense 注册）**

`finance.finance_audit_rules_v`、`finance.finance_budget_variances_v`、`finance.finance_cash_flow_predictions_v`、`finance.finance_prediction_models_v`、`finance.finance_u`、`finance.finance_v`、`finance.voucher_lines`、`gis.geofence_alerts`、`mail.templates`、`pm.service_integrations`、`public._archive_core_doc_documents`、`public._archive_core_doc_folders`、`public._archive_core_doc_templates`、`public.core_finance_account_opening_balances`、`public.core_finance_voucher_entries`、`public.core_finance_voucher_templates`、`wms.wms_master_data_refs`

**A2 补 tenant_id + 建 fail-closed（35 张，均 0 行）**

`ai.user_profiles`、`ai.vectors`、`bi.bi_datasets`、`communication.core_location_messages`、`erp.account_balances`、`erp.asset_categories`、`erp.expenses`、`erp.meeting_bookings`、`erp.meeting_rooms`、`erp.office_supplies`、`erp.vehicle_requests`、`erp.vehicles`、`flow.approval_records`、`flow.approvals`、`flow.notifications`、`flow.workflows`、`gis.geodata`、`gis.geofeatures`、`gis.map_layers`、`gis.spatial_analysis`、`gis.track_positions`、`integration.mes_erp_sync_logs`、`mail.emails`、`mobile.mobile_attendance`、`mobile.oa_announcement_reads`、`pdm.pdm_master_data_refs`、`portal.portal_announcements`、`portal.portal_quick_actions`、`public.core_geofences`、`qms.corrective_actions`、`qms.qa_apqp_approvals`、`qms.qa_inspection_plan_items`、`qms.quality_inspections`、`qms.quality_standards`、`report.reports`

**A3 启用 RLS（0 张，已有 tenant_id 但 RLS=off）**



> 本批范围内没有「已有 tenant_id 但 RLS=off」的表；`flow` 的 20 张同类空洞不在本批 scope，见 §6。

**A4 改造为 fail-closed（19 张，去 NULL / true 分支）**

`mes.dashboard_stats`、`mes.equipment`、`mes.equipment_inspection_records`、`mes.equipment_maintenance_records`、`mes.equipment_oee`、`mes.financial_records`、`mes.material_plans`、`mes.process_route_steps`、`mes.process_routes`、`mes.production_costs`、`mes.production_orders`、`mes.production_processes`、`mes.production_records`、`mes.production_schedules`、`mes.quality_standard_values`、`mes.quality_standards`、`mes.supply_chain_orders`、`mes.work_reports`、`mes.work_stations`

**A5 其他可直接执行（1 张）**

- `mes.teams`：删 nil/NULL 分支改 fail-closed(app.rls_system)；另补 prod 缺失的 ck_teams_status_standard

### ② 需业务口径的动作 — 154 条

| schema.table | 缺的那一条口径 |
|---|---|
| `analytics.analytics_datasets` | 与 `bi.analytics_datasets` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.analytics_sync_records` | 与 `bi.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.report_execution_records` | 与 `bi.report_execution_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.report_schedules` | 与 `bi.report_schedules` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.report_subscriptions` | 与 `bi.report_subscriptions` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.report_templates` | 与 `bi.report_templates` 同名重复，需先定权威表；确认后删冗余副本 |
| `analytics.reports` | 与 `bi.reports` 同名重复，需先定权威表；确认后删冗余副本 |
| `bi.analytics_sync_records` | 与 `analytics.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `bi.report_execution_records` | 与 `analytics.report_execution_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `bi.report_subscriptions` | 与 `analytics.report_subscriptions` 同名重复，需先定权威表；确认后删冗余副本 |
| `crm.core_crm_customers` | crm 客户核心表缺 tenant_id，补列需先定与 customers 的关系 |
| `doc.document_versions` | 随 doc.documents 的归属口径 |
| `doc.documents` | 文档归属按租户还是按用户未定；确认后补列 |
| `doc.folders` | 同 doc.documents，文档域租户归属未定 |
| `doc.templates` | 模板是否全局共享未定 |
| `doc_service.archives` | 同 doc_service.files |
| `doc_service.core_doc_documents` | 与 `flow.core_doc_documents`、`public.core_doc_documents` 同名重复，需先定权威表；确认后删冗余副本 |
| `doc_service.core_doc_folders` | 与 `flow.core_doc_folders`、`public.core_doc_folders` 同名重复，需先定权威表；确认后删冗余副本 |
| `doc_service.core_doc_templates` | 与 `flow.core_doc_templates`、`public.core_doc_templates` 同名重复，需先定权威表；确认后删冗余副本 |
| `doc_service.files` | 文档服务租户归属未定，且策略为 true/true |
| `doc_service.folders` | 同 doc_service.files |
| `doc_service.templates` | 同 doc_service.files |
| `erp.company_relations` | 合并域 tenant_id 应为集团租户还是成员公司租户、跨公司授权模型未定；现 USING(true) 全开 |
| `erp.consolidation_report_lines` | 报表行随报表主体的可见范围未定；现 USING(true) 全开 |
| `erp.consolidation_reports` | 合并报表的租户/公司可见范围未定；现 USING(true) 全开 |
| `erp.consolidation_scope_companies` | 范围内法人主体的租户归属未定；现 USING(true) 全开 |
| `erp.consolidation_scopes` | 合并范围的租户归属与跨公司可见性未定；现 USING(true) 全开 |
| `erp.core_erp_materials` | 物料核心表缺 tenant_id，补列需先定与 materials 的关系 |
| `erp.core_erp_suppliers` | 供应商核心表缺 tenant_id，补列需先定与 suppliers 的关系 |
| `erp.elimination_candidates` | 抵消候选的租户归属未定；现策略含 nil 哨兵 + tenant_id IS NULL |
| `erp.elimination_rules` | 抵消规则的租户归属未定；现 USING(true) 全开 |
| `erp.erp_master_data_conflicts` | 主数据冲突是否跨租户共享；现 0 行 |
| `erp.erp_master_data_quality_reports` | 主数据质量报告是否跨租户共享 |
| `erp.erp_master_data_quality_rules` | 质量规则是否全局共享 |
| `erp.erp_master_data_versions` | 主数据版本随主数据归属，补列口径未定 |
| `erp.holidays` | 节假日是全局还是按租户/地区；现 true/true，先登记 |
| `erp.internal_transactions` | 内部交易台账的 tenant_id 归属（集团/成员公司）未定；现 USING(true) 全开 |
| `finance.core_finance_report_line_map` | 48 行全为 NULL，需确认是全局映射模板还是漏回填；全局则登记字典，否则回填并去掉 NULL 读分支 |
| `flow.core_doc_document_versions` | 与 `public.core_doc_document_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_file_folders` | 与 `iam.core_file_folders`、`public.core_file_folders` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_file_permissions` | 与 `public.core_file_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_files` | 与 `iam.core_files`、`public.core_files` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_flow_delegates` | 与 `public.core_flow_delegates` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_flow_rules` | 与 `public.core_flow_rules` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_flow_variable_history` | 与 `public.core_flow_variable_history` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_flow_variables` | 与 `public.core_flow_variables` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_migration_history` | 与 `iam.core_migration_history`、`public.core_migration_history` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_tenants` | 与 `iam.core_tenants`、`public.core_tenants` 同名重复，需先定权威表；确认后删冗余副本 |
| `flow.core_workflow_tasks` | 与 `iam.core_workflow_tasks`、`public.core_workflow_tasks` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.core_master_data_change_log` | 与 `flow.core_master_data_change_log`、`public.core_master_data_change_log` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.core_master_data_event_outbox` | 与 `public.core_master_data_event_outbox` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.core_master_data_refs` | 与 `flow.core_master_data_refs`、`public.core_master_data_refs` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.core_mdm_approvals` | 与 `flow.core_mdm_approvals`、`public.core_mdm_approvals` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.core_mdm_reconciliation_log` | 与 `flow.core_mdm_reconciliation_log`、`public.core_mdm_reconciliation_log` 同名重复，需先定权威表；确认后删冗余副本 |
| `master_data.mdm_collections` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_lifecycle_history` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_lifecycle_policies` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_lifecycle_stages` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_metadata_attributes` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_metadata_tags` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_quality_rules` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_rate_cards` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_sla_configs` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_v60_lineage_edges` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_v60_lineage_graphs` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `master_data.mdm_v60_lineage_nodes` | 主数据是否跨租户全局共享未定；暂登记白名单 |
| `portal.core_faqs` | 与 `iam.core_faqs`、`public.core_faqs` 同名重复，需先定权威表；确认后删冗余副本 |
| `portal.core_guide_lessons` | 与 `iam.core_guide_lessons`、`public.core_guide_lessons` 同名重复，需先定权威表；确认后删冗余副本 |
| `portal.core_guide_progress` | 与 `iam.core_guide_progress`、`public.core_guide_progress` 同名重复，需先定权威表；确认后删冗余副本 |
| `portal.core_guides` | 与 `iam.core_guides`、`public.core_guides` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.analytics_sync_records` | 与 `analytics.analytics_sync_records`、`bi.analytics_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.announcements` | 与 `erp.announcements` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_doc_document_versions` | 与 `flow.core_doc_document_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_file_permissions` | 与 `flow.core_file_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_approval_workflows` | 与 `finance.core_finance_approval_workflows` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_aux_accounts` | 与 `finance.core_finance_aux_accounts` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_aux_balances` | 与 `finance.core_finance_aux_balances` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_ledger` | 与 `finance.core_finance_ledger` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_periods` | 与 `finance.core_finance_periods` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_reconciliation_items` | 与 `finance.core_finance_reconciliation_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_reconciliation_sessions` | 与 `finance.core_finance_reconciliation_sessions` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_finance_voucher_lines` | 与 `finance.core_finance_voucher_lines` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_master_data_event_outbox` | 与 `master_data.core_master_data_event_outbox` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_categories` | 与 `core.core_plugin_categories`、`iam.core_plugin_categories` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_instances` | 与 `core.core_plugin_instances`、`iam.core_plugin_instances` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_navigation` | 与 `core.core_plugin_navigation` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_permissions` | 与 `core.core_plugin_permissions`、`iam.core_plugin_permissions` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_reviews` | 与 `core.core_plugin_reviews`、`iam.core_plugin_reviews` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugin_versions` | 与 `core.core_plugin_versions`、`iam.core_plugin_versions` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_plugins` | 与 `core.core_plugins`、`iam.core_plugins` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.core_tenant_plugins` | 与 `core.core_tenant_plugins`、`iam.core_tenant_plugins` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.equipment` | 与 `mes.equipment`、`rs.equipment` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.equipment_inspections` | 与 `mes.equipment_inspections`、`rs.equipment_inspections` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.equipment_maintenance_records` | 与 `mes.equipment_maintenance_records`、`rs.equipment_maintenance_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_boms` | 与 `mes.material_boms` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_categories` | 与 `mes.material_categories` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_issue_items` | 与 `mes.material_issue_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_issues` | 与 `mes.material_issues` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_requirement_items` | 与 `mes.material_requirement_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_requirements` | 与 `mes.material_requirements` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_return_items` | 与 `mes.material_return_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.material_returns` | 与 `mes.material_returns` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.meeting_bookings` | 与 `erp.meeting_bookings` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.meeting_rooms` | 与 `erp.meeting_rooms` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.process_flow_steps` | 与 `mes.process_flow_steps` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.process_flows` | 与 `mes.process_flows` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_accident_investigations` | 与 `ehs.qa_ehs_accident_investigations` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_accident_reviews` | 与 `ehs.qa_ehs_accident_reviews` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_accident_treatments` | 与 `ehs.qa_ehs_accident_treatments` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_accidents` | 与 `ehs.qa_ehs_accidents` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_compliance_items` | 与 `ehs.qa_ehs_compliance_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_contraindications` | 与 `ehs.qa_ehs_contraindications` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_detection_records` | 与 `ehs.qa_ehs_detection_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_emergency_plans` | 与 `ehs.qa_ehs_emergency_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_environment` | 与 `ehs.qa_ehs_environment` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_hazard_rectifications` | 与 `ehs.qa_ehs_hazard_rectifications` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_hazard_verifications` | 与 `ehs.qa_ehs_hazard_verifications` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_hazardous_materials` | 与 `ehs.qa_ehs_hazardous_materials` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_hazards` | 与 `ehs.qa_ehs_hazards`、`qms.qa_ehs_hazards` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_health_abnormalities` | 与 `ehs.qa_ehs_health_abnormalities` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_health_exam_plans` | 与 `ehs.qa_ehs_health_exam_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_health_exam_records` | 与 `ehs.qa_ehs_health_exam_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_health_trainings` | 与 `ehs.qa_ehs_health_trainings` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_inspection_items` | 与 `ehs.qa_ehs_inspection_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_inspection_plans` | 与 `ehs.qa_ehs_inspection_plans` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_material_stocks` | 与 `ehs.qa_ehs_material_stocks` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_protection_measures` | 与 `ehs.qa_ehs_protection_measures` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_risks` | 与 `ehs.qa_ehs_risks` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_stock_records` | 与 `ehs.qa_ehs_stock_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_sync_records` | 与 `ehs.qa_ehs_sync_records` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.qa_ehs_trainings` | 与 `ehs.qa_ehs_trainings` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.quality_inspections` | 与 `mes.quality_inspections`、`qms.quality_inspections` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.quality_patrol_items` | 与 `mes.quality_patrol_items` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.quality_patrols` | 与 `mes.quality_patrols` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.quality_standard_values` | 与 `mes.quality_standard_values` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.quality_standards` | 与 `mes.quality_standards`、`qms.quality_standards` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.refresh_tokens` | 与 `iam.refresh_tokens` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.ticket_automation_rules` | 与 `ticket.ticket_automation_rules` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.ticket_knowledge_articles` | 与 `ticket.ticket_knowledge_articles` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.vehicle_requests` | 与 `erp.vehicle_requests` 同名重复，需先定权威表；确认后删冗余副本 |
| `public.vehicles` | 与 `erp.vehicles` 同名重复，需先定权威表；确认后删冗余副本 |
| `rd.bugs` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rd.builds` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rd.deploys` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rd.test_cases` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.ai_analyses` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.document_relations` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.equipment` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.equipment_inspections` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.equipment_maintenance_records` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.experiment_records` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.patents` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `rs.research_costs` | rd/rs 两套研发域并存（均 0 行），先定保留哪套；确认后补列或删副本 |
| `storage.files` | 文件归属按租户还是按业务对象未定；暂登记 |

### ③ 只做了登记、不建议动 — 334 条

**C1 登记白名单（85 张，系统表/字典表/用户主体）**

`_sqlx_test.databases`、`ai.schema_defense_ledger`、`bi.schema_defense_ledger`、`communication.schema_defense_ledger`、`core.core_plugin_categories`、`core.core_plugin_instances`、`core.core_plugin_navigation`、`core.core_plugin_permissions`、`core.core_plugin_reviews`、`core.core_plugin_versions`、`core.core_tenant_plugins`、`crm.schema_defense_ledger`、`ehs.schema_defense_ledger`、`erp.erp_master_data_audit_trail`、`erp.schema_defense_ledger`、`finance.cqrs_events`、`finance.cqrs_snapshots`、`finance.schema_defense_ledger`、`flow.audit_logs`、`flow.schema_defense_ledger`、`gis.audit_log`、`gis.audit_logs`、`gis.schema_defense_ledger`、`hrm.schema_defense_ledger`、`iam._sqlx_migrations`、`iam.audit_logs`、`iam.auth_sessions`、`iam.core_permissions`、`iam.core_plugin_versions`、`iam.core_role_permissions`、`iam.core_tenants`、`iam.core_user_roles`、`iam.dynamic_data`、`iam.password_reset_tokens`、`iam.permissions`、`iam.refresh_tokens`、`iam.roles`、`iam.schema_registry`、`iam.sessions`、`iam.tool_permissions`、`iam.user_access_logs`、`iam.user_roles`、`iam.users`、`integration.schema_defense_ledger`、`master_data.dynamic_data`、`master_data.schema_defense_ledger`、`master_data.schema_registry`、`mes.audit_logs`、`mes.schema_defense_ledger`、`mes.tenant_backfill_quarantine`、`mobile.schema_defense_ledger`、`notification.notifications`、`pdm.schema_defense_ledger`、`plugin_finance.source_amount_snapshots`、`plugin_wms.purchase_order_snapshots`、`pm.schema_defense_ledger`、`portal.user_preferences`、`public._sqlx_migrations`、`public.alert_rules`、`public.alerts`、`public.core_api_version_configs`、`public.core_permissions`、`public.core_role_permissions`、`public.core_user_roles`、`public.dynamic_data`、`public.navigation_menu`、`public.pinned_apps`、`public.schema_defense_ledger`、`public.schema_registry`、`public.search_logs`、`public.search_recent`、`public.sys_db_changes`、`public.tenants`、`public.todos`、`public.user_settings`、`qms.audit_logs`、`qms.schema_defense_ledger`、`rs.schema_defense_ledger`、`shared.audit_logs`、`srm.schema_defense_ledger`、`ticket.schema_defense_ledger`、`tms.schema_defense_ledger`、`unified_core.documents`、`unified_core.password_resets`、`wms.schema_defense_ledger`

**C2 保持不动（249 张，已 fail-closed 或 guarded）**

`finance.accounting_subjects`、`finance.budgets`、`finance.core_finance_accounts`、`finance.core_finance_approval_nodes`、`finance.core_finance_approval_workflows`、`finance.core_finance_aux_accounts`、`finance.core_finance_aux_balances`、`finance.core_finance_currencies`、`finance.core_finance_ledger`、`finance.core_finance_payment_approval_config`、`finance.core_finance_payment_items`、`finance.core_finance_payment_workflow`、`finance.core_finance_payments`、`finance.core_finance_periods`、`finance.core_finance_reconciliation_items`、`finance.core_finance_reconciliation_sessions`、`finance.core_finance_voucher_lines`、`finance.core_finance_vouchers`、`finance.cqrs_projection_progress`、`finance.difference_adjustments`、`finance.erp_collection_records`、`finance.erp_payables`、`finance.erp_payment_records`、`finance.erp_receivables`、`finance.expense_approvals`、`finance.expenses`、`finance.finance_alert_configs_v52`、`finance.finance_alert_history_v52`、`finance.finance_anomaly_alerts_v52`、`finance.finance_audit_findings_v52`、`finance.finance_audit_log`、`finance.finance_audit_rules_v52`、`finance.finance_budget_variances_v53`、`finance.finance_cash_flow_predictions_v53`、`finance.finance_compliance_issues`、`finance.finance_compliance_reports`、`finance.finance_control_matrices`、`finance.finance_control_points`、`finance.finance_detection_configs_v52`、`finance.finance_prediction_models_v53`、`finance.finance_risk_assessments`、`finance.finance_v54_fraud_rules`、`finance.finance_v54_fraud_scores`、`finance.finance_v54_review_results`、`finance.finance_v54_review_rules`、`finance.finance_v54_review_workflows`、`finance.finance_v54_risk_alerts`、`finance.finance_v54_risk_indicators`、`finance.finance_v55_invoice_items`、`finance.finance_v55_invoices`、`finance.finance_v55_payment_requests`、`finance.finance_v55_payment_results`、`finance.finance_v55_reconciliation_results`、`finance.finance_v55_reconciliation_rules`、`finance.finance_v56_tax_brackets`、`finance.finance_v56_tax_forms`、`finance.finance_v56_tax_lines`、`finance.finance_v56_tax_plans`、`finance.finance_v56_tax_rates`、`finance.finance_v56_tax_suggestions`、`finance.finance_v57_analysis_dimensions`、`finance.finance_v57_analysis_results`、`finance.finance_v57_forecast_models`、`finance.finance_v57_generated_reports`、`finance.finance_v57_insights`、`finance.finance_v57_report_templates`、`finance.finance_v58_cash_pools`、`finance.finance_v58_forecast_results`、`finance.finance_v58_forecast_scenarios`、`finance.finance_v58_liquidity_targets`、`finance.finance_v58_optimization_results`、`finance.finance_v58_pool_allocations`、`finance.finance_v58_pool_transfers`、`finance.finance_v59_credit_profiles`、`finance.finance_v59_device_profiles`、`finance.finance_v59_fraud_decisions`、`finance.finance_v59_fraud_rules`、`finance.finance_v59_fraud_signals`、`finance.finance_v59_scoring_models`、`finance.finance_v59_stress_results`、`finance.finance_v59_stress_scenarios`、`finance.finance_v60_alert_channels`、`finance.finance_v60_alert_rules`、`finance.finance_v60_alerts`、`finance.finance_v60_decision_results`、`finance.finance_v60_decision_scenarios`、`finance.finance_v60_schedule_dependencies`、`finance.finance_v60_schedule_executions`、`finance.finance_v60_schedule_tasks`、`finance.finance_voucher_generation_rules`、`finance.finance_voucher_template_lines`、`finance.finance_voucher_templates`、`finance.financial_reports`、`finance.mv_receivable_aging`、`finance.mv_voucher_summary`、`finance.payables`、`finance.receivables`、`finance.reconcile_items`、`finance.reconcile_orders`、`finance.reconciliation_item_snapshots`、`finance.reconciliation_orders`、`finance.reconciliation_settlement_links`、`finance.reconciliation_snapshots`、`finance.sales_invoices`、`finance.settlement_center_dashboards`、`finance.settlement_snapshots`、`finance.source_amount_snapshots`、`finance.vouchers`、`mes.batch_records`、`mes.bom_items`、`mes.capacities`、`mes.demand_forecasts`、`mes.equipment_inspections`、`mes.material_boms`、`mes.material_categories`、`mes.material_issue_items`、`mes.material_issues`、`mes.material_requirement_items`、`mes.material_requirements`、`mes.material_return_items`、`mes.material_returns`、`mes.module_settings`、`mes.process_flow_steps`、`mes.process_flows`、`mes.production_lines`、`mes.production_plans`、`mes.quality_inspections`、`mes.quality_patrol_items`、`mes.quality_patrols`、`mes.quality_records`、`mes.shifts`、`mes.team_members`、`mes.wip_transfers`、`mes.wips`、`mes.work_calendars`、`mes.work_orders`、`mes.workshops`、`mobile.mobile_leave_applications`、`portal.federation_compensation_logs`、`portal.federation_execution_logs`、`portal.federation_query_plans`、`portal.federation_subgraphs`、`portal.federation_transaction_steps`、`portal.federation_transactions`、`portal.gateway_degradation_policies`、`portal.gateway_health_metrics`、`portal.gateway_protocols`、`portal.gateway_routes`、`portal.graphql_breaking_changes`、`portal.graphql_execution_metrics`、`portal.graphql_execution_profiles`、`portal.graphql_optimization_history`、`portal.graphql_schema_versions`、`portal.graphql_stream_events`、`portal.graphql_stream_subscribers`、`portal.graphql_streams`、`portal.graphql_suggestions`、`portal.graphql_version_negotiations`、`portal.intelligent_gw_affinities`、`portal.intelligent_gw_conflicts`、`portal.intelligent_gw_routing_table`、`portal.intelligent_gw_stitch_logs`、`portal.intelligent_gw_stitch_plans`、`portal.portal_accel_configs`、`portal.portal_acceleration_configs`、`portal.portal_acceleration_results`、`portal.portal_access_decisions`、`portal.portal_access_policies`、`portal.portal_aggregation_configs`、`portal.portal_aggregation_results`、`portal.portal_alert_thresholds`、`portal.portal_anomalies`、`portal.portal_api_versions`、`portal.portal_audit_entries`、`portal.portal_audit_exports`、`portal.portal_auth_policies`、`portal.portal_backpressure_configs`、`portal.portal_backpressure_states`、`portal.portal_cache_entries`、`portal.portal_cache_policies`、`portal.portal_cache_versions`、`portal.portal_canary_configs`、`portal.portal_canary_results`、`portal.portal_compatibility_policies`、`portal.portal_compatibility_reports`、`portal.portal_compilation_rules`、`portal.portal_compiled_queries`、`portal.portal_config_diffs`、`portal.portal_config_environments`、`portal.portal_consistency_checks`、`portal.portal_dead_letter_queue`、`portal.portal_dedup_results`、`portal.portal_dedup_rules`、`portal.portal_deployment_steps`、`portal.portal_deployments`、`portal.portal_detection_models`、`portal.portal_distributed_queries`、`portal.portal_edge_cache`、`portal.portal_edge_deployments`、`portal.portal_edge_entries`、`portal.portal_edge_functions`、`portal.portal_edge_replication`、`portal.portal_execution_plans`、`portal.portal_execution_steps`、`portal.portal_federated_identities`、`portal.portal_gateway_configs`、`portal.portal_healing_actions`、`portal.portal_health_checks`、`portal.portal_identity_policies`、`portal.portal_invalidation_events`、`portal.portal_latency_stats`、`portal.portal_masking_rules`、`portal.portal_metrics`、`portal.portal_orchestration_plans`、`portal.portal_persisted_queries`、`portal.portal_persisted_query_versions`、`portal.portal_plan_steps`、`portal.portal_push_stats`、`portal.portal_queue_configs`、`portal.portal_queue_messages`、`portal.portal_recovery_plans`、`portal.portal_replay_requests`、`portal.portal_replay_results`、`portal.portal_resolver_timings`、`portal.portal_rollback_actions`、`portal.portal_rollback_policies`、`portal.portal_route_rules`、`portal.portal_routing_decisions`、`portal.portal_routing_rules`、`portal.portal_security_events`、`portal.portal_security_incidents`、`portal.portal_security_policies`、`portal.portal_service_descriptors`、`portal.portal_service_heartbeats`、`portal.portal_service_loads`、`portal.portal_stream_events`、`portal.portal_streams`、`portal.portal_sub_queries`、`portal.portal_subscribers`、`portal.portal_subscription_channels`、`portal.portal_subscription_events`、`portal.portal_subscription_records`、`portal.portal_traces`、`portal.portal_trust_decisions`、`portal.portal_version_mappings`、`portal.portal_version_vectors`、`qms.dashboard_metrics`、`qms.inspection_items`、`qms.quality_issues`

## 4. nil 租户存量（prod，`tenant_id IS NULL`，按行数降序）

| schema.table | NULL 行 | 总行 | 说明 |
|---|---:|---:|---|
| `public.core_menus` | 452 | 452 | 全局菜单，NULL 为设计语义 |
| `public.core_dict_items` | 397 | 397 | 全局字典项 |
| `public.core_menu_groups` | 130 | 130 | 全局菜单组 |
| `public.core_dict_types` | 77 | 77 | 全局字典类型 |
| `finance.core_finance_report_line_map` | 48 | 48 | 全表 48 行均为 NULL，待定 |
| `public.core_roles` | 16 | 17 | 内置角色 |
| `finance.core_finance_currencies` | 8 | 16 | 全局默认币种 |
| `ai.ai_models` | 4 | 4 | 4 行全局默认模型 |
| `ai.ai_prompt_templates` | 3 | 3 | 3 行全局模板 |
| `mobile.sync_policies` | 1 | 1 | 1 行全局策略 |
| `pm.project_type_configs` | 1 | 1 | 1 行全局配置 |
| `public.core_tenants` | 1 | 1 | 租户主表自身 |
| `scm.schema_defense_ledger` | 1 | 1 | 系统账本 |

合计 **1139 行**。

> **与已知数字的核对**：`environment 416 / occupational_health 76 / training 数百` 在 `topems_prod` 与 `topems` 均**不存在同名表**（已全 schema 搜 `%environment%`/`%occupational%`/`%training%`）；dev 中 `ehs.qa_ehs_environment_monitors` 恰为 416 行、`ehs.qa_ehs_employees` 76 行、`ehs.qa_ehs_trainings` 235 行，但它们的 `tenant_id` **非 NULL（null=0）**，所以那组数字是**行数**而非 NULL 数。prod 侧这些表全部 0 行。

## 4.1 8 张合并域表现状（`erp`）

| schema.table | prod 行 | RLS on/force/策略 | fail-open | 现状 |
|---|---:|:---:|:---:|---|
| `erp.company_relations` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.internal_transactions` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.consolidation_scopes` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.consolidation_scope_companies` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.consolidation_reports` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.consolidation_report_lines` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.elimination_rules` | 0 | t/t/1 | true/true | USING(true) 全开 |
| `erp.elimination_candidates` | 0 | t/t/1 | NULL 分支 | nil 哨兵 + tenant_id IS NULL |

结论：8 张全部 0 行，但代码侧已有 19 处文件命中（含跨表重复文件），属于「结构已建、语义未定」。**在合并口径确定前不要照搬普通表的 `tenant_id = 当前租户` 写法**，否则会把集团合并视图锁死为单公司可见。

> **2026-11-15 实测更新**：上表 `fail-open` 列是 2026-11-14 采集时点。`20261114180000` 投递后，8 张策略已统一为 `tenant_id = erp.group_tenant_of((NULLIF(current_setting('app.tenant_id', true), ''))::uuid)`，**无 `true/true`、无 NULL 分支**；行数仍全部 0。合并域语义由 `group_tenant_of()` 承载，不再是全开。

## 4.2 六 schema 的 12 张「无 tenant_id 但 RLS=on」

| schema.table | prod 行 | 策略 | 处理 |
|---|---:|:---:|---|
| `crm.core_crm_customers` | 0 | true/true | 需业务口径 |
| `erp.core_erp_materials` | 0 | true/true | 需业务口径 |
| `erp.core_erp_suppliers` | 0 | true/true | 需业务口径 |
| `erp.expenses` | 0 | true/true | 可直接执行 |
| `erp.holidays` | 0 | true/true | 需业务口径 |
| `erp.meeting_bookings` | 0 | true/true | 可直接执行 |
| `erp.meeting_rooms` | 0 | true/true | 可直接执行 |
| `erp.vehicle_requests` | 0 | true/true | 可直接执行 |
| `erp.vehicles` | 0 | true/true | 可直接执行 |
| `portal.portal_announcements` | 0 | true/true | 可直接执行 |
| `portal.portal_quick_actions` | 0 | true/true | 可直接执行 |
| `portal.user_preferences` | 0 | true/true | 登记 |

这 12 张是「RLS 已开、策略实为 `true/true`、但没有租户列」的组合，隔离效果为 0。除 `portal.user_preferences` 属用户主体外，其余均可在 0 行状态下补列并改为 fail-closed。

> **2026-11-15 实测更新**：`20261114201000` / `20261114202000` 补列并重写策略后，六 schema 内「无 tenant_id 且 RLS=on」**仅剩 4 张**：`erp.core_erp_materials`、`erp.holidays`、`portal.portal_quick_actions`、`portal.user_preferences`，四张均为 `USING(true)`（其中前三张已定为全局语义表，`portal.user_preferences` 按用户主体登记、不补列）。其余 8 张（`crm.core_crm_customers`、`erp.core_erp_suppliers`、`erp.expenses`、`erp.meeting_bookings`、`erp.meeting_rooms`、`erp.vehicle_requests`、`erp.vehicles`、`portal.portal_announcements`）已具备 `tenant_id` 与 fail-closed 策略。

## 4.3 `mes.teams` 现状

- 形状：prod/dev 列集合一致，`team_code varchar(100)`、`team_name varchar(200)`、`leader_id uuid`、`tenant_id uuid`（可空）、`status varchar(32) default active`；prod 的 `tenant_id` 排在 `updated_at` 之后，dev 排在 `deleted_at` 之后（列序差异，不影响类型）。
- 唯一键：`teams_tenant_id_team_code_key UNIQUE NULLS NOT DISTINCT (tenant_id, team_code)`；另有 `teams_pkey(id)`、`idx_teams_status`、`idx_teams_team_code`、`idx_teams_work_station_id`，外键 `work_station_id → mes.work_stations(id) ON DELETE SET NULL`。
- 约束差异：**prod 缺 `ck_teams_status_standard`**（dev 有 `status IN (active,inactive,archived)`）。
- RLS：两边都 `ENABLE + FORCE`，但都只有一条 `tenant_isolation_teams`（`polcmd=ALL`、`polroles=PUBLIC`），表达式为旧式 nil 哨兵：
  - prod：`GUC IS NULL OR GUC = '' OR tenant_id IS NULL OR tenant_id = GUC OR GUC = '00000000-...-000000000000'`
  - dev：`tenant_id = GUC OR tenant_id IS NULL OR GUC = '00000000-...-000000000000'`
- 判定：**fail-open**（含 `tenant_id IS NULL`，且把 nil UUID 当系统通道暗号）。prod 已装 20261114140000–160000 仍未替换该策略，说明这三笔迁移没有覆盖 `mes.teams`。
- **2026-11-15 实测更新**：`20261114200000` 投递后，`mes.teams` 与其他 49 条 mes 策略已统一为 `(COALESCE(current_setting('app.rls_system', true), 'off') = 'on') OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid`，**fail-closed**；`ck_teams_status_standard` 仍缺（prod 只有 `teams_*_not_null` 与 pkey）。

## 5. prod 与 dev 差异摘要

- 账本：prod **680 / max 20261115000000**（2026-11-15 实测；采集时 673 / max 20261114160000）；dev 572 / max 20261109101400（dev 落后，不能作为 prod 的权威结构基线）。
- 表集合：prod 独有 **23 张**；dev 独有 **195 张**（多为 dev 的 public 遮蔽副本与旧 mes 表）。

**只在 prod 存在（23 张）**

```text
communication.core_email_templates
crm.core_crm_customers
erp.core_erp_suppliers
finance.cqrs_snapshots
finance.reconciliation_orders
flow.core_tenant_modules
iam._sqlx_migrations
iam.auth_sessions
iam.core_billing_invoices
iam.core_billing_plans
iam.core_subscriptions
iam.core_tenant_usage
iam.refresh_tokens
iam.sessions
iam.tenant_permissions
iam.tool_permissions
mes.tenant_backfill_quarantine
plugin_erp.accounting_subjects
plugin_finance.accounting_subjects
public.equipment
public.refresh_tokens
public.search_recent
rs.equipment
```

**只在 dev 存在（195 张）**

```text
finance.core_finance_account_opening_balances
finance.finance_alert_configs_v
finance.finance_alert_history_v
finance.finance_anomaly_alerts_v
finance.finance_audit_findings_v
finance.finance_detection_configs_v
finance.finance_u8_import_records
flow.core_login_logs
hrm.vectors
lims.samples_tenant_null_backup_20260919
mes.core_billing_invoices
mes.core_billing_plans
mes.core_chat_members
mes.core_chat_messages
mes.core_chat_rooms
mes.core_dashboard_refresh_log
mes.core_dict_items
mes.core_dict_types
mes.core_email_queue
mes.core_email_templates
mes.core_emails
mes.core_faqs
mes.core_file_folders
mes.core_files
mes.core_guide_lessons
mes.core_guide_progress
mes.core_guides
mes.core_inter_module_sync
mes.core_login_logs
mes.core_menu_groups
mes.core_menus
mes.core_migration_history
mes.core_mobile_offline_records
mes.core_notification_templates
mes.core_notifications
mes.core_plugin_categories
mes.core_plugin_instances
mes.core_plugin_permissions
mes.core_plugin_pricing
mes.core_plugin_reviews
mes.core_plugin_versions
mes.core_plugins
mes.core_subscriptions
mes.core_tenant_plugins
mes.core_tenant_settings
mes.core_tenant_usage
mes.core_tenant_users
mes.core_tenants
mes.core_usage_records
mes.core_workflow_instances
mes.core_workflow_tasks
mes.core_workflows
mes.crm_dashboard_snapshots
mes.dynamic_data
mes.ehs_dashboard_snapshots
mes.hrm_dashboard_snapshots
mes.inspection_records
mes.lims_dashboard_snapshots
mes.pdm_dashboard_snapshots
mes.permission_audit_logs
mes.schema_registry
mes.tenant_permissions
mes.tool_permissions
mes.wms_dashboard_snapshots
public.analytics_comparison_analyses
public.analytics_comparison_results
public.analytics_dashboard_shares
public.analytics_dashboard_templates
public.analytics_dashboards
public.analytics_datasets
public.analytics_datasources
public.analytics_drilldown_history
public.analytics_drilldown_paths
public.analytics_row_level_permissions
public.analytics_self_service_reports
public.analytics_widgets
public.archived_notifications
public.barcode_scans
public.business_locations
public.configurations
public.core_chat_members
public.core_chat_messages
public.core_chat_rooms
public.core_coding_rules
public.core_comments
public.core_email_templates
public.core_favorites
public.core_feedbacks
public.core_mobile_offline_records
public.core_plugin_pricing
public.cqrs_projection_progress
public.cqrs_snapshots
public.crm_master_data_refs
public.device_locations
public.devices
public.erp_connections
public.erp_dictionaries
public.erp_mappings
public.erp_master_data_refs
public.external_erp_sync_logs
public.factory_maps
public.hrm_master_data_refs
public.location_photos
public.map_markers
public.media_files
public.mes_qms_sync
public.mobile_scan_records
public.mobile_users
public.notification_channels
public.notification_templates
public.offline_operations
public.offline_sync_records
public.pdm_bom_items
public.pdm_boms
public.pdm_configurations
public.pdm_document_versions
public.pdm_documents
public.pdm_master_data_refs
public.pdm_production_batches
public.pdm_production_formulas
public.pdm_production_processes
public.pdm_production_steps
public.pdm_project_members
public.pdm_project_phases
public.pdm_projects
public.pdm_versions
public.pdm_workflow_instances
public.pdm_workflows
public.photo_uploads
public.pipelines
public.production_lines
public.push_devices
public.push_notifications
public.push_templates
public.qa_alert_messages
public.qa_alert_rules
public.qa_apqp_approvals
public.qa_apqp_phases
public.qa_apqp_projects
public.qa_apqp_risks
public.qa_apqp_tasks
public.qa_audit_findings
public.qa_audit_plans
public.qa_audit_tasks
public.qa_corrective_action_items
public.qa_corrective_actions
public.qa_ehs_compliance_evaluations
public.qa_ehs_discharge_permits
public.qa_ehs_disease_cases
public.qa_ehs_drill_evaluations
public.qa_ehs_drill_plans
public.qa_ehs_drill_problems
public.qa_ehs_drill_records
public.qa_ehs_emergency_plan_approvals
public.qa_ehs_emergency_plan_supplies
public.qa_ehs_emergency_plan_versions
public.qa_ehs_employees
public.qa_ehs_env_monitor_records
public.qa_ehs_environment_incidents
public.qa_ehs_environmental_regulations
public.qa_ehs_hazard_factors
public.qa_ehs_inspection_record_items
public.qa_ehs_inspection_records
public.qa_ehs_msds
public.qa_eightd_audit_logs
public.qa_eightd_reports
public.qa_fmea_analyses
public.qa_fmea_items
public.qa_inspection_audits
public.qa_inspection_results
public.qa_lab_samples_merge_backup_20260919
public.qa_quality_costs
public.qa_quality_inspections
public.qa_quality_issues
public.qa_spc_charts
public.qa_spc_data_points
public.qa_standard_revisions
public.qa_standards
public.report_execution_records
public.report_schedules
public.report_subscriptions
public.report_templates
public.reports
public.scm_master_data_refs
public.shifts
public.shortcuts
public.spatial_ref_sys
public.sync_policies
public.versions
public.warehouse_locations
public.wms_master_data_refs
public.work_calendars
public.workshops
report.report_templates
srm.supplier_users
```

## 6. 范围外但值得记录

- `flow`：20 张有 `tenant_id` 但 `relrowsecurity=false`（37 张里只有 3 张开 RLS）。这是本批之外最大的 RLS 空洞。
- `iam` 78 张仅 18 张开 RLS；`core` 15 张 9 张；`portal` 118 张仅 6 张；`rd` 4/4 与 `shared`/`plugin_wms` 未开 RLS。
- `prod` 有 `_sqlx_test` schema 1 张表（非业务）。
- `finance.core_finance_currencies` 与 `public.core_*` 的 `rls_global_read` 含 `tenant_id IS NULL`：这是「全局默认行」设计，不应按 fail-open 缺陷处理，应登记为字典语义。
- `finance.voucher_lines` 仍有 1 处 SQL 残留：`svc/finance/src/modules/forecast_v53.rs:344`（`JOIN voucher_lines vl`），删表前需清理该旧模块。

## 附录 A 命令原文（未截断）

> 2026-11-14 更正：prod 已迁至 `192.168.3.129`。以下命令已按新地址改写（须实名登录用户 `xingzhai`；psql 路径与只读参数不变）；原执行原文中的旧地址 `192.168.110.115` 已停用。

```bash
# 00_identity.sql：库身份 + 账本 + 各 schema 表数（prod / dev 各执行一次）
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -P pager=off -P border=0 -A -F "|" -f -' < 00_identity.sql
PGOPTIONS="-c default_transaction_read_only=on" psql -d topems -P pager=off -P border=0 -A -F "|" -f 00_identity.sql

# 01_meta.sql：pg_class/pg_policy 元数据 + 每表 count(*)/NULL 租户数（prod / dev 各执行一次）
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=600000" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -v ON_ERROR_STOP=1 -P pager=off -P border=0 -F "|" -A -f -' < 01_meta.sql
PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=600000" psql -d topems -v ON_ERROR_STOP=1 -P pager=off -P border=0 -F "|" -A -f 01_meta.sql

# 02_special.sql：erp 表、六 schema 无 tenant_id、tenant_uid-only
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -P pager=off -P border=0 -A -F "|" -f -' < 02_special.sql

# 03_teams.sql：mes.teams 列/约束/索引/RLS/策略（prod / dev 各执行一次）
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -P pager=off -P border=0 -A -F "|" -f -' < 03_teams.sql
PGOPTIONS="-c default_transaction_read_only=on" psql -d topems -P pager=off -P border=0 -A -F "|" -f 03_teams.sql

# 04_extra.sql：finance 无 RLS、名称检索、库清单
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -P pager=off -P border=0 -A -F "|" -f -' < 04_extra.sql

# 05_policies.sql：账本尾部 + 关键表策略文本
ssh -o BatchMode=yes xingzhai@192.168.3.129 'PGOPTIONS="-c default_transaction_read_only=on" /opt/homebrew/opt/postgresql@18/bin/psql -d topems_prod -P pager=off -P border=0 -A -F "|" -f -' < 05_policies.sql
```

**00_identity.sql**

```sql
\pset footer off
select current_database() as db, current_user as usr,
       coalesce(inet_server_addr()::text,'unix-socket') as addr,
       coalesce(inet_server_port()::text,'-') as port,
       current_setting('default_transaction_read_only') as default_ro,
       pg_size_pretty(pg_database_size(current_database())) as db_size,
       version() as ver;

select count(*) as ledger_rows, min(version) as min_version, max(version) as max_version,
       max(installed_on)::text as last_installed
from _sqlx_migrations;

select n.nspname as schema, c.relkind, count(*) as tables,
       sum(case when c.relrowsecurity then 1 else 0 end) as rls_on,
       sum(case when c.relforcerowsecurity then 1 else 0 end) as rls_force,
       sum(case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped) then 1 else 0 end) as with_tenant_id,
       sum(case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_uid' and a.attnum>0 and not a.attisdropped) then 1 else 0 end) as with_tenant_uid
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p')
  and n.nspname not in ('pg_catalog','information_schema','pg_toast')
group by 1,2 order by 1,2;
```

**01_meta.sql**

```sql
\pset footer off
\pset border 0
set statement_timeout = '300000';

select 'META_BEGIN';
select n.nspname || '.' || c.relname as tbl,
       c.relkind,
       case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped) then 'Y' else 'N' end as tid,
       case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_uid' and a.attnum>0 and not a.attisdropped) then 'Y' else 'N' end as tuid,
       c.relrowsecurity::text as rls,
       c.relforcerowsecurity::text as force_rls,
       (select count(*) from pg_policy p where p.polrelid=c.oid) as pol_cnt,
       c.reltuples::bigint as est_rows,
       pg_total_relation_size(c.oid) as bytes,
       pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p')
  and n.nspname not in ('pg_catalog','information_schema','pg_toast')
order by 1;

select 'POLICY_BEGIN';
select n.nspname || '.' || c.relname as tbl,
       p.polname,
       case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' when '*' then 'ALL' else p.polcmd::text end as cmd,
       coalesce(pg_get_expr(p.polqual,p.polrelid),'') as using_expr,
       coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') as check_expr,
       array_to_string(p.polroles,',') as roles,
       case when coalesce(pg_get_expr(p.polqual,p.polrelid),'') || ' ' || coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') ilike '%tenant_id is null%' then 'FAIL_OPEN_TENANT_NULL'
            when coalesce(pg_get_expr(p.polqual,p.polrelid),'') = 'true' and coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') in ('true','') then 'ALLOW_ALL_TRUE'
            else 'scoped' end as verdict
from pg_policy p
join pg_class c on c.oid=p.polrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema','pg_toast')
order by 1,2;

select 'COUNT_BEGIN';
select format(
  'select %L as tbl, %L as has_tid, count(*) as total, %s as null_cnt from %I.%I;',
  n.nspname||'.'||c.relname,
  case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped) then 'Y' else 'N' end,
  case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped)
       then 'count(*) filter (where tenant_id is null)' else 'null::bigint' end,
  n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p')
  and n.nspname not in ('pg_catalog','information_schema','pg_toast')
order by n.nspname, c.relname
\gexec
```

**02_special.sql**

```sql
\pset footer off
set statement_timeout = '120000';

select 'ERP_TABLES';
select c.relname,
       case when exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped) then 'Y' else 'N' end as tid,
       c.relrowsecurity::text, c.relforcerowsecurity::text,
       (select count(*) from pg_policy p where p.polrelid=c.oid) as pol
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='erp' and c.relkind in ('r','p') order by 1;

select 'NO_TENANT_SIX';
select n.nspname||'.'||c.relname
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p') and n.nspname in ('erp','mes','ticket','portal','crm','hrm')
  and not exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped)
order by 1;

select 'TENANT_UID_ONLY';
select n.nspname||'.'||c.relname
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p')
  and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_uid' and a.attnum>0 and not a.attisdropped)
  and not exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='tenant_id' and a.attnum>0 and not a.attisdropped)
order by 1;
```

**03_teams.sql**

```sql
\pset footer off
set statement_timeout = '60000';
select 'TEAMS_COLUMNS';
select ordinal_position, column_name, data_type, coalesce(character_maximum_length::text,''), is_nullable, coalesce(column_default,'')
from information_schema.columns where table_schema='mes' and table_name='teams' order by ordinal_position;

select 'TEAMS_CONSTRAINTS';
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint where conrelid='mes.teams'::regclass order by conname;

select 'TEAMS_INDEXES';
select indexname, indexdef from pg_indexes where schemaname='mes' and tablename='teams' order by indexname;

select 'TEAMS_RLS';
select c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner)
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='mes' and c.relname='teams';

select 'TEAMS_POLICIES';
select p.polname, p.polcmd, pg_get_expr(p.polqual,p.polrelid), pg_get_expr(p.polwithcheck,p.polrelid), array_to_string(p.polroles,',')
from pg_policy p where p.polrelid='mes.teams'::regclass;
```

**04_extra.sql**

```sql
\pset footer off
set statement_timeout = '120000';
select 'FINANCE_NONEMPTY_OR_NORLS';
select n.nspname||'.'||c.relname as tbl,
       c.relrowsecurity::text as rls, c.relforcerowsecurity::text as frls,
       (select count(*) from pg_policy p where p.polrelid=c.oid) as pol
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='finance' and c.relkind in ('r','p')
  and (c.relrowsecurity = false)
order by 1;

select 'NAME_SEARCH';
select n.nspname||'.'||c.relname
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p')
  and (c.relname ilike '%environment%' or c.relname ilike '%occupational%' or c.relname ilike '%training%')
order by 1;

select 'DB_LIST';
select datname from pg_database order by 1;
```

**05_policies.sql**

```sql
\pset footer off
select 'LEDGER_TAIL';
select version, description, success, installed_on::text from _sqlx_migrations where version >= 20261113100000 order by version;

select 'POLICIES_KEY';
select n.nspname||'.'||c.relname||' | '||p.polname||' | '||p.polcmd||' | '||coalesce(pg_get_expr(p.polqual,p.polrelid),'')||' | '||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')
from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
where (n.nspname,c.relname) in (('erp','payables'),('erp','receivables'),('erp','dict_types'),('erp','dict_items'),
  ('finance','core_finance_currencies'),('finance','core_finance_report_line_map'),('mes','teams'),
  ('iam','users'),('public','core_menus'),('public','core_dict_items'))
order by 1;
```

## 附录 B 关键事实

- `mes.teams`：prod/dev 均为 `tenant_id uuid`、`leader_id uuid`、`team_code varchar(100)`、`team_name varchar(200)`；唯一键 `teams_tenant_id_team_code_key (tenant_id, team_code) NULLS NOT DISTINCT`；索引 `teams_pkey`、`idx_teams_tenant`、`idx_teams_leader`、唯一键索引。
- `mes.teams` RLS：两边都 `ENABLE + FORCE`，采集时策略是旧版 `tenant_id IS NULL OR tenant_id::text = current_setting(...)`（nil 哨兵），**未接 `app.rls_system` 系统通道 → fail-open**；2026-11-15 实测 prod 已由 `20261114200000` 改为 fail-closed（系统通道 + 租户谓词，详见 §4.3）。
- prod 的 `mes.teams` **缺** `ck_teams_status_standard` 约束（dev 有），两边列类型一致。
- `erp.payables` / `erp.receivables`：prod 已由 20261114120000 收口为 fail-closed，无 NULL/true 分支，现状合格。
- `erp.dict_types` / `erp.dict_items`：仍为 `USING(true) WITH CHECK(true)`，且属「全局默认 + 租户覆盖」混合语义，本批未动。

## 7. 已知缺陷登记（2026-11-14 建立，2026-11-15 校对状态）

> 编号沿用项目 K 系列。K1–K5 已在 2026-11-15 的代码批次中修复并合入 `origin/main`；K7 已于 2026-11-15 由 `20261115100000` 修复（见下）。K6（ledger-ddl-drift 门禁空账本放行）登记在 `docs/database/known-gate-defects.md`，不在本文件重复。

### K1. mes equipment 列表 e2e 绕过租户上下文（3 条用例红）

- **位置**：`svc/mes/tests/equipment_e2e.rs` 的 `list_empty_returns_zero`、`list_returns_inserted_row`、`list_filters_by_status`。
- **现象**：直接调用 `list_equipment` handler 返回 500「获取设备列表失败」。
- **根因**：测试不经中间件，缺少 task-local 租户上下文；`Db::scope_read()` → `apply_request_tenant()` 按设计返回 Err（`lib/shared-db/src/scope.rs`），不是 SQL/断言问题。
- **处置**：登记为已知缺陷，采集时点未改。正确修法是给 e2e 补「注入租户上下文」的测试夹具（在测试内设置 task-local 租户），单独列项排期，不并入阶段一。
- **影响面**：仅测试；生产请求始终经中间件写入租户上下文。
- **备注**：本批新增的 `create_equipment_without_description_returns_400` 在租户校验前即返回 400，不依赖该夹具。
- **状态（2026-11-15）**：**已修复**，提交 `68a63a084`（`test(mes): K1 equipment 列表 e2e 注入租户上下文并断言租户隔离`）——用例按中间件口径同时设置 `Claims.tenant_id` 与 `scope_request_tenant`，并插入租户 B 数据断言只返回本租户行。

### K2. `create_booking` / `create_vehicle_request` 查询列不全，两个创建接口 500

- **位置**：`svc/erp/src/modules/meeting_room.rs`（`create_booking` 原为 `SELECT id, name FROM meeting_rooms`，现第 602 行完整投影）；`svc/erp/src/modules/vehicles.rs`（`create_vehicle_request` 原为 `SELECT id, plate_number, status FROM vehicles`，现第 628 行完整投影）。
- **现象**：两个接口统一返回 500「内部服务器错误」；复现报错为 `no column found for name: capacity`、`no column found for name: brand`。
- **根因**：`MeetingRoom` 的 `FromRow` 需要 8 列、`Vehicle` 需要 12 列，原查询只取 2 / 3 列后直接 `query_as`；缺陷由 `704870c35`（2026-09-09）引入，早于 RLS 阶段一，与 `tenant_id` / 策略无关。
- **处置**：两条查询改为显式列出结构体全部字段（不建最小投影结构体、不用 `SELECT *`），并新增 `svc/erp/tests/meeting_vehicle_create_e2e.rs` 两个成功用例。
- **影响面**：修复前两个创建接口不可用；修复后窗口 C 实测 `POST /api/erp/meeting-bookings`、`POST /api/erp/vehicle-requests` 均 200。
- **状态（2026-11-15）**：**已修复**，提交 `8e6001bd9`（2026-11-14 夜间合入，`origin/main` 含该提交）。

### K3. `list_vehicle_requests` 缺 `deleted_at IS NULL`，软删后列表仍返回已删行

- **位置**：`svc/erp/src/modules/vehicles.rs` 第 538-540 行（`list_vehicle_requests` 的主查询与计数查询）。
- **现象**：走 `DELETE /api/erp/vehicle-requests/{id}` 软删一行后，`GET /api/erp/vehicle-requests` 仍返回该行（窗口 C 实测：窗口 B 验收数据软删后 `total=1`，物理行 `deleted_at` 已非空）。
- **根因**：SQL 只有 `WHERE ($1::text IS NULL OR vehicle_plate ILIKE $1 OR requester ILIKE $1)`，没有 `deleted_at IS NULL`，与同模块 `meeting-bookings` 等列表的过滤口径不一致。
- **影响面**：只在软删后可见；不影响写入与 RLS，与窗口 C 的 RLS 收紧无关（收紧前后行为一致）。
- **处置**：采集时点登记为已知缺陷、未改；修复方案为主查询与计数查询同时补 `deleted_at IS NULL`，并补「软删后列表不含已删项」的用例。
- **备注**：窗口 C 清理窗口 B 的 4 行验收数据时，因该缺陷改用超户按 4 个 id 精确硬删，物理行数已归 0。
- **状态（2026-11-15）**：**已修复**，提交 `7425ba813`（与 K4 同一提交）。

### K4. `list_vehicle_requests` 用 `String` 接可空 `purpose`，一行空值即整表 500

- **位置**：`svc/erp/src/modules/vehicles.rs` 第 536-544 行（`list_vehicle_requests` 的 `query_as::<VehicleApplication>` 与 `VehicleApplication.purpose` 字段定义）。
- **现象**：库里只要有 `erp.vehicle_requests.purpose IS NULL` 的行，`GET /api/erp/vehicle-requests` 就返回 500（窗口 D 实测：超户插入 `purpose` 为空的探针行后 500，补成非空后立即 200、`total=1`）。日志原文：`获取车辆申请列表失败: error occurred while decoding column "purpose": unexpected null; try decoding as an Option`。
- **根因**：`purpose` 列在建表里是 nullable `text`，但结果结构体 `VehicleApplication.purpose` 声明为 `String`（非 `Option<String>`），sqlx 解码空值即报错，整个列表接口跟着失败。
- **影响面**：单行空值即让列表整体不可用；不影响 RLS 与写入，与窗口 C（M2b 策略）、窗口 D（180000/190000）均无关，属既有代码缺陷。
- **处置**：采集时点登记、未动代码；修复方案为 `purpose` 改 `Option<String>`，并补「purpose 为空时列表仍 200」的用例。
- **备注**：窗口 D 的探针行已按精确 id 硬删，`erp.vehicle_requests` 物理行数归 0。
- **状态（2026-11-15）**：**已修复**，提交 `7425ba813`（`purpose` 改为 `Option<String>`，保留 NULL 语义而非 `COALESCE(purpose,'')`）。

### K5. `forecast_v53` 历史凭证查询 `text = uuid`，predict 写入口 500

- **位置**：`svc/finance/src/modules/forecast_v53.rs` 第 352-368 行（`fetch_historical_data`）。
- **现象**：`POST /api/finance/forecast-v53/cash-flow/predict` 返回 500「内部服务器错误」（窗口 D 实测）；两条读接口 `/predictions`、`/accuracy` 正常 200。日志原文：`数据库查询错误: error returned from database: operator does not exist: text = uuid at line 644`。
- **根因**：SQL 条件 `($2::uuid IS NULL OR v.entity_id = $2)` 里 `$2` 按 `uuid` 绑定，而 prod 的 `finance.vouchers.entity_id` 实际是 `text`（`tenant_id` 才是 `uuid`），`v.entity_id = $2` 触发 `text = uuid` 类型不匹配。
- **影响面**：预测写入口不可用（读接口不受影响）。与 20261114190000 无关——该迁移只加 `is_synthetic` 列与注释，不改 `vouchers` 结构。
- **处置**：采集时点登记、未动代码；修复方案为查询侧显式按 `text` 绑定 / 转型，并补「有历史凭证时 predict 成功」的用例。
- **备注**：窗口 D 未回滚 190000——在跑的件 INSERT 已写 `is_synthetic`，回滚会删列并让写路径报列不存在，比现状更糟。
- **状态（2026-11-15）**：**已修复**，提交 `320a19b7e`（+ `ba3b6e4ad` rustfmt 折行）。2026-11-15 生产换件回执：`text = uuid` 与 NUMERIC 解码错误消失；无历史数据时 predict 仍 500 属上游既有行为（后续由 finance K6 改为 400）。

### K7. `wms.purchase_order_snapshots` 生产只有 3 列、缺 11 列，WMS 快照写/查路径必失败（**已修复**）

- **位置**：写 `svc/wms/src/event_handlers/mod.rs:436-439`（`INSERT INTO wms.purchase_order_snapshots` 引用 13 列）；读 `svc/wms/src/modules/data_sync.rs:384-390`（`SELECT ... FROM wms.purchase_order_snapshots WHERE id = $1 AND status = 'approved'`）。
- **现象**：2026-11-15 窗口 E 投前预检实测，prod `wms.purchase_order_snapshots` 只有 `id`、`deleted_at`、`tenant_id` **3 列**（2026-11-15 入库校对复核一致，0 行）；dev 同名表 **14 列**（`order_number`、`supplier_id`、`supplier_name`、`total_amount`、`payable_amount`、`status`、`approved_by`、`approved_at`、`synced_at`、`created_at`、`updated_at` 等）。生产没有 `status` 列。
- **根因**：prod 该表由 `20260725000000_business_base_tables.sql:3457` 的脚手架 `CREATE TABLE IF NOT EXISTS (id UUID PRIMARY KEY ...)` 先建成空壳；真正的业务列在 `20260905000003_v255_wms_po_snapshots.sql` 里建到了 `plugin_wms` schema（13 列）。prod 的 `wms` 空壳此后只被补过 `tenant_id`（`20260909000001`）和 `deleted_at`（`20261007000004`），业务列从未补齐；dev 因历史对齐得到 14 列，形成 prod/dev 结构漂移。
- **影响**：`wms.purchase_order_snapshots` 写入必报 `42703 column "order_number" of relation "purchase_order_snapshots" does not exist`，采购订单快照同步整条链路不可用；读路径同样失败。与 RLS/租户无关，纯列缺失。
- **处置**：单独立项，不在窗口 E 做。顺序必须是「先补 11 列（含 `status`，注意 NOT NULL/DEFAULT）→ 再建 `ck_purchase_order_snapshots_status_standard`」。窗口 E 的 `20261115000000` 已按 17 表口径剔除该表，原因写在其文件头。
- **工单**：`docs/database/workorder-wms-po-snapshot-backfill-20261115.md`（与 `/private/tmp/topems-dud-20261115/docs/database/` 下同名文件内容一致，已入 `origin/main`）；ticket `TOPEMS-W7-B4-WMS-PO-SNAPSHOT-BACKFILL`。
- **状态（2026-11-15）**：**已修复**，迁移 `20261115100000_w7_b4_wms_po_snapshot_backfill`（提交 `e2ed366de`，生产投递 2026-11-15 08:57:36 +08，账本 681）。prod 补齐至 14 列并与 dev 逐列 diff 为空；`ck_purchase_order_snapshots_status_standard` 值域 `active/inactive/archived/pending/approved`；事务内非法值取证 `23514` 后已回滚，表内 0 行。回滚文件 `database/rollback/20261115100000_w7_b4_wms_po_snapshot_backfill.rollback.sql`（表内有数据时拒绝执行）。
- **备注**：`docs/quality/prod-column-drift-full-2026-11-09.md` 的 `wms.purchase_order_snapshots`（11）节已登记同一批缺列但未修，本项 K7 作为跟踪编号。`plugin_wms.purchase_order_snapshots`（13 列）当前 0 行，且不是代码路径的目标表。

### K8. 5 张表的 RLS 谓词为 fail-open，无租户上下文的连接可读全表（**待处置**）

- **位置**：`rls_tenant_isolation` 策略本体位于 `crm.billing_records`、`erp.erp_master_data_refs`、`tms.tms_carriers`、`tms.tms_drivers`、`tms.tms_vehicles`（prod 与 dev 定义同义）。
- **现象（2026-11-15 dev 实测，非超户 `topems_app`，`rolsuper=false`、`rolbypassrls=false`）**：A、B 两个租户各插一行后——GUC=租户A 读只看到 A 的 1 行 ✅；GUC=A 写 `tenant_id=B` 被拒（`insufficient_privilege`）✅；但**无 GUC 的连接读到 2 行**（A、B 都可见）。prod 上这 5 张表的策略定义与 dev 相同，因此 prod 同样成立，不是本次 dev 对齐引入的漂移。
- **谓词原文**（`crm.billing_records` 与 tms 三张，`USING` 与 `WITH CHECK` 同构）：

```sql
((current_setting('app.tenant_id'::text, true) IS NULL)
 OR (current_setting('app.tenant_id'::text, true) = ''::text)
 OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text)
 OR (tenant_id IS NULL)
 OR (tenant_id = (current_setting('app.tenant_id'::text, true))::uuid))
```

  `erp.erp_master_data_refs` 为等价的 `COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '000…0'` 复合式，同样含 `current_setting(...) IS NULL` 与 `tenant_id IS NULL` 两个放行分支。
- **与已完成批次的同类性**：与 M2b（`20261114202000`）、M1（`20261114200000`）同属「旧 fail-open 策略让收紧失效」家族。区别是前两批的成因是**多条 permissive 策略 OR 短路**（残留 `tenant_isolation_*`，已在 dev 清理），这 5 张表是**单条策略内部的 `IS NULL` 放行分支**，必须重写策略本体才能收紧。
- **影响面**：只影响完全不带租户上下文的连接（裸池、后台任务、手工 SQL）。带 GUC 的正常业务读写隔离正确，跨租户写被 `WITH CHECK` 拒绝。风险点在于：任何漏设 GUC 的代码路径会静默读到全表，且无日志、无 0 行告警。
- **建议处置**：下一批用新迁移把 5 张表统一收紧为 `app.rls_system = 'on'`（显式系统通道）或 `tenant_id = GUC` 的 fail-closed 形状，`USING` 与 `WITH CHECK` 同步改写；落刀前先逐表核查代码侧读写路径的租户绑定情况，**先出方案再改**，避免收紧后出现静默 0 行。
- **状态（2026-11-15）**：**待处置**。本轮按要求让 dev 与 prod 保持一致，dev 不做额外收紧；与 dev 账本对齐同批的登记见 `docs/database/schema-baseline-drift-2026-11-14.md`。


