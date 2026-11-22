# B140 · 财务费用审批状态收口

日期：2026-11-22

## 目标

`finance.expense_approvals.status` 统一到唯一 `ExpenseApprovalStatus` 口径，读侧严格解析、写侧限定起始态与迁移，候选 CHECK 在本地实际应用。

## 收口前

- 本地 178 行，全部 `pending`；列 nullable、默认 `pending`，无 CHECK。
- 生产快照未应用，本轮不修改。
- 代码已有 `ExpenseApprovalStatus::{Draft,Pending,Approved,Rejected,Reimbursed}` 与 `normalize`，但列表过滤直接绑定原始字符串，非法值返回空列表；COUNT 未带 search/status；详情不校验库值；新建默认 `Pending` 且允许客户端直接指定 `Approved/Rejected/Reimbursed`；通用 `PUT` 允许任意跳变。
- 前端 `expenseApproval.ts` 的 `statusBadge.colorMap/labelMap` 仍以旧键 `pending_approval` 为键，与后端规范 `pending` 错位。

## 代码改动

1. `svc/finance/src/modules/expense_status.rs`
   - 新增 `DB_VALUES` 五值、`DEFAULT = Draft`、`from_db_str`、`allowed_from`。
   - `allowed_from`：Draft→[draft]；Pending→[draft,pending]；Approved→[pending,approved]；Rejected→[pending,rejected]；Reimbursed→[approved,reimbursed]。
   - 单测覆盖五值往返、默认与迁移边界。

2. `svc/finance/src/modules/mod.rs`
   - 列表 `status` 未传时绑定 `ExpenseApprovalStatus::DB_VALUES`，非法值 400；列表与 COUNT 均改 `status = ANY($2::text[])`，COUNT 同步 search/status 条件。
   - 详情读取后严格解析 `status`，缺失或不在规范集合返回 409。
   - 新建默认 `Draft`，仅允许初始 `draft/pending`；`approved/rejected/reimbursed` 直接 400。
   - 通用更新按目标状态绑定 `allowed_from` 起始态集合，SQL 增加 `AND status = ANY($14::text[])`，目标未传时该集合为规范五值，存量非规范状态也会 0 行；0 行先 `guard.take()` + `rollback()` 再 409，防止跳过状态机。
   - 专用 `submit`（Draft→Pending）、`approve`（Pending→Approved）、`reject`（Pending→Rejected）保留既有起始态谓词与 409。

3. `apps/web/src/schemas/finance/expenseApproval.ts`
   - `colorMap/labelMap` 的 `pending_approval` 键改为 `pending`，与后端规范一致；状态选项五值不变。

## 候选与本地应用

候选：`docs/database/finance-expense-approval-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务应用结果：

- `UPDATE ... SET status='draft' WHERE status IS NULL`：0 行。
- 列默认改为 `draft`，`NOT NULL` 已设置。
- 新增 `ck_expense_approvals_status_standard`，五值，`NOT VALID`。
- 178 行数据不变，仍全部 `pending`，无 NULL。
- 事务内把任一存量行改为 `bogus` 实测 23514，未提交。

生产 `topems_prod_verify_20261106` 保持只读；正式窗口执行候选后需 `VALIDATE CONSTRAINT`。

## 门禁

- `cargo clippy -p topems-finance --all-targets -- -D warnings`：通过。
- `cargo test -p topems-finance --lib`：1111 passed / 0 failed / 1 ignored。
- request-txn：1651（基线 1651，未增）。
- scope-api：未标记 176 / `Db::new` 144，未增。
- txn-write-non2xx：通过。
- 盘点：208 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0。
- 队列：144 枚举 / 152 值，分桶一致。
- glossary / i18n 7-in-1：PASS。
- web lint：0 error / 156 warnings；typecheck 通过。

## 行为变化

- 列表 `status` 非法值不再静默返回空列表，改为 400。
- 新建省略 `status` 时由 `pending` 改为 `draft`；显式传 `approved/rejected/reimbursed` 被拒绝。
- 通用 `PUT` 不能把 `pending` 直接改成 `reimbursed`，也不能把 `draft` 直接改成 `approved`，返回 409；`approved → reimbursed` 仍可通过通用更新完成。
- 详情遇到库内非规范状态返回 409，不再原样透出。
