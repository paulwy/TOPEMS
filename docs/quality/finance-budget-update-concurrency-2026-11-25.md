# B302 Finance 预算更新并发与金额保全（2026-11-25）

## 结论

`finance.budgets` 本地 286 行、status 全部 `active`。`PUT /budgets/{id}` 已有状态机与金额守卫，但仍有两个缺口：

- UPDATE 只判 `id + deleted_at IS NULL`，没有当前态等值谓词；预读后并发把预算冻结/归档/耗尽，仍会被本次写覆盖。
- `total_budget` / `used_amount` 缺失时按 `unwrap_or_default()` 处理为 0；只改 status 的请求会把预算额度、占用、剩余与使用率全部清零。

## 代码改动

- 预读从 `(status, used_amount)` 扩为 `(status, used_amount, total_budget)`。
- 请求金额解析改为 `Option<Decimal>`；未传时沿用库内现值，传 0 仍按 0 处理。
- 基于最终 total/used 重新计算 `remaining_amount` 与 `usage_rate`，再走原 `BudgetStatus::check_update`。
- UPDATE 增加 `AND status = $11` 并绑定预读原值；0 行返回 409“预算状态已变化”。

## 数据库

无 DDL。`status` NOT NULL 默认 active，五态 CHECK 已存在。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance budget_status --lib` 7 passed。
- `cargo fmt -p topems-finance` 已执行。

## 遗留

delete 仍只判软删，不区分 active/archived；如需“归档后只读”语义，下一批可补删除状态集合。
