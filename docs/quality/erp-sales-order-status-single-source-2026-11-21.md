# B27 · erp.sales_orders 状态单一源（2026-11-21）

## 问题
`erp.sales_orders.status` 是 erp schema 里唯一有真实流量的业务单据状态列（本地 17 行），但完全自由文本：

- 新建 `create_sales_order` 用 `default_sales_order_status(body.status)` 把请求串原样落库（`None` 才补 `draft`），任意值都能写入。
- 编辑 `update_sales_order` 用 `COALESCE($7, status)` 直接把 `body.status` 写回，能跳过审批直接改成 `completed`，也能写 `bogus`。
- 四个流转端点 `approve/ship/complete/cancel` 都是 `UPDATE ... SET status='approved' WHERE id=$2`，没有起始状态谓词——`cancel` 能取消一个已完成的订单，`complete` 能完成一个 `draft`，全部返回成功。
- 批量端点 `batch_update_status` 同理。
- 统计接口用字面量 `status IN ('pending','draft')`、`status = 'shipped'`、`status = 'completed'`，与写入口没有共享常量。
- 存量有 1 行 `confirmed`（`SO-TEST-0001`，测试种子），代码里没有任何路径产生它，是历史脏值。

## 改动
1. 新增 `svc/erp/src/modules/sales_order_status.rs`：
   - `SalesOrderStatus { Draft, Pending, Approved, Shipped, Completed, Cancelled }`；
   - `DB_VALUES`（唯一集合）、`DEFAULT = Draft`；
   - `from_db_str`：trim + lowercase，`canceled` 归一为 `cancelled`，未知返回 `None`；
   - `as_db_str`；
   - `allowed_from()`：每个目标状态的允许起始集合（`Shipped ← approved/shipped`、`Completed ← shipped/completed`、`Cancelled ← draft/pending/approved`）；
   - 3 个单测（往返、未知拒绝、终态迁移覆盖）。
2. `sales_order.rs`：
   - 单条/批量创建：只允许初始态 `draft|pending`，未知值 400 `invalid initial sales order status`，默认 `Draft`。
   - 编辑：状态字段严格解析；只允许原值回传，任何真实迁移返回 400 并提示走专用端点（`use dedicated endpoints`）。
   - `update_sales_order_status` 接收枚举，SQL 增加 `AND status = ANY($3)`（允许起始集合），不顺路修改返回 0 行 → 404/失败，不再假成功。
   - `batch_update_status` 同样接枚举 + 起始谓词，占位参数按 id 数量动态排到 `$N+2`。
   - 统计接口三处字面量改为绑定 `ANY($1)` + 枚举常量。
3. 删除 `material_calc::default_sales_order_status`（把任意串原样透传的死助手）及其两个测试，避免新代码再走旁路。
4. 候选 DDL：`docs/database/erp-sales-order-status-check-candidates-2026-11-21.sql`（`NOT VALID` + 预检 + 回滚 + 演练记录）。

## 验证
- `cargo test -p topems-erp --lib sales_order_status`：3 passed；`material_calc`：13 passed。
- `cargo check -p topems-erp --all-targets`、`cargo clippy -p topems-erp --all-targets -- -D warnings`：干净；`cargo fmt --all` 已执行。
- 本地事务演练（全部 ROLLBACK，残留 0）：
  - 预检：集合外存量 `confirmed = 1`。
  - 加约束 + `INSERT status='bogus'` → `23514` 拦截。
  - 加约束 + `UPDATE draft → approved` → `UPDATE 1` 通过。
  - 加约束 + 触及存量 `confirmed` 行（`status = status`）→ `23514`。**这是 NOT VALID 的边界：它只放过存量行本身，不放过对存量行的任何 UPDATE**，因此生产执行前必须先按业务确认把该行改为 `approved`（或删除测试种子）。
- 盘点/队列：Rust 枚举 135→136、值 146→147；104→109 不在 DB CHECK；色板缺口 0；队列 99 枚举 / 109 值，`resolved` 65→66，`SalesOrderStatus` 已带 `table/column/candidate` 进入 resolved。

## 残留
- 候选 CHECK 未进 `database/migrations/`，生产需窗口 + 先修 `confirmed` 存量行 + `VALIDATE CONSTRAINT`。
- `purchase_orders` 仍是 `pending` 起步的自由文本，`update_purchase_order_status` 无起始谓词，属 B28 同类问题。
- `erp.receivables.status`（5 行 `pending`）、`announcements`（4 行 `published`）、`assets`（1 行 `active`）、`audit_logs`（4462 行 `success/error`）尚未枚举化，按 B26 队列继续。
- 前端 `STATUS_COLOR_MAP` 已覆盖 draft/pending/approved/shipped/completed/cancelled，无需改动；erp 页面未展示 `pending` 的专属色，沿用 warning。
