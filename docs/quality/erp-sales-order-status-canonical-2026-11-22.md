# B139 · ERP 销售订单状态 canonical 收口

日期：2026-11-22

## 目标
`erp.sales_orders.status` 只保留 `SalesOrderStatus` 六值 `draft/pending/approved/shipped/completed/cancelled`；清理历史 `confirmed` 库值与代码兼容分支，避免 NOT VALID 约束放行存量却拦截该行任何 UPDATE。

## 数据现状
- 本地 17 行：`draft` 16、`confirmed` 1；列 `NOT NULL DEFAULT 'draft'`，无 CHECK。
- 生产快照 0 行；列 `NOT NULL DEFAULT 'draft'`，无 CHECK。
- 历史 B27 只生成候选；B90 在读取侧把 `confirmed` 投影为 `approved`，但库值未改，导致该行后续任何 UPDATE 都会被新约束 23514 拦下。

## 数据修复与候选
`docs/database/erp-sales-order-status-canonical-candidates-2026-11-22.sql`
1. 先 `UPDATE ... SET status='approved' WHERE status='confirmed'`，本地实际修 1 行；
2. 保持 `DEFAULT 'draft'`、`NOT NULL`；
3. 缺失时追加 `sales_orders_status_check ... NOT VALID` 六值约束；
4. 同步列注释。

已应用到本地 `topems`：17 行变为 `draft` 16 + `approved` 1；约束 `NOT VALID` 建立；新插入 `confirmed` 实测 23514，事务回滚。生产快照未应用。

## 代码严格化
### `svc/erp/src/modules/sales_order_status.rs`
- 删除 `READ_VALUES`（含 `confirmed`）与 `from_read_str`；
- 只保留 `from_db_str` 六值严格解析；`confirmed` 返回 `None`；
- 删除读取兼容单测。

### `svc/erp/src/modules/sales_order.rs`
- 列表查询参数由 `from_read_str` 改为 `from_db_str`，错误提示改用 `DB_VALUES`；
- 列表、详情、统计、编辑的 `CASE WHEN status='confirmed' THEN 'approved' ...` 投影全部移除，直接返回 `status`；
- 所有 `status IN (...)` 的白名单删除 `'confirmed'`；
- 编辑 UPDATE 的 `status = COALESCE($7, CASE...)` 改为 `status = COALESCE($7, status)`；
- 批量状态流转仍只写六值。

## 门禁
- `cargo check -p topems-erp`：通过
- `cargo clippy -p topems-erp --all-targets -- -D warnings`：通过
- `cargo test -p topems-erp --lib`：877 passed
- `check-request-txn`：1651 全局 / ERP 350，未增长
- `check-scope-api`：未标记 176 / `Db::new` 144，未增长
- `check-txn-write-non2xx`：通过
- 盘点：208 枚举 / 191 值 / 152 不在 DB CHECK / 206 前端键，色板缺口 0
- 队列：144 枚举 / 152 值，resolved 112，分桶一致

## 状态目录撤除（2026-11-23）

`erp.sales_orders.sales_orders_status_check` 与 `erp.purchase_orders.purchase_orders_status_check`
从未进入 `database/migrations`，只存在于 `docs/database/*candidates*.sql` 候选脚本，
且生产快照无此 CHECK（见上文「数据现状」）。按「生产独有约束，不入目录」口径从
`docs/database/status-check-catalog.json` 撤除这两条 `constraints`，改在 `uncovered`
登记两列（类型/可空/默认与库一致）。原因：仓库不可复现——从基线重建的库不会出现
这两个约束，目录不再把它们当作漂移基线。

两条已登记进 `docs/database/prod-only-status-checks-2026-11-23.json`（生产独有/待回迁清单），
与 P7 线下策略回迁一起排期；生产回迁成功后再按「回迁一条删一条」处理。
