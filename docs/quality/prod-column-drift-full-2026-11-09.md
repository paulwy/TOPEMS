# 生产 vs 代码契约：全库列级漂移清单

| 项 | 内容 |
|---|---|
| 文档日期 | 2026-11-09 |
| 范围 | 只读盘点：代码契约列集合 vs 生产 schema 快照；未执行任何 DDL/DML，未改代码，未生成迁移 |
| 生产证据 | `database/baseline/prod_schema_20261105235700.sql.gz`（生产基线导出，1349 表 / 17039 列，锚点 `20261105235700`）；生产账本水位 `20261108141500`（来自 `database/migration_manifest.yaml`）；`docs/quality/prod-schema-drift-2026-11-09.md` 的 2026-11-09 生产只读审计结论 |
| 契约证据 | `.sqlx/` 296 个离线缓存；源码内联 SQL 字面量（含 `query!`/`query_as!` 与 `sqlx::query`）；`database/*.sql` 非迁移脚本 |
| 机器可读清单 | `docs/quality/prod-column-drift-full-2026-11-09.json` |

## 0. 结论速览

- 抽取契约引用 **64664** 条，覆盖 **800** 个表名；与生产快照比对后得到 **209** 项差异。
- 分级分布：P0/column_missing **142**；P0/on_conflict_no_unique **25**；P0/table_missing **12**；P2/notnull_ambiguous **15**；P2/table_missing **4**；P3/column_missing **9**；P3/table_missing **2**。
- 三条已知事故全部命中：`finance.financial_reports` 缺 **10** 列（P0）；`master_data` 的 **4** 张表生产快照不存在（P0，含模板列清单引用的 `mdm_data_asset_categories`）；`public.core_user_company_scopes` 落在快照盲区，权限问题由 11-09 审计单独确认（P1）。
- 新增系统性风险：基线之后 **9** 个建表迁移、**16** 张表没有 `OWNER TO topems_prod`，与 11-09 审计 §6 的「新表 owner 归错 → 首次访问 500」一致（P1）。

> 证据边界：生产快照是 **2026-11-05 基线导出**，晚于该时点的对象（如 `core_user_company_scopes`）不在快照内。此类差异一律降级为 P2「快照盲区」并注明建表版本，需按生产账本复核；不把快照盲区当作生产缺失。`tmp/company-assessment/prod_schema.sql` 与基线同源（同为 1349 表、同样缺 `core_user_company_scopes`），且含重建态特征，仅作佐证。

## 1. 方法与分级

### 1.1 契约抽取

| 来源 | 处理 | 置信度 |
|---|---|---|
| `.sqlx` 缓存 `describe.columns[].origin` | 直接给出「表 + 列 + sqlx 类型 + 可空性」，是编译期校验过的强契约 | 高 |
| `.sqlx` / 源码 SQL 的 `INSERT INTO (列清单)`、`UPDATE ... SET 目标` | 写入路径的显式列集合 | 高 |
| 源码 SQL 的别名限定列 `别名.列` | 先解析 `FROM/JOIN` 别名，再归属到表 | 中（动态 SQL 可能误判） |
| `FROM/JOIN/INSERT INTO/UPDATE` 的表名 | 仅用于判定表是否存在 | 中 |
| `ON CONFLICT (列)` | 校验生产是否存在对应唯一索引/主键 | 高 |

未纳入：`SELECT *` 的隐式列、字符串拼接/`format!` 动态表名、`{占位符}` 模板列清单、ORM 之外的运行期 SQL 构造。因此本清单是**下界**而非全集。

### 1.2 分级规则

| 级别 | 判定 | 依据 |
|---|---|---|
| P0 | 表不存在、列不存在、类型类别不兼容、`ON CONFLICT` 无匹配唯一约束 | 运行到该路径立即报错 |
| P1 | 代码按非空解码但生产可空；owner/权限缺失导致 500 | 特定路径失败 |
| P2 | 快照盲区（建表版本 ≤ 生产账本水位，快照未含）；能跑但语义待确认 | 需按账本复核 |
| P3 | 仅测试代码引用；生产存在但代码未引用的遗留列 | 无害 |

类型兼容按「类别」判定：`uuid`、`string`、`json`、`int`、`bigint`、`numeric`、`float`、`ts`、`date`、`bool`、`bytea`、`array` 互不兼容。`numeric` 与 `float` 视为不兼容（sqlx 解码类型不同）。

## 2. P0：生产不存在的表（12）

以下表被代码以结构化 SQL 引用，但生产快照与迁移账本均无对应对象（含 schema 限定）。

| 对象 | 生产实际 | 代码契约 | 判断依据 | 代码引用 | 建议动作 |
|---|---|---|---|---|---|
| bi.org_stats | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/analytics/src/routes.rs:930` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| cqrs_snapshots | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/domain/pg_event_store.rs:148`<br>`svc/finance/src/domain/pg_event_store.rs:297` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| erp.elimination_candidates | 快照中不存在；建表于 20261109140100（晚于生产账本水位，待窗口应用） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/erp/src/modules/consolidation/elimination_flow.rs:421`<br>`svc/erp/src/modules/consolidation/elimination_flow.rs:499`<br>`svc/erp/src/modules/consolidation/elimination_flow.rs:1357` | 随对应前向补丁上线；上线前该路径必然失败 |
| finance.core_finance_report_line_map | 快照中不存在；建表于 20261109110160（晚于生产账本水位，待窗口应用） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/services/finance/report.rs:594`<br>`svc/finance/src/services/finance/report.rs:730` | 随对应前向补丁上线；上线前该路径必然失败 |
| finance_alert_configs_v52 | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/modules/audit_v52.rs:1484`<br>`svc/finance/src/modules/audit_v52.rs:1507`<br>`svc/finance/src/modules/audit_v52.rs:1524` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| finance_alert_history_v52 | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/modules/audit_v52.rs:1540`<br>`svc/finance/src/modules/audit_v52.rs:1634`<br>`svc/finance/src/modules/audit_v52.rs:1580` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| finance_anomaly_alerts_v52 | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/modules/audit_v52.rs:1003`<br>`svc/finance/src/modules/audit_v52.rs:1358`<br>`svc/finance/src/modules/audit_v52.rs:1360` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| finance_audit_findings_v52 | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/modules/audit_v52.rs:875`<br>`svc/finance/src/modules/audit_v52.rs:877` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| finance_detection_configs_v52 | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/modules/audit_v52.rs:1414` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| finance_u8_import_records | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/finance/src/services/finance/u8_import.rs:90`<br>`svc/finance/src/services/finance/u8_import.rs:142`<br>`svc/finance/src/services/finance/u8_import.rs:264` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| master_data.mdm_data_asset_categories | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/master-data/src/modules/knowledge_v53.rs:1224` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |
| orders | 表不存在（任何 schema） | 代码引用该表 | FROM/JOIN/INTO 表引用 | `svc/ai/src/handlers/ai_handlers.rs:813`<br>`lib/tests/rls.rs:195`<br>`lib/shared-db/src/query_optimizer.rs:247` | 核对是否为遗留/未提交迁移；若确实需要，补迁移建表；否则删除该查询 |

## 3. P0：生产不存在的列（142）

列缺失会直接导致 `column does not exist`。按表聚合，便于一次 ALTER 修复。

### `core.core_tenant_plugins`（5）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| activated_at | 代码引用 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:704` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| is_active | 代码引用 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:322`<br>`svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| license_type | 代码引用 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| plugin_id | 代码引用 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| tenant_id | 代码引用 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.erp_production_orders`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/erp/src/modules/production_order.rs:176` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.event_idempotency`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/erp/src/event_handlers/mod.rs:1394` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.internal_transactions`（5）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| confirmed_at | 代码引用 | `svc/erp/src/modules/consolidation/internal_transactions.rs:517` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| confirmed_by | 代码引用 | `svc/erp/src/modules/consolidation/internal_transactions.rs:517` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| disputed_at | 代码引用 | `svc/erp/src/modules/consolidation/internal_transactions.rs:517`<br>`svc/erp/src/modules/consolidation/internal_transactions.rs:615` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| disputed_by | 代码引用 | `svc/erp/src/modules/consolidation/internal_transactions.rs:517`<br>`svc/erp/src/modules/consolidation/internal_transactions.rs:615` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| disputed_reason | 代码引用 | `svc/erp/src/modules/consolidation/internal_transactions.rs:517`<br>`svc/erp/src/modules/consolidation/internal_transactions.rs:615` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.opening_balances`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| account_id | 代码引用 | `svc/finance/src/modules/mod.rs:4461`<br>`svc/finance/src/modules/mod.rs:4560`<br>`svc/finance/src/modules/mod.rs:4665` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.payables`（10）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| amount | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| category | 代码引用 | `svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| created_at | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| invoice_date | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| invoice_number | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| paid_amount | 代码引用 | `svc/erp/src/event_handlers/mod.rs:1006`<br>`svc/erp/src/event_handlers/mod.rs:1024` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| status | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580`<br>`svc/erp/src/event_handlers/mod.rs:1006` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| supplier_name | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| tenant_id | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| updated_at | 代码引用 | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580`<br>`svc/erp/src/event_handlers/mod.rs:1006` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `erp.receivables`（10）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| amount | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| created_at | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| customer_name | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| invoice_date | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| invoice_number | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| project_name | 代码引用 | `svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| received_amount | 代码引用 | `svc/erp/src/event_handlers/mod.rs:884`<br>`svc/erp/src/event_handlers/mod.rs:902`<br>`svc/erp/src/event_handlers/mod.rs:920` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| status | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662`<br>`svc/erp/src/event_handlers/mod.rs:884` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| tenant_id | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| updated_at | 代码引用 | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662`<br>`svc/erp/src/event_handlers/mod.rs:884` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_approval_nodes`（7）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| approval_type | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approver_role | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approver_users | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| conditions | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| is_active | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| notify_users | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| timeout_hours | 代码引用 | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_aux_balances`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| company_id | 代码引用 | `svc/finance/src/services/finance/voucher.rs:372`<br>`svc/finance/src/services/finance/periods.rs:753` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_ledger`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| company_id | 代码引用 | `svc/finance/tests/finance_service_tests.rs:341`<br>`svc/finance/src/services/finance/voucher.rs:350`<br>`svc/finance/src/services/finance/periods.rs:730` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_payment_workflow`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| workflow_instance_id | 代码引用 | `svc/finance/src/services/finance/payment_workflow.rs:101` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_voucher_lines`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| company_id | 代码引用 | `svc/finance/src/event_handlers/mod.rs:282`<br>`svc/finance/src/services/finance/voucher_generation.rs:472`<br>`svc/finance/src/services/finance/voucher.rs:102` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.core_finance_vouchers`（3）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| company_id | 代码引用 | `svc/finance/tests/finance_service_tests.rs:321`<br>`svc/finance/tests/finance_service_tests.rs:363`<br>`svc/finance/src/event_handlers/mod.rs:230` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| source_id | 代码引用 | `svc/finance/src/event_handlers/mod.rs:230` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| source_module | 代码引用 | `svc/finance/src/event_handlers/mod.rs:230`<br>`svc/finance/src/services/finance/periods.rs:684` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.finance_budget_variances_v53`（8）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| actual_amount | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| budget_amount | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| budget_item_id | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| classification | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| period | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| trend | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| variance_amount | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| variance_percentage | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:857` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.finance_cash_flow_predictions_v53`（8）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| confidence | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| entity_id | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| model_version | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| period | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| predicted_inflow | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| predicted_net | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| predicted_outflow | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| scenario | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.finance_prediction_models_v53`（6）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| accuracy | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| entity_id | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| is_active | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| model_type | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| parameters | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| trained_at | 代码引用 | `svc/finance/src/modules/forecast_v53.rs:622` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.finance_voucher_template_lines`（6）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| account_code | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| amount_formula | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| created_at | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/mod.rs:1979`<br>`svc/finance/src/services/finance/voucher_template.rs:233` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| description | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| direction | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| sort_order | 代码引用 | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/voucher_template_entries.rs:268` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.finance_voucher_templates|public.finance_voucher_templates`（4）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| default_credit_account | 代码引用 | `svc/finance/src/services/finance/voucher_template.rs:206`<br>`svc/finance/src/services/finance/voucher_template.rs:302` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| default_debit_account | 代码引用 | `svc/finance/src/services/finance/voucher_template.rs:206`<br>`svc/finance/src/services/finance/voucher_template.rs:302` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| is_default | 代码引用 | `svc/finance/src/services/finance/voucher_template.rs:206`<br>`svc/finance/src/services/finance/voucher_template.rs:302`<br>`svc/finance/src/services/finance/voucher_template.rs:423` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| voucher_type | 代码引用 | `svc/finance/src/services/finance/voucher_template.rs:206`<br>`svc/finance/src/services/finance/voucher_template.rs:302` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.financial_reports|public.financial_reports`（10）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| approval_comment | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1825` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approval_status | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156`<br>`svc/finance/src/modules/financial_reports.rs:1800`<br>`svc/finance/src/modules/financial_reports.rs:1825` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approved_at | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1825` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approved_by | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1825` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| company_id | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| currency_code | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| generated_at | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| generated_by | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| org_id | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1156` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| rejection_reason | 代码引用 | `svc/finance/src/modules/financial_reports.rs:1852` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `finance.reconciliation_item_snapshots`（2）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| match_status | 代码引用 | `svc/finance/src/modules/settlement_center/service.rs:205` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| updated_at | 代码引用 | `svc/finance/src/modules/settlement_center/service.rs:205` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `flow.core_file_permissions|public.core_file_permissions`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/unified-core/src/modules/file/manage.rs:986` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `flow.core_migration_history|iam.core_migration_history|public.core_migration_history`（5）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| checksum | 代码引用 | `tools/migration-sdk/src/history.rs:85`<br>`tools/migration-sdk/src/history.rs:120` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| execution_time_ms | 代码引用 | `tools/migration-sdk/src/history.rs:85` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| rolled_back_at | 代码引用 | `tools/migration-sdk/src/history.rs:150` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| script_name | 代码引用 | `tools/migration-sdk/src/history.rs:85`<br>`tools/migration-sdk/src/history.rs:120` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| status | 代码引用 | `tools/migration-sdk/src/history.rs:85`<br>`tools/migration-sdk/src/history.rs:120`<br>`tools/migration-sdk/src/history.rs:150` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `gis.geodata`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/gis/src/modules/geodata.rs:130` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `gis.geofeatures`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/gis/src/modules/geodata.rs:186` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `gis.map_layers`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/gis/src/modules/map.rs:391` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `gis.spatial_analysis`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/gis/src/modules/spatial.rs:95`<br>`svc/gis/src/modules/spatial.rs:192`<br>`svc/gis/src/modules/spatial.rs:285` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `hrm.companies`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| code | 代码引用 | `svc/unified-core/tests/p1_company_scopes_migration_tests.rs:263`<br>`svc/unified-core/src/modules/tenant/handlers.rs:356`<br>`svc/hrm/src/modules/setup.rs:321` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `integration.core_inter_module_sync`（4）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| max_retries | 代码引用 | `svc/integration/src/handlers/sync.rs:727` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| retry_count | 代码引用 | `svc/integration/src/handlers/sync.rs:727` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| source_entity | 代码引用 | `svc/integration/src/handlers/sync.rs:727` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| source_id | 代码引用 | `svc/integration/src/handlers/sync.rs:727` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `integration.crm_erp_sync`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| updated_at | 代码引用 | `svc/integration/src/crm_erp_sync.rs:200`<br>`svc/integration/src/crm_erp_sync.rs:253`<br>`svc/integration/src/crm_erp_sync.rs:283` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `integration.crm_scm_sync`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| updated_at | 代码引用 | `svc/integration/src/crm_scm_sync.rs:192`<br>`svc/integration/src/crm_scm_sync.rs:247`<br>`svc/integration/src/crm_scm_sync.rs:277` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `integration.erp_wms_sync`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| updated_at | 代码引用 | `svc/integration/src/erp_wms_sync.rs:193`<br>`svc/integration/src/erp_wms_sync.rs:248`<br>`svc/integration/src/erp_wms_sync.rs:278` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `integration.hrm_finance_sync`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| updated_at | 代码引用 | `svc/integration/src/hrm_finance_sync.rs:196`<br>`svc/integration/src/hrm_finance_sync.rs:245`<br>`svc/integration/src/hrm_finance_sync.rs:274` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `pdm.pdm_master_data_refs`（12）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| code | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| created_at | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| domain | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| last_synced_at | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| local_entity_type | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| master_data_id | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| name | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| payload_snapshot | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| source_service | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| status | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| tenant_id | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| updated_at | 代码引用 | `svc/pdm/src/event_handlers/mod.rs:255` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `portal.portal_todos`（5）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| completed | 代码引用 | `svc/portal/src/modules/graphql_mutation_impls.rs:148`<br>`svc/portal/src/modules/todos.rs:197` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| service_code | 代码引用 | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| service_name | 代码引用 | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| todo_type | 代码引用 | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| user_id | 代码引用 | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `public.audit_logs`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| origin | 代码引用 | `lib/shared-db/src/audit.rs:291` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `public.core_notification_templates`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| status | 代码引用 | `svc/communication/src/notification.rs:3935` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `scm.purchase_contract_items`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/scm/src/modules/purchase_contract.rs:176`<br>`svc/scm/src/modules/purchase_contract.rs:373` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `scm.supplier_admission_audit_items`（1）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| tenant_id | 代码引用 | `svc/scm/src/modules/supplier_admission.rs:683` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

### `wms.purchase_order_snapshots`（11）

| 列 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|
| approved_at | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| approved_by | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| created_at | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| order_number | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| payable_amount | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| status | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| supplier_id | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| supplier_name | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| synced_at | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| total_amount | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |
| updated_at | 代码引用 | `svc/wms/src/event_handlers/mod.rs:392` | 补列（ADD COLUMN，注意 NOT NULL/默认值），或修正代码列名 |

## 4. P0：列类型不兼容（0）

生产类型与代码绑定的 sqlx 类型类别不同，运行期解码失败。

无。

## 5. P0：`ON CONFLICT` 无匹配唯一约束（25）

Postgres 要求冲突目标与某个唯一索引/主键的列集合完全一致，否则直接报错。

### `ai.ai_training_samples`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| source_type,source_id | 无匹配唯一索引/主键 | ON CONFLICT (source_type, source_id) | `svc/ai/src/event_handlers/mod.rs:66` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `core.core_tenant_plugins`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,plugin_id | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, plugin_id) | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `crm.customer_tags`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| customer_id,tag | 无匹配唯一索引/主键 | ON CONFLICT (customer_id, tag) | `svc/crm/src/modules/customer_profile.rs:418` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `erp.materials`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| code | 无匹配唯一索引/主键 | ON CONFLICT (code) | `svc/erp/src/modules/material.rs:466` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `erp.payables`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| invoice_number | 无匹配唯一索引/主键 | ON CONFLICT (invoice_number) | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `erp.receivables`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| invoice_number | 无匹配唯一索引/主键 | ON CONFLICT (invoice_number) | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `finance.core_finance_aux_balances`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,company_id,account_id,aux_type,aux_id,period | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, company_id, account_id, aux_type, aux_id, period) | `svc/finance/src/services/finance/voucher.rs:372`<br>`svc/finance/src/services/finance/periods.rs:753` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `finance.core_finance_periods`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,year,month | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, year, month) | `svc/finance/src/modules/mod.rs:3915` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `finance.core_finance_vouchers`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,source_module,source_id | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, source_module, source_id) | `svc/finance/src/event_handlers/mod.rs:230` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `finance.finance_prediction_models_v53`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| model_type | 无匹配唯一索引/主键 | ON CONFLICT (model_type) | `svc/finance/src/modules/forecast_v53.rs:622` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `finance.financial_reports|public.financial_reports`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| report_type,org_id,period,currency_code | 无匹配唯一索引/主键 | ON CONFLICT (report_type, org_id, period, currency_code) | `svc/finance/src/modules/financial_reports.rs:1156` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `flow.core_migration_history|iam.core_migration_history|public.core_migration_history`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| plugin_name,version,script_name | 无匹配唯一索引/主键 | ON CONFLICT (plugin_name, version, script_name) | `tools/migration-sdk/src/history.rs:85`<br>`tools/migration-sdk/src/history.rs:120` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `mobile.mobile_push_notifications`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| source_type,source_id | 无匹配唯一索引/主键 | ON CONFLICT (source_type, source_id) | `svc/mobile/src/event_handlers/mod.rs:101` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `pdm.pdm_master_data_refs`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| master_data_id | 无匹配唯一索引/主键 | ON CONFLICT (master_data_id) | `svc/pdm/src/event_handlers/mod.rs:255` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `pdm.pdm_project_members`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,project_id,user_id | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, project_id, user_id) | `svc/pdm/src/modules/project.rs:735` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `pm.project_benefits`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| project_id,period_type,period_date | 无匹配唯一索引/主键 | ON CONFLICT (project_id, period_type, period_date) | `svc/pm/src/modules/project_benefit.rs:296` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `pm.project_members`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| project_id,user_id | 无匹配唯一索引/主键 | ON CONFLICT (project_id, user_id) | `svc/pm/src/modules/project_member.rs:121` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `public.automation_variables`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,key | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, key) | `svc/unified-core/src/modules/automation/mod.rs:1024` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `public.monitor_settings`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,key | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, key) | `svc/monitor/src/modules/monitor/settings.rs:161`<br>`svc/monitor/src/modules/monitor/settings.rs:275` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `public.system_settings`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| tenant_id,key | 无匹配唯一索引/主键 | ON CONFLICT (tenant_id, key) | `svc/erp/src/modules/settings.rs:249` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `qms.qa_corrective_actions`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| action_no | 无匹配唯一索引/主键 | ON CONFLICT (action_no) | `svc/qms/src/modules/integration.rs:65` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `scm.suppliers`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| supplier_no | 无匹配唯一索引/主键 | ON CONFLICT (supplier_no) | `svc/master-data/src/modules/supplier_sync.rs:173` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `scm.wms_inventory_snapshots`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| warehouse_id,item_code | 无匹配唯一索引/主键 | ON CONFLICT (warehouse_id, item_code) | `svc/scm/src/event_handlers/mod.rs:873` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `srm.supplier_performance`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| supplier_id,tenant_id | 无匹配唯一索引/主键 | ON CONFLICT (supplier_id, tenant_id) | `svc/srm/src/event_handlers/mod.rs:209` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

### `srm.suppliers`（1）

| 冲突列 | 生产实际 | 代码契约 | 代码引用 | 建议动作 |
|---|---|---|---|---|
| supplier_no | 无匹配唯一索引/主键 | ON CONFLICT (supplier_no) | `svc/master-data/src/modules/supplier_sync.rs:255` | 补唯一索引，或改用 ON CONFLICT ON CONSTRAINT / 调整冲突列 |

## 6. P1：可空性与权限

### 6.1 代码按非空解码、生产列可空（0）

`sqlx` 生成的 `nullable=false` 与生产 `information_schema.columns.is_nullable='YES'` 冲突；一旦返回 NULL 即解码失败。


### 6.2 新表 owner / 权限缺失风险（9 个迁移 / 16 张表）

生产服务身份是 `topems_prod`，迁移执行身份是 superuser；迁移若不写 `OWNER TO topems_prod` 也不授予服务角色，新表 owner 会落到执行账号，首次访问即 500（见 `docs/quality/prod-schema-drift-2026-11-09.md` §6）。

| 版本 | 迁移文件 | 建表数 | OWNER TO | 服务角色 GRANT |
|---|---|---|---|---|
| 20261107000019 | `20261107000019_drop_communication_email_templates.sql` | 1 | 否 | 否 |
| 20261107000027 | `20261107000027_drop_dead_tables_batch31.sql` | 5 | 否 | 否 |
| 20261107000029 | `20261107000029_create_mdm_supplier_master_batch32.sql` | 2 | 否 | 否 |
| 20261107000031 | `20261107000031_supplier_category_dict_and_backfill.sql` | 2 | 否 | 否 |
| 20261107000033 | `20261107000033_mdm_sync_dead_letter.sql` | 2 | 否 | 否 |
| 20261108130000 | `20261108130000_p1_company_master_and_scopes.sql` | 1 | 否 | 否 |
| 20261109110100 | `20261109110100_p3_report_line_map.sql` | 1 | 否 | 否 |
| 20261109110160 | `20261109110160_p3_report_line_map_forward.sql` | 1 | 否 | 否 |
| 20261109140100 | `20261109140100_p4_elimination_candidates.sql` | 1 | 否 | 否 |

建议：统一在迁移模板追加 `ALTER TABLE ... OWNER TO topems_prod`，并在 `check-migrations` 中加静态断言（见 §8）。

## 7. P2 / P3

### 7.1 快照盲区（4）

建表版本 ≤ 生产账本水位（`20261108141500`），基线快照未包含，不能判定为生产缺失。

| 对象 | 建表/声明 | 代码引用 | 处理 |
|---|---|---|---|
| `master_data.mdm_supplier_categories` | 快照中不存在；建表于 20261107000031（<= 生产账本水位，属快照盲区） | `svc/master-data/src/modules/supplier_sync.rs:81` | 下次基线刷新后复核 |
| `master_data.mdm_suppliers` | 快照中不存在；建表于 20261107000029（<= 生产账本水位，属快照盲区） | `svc/master-data/src/modules/supplier_master.rs:375` | 下次基线刷新后复核 |
| `master_data.mdm_sync_dead_letter` | 快照中不存在；建表于 20261107000033（<= 生产账本水位，属快照盲区） | `svc/master-data/src/modules/supplier_sync.rs:143` | 下次基线刷新后复核 |
| `public.core_user_company_scopes` | 快照中不存在；建表于 20261108130000（<= 生产账本水位，属快照盲区） | `svc/unified-core/tests/p1_company_scopes_migration_tests.rs:144` | 下次基线刷新后复核 |

### 7.2 仅测试代码引用（11）

| 对象 | 列 | 引用 |
|---|---|---|
| `iam.core_role_permissions|public.core_role_permissions` | tenant_id | `lib/shared-auth/tests/permission_backfill_e2e.rs:82` |
| `iam.core_user_roles|public.core_user_roles` | tenant_id | `lib/shared-auth/tests/permission_backfill_e2e.rs:65` |
| `mes.material_categories` | created_at | `svc/mes/tests/integration_tests.rs:1882` |
| `mes.material_categories` | description | `svc/mes/tests/integration_tests.rs:1882` |
| `mes.material_categories` | name | `svc/mes/tests/integration_tests.rs:1882` |
| `mes.material_categories` | sort_order | `svc/mes/tests/integration_tests.rs:1882` |
| `mes.material_categories` | tenant_id | `svc/mes/tests/integration_tests.rs:1882` |
| `wms.serial_numbers` | org_id | `svc/wms/tests/serial_number_e2e.rs:97` |
| `wms.sync_records` | org_id | `svc/wms/tests/sync_records_e2e.rs:80` |
| `events` | - | `lib/tests/rls.rs:117` |
| `products` | - | `lib/tests/rls.rs:48` |

### 7.3 其余 P2/P3 项（17）

| 级别 | 对象 | 列 | 生产实际 | 代码引用 | 建议动作 |
|---|---|---|---|---|---|
| P2 | mes.equipment | equipment_code | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:947`<br>`svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:1074` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment | equipment_name | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:937`<br>`svc/mes/src/modules/equipment.rs:1065` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment | status | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment_oee.rs:1124` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_inspections | equipment_id | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:1337`<br>`svc/mes/src/modules/equipment.rs:1206` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_inspections | inspection_date | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:1337`<br>`svc/mes/src/modules/equipment.rs:1206` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_inspections | inspector | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:1337`<br>`svc/mes/src/modules/equipment.rs:1206` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_maintenance_records | description | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:891`<br>`.sqlx/query-a2f37eb4e543c51ae2928ac3c8c4a726ba323c3a77d719faf21b710da329682e.json` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_maintenance_records | equipment_id | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:891`<br>`.sqlx/query-a2f37eb4e543c51ae2928ac3c8c4a726ba323c3a77d719faf21b710da329682e.json` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_maintenance_records | maintainer | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:891`<br>`.sqlx/query-a2f37eb4e543c51ae2928ac3c8c4a726ba323c3a77d719faf21b710da329682e.json` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.equipment_maintenance_records | status | 跨 schema 可空性不一致 | `svc/mes/src/modules/equipment.rs:786`<br>`svc/mes/src/modules/equipment.rs:891`<br>`.sqlx/query-a2f37eb4e543c51ae2928ac3c8c4a726ba323c3a77d719faf21b710da329682e.json` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.process_flow_steps | sequence | 跨 schema 可空性不一致 | `svc/mes/src/modules/process_flow.rs:791`<br>`svc/mes/src/modules/process_flow.rs:1217`<br>`svc/mes/src/modules/process_flow.rs:688` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.process_flows | code | 跨 schema 可空性不一致 | `.sqlx/query-04bc3df4b6c18aeeb276c3027716cdec3d4197331431dcff03bde09a2cbe7348.json`<br>`svc/mes/src/modules/process_flow.rs:461`<br>`svc/mes/src/modules/process_flow.rs:395` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | mes.process_flows | name | 跨 schema 可空性不一致 | `.sqlx/query-04bc3df4b6c18aeeb276c3027716cdec3d4197331431dcff03bde09a2cbe7348.json`<br>`svc/mes/src/modules/process_flow.rs:461`<br>`svc/mes/src/modules/process_flow.rs:1196` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | wms.inventory | material_code | 跨 schema 可空性不一致 | `svc/wms/src/modules/inventory_alert.rs:571`<br>`svc/wms/src/modules/inventory_alert.rs:317`<br>`svc/wms/src/modules/inventory_alert.rs:738` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P2 | wms.inventory | warehouse_id | 跨 schema 可空性不一致 | `svc/wms/src/modules/inventory_alert.rs:537`<br>`svc/wms/src/modules/inventory_alert.rs:317`<br>`svc/wms/src/modules/inventory_alert.rs:738` | 确认目标 schema；若落在可空版本，需补 NOT NULL 或改 Option<T> |
| P3 | events |  | 表不存在（任何 schema） | `lib/tests/rls.rs:117` | 仅测试代码引用：确认测试库具备该对象，不影响生产 |
| P3 | products |  | 表不存在（任何 schema） | `lib/tests/rls.rs:48` | 仅测试代码引用：确认测试库具备该对象，不影响生产 |

### 7.4 生产存在但代码未引用的列（P3，801 个被引用的表命中）

只统计「代码已引用的表」中的未引用列，避免 1349 张表全量噪声。这些列不代表错误，仅提示遗留/待清理。

| 表 | 未引用列数 |
|---|---|
| `wms.outbound_orders` | 49 |
| `mes.equipment` | 46 |
| `public.core_finance_vouchers` | 45 |
| `wms.inbound_orders` | 41 |
| `iam.core_plugins` | 33 |
| `mes.production_orders` | 33 |
| `mes.production_records` | 33 |
| `wms.inventory` | 31 |
| `erp.consolidation_reports` | 29 |
| `public.core_finance_accounts` | 29 |
| `wms.warehouses` | 27 |
| `wms.inventory_alert_records` | 25 |
| `plugin_finance.reconciliation_snapshots` | 22 |
| `public.conversion_rules` | 22 |
| `wms.locations` | 22 |
| `wms.stock_takes` | 22 |
| `mes.work_stations` | 21 |
| `public.core_ticket_sla_policies` | 21 |
| `bi.audit_logs` | 20 |
| `communication.core_geofences` | 20 |
| `finance.core_finance_accounts` | 20 |
| `mes.equipment_inspection_records` | 20 |
| `pm.documents` | 20 |
| `scm.supplier_products` | 20 |
| `mes.equipment_maintenance_records` | 19 |

## 8. CI 门禁可行性（离线，不连生产）

**可行，但只能覆盖「编译期契约」这一半。** 关键是把生产 schema 固化成随基线更新的快照文件。

| 方案 | 做法 | 覆盖 | 代价 |
|---|---|---|---|
| G1 `.sqlx` 新鲜度 | CI 跑 `cargo sqlx prepare --check`，阻止改了 SQL 没更新缓存 | 防「缓存与代码不一致」 | 低；需 nightly 缓存与工作区一致 |
| G2 契约 vs 快照（列/类型/可空） | 提交 `prod_schema_snapshot.json`（schema→表→列/类型/可空/唯一键），用 `.sqlx` 的 `origin` + 类型做断言 | 高置信；本次 P0/P1 的 90% 来自这一层 | 中；快照 ~1–2 MB，校验 <5 s |
| G3 结构化 DML 列检查 | 正则抽取 `INSERT INTO (列)`、`UPDATE ... SET`、`ON CONFLICT (列)`，与快照比对 | 中；覆盖写路径 | 中；需维护少量豁免（动态表名） |
| G4 基线新鲜度 | 每次生产窗口关闭后重生成快照并提交；`check-baseline-integrity` 校验快照锚点单调 | 防快照腐化 | 低；与现有基线流程合并 |

不建议做成门禁的部分：`SELECT *`、字符串拼接表名、跨 schema 同名表的自动归属——误报率高，应留在人工盘点。

落地顺序：G1 → G2 →（观察 2 周误报）→ G3。G2 的豁免沿用 `database/migration_manifest.yaml` 的「reason/owner/expiry」格式，避免又出现裸白名单。

**最大风险**：快照若滞后于生产，门禁会「绿着放行」新的漂移——本次 `financial_reports` 就是代码先行、迁移未应用。因此 G2 必须与「生产账本水位」绑定：快照锚点落后账本水位超过一个窗口即失败。

## 9. 复现

```bash
# 契约抽取 + 快照比对（只读，产物在 /tmp）
python3 /tmp/col_drift.py
# 报告生成
python3 /tmp/gen_report.py
```

> 分析脚本未入库；如需固化为门禁，按 §8 G2 落成 `scripts/ci/check-column-contract.mjs`。
