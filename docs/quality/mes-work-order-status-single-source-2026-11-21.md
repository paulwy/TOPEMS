# B33 · mes.work_orders 状态单一源（2026-11-21）

## 现状（改动前）
`mes.work_orders` 本地 56 行、全部 `completed`。状态写入集中在 `svc/mes/src/modules/work_order.rs`：

- 创建：`INSERT ... VALUES (..., 'pending', ...)` 字面量；
- 开工/完工/取消/暂停/恢复：`SET status = 'in_progress'|'completed'|'cancelled'|'paused'` 配 `WHERE status = 'pending'` / `IN (...)` 字面量；
- 软删：`WHERE status IN ('pending','cancelled')`；
- 列表过滤 `status` 接受任意字符串，未知值静默返回空列表；
- DB 无 CHECK 约束（`status varchar`，无默认值），任意外部写入可产生集合外值。

## 改动
1. 新增 `svc/mes/src/modules/work_order_status.rs`：`WorkOrderStatus { Pending, InProgress, Paused, Completed, Cancelled }`、`DB_VALUES`、`DEFAULT`、`DELETABLE`、严格 `from_db_str`/`as_db_str`，并按动作定义起始态集合 `start_from`/`complete_from`/`cancel_from`/`pause_from`/`resume_from`；1 个单测（往返、未知拒绝、取消集合边界）。
2. `work_order.rs`：创建绑 `DEFAULT.as_db_str()`（参数位改为 `$13`）；五个动作改为 `SET status = $1 ... status = ANY($n)` 并绑目标态与起始集合；软删改 `status = ANY($1)` 绑 `DELETABLE`。
3. 候选 DDL `docs/database/mes-work-order-status-check-candidates-2026-11-21.sql`（`NOT VALID`）。

## 验证
- `cargo test -p topems-mes --lib work_order_status`：1 passed；`cargo check/clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 本地演练（事务内 ROLLBACK，残留 0）：`completed→'bogus'` → 23514；`pending→in_progress→paused→in_progress→completed` 链每条 `UPDATE 1`。
- 盘点：枚举 141→142、值 153、不在 DB CHECK 115、色板缺口 0；前端键 169 不变；队列 102→103 枚举；映射 76→77。

## 残留
- 候选未进 `database/migrations/`，生产窗口 + `VALIDATE`。
- 列表 `status` 过滤未做严格校验（未知值仍返回空列表，不报 400）；若要收口需先确认前端传参集合。
- MES 仍有大量无约束状态列（`production_orders` 四值、`production_schedules` 全程 `scheduled`、`material_*`、`quality_*`、`equipment*` 等），按 B34 继续逐表收口。
- `mes.work_orders` 无 `failed` 态，完工数量由 `completed_quantity` 单独维护，状态机不覆盖数量回写路径。
