# ERP 销售订单历史状态读取收口（B90）

日期：2026-11-22
范围：`erp.sales_orders` 的 `confirmed` 历史值只读投影、列表过滤与详情/更新/统计读取。

## 问题

`SalesOrderStatus` 的唯一写入集合为 `draft/pending/approved/shipped/completed/cancelled`，`from_db_str("confirmed")` 明确拒绝。但本地库仍有 1 行历史 `confirmed`：

- `id`：`47cffe6c-f4b0-4441-acfe-ad55e15a594f`
- `order_no`：`SO-TEST-0001`
- 客户：`MCP端到端客户`
- 来源：MCP 端到端测试残留（迁移 `20261107000028_cleanup_erp_customers_batch32.sql` 已登记）

此前列表/详情直接回显原始 `status`，统计按原始值分组；且列表 `status` 查询参数未做枚举校验。结果是集合外值在读取侧泄漏，过滤结果与写入集合不一致。

## 方案

采用**读取兼容投影**，不修改本地数据、不放宽写入：

- `SalesOrderStatus::READ_VALUES`：六值 + 历史 `confirmed`。
- `SalesOrderStatus::from_read_str()`：`confirmed`（含大小写与空白归一）投影为 `approved`，其余走严格 `from_db_str`。
- 列表：`status` 参数用 `from_read_str` 校验，未知值 400；SQL 以 `CASE WHEN status='confirmed' THEN 'approved' ELSE status END` 投影，并用六值 + `confirmed` 的原始集合过滤。
- 详情：同样投影，集合外状态不可见（404）。
- 更新：读取当前状态时投影，历史行可按 `approved` 原值回传；更新成功后写回规范值，顺带完成单行归一。
- 统计：总数、`by_status` 按投影值统计，避免历史值单独成桶。
- 写入：`from_db_str` 未放宽，创建/更新仍只接受六值，`confirmed` 不能作为新写入值。

## 验证

- `cargo check -p topems-erp`：通过。
- `cargo clippy -p topems-erp --all-targets -- -D warnings`：通过。
- `cargo test -p topems-erp --lib sales_order`：9 passed；新增 `confirmed`/大小写/空白/未知值用例。
- 本地读取演练（17 行）：

```text
confirmed | approved | 17
draft     | draft    | 17  (×16)
```

- 目标行详情投影：`47cffe6c-... | SO-TEST-0001 | approved`。
- 候选 CHECK 复验：事务内加六值 `NOT VALID` 约束后，对历史行执行 `UPDATE ... SET status=status` 被 23514 拦截；`ROLLBACK` 后全表仍 17 行、`confirmed` 仍 1 行。

## 存量与生产

- 本地历史行保留原值，读取侧统一显示 `approved`；任何编辑保存会把它写回 `approved`。
- 候选约束仍为 `docs/database/erp-sales-order-status-check-candidates-2026-11-21.sql` 的六值 `NOT VALID` 版本，未进迁移、未在生产执行。
- 生产 `VALIDATE` 前仍需业务确认后执行 `UPDATE erp.sales_orders SET status='approved' WHERE status='confirmed'`，并走窗口 + 快照预检。
