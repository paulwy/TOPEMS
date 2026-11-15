# 代码 → schema 缺口扫描（2026-11-15）

> **库身份与账本水位**
> dev：本机 socket 库 `topems`（PostgreSQL 18.4）。
> prod：生产主库 `topems_prod`（unix socket，应用角色 `topems_prod` 非超户），`_sqlx_migrations` **693 行 / max `20261115142000` / failed=0**（空壳表第 2 批投产后水位）。
> 本轮扫描全程只读：两库未执行任何 DDL/DML，未改迁移文件；唯一写入是本文件。
> 关联文档：[dev / prod 列级漂移归属与处置清单](./column-drift-attribution-2026-11-15.md)（下称"漂移文档"）。

## 0. 结论摘要

1. **口径换了一次，结论就变了**。漂移文档是"schema 对 schema"的列差集（B 类 18 列、D 类 117 列）；决定运行时 42703 的是"代码写了哪些列、prod 有没有"。两者不是同一个集合。B 类 18 列补完之后 `portal.portal_todos` 仍然 42703，就是差集口径漏掉的直接证据。
2. 全仓 Rust 写/读路径扫描结果：**43 个唯一缺口 / 15 张表 / 15 条代码路径**。
   - **A 类（dev 有、prod 缺）35 列 + 1 张整表缺失**：`finance.finance_u8_import_records` 整表不在 prod（42P01）。
   - **B 类（dev 也没有）8 列 / 4 表**：补 prod 修不好，属于代码引用了不存在的列。
3. 9 张空壳表合计缺 **159 列**，prod 全部 **0 行**，可整表对齐、零数据风险。
4. `integration.core_inter_module_sync` **不是单侧缺列**：prod 独有 5 列、dev 独有 7 列，代码两侧都在用 → **已决定按并集补**，缺哪列补哪列（§7.5）。
5. **prod 日志时间戳是 UTC（`Z`）**，主机时区 `+0800`；`07:36:39Z` 即本地 `15:36:39`。统计口径与覆盖窗口见 §9。

## 1. 口径与边界（必读）

### 1.1 两份文档的分工

| | 漂移文档 `column-drift-attribution-2026-11-15.md` | 本文件 `code-schema-gap-2026-11-15.md` |
|---|---|---|
| 比较对象 | dev schema ↔ prod schema | 代码引用（INSERT/UPDATE/RETURNING/ON CONFLICT/SELECT 列清单）↔ prod 实际列 |
| 回答 | "两份 schema 差多少列、归谁补" | "运行时会在哪条代码路径炸、炸成什么错误码" |
| 排序 | 按表族 / 列数 | 按代码路径（写路径 > 读路径；用户主动 > 定时/事件） |
| 不覆盖 | 单侧缺失但两侧都"齐"的情况（本文件） | 只读列以外的结构体映射盲区（见 §1.3） |

**两份文档必须一起读**：漂移文档的 B 类 18 列已完成投产，但"补完差集"≠"路径修完"。

### 1.2 差集口径天然覆盖不到的东西

反例（必须写进认知，否则会误以为 18 列补完就收工）：

- `portal.portal_todos` 在 B 类里补了 `user_id`、`completed` 两列。代码实际还要写 `service_code`、`service_name`、`todo_type`、`link_url` **四列**（[graphql_mutation_impls.rs:104](../../svc/portal/src/modules/graphql_mutation_impls.rs#L104)、[todos.rs:59](../../svc/portal/src/modules/todos.rs#L59)）。这 4 列在 dev 里**本来就有**，所以任何"dev 有、prod 缺"的差集都应该能覆盖——但 B 类收敛时只取了"HEAD 代码已真实读写的 18 列"这一子集，`portal_todos` 只登记了 2 列。**差集口径不会漏，子集截取会漏。**
- 更彻底的一类是"dev 有、代码新增引用、但从未进入任何清单"：本文件 A 类 35 列里，`integration.crm_erp_sync.updated_at` 等 8 列属于这一类。
- 反向漏法：`iam.users.tenant_id`（[notification.rs:354](../../svc/communication/src/notification.rs#L354)）在 dev 和 prod **都不存在**。差集为空 → 两份 schema 都"一致" → 但线上必然 42703。这类只有代码侧扫描能发现（本文件 B 类）。

### 1.3 本文不覆盖什么（已确认的盲区）

- `SELECT *` / `sqlx::query_as` 结构体字段映射：列名不在 SQL 文本里，扫不到。已知同类故障：prod 上报 `decoding column "purpose": unexpected null`（结构体要求非空，表里可空），与 42703 是同一类"代码假设 vs 实际列"问题，但本文件不纳入统计。
- `format!` 拼接的表名/列名、运行时动态 SQL、前端 TS 类型定义。
- 视图、函数体内的 SQL（函数体里 `SELECT` 到缺列的，本文件未拆解）。
- 测试代码、`benches/`、`examples/`、`#[cfg(test)]` 模块均已排除，不计入缺口。

## 2. 扫描方法

### 2.1 采集

- prod 列清单：`information_schema.columns` + `pg_class.reltuples`，17277 行（1345 张表）。
- dev 列清单：19757 行。两份清单落到扫描临时目录 `<tmp>/{prod,dev}_cols.psv`，格式 `schema|table|column|data_type|char_len|num_prec|num_scale|is_nullable|default`。
- 扫描范围：`svc/`、`lib/`、`crates/`、`tools/`、`cli/` 下全部 `.rs`；排除 `/tests/`、`/benches/`、`/examples/`、`*_test.rs`、`*_tests.rs`、`*_e2e.rs`、`*_bench.rs`。

### 2.2 解析规则

- 只解析字符串字面量（含 `r#"..."#` 原始串、跨行串），不做全文正则——避免把注释/文档里的示例当 SQL。
- 抽取 `INSERT INTO <tbl> (列清单)`、`UPDATE <tbl> SET 列 = ...`、`RETURNING <列清单>`、`ON CONFLICT (列清单)`、`SELECT <纯列名清单> FROM <tbl>`。
- 表名消歧：schema 限定则直接用；未限定则在 dev 里按表名找所有 schema，优先 prod 存在的那个，再按缺列最少选。
- **只有 dev 里真实存在的表才进入统计**——这一条同时是假阳性过滤器（散文里的 `update called` 会被丢弃）。

### 2.3 假阳性剔除（v1 → v3）

| 现象 | 根因 | 处置 |
|---|---|---|
| `set` 119 条 | UPSERT 的 `DO UPDATE SET` 被当成 UPDATE 语句 | 匹配前检查前 12 字符是否 `DO\s+$` |
| `called`/`is`/`for`/`email`/`material`/`accident`/`apqp` | 日志/文档散文里的英文动词 `update called ...` | 表名必须在 dev 存在 |
| `sql_injection_tests.rs`、`query_optimizer.rs:148` | 测试夹具与内联 `#[test] fn` | 文件名规则 + `#[cfg(test)] mod` / `#[test] fn` 花括号区间跳过 |
| `RETURNING null` | `RETURNING NULL AS x` 的表达式被当列名 | 列名必须在 SQL 关键字白名单外，且为纯标识符 |

修正后：`<TABLE>` 型噪声从 328 条降到 1 条（`finance_u8_import_records`，是真缺表）。

### 2.4 行号口径

行号 = **SQL 关键字在源文件中的实际行号**，由"字面量起始字节偏移 + 关键字在字面量内的偏移"经换行表精确回算，不是字符串起始行、不是过滤后行号。

已逐一用 `sed -n` 复核（全部一致）：`voucher_template.rs:216/315`、`todos.rs:59/161`、`sync.rs:752`、`notification.rs:3943`、`pdm/event_handlers/mod.rs:269`、`u8_import.rs:92`、`history.rs:86/121/151`、`quick_actions.rs:90`、`audit.rs:296`、`audit_v52.rs:911`。

## 3. 总览

| 指标 | 数值 |
|---|---|
| 扫描 Rust 文件（含 SQL 关键字） | 743 |
| 命中 SQL 片段（表在 dev 存在） | 3778 |
| 唯一缺口 (table, column) | **43** |
| 涉及表 | 15 |
| 涉及代码路径 | 15 |
| A 类（dev 有 / prod 缺） | 35 列 / 9 表 + 1 整表缺失 |
| B 类（dev 也没有） | 8 列 / 4 表 |
| 空壳表（代码在用、prod 列数 < dev/2） | 9 表 / 缺 159 列 |
| 危险类型漂移（代码引用到的列） | 16 |

## 4. Top 10 代码路径

排序规则：写路径优先于读路径；写路径中"用户主动操作"优先于"定时任务/事件消费"。

| # | 触发 | 路径 | 表 | 缺列 | prod 失败方式 | 是否已在 prod 触发 |
|---|---|---|---|---|---|---|
| 1 | 用户写 | [graphql_mutation_impls.rs:104](../../svc/portal/src/modules/graphql_mutation_impls.rs#L104)、[todos.rs:59](../../svc/portal/src/modules/todos.rs#L59)/[161](../../svc/portal/src/modules/todos.rs#L161) | `portal.portal_todos` | service_code, service_name, todo_type, link_url | 42703（INSERT 列清单 / SELECT 列清单） | 未观测到，但路径可达（模块已注册 `/api/portal`，表 0 行） |
| 2 | 用户写 | [voucher_template.rs:216](../../svc/finance/src/services/finance/voucher_template.rs#L216)/[315](../../svc/finance/src/services/finance/voucher_template.rs#L315) | `finance.finance_voucher_templates` | default_debit_account, default_credit_account | 42703 | 未观测到（表 0 行） |
| 3 | 用户写 | [u8_import.rs:92](../../svc/finance/src/services/finance/u8_import.rs#L92) 等 6 处 | `finance.finance_u8_import_records` | **整表缺失** | **42P01 undefined_table** | 未观测到（prod 无此表） |
| 4 | 用户操作触发的 handler | [sync.rs:752](../../svc/integration/src/handlers/sync.rs#L752) | `integration.core_inter_module_sync` | source_entity, source_id, retry_count, max_retries | 42703 | 未观测到（0 行） |
| 5 | 用户写 | [notification.rs:3943](../../svc/communication/src/notification.rs#L3943) | `public.core_notification_templates` | status | 42703（UPDATE SET） | 未观测到（0 行）；**B 类** |
| 6 | 全局写（每请求） | [audit.rs:296](../../lib/shared-db/src/audit.rs#L296) | `public.audit_logs` | origin | 42703（UPDATE SET） | 未观测到（0 行）；**B 类**，分支条件 `origin.is_some()` |
| 7 | 用户读（门户首页） | [quick_actions.rs:90](../../svc/portal/src/modules/quick_actions.rs#L90) | `portal.portal_quick_actions` | 7 列 | 42703（SELECT 列清单） | 未观测到（0 行） |
| 8 | 用户读（凭证审计） | [audit_v52.rs:911](../../svc/finance/src/modules/audit_v52.rs#L911) | `finance.core_finance_vouchers` | total_amount | 42703 | 未观测到（0 行） |
| 9 | 事件消费写 | [pdm/event_handlers/mod.rs:269](../../svc/pdm/src/event_handlers/mod.rs#L269) | `pdm.pdm_master_data_refs` | 12 列（含 ON CONFLICT 目标 `master_data_id`） | 42703；唯一索引缺失时 42P10 | 未观测到（0 行） |
| 10 | 定时同步 | [crm_erp_sync.rs:214](../../svc/integration/src/crm_erp_sync.rs#L214)、[crm_scm_sync.rs:206](../../svc/integration/src/crm_scm_sync.rs#L206)、[erp_wms_sync.rs:206](../../svc/integration/src/erp_wms_sync.rs#L206)、[hrm_finance_sync.rs:207](../../svc/integration/src/hrm_finance_sync.rs#L207) | `integration.*_sync` ×4 | updated_at | 42703（INSERT/SELECT/UPDATE 三处都用） | 未观测到（0 行） |

第 5、6 条是 **B 类**（dev 也没有该列）：补 prod 无效，需改代码或给 dev+prod 两侧同时加列。

## 5. A 类：dev 有、prod 缺（35 列 / 9 表 + 1 整表）

| 表 | 缺列 | 读/写 | 代码位置 | 备注 |
|---|---|---|---|---|
| `portal.portal_todos` | service_code, service_name, todo_type, link_url | 写 + 读 | 见 Top 1 | dev 21 列 / prod 16 列，差异全部单侧 |
| `portal.portal_quick_actions` | tenant_id, name, description, icon, action_type, target_url, service_code, sort_order, is_active, created_at, updated_at（11） | 读 | quick_actions.rs:90 | 空壳表；另有 2 个索引依赖缺列 |
| `finance.finance_voucher_templates` | default_debit_account, default_credit_account | 写 | voucher_template.rs:216/315 | dev 16 / prod 14 |
| `finance.core_finance_vouchers` | total_amount 等 26 列 | 读（+ 多处写） | audit_v52.rs:911 等 | 空壳表，见 §7 |
| `finance.finance_u8_import_records` | 整表 | 写 | u8_import.rs:92/144/190/214/250/275 | prod 无此表 → 42P01 |
| `integration.core_inter_module_sync` | source_entity, source_id, retry_count, max_retries | 写 | sync.rs:752 | **两侧形状不同**，见 §7.5 |
| `integration.crm_erp_sync` | updated_at | 写 + 读 | crm_erp_sync.rs:214 | dev 24 / prod 22（另缺 crm_product_id，代码未引用） |
| `integration.crm_scm_sync` | updated_at | 写 + 读 | crm_scm_sync.rs:206 | 同上 |
| `integration.erp_wms_sync` | updated_at | 写 + 读 | erp_wms_sync.rs:206 | 同上 |
| `integration.hrm_finance_sync` | updated_at | 写 + 读 | hrm_finance_sync.rs:207 | 同上 |
| `pdm.pdm_master_data_refs` | 12 列（master_data_id, tenant_id, domain, code, name, status, source_service, local_entity_type, local_entity_id, payload_snapshot, last_synced_at, created_at, updated_at 中的代码引用子集） | 写 | event_handlers/mod.rs:269 | 空壳表；`ON CONFLICT (master_data_id)` 需唯一索引 |

## 6. B 类：dev 也没有的列（8 列 / 4 表）—— 只登记

| 表 | 列 | 代码位置 | 性质 |
|---|---|---|---|
| `iam.users` | tenant_id | [notification.rs:354](../../svc/communication/src/notification.rs#L354) | 代码缺陷；且该查询用 `.fetch_optional().await.unwrap_or(None)` **吞掉错误**，永不进日志 |
| `public.core_notification_templates` | status | notification.rs:3943 | 代码缺陷（表两侧都只有 13 列，无 status） |
| `public.audit_logs` | origin | [audit.rs:296](../../lib/shared-db/src/audit.rs#L296) | 代码缺陷；分支条件 `origin.is_some()`，非全量请求触发 |
| `flow.core_migration_history` | script_name, checksum, status, execution_time_ms, rolled_back_at | [history.rs:86](../../tools/migration-sdk/src/history.rs#L86)/[121](../../tools/migration-sdk/src/history.rs#L121)/[151](../../tools/migration-sdk/src/history.rs#L151) | **运行期不可达**：`topems-migration-sdk` 是 workspace 成员，但没有任何 crate 依赖它（`grep topems-migration-sdk **/Cargo.toml` 仅命中自身） |

处置：本次**不动代码、不补表**。`notification.rs:354` 的评估要点是"该路径是否能跑通"——吞错意味着即使列补上也拿不到 tenant_id，需先确认租户隔离在通知链路上是不是有意的 no-op。

## 7. 空壳表整表对齐方案（9 表 / 159 列）

### 7.1 判定与前提

判定：dev 有该表、prod 同 schema 有同名表、prod 列数 < dev/2 且差 ≥4、且 HEAD 代码在用。
前提：**9 张表中 8 张在 prod 为 0 行**（`count(*)` 实测，2026-11-15）。唯一例外是 `finance.core_finance_vouchers`：prod 有 **1 行**（`记2026110001`，2026-11-09 写入）。

因此按"新增列是否可空"分两种门：
- 新增列含 `NOT NULL`（batch 1 `portal.portal_quick_actions`、batch 3/4/5/6 各表）：仍以 0 行为前提，迁移内保留行数门，非 0 行直接拒绝。
- 新增列**全部 nullable**（batch 2 `finance.core_finance_vouchers`）：不设 0 行门，改为校验外键目标完整性（既有行 `tenant_id` 必须在 `public.core_tenants` 中），加列不触碰既有行、无需回填。

### 7.2 逐表列清单（类型/长度/NULL/默认值均取自 dev）

**1）`qms.quality_inspections` — dev 45 / prod 2，缺 43**
`organization_id:uuid; standard_id:uuid; inspection_number:varchar(100); title:varchar(255) NOT NULL; description:text; inspection_type:varchar(50) NOT NULL; inspection_method:varchar(50); inspection_category:varchar(50); object_type:varchar(50); object_id:uuid; object_name:varchar(255); object_batch:varchar(100); inspector:varchar(255) NOT NULL; inspector_id:uuid; department:varchar(100); location:varchar(255); planned_date:date; actual_date:date; start_time:time; end_time:time; duration_minutes:integer; status:varchar(20) NOT NULL DEFAULT 'planned'; result:varchar(20); score:numeric(5,2); pass_rate:numeric(5,2); total_items:integer; passed_items:integer; failed_items:integer; findings:text; conclusion:text; recommendations:text; risk_level:varchar(20); next_inspection_date:date; follow_up_required:boolean DEFAULT false; approved_by:varchar(255); approved_at:timestamptz; attachments:jsonb; notes:text; created_at:timestamptz NOT NULL DEFAULT now(); updated_at:timestamptz NOT NULL DEFAULT now(); created_by:uuid; updated_by:uuid; tenant_id:uuid`

**2）`finance.core_finance_vouchers` — dev 46 / prod 20，缺 26**
`voucher_number:varchar(64); year:integer; month:integer; total_amount:numeric(18,2); currency_code:varchar(16); submitter_id:uuid; submitter_name:varchar(128); maker_id:uuid; maker_name:varchar(128); submitted_at:timestamptz; approver_id:uuid; approver_name:varchar(128); checker_id:uuid; checker_name:varchar(128); approved_at:timestamptz; poster_id:uuid; poster_name:varchar(128); bookkeeper_id:uuid; bookkeeper_name:varchar(128); posted_at:timestamptz; is_reversed:boolean DEFAULT false; reverse_voucher_id:uuid; reversed_at:timestamptz; attachment_count:integer DEFAULT 0; summary:text; updated_by:uuid`

**3）`qms.quality_standards` — dev 28 / prod 2，缺 26**
`organization_id:uuid NOT NULL; code:varchar(100) NOT NULL; name:varchar(255) NOT NULL; description:text; category:varchar(50); version:varchar(50) DEFAULT '1.0'; standard_type:varchar(50); authority:varchar(255); effective_date:date; expiry_date:date; requirements:text; criteria:text; compliance_level:varchar(50); status:varchar(20) NOT NULL DEFAULT 'active'; is_mandatory:boolean DEFAULT false; review_frequency:varchar(50); last_review_date:date; next_review_date:date; reviewer:varchar(255); notes:text; attachments:jsonb; created_at:timestamptz NOT NULL DEFAULT now(); updated_at:timestamptz NOT NULL DEFAULT now(); created_by:uuid; updated_by:uuid; tenant_id:uuid`

**4）`erp.expenses` — dev 18 / prod 3，缺 15**
`organization_id:uuid NOT NULL DEFAULT uuid_generate_v4(); expense_number:varchar(100) NOT NULL; applicant_name:varchar(255); department_id:uuid; expense_type:varchar(100); amount:numeric(15,2) NOT NULL; description:text; expense_date:timestamptz; receipt_count:integer; status:varchar(50) NOT NULL DEFAULT 'pending'; approver_id:uuid; approved_at:timestamptz; reimbursed_at:timestamptz; created_at:timestamptz NOT NULL DEFAULT now(); updated_at:timestamptz NOT NULL DEFAULT now()`

**5）`pdm.pdm_master_data_refs` — dev 13 / prod 2，缺 13**
`master_data_id:varchar(128) NOT NULL; tenant_id:uuid NOT NULL; domain:varchar(32) NOT NULL; code:varchar(128) NOT NULL; name:varchar(256); status:varchar(32) DEFAULT 'active'; source_service:varchar(64) NOT NULL; local_entity_type:varchar(64); local_entity_id:uuid; payload_snapshot:jsonb; last_synced_at:timestamptz DEFAULT now(); created_at:timestamptz NOT NULL DEFAULT now(); updated_at:timestamptz NOT NULL DEFAULT now()`

**6）`portal.portal_quick_actions` — dev 13 / prod 2，缺 11**
`tenant_id:uuid NOT NULL; name:varchar(100) NOT NULL; description:text; icon:varchar(50); action_type:varchar(20) NOT NULL DEFAULT 'navigate'; target_url:varchar(500) NOT NULL; service_code:varchar(50); sort_order:integer NOT NULL DEFAULT 0; is_active:boolean NOT NULL DEFAULT true; created_at:timestamptz NOT NULL DEFAULT now(); updated_at:timestamptz NOT NULL DEFAULT now()`

**7）`public.analytics_sync_records` — dev 14 / prod 2，缺 12**
`data_source_id:uuid; status:varchar(32) NOT NULL DEFAULT 'pending'; sync_type:varchar(64) NOT NULL; records_count:bigint; affected_records:bigint; error_message:text; started_at:timestamptz NOT NULL DEFAULT now(); completed_at:timestamptz; duration_ms:bigint; created_at:timestamptz DEFAULT now(); updated_at:timestamptz DEFAULT now(); tenant_id:uuid`

**8）`public.cqrs_events` — dev 10 / prod 4，缺 8**
`aggregate_id:varchar(64) NOT NULL; aggregate_type:varchar(32) NOT NULL; event_type:varchar(64) NOT NULL; version:bigint NOT NULL; payload:jsonb NOT NULL; metadata:jsonb DEFAULT '{}'; occurred_at:timestamptz NOT NULL DEFAULT now(); deleted_at:timestamptz`

**9）`public.search_logs` — dev 8 / prod 3，缺 5**
`tenant_id:uuid; user_id:uuid; result_count:integer DEFAULT 0; duration_ms:integer DEFAULT 0; created_at:timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP`

### 7.3 索引 / 约束 / 默认值一并对齐

只补列不补索引，`ON CONFLICT` 与唯一性校验会在线上变成 42P10 或静默放过重复行。需随列一起建的（dev 现状）：

| 表 | 需补的索引/约束 | 说明 |
|---|---|---|
| `qms.quality_standards` | `idx_quality_standards_code_unique`、`ck_quality_standards_status_standard` | 唯一索引与 CHECK 都依赖新增列 |
| `qms.quality_inspections` | `idx_quality_inspections_*`（11 个：inspection_number / inspector / object_id / organization_id / planned_date / actual_date / standard_id / status / type / tenant_id ×2）、FK `standard_id → qms.quality_standards(id) ON DELETE SET NULL` | FK 必须在父表 `quality_standards` 之后建 |
| `erp.expenses` | `expenses_expense_number_key`(UNIQUE)、`idx_expenses_expense_number/organization_id/status`、`idx_erp_expenses_tenant_id` | `expense_number` 唯一性靠这只 |
| `finance.core_finance_vouchers` | `uq_finance_voucher_tenant_source`(partial unique)、`uq_voucher_company_period_no`(partial unique)、`idx_voucher_period/status/tenant_id/tenant_company`、FK `tenant_id → core_tenants(id)` | 两只 partial unique 是业务唯一性的关键 |
| `pdm.pdm_master_data_refs` | 唯一索引 `(master_data_id)`、`ck_pdm_master_data_refs_status_standard` | prod 当前 PK 是 `(id)`，`ON CONFLICT (master_data_id)` 无索引 → 42P10 |
| `portal.portal_quick_actions` | `idx_quick_actions_active`(partial)、`idx_quick_actions_service`、`idx_quick_actions_tenant`(partial) | |
| `public.analytics_sync_records` | `idx_sync_records_datasource/started_at/status/type` | |
| `public.cqrs_events` | `cqrs_events_aggregate_id_version_key`(UNIQUE)、`idx_cqrs_events_aggregate/occurred/type` | 聚合版本唯一性是并发正确性依赖 |
| `public.search_logs` | `idx_search_logs_created/query/tenant` | |

### 7.4 补完后会消失的 42703

只列"本次扫到的代码引用"，结构体映射类（§1.3）不在内。

| 表 | 消失的报错 | 路径 |
|---|---|---|
| `portal.portal_quick_actions` | 7 列 × SELECT | 门户首页快捷入口（quick_actions.rs:90） |
| `finance.core_finance_vouchers` | total_amount × SELECT（另 25 列供写入路径） | 凭证审计列表/汇总（audit_v52.rs:911/858/1317、modules/mod.rs:3845/3884、periods.rs:702、elimination_flow.rs:1204、event_handlers/mod.rs:239） |
| `pdm.pdm_master_data_refs` | 12 列 × INSERT + 1 × ON CONFLICT | 主数据引用写入（event_handlers/mod.rs:269） |
| `qms.quality_inspections` | 43 列（本条 SQL 未命中，收益来自整表可用） | 检验单 CRUD；补后 `standard_id` FK 才能建 |
| `qms.quality_standards` | 26 列（同上） | 标准 CRUD |
| `erp.expenses` | 15 列（同上） | 费用报销 CRUD |
| `public.analytics_sync_records` | 12 列（同上） | 同步任务状态写入 |
| `public.cqrs_events` | 8 列（同上） | 事件总线写入；补后唯一索引才可建 |
| `public.search_logs` | 5 列（同上） | 搜索日志（handlers.rs:479/496） |

"同上"三类（401 系列表）说明：这几张表的代码用的是 `SELECT *` / 结构体映射，SQL 文本里没有列名，本扫描抓不到具体列——**收益成立但无法逐列指认**，这是扫描盲区，不是"没有缺口"。

### 7.5 `integration.core_inter_module_sync`：单独处置（按并集补）

**决定（2026-11-15，工程决定，非业务确认）：按 dev ∪ prod 的并集补列，缺哪列补哪列，不等待业务语义结论。**

理由：

1. 取证显示代码实际读写的是并集——dev 独有 4 列在用（`source_entity`、`source_id`、`retry_count`、`max_retries`），prod 独有 5 列**全部在用**（`entity_type`、`entity_ids`、`operation`、`started_at`、`finished_at`）。既然代码两端都要，目标表的正确形状就是并集，不存在"选一边"的解法。
2. 并集补列是纯加法，不删列、不改类型，对现有 0 行表零数据风险；等语义结论再动手只会让这条路径继续 42703。
3. `operation` 与 `source_entity` 是否同一状态机的两代字段，属于**数据治理事项，另立项**，不阻塞补列。若将来确认同义，再做"停写 → 回填 → 收敛"的减法，那时才需要动列。

因此本表**不并入 §7.6 的 6 个批次**，单独一笔：dev 独有 7 列全补（含代码未引用的 `executed_at`、`next_retry_at`、`source_code`，一并补齐以保持整表对齐）。

取证（代码实际读写的列集合，来自 sync.rs 的 11 条语句）：

| 侧 | 列 | 代码是否在用 |
|---|---|---|
| dev 独有 | `source_entity`, `source_id`, `retry_count`, `max_retries`, `executed_at`, `next_retry_at`, `source_code` | **source_entity/source_id/retry_count/max_retries 在用**（sync.rs:167/605/678/752 的 INSERT 列清单）；`executed_at/next_retry_at/source_code` 未命中 |
| prod 独有 | `entity_type`, `entity_ids`, `operation`, `started_at`, `finished_at` | **全部在用**（INSERT 含 entity_type/entity_ids；SELECT 含 operation/started_at/finished_at；UPDATE 写 finished_at） |
| 两侧都有 | `id`, `tenant_id`, `sync_type`, `source_module`, `target_module`, `status`, `error_message`, `created_at`, `updated_at` | 在用 |

结论：**代码用的是 dev ∪ prod 的并集，任一侧都不是权威**。dev 缺 7 列、prod 缺 5 列，方向相反，所以"按 dev 补"或"按 prod 补"都是错的，唯一正确形状是并集。

两个遗留项，均不阻塞补列：

1. `operation` 与 `source_entity` 是否同一状态机的两代字段 → 数据治理事项另立项；确认同义后再做减法收敛。
2. 幂等键：目前代码只 INSERT、没有 `ON CONFLICT`，幂等性靠业务层。补列后不新增唯一约束，避免与业务层语义冲突；若将来要上 `ON CONFLICT`，再单独评估键的选择。

代码位置：[sync.rs:167](../../svc/integration/src/handlers/sync.rs#L167)（INSERT 11 列）、[:230](../../svc/integration/src/handlers/sync.rs#L230)/[:352](../../svc/integration/src/handlers/sync.rs#L352)（SELECT 15 列）、[:496](../../svc/integration/src/handlers/sync.rs#L496)/[:511](../../svc/integration/src/handlers/sync.rs#L511)/[:525](../../svc/integration/src/handlers/sync.rs#L525)/[:539](../../svc/integration/src/handlers/sync.rs#L539)（UPDATE）、[:752](../../svc/integration/src/handlers/sync.rs#L752)（INSERT 12 列）。

### 7.6 批次建议（待确认后开工）

| 批 | 表 | 列数 | 为什么这个顺序 |
|---|---|---|---|
| 1 | `portal.portal_quick_actions` | 11 | 门户首屏用户可见，最小可验证闭环（1 表 11 列 + 3 索引） |
| 2 | `finance.core_finance_vouchers` | 26 | 只读路径已存在（audit_v52），补完即可用；含 2 只 partial unique + FK |
| 3 | `qms.quality_standards` → `qms.quality_inspections` | 26 + 43 | 有 FK 依赖，父表先建；两张都是完整业务表，必须同窗完成 |
| 4 | `erp.expenses` | 15 | 独立表，含 `expense_number` 唯一约束 |
| 5 | `pdm.pdm_master_data_refs` | 13 | 含 `ON CONFLICT` 目标唯一索引，需与事件消费路径同批验证 |
| 6 | `public.cqrs_events` + `public.search_logs` + `public.analytics_sync_records` | 8 + 5 + 12 | 平台级，影响面大但无交叉依赖，可并行评审 |
| 单列 | `integration.core_inter_module_sync` | 待定 | 先按 §7.5 定权威，不进上述批次 |

合计 6 批 + 1 单列事项，覆盖 159 列。

## 8. 类型漂移 16 处（需先定权威类型，本节不列处置动作）

同表同列、dev 与 prod 类型不同，且被代码引用；只列会破坏绑定/解码的组合（uuid↔varchar、int↔text、date↔timestamptz、jsonb↔标量），`varchar↔text` 这类等价组合已剔除。

| 表.列 | dev | prod | 代码位置 |
|---|---|---|---|
| `mes.work_reports.approved_by` | uuid | character varying | work_report.rs:629 |
| `public.core_workflow_versions.created_by` | character varying | uuid | workflow.rs:837 |
| `public.core_workflow_versions.version` | character varying | integer | workflow.rs:837 |
| `pm.contract_payment_schedule.payment_number` | integer | text | contract.rs:944 |
| `ehs.qa_ehs_hazardous_materials.hazard_class` | jsonb | character varying | hazardous_material.rs:371 |

（其余 11 处见附录 A；`character varying` 与 `text` 这类等价组合未计入。）

**处置前置**：必须先定"哪一侧是权威"，再决定是改代码的类型映射还是改表。prod 日志里唯一一条同类真实错误是 `operator does not exist: text = uuid`（42883，2026-11-14T17:09:38，本地时间），但日志只给到通用错误构造函数 `enhanced.rs:644`，**无法反推到具体 SQL**，因此仅作"该故障类在生产上确实发生过"的旁证，不归因到上表任何一行。

## 9. 观测与日志口径

- **日志时间戳是 UTC（带 `Z`）**，prod 主机时区 `+0800`。解读时必须 +8 换算，否则会把当前日志误读成数小时前停写。
- **观测文件**：`~/topems/logs/server.out`（进程 fd 1，inode `110921012`）。`server.err` 恒为 0 字节（fd 2 已重定向，应用不写 stderr）。轮转产物 `server.out.YYYYMMDD_HHMMSS.gz`，轮转任务每天 03:30（`log-rotate.log` 可查）；当前目录内只有 `server.out.20261114_145842.gz` 一份。
- **覆盖窗口**：本地 `2026-11-14 14:58` → `2026-11-15 15:36`（最后一个完整时间戳 `07:36:44Z`），区间内包含 10:06 那次重启的启动段。
- 全文件 `42703` 命中 **0 次**；`does not exist` 1 次（§8 的 42883 旁证）；`ERROR` 6 行。
- 所有涉及表 prod 行数为 0（唯一例外 `iam.users` 5 行），因此 Top 10 除第 5 条外均标"未观测到，但路径可达"。

## 10. 没做到 / 找不到证据的部分

1. 结构体字段映射（`query_as` / `FromRow` / `SELECT *`）未扫描，§7.4 中 4 张表只能给"整表可用"的收益判断。
2. `integration.core_inter_module_sync` 的业务语义（`operation` vs `source_entity`）无法从代码单独判定；已决定按并集补列，语义问题另立数据治理事项（§7.5）。
3. prod 侧 `text = uuid`（42883）无法定位到具体 SQL，只有时间与错误码。
4. 前端调用面（哪些页面会触发 Top 10 路径）未核；"用户主动"的分类依据是文件路径（handlers/routes/modules）与函数命名，不是真实请求日志。
5. `finance.finance_u8_import_records` 为何在 prod 完全不存在（是被拆除迁移误删还是从未建）未追溯，只确认了现状。

## 11. 复现

```bash
# 列清单（只读）
psql -d topems -At -F'|' \
  -c "select table_schema,table_name,column_name,data_type,character_maximum_length,
             numeric_precision,numeric_scale,is_nullable,column_default
      from information_schema.columns order by 1,2,3" > "$TMPDIR/dev_cols.psv"
# prod 同语句，落 prod_cols.psv

# 扫描器
python3 "$TMPDIR/scan3.py"     # 产出 gaps3.txt / gaps3.json
```

扫描器与中间产物均在仓库外（扫描临时目录），不入库。

---

## 附录 A：类型漂移 16 处全量

| # | 表.列 | dev | prod | 代码位置 |
|---|---|---|---|---|
| 1 | `pm.contract_payment_schedule.payment_number` | integer | text | svc/pm/src/modules/contract.rs:944 |
| 2 | `public.core_workflow_versions.version` | character varying | integer | svc/unified-core/src/modules/flow/workflow.rs:837 |
| 3 | `public.core_workflow_versions.created_by` | character varying | uuid | svc/unified-core/src/modules/flow/workflow.rs:837 |
| 4 | `crm.customer_scores.score` | numeric | integer | svc/crm/src/modules/customer_segmentation.rs:709 |
| 5 | `crm.customer_scores.last_score` | numeric | integer | svc/crm/src/modules/customer_scoring.rs:96 |
| 6 | `mes.work_reports.approved_by` | uuid | character varying | svc/mes/src/modules/work_report.rs:629 |
| 7 | `ehs.training_records.created_by` | character varying | uuid | svc/ehs/src/modules/training.rs:984 |
| 8 | `ehs.safety_hazards.created_by` | character varying | uuid | svc/ehs/src/modules/hazard.rs:1722 |
| 9 | `ehs.qa_ehs_hazardous_materials.hazard_class` | jsonb | character varying | svc/ehs/src/modules/hazardous_material.rs:371 |
| 10 | `hrm.audit_logs.user_id` | uuid | character varying | svc/hrm/src/modules/audit.rs:76 |
| 11 | `mobile.patrol_records.checked_by` | character varying | uuid | svc/mobile/src/db/repository.rs:54 |
| 12 | `finance.budgets.fiscal_year` | character varying | integer | svc/finance/src/modules/operational.rs:575 |
| 13 | `erp.vehicles.mileage` | numeric | integer | svc/erp/src/modules/vehicles.rs:84 |
| 14 | `rs.formulas.created_by` | uuid | text | svc/rd/src/modules/formula.rs:123 |
| 15 | `bi.reports.report_type` | USER-DEFINED（enum） | character varying | svc/analytics/src/modules/report/report.rs:111 |
| 16 | `bi.report_schedules.schedule_type` | USER-DEFINED（enum） | character varying | svc/analytics/src/modules/report/schedule.rs:209 |

> 本表由列清单比对自动生成，每一行都带真实 `file:line`（行号为 SQL 关键字所在行）；未做人工语义复核，正式处置前需逐条确认。
