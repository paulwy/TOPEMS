# W7 · B5 财务域 RLS fail-closed 影响面评估（2026-11-10）

> 范围：**只读评估**。本文不含代码改动、不含迁移、未在生产执行任何 DDL/DML。
> 取证：生产库 `topems_prod`，应用角色 `topems_prod`（非超户，`rolsuper=f`、`rolbypassrls=f`），
> 超级用户 `xingzhai` 仅用于无 RLS 干扰的结构盘点与精确行数；全部语句为 `SELECT` / 系统目录查询。
> 目标批次：B5 财务 104 张表（设计文档口径）→ **生产实测 109 张带 `tenant_id` 的表**，漂移见 §2。

---

## 0. 结论摘要

**不能直接上窗口。** 现在开 FORCE 并收紧策略，财务服务会在同一个租户内直接读空、写挂：

1. **代码侧几乎没有租户上下文**：`svc/finance` 全服务只有 **3 处** `Db::scope_with`（[mod.rs#L3034](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L3034)、[operational.rs#L475](file:///Users/air/TOPEMS/svc/finance/src/modules/operational.rs#L475)、[sales_invoice.rs#L927](file:///Users/air/TOPEMS/svc/finance/src/modules/sales_invoice.rs#L927)），
   0 处 `scope_read`。其余 600+ 处连接来源全部是 `PgPool`，取到的新连接**没有 `app.tenant_id`**。
   而 fail-closed 谓词要求 `app.rls_system='on'` 或 `tenant_id = app.tenant_id` 二者之一，否则：`SELECT` 0 行、`INSERT` 42501、`UPDATE`/`DELETE` **静默 0 行**。
2. **603 处是"连接来源"不是 603 条 SQL**：模块层大量是 `FinanceService::new(state.pool.clone(), …)`；
   真正执行 SQL 的还有 `services/finance/` 下 **21 个文件、205 处 `db_pool`**。两层都要改，不能只改模块层。
3. **策略形态全部是"未设即豁免"**：107 张已开 RLS 的表里，18 张是 `USING(true)`（完全放行），
   8 张是两条 permissive 策略 OR 叠加（等于没收紧），80 张带 nil UUID 分支，71 张带列侧 `(tenant_id)::text` cast。
4. **9 张有数据，合计 103 行**；其中两类**全局行是硬约束**：
   `core_finance_report_line_map` 48 行全部 `tenant_id IS NULL`（P3 资产负债表/利润表的行映射模板）、
   `core_finance_currencies` 8 行 `NULL` 全局币种 + 8 行本租户币种（且该表**尚未启用 RLS**）。
   漏掉全局只读策略，上线即"报表无行可出、币种下拉少 8 条"。
5. **跨租户口径只有两处需要拍板**：① `financial_reports` 超管 `tenant_id=None` 的全局汇总（现为隐式跨租户 SUM）；
   ② `erp` 合并抵销扫描 `finance.core_finance_ledger/vouchers` 不带 `tenant_id` 过滤。其余报表/账簿路径已显式按 `tenant_id + company_id` 过滤。
6. **`core_finance_*` 已收敛**：`svc/erp` 生产代码只读 finance 账簿（合并抵销），写 finance 表仅出现在该文件的测试构造代码里。

**上窗口前必须补齐的 5 件事**：① finance 服务 `Db` 注入 + 全链路 scope 化（模块层 + service 层）；
② 全局行只读策略（`report_line_map` 48、`currencies` 8、`cqrs_projection_progress` 的 nil 行）；
③ 跨租户汇总决策（超管全局报表走系统通道还是按租户）；
④ 汇总表/MV 重建路径改系统通道（`mv_voucher_summary` 重建是 `DELETE` + `INSERT`，裸池下会空表）；
⑤ 冻结表清单（104 → 109，见 §2），窗口期不得再漂移。

---

## 1. 取证口径

| 项 | 说明 |
|---|---|
| 表范围 | `pg_class` 中 `nspname='finance' AND relkind='r'`，共 **119** 张 |
| 租户列 | `information_schema.columns` 中 `tenant_id` / `tenant_uid` / `company_id` |
| RLS 状态 | `pg_class.relrowsecurity` / `relforcerowsecurity` |
| 策略 | `pg_policies`（`permissive` 全为 permissive，restrictive=0），按 `qual` 文本归类 |
| 行数 | `DO` 块逐表 `count(*)` 到临时表，一次会话取全 |
| 租户分布 | 对 9 张非空表 `GROUP BY tenant_id` |
| 代码 | `svc/finance/src` 全文检索 + 路由注册表 [modules/mod.rs#L5377-L5401](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L5377-L5401) |
| 基线 | 2026-11-10 读取；与设计文档 2026-11-09 的 104 张口径对照 |

生产 `public.core_tenants` 仍只有 1 行；唯一真实租户 = `00000000-0000-0000-0000-000000000001`（下称 `…0001`）。
因此**跨租户"少读"在数字上看不出来**，验证必须用 `SET LOCAL app.tenant_id='…0002'` 在事务内构造第二身份（不建租户）。

---

## 2. 表数量漂移：104 → 109

| 口径 | A（有租户策略、无 allow_all） | C（`USING(true)`） | D（有 tenant_id、无 RLS） | 合计 |
|---|---:|---:|---:|---:|
| 设计文档 2026-11-09 | 84 | 18 | 2 | **104** |
| 生产实测 2026-11-10 | 89 | 18 | 2 | **109** |

- 另有 **10 张无 `tenant_id` 表**（E 类，本批不处理）：`cqrs_events`、`cqrs_snapshots`、`finance_audit_rules_v`、
  `finance_budget_variances_v`、`finance_cash_flow_predictions_v`、`finance_prediction_models_v`、`finance_u`、`finance_v`、
  `schema_defense_ledger`、`voucher_lines`。其中 `schema_defense_ledger` 1 行，其余 0 行。
- 总表数 119 = 109 + 10。
- **漂移原因**：fin / P3 会话在这两天新增了 5 张带 `tenant_id` 的表（A 类 84→89）。
  **窗口开始前必须重新冻结名单**；本文的 109 张是 2026-11-10 快照。

---

## 3. 逐表矩阵（119 张）

形态代码：
- `ALLOW_ALL` = `USING(true)`，RLS 等于没有；
- `UNSET_ONLY` = 仅 `current_setting IS NULL / = '' / tenant_id IS NULL` 豁免；
- `UNSET+CAST` = 上述豁免 + 列侧 `(tenant_id)::text`，且为**两条 permissive 策略 OR**；
- `NIL+CAST+NULL` = nil UUID 分支 + 未设豁免 + 列侧 cast；
- `NIL+NULL` = nil UUID 分支 + 未设豁免，无 cast；
- `NO_RLS` = 有 `tenant_id` 但未启用 RLS；`NO_TENANT` = 无租户列。

| 表 | tenant_id | RLS | FORCE | 策略数 | 形态 | 行数 | 判定 |
|---|---|---|---:|---:|---|---:|---|
| accounting_subjects | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| budgets | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| core_finance_accounts | 是 | 是 | 是 | 2 | UNSET+CAST | 28 | **有数据** |
| core_finance_approval_nodes | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| core_finance_approval_workflows | 是 | 是 | 是 | 2 | UNSET+CAST | 0 | 空表 |
| core_finance_aux_accounts | 是 | 是 | 是 | 2 | UNSET+CAST | 0 | 空表 |
| core_finance_aux_balances | 是 | 是 | 是 | 2 | UNSET+CAST | 0 | 空表 |
| core_finance_currencies | 是 | **否** | 否 | 0 | NO_RLS | 16 | **有数据（8 全局 NULL + 8 租户）** |
| core_finance_ledger | 是 | 是 | 是 | 2 | UNSET+CAST | 4 | **有数据** |
| core_finance_payment_approval_config | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| core_finance_payment_items | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| core_finance_payment_workflow | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| core_finance_payments | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| core_finance_periods | 是 | 是 | 是 | 2 | UNSET+CAST | 1 | **有数据** |
| core_finance_reconciliation_items | 是 | 是 | 是 | 2 | UNSET+CAST | 0 | 空表 |
| core_finance_reconciliation_sessions | 是 | 是 | 是 | 2 | UNSET+CAST | 0 | 空表 |
| core_finance_report_line_map | 是 | 是 | 是 | 1 | NIL+NULL | 48 | **全局行（全 NULL）** |
| core_finance_voucher_lines | 是 | 是 | 是 | 1 | ALLOW_ALL | 2 | **有数据** |
| core_finance_vouchers | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 1 | **有数据** |
| cqrs_events | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| cqrs_projection_progress | 是 | 是 | 是 | 1 | NIL+NULL | 2 | **内部簿记（nil 租户）** |
| cqrs_snapshots | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| difference_adjustments | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| erp_collection_records | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| erp_payables | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| erp_payment_records | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| erp_receivables | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| expense_approvals | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| expenses | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| finance_alert_configs_v52 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_alert_history_v52 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_anomaly_alerts_v52 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_audit_findings_v52 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_audit_log | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_audit_rules_v | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_audit_rules_v52 | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_budget_variances_v | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_budget_variances_v53 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_cash_flow_predictions_v | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_cash_flow_predictions_v53 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_compliance_issues | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_compliance_reports | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| finance_control_matrices | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| finance_control_points | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| finance_detection_configs_v52 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_prediction_models_v | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_prediction_models_v53 | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| finance_risk_assessments | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| finance_u | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_v | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户 |
| finance_v54_fraud_rules | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_fraud_scores | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_review_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_review_rules | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_review_workflows | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_risk_alerts | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v54_risk_indicators | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_invoice_items | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_invoices | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_payment_requests | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_payment_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_reconciliation_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v55_reconciliation_rules | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_brackets | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_forms | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_lines | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_plans | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_rates | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v56_tax_suggestions | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_analysis_dimensions | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_analysis_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_forecast_models | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_generated_reports | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_insights | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v57_report_templates | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_cash_pools | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_forecast_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_forecast_scenarios | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_liquidity_targets | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_optimization_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_pool_allocations | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v58_pool_transfers | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_credit_profiles | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_device_profiles | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_fraud_decisions | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_fraud_rules | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_fraud_signals | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_scoring_models | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_stress_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v59_stress_scenarios | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_alert_channels | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_alert_rules | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_alerts | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_decision_results | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_decision_scenarios | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_schedule_dependencies | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_schedule_executions | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_v60_schedule_tasks | 是 | 是 | 是 | 1 | NIL+CAST+NULL | 0 | 空表 |
| finance_voucher_generation_rules | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| finance_voucher_template_lines | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| finance_voucher_templates | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| financial_reports | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表（P3 结果表） |
| mv_receivable_aging | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表（投影） |
| mv_voucher_summary | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表（投影） |
| payables | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| receivables | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| reconcile_items | 是 | **否** | 否 | 0 | NO_RLS | 0 | 空表 |
| reconcile_orders | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| reconciliation_item_snapshots | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| reconciliation_orders | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表 |
| reconciliation_settlement_links | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| reconciliation_snapshots | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| sales_invoices | 是 | 是 | 是 | 1 | UNSET_ONLY | 0 | 空表 |
| schema_defense_ledger | 否 | 否 | 否 | 0 | NO_TENANT | 1 | 无租户 |
| settlement_center_dashboards | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| settlement_snapshots | 是 | 是 | 是 | 1 | ALLOW_ALL | 0 | 空表 |
| source_amount_snapshots | 是 | 是 | 是 | 2 | NIL+CAST+NULL | 0 | 空表 |
| voucher_lines | 否 | 否 | 否 | 0 | NO_TENANT | 0 | 无租户（历史遗留） |
| vouchers | 是 | 是 | 是 | 1 | NIL+NULL | 0 | 空表（历史遗留） |

### 3.1 非空表租户分布（决定全局策略）

| 表 | 行数 | 租户分布 |
|---|---:|---|
| core_finance_accounts | 28 | 全部 `…0001` |
| core_finance_currencies | 16 | **8 × NULL（全局币种）** + 8 × `…0001` |
| core_finance_ledger | 4 | 全部 `…0001` |
| core_finance_periods | 1 | `…0001`（status=open） |
| core_finance_report_line_map | 48 | **全部 NULL（全局模板）** |
| core_finance_voucher_lines | 2 | `…0001` |
| core_finance_vouchers | 1 | `…0001`（status=posted） |
| cqrs_projection_progress | 2 | **nil UUID `…0000`（内部簿记）** |
| schema_defense_ledger | 1 | 无租户列 |

- **不存在任何非 `…0001` 的业务行**；跨租户"少读"在现有数据上看不出来，必须用双身份 SQL 验证。
- 基线（窗口后必须逐项相等）：`ledger` debit=credit=**200.0000**；`accounts` 28；`vouchers` 1（posted）；
  `voucher_lines` 2；`periods` 1（open）；`currencies` 16；`line_map` 48。

---

## 4. 策略形态问题清单

| 形态 | 表数 | 策略数 | 问题 |
|---|---:|---:|---|
| `ALLOW_ALL`（`USING(true)`） | 18 | 18 | 完全无隔离；其中 `core_finance_voucher_lines` **有 2 行真实数据** |
| `UNSET_ONLY` | 1 | 1 | `sales_invoices`：GUC 未设即全放行 |
| `UNSET+CAST`（两策略 OR） | 8 | 16 | 两条 permissive 叠加，宽的那条说了算；含 `accounts`/`ledger`/`periods` |
| `NIL+CAST+NULL` | 63 | 74 | 带 nil UUID 全量分支 + 未设豁免 + 列侧 cast |
| `NIL+NULL` | 17 | 17 | 带 nil UUID 分支；含 `line_map`、`vouchers`、`cqrs_projection_progress` |
| 无策略 / 未启用 RLS | 2 | 0 | `core_finance_currencies`（16 行）、`reconcile_items`（0 行） |

要点：
- **18 张 `ALLOW_ALL` 必须收敛**，否则同名表上再建一条严格策略也会被 OR 放宽。
- **8 张双策略必须合并为一条**；其中 `core_finance_accounts` / `ledger` / `periods` 是核心账簿。
- **80 张带 nil UUID 分支**：`app.tenant_id='…0000'` 即全放行，和 B2 裁决相冲突，必须删除。
- **71 张带列侧 cast**：`(tenant_id)::text = …` 不走索引，B5 后这些表都在百万级以下，但应同批去掉。
- finance **没有硬编码 `…0001` 的策略**（与 `public.core_sessions` 不同）。
- `core_finance_report_line_map` 当前策略同时含 `tenant_id IS NULL` 与 nil 分支；收紧时要**拆成
  「FOR SELECT 全局只读（tenant_id IS NULL）」+「FOR ALL 租户行」两条**，不能简单删 `IS NULL`。

---

## 5. 603 处裸池分布

### 5.1 口径修正

- `state.pool` / `self.pool` 文本命中 **603 处 / 28 文件**。
- 其中 **大量是 `FinanceService::new(state.pool.clone(), …)` 之类的连接传递**，不是 603 条 SQL。
- 真正执行 SQL 的还有 `services/finance/` **21 个文件、205 处 `db_pool`**。
- 全服务 `Db::scope*` 仅 **3 处**（均 `scope_with`），`scope_read` = 0。

### 5.2 模块层逐文件（603 处）

读/写列为文件内 SQL 关键字计数（`SELECT` / `INSERT INTO` / `UPDATE schema.table` / `DELETE FROM`），近似但足以判方向。

| 文件 | 裸池 | SELECT | INSERT | UPDATE | DELETE | 入口 |
|---|---:|---:|---:|---:|---:|---|
| modules/mod.rs | 175 | 33 | 8 | 7 | 2 | HTTP（主 router + 内联 SQL） |
| modules/financial_reports.rs | 48 | 24 | 1 | 0 | 0 | HTTP |
| modules/sales_invoice.rs | 28 | 21 | 3 | 8 | 1 | HTTP |
| modules/decision_v60.rs | 25 | 18 | 7 | 8 | 0 | HTTP |
| modules/operational.rs | 24 | 12 | 4 | 2 | 0 | HTTP |
| modules/risk_v59.rs | 23 | 18 | 8 | 1 | 0 | HTTP |
| modules/treasury_v58.rs | 22 | 14 | 7 | 1 | 0 | HTTP |
| modules/reports_v57.rs | 21 | 8 | 13 | 2 | 0 | HTTP |
| modules/settlement_v55.rs | 21 | 13 | 9 | 5 | 0 | HTTP |
| domain/pg_materialized_views.rs | 20 | 12 | 2 | 0 | 2 | 事件投影（后台） |
| modules/settlement_center/handlers.rs | 19 | 0 | 0 | 0 | 0 | HTTP（SQL 在 service.rs） |
| modules/tax_v56.rs | 19 | 15 | 4 | 5 | 0 | HTTP |
| modules/voucher_template.rs | 18 | 7 | 0 | 0 | 0 | **无调用方** |
| modules/compliance_v51.rs | 16 | 15 | 5 | 2 | 0 | HTTP |
| modules/audit_v52.rs | 15 | 24 | 5 | 0 | 0 | HTTP |
| modules/risk_v54.rs | 14 | 13 | 5 | 4 | 0 | HTTP |
| modules/reconciliation.rs | 13 | 0 | 0 | 0 | 0 | HTTP（SQL 在 service） |
| modules/voucher_template_entries.rs | 13 | 9 | 1 | 0 | 1 | **无调用方** |
| domain/pg_event_store.rs | 12 | 12 | 2 | 0 | 0 | CQRS/事件 |
| modules/forecasting.rs | 12 | 0 | 0 | 0 | 0 | HTTP（`_service` 桩，未真正查库） |
| modules/reconcile_orders.rs | 12 | 10 | 2 | 5 | 0 | HTTP |
| modules/forecast_v53.rs | 9 | 6 | 3 | 0 | 0 | HTTP |
| modules/accounting_subjects.rs | 7 | 5 | 1 | 0 | 0 | HTTP |
| domain/async_projector.rs | 6 | 2 | 1 | 3 | 0 | 后台（**唯一在事务内设 GUC**） |
| modules/currencies.rs | 5 | 2 | 1 | 0 | 1 | HTTP |
| modules/report_center.rs | 3 | 0 | 0 | 0 | 0 | HTTP（委托 service） |
| modules/bootstrap.rs | 2 | 2 | 0 | 0 | 0 | HTTP（已挂载） |
| shared/mod.rs | 1 | 0 | 0 | 0 | 0 | `FromRef`，非查询 |
| **合计** | **603** | | | | | |

### 5.3 服务层（SQL 真正落点，205 处 `db_pool`）

| 文件 | db_pool | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|---:|
| services/finance/voucher.rs | 36 | 27 | 8 | 11 | 2 |
| services/finance/reconciliation.rs | 33 | 20 | 2 | 7 | 0 |
| services/finance/voucher_template.rs | 15 | 6 | 3 | 0 | 2 |
| services/finance/payment_workflow.rs | 14 | 8 | 1 | 2 | 0 |
| services/finance/periods.rs | 14 | 8 | 6 | 2 | 0 |
| services/finance/voucher_generation.rs | 14 | 6 | 3 | 1 | 1 |
| services/finance/payment.rs | 13 | 10 | 3 | 2 | 2 |
| services/finance/report.rs | 10 | 23 | 0 | 0 | 0 |
| services/finance/aux_accounts.rs | 7 | 6 | 1 | 0 | 0 |
| services/finance/payable.rs | 7 | 7 | 1 | 0 | 0 |
| services/finance/payment_record.rs | 7 | 3 | 1 | 0 | 0 |
| services/finance/receivable.rs | 7 | 7 | 1 | 0 | 0 |
| services/finance/approval_configs.rs | 6 | 3 | 3 | 0 | 2 |
| services/finance/collection.rs | 6 | 3 | 1 | 0 | 0 |
| services/finance/u8_import.rs | 6 | 3 | 1 | 0 | 0 |
| services/finance/account.rs | 5 | 4 | 1 | 0 | 0 |
| services/finance/mod.rs | 3 | 0 | 0 | 0 | 0 |
| services/finance/aging.rs | 2 | 2 | 0 | 0 | 0 |
| services/finance/database.rs | 2 | 5 | 0 | 0 | 0 |
| services/mod.rs | 2 | 0 | 0 | 0 | 0 |

> 结论：**只改模块层的 `state.pool.clone()` 不足以产生租户上下文**。`FinanceService` 持有 `PgPool`
> （[services/finance/mod.rs#L5-L39](file:///Users/air/TOPEMS/svc/finance/src/services/finance/mod.rs#L5-L39)），
> 必须把 `db: Db` 注入 service，并让每个读写方法走 `scope_read` / `scope`。

### 5.4 四类入口

| 类别 | 模块 | 说明 |
|---|---|---|
| **HTTP 活链路** | `mod.rs` + 20 个已 `merge` 的子模块（compliance_v51、audit_v52、forecast_v53、risk_v54、settlement_v55、sales_invoice、settlement_center、tax_v56、reports_v57、treasury_v58、risk_v59、decision_v60、reconcile_orders、reconciliation、operational、report_center、forecasting、bootstrap、financial_reports、accounting_subjects、currencies）+ `nest("/cqrs")` + `event_routes` | 路由见 [mod.rs#L5377-L5401](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L5377-L5401)；租户中间件只负责 claims，不负责给裸连接设 GUC |
| **后台/定时** | `domain/async_projector.rs`（启动即 `start_async_projection`）、`modules/bootstrap.rs` 的启动辅助、`main.rs` 15s 事件重试 | `async_projector` 在 `self.pool.begin()` 后执行 `set_config('app.tenant_id',$1,true)`（[async_projector.rs#L100-L113](file:///Users/air/TOPEMS/svc/finance/src/domain/async_projector.rs#L100-L113)），是**唯一正确的后台范式**，应复用 |
| **事件消费者** | `event_handlers/mod.rs`（`start_event_subscribers`，自动凭证）+ `domain/pg_event_store.rs` + `domain/pg_materialized_views.rs` | 自动凭证在 `self.db.begin()` 后**没有设 GUC**（[event_handlers/mod.rs#L227-L297](file:///Users/air/TOPEMS/svc/finance/src/event_handlers/mod.rs#L227-L297)）；投影 `rebuild()` 直接 `DELETE FROM mv_voucher_summary`（[pg_materialized_views.rs#L200-L205](file:///Users/air/TOPEMS/svc/finance/src/domain/pg_materialized_views.rs#L200-L205)） |
| **无调用方** | `modules/voucher_template.rs`、`modules/voucher_template_entries.rs`、`shared/mod.rs` 的 `FromRef` | 前两者没有 `create_routes()`，handler 仅出现在 `main.rs`/`openapi.rs` 的文档清单里；实际生效的是 `mod.rs` 内同名实现（路由 `/voucher-templates*`，[mod.rs#L5554-L5581](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L5554-L5581)） |

---

## 6. 六条关键业务路径

| # | 路径 | HTTP 入口 | 调用链 | 涉及表（读/写） | scope | 开 FORCE 后失败形态 |
|---|---|---|---|---|---|---|
| 1 | 凭证创建 | `POST /vouchers`（mod.rs 主 router）；`POST /cqrs/commands/create-voucher`（[cqrs_routes.rs#L54-L107](file:///Users/air/TOPEMS/svc/finance/src/modules/cqrs_routes.rs#L54-L107)） | handler → `FinanceService::create_voucher`（[voucher.rs#L48-L138](file:///Users/air/TOPEMS/svc/finance/src/services/finance/voucher.rs#L48-L138)） | accounts（读）、periods（读）、vouchers（写）、voucher_lines（写）、cqrs_events（写，无租户） | 否（裸池 + 显式 `tenant_id=$1`） | 科目/期间读 0 行 → 校验失败"缺少科目/期间未开"；vouchers/lines INSERT → **42501** |
| 2 | 凭证过账 | `POST /vouchers/{id}/post`（mod.rs 主 router） | handler → `voucher.rs` `UPDATE ... SET status='posted'` | vouchers（写）、ledger（写）、voucher_lines（读） | 否 | UPDATE **静默 0 行** → 接口返回成功但状态不变；ledger INSERT → 42501 |
| 3 | 期末结账/年结 | `POST /periods/close`、`POST /year-end-close`（[mod.rs#L5695-L5699](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L5695-L5699)，handler [mod.rs#L3991-L4016](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L3991-L4016)） | `FinanceService` → [periods.rs#L220-L319](file:///Users/air/TOPEMS/svc/finance/src/services/finance/periods.rs#L220-L319) | periods（读写）、vouchers/ledger（写结转凭证） | 否 | **最危险**：`UPDATE periods SET status='closed'` 静默 0 行，接口"成功"但期间未关；结转凭证 INSERT 42501 |
| 4 | 科目余额表 | `GET /reports/account-balance`（financial_reports router） | `get_account_balance_report`（[financial_reports.rs#L355-L367](file:///Users/air/TOPEMS/svc/finance/src/modules/financial_reports.rs#L355-L367)） | ledger（读）、accounts（读） | 否 | 读 0 行 → **报表全 0/空白**，无报错 |
| 5 | 资产负债表/利润表 | `GET /reports/statutory`（report.rs） | `get_statutory_reports`（[report.rs#L586-L656](file:///Users/air/TOPEMS/svc/finance/src/services/finance/report.rs#L586-L656)） | line_map（读）、ledger（读）、accounts（读）、`erp.opening_balances`（读） | 否 | line_map 若未登记全局只读 → **报表无行可出**；ledger 读 0 行 → 金额全 0/数字错 |
| 6 | 期初余额 | `GET /opening-balances`（[mod.rs#L4124-L4235](file:///Users/air/TOPEMS/svc/finance/src/modules/mod.rs#L4124-L4235)） | handler 直接查询 | `erp.opening_balances`（读，**非 finance schema，B5 不改**） | 否 | 本批不直接受影响；但 erp 侧 RLS 在 B6 收紧后会以同样方式读空 |
| 7 | 映射表 | 随报表读取；模板维护走 `finance_voucher_templates` 等 | `report.rs` 的 `line_map` 子查询 | line_map（读，48 行全 NULL） | 否 | 未加全局只读 → P3 三张报表全空 |
| 8 | 自动凭证 | 业务事件 → `event_handlers` | `start_event_subscribers` → 自动凭证事务（[event_handlers/mod.rs#L215-L300](file:///Users/air/TOPEMS/svc/finance/src/event_handlers/mod.rs#L215-L300)） | accounts（读）、vouchers（写）、voucher_lines（写） | 否（有事务但无 GUC） | accounts 读 0 行 → `缺少会计科目…拒绝生成`；vouchers INSERT → **42501**，事件被重试 |

补充：
- CQRS 路径额外写 `cqrs_events` / `cqrs_snapshots`（无 `tenant_id`，不在 B5 范围），但 `cqrs_projection_progress` 是 nil 租户行，收紧后会不可见。
- `financial_reports` 结果表当前 0 行，但每次报表生成都会写；P3 公司维度迁移见 §9。

---

## 7. 失败形态归纳

| SQL | 无租户上下文时 | 业务表现 |
|---|---|---|
| `SELECT` | 0 行 | 列表/详情空白、报表全 0、下拉缺项；**无错误码**，监控看不出来 |
| `INSERT` | `42501 new row violates row-level security policy` | 接口 500；事件消费者重试 |
| `UPDATE` / `DELETE` | **影响 0 行，不报错** | "结账成功"但期间没关、"过账成功"但状态没变、删除无效果 |
| 物化/汇总重建 | `DELETE` 0 行 + `INSERT` 42501 | 汇总表被清空或重建失败（`mv_voucher_summary`） |
| `REFRESH`/自定义投影 | 读基表 0 行 | 投影表写空 |

---

## 8. 跨租户 / 全局口径

| 位置 | 现状 | 开 FORCE 后 | 处理建议 |
|---|---|---|---|
| [financial_reports.rs#L103-L125](file:///Users/air/TOPEMS/svc/finance/src/modules/financial_reports.rs#L103-L125) `period_net_total` | `($1::uuid IS NULL OR tenant_id = $1)`；超管传 `None` → **跨租户 SUM** | 裸池无 GUC → 0 行，超管报表直接空 | 明确"超管全局视图"是否保留；保留则走 `scope_read_system()`，否则改为按当前租户 |
| [financial_reports.rs#L164-L168](file:///Users/air/TOPEMS/svc/finance/src/modules/financial_reports.rs#L164-L168) | `is_superuser ? None : tenant_id` | 同上 | 与上一行同一决策 |
| [report.rs#L586-L656](file:///Users/air/TOPEMS/svc/finance/src/services/finance/report.rs#L586-L656) 法定报表 | 显式 `tenant_id=$1 AND company_id=$2` | 加 GUC 后正常；不加则 0 行 | 随主链路 scope 化即可，不需要跨租户通道 |
| [elimination_flow.rs#L372-L398](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_flow.rs#L372-L398) P4 抵销扫描 | 读 `finance.core_finance_ledger/vouchers`，**无 tenant_id 过滤**；走 erp 中间件事务 | 若事务已设 GUC → 只看到本租户，**同一租户内按 company 的合并正常**；若跨租户合并 → **少读** | 先确认合并范围是否可能跨租户；跨租户必须显式系统通道，禁止靠"未设即豁免" |
| [pg_materialized_views.rs#L35-L95](file:///Users/air/TOPEMS/svc/finance/src/domain/pg_materialized_views.rs#L35-L95) 投影查询 | `SELECT ... FROM mv_voucher_summary` **完全无 tenant 过滤** | 0 行；且当前是跨租户可见的隐患 | 改成按租户作用域 + 系统通道重建 |
| `core_finance_report_line_map` 48 行 | 全 `tenant_id IS NULL` | 收紧后 P3 资产负债表/利润表**无行可出** | 登记为全局只读（`FOR SELECT USING (tenant_id IS NULL)`） |
| `core_finance_currencies` 16 行 | 8 全局 + 8 租户，**未启用 RLS** | 首次启用若只按租户 → 币种少 8 条 | 同上，全局只读 + 租户写 |
| `cqrs_projection_progress` 2 行 | 租户为 nil `…0000`（不是 NULL） | 收紧后不可见 | 迁 NULL 或走系统通道；不能用 `IS NULL` 全局策略覆盖 |

> 未发现"集团口径跨租户合并"的代码实现。P4 的 `consolidation_scopes` 按公司组织，语义上是**租户内多公司合并**；
> 若产品上存在"跨租户集团"，当前代码并没有显式支持，需产品确认后再定。

---

## 9. `erp` 侧残留写入与 P3/P4 交叉

| 项 | 结论 | 证据 |
|---|---|---|
| erp 写 finance 生产表 | **没有生产写入**。`svc/erp/src` 对 `finance.` 的引用共 8 处：合并扫描读 2 处、注释 1 处、模型注释 1 处，其余 4 处均在 `elimination_flow.rs` 的测试构造里 | [elimination_flow.rs#L382-L383](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_flow.rs#L382-L383)、[L1144-L1232](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_flow.rs#L1144-L1232) |
| 账簿收敛 | `core_finance_vouchers` 的唯一生产写点是 finance（REST + 自动凭证事件） | [voucher.rs#L78-L118](file:///Users/air/TOPEMS/svc/finance/src/services/finance/voucher.rs#L78-L118)、[event_handlers/mod.rs#L229-L297](file:///Users/air/TOPEMS/svc/finance/src/event_handlers/mod.rs#L229-L297) |
| P3 报表 | 迁移已把 `financial_reports` 从租户级收敛到 `(tenant_id, company_id, period)`；多主体租户无法自动归属时报错 | [20261109110200_p3_financial_reports_company.sql#L19-L84](file:///Users/air/TOPEMS/database/migrations/20261109110200_p3_financial_reports_company.sql#L19-L84) |
| P4 抵销 | 抵销候选写 `erp.elimination_candidates`（非 finance），扫描读 finance 账簿；`tenant_id` 由 GUC 回填 | [elimination_flow.rs#L420-L447](file:///Users/air/TOPEMS/svc/erp/src/modules/consolidation/elimination_flow.rs#L420-L447) |
| 期间结账 | 与 P3 共用 `core_finance_periods`；结账/年结都走 finance service 裸池 | [periods.rs#L220-L319](file:///Users/air/TOPEMS/svc/finance/src/services/finance/periods.rs#L220-L319) |

交叉风险：
- **P3 先上、B5 后上**：P3 的 `financial_reports` 写入在裸池下会 42501；若 P3 已上线，B5 收紧后报表生成会整体失败。
- **P4 先上、B5 后上**：抵销扫描在 erp 事务内（GUC 由 erp 中间件设置），B5 收紧后**同一租户内不受影响**；若 erp 事务未设 GUC，会静默 0 行。
- **期间结账**：`UPDATE` 静默 0 行是最难发现的失败，必须用 SQL 断言 `periods.status` 变化，不能只看 HTTP 200。

---

## 10. 分批建议

> **硬前置（所有批次共同）**：`svc/finance` 完成 `Db` 注入与全链路 scope 化。
> 没有这一步，任何一张有数据的表开 FORCE 都会读空/写挂；空表则会在首次写入时报 42501。
> 因此下表的"先开"仅指**代码改造完成之后**的批次顺序，不代表现在可以开。

| 批次 | 表集 | 表数 | 迁移笔数 | 验证口径 | 回滚 |
|---|---|---:|---:|---|---|
| **B5-1a 空表/新功能** | `finance_v5*`（v52–v60，57 张）+ `reconcile_items` + `sales_invoices` | 59 | 1 正向 + 1 回滚 | 结构断言 + 各模块 2 读 1 写冒烟；空表读仍为空、写不 42501；确认 v5x 功能在生产无流量或已验收 | `w7_b5_rollback_1a.sql`：恢复原策略（含 `USING(true)`），`NO FORCE` 兜底 |
| **B5-1b 其余空表** | 除核心/全局/投影外的空表（含 reconciliation/approval/audit/compliance 等） | 39 | 1 正向 + 1 回滚 | 同上；重点 `reconciliation_*`、`settlement_*`、`erp_*` 的写端点 | `w7_b5_rollback_1b.sql` |
| **B5-2 全局行/字典** | `core_finance_currencies`（首次启用 RLS）、`core_finance_report_line_map`、`core_finance_accounts` | 3 | 1 正向 + 1 回滚（+1 可选索引迁移） | 币种 16 行（8 全局 + 8 租户）可见；line_map 48 行可见；P3 资产负债表/利润表金额与基线一致；accounts 28 行 | `w7_b5_rollback_2.sql`；紧急 `ALTER TABLE ... NO FORCE` |
| **B5-3 核心账簿** | `core_finance_ledger`、`core_finance_vouchers`、`core_finance_voucher_lines`、`core_finance_periods`、`cqrs_projection_progress`、`financial_reports`、`mv_receivable_aging`、`mv_voucher_summary` | 8 | 1 正向 + 1 回滚 | 凭证创建→过账→查询；期间结账后 `periods.status` 实际变化；报表金额 = 基线（ledger 200/200）；投影重建后行数正确；CQRS 进度可读 | `w7_b5_rollback_3.sql` |

合计：**109 张表**，4 个批次，**8 笔迁移**（4 正向 + 4 回滚），可选 1 笔 `line_map(tenant_id, report_type, sort_no)` 索引迁移。

### 10.1 验证 SQL（每批必跑，应用角色 `topems_prod`，禁止超户）

1. **结构断言**：109 张 `relrowsecurity=t AND relforcerowsecurity=t`；每表 1 条策略（全局表 2 条）；
   无 `USING(true)`、无 nil UUID 分支、无 `(tenant_id)::text`、无硬编码 `…0001`、无 `IS NULL`（全局只读表除外）。
2. **双身份**（生产只有 1 个租户，用事务内 GUC 模拟）：
   ```sql
   BEGIN;
   SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
   SELECT count(*) FROM finance.core_finance_accounts;   -- 期望 28
   SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000002';
   SELECT count(*) FROM finance.core_finance_accounts;   -- 期望 0
   ROLLBACK;
   ```
3. **系统通道**：`SET LOCAL app.rls_system='on'` 时可读全局行（line_map 48 / currencies 8）。
4. **写探测（事务内 ROLLBACK）**：本租户 INSERT 成功、跨租户 INSERT 42501、跨租户 UPDATE 影响 0 行。
5. **业务冒烟**：凭证创建→过账→查询；`POST /periods/close` 后 SQL 复核 `status`；三张报表金额对比基线；
   `mv_*` 重建后行数一致。
6. **失败判定**：任一读端点 0 行（空表除外）、任一写 42501、报表金额变化、结账状态未变，立即执行回滚脚本。

### 10.2 回滚路径

- **窗口前**：把 109 张表的 `pg_get_expr(polqual, polrelid)` / `pg_get_expr(polwithcheck, polrelid)` 导出为
  `w7_b5_policy_snapshot_<batch>.sql`，回滚脚本据此重建原策略，**不依赖记忆**。
- **紧急**：`ALTER TABLE finance.<t> NO FORCE ROW LEVEL SECURITY;`（owner 即应用角色，立即恢复绕过）；
  或整批 `DO` 循环对所有表 `NO FORCE`。
- **完整**：执行对应批次的 `w7_b5_rollback_*.sql`（DROP 新策略 → 重建旧策略 → 可选 `DISABLE RLS`）。
- **数据**：本批只做 DDL 与策略，不改数据；回滚不需要数据补偿。

---

## 11. 风险与依赖

| 风险 | 说明 | 处置 |
|---|---|---|
| **代码未改造** | 603 处连接来源 + 205 处 service `db_pool`，仅 3 处 scope | 硬前置；不能靠"先开空表"绕过 |
| **全局行遗漏** | line_map 48 / currencies 8 / cqrs nil 2 | 全局只读策略 + 登记表；P3 报表专项验证 |
| **UPDATE 静默 0 行** | 结账/过账/删除类接口返回成功但无效果 | 验证必须看 SQL 后置状态，不能只看 HTTP 200 |
| **投影重建** | `mv_*` 先 DELETE 后 INSERT，裸池下清空 | 重建改系统通道；开 FORCE 前先跑一次重建基线 |
| **跨租户超管报表** | `period_net_total` 超管 `None` | 产品决策：系统通道 or 按租户 |
| **P4 合并** | erp 扫描 finance 账簿无 tenant 过滤 | 确认合并范围是否跨租户；同租户内随 erp 事务 GUC 正常 |
| **P3 报表** | `financial_reports` 已加 company_id；结果表由 finance 写 | B5-3 与 P3 同批验收；金额必须与基线一致 |
| **表清单漂移** | 104 → 109（2 天 +5） | 窗口前重新冻结；迁移脚本用显式表清单，禁止 `DO` 全 schema 扫描 |
| **单租户假象** | 生产只有 `…0001`，跨租户少读看不出来 | 所有隔离断言用 `SET LOCAL app.tenant_id='…0002'` 构造第二身份 |
| **erp 残留写** | 生产无；测试代码有 INSERT finance 表 | 无需处理，但窗口前确认测试代码不随生产构建执行 |

---

## 12. 结论

**能不能直接上窗口：不能。**

缺的四件事，按优先级：

1. **代码改造**（阻塞全部批次）：`svc/finance` 注入 `Db`，把 `services/finance/` 21 个文件的 `db_pool`
   改为 `Db::scope_read()` / `Db::scope()`；模块层只保留参数传递。后台/事件路径复用
   `async_projector` 的"事务内 `set_config`"范式，或显式走 `scope_system`。
2. **全局行策略**（阻塞 B5-2/B5-3）：`core_finance_report_line_map` 48 行、`core_finance_currencies` 8 行、
   `cqrs_projection_progress` 的 nil 行，必须有登记与只读策略，否则 P3 报表和币种目录上线即缺数据。
3. **跨租户口径决策**（阻塞 B5-3）：超管全局报表是否保留跨租户视图；P4 合并范围是否可能跨租户。
4. **表清单冻结 + 验证脚本**（窗口前置）：以 109 张为准重新冻结；准备结构断言、双身份、写探测、报表基线四套 SQL。

完成 1–3 后，按 B5-1a → B5-1b → B5-2 → B5-3 推进，每批独立窗口、独立回滚快照。
在此之前，**B5 不具备上窗口条件**。
