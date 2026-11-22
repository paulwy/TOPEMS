# B143 · 财务 v60/v56/v57 五列状态批量收口

日期：2026-11-22

## 范围

- `finance.finance_v60_decision_scenarios.status`
- `finance.finance_v60_schedule_tasks.status`
- `finance.finance_v56_tax_forms.status`
- `finance.finance_v56_tax_plans.status`
- `finance.finance_v57_generated_reports.status`

本地与生产快照五表均 0 行；五列均 `NOT NULL`，无状态 CHECK。

## 代码改动

- `decision_v60::DecisionStatus`：补 `DB_VALUES = draft/active/evaluated/archived`、`DEFAULT = Draft`、`from_db_str`，`from_str` 委托。
- `decision_v60::ScheduleTaskStatus`：补 `DB_VALUES = pending/running/paused/completed/failed`、`DEFAULT = Pending`、`from_db_str`，`from_str` 委托。
- `tax_v56::TaxFormStatus`：补 `DB_VALUES = draft/calculated/submitted/accepted/rejected`、`DEFAULT = Draft`、`from_db_str`，`from_str` 委托。
- `tax_v56::TaxPlanStatus`：补 `DB_VALUES = draft/proposed/under_review/approved/rejected/executed`、`DEFAULT = Draft`、`from_db_str`，`from_str` 委托。
- `reports_v57::ReportStatus`：补 `DB_VALUES = pending/generating/completed/failed`、`DEFAULT = Pending`、`from_db_str`，`from_str` 委托。
- 既有写入口保持枚举绑定；调度列表/更新已按 `ScheduleTaskStatus` 严格解析，税务与 v57 报表列表非法值 400，行为不变。

## 本地应用

候选：`docs/database/finance-v60-tax-v57-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务应用五个 `NOT VALID` 约束，默认保持 `draft/pending` 口径；五表仍 0 行。生产快照未修改；正式窗口逐条 `VALIDATE`。

## 队列刷新

`status-db-check-mappings.json` 补齐 B140～B143 共 11 个枚举→表列映射并重算队列：`resolved_enums` 由 112 升至 122。

## 门禁

- finance clippy 通过；`cargo test -p topems-finance --lib` 1111 passed / 0 failed / 1 ignored。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。
