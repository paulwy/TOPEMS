# B303 Finance 预算删除状态集合（2026-11-25）

## 结论

`finance.budgets` 本地 286 行、status 全部 `active`。delete 只判 `id + deleted_at IS NULL`，处于 `active/frozen` 的预算可直接软删，绕过“先停用/归档”的生命周期。

## 代码改动

- `BudgetStatus` 新增 `DELETABLE = ["inactive","archived","exhausted"]`：
  - `active`：仍在执行，需先停用/归档；
  - `frozen`：冻结中，需先解冻或归档；
  - `exhausted`：额度已耗尽，可直接删除；
  - `archived`：已归档，可直接删除。
- delete 预读未删除当前态：缺失 404、非法状态 409、active/frozen 409；UPDATE 增加 `AND status = $3`，0 行返回“预算不存在”。

## 数据库

无 DDL。`status` NOT NULL 默认 active，五态 CHECK 已存在。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance budget_status --lib` 8 passed（含新增 1 项）。
- `cargo fmt -p topems-finance` 已执行。

## 遗留

本地 286 行均为 active，删除入口会全部拒绝；这是预期行为，前端需先走状态更新到 inactive/archived。
