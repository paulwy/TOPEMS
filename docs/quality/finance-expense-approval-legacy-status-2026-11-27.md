# Finance 费用审批：历史状态别名 `pending_approval` 的列表/流转/软删口径（W5-B / B361）

- 日期：2026-11-27
- 范围：`svc/finance/src/modules/expense_status.rs`、`svc/finance/src/modules/mod.rs`
- 基线：`main` @ `88922884f`

## 缺口

`ExpenseApprovalStatus::from_db_str` 已经把历史前端写法 `pending_approval` 归一为 `pending`（`normalize` 同理），但 SQL 侧**只按规范值匹配**：

| 入口 | 原行为 | 后果 |
| --- | --- | --- |
| `GET /expense-approvals`（无 `status`） | `status = ANY(DB_VALUES)`，`DB_VALUES` 只有 `pending` | 库内 `pending_approval` 行**列不出来**（既不在筛选结果，也不进 `total`） |
| `GET /expense-approvals?status=pending` | 只匹配 `pending` | 同上，旧数据在 UI 里彻底消失 |
| `PUT /expense-approvals/{id}` | `AND status = $15`，绑定的是归一后的 `pending` | 旧行**永远更新不了** → 409「当前状态不允许该操作」，无法提交/审批/驳回 |
| `POST .../submit|approve|reject|reimburse` | `AND status = $2`，绑定规范起始态 | 同上，旧行状态流转被卡死 |
| `DELETE /expense-approvals/{id}` | `status = ANY(DELETABLE)`（`draft/pending/rejected`） | 旧行软删返回 409 |

本机库现状：`finance.expense_approvals` 178 行全为 `pending`、0 行 `pending_approval`，所以这是**生产遗留数据**口径问题，本机无数据可复现，但旧前端确实写过该值（代码注释与 `normalize` 别名即为证据）。

## 修复

1. `ExpenseApprovalStatus` 新增 `legacy_aliases()`（`Pending → ["pending_approval"]`）与 `raw_values_for(&[&str])`：把「规范值 + 各自别名」展开、排序、去重，供 SQL 绑定。
2. 列表：无 `status` → `raw_values_for(DB_VALUES)`（5 规范值 + 别名）；指定状态 → `raw_values_for([status])`。列表与 `COUNT(*)` 共用同一组绑定值，`total` 不会与 `items` 不一致。
3. 通用更新：`AND status = ANY($14)` 绑定「目标态允许的起始态 + 别名」，`AND status = ANY($15)` 绑定「当前态 + 别名」——旧行可正常字段编辑/状态流转。
4. 状态流转（`transition_expense_approval`）：`AND status = $2::varchar` → `AND status = ANY($2::text[])`，绑定起始态 + 别名。
5. 软删：绑定 `raw_values_for(DELETABLE)`，旧 `pending_approval` 行可删。

## 验证

- `cargo check -p topems-finance`：`Finished`。
- `cargo test -p topems-finance --lib expense_status`：9 passed（新增 `approval_legacy_alias_is_listed_and_flowable` 覆盖：`pending → [pending, pending_approval]`、全量 6 值集合、软删集合 `[draft, pending, pending_approval, rejected]`、终态 `reimbursed` 不含别名）。
- 全量 `--lib`：见提交日志。
- `clippy -D warnings`：见提交日志。

## 遗留

- `finance.expense_approvals.status` / `finance.expenses.status` 仍是自由文本，无 CHECK；别名治理只是代码侧兼容。DB 约束与历史数据清洗需迁移窗口（并行 agent 高频覆盖迁移，本批不做）。
- `list_expenses` 早已按 `ExpenseStatus::legacy_aliases()` 处理 `pending`（B351），本批未重复改动。
