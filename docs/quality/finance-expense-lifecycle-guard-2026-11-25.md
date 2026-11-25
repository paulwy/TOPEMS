# B305 Finance 费用报销终态与删除守卫（2026-11-25）

## 结论

`finance.expenses` 本地 3 行、status 全部 `submitted`。update 虽有状态迁移矩阵和 `status = $14` 并发谓词，但无目标状态时直接放行字段编辑，`approved/paid` 记录仍可改金额；delete 只按 `id` 软删，既不过滤已删除记录也不限制状态，已审批/已支付报销可重复删除。get 详情也未过滤 `deleted_at`。

## 代码改动

- `ExpenseStatus` 新增 `EDITABLE = ["draft","submitted","rejected"]`、`DELETABLE = ["draft","submitted","rejected"]` 与 `is_editable/is_deletable`。
- update：
  - 无目标状态或目标状态与当前态相同，视为字段编辑，当前态必须是 `draft/submitted/rejected`；`approved/paid` 返回 409。
  - 目标状态不同时继续走 `can_transition_to`，保留 `approved → paid` 的正常流转。
  - `WHERE ... status = $14` 并发谓词保留。
- delete：
  - 先预读未删除当前态：缺失 404、非法状态 409、approved/paid 409。
  - UPDATE 增加 `deleted_at IS NULL AND status = ANY(DELETABLE)`；0 行返回 409，不再把并发变化/重复删除报成成功。
- get 详情增加 `deleted_at IS NULL`，软删记录不再可读。

## 数据库

无 DDL。本地 3 行 `submitted` 均落在 `DELETABLE` 内，删除行为保持不变；无 `approved/paid` 存量，终态拒绝路径需由后续数据触发。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance --lib expense` 10 passed（新增 `expense_terminal_sets_are_strict`）。
- `SELECT count(*) ... status = ANY(ARRAY['draft','submitted','rejected'])` = 3，与本地数据一致。

## 遗留

update 仍允许通过目标状态 `approved → paid` 修改 `reimbursed_at` 等字段，这是支付动作的必要写入；其余字段在终态下的编辑统一拒绝。
