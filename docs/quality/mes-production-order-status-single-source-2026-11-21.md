# B34 · mes.production_orders 状态单一源（2026-11-21）

## 现状（改动前）
`mes.production_orders` 本地 134 行：`planned` 67 / `pending` 52 / `released` 10 / `in_progress` 5。生产快照库该表 0 行，`planned` 只存在于本地历史数据。

- 创建：`production_order.rs` 两处 `INSERT` 和 `event_handlers.rs` 一处 `INSERT` 都写字面量 `'pending'`；
- 发布/开工/完工/取消：`SET status = 'released'|'in_progress'|'completed'|'cancelled'`，配 `WHERE status = 'pending'|'released'|'in_progress'` / `IN (...)` 字面量；
- 编辑：`WHERE ... status = 'pending'`；软删：`status IN ('pending','cancelled')`；
- `validate_state_transition` 带着完整状态机，但**只被单测调用**，线上没有入口校验；
- DB 无 CHECK 约束。

关键不一致：状态机与代码都没有 `planned`，但本地有 67 行 `planned`；`paused`/`closed` 在状态机里但没有任何 handler 能到达。

## 改动
1. 新增 `svc/mes/src/modules/production_order_status.rs`：`ProductionOrderStatus` 八值（规范 7 态 + 历史 `planned`）、`DEFAULT`、严格解析、按动作起始集合（`release_from`/`start_from`/`complete_from`/`cancel_from`/`update_from`/`delete_from`）、`can_transition_to`、`Display`；1 个单测。
2. `production_order.rs`：`validate_state_transition` 改为枚举驱动（未知值直接报错，不再只比对字符串表）；发布/开工/完工/取消、编辑、软删的 SQL 全部改绑枚举常量 + `status = ANY($n)` 谓词；终态不可再流转由 `UPDATE 0` 表达。
3. `planned` 保留为只读遗留值（仅允许取消），不新增任何写入路径；创建仍绑 `pending` 字面量（`sqlx::query!` 宏，避免离线缓存重编），由枚举单测钉住 `DEFAULT = pending`。
4. 前端色板补 `planned: 'default'`。
5. 候选 DDL `docs/database/mes-production-order-status-check-candidates-2026-11-21.sql`（`NOT VALID`，含 `planned` 清理候选 SQL，注释里明确需业务确认后再执行）。

## 验证
- `cargo test -p topems-mes --lib production_order`：21 passed（含既有状态机单测）；新增枚举单测 1 passed。
- `cargo check/clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 本地演练（事务内 ROLLBACK，残留 0）：`pending→'bogus'` → 23514；`pending→released→in_progress→completed` 每条 `UPDATE 1`；`completed→cancelled` → `UPDATE 0`。
- 盘点：枚举 142→143、值 155、不在 DB CHECK 116、色板缺口 0；前端键 169→170；队列 103→104 枚举；映射 77→78。

## 残留
- `planned` 67 行语义未确认（是旧版计划态还是 ERP 同步残留），清理 SQL 只作为候选，不在本批执行。
- `paused` 与 `closed` 没有任何 handler：暂停/关闭仍不可达，`completed→closed` 只存在于状态机与单测。
- 候选 CHECK 未进 `database/migrations/`，生产窗口 + `VALIDATE`。
- 列表 `status` 过滤未做严格校验；未知值仍返回空列表。
- `production_orders` 的创建仍用 `sqlx::query!` 宏 + 字面量，未改成绑定参数，避免 `.sqlx` 离线缓存重编；后续可统一转运行时查询。
