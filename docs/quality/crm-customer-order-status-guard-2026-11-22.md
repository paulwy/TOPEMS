# B134 · CRM 客户订单台账状态收口

日期：2026-11-22

## 目标
`crm.customer_orders.status` 收敛为唯一 `CustomerOrderStatus` 六值（`draft/pending/approved/shipped/completed/cancelled`），事件写入口严格解析并拒绝未知值，历史 `confirmed` 归一为 `approved`；候选 DDL 补默认、NOT NULL 与六值 `NOT VALID` CHECK。

## 数据现状
- 本地 16 行全 `draft`；列 `NOT NULL DEFAULT 'completed'`；无 CHECK。
- 生产快照 0 行；列 nullable、默认 `completed`；无 CHECK。
- 唯一写入口：`svc/crm/src/event_handlers/mod.rs` 的 `handle_sales_order_created`，按 `order_no + tenant_id` 幂等插入；原样透传 `payload.status`，缺失默认 `confirmed`。
- 无列表/详情 API，前端无消费。

## 代码修复
1. 新增 `svc/crm/src/modules/customer_order_status.rs`：
   - `CustomerOrderStatus::{Draft,Pending,Approved,Shipped,Completed,Cancelled}`；
   - `DB_VALUES` 六值，`DEFAULT = Draft`；
   - `from_db_str` 接受历史 `confirmed → Approved`、`canceled → Cancelled`；
   - `is_terminal` 为 `completed/cancelled`；
   - 参考迁移 `draft → pending/approved/cancelled`、`pending → approved/cancelled`、`approved → shipped/cancelled`、`shipped → completed`；
   - 单测覆盖 roundtrip、`confirmed` 归一、`void` 非法、默认、迁移与终态。
2. `modules/mod.rs` 注册 `customer_order_status`。
3. `event_handlers/mod.rs`：
   - `handle_sales_order_created` 在打开事务前解析状态；
   - 缺失状态绑定 `CustomerOrderStatus::Approved`（沿用“进入台账视为已确认”语义，不再写历史字面量 `confirmed`）；
   - 未知状态 `tracing::error!` 后 `return Ok(())`，不打开事务、不写脏台账；
   - `confirmed` 归一为 `approved` 后入库。

## 候选 DDL
`docs/database/crm-customer-order-status-check-candidates-2026-11-22.sql`
- 回填 NULL 为 `draft`；
- 默认由 `completed` 改为 `draft`；
- 设 `NOT NULL`；
- 同名 CHECK 不存在时追加 `ck_customer_orders_status_standard ... NOT VALID` 六值约束；
- 同步列注释为精确六值；
- 2026-11-22 已应用到本地 `topems`（事务提交）；生产快照与生产环境未应用，部署仍需窗口。

## 本地事务演练（全部 ROLLBACK）
- 模拟生产：删除同名约束、解除 `NOT NULL`、清空默认，并把 1 行置 NULL。
- 执行候选：16 行全部为 `draft`（NULL 回填）、`is_nullable=NO`、默认 `'draft'`。
- 新约束 `convalidated=false`，即 `NOT VALID`。
- 同一行 `pending → approved → shipped → completed` 全部通过。
- 非法 `confirmed`：23514，被约束拦下（应用层已先归一为 `approved`）。
- ROLLBACK 后：16 行恢复、约束 0、列恢复 `NOT NULL DEFAULT 'completed'`。

## 门禁
- `cargo check -p topems-crm`：通过
- `cargo clippy -p topems-crm --all-targets -- -D warnings`：通过
- `cargo test -p topems-crm --lib`：508 passed
- `apps/web pnpm run typecheck`：通过
- `apps/web pnpm run lint`：0 error，156 warnings（存量）
- `check-request-txn`：1651 全局 / CRM 192，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：206 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：142 枚举 / 152 值，resolved 110，分桶一致
- glossary 与 i18n quality：通过
