# finance 状态 CHECK 候选迁移与本地演练（W5-B / B19）

- 日期：2026-11-21
- 范围：`docs/database/finance-status-check-candidates-2026-11-21.sql`
- 结论：B4～B16 代码收口的 24 个 finance 状态列，候选 CHECK 全部写成 `NOT VALID`；本地事务内 24 条 ALTER 全部成功，存量更新不报错，非法值写入被 `23514` 拦下，事务已回滚。生产未执行。

## 1. 为什么现在只做候选

- 三方对齐缺的最后一环是 DB 约束，但生产 DDL 需要窗口，且历史行可能有脏值。
- `NOT VALID` 只约束后续写入，不扫描存量，适合“先立规矩、再清存量”。
- 本地演练证明 DDL 可执行、约束真的拦得住非法值，窗口期只需按文件顺序执行。

## 2. 覆盖的 24 列

| 表 | 列 | 唯一集合 |
| --- | --- | --- |
| `receivables` / `payables` | `status` | draft/approved/posted/cancelled |
| `reconcile_orders` | `status` | draft/pending/confirmed/disputed/cancelled |
| `reconcile_items` | `status` | unmatched/matched/disputed |
| `financial_reports` | `status` + `approval_status` | draft/pending/approved/rejected/locked（同值） |
| `erp_collection_records` | `status` | pending/confirmed/written_off（NULL 保留） |
| `core_finance_payments` | `status` | draft/pending/processing/completed/failed/cancelled |
| `core_finance_payment_items` | `write_off_status` | pending/completed（NULL 保留） |
| `reconciliation_settlement_links` | `status` | linked/cancelled |
| `reconciliation_item_snapshots` | `match_status` | unmatched/matched/diff/manual（NULL 保留） |
| `difference_adjustments` | `status` | pending/approved/rejected |
| `finance_v60_decision_scenarios` | `status` | draft/active/evaluated/archived |
| `finance_v60_schedule_tasks` | `status` | pending/running/paused/completed/failed |
| `finance_v60_schedule_executions` | `status` | pending/running/completed/failed/cancelled |
| `finance_v54_review_workflows` | `status` | pending/in_progress/completed/rejected |
| `finance_v55_invoices` | `status` | pending/recognized/verified/posted |
| `finance_v55_payment_results` | `status` | pending/processing/completed/failed/reversed |
| `finance_v55_reconciliation_results` | `match_status` | matched/partial/unmatched/discrepancy |
| `finance_v56_tax_forms` | `status` | draft/calculated/submitted/accepted/rejected |
| `finance_v56_tax_plans` | `status` | draft/proposed/under_review/approved/rejected/executed |
| `finance_v57_generated_reports` | `status` | pending/generating/completed/failed |
| `finance_v58_pool_transfers` | `status` | pending/completed/failed |
| `expense_approvals` | `status` | draft/pending/approved/rejected/reimbursed（NULL 保留） |
| `expenses` | `status` | draft/submitted/approved/rejected/paid（NULL 保留） |

可空列的 NULL 在 Postgres CHECK 中按 unknown 处理（通过），文件里对 5 个可空列额外写了显式 `IS NULL OR ...`，便于评审时一眼看出“允许空”。

## 3. 本地现状盘点（预检全 0 违例）

| 表 | 行数 / 分布 |
| --- | --- |
| `erp_collection_records` | 553：351 NULL + 202 pending |
| `core_finance_payments` | 1：completed |
| `expense_approvals` | 178：pending |
| `expenses` | 3：pending |
| 其余 20 张表 | 0 行 |

## 4. 演练结果

```text
BEGIN + app.rls_system=on
\i 第 1 节（24 条 ALTER ... NOT VALID）      → 24 次 ALTER TABLE 成功
pg_constraint 校验                          → 24 条新约束全部在位
UPDATE core_finance_payments SET status=status → UPDATE 1（存量合法行不被 NOT VALID 拦截）
INSERT difference_adjustments(status='bogus')  → ERROR 23514，被 difference_adjustments_status_check 拦下
（连接终止 → 事务回滚）
```

回滚后复查 `pg_constraint`：`difference_adjustments_status_check`、`core_finance_payments_status_check` 均 0，本地库未被修改。

## 5. 窗口执行顺序

1. 跑文件第 0 节预检，每条必须 0 行；非 0 先清洗（清洗口径见各批次证据文档的别名表）。
2. 生产事务内执行第 1 节。
3. 观察一个发布周期，确认应用不再尝试写旧值（旧会被 23514 拦下并触发 500，日志可查）。
4. 对核心表 `VALIDATE CONSTRAINT`（会扫描存量，需短锁）。

## 6. 遗留

- 未新增 `database/migrations/` 文件：迁移会在部署链自动应用，等同生产 DDL，须走窗口，因此候选只落在 `docs/database/`。
- `core_finance_payment_workflow.status` 不在此次候选内，它是外部工作流引擎投影（`instance.status` 自由字符串）。
- 孤儿表 `finance.vouchers.status`（0 行、默认 `posted`）未加约束，待死表治理确认后处理。
- 生产各表状态分布未知，必须在窗口前用第 0 节在生产快照库跑一遍。
