# finance 费用状态单一源（B3 无约束列第一批）

## 1. 现状

`finance.expense_approvals.status` 与 `finance.expenses.status` 都是自由文本列，
DB 默认值 `pending`，没有 CHECK。实际写入方有三套口径：

| 来源 | 值 |
| --- | --- |
| DB 默认 / 后端创建 | `pending` |
| 后端费用审批/报销更新 | 请求体任意字符串 |
| 前端费用审批表单 | `draft / pending_approval / approved / rejected / reimbursed` |

本地数据（2026-11-21）：`expense_approvals` 178 行、`expenses` 3 行全部 `pending`，
没有 `pending_approval`。两张表生命周期不同：审批表用
`draft/pending/approved/rejected/reimbursed`，报销表用
`draft/submitted/approved/rejected/paid`。

另有两个纯回显桩：`submit` 返回 `submitted`、`approve`/`reject` 返回目标状态，
但不写库，前端会收到成功。

## 2. 定稿集合

`svc/finance/src/modules/expense_status.rs` 按表分开：

- `ExpenseApprovalStatus`（`expense_approvals`）：
  `draft / pending / approved / rejected / reimbursed`；
- `ExpenseStatus`（`expenses`）：
  `draft / submitted / approved / rejected / paid`。

别名：

- `pending_approval` 是审批表历史前端别名，写入前归一为 `pending`；
- `pending` 是报销表旧默认值，写入前归一为 `submitted`（存量行仍需窗口清洗）。

前端审批表单值改为 `pending`，文案「待审批」不变；费用报销表单原本就是
`draft/submitted/approved/rejected/paid`，无需改。任何其它值在创建、更新入口直接
400，不再落库。

## 3. 写入口收口

- `POST /expense-approvals`：缺省 `pending`，显式值必须归一成功；
- `PUT /expense-approvals/{id}`：`status` 可空，非空必须归一成功；
- `POST /expenses`：缺省 `draft`，不再硬编码 `pending`，显式值必须归一成功；
- `PUT /expenses/{id}`：`status` 可空，非空必须归一成功；
- `POST /expense-approvals/{id}/submit`：真实更新 `draft → pending`；
- `POST /expense-approvals/{id}/approve`：真实更新 `pending → approved`，写
  `approver_name`；
- `POST /expense-approvals/{id}/reject`：真实更新 `pending → rejected`，可带
  `approval_note`；
- 状态迁移不匹配返回 409，不再返回假成功。

SQL 的 `status = $3` 条件更新已在本地库用事务回滚验证：`pending → approved`
返回 `approved`，行数 1。

## 4. 尚未做

- DB CHECK 未加，需生产窗口；候选定义：

```sql
ALTER TABLE finance.expense_approvals
  ADD CONSTRAINT expense_approvals_status_check
  CHECK (status IN ('draft','pending','approved','rejected','reimbursed')) NOT VALID;
ALTER TABLE finance.expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('draft','submitted','approved','rejected','paid')) NOT VALID;
```

- 生产 `expense_approvals` 若有 `pending_approval` 行、`expenses` 若有 `pending` 行，需要窗口内一次性归一为 `pending`，再
  `VALIDATE CONSTRAINT`；
- `reimbursed` 目前无状态迁移入口，仅作为可写终态保留。

## 5. 验证

- `cargo test -p topems-finance --lib modules::expense_status` 2/2；
- `cargo clippy -p topems-finance --lib -- -D warnings`；
- `pnpm --dir apps/web typecheck`、eslint 对应 schema；
- 本地库 SQL 回滚验证状态迁移。
