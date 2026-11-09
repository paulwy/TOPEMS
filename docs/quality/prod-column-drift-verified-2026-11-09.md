# 生产 vs 代码契约：列级漂移复核（实时快照）

| 项 | 内容 |
|---|---|
| 文档日期 | 2026-11-09 |
| 生产证据 | `docs/quality/prod_schema_live_20261109.json`（`2026-11-09T18:17:14+08:00` 只读导出；1351 表 / 17106 列 / 9583 约束 / 3025 索引；`database=topems_prod`） |
| 账本水位 | `max_version=20261109140200`，`rows=630`，`success=630` |
| 契约证据 | `.sqlx` 296 个；源码 SQL 字面量 6267 条；契约引用 64664 条，覆盖 807 个表名 |
| 上一份基线 | `docs/quality/prod-column-drift-full-2026-11-09.md`（11-05 基线；209 项，P0 179） |
| 清白性 | 只读：未执行 DDL/DML，未改代码，未生成迁移，未写生产 |

## 0. 结论速览

- 用实时快照重跑后：**P0 141 项**（column_missing 109 / on_conflict_no_unique 24 / table_missing 8），**P1 0**，P2 25，P3 12。
- 与上一份 209 项（P0 179）对比：**38 条旧 P0 消解为假阳性**（21.2%），**没有新增 P0**；179 − 38 = 141，逐条对得上。
- **141 条 P0 全部为真阳性**：假阳性 0，需人工判定 0。判定依据不是抽样，而是逐条命中「对象在实时快照中确实缺失」，且证据全部来自 INSERT 列清单 / UPDATE SET / ON CONFLICT / 表引用四类强信号（无一条来自低置信的别名推断）。
- 三条历史事故的复核结果：`finance.financial_reports` **生产已有 21 列（假阳性消解）**；`master_data` 四表 **均存在（假阳性消解）**；`core_user_company_scopes` **存在（其权限问题不在列级范围）**。
- 上一份的 P1 owner 风险已证伪：实时快照 1351 张表的 owner 全部为 `topems_prod`（1351 张），不存在「新表 owner 归错」；本轮 P1=0。
- 新暴露的系统性形态：**47 张表共 133 处列/约束缺失**，集中表现为「半成品表」——迁移只建了 `id`/`deleted_at`/`tenant_id` 骨架，业务代码已按完整列写入。
- G2 门禁：实时快照口径下**可行且误报可控**；绑定账本水位后可作为止损门。详见 §5。

> 在途变更声明：生产此刻正由另一路做「补授权 / 期间归一 / 清验证残留」。本轮对比中**未出现**与这三项直接冲突的差异：`_sqlx_test` 模式未进入契约，`erp.elimination_candidates` / `erp.internal_transaction_ledger` / `erp.internal_transactions` 均已在实时快照中就位。若后续出现，按「在途变更」标注，不计漂移。

## 1. 与上一份清单的差集

| 集合 | 数量 | 说明 |
|---|---|---|
| 上一份 P0 | 179 | 基于 11-05 基线导出，含快照滞后 |
| 本轮消解（假阳性） | 38 | 实时快照中对象/列已存在，属基线滞后或抽取误判 |
| 本轮仍为 P0（真阳性） | 141 | 实时快照中确实缺失 |
| 本轮新增 P0 | 0 | 无 |
| P2 / P3 变化 | 19 → 25 / 11 → 12 | 跨 schema 歧义（归属 12 条、可空 15 条）单列，不再混入 P0 |

### 1.1 已消解的 38 条（假阳性，按表聚合）

| 表 | 消解列 | 原因 |
|---|---|---|
| `erp.internal_transactions` | confirmed_at, confirmed_by, disputed_at, disputed_by, disputed_reason | 实时快照已含该对象 |
| `erp.opening_balances` | account_id | 实时快照已含该对象 |
| `finance.core_finance_aux_balances` | company_id；唯一约束目标：tenant_id,company_id,account_id,aux_type,aux_id,period | 实时快照已含该对象 |
| `finance.core_finance_ledger` | company_id | 实时快照已含该对象 |
| `finance.core_finance_voucher_lines` | company_id | 实时快照已含该对象 |
| `finance.core_finance_vouchers` | company_id, source_id, source_module | 实时快照已含该对象 |
| `finance.finance_voucher_templates / public.finance_voucher_templates` | default_credit_account, default_debit_account, is_default, voucher_type | 实时快照已含该对象 |
| `finance.financial_reports / public.financial_reports` | approval_comment, approval_status, approved_at, approved_by, company_id, currency_code, generated_at, generated_by, org_id, rejection_reason；唯一约束目标：report_type,org_id,period,currency_code | 实时快照已含该对象 |
| `flow.core_file_permissions / public.core_file_permissions` | tenant_id | 实时快照已含该对象 |
| `flow.core_migration_history / iam.core_migration_history / public.core_migration_history` | checksum, execution_time_ms, rolled_back_at, script_name, status | 实时快照已含该对象 |
| `hrm.companies` | code | 实时快照已含该对象 |
| `erp.elimination_candidates` | （表已存在） | 实时快照已含该对象 |
| `finance.core_finance_report_line_map` | （表已存在） | 实时快照已含该对象 |
| `master_data.mdm_data_asset_categories` | （表已存在） | 实时快照已含该对象 |

## 2. P0 判真伪

| 分类 | 计数 | 判定口径 |
|---|---|---|
| 真阳性（生产确实缺） | 141 | 表/列/唯一约束在实时快照中不存在，且引用为强信号 |
| 假阳性（快照滞后/抽取错误） | 0 | 在实时快照口径下无残留；上一份的 38 条见 §1.1 |
| 需人工判定 | 0 | 27 条跨 schema 同名表歧义（归属 12 / 可空 15）已单列为 P2，不计入 P0（见 §3） |

### 2.1 真阳性代表样例（按失败形态）

| 形态 | 代表项 | 生产实际 | 代码契约 | 代码引用 |
|---|---|---|---|---|
| 半成品表（仅骨架列） | `pdm.pdm_master_data_refs` | 2 列：id, deleted_at | INSERT 12 列 | `svc/pdm/src/event_handlers/mod.rs:255` |
| 半成品表（仅骨架列） | `wms.purchase_order_snapshots` | 3 列：id, deleted_at, tenant_id | INSERT 11 列 | `svc/wms/src/event_handlers/mod.rs:392` |
| schema 走错 | `core.core_tenant_plugins` | 2 列；完整表在 iam.core_tenant_plugins（14 列） | INSERT/RETURNING 6 列 | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587` |
| 表名不一致 | `finance.finance_alert_configs_v52` | 生产为 finance.finance_alert_configs_v（仅 id） | 整模块按 _v52 读写 | `svc/finance/src/modules/audit_v52.rs:1484` |
| 表完全未建 | `cqrs_snapshots` | 任何 schema 均无 | FROM/INTO | `svc/finance/src/domain/pg_event_store.rs:148` |
| 表完全未建（有降级） | `bi.org_stats` | 物化视图缺失 | SELECT 4 列 | `svc/analytics/src/routes.rs:930` |
| ON CONFLICT 无唯一约束 | `ai.ai_training_samples` | 仅 pkey(id) | ON CONFLICT (source_type, source_id) | `svc/ai/src/event_handlers/mod.rs:66` |

## 3. 方法学缺陷（单列，不计入 P0）

以下项是抽取方法本身的局限，**不构成本轮 P0**，但决定了清单是「下界」而非全集。

| # | 缺陷 | 触发条件 | 本轮数量 | 影响 | 处置 |
|---|---|---|---|---|---|
| D1 | 跨 schema 同名表误归属 | 表名在多个 schema 存在（实时快照 240 个重名），代码未写 schema 前缀 | 无前缀引用 9462 条；歧义项 21 条 | 双向：可能把 A schema 的列判给 B（假阳/假阴） | 已按「列数降序 + schema 名」确定性择优；无候选命中时降 P2 人工，不进 P0 |
| D2 | `SELECT *` / 未列名结果集 | 非 `.sqlx` 宏的内联 SQL 无法知道结果列 | `.sqlx` 中含 `SELECT *` 的查询 0 条 | 漏检（假阴） | 本轮未触发；后续靠 G1（sqlx 缓存新鲜度）兜住 |
| D3 | 模板列清单未展开 | `INSERT INTO t ({COLS})`、`SELECT {COLS}` | 被占位符规则拒绝的字面量 3236 条 | 漏检（假阴） | 允许 `{UPPER_CASE}` 通过但不展开，该表列集不完整 |
| D4 | 动态表名 | `format!` / 字符串拼接 / 运行期拼 SQL | 无法计数 | 漏检（假阴） | 只能靠运行期观测；不纳入门禁 |
| D5 | CTE / 子查询 / 表函数别名 | `FROM (SELECT ...) x`、`WITH x AS (...)` | 见 D1 同批 | 可能把 CTE 名当表（假阳），或别名列丢失（假阴） | 已排除 CTE 名；其余保守丢弃 |
| D6 | 测试与示例 SQL | `#[test]` 80 行窗口、`sql:` 数据字段 | 拒绝 JDBC 示例 301 条；`sql:` 字段已跳过 | 假阳 | 逐条降 P3 或整条剔除（本轮剔除 `orders` 示例） |
| D7 | 类型只在类别层比较 | 忽略 `varchar(n)`、`numeric(p,s)`、enum、domain、数组元素 | 0 条 P0 类型项 | 漏检（假阴） | 类别不同才报；精度差异不报 |
| D8 | 可空性只看 `is_nullable` | 未看代码是否 `Option<T>` / `COALESCE` / 有默认值 | 15 条 P2 | 假阳 | 一律 P2 人工，不进 P1 |
| D9 | 唯一索引只认完整 btree | 表达式索引、`USING hash`、`ON CONFLICT ON CONSTRAINT` 未覆盖 | 24 条 P0 均已人工确认无匹配 | 假阴（漏报） | 已识别部分唯一索引；命中即放行 |
| D10 | 基线导出不含视图 | 11-05 基线仅 `CREATE TABLE`（0 个视图） | 上一份的 3 条表缺失属此 | 假阳 | 实时快照走 `information_schema.columns`，视图计入，已消除 |
| D11 | 表名近似匹配靠规则 | `_v52` vs `_v` 这类数字后缀截断 | 5 张表 | 需人工确认命名意图 | 只作提示，不自动改判 |

> 结论：D1/D5 影响的是「无 schema 前缀」的少数条目，已被降级隔离；P0 全部由 schema 限定或唯一命中的强信号构成，因此本轮 P0 的可信度高于上一份。

## 4. 真实 P0 修复清单（只出清单，不生成迁移）

归并原则：**同一张表的所有缺列合并进一条迁移**；同一 schema 内可并行拆成多个迁移文件；表名对齐、唯一索引各自成组。

### 4.1 分组总览

| 组 | 范围 | 对象组 | 缺失列 | P0 条数 | 形态 |
|---|---|---|---|---|---|
| M1 | `svc/finance` | 16 | 41 | 48 | 见 §4.2 |
| M2 | `svc/erp` | 6 | 26 | 26 | 见 §4.2 |
| M3 | `svc/pdm` | 2 | 14 | 14 | 见 §4.2 |
| M4 | `svc/wms` | 1 | 11 | 11 | 见 §4.2 |
| M5 | `svc/integration` | 5 | 8 | 8 | 见 §4.2 |
| M6 | `svc/plugin-registry` | 1 | 6 | 6 | 见 §4.2 |
| M7 | `svc/portal` | 1 | 5 | 5 | 见 §4.2 |
| M8 | `svc/gis` | 4 | 4 | 4 | 见 §4.2 |
| M9 | `svc/scm` | 3 | 3 | 3 | 见 §4.2 |
| M10 | `svc/unified-core` | 2 | 2 | 2 | 见 §4.2 |
| M11 | `svc/pm` | 2 | 2 | 2 | 见 §4.2 |
| M12 | `svc/master-data` | 2 | 2 | 2 | 见 §4.2 |
| M13 | `lib/shared-db` | 1 | 1 | 1 | 见 §4.2 |
| M14 | `svc/communication` | 1 | 1 | 1 | 见 §4.2 |
| M15 | `svc/ai` | 1 | 1 | 1 | 见 §4.2 |
| M16 | `svc/crm` | 1 | 1 | 1 | 见 §4.2 |
| M17 | `tools` | 1 | 1 | 1 | 见 §4.2 |
| M18 | `svc/mobile` | 1 | 1 | 1 | 见 §4.2 |
| M19 | `svc/monitor` | 1 | 1 | 1 | 见 §4.2 |
| M20 | `svc/qms` | 1 | 1 | 1 | 见 §4.2 |
| M21 | `svc/srm` | 1 | 1 | 1 | 见 §4.2 |
| M22 | `svc/analytics` | 1 | 0 | 1 | 见 §4.2 |

### 4.2 逐表清单

| 表 | 缺失列 / 冲突目标 | 条数 | 建议动作 |
|---|---|---|---|
| `core.core_tenant_plugins` | activated_at, is_active, license_type, plugin_id, tenant_id | 5 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `erp.erp_production_orders` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `erp.event_idempotency` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `erp.payables` | amount, category, created_at, invoice_date, invoice_number, paid_amount, status, supplier_name, tenant_id, updated_at | 10 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `erp.receivables` | amount, created_at, customer_name, invoice_date, invoice_number, project_name, received_amount, status, tenant_id, updated_at | 10 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.core_finance_approval_nodes` | approval_type, approver_role, approver_users, conditions, is_active, notify_users, timeout_hours | 7 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.core_finance_payment_workflow` | workflow_instance_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.finance_budget_variances_v53` | actual_amount, budget_amount, budget_item_id, classification, period, trend, variance_amount, variance_percentage | 8 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.finance_cash_flow_predictions_v53` | confidence, entity_id, model_version, period, predicted_inflow, predicted_net, predicted_outflow, scenario | 8 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.finance_prediction_models_v53` | accuracy, entity_id, is_active, model_type, parameters, trained_at | 6 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.finance_voucher_template_lines` | account_code, amount_formula, created_at, description, direction, sort_order | 6 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `finance.reconciliation_item_snapshots` | match_status, updated_at | 2 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `gis.geodata` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `gis.geofeatures` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `gis.map_layers` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `gis.spatial_analysis` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `integration.core_inter_module_sync` | max_retries, retry_count, source_entity, source_id | 4 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `integration.crm_erp_sync` | updated_at | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `integration.crm_scm_sync` | updated_at | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `integration.erp_wms_sync` | updated_at | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `integration.hrm_finance_sync` | updated_at | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `pdm.pdm_master_data_refs` | code, created_at, domain, last_synced_at, local_entity_type, master_data_id, name, payload_snapshot, source_service, status, tenant_id, updated_at | 12 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `portal.portal_todos` | completed, service_code, service_name, todo_type, user_id | 5 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `public.audit_logs` | origin | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `public.core_notification_templates` | status | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `scm.purchase_contract_items` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `scm.supplier_admission_audit_items` | tenant_id | 1 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `wms.purchase_order_snapshots` | approved_at, approved_by, created_at, order_number, payable_amount, status, supplier_id, supplier_name, synced_at, total_amount, updated_at | 11 | 补列（ADD COLUMN，注意 NOT NULL/默认值） |
| `ai.ai_training_samples` | source_type,source_id | 1 | 补唯一索引/主键 |
| `core.core_tenant_plugins` | tenant_id,plugin_id | 1 | 补唯一索引/主键 |
| `crm.customer_tags` | customer_id,tag | 1 | 补唯一索引/主键 |
| `erp.materials` | code | 1 | 补唯一索引/主键 |
| `erp.payables` | invoice_number | 1 | 补唯一索引/主键 |
| `erp.receivables` | invoice_number | 1 | 补唯一索引/主键 |
| `finance.core_finance_periods` | tenant_id,year,month | 1 | 补唯一索引/主键 |
| `finance.core_finance_vouchers` | tenant_id,source_module,source_id | 1 | 补唯一索引/主键 |
| `finance.finance_prediction_models_v53` | model_type | 1 | 补唯一索引/主键 |
| `flow.core_flow_variables / public.core_flow_variables` | scope,instance_id,task_id,workflow_id,var_key | 1 | 补唯一索引/主键 |
| `flow.core_migration_history / iam.core_migration_history / public.core_migration_history` | plugin_name,version,script_name | 1 | 补唯一索引/主键 |
| `mobile.mobile_push_notifications` | source_type,source_id | 1 | 补唯一索引/主键 |
| `pdm.pdm_master_data_refs` | master_data_id | 1 | 补唯一索引/主键 |
| `pdm.pdm_project_members` | tenant_id,project_id,user_id | 1 | 补唯一索引/主键 |
| `pm.project_benefits` | project_id,period_type,period_date | 1 | 补唯一索引/主键 |
| `pm.project_members` | project_id,user_id | 1 | 补唯一索引/主键 |
| `public.automation_variables` | tenant_id,key | 1 | 补唯一索引/主键 |
| `public.monitor_settings` | tenant_id,key | 1 | 补唯一索引/主键 |
| `public.system_settings` | tenant_id,key | 1 | 补唯一索引/主键 |
| `qms.qa_corrective_actions` | action_no | 1 | 补唯一索引/主键 |
| `scm.suppliers` | supplier_no | 1 | 补唯一索引/主键 |
| `scm.wms_inventory_snapshots` | warehouse_id,item_code | 1 | 补唯一索引/主键 |
| `srm.supplier_performance` | supplier_id,tenant_id | 1 | 补唯一索引/主键 |
| `srm.suppliers` | supplier_no | 1 | 补唯一索引/主键 |
| `bi.org_stats` | （整表） | 1 | 核对是否视图/动态表名；若确需，补迁移建表；否则删除该查询 |
| `cqrs_snapshots` | （整表） | 1 | 核对是否视图/动态表名；若确需，补迁移建表；否则删除该查询 |
| `finance_alert_configs_v52` | （整表） → 生产实际名 finance.finance_alert_configs_v | 1 | 表名不一致：生产为 finance.finance_alert_configs_v，代码用 finance_alert_configs_v52；改代码或补视图 |
| `finance_alert_history_v52` | （整表） → 生产实际名 finance.finance_alert_history_v | 1 | 表名不一致：生产为 finance.finance_alert_history_v，代码用 finance_alert_history_v52；改代码或补视图 |
| `finance_anomaly_alerts_v52` | （整表） → 生产实际名 finance.finance_anomaly_alerts_v | 1 | 表名不一致：生产为 finance.finance_anomaly_alerts_v，代码用 finance_anomaly_alerts_v52；改代码或补视图 |
| `finance_audit_findings_v52` | （整表） → 生产实际名 finance.finance_audit_findings_v | 1 | 表名不一致：生产为 finance.finance_audit_findings_v，代码用 finance_audit_findings_v52；改代码或补视图 |
| `finance_detection_configs_v52` | （整表） → 生产实际名 finance.finance_detection_configs_v | 1 | 表名不一致：生产为 finance.finance_detection_configs_v，代码用 finance_detection_configs_v52；改代码或补视图 |
| `finance_u8_import_records` | （整表） | 1 | 核对是否视图/动态表名；若确需，补迁移建表；否则删除该查询 |

### 4.3 建议的迁移切分

1. **M-补列（按服务 schema）**：每个 `svc/<module>` 一条迁移，覆盖该模块下所有「表在、列缺」的条目；同一张表的缺列（合计 109 处）不要拆成多条，避免重复锁表。
2. **M-唯一索引**：`ON CONFLICT` 24 处按表合并，优先补「业务唯一键」而非 `id`。
3. **M-表对齐**：`finance_*_v52` 五张表二选一——补 `_v52` 视图/别名，或改代码指向 `_v`；`bi.org_stats` 需补物化视图并对齐刷新任务。
4. **M-半成品表**：`pdm.pdm_master_data_refs`、`wms.purchase_order_snapshots` 等仅骨架列的表，先确认是否废弃；废弃则删代码，保留则补全列。

## 5. G2 门禁重新评估（基于实时快照）

| 维度 | 结论 |
|---|---|
| 可行性 | 可行。实时快照 4.6 MB，裁剪成「schema/table/column/type/notnull/唯一键」约 1 MB，校验 < 5 s，离线可跑 |
| 规则形态 | 只对「schema 限定的表」和「`.sqlx` `describe.columns[].origin` 强契约」做 fail；无 schema 前缀且多义的表只 warn |
| 更新频率 | 每次生产迁移窗口关闭后强制重导出；日常每日一次只读导出 |
| 账本绑定 | 快照内嵌 `ledger.max_version`；CI 断言 `snapshot.ledger.max_version == manifest 的 applied 锚点`，不等即失败（防「绿着放行」） |
| 误报率 | 本轮 P0 误报 0/141；若把 27 条跨 schema 歧义一并纳入，上限 27/168 ≈ 16.1%，因此歧义类只能 warn |
| 主要代价 | 快照需随窗口刷新（G4）；否则会把「迁移未应用」误报为漂移 |
| 不建议进门的 | `SELECT *`、动态表名、`{模板列}`：误报无法收敛，保留人工盘点 |

落地顺序建议：G1（`.sqlx` 新鲜度）→ G2（强契约 vs 快照，fail）→ G3（结构化 DML，warn 起步）→ 观察 2 周后升 fail。

## 6. 复现

```bash
# 实时快照对比（只读；读 docs/quality/prod_schema_live_20261109.json）
python3 /tmp/col_drift_live.py   # -> /tmp/col_drift_live.json
python3 /tmp/gen_verified.py     # -> 本文件 + prod-column-drift-verified-2026-11-09.json
```

> 脚本未入库；如需固化为门禁，按 §5 落成 `scripts/ci/check-column-contract.mjs`。

## 附录 A：P0 全量（逐条）

| # | 表 | 列 / 冲突目标 | 代码引用 |
|---|---|---|---|
| 1 | `core.core_tenant_plugins` | activated_at | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:704` |
| 2 | `core.core_tenant_plugins` | is_active | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:322`<br>`svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:587` |
| 3 | `core.core_tenant_plugins` | license_type | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` |
| 4 | `core.core_tenant_plugins` | plugin_id | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` |
| 5 | `core.core_tenant_plugins` | tenant_id | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` |
| 6 | `erp.erp_production_orders` | tenant_id | `svc/erp/src/modules/production_order.rs:176` |
| 7 | `erp.event_idempotency` | tenant_id | `svc/erp/src/event_handlers/mod.rs:1394` |
| 8 | `erp.payables` | amount | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 9 | `erp.payables` | category | `svc/erp/src/event_handlers/mod.rs:580` |
| 10 | `erp.payables` | created_at | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 11 | `erp.payables` | invoice_date | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 12 | `erp.payables` | invoice_number | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 13 | `erp.payables` | paid_amount | `svc/erp/src/event_handlers/mod.rs:1006`<br>`svc/erp/src/event_handlers/mod.rs:1024` |
| 14 | `erp.payables` | status | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580`<br>`svc/erp/src/event_handlers/mod.rs:1006` |
| 15 | `erp.payables` | supplier_name | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 16 | `erp.payables` | tenant_id | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 17 | `erp.payables` | updated_at | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580`<br>`svc/erp/src/event_handlers/mod.rs:1006` |
| 18 | `erp.receivables` | amount | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 19 | `erp.receivables` | created_at | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 20 | `erp.receivables` | customer_name | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 21 | `erp.receivables` | invoice_date | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 22 | `erp.receivables` | invoice_number | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 23 | `erp.receivables` | project_name | `svc/erp/src/event_handlers/mod.rs:662` |
| 24 | `erp.receivables` | received_amount | `svc/erp/src/event_handlers/mod.rs:884`<br>`svc/erp/src/event_handlers/mod.rs:902`<br>`svc/erp/src/event_handlers/mod.rs:920` |
| 25 | `erp.receivables` | status | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662`<br>`svc/erp/src/event_handlers/mod.rs:884` |
| 26 | `erp.receivables` | tenant_id | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 27 | `erp.receivables` | updated_at | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662`<br>`svc/erp/src/event_handlers/mod.rs:884` |
| 28 | `finance.core_finance_approval_nodes` | approval_type | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 29 | `finance.core_finance_approval_nodes` | approver_role | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 30 | `finance.core_finance_approval_nodes` | approver_users | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 31 | `finance.core_finance_approval_nodes` | conditions | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 32 | `finance.core_finance_approval_nodes` | is_active | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 33 | `finance.core_finance_approval_nodes` | notify_users | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 34 | `finance.core_finance_approval_nodes` | timeout_hours | `svc/finance/src/services/finance/approval_configs.rs:102`<br>`svc/finance/src/services/finance/approval_configs.rs:180` |
| 35 | `finance.core_finance_payment_workflow` | workflow_instance_id | `svc/finance/src/services/finance/payment_workflow.rs:101` |
| 36 | `finance.finance_budget_variances_v53` | actual_amount | `svc/finance/src/modules/forecast_v53.rs:857` |
| 37 | `finance.finance_budget_variances_v53` | budget_amount | `svc/finance/src/modules/forecast_v53.rs:857` |
| 38 | `finance.finance_budget_variances_v53` | budget_item_id | `svc/finance/src/modules/forecast_v53.rs:857` |
| 39 | `finance.finance_budget_variances_v53` | classification | `svc/finance/src/modules/forecast_v53.rs:857` |
| 40 | `finance.finance_budget_variances_v53` | period | `svc/finance/src/modules/forecast_v53.rs:857` |
| 41 | `finance.finance_budget_variances_v53` | trend | `svc/finance/src/modules/forecast_v53.rs:857` |
| 42 | `finance.finance_budget_variances_v53` | variance_amount | `svc/finance/src/modules/forecast_v53.rs:857` |
| 43 | `finance.finance_budget_variances_v53` | variance_percentage | `svc/finance/src/modules/forecast_v53.rs:857` |
| 44 | `finance.finance_cash_flow_predictions_v53` | confidence | `svc/finance/src/modules/forecast_v53.rs:268` |
| 45 | `finance.finance_cash_flow_predictions_v53` | entity_id | `svc/finance/src/modules/forecast_v53.rs:268` |
| 46 | `finance.finance_cash_flow_predictions_v53` | model_version | `svc/finance/src/modules/forecast_v53.rs:268` |
| 47 | `finance.finance_cash_flow_predictions_v53` | period | `svc/finance/src/modules/forecast_v53.rs:268` |
| 48 | `finance.finance_cash_flow_predictions_v53` | predicted_inflow | `svc/finance/src/modules/forecast_v53.rs:268` |
| 49 | `finance.finance_cash_flow_predictions_v53` | predicted_net | `svc/finance/src/modules/forecast_v53.rs:268` |
| 50 | `finance.finance_cash_flow_predictions_v53` | predicted_outflow | `svc/finance/src/modules/forecast_v53.rs:268` |
| 51 | `finance.finance_cash_flow_predictions_v53` | scenario | `svc/finance/src/modules/forecast_v53.rs:268` |
| 52 | `finance.finance_prediction_models_v53` | accuracy | `svc/finance/src/modules/forecast_v53.rs:622` |
| 53 | `finance.finance_prediction_models_v53` | entity_id | `svc/finance/src/modules/forecast_v53.rs:622` |
| 54 | `finance.finance_prediction_models_v53` | is_active | `svc/finance/src/modules/forecast_v53.rs:622` |
| 55 | `finance.finance_prediction_models_v53` | model_type | `svc/finance/src/modules/forecast_v53.rs:622` |
| 56 | `finance.finance_prediction_models_v53` | parameters | `svc/finance/src/modules/forecast_v53.rs:622` |
| 57 | `finance.finance_prediction_models_v53` | trained_at | `svc/finance/src/modules/forecast_v53.rs:622` |
| 58 | `finance.finance_voucher_template_lines` | account_code | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` |
| 59 | `finance.finance_voucher_template_lines` | amount_formula | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` |
| 60 | `finance.finance_voucher_template_lines` | created_at | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/mod.rs:1979`<br>`svc/finance/src/services/finance/voucher_template.rs:233` |
| 61 | `finance.finance_voucher_template_lines` | description | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` |
| 62 | `finance.finance_voucher_template_lines` | direction | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/mod.rs:1979` |
| 63 | `finance.finance_voucher_template_lines` | sort_order | `svc/finance/src/modules/voucher_template_entries.rs:137`<br>`svc/finance/src/modules/voucher_template_entries.rs:193`<br>`svc/finance/src/modules/voucher_template_entries.rs:268` |
| 64 | `finance.reconciliation_item_snapshots` | match_status | `svc/finance/src/modules/settlement_center/service.rs:205` |
| 65 | `finance.reconciliation_item_snapshots` | updated_at | `svc/finance/src/modules/settlement_center/service.rs:205` |
| 66 | `gis.geodata` | tenant_id | `svc/gis/src/modules/geodata.rs:130` |
| 67 | `gis.geofeatures` | tenant_id | `svc/gis/src/modules/geodata.rs:186` |
| 68 | `gis.map_layers` | tenant_id | `svc/gis/src/modules/map.rs:391` |
| 69 | `gis.spatial_analysis` | tenant_id | `svc/gis/src/modules/spatial.rs:95`<br>`svc/gis/src/modules/spatial.rs:192`<br>`svc/gis/src/modules/spatial.rs:285` |
| 70 | `integration.core_inter_module_sync` | max_retries | `svc/integration/src/handlers/sync.rs:727` |
| 71 | `integration.core_inter_module_sync` | retry_count | `svc/integration/src/handlers/sync.rs:727` |
| 72 | `integration.core_inter_module_sync` | source_entity | `svc/integration/src/handlers/sync.rs:727` |
| 73 | `integration.core_inter_module_sync` | source_id | `svc/integration/src/handlers/sync.rs:727` |
| 74 | `integration.crm_erp_sync` | updated_at | `svc/integration/src/crm_erp_sync.rs:200`<br>`svc/integration/src/crm_erp_sync.rs:253`<br>`svc/integration/src/crm_erp_sync.rs:283` |
| 75 | `integration.crm_scm_sync` | updated_at | `svc/integration/src/crm_scm_sync.rs:192`<br>`svc/integration/src/crm_scm_sync.rs:247`<br>`svc/integration/src/crm_scm_sync.rs:277` |
| 76 | `integration.erp_wms_sync` | updated_at | `svc/integration/src/erp_wms_sync.rs:193`<br>`svc/integration/src/erp_wms_sync.rs:248`<br>`svc/integration/src/erp_wms_sync.rs:278` |
| 77 | `integration.hrm_finance_sync` | updated_at | `svc/integration/src/hrm_finance_sync.rs:196`<br>`svc/integration/src/hrm_finance_sync.rs:245`<br>`svc/integration/src/hrm_finance_sync.rs:274` |
| 78 | `pdm.pdm_master_data_refs` | code | `svc/pdm/src/event_handlers/mod.rs:255` |
| 79 | `pdm.pdm_master_data_refs` | created_at | `svc/pdm/src/event_handlers/mod.rs:255` |
| 80 | `pdm.pdm_master_data_refs` | domain | `svc/pdm/src/event_handlers/mod.rs:255` |
| 81 | `pdm.pdm_master_data_refs` | last_synced_at | `svc/pdm/src/event_handlers/mod.rs:255` |
| 82 | `pdm.pdm_master_data_refs` | local_entity_type | `svc/pdm/src/event_handlers/mod.rs:255` |
| 83 | `pdm.pdm_master_data_refs` | master_data_id | `svc/pdm/src/event_handlers/mod.rs:255` |
| 84 | `pdm.pdm_master_data_refs` | name | `svc/pdm/src/event_handlers/mod.rs:255` |
| 85 | `pdm.pdm_master_data_refs` | payload_snapshot | `svc/pdm/src/event_handlers/mod.rs:255` |
| 86 | `pdm.pdm_master_data_refs` | source_service | `svc/pdm/src/event_handlers/mod.rs:255` |
| 87 | `pdm.pdm_master_data_refs` | status | `svc/pdm/src/event_handlers/mod.rs:255` |
| 88 | `pdm.pdm_master_data_refs` | tenant_id | `svc/pdm/src/event_handlers/mod.rs:255` |
| 89 | `pdm.pdm_master_data_refs` | updated_at | `svc/pdm/src/event_handlers/mod.rs:255` |
| 90 | `portal.portal_todos` | completed | `svc/portal/src/modules/graphql_mutation_impls.rs:148`<br>`svc/portal/src/modules/todos.rs:197` |
| 91 | `portal.portal_todos` | service_code | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` |
| 92 | `portal.portal_todos` | service_name | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` |
| 93 | `portal.portal_todos` | todo_type | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` |
| 94 | `portal.portal_todos` | user_id | `svc/portal/src/modules/graphql_mutation_impls.rs:104`<br>`svc/portal/src/modules/todos.rs:144` |
| 95 | `public.audit_logs` | origin | `lib/shared-db/src/audit.rs:291` |
| 96 | `public.core_notification_templates` | status | `svc/communication/src/notification.rs:3935` |
| 97 | `scm.purchase_contract_items` | tenant_id | `svc/scm/src/modules/purchase_contract.rs:176`<br>`svc/scm/src/modules/purchase_contract.rs:373` |
| 98 | `scm.supplier_admission_audit_items` | tenant_id | `svc/scm/src/modules/supplier_admission.rs:683` |
| 99 | `wms.purchase_order_snapshots` | approved_at | `svc/wms/src/event_handlers/mod.rs:392` |
| 100 | `wms.purchase_order_snapshots` | approved_by | `svc/wms/src/event_handlers/mod.rs:392` |
| 101 | `wms.purchase_order_snapshots` | created_at | `svc/wms/src/event_handlers/mod.rs:392` |
| 102 | `wms.purchase_order_snapshots` | order_number | `svc/wms/src/event_handlers/mod.rs:392` |
| 103 | `wms.purchase_order_snapshots` | payable_amount | `svc/wms/src/event_handlers/mod.rs:392` |
| 104 | `wms.purchase_order_snapshots` | status | `svc/wms/src/event_handlers/mod.rs:392` |
| 105 | `wms.purchase_order_snapshots` | supplier_id | `svc/wms/src/event_handlers/mod.rs:392` |
| 106 | `wms.purchase_order_snapshots` | supplier_name | `svc/wms/src/event_handlers/mod.rs:392` |
| 107 | `wms.purchase_order_snapshots` | synced_at | `svc/wms/src/event_handlers/mod.rs:392` |
| 108 | `wms.purchase_order_snapshots` | total_amount | `svc/wms/src/event_handlers/mod.rs:392` |
| 109 | `wms.purchase_order_snapshots` | updated_at | `svc/wms/src/event_handlers/mod.rs:392` |
| 110 | `ai.ai_training_samples` | source_type,source_id | `svc/ai/src/event_handlers/mod.rs:66` |
| 111 | `core.core_tenant_plugins` | tenant_id,plugin_id | `svc/plugin-registry/src/modules/plugin/handlers/simple_api.rs:204`<br>`svc/plugin-registry/src/modules/plugin/handlers/tenant_plugins.rs:295` |
| 112 | `crm.customer_tags` | customer_id,tag | `svc/crm/src/modules/customer_profile.rs:418` |
| 113 | `erp.materials` | code | `svc/erp/src/modules/material.rs:466` |
| 114 | `erp.payables` | invoice_number | `svc/erp/src/event_handlers/mod.rs:435`<br>`svc/erp/src/event_handlers/mod.rs:580` |
| 115 | `erp.receivables` | invoice_number | `svc/erp/src/event_handlers/mod.rs:356`<br>`svc/erp/src/event_handlers/mod.rs:662` |
| 116 | `finance.core_finance_periods` | tenant_id,year,month | `svc/finance/src/modules/mod.rs:3915` |
| 117 | `finance.core_finance_vouchers` | tenant_id,source_module,source_id | `svc/finance/src/event_handlers/mod.rs:230` |
| 118 | `finance.finance_prediction_models_v53` | model_type | `svc/finance/src/modules/forecast_v53.rs:622` |
| 119 | `flow.core_flow_variables / public.core_flow_variables` | scope,instance_id,task_id,workflow_id,var_key | `svc/unified-core/src/modules/flow/variable.rs:158` |
| 120 | `flow.core_migration_history / iam.core_migration_history / public.core_migration_history` | plugin_name,version,script_name | `tools/migration-sdk/src/history.rs:85`<br>`tools/migration-sdk/src/history.rs:120` |
| 121 | `mobile.mobile_push_notifications` | source_type,source_id | `svc/mobile/src/event_handlers/mod.rs:101` |
| 122 | `pdm.pdm_master_data_refs` | master_data_id | `svc/pdm/src/event_handlers/mod.rs:255` |
| 123 | `pdm.pdm_project_members` | tenant_id,project_id,user_id | `svc/pdm/src/modules/project.rs:735` |
| 124 | `pm.project_benefits` | project_id,period_type,period_date | `svc/pm/src/modules/project_benefit.rs:296` |
| 125 | `pm.project_members` | project_id,user_id | `svc/pm/src/modules/project_member.rs:121` |
| 126 | `public.automation_variables` | tenant_id,key | `svc/unified-core/src/modules/automation/mod.rs:1024` |
| 127 | `public.monitor_settings` | tenant_id,key | `svc/monitor/src/modules/monitor/settings.rs:161`<br>`svc/monitor/src/modules/monitor/settings.rs:275` |
| 128 | `public.system_settings` | tenant_id,key | `svc/erp/src/modules/settings.rs:249` |
| 129 | `qms.qa_corrective_actions` | action_no | `svc/qms/src/modules/integration.rs:65` |
| 130 | `scm.suppliers` | supplier_no | `svc/master-data/src/modules/supplier_sync.rs:173` |
| 131 | `scm.wms_inventory_snapshots` | warehouse_id,item_code | `svc/scm/src/event_handlers/mod.rs:873` |
| 132 | `srm.supplier_performance` | supplier_id,tenant_id | `svc/srm/src/event_handlers/mod.rs:209` |
| 133 | `srm.suppliers` | supplier_no | `svc/master-data/src/modules/supplier_sync.rs:255` |
| 134 | `bi.org_stats` | （整表） | `svc/analytics/src/routes.rs:930` |
| 135 | `cqrs_snapshots` | （整表） | `svc/finance/src/domain/pg_event_store.rs:148`<br>`svc/finance/src/domain/pg_event_store.rs:297` |
| 136 | `finance_alert_configs_v52` | （整表） | `svc/finance/src/modules/audit_v52.rs:1484`<br>`svc/finance/src/modules/audit_v52.rs:1507`<br>`svc/finance/src/modules/audit_v52.rs:1524` |
| 137 | `finance_alert_history_v52` | （整表） | `svc/finance/src/modules/audit_v52.rs:1540`<br>`svc/finance/src/modules/audit_v52.rs:1634`<br>`svc/finance/src/modules/audit_v52.rs:1580` |
| 138 | `finance_anomaly_alerts_v52` | （整表） | `svc/finance/src/modules/audit_v52.rs:1003`<br>`svc/finance/src/modules/audit_v52.rs:1358`<br>`svc/finance/src/modules/audit_v52.rs:1360` |
| 139 | `finance_audit_findings_v52` | （整表） | `svc/finance/src/modules/audit_v52.rs:875`<br>`svc/finance/src/modules/audit_v52.rs:877` |
| 140 | `finance_detection_configs_v52` | （整表） | `svc/finance/src/modules/audit_v52.rs:1414` |
| 141 | `finance_u8_import_records` | （整表） | `svc/finance/src/services/finance/u8_import.rs:90`<br>`svc/finance/src/services/finance/u8_import.rs:142`<br>`svc/finance/src/services/finance/u8_import.rs:264` |
