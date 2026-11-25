# B321 Finance 对账会话/明细软删隔离（2026-11-25）

## 结论

`finance.core_finance_reconciliation_sessions` 与 `core_finance_reconciliation_items` 本地均 0 行，但两张表都有 `deleted_at`，服务层 SQL 却没有一处软删过滤。

- `get_session` 与 list 查询可读到已软删会话。
- `get_items`、自动匹配的未匹配项查询、汇总、报告、账龄、差异统计都会把已软删明细计入。
- `mark_matched` 可把已软删明细标记为已匹配。
- `complete_session` 与 `set_session_status` 可推进已软删会话状态；`update_session_counts` 也会写回已软删会话。
- `update_diff` 与批量差异处理可修改已软删明细。

## 代码改动

统一在会话与明细的查询/更新条件中补 `deleted_at IS NULL`，共 28 处：

- 会话：计数、详情、列表、完成、状态推进、统计写回。
- 明细：列表、未匹配项、匹配标记、差异更新/批量更新、汇总计数、报告金额、账龄、差异统计、按明细反查会话。
- 自动匹配与回款无关，未改状态机。

## 数据库

无 DDL。本地两张表均 0 行，不修改数据。

## 验证

- `cargo fmt -p topems-finance`、`cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance reconciliation` 14 passed。

## 遗留

对账会话状态机与差异处理逻辑未改；本批只补软删隔离。
