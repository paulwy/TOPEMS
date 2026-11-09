# 列级漂移修复工单（可执行版）

| 项 | 内容 |
|---|---|
| 依据 | `docs/quality/prod-column-drift-verified-2026-11-09.md`（141 条真阳性 P0） |
| 生产基线 | `docs/quality/prod_schema_live_20261109.json`，账本水位 `20261109140200` |
| 性质 | **只读分析**：只出工单，不生成迁移、不改代码、不连库执行 |
| 列类型来源 | ① `.sqlx` 参数类型 ② 同 schema 同名列实测类型 ③ 命名推断（需 DDL 复核）。实测：① 0 列（缺列写入点是裸 `sqlx::query`，未进离线缓存）、② 67 列、③ 42 列 |

## 0. 执行顺序（四批，不可合并）

1. **B1 表级**：`_v52` 五表重命名+补列、`cqrs_snapshots` 建表、`bi.org_stats` 建物化视图、`core.core_tenant_plugins` 改代码。
2. **B2 补列**：按服务分迁移，只做 `ADD COLUMN`（A 类带默认值，B 类先可空）。
3. **B3 索引**：24 处 `ON CONFLICT` 唯一索引 + 业务键唯一索引；大表用 `CREATE UNIQUE INDEX CONCURRENTLY`。
4. **B4 收紧**：B 类列回填后 `SET NOT NULL`，单独一批，可回滚。

> 依据：先让读写不报错（B2），再保证 `ON CONFLICT` 可用（B3），最后收紧约束（B4）。NOT NULL 放在最后，避免与存量空值打架。

## 1. 不是补列能解决的（结论已定）

### 1.1 `core.core_tenant_plugins` → 改代码指向 `iam`

- 生产：`core.core_tenant_plugins` 只有 `id, deleted_at`；**`iam.core_tenant_plugins` 有 14 列，代码要的 5 列全部命中**（`tenant_id, plugin_id, is_active, license_type, activated_at`）。
- 代码：`svc/plugin-registry/.../simple_api.rs:204/322/587`、`tenant_plugins.rs:295/704`，未使用 `only_own_schema_query!`（该宏只校验不改写），因此跨 schema 不会被宏拦。
- **结论：改代码 `core.` → `iam.`**，不动数据库。理由：插件归属身份域，`iam` 已是完整主表；在 `core` 复制一份会造成双写双源，后续权限/租户过滤会分裂。
- 若 boundary 评审要求单服务单 schema：改为 `core` 侧建 `SECURITY INVOKER` 视图映射 `iam.core_tenant_plugins`，仅作过渡，不作为长期结构。

### 1.2 `finance_*_v52` 五表 → 重命名现有 `_v` 壳表并补列

- 生产：`finance_alert_configs_v`、`finance_alert_history_v`、`finance_anomaly_alerts_v`、`finance_audit_findings_v`、`finance_detection_configs_v` **全部只有 `id, deleted_at`**，由 `20260725000000_business_base_tables.sql:3107` 批量骨架生成。
- 代码：`svc/finance/src/modules/audit_v52.rs` 全程按 `_v52` 读写，列契约完整。
- **结论：`ALTER TABLE finance.<name>_v RENAME TO <name>_v52` + 补列**，不新建第五套表；`_v` 壳表无数据、无其他引用。理由：改代码回退到 `_v` 等于重做整个 v5.2 审计模块；新建 `_v52` 会与 `_v` 并存，长期混淆。
- 重命名前只读确认：`_v` 表 0 行（骨架表，风险极低），并检查无外部视图/物化视图依赖。

### 1.3 `cqrs_snapshots` → 建 `finance.cqrs_snapshots`

- 代码：`svc/finance/src/domain/pg_event_store.rs:148/297`，SQL 未加 schema 前缀，服务 `search_path` 为 `finance`；`only_own_schema_query!("finance", ...)` 只校验不改写。
- 期望列（从 SQL 反推）：`aggregate_id text`、`aggregate_type text`、`state jsonb`、`version bigint`、`created_at timestamptz`；**唯一键 `(aggregate_id, aggregate_type)`**（代码用 `ON CONFLICT` upsert）。
- **结论：建表**（事件溯源快照存储），不属任何现有表的分支。理由：`get_snapshot_count` / `get_latest_snapshot` / upsert 都是生产路径，缺表即 500。

### 1.4 `bi.org_stats` → 建物化视图

- 代码：`svc/analytics/src/routes.rs:930` 与 `main.rs:316` 读 `companies, departments, employees, refreshed_at`；`:926` / `:1058` / `main.rs:311` 的注释都声明它由「物化视图」提供。
- 现状：任何 schema 都没有该对象；代码有 `unwrap_or(0)` 降级，**缺视图不会报错，但会静默返回 0**——这正是 P2 语义错误的典型，不能当无害。
- **结论：建 `bi.org_stats` 物化视图 + 刷新任务**（按 `refreshed_at` 排序取最新）。若 org 报表模块确认未上线，则删代码，不要留半套。

## 2. 补列工单（按服务分组）

列格式：`列名` / 类型（来源）/ 可空性决策 / 默认值 / 理由。A 类=可立即 NOT NULL+默认；B 类=必须先可空。

### M0 仅需补唯一索引（不涉及补列）

| 表 | UNIQUE | 条数 | 代码写入点 |
|---|---|---|---|
| `ai.ai_training_samples` | `UNIQUE (source_type,source_id)` | 1 | `svc/ai/src/event_handlers/mod.rs:66` |
| `crm.customer_tags` | `UNIQUE (customer_id,tag)` | 1 | `svc/crm/src/modules/customer_profile.rs:418` |
| `erp.materials` | `UNIQUE (code)` | 1 | `svc/erp/src/modules/material.rs:466` |
| `finance.core_finance_periods` | `UNIQUE (tenant_id,year,month)` | 1 | `svc/finance/src/modules/mod.rs:3915` |
| `finance.core_finance_vouchers` | `UNIQUE (tenant_id,source_module,source_id)` | 1 | `svc/finance/src/event_handlers/mod.rs:230` |
| `flow.core_flow_variables` | `UNIQUE (scope,instance_id,task_id,workflow_id,var_key)` | 1 | `svc/unified-core/src/modules/flow/variable.rs:158` |
| `flow.core_migration_history` | `UNIQUE (plugin_name,version,script_name)` | 1 | `tools/migration-sdk/src/history.rs:85` |
| `mobile.mobile_push_notifications` | `UNIQUE (source_type,source_id)` | 1 | `svc/mobile/src/event_handlers/mod.rs:101` |
| `pdm.pdm_project_members` | `UNIQUE (tenant_id,project_id,user_id)` | 1 | `svc/pdm/src/modules/project.rs:735` |
| `pm.project_benefits` | `UNIQUE (project_id,period_type,period_date)` | 1 | `svc/pm/src/modules/project_benefit.rs:296` |
| `pm.project_members` | `UNIQUE (project_id,user_id)` | 1 | `svc/pm/src/modules/project_member.rs:121` |
| `public.automation_variables` | `UNIQUE (tenant_id,key)` | 1 | `svc/unified-core/src/modules/automation/mod.rs:1024` |
| `public.monitor_settings` | `UNIQUE (tenant_id,key)` | 1 | `svc/monitor/src/modules/monitor/settings.rs:161` |
| `public.system_settings` | `UNIQUE (tenant_id,key)` | 1 | `svc/erp/src/modules/settings.rs:249` |
| `qms.qa_corrective_actions` | `UNIQUE (action_no)` | 1 | `svc/qms/src/modules/integration.rs:65` |
| `scm.suppliers` | `UNIQUE (supplier_no)` | 1 | `svc/master-data/src/modules/supplier_sync.rs:173` |
| `scm.wms_inventory_snapshots` | `UNIQUE (warehouse_id,item_code)` | 1 | `svc/scm/src/event_handlers/mod.rs:873` |
| `srm.supplier_performance` | `UNIQUE (supplier_id,tenant_id)` | 1 | `svc/srm/src/event_handlers/mod.rs:209` |
| `srm.suppliers` | `UNIQUE (supplier_no)` | 1 | `svc/master-data/src/modules/supplier_sync.rs:255` |

### M1 `svc/finance`（7 表 / 38 列）

#### `finance.finance_budget_variances_v53`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `actual_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:857` |
| `budget_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:857` |
| `budget_item_id` | uuid（命名推断） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:857` |
| `classification` | varchar(64)（命名推断） | 先可空→回填→NOT NULL（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:857` |
| `period` | varchar（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:857` |
| `trend` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:857` |
| `variance_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:857` |
| `variance_percentage` | numeric(9,4)（命名推断） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:857` |

#### `finance.finance_cash_flow_predictions_v53`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `confidence` | float8（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:268` |
| `entity_id` | varchar（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:268` |
| `model_version` | varchar(64)（命名推断） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:268` |
| `period` | varchar（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:268` |
| `predicted_inflow` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:268` |
| `predicted_net` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:268` |
| `predicted_outflow` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/forecast_v53.rs:268` |
| `scenario` | varchar(64)（命名推断） | 先可空→回填→NOT NULL（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:268` |

#### `finance.core_finance_approval_nodes`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `approval_type` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `approver_role` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `approver_users` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `conditions` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `is_active` | bool（同名列） | NOT NULL（A 类） | false | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `notify_users` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |
| `timeout_hours` | text（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/approval_configs.rs:102` |

#### `finance.finance_prediction_models_v53`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `accuracy` | float8（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:622` |
| `entity_id` | varchar（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:622` |
| `is_active` | bool（同名列） | NOT NULL（A 类） | false | `svc/finance/src/modules/forecast_v53.rs:622` |
| `model_type` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:622` |
| `parameters` | jsonb（同名列） | NOT NULL（A 类） | '{}'::jsonb | `svc/finance/src/modules/forecast_v53.rs:622` |
| `trained_at` | timestamptz（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/forecast_v53.rs:622` |

- **唯一索引**：`UNIQUE (model_type)`（`ON CONFLICT` 需要）

#### `finance.finance_voucher_template_lines`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `account_code` | varchar（同名列） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/voucher_template_entries.rs:137` |
| `amount_formula` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/voucher_template_entries.rs:137` |
| `created_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/finance/src/modules/voucher_template_entries.rs:137` |
| `description` | text（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/voucher_template_entries.rs:137` |
| `direction` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/finance/src/modules/voucher_template_entries.rs:137` |
| `sort_order` | integer（命名推断） | NOT NULL（A 类） | 0 | `svc/finance/src/modules/voucher_template_entries.rs:137` |

#### `finance.reconciliation_item_snapshots`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `match_status` | match_status（同名列） | 留可空（B 类） | - | `svc/finance/src/modules/settlement_center/service.rs:205` |
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/finance/src/modules/settlement_center/service.rs:205` |

#### `finance.core_finance_payment_workflow`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `workflow_instance_id` | uuid（命名推断） | 留可空（B 类） | - | `svc/finance/src/services/finance/payment_workflow.rs:101` |

### M2 `svc/erp`（4 表 / 22 列）

#### `erp.payables`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `amount` | numeric（同名列） | NOT NULL（A 类） | 0 | `svc/erp/src/event_handlers/mod.rs:435` |
| `category` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:580` |
| `created_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/erp/src/event_handlers/mod.rs:435` |
| `invoice_date` | date（命名推断） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:435` |
| `invoice_number` | varchar(64)（命名推断） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:435` |
| `paid_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/erp/src/event_handlers/mod.rs:1006` |
| `status` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:435` |
| `supplier_name` | varchar（同名列） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:435` |
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:435` |
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/erp/src/event_handlers/mod.rs:435` |

- **唯一索引**：`UNIQUE (invoice_number)`（`ON CONFLICT` 需要）
- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `erp.receivables`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `amount` | numeric（同名列） | NOT NULL（A 类） | 0 | `svc/erp/src/event_handlers/mod.rs:356` |
| `created_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/erp/src/event_handlers/mod.rs:356` |
| `customer_name` | varchar（同名列） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:356` |
| `invoice_date` | date（命名推断） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:356` |
| `invoice_number` | varchar(64)（命名推断） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:356` |
| `project_name` | text（命名推断） | 留可空（B 类） | - | `svc/erp/src/event_handlers/mod.rs:662` |
| `received_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/erp/src/event_handlers/mod.rs:884` |
| `status` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:356` |
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:356` |
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/erp/src/event_handlers/mod.rs:356` |

- **唯一索引**：`UNIQUE (invoice_number)`（`ON CONFLICT` 需要）
- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `erp.erp_production_orders`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/modules/production_order.rs:176` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `erp.event_idempotency`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/erp/src/event_handlers/mod.rs:1394` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

### M3 `svc/pdm`（1 表 / 12 列）

#### `pdm.pdm_master_data_refs`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `code` | text（命名推断） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `created_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/pdm/src/event_handlers/mod.rs:255` |
| `domain` | varchar(64)（命名推断） | 先可空→回填→NOT NULL（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `last_synced_at` | timestamptz（命名推断） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `local_entity_type` | text（命名推断） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `master_data_id` | uuid（命名推断） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `name` | varchar（同名列） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `payload_snapshot` | jsonb（命名推断） | NOT NULL（A 类） | '{}'::jsonb | `svc/pdm/src/event_handlers/mod.rs:255` |
| `source_service` | text（命名推断） | 留可空（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `status` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/pdm/src/event_handlers/mod.rs:255` |
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/pdm/src/event_handlers/mod.rs:255` |

- **唯一索引**：`UNIQUE (master_data_id)`（`ON CONFLICT` 需要）
- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

### M4 `svc/wms`（1 表 / 11 列）

#### `wms.purchase_order_snapshots`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `approved_at` | timestamptz（同名列） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `approved_by` | uuid（同名列） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `created_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/wms/src/event_handlers/mod.rs:392` |
| `order_number` | varchar（同名列） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `payable_amount` | numeric(18,2)（命名推断） | NOT NULL（A 类） | 0 | `svc/wms/src/event_handlers/mod.rs:392` |
| `status` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `supplier_id` | uuid（同名列） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `supplier_name` | varchar（同名列） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `synced_at` | timestamptz（命名推断） | 留可空（B 类） | - | `svc/wms/src/event_handlers/mod.rs:392` |
| `total_amount` | numeric（同名列） | NOT NULL（A 类） | 0 | `svc/wms/src/event_handlers/mod.rs:392` |
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/wms/src/event_handlers/mod.rs:392` |

### M5 `svc/integration`（5 表 / 8 列）

#### `integration.core_inter_module_sync`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `max_retries` | int4（同名列） | NOT NULL（A 类） | 0 | `svc/integration/src/handlers/sync.rs:727` |
| `retry_count` | int4（同名列） | NOT NULL（A 类） | 0 | `svc/integration/src/handlers/sync.rs:727` |
| `source_entity` | varchar（同名列） | 留可空（B 类） | - | `svc/integration/src/handlers/sync.rs:727` |
| `source_id` | uuid（同名列） | 留可空（B 类） | - | `svc/integration/src/handlers/sync.rs:727` |

#### `integration.crm_erp_sync`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/integration/src/crm_erp_sync.rs:200` |

#### `integration.crm_scm_sync`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/integration/src/crm_scm_sync.rs:192` |

#### `integration.erp_wms_sync`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/integration/src/erp_wms_sync.rs:193` |

#### `integration.hrm_finance_sync`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `updated_at` | timestamptz（同名列） | NOT NULL（A 类） | now() | `svc/integration/src/hrm_finance_sync.rs:196` |

### M6 `svc/plugin-registry`（1 表 / 5 列）

#### `core.core_tenant_plugins`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `activated_at` | timestamptz（同名列） | 留可空（B 类） | - | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587` |
| `is_active` | bool（同名列） | NOT NULL（A 类） | false | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204` |
| `license_type` | varchar(64)（命名推断） | 先可空→回填→NOT NULL（B 类） | - | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204` |
| `plugin_id` | uuid（同名列） | 留可空（B 类） | - | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204` |
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204` |

- **唯一索引**：`UNIQUE (tenant_id,plugin_id)`（`ON CONFLICT` 需要）
- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

### M7 `svc/portal`（1 表 / 5 列）

#### `portal.portal_todos`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `completed` | boolean（命名推断） | NOT NULL（A 类） | false | `svc/portal/src/modules/graphql_mutation_impls.rs:148` |
| `service_code` | varchar(64)（命名推断） | 留可空（B 类） | - | `svc/portal/src/modules/graphql_mutation_impls.rs:104` |
| `service_name` | varchar（同名列） | 留可空（B 类） | - | `svc/portal/src/modules/graphql_mutation_impls.rs:104` |
| `todo_type` | varchar(64)（命名推断） | 先可空→回填→NOT NULL（B 类） | - | `svc/portal/src/modules/graphql_mutation_impls.rs:104` |
| `user_id` | varchar（同名列） | 留可空（B 类） | - | `svc/portal/src/modules/graphql_mutation_impls.rs:104` |

### M8 `svc/gis`（4 表 / 4 列）

#### `gis.geodata`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/gis/src/modules/geodata.rs:130` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `gis.geofeatures`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/gis/src/modules/geodata.rs:186` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `gis.map_layers`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/gis/src/modules/map.rs:391` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `gis.spatial_analysis`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/gis/src/modules/spatial.rs:95` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

### M9 `svc/scm`（2 表 / 2 列）

#### `scm.purchase_contract_items`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/scm/src/modules/purchase_contract.rs:176` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

#### `scm.supplier_admission_audit_items`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `tenant_id` | uuid（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/scm/src/modules/supplier_admission.rs:683` |

- **租户列**：先可空，按业务归属回填；若为单租户库可直接 `DEFAULT '<tenant_uuid>'` 一次到位

### M10 `lib/shared-db`（1 表 / 1 列）

#### `public.audit_logs`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `origin` | text（命名推断） | 留可空（B 类） | - | `lib/shared-db/src/audit.rs:291` |

### M11 `svc/communication`（1 表 / 1 列）

#### `public.core_notification_templates`

| 列 | 类型（来源） | 可空性 | 默认值 | 代码写入点 |
|---|---|---|---|---|
| `status` | varchar（同名列） | 先可空→回填→NOT NULL（B 类） | - | `svc/communication/src/notification.rs:3935` |

## 3. NOT NULL 决策规则（为什么这么分）

| 类别 | 判定 | 处理 | 依据 |
|---|---|---|---|
| A 类 | 有与业务无关的安全默认值（时间、布尔、计数、金额、jsonb） | `ADD COLUMN ... NOT NULL DEFAULT x` | 存量行自动获得正确初值，不阻塞写入，可与其他列同批 |
| B 类 | 无安全默认值（`tenant_id`、`*_id`、枚举、业务键、事件时间、比率） | 先 `ADD COLUMN` 可空 → 回填 → 下一批 `SET NOT NULL` | 存量可能为空；给错误默认值会污染数据（如状态全成 `active`、租户全成默认租户） |

本工单中：A 类 **37** 列，B 类 **72** 列。

## 4. 上线前后只读验收

```sql
-- 1) 列是否补齐（期望 0 行）
SELECT c.schema_name, c.table_name, c.column_name
FROM (VALUES ('erp','payables','amount'), ...) AS c(schema_name, table_name, column_name)
LEFT JOIN information_schema.columns i
  ON i.table_schema = c.schema_name AND i.table_name = c.table_name AND i.column_name = c.column_name
WHERE i.column_name IS NULL;

-- 2) 唯一索引是否就位（ON CONFLICT 目标）
SELECT i.indrelid::regclass, pg_get_indexdef(i.indexrelid)
FROM pg_index i WHERE i.indisunique
  AND i.indrelid::regclass::text IN ('ai.ai_training_samples', ...);

-- 3) B 类列回填完成度（收紧 NOT NULL 前必须为 0）
SELECT count(*) FILTER (WHERE tenant_id IS NULL) AS null_tenant FROM erp.payables;
```

## 5. 风险与约束

- **锁表**：`ADD COLUMN` 带默认值在 PG 11+ 为元数据操作，但仍取 `ACCESS EXCLUSIVE`；大表建议低峰执行，或先 `ADD COLUMN` 无默认、再 `ALTER COLUMN SET DEFAULT`。
- **索引**：24 处唯一索引必须用 `CONCURRENTLY`，否则会阻塞写入；若存量有重复，先出重复清单再决定去重口径。
- **回滚**：B2/B3 可独立回滚；B4 收紧 NOT NULL 单独提交，回滚只需 `DROP NOT NULL`。
- **不做的事**：不删除 `_v` 壳表、不删未引用列、不动权限（属另一路在途）。

> 生成脚本只读，未入库；工单未提交。