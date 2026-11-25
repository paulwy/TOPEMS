# B300 Finance 费用审批终态守卫（2026-11-25）

## 结论

`finance.expense_approvals` 本地 178 行、status 全部 `pending`。写入侧缺口：

- `PUT /expense-approvals/{id}` 在请求不带 `status` 时，把 `allowed_from` 放开为全部五态，`approved/reimbursed` 记录仍可改金额、员工、部门、费用类型与说明；WHERE 无当前态等值谓词，并发状态变化会被覆盖。
- `DELETE /expense-approvals/{id}` 只判 `deleted_at IS NULL`，已审批/已报销记录可以软删，审批留痕被移除。
- 指定目标态时虽然用 `status = ANY(allowed_from)`，但 `allowed_from` 取决于目标态，未显式校验当前态（SQL 实际已拦，错误码统一 409）。

## 代码改动

- `ExpenseApprovalStatus` 新增：
  - `EDITABLE = ["draft","pending","rejected"]`；
  - `DELETABLE = ["draft","pending","rejected"]`。
- update：
  - 预读 `id = $1 AND deleted_at IS NULL` 当前态，缺失 404、非法 409；
  - 无目标态或目标态等于当前态时，当前态必须在 `EDITABLE`，否则 409；
  - 指定目标态时校验 `target.allowed_from()` 包含当前态，否则 409；
  - 无目标态时 `allowed_from` 收敛为 `[当前态]`，不再放开五态；
  - UPDATE 增加 `AND status = $15` 并发谓词。
- delete：增加 `status = ANY(DELETABLE)`；0 行返回“不存在或状态不允许删除”。

## 数据库

无 DDL。`status` NOT NULL 默认 `pending`；值集合仍由代码侧统一，DB CHECK 尚未补。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance approval_terminal_sets_are_strict --lib` 1 passed。
- `cargo fmt -p topems-finance` 已执行。

## 遗留

`approved → reimbursed` 仍可由 admin-only update 一步完成；如需严格审批留痕，后续可拆独立报销动作。DB CHECK 待生产窗口统一补。
