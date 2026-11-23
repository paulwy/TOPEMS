# B219 · 对账订单 / 明细状态护栏证据（2026-11-23）

## 范围

- 表：`finance.reconcile_orders.status`（text NOT NULL DEFAULT `pending`，本地 0 行）、
  `finance.reconcile_items.status`（text NOT NULL DEFAULT `unmatched`，本地 0 行）
- 代码：`svc/finance/src/modules/reconcile_orders.rs`、`svc/finance/src/modules/reconcile_status.rs`
- 枚举：`ReconcileOrderStatus`（5 值）、`ReconcileItemStatus`（3 值），B5 已建，本批补公共 API 与 DB 约束

## 本批修掉的问题

1. **状态流转 SQL 全是字面量**：确认 / 争议 / 取消三条 `UPDATE` 分别写死
   `SET status = 'confirmed' | 'disputed' | 'cancelled'`，起始状态白名单也写死
   `IN ('draft','pending','disputed')` / `NOT IN ('confirmed','cancelled')`。
   枚举里的 `can_confirm` / `can_dispute` 与 SQL 白名单是两份独立定义，改一处忘另一处就会漂移。
   现改为 `SET status = $3` + `AND status = ANY($4::text[])` / `AND status <> ALL($4::text[])`，
   白名单统一来自 `actionable_values()` / `terminal_values()`。
2. **明细更新同样内嵌订单白名单**：`update_reconcile_item` 的 `EXISTS (... o.status IN ('draft','pending','disputed'))`
   改为 `o.status = ANY($13::text[])`，与订单侧共用同一份常量。
3. **枚举缺 canonical API**：两个枚举补 `DB_VALUES` / `DEFAULT` / `as_db_str` / `from_db_str`，
   默认值与 DB 默认值一致（`pending` / `unmatched`），`cancelled` 读侧接受历史拼写 `canceled`。
   原有 `normalize_reconcile_order/item` 保留，行为不变。
4. **两列没有 DB 约束**：新增 `ck_reconcile_orders_status_standard`、
   `ck_reconcile_items_status_standard`（均 `NOT VALID`）。

## 本地验证

- 约束应用后事务内插入合法行再 `UPDATE status='bogus'`：两表均被对应约束拒绝；合法默认值可写。
- 两表存量 0 行，无需数据修复。
- 列表过滤 `status` 参数仍走 `normalize_reconcile_order`，非法值 400 文案不变。

## 遗留

- 取消 / 确认 / 争议后的事件载荷里仍有 `status` 字符串（如 `"confirmed"`），属于事件契约字段，
  不是 DB 写入，本批未改；后续若事件消费侧也收敛枚举，需同步。
- 生产未应用：仅本地 `topems` 应用 `NOT VALID` 约束，发布需按窗口执行并逐条 `VALIDATE`。
