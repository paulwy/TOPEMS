# W7 · B5 财务 RLS 冻结清单（2026-11-10）

> 本清单是 B5 迁移（8 笔）的唯一表名依据。窗口开始前若与生产实测不一致，**停止窗口**，先重新冻结。
> 取证：`topems_prod` @ `192.168.110.115`，2026-11-10，只读查询（`pg_class` / `pg_policies` / `count(*)`）。
> 应用角色 `topems_prod`（`rolsuper=f`、`rolbypassrls=f`）；本次盘点用 `xingzhai` 仅执行 `SELECT`。

## 0. 冻结口径

| 项 | 值 |
|---|---|
| finance 表总数（`relkind='r'`） | **119** |
| 带 `tenant_id`（本批范围） | **109** |
| 无 `tenant_id`（本批不动） | 10 |
| 已 ENABLE+FORCE RLS | 107 |
| 未启用 RLS | 2（`core_finance_currencies`、`reconcile_items`） |
| 非空表 | 9，合计 **103 行** |
| 表名清单 SHA256（v2：`schema.relname` 排序，119 行） | `31e68a2338793f319f1be5811226823150881fecc9c82108190476b732901e85`（见 §1.1；v1 旧值 `5091d7af…2de6917`、`2a314cb2…fdf750` 均标注为历史口径） |
| 代码覆盖范围 | `services/finance/` 21 文件 205 处 + `modules/` 23 文件 687 处，裸池直接执行 SQL **全部清零**（B5-0 并入） |

与 2026-11-09 设计文档的 104 张口径相比，两天内新增 5 张带 `tenant_id` 的表（A 类 84→89），漂移已在本清单固化。

形态代码：

- `ALLOW_ALL`：`USING(true)`，RLS 等于未收紧；
- `UNSET+...`：策略含 `current_setting` 未设豁免分支；
- `NIL`：含 nil UUID（`…0000`）系统分支；
- `NULL`：含 `tenant_id IS NULL` 全局行分支；
- `CAST`：列侧 `(tenant_id)::text` 比较；
- `NO_RLS`：有 `tenant_id` 但未启用 RLS。

## 1. 逐表冻结名单（109 张）

| 表 | RLS | FORCE | 策略数 | 形态 | 行数 | 全局只读 |
|---|---|---:|---:|---|---:|---|
| core_finance_report_line_map | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 48 | 是（48 行 NULL，P3 报表模板） |
| core_finance_accounts | 是 | 是 | 2 | UNSET+NULL+CAST | 28 | — |
| core_finance_currencies | 否 | 否 | 0 | NO_RLS | 16 | 是（8 行 NULL 全局币种） |
| core_finance_ledger | 是 | 是 | 2 | UNSET+NULL+CAST | 4 | — |
| core_finance_voucher_lines | 是 | 是 | 1 | ALLOW_ALL | 2 | — |
| cqrs_projection_progress | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 2 | 否（2 行 nil UUID 内部簿记） |
| core_finance_periods | 是 | 是 | 2 | UNSET+NULL+CAST | 1 | — |
| core_finance_vouchers | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 1 | — |
| accounting_subjects | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| budgets | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| core_finance_approval_nodes | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| core_finance_approval_workflows | 是 | 是 | 2 | UNSET+NULL+CAST | 0 | — |
| core_finance_aux_accounts | 是 | 是 | 2 | UNSET+NULL+CAST | 0 | — |
| core_finance_aux_balances | 是 | 是 | 2 | UNSET+NULL+CAST | 0 | — |
| core_finance_payment_approval_config | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| core_finance_payment_items | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| core_finance_payment_workflow | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| core_finance_payments | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| core_finance_reconciliation_items | 是 | 是 | 2 | UNSET+NULL+CAST | 0 | — |
| core_finance_reconciliation_sessions | 是 | 是 | 2 | UNSET+NULL+CAST | 0 | — |
| difference_adjustments | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| erp_collection_records | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| erp_payables | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| erp_payment_records | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| erp_receivables | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| expense_approvals | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| expenses | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| finance_alert_configs_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_alert_history_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_anomaly_alerts_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_audit_findings_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_audit_log | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_audit_rules_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_budget_variances_v53 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_cash_flow_predictions_v53 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_compliance_issues | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_compliance_reports | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_control_matrices | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_control_points | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_detection_configs_v52 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_prediction_models_v53 | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_risk_assessments | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_fraud_rules | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_fraud_scores | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_review_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_review_rules | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_review_workflows | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_risk_alerts | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v54_risk_indicators | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_invoice_items | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_invoices | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_payment_requests | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_payment_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_reconciliation_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v55_reconciliation_rules | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_brackets | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_forms | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_lines | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_plans | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_rates | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v56_tax_suggestions | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_analysis_dimensions | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_analysis_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_forecast_models | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_generated_reports | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_insights | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v57_report_templates | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_cash_pools | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_forecast_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_forecast_scenarios | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_liquidity_targets | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_optimization_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_pool_allocations | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v58_pool_transfers | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_credit_profiles | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_device_profiles | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_fraud_decisions | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_fraud_rules | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_fraud_signals | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_scoring_models | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_stress_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v59_stress_scenarios | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_alert_channels | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_alert_rules | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_alerts | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_decision_results | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_decision_scenarios | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_schedule_dependencies | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_schedule_executions | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_v60_schedule_tasks | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| finance_voucher_generation_rules | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| finance_voucher_template_lines | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| finance_voucher_templates | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| financial_reports | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| mv_receivable_aging | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| mv_voucher_summary | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| payables | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| receivables | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| reconcile_items | 否 | 否 | 0 | NO_RLS | 0 | — |
| reconcile_orders | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| reconciliation_item_snapshots | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| reconciliation_orders | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| reconciliation_settlement_links | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| reconciliation_snapshots | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| sales_invoices | 是 | 是 | 1 | UNSET+NULL+CAST | 0 | — |
| settlement_center_dashboards | 是 | 是 | 2 | UNSET+NIL+NULL+CAST | 0 | — |
| settlement_snapshots | 是 | 是 | 1 | ALLOW_ALL | 0 | — |
| source_amount_snapshots | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |
| vouchers | 是 | 是 | 1 | UNSET+NIL+NULL+CAST | 0 | — |

### 1.1 表名清单 SHA256 复算（v2 唯一口径，2026-11-10 定稿）

**v2 是全仓唯一算法。** 序列化单元由 v1 的 `relname` 升为 `schema || '.' || relname`，其余不变。这样 B4（8 个 schema）与 B5（`finance`）能用同一行代码、同一套排序与同一把哈希复核，不再出现"同名表跨 schema 撞车"。

口径写死：库 `topems_prod`、`relkind='r'`、拼接列 `n.nspname || '.' || c.relname`、SQL 侧 `ORDER BY (n.nspname||'.'||c.relname) COLLATE "C"`、客户端编码 UTF8、`psql -At`（行分隔符 LF，末尾带一个 LF）、哈希 SHA-256。**schema 过滤条件按域替换**：B5 为 `n.nspname='finance'`，B4 为 `n.nspname IN ('mes','wms','scm','srm','pdm','qms','lims','ehs')`。

```sh
PGHOST=/tmp PGCLIENTENCODING=UTF8 /opt/homebrew/bin/psql -X -At -U topems_prod -d topems_prod \
  -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='finance' AND c.relkind='r' ORDER BY (n.nspname||'.'||c.relname) COLLATE \"C\"" \
  | shasum -a 256 | cut -d' ' -f1
```

2026-11-10 复算结果（v2）：

| 项 | 值 |
|---|---|
| 行数 | 119 |
| SHA256 | `31e68a2338793f319f1be5811226823150881fecc9c82108190476b732901e85` |

历史口径（v1，**仅存档、不再用于复核**）：序列化单元为 `relname`，命令与上同但 `SELECT c.relname` / `ORDER BY c.relname COLLATE "C"`；2026-11-10 得 `5091d7af6d06517326a8ead567ac969bbd6abf06aae32be5dad81a1972de6917`（119 行）。更早的 `2a314cb213b9631c07cf4bde3b5caf126b13b7874b2170e8353cad8064fdf750` 因序列化口径未留档、在 119 张名单上不可复算，已作废（名单本身零漂移，已用逐行 diff 证明生产与本文档 §1+§3 完全一致）。

## 2. 全局行 / 全局只读白名单（C）

| 表 | 行数 | 形态 | 策略 |
|---|---:|---|---|
| `core_finance_report_line_map` | 48 | 全部 `tenant_id IS NULL` | **全局只读白名单**：新增/保留 `tenant_id IS NULL` 只读分支，禁止写 NULL 行 |
| `core_finance_currencies` | 16 | 8 行 NULL + 8 行 `…0001` | **全局只读白名单**：全局币种只读；租户自定义币种按租户隔离 |
| `cqrs_projection_progress` | 2 | `tenant_id = …0000`（nil UUID，非 NULL） | **不进 NULL 白名单**：按 nil 租户系统通道处理，读写在系统作用域 |

## 2.1 系统通道例外清单（代码侧，已登记）

只有下列位置允许 `scope_system` / `scope_read_system`。新增例外必须同时改本表，否则按越权处理。

| 位置 | 用途 | 作用域 | 边界 |
|---|---|---|---|
| [modules/financial_reports.rs#L104-L138](file:///Users/air/TOPEMS/svc/finance/src/modules/financial_reports.rs#L104-L138) `period_net_total` | 超管全局报表的跨租户 SUM（`tenant_id=None`） | `scope_read_system` | **已拍板保留**；仅 `is_superuser` 的 `None` 分支，非超管一律 `scope_read_for_tenant` |
| [domain/pg_materialized_views.rs](file:///Users/air/TOPEMS/svc/finance/src/domain/pg_materialized_views.rs) `PgVoucherSummaryView` / `PgReceivableAgingView` | 投影表读、写、重建；表行 `tenant_id=…0000` | `scope_system` | 系统派生数据；不用于业务明细跨租户读取 |
| [services/finance/database.rs#L5](file:///Users/air/TOPEMS/svc/finance/src/services/finance/database.rs#L5) `init_reconciliation_tables` | 对账表初始化/自愈（当前无调用方） | `scope_system` | 仅 DDL/初始化 |
| [event_handlers/mod.rs](file:///Users/air/TOPEMS/svc/finance/src/event_handlers/mod.rs) 自动凭证与快照写入 | 事件入站写 finance | `scope_for_tenant(payload.tenant_id)` | 每个事件显式租户；payload 缺 `tenant_id` 直接报错，不兜底 nil/`…0001` |
| [domain/async_projector.rs](file:///Users/air/TOPEMS/svc/finance/src/domain/async_projector.rs) `get_last_progress` / `update_progress` | `cqrs_projection_progress` nil 租户内部簿记的读与写 | `scope_read_system` / `scope_system` | 后台投影无请求上下文；不进 NULL 全局只读白名单 |

**跨租户合并口径（已拍板）**：不支持跨租户合并。`erp` 合并抵销扫描 finance 账簿时随请求事务带租户 GUC，合并只在租户内按公司维度进行；将来若要做跨租户集团合并，必须显式开系统通道并先登记到本表，本批不做。

### 2.1.1 模块层逐条登记（B5-0，共 104 处）

由代码注释标记自动汇总（`系统通道例外（冻结文档 §2.1）` / `系统通道：无请求上下文`）。行号为 2026-11-10 改造后位置，代码移动后需同步更新。

| 文件 | 行 | 函数 | 类型 |
|---|---:|---|---|
| `modules/audit_v52.rs` | 352 | `list_rules` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 924 | `get_findings` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 1423 | `get_alerts` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 1488 | `get_summary` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 1566 | `list_configs` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 1672 | `get_history` | 超管跨租户只读 |
| `modules/audit_v52.rs` | 1734 | `auto_audit_scheduler` | 启动/后台系统 |
| `modules/bootstrap.rs` | 74 | `bootstrap_defaults` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 373 | `list` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 396 | `get` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 544 | `get` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 568 | `list` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 675 | `get` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 717 | `list` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 741 | `get_summary` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 960 | `get` | 超管跨租户只读 |
| `modules/compliance_v51.rs` | 985 | `list` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 277 | `as_str` | 启动/后台系统 |
| `modules/decision_v60.rs` | 679 | `get_decision` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 699 | `list_scenarios` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 719 | `get_alternatives` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 790 | `get_decision_history` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 978 | `get_alert_rules` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 1058 | `get_active_alerts` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 1143 | `get_alert_history` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 1299 | `get_tasks` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 1422 | `get_execution` | 超管跨租户只读 |
| `modules/decision_v60.rs` | 1443 | `list_executions` | 超管跨租户只读 |
| `modules/financial_reports.rs` | 188 | `get_report_item_details` | 超管跨租户只读 |
| `modules/financial_reports.rs` | 260 | `get_report_item_vouchers` | 超管跨租户只读 |
| `modules/financial_reports.rs` | 1279 | `fetch_report` | 超管跨租户只读 |
| `modules/financial_reports.rs` | 1329 | `fetch_history` | 超管跨租户只读 |
| `modules/mod.rs` | 120 | `count_table_with_tenant` | 超管跨租户只读 |
| `modules/mod.rs` | 148 | `count_table_with_tenant_and_status` | 超管跨租户只读 |
| `modules/mod.rs` | 172 | `sum_table_with_tenant` | 超管跨租户只读 |
| `modules/mod.rs` | 195 | `sum_overdue_with_tenant` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 325 | `init_reports_v57_tables` | 启动/后台系统 |
| `modules/reports_v57.rs` | 478 | `get_templates` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 540 | `list_reports` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 560 | `get_report` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 884 | `get_analysis_history` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 1182 | `get_insights` | 超管跨租户只读 |
| `modules/reports_v57.rs` | 1234 | `list_models` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 501 | `init_risk_v54_tables` | 启动/后台系统 |
| `modules/risk_v54.rs` | 534 | `evaluate_risk` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 596 | `evaluate_risk` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 747 | `get_alerts_by_category` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 773 | `get_alerts_by_entity` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 976 | `get_fraud_rules` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 1141 | `get_review_results` | 超管跨租户只读 |
| `modules/risk_v54.rs` | 1263 | `get_compliance_status` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 409 | `init_risk_v59_tables` | 启动/后台系统 |
| `modules/risk_v59.rs` | 631 | `get_fraud_decision` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 652 | `get_signals` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 735 | `list_blocked_devices` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 783 | `get_rules` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 933 | `get_scoring_models` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1065 | `get_model_comparison` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1262 | `get_test_result` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1282 | `list_scenarios` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1365 | `get_scenario_parameters` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1455 | `get_test_summary` | 超管跨租户只读 |
| `modules/risk_v59.rs` | 1583 | `get_device_handler` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 240 | `fetch_invoice` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 302 | `list_sales_invoices` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 859 | `list_collections` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 987 | `get_collection` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1388 | `get_receivable_aging` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1462 | `get_receivable_summary` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1534 | `get_overdue_receivables` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1619 | `export_sales_invoices` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1679 | `export_collections` | 超管跨租户只读 |
| `modules/sales_invoice.rs` | 1740 | `export_receivable_aging` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 846 | `init_settlement_v55_tables` | 启动/后台系统 |
| `modules/settlement_v55.rs` | 927 | `list_rules` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 1225 | `get_results` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 1564 | `get_invoice` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 1602 | `list_invoices` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 1849 | `get_payment_status` | 超管跨租户只读 |
| `modules/settlement_v55.rs` | 1923 | `list_payments` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 349 | `init_tax_v56_tables` | 启动/后台系统 |
| `modules/tax_v56.rs` | 633 | `get_forms` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 656 | `get_form_by_id` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 791 | `get_tax_summary` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 836 | `get_form_lines` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1005 | `get_rate_schedule` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1093 | `lookup_rate_impl` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1129 | `get_brackets_impl` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1384 | `get_suggestions` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1443 | `list_plans` | 超管跨租户只读 |
| `modules/tax_v56.rs` | 1497 | `get_compliance_check` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 288 | `as_str` | 启动/后台系统 |
| `modules/treasury_v58.rs` | 469 | `get_pool` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 489 | `list_pools` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 593 | `get_pool_history` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 839 | `get_forecast` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 859 | `list_scenarios` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 1024 | `get_liquidity_snapshot` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 1237 | `get_recommendations` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 1276 | `get_targets` | 超管跨租户只读 |
| `modules/treasury_v58.rs` | 1331 | `get_optimization_history` | 超管跨租户只读 |
| `modules/voucher_template.rs` | 247 | `get_usage_stats` | 超管跨租户只读 |
| `modules/voucher_template_entries.rs` | 63 | `list_entries` | 超管跨租户只读 |
| `modules/voucher_template_entries.rs` | 97 | `get_entry` | 超管跨租户只读 |

### 2.1.2 SQL 内联 nil 分支处置（85 处，B5-0 收口）

判定结论：**85 处全部为 A 类（业务租户端点），B 类 0 处，UNCLASSIFIED 0 处。**

- A 类落地：nil 租户在 `services::finance::require_tenant` / `modules::reconcile_orders::require_tenant` 直接报「缺少租户上下文」，SQL 谓词收敛为 `tenant_id = $N`，不再保留 `$N = '000…0000' OR ...` 旁路。
- B 类依据：仅平台/超管视角才配 B；finance 现有路由无 `/admin` 或平台总览端点，85 处均为凭证、应收应付、收付款、对账、期间报表等租户业务语义，故无 B。
- 已核定的跨租户通道仍只有 §2.1.1 的 `financial_reports.rs` 超管 SUM，本表未新增 §2.1 条目。

| 文件:行（改造后） | 函数 | 判定 | 理由 |
|---|---|---|---|
| `modules/reconcile_orders.rs:198` | `list_reconcile_orders` | A | 对账订单列表查询（业务） |
| `modules/reconcile_orders.rs:225` | `list_reconcile_orders` | A | 对账订单列表查询（业务） |
| `modules/reconcile_orders.rs:285` | `get_reconcile_order` | A | 对账订单详情（业务） |
| `modules/reconcile_orders.rs:366` | `get_reconcile_items` | A | 对账明细查询（业务） |
| `modules/reconcile_orders.rs:568` | `confirm_reconcile_order` | A | 对账确认写入（业务） |
| `modules/reconcile_orders.rs:626` | `dispute_reconcile_order` | A | 对账争议写入（业务） |
| `modules/reconcile_orders.rs:682` | `cancel_reconcile_order` | A | 对账取消写入（业务） |
| `modules/reconcile_orders.rs:758` | `update_reconcile_item` | A | 对账明细更新写入（业务） |
| `services/finance/approval_configs.rs:18` | `list_approval_configs` | A | 付款审批配置列表（租户业务） |
| `services/finance/approval_configs.rs:55` | `get_approval_config` | A | 付款审批配置详情（租户业务） |
| `services/finance/voucher_generation.rs:90` | `list_generation_rules` | A | 凭证生成规则列表（租户业务） |
| `services/finance/voucher_generation.rs:123` | `get_generation_rule` | A | 凭证生成规则详情（租户业务） |
| `services/finance/voucher_template.rs:104` | `list_voucher_templates` | A | 凭证模板列表（租户业务） |
| `services/finance/voucher_template.rs:158` | `get_voucher_template` | A | 凭证模板详情（租户业务） |
| `services/finance/payment_record.rs:28` | `list_payment_records` | A | 付款记录列表（业务） |
| `services/finance/payment_record.rs:31` | `list_payment_records` | A | 付款记录列表（业务） |
| `services/finance/payment_record.rs:120` | `get_payment_record` | A | 付款记录详情（业务） |
| `services/finance/reconciliation.rs:74` | `generate_session_no` | A | 对账会话编号生成（业务） |
| `services/finance/reconciliation.rs:93` | `get_session` | A | 对账会话详情（业务） |
| `services/finance/reconciliation.rs:114` | `list_sessions` | A | 对账会话列表（业务） |
| `services/finance/reconciliation.rs:116` | `list_sessions` | A | 对账会话列表（业务） |
| `services/finance/reconciliation.rs:537` | `get_items` | A | 对账明细列表（业务） |
| `services/finance/reconciliation.rs:635` | `get_unmatched_items` | A | 未匹配明细（业务） |
| `services/finance/reconciliation.rs:662` | `mark_matched` | A | 对账匹配写入（业务） |
| `services/finance/reconciliation.rs:677` | `mark_matched` | A | 对账匹配写入（业务） |
| `services/finance/reconciliation.rs:700` | `update_session_counts` | A | 对账会话计数写入（业务） |
| `services/finance/reconciliation.rs:709` | `update_session_counts` | A | 对账会话计数写入（业务） |
| `services/finance/reconciliation.rs:718` | `update_session_counts` | A | 对账会话计数写入（业务） |
| `services/finance/reconciliation.rs:805` | `get_report` | A | 对账报告（业务） |
| `services/finance/reconciliation.rs:820` | `get_report` | A | 对账报告（业务） |
| `services/finance/reconciliation.rs:834` | `get_report` | A | 对账报告（业务） |
| `services/finance/reconciliation.rs:848` | `get_report` | A | 对账报告（业务） |
| `services/finance/reconciliation.rs:862` | `get_report` | A | 对账报告（业务） |
| `services/finance/reconciliation.rs:932` | `get_aging` | A | 对账账龄（业务） |
| `services/finance/reconciliation.rs:955` | `get_aging` | A | 对账账龄（业务） |
| `services/finance/reconciliation.rs:1070` | `get_diff_statistics` | A | 对账差异统计（业务） |
| `services/finance/reconciliation.rs:1084` | `get_diff_statistics` | A | 对账差异统计（业务） |
| `services/finance/reconciliation.rs:1100` | `get_diff_statistics` | A | 对账差异统计（业务） |
| `services/finance/reconciliation.rs:1125` | `get_diff_statistics` | A | 对账差异统计（业务） |
| `services/finance/report.rs:19` | `get_ledger` | A | 账簿查询（租户报表） |
| `services/finance/report.rs:79` | `get_trial_balance` | A | 试算平衡（租户报表） |
| `services/finance/report.rs:143` | `get_balance_items` | A | 资产负债表取数（租户报表） |
| `services/finance/report.rs:225` | `get_income_items` | A | 利润表取数（租户报表） |
| `services/finance/report.rs:269` | `get_cash_flow_statement` | A | 现金流量表（租户报表） |
| `services/finance/u8_import.rs:190` | `get_import_status` | A | U8 导入状态（业务） |
| `services/finance/u8_import.rs:214` | `list_import_records` | A | U8 导入记录列表（业务） |
| `services/finance/u8_import.rs:250` | `get_import_record` | A | U8 导入记录详情（业务） |
| `services/finance/payment.rs:163` | `get_payment` | A | 付款单详情（业务） |
| `services/finance/payment.rs:185` | `get_payment` | A | 付款单详情（业务） |
| `services/finance/payment.rs:226` | `list_payments` | A | 付款单列表（业务） |
| `services/finance/payment.rs:232` | `list_payments` | A | 付款单列表（业务） |
| `services/finance/payment.rs:289` | `get_payment_response` | A | 付款单响应组装（业务） |
| `services/finance/payment.rs:311` | `get_payment_response` | A | 付款单响应组装（业务） |
| `services/finance/payment.rs:544` | `export_payments` | A | 付款单导出（业务） |
| `services/finance/account.rs:62` | `get_account` | A | 会计科目详情（业务） |
| `services/finance/account.rs:82` | `get_account_by_code` | A | 会计科目按编码（业务） |
| `services/finance/account.rs:102` | `list_accounts` | A | 会计科目列表（业务） |
| `services/finance/payable.rs:28` | `list_payables` | A | 应付列表（业务） |
| `services/finance/payable.rs:30` | `list_payables` | A | 应付列表（业务） |
| `services/finance/payable.rs:118` | `get_payable` | A | 应付详情（业务） |
| `services/finance/payable.rs:260` | `get_payable_aging` | A | 应付账龄（业务） |
| `services/finance/payable.rs:265` | `get_payable_aging` | A | 应付账龄（业务） |
| `services/finance/payable.rs:270` | `get_payable_aging` | A | 应付账龄（业务） |
| `services/finance/payable.rs:275` | `get_payable_aging` | A | 应付账龄（业务） |
| `services/finance/aging.rs:55` | `get_aging_detail` | A | 账龄明细（业务） |
| `services/finance/aging.rs:144` | `get_aging_trend` | A | 账龄趋势（业务） |
| `services/finance/aux_accounts.rs:64` | `list_aux_accounts` | A | 辅助核算列表（业务） |
| `services/finance/aux_accounts.rs:73` | `list_aux_accounts` | A | 辅助核算列表（业务） |
| `services/finance/aux_accounts.rs:94` | `get_aux_account` | A | 辅助核算详情（业务） |
| `services/finance/aux_accounts.rs:141` | `get_aux_ledger` | A | 辅助核算明细账（业务） |
| `services/finance/aux_accounts.rs:195` | `get_aux_balance` | A | 辅助核算余额表（业务） |
| `services/finance/aux_accounts.rs:196` | `get_aux_balance` | A | 辅助核算余额表（业务） |
| `services/finance/voucher.rs:479` | `get_voucher` | A | 凭证详情（业务） |
| `services/finance/voucher.rs:516` | `list_vouchers` | A | 凭证列表（业务） |
| `services/finance/voucher.rs:674` | `export_vouchers` | A | 凭证导出（业务） |
| `services/finance/collection.rs:28` | `list_collections` | A | 收款记录列表（业务） |
| `services/finance/collection.rs:31` | `list_collections` | A | 收款记录列表（业务） |
| `services/finance/collection.rs:118` | `get_collection` | A | 收款记录详情（业务） |
| `services/finance/receivable.rs:28` | `list_receivables` | A | 应收列表（业务） |
| `services/finance/receivable.rs:30` | `list_receivables` | A | 应收列表（业务） |
| `services/finance/receivable.rs:118` | `get_receivable` | A | 应收详情（业务） |
| `services/finance/receivable.rs:260` | `get_receivable_aging` | A | 应收账龄（业务） |
| `services/finance/receivable.rs:265` | `get_receivable_aging` | A | 应收账龄（业务） |
| `services/finance/receivable.rs:270` | `get_receivable_aging` | A | 应收账龄（业务） |
| `services/finance/receivable.rs:275` | `get_receivable_aging` | A | 应收账龄（业务） |

## 3. 无 `tenant_id` 表（10 张，本批不动）

`schema_defense_ledger`（1 行）、`cqrs_events`、`cqrs_snapshots`、`finance_audit_rules_v`、
`finance_budget_variances_v`、`finance_cash_flow_predictions_v`、`finance_prediction_models_v`、
`finance_u`、`finance_v`、`voucher_lines`（后 9 张 0 行）。

## 4. 数据基线（窗口验证用）

| 表 | 行数 | 租户分布 |
|---|---:|---|
| core_finance_accounts | 28 | `…0001` × 28 |
| core_finance_currencies | 16 | `…0001` × 8，NULL × 8 |
| core_finance_ledger | 4 | `…0001` × 4，借方合计 = 贷方合计 = `200.0000` |
| core_finance_periods | 1 | `…0001` × 1 |
| core_finance_report_line_map | 48 | NULL × 48 |
| core_finance_voucher_lines | 2 | `…0001` × 2 |
| core_finance_vouchers | 1 | `…0001` × 1 |
| cqrs_projection_progress | 2 | `…0000` × 2 |
| schema_defense_ledger | 1 | 无租户列 |

## 5. 漂移复核（窗口开始前执行）

```sql
-- 期望：tenant_tables = 109, total = 119
SELECT count(*) FILTER (WHERE has_tenant) AS tenant_tables, count(*) AS total
FROM (
  SELECT c.relname,
         EXISTS (SELECT 1 FROM pg_attribute a
                 WHERE a.attrelid = c.oid AND a.attname = 'tenant_id'
                   AND a.attnum > 0 AND NOT a.attisdropped) AS has_tenant
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'finance' AND c.relkind = 'r'
) s;

-- 期望：与 §1 名单逐行一致（差异行必须为 0）
-- 表名清单 SHA256（v2 唯一口径，见 §1.1）= 31e68a2338793f319f1be5811226823150881fecc9c82108190476b732901e85
-- （历史 v1 值 2a314cb2…fdf750 / 5091d7af…2de6917 已作废，不再用于复核）
```

**冻结规则**：本文件一经确认，迁移批次只按 §1 名单执行；出现新表 → 停窗、重新冻结、重新评估批次归属。
