# B136 · CRM 本地销售订单状态收口

日期：2026-11-22

## 目标
`crm.sales_orders.status` 收敛为唯一 `SalesOrderStatus` 六值（`draft/pending/approved/shipped/completed/cancelled`）；`ShippingOrderRequested` 投影入口不再写死 `'completed'`，改为绑定枚举。

## 数据现状
- 本地 0 行；列 `NOT NULL DEFAULT 'pending'`；无 CHECK。
- 生产快照 0 行；列 nullable、默认 `pending`；无 CHECK。
- 唯一写入方：`handle_shipping_order_requested`，按 `order_number + tenant_id` 幂等，出库确认后建 CRM 本地销售订单；原本 SQL 内写死 `'completed'`。
- 读方：`rfm.rs` 聚合 `crm.sales_orders`，不做状态流转。

## 代码修复
1. 新增 `svc/crm/src/modules/sales_order_status.rs`：
   - `SalesOrderStatus::{Draft,Pending,Approved,Shipped,Completed,Cancelled}`；
   - `DB_VALUES` 六值，`DEFAULT = Pending`（与列默认值一致）；
   - `from_db_str` 兼容 `confirmed → Approved`、`canceled → Cancelled`；
   - `is_terminal` 为 `completed/cancelled`；
   - 参考迁移 `draft → pending/approved/cancelled`、`pending → approved/cancelled`、`approved → shipped/cancelled`、`shipped → completed`；
   - 单测覆盖 roundtrip、历史值归一、非法 `void`、默认、迁移与终态。
2. `modules/mod.rs` 注册 `sales_order_status`。
3. `handle_shipping_order_requested` 的 INSERT：
   - 原 `VALUES (..., 'completed', ...)` 改为 `$6`；
   - 绑定 `SalesOrderStatus::Completed.as_db_str()`，后续时间/租户参数顺延为 `$7/$8/$9`。

## 候选 DDL
`docs/database/crm-sales-order-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `pending`、保持默认 `'pending'`、设 `NOT NULL`；
- 同名 CHECK 不存在时追加 `ck_sales_orders_status_standard ... NOT VALID` 六值约束；
- 同步列注释为精确六值；
- 未在任何环境应用。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除同名约束、解除 `NOT NULL`、清空默认，插入 1 行 `status=NULL`。
- 执行候选：NULL 回填 `pending`，`is_nullable=NO`，默认 `'pending'`。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- 同一行 `draft → pending → approved → shipped → completed` 全部通过。
- 非法 `confirmed`：23514，被约束拦下。
- ROLLBACK 后：0 行，约束 0，列恢复 `NOT NULL DEFAULT 'pending'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：510 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：208 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：144 枚举 / 152 值，resolved 112，分桶一致
- glossary 与 i18n quality：通过
