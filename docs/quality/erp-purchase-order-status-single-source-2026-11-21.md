# B28 · erp.purchase_orders 状态单一源（2026-11-21）

## 现状
`erp.purchase_orders.status` 比销售订单规整：approve 有 `status = 'pending'` 谓词、cancel 有 `status IN ('pending','approved')`，0 行返回「不存在或状态不是待审批」；update/create 不接受状态字段。问题只剩**值集没有单一源**：

- 创建 `.bind(default_purchase_order_status())` 返回字符串 `"pending"`，助手可被任何调用方拿去填任意值（现已删除）。
- 三个流转字面量 `'approved'`、`'pending'`、`'cancelled'` 分散在 SQL 里，与 DB 候选、前端色板无共享定义。
- `status` 列 39 个 erp 状态列之一，无 CHECK；本地表 0 行，没有存量包袱。

## 改动
1. 新增 `svc/erp/src/modules/purchase_order_status.rs`：
   - `PurchaseOrderStatus { Pending, Approved, Cancelled }`；
   - `DB_VALUES`、`DEFAULT = Pending`、`from_db_str`（trim/lowercase、`canceled` 归一、未知 `None`）、`as_db_str`、`Display`；
   - 2 个单测（往返、未知拒绝）。
2. `purchase_order.rs`：
   - 创建绑定 `PurchaseOrderStatus::DEFAULT.as_db_str()`；
   - approve 改为 `SET status = $3 ... AND status = $4`，绑 `Approved` + `[Pending]`；
   - cancel 改为 `SET status = $3 ... AND status = ANY($4)`，绑 `Cancelled` + `[Pending, Approved]`；
   - 零行语义保持不变（404 +「不存在或状态不可取消/不是待审批」）。
3. 删除 `material_calc::default_purchase_order_status` 及单测。
4. 候选 DDL：`docs/database/erp-purchase-order-status-check-candidates-2026-11-21.sql`（`NOT VALID` + 预检 + 回滚 + 演练记录）。

## 验证
- `cargo test -p topems-erp --lib purchase_order_status`：2 passed。
- `cargo check -p topems-erp --all-targets`、`cargo clippy -p topems-erp --all-targets -- -D warnings`：干净；`cargo fmt --all`。
- `check-request-txn` 1655/基线 1655；`check-scope-api` Db::new 未增加。
- 本地事务演练（3 组均 ROLLBACK）：
  - `INSERT status='bogus'` → 23514 拦截；
  - `INSERT status='pending'` → 成功；
  - `INSERT pending` 后 `UPDATE → approved` → `UPDATE 1`。
- 盘点：Rust 枚举 136→137；值 147；不在 DB CHECK 109；色板缺口 0；队列 99 枚举 / 109 值，映射 67 条。

## 残留
- 候选 CHECK 未进 `database/migrations/`，生产窗口内执行 + `VALIDATE CONSTRAINT`。
- 采购订单缺 `ship/receive/complete` 端点，现集合只覆盖「待审批/已审批/已取消」；若后续补收货流程需扩枚举并同步 DB 候选。
- `erp.receivables`（5 行 pending）、`announcements`（4 行 published）、`assets`（1 行 active）、`audit_logs`（4462 行 success/error）仍是无枚举的自由文本，按 B26 队列继续。
