# B58 · mes.production_schedules APS 状态用法收敛（2026-11-21）

## 现状（改动前）
- `mes.production_schedules`：本地 9678 行全部 `scheduled`；列可空，DB 默认 `'pending'`，无 CHECK。
- `aps_scheduling.rs` 保存排程结果时把 `'scheduled'` 写死在 INSERT，没有引用 `ProductionScheduleStatus::APS_DEFAULT`。
- 工位负载与瓶颈分析两条 SQL 仍用 `ps.status IN ('scheduled','in_progress')`；`in_progress` 在排程枚举里已不存在，实际只命中 scheduled，已发布/执行中的排程被漏算。
- 优化报告 `scheduled_orders` 查的是 `mes.production_orders.status = 'scheduled'`，而生产订单枚举没有 `scheduled`，该指标恒为 0，`unscheduled_orders` 被算成全部订单。
- 手工排程路径 `production_scheduling.rs` 已严格解析状态并带流转谓词，本轮不动。

## 改动
1. `production_schedule_status.rs`：新增 `active_from()`（scheduled/released/running）并补单测。
2. `aps_scheduling.rs`：
   - 保存 APS 排程状态由字面量改绑 `APS_DEFAULT`；
   - 工位负载、瓶颈资源两条 SQL 改用 `status = ANY($2::text[])` 绑定 `active_from()`；
   - `scheduled_orders` 改为按 `mes.production_schedules` 统计非 cancelled 的去重订单数。
3. 候选 CHECK 沿用 B35 的三/六值候选（`NOT VALID`），补 B58 用法记录。

## 验证
- `cargo check -p topems-mes`、`cargo clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-mes --lib production_schedule_status`：1 passed。
- 本地只读核对：非 cancelled 去重订单 62（原指标恒 0）；活跃排程 9678；事务内 `bogus` → 23514，回滚。

## 残留
- `scheduled_orders` 改为“有非 cancelled 排程的订单数”，与前端字段名一致但口径需产品确认；原实现没有任何订单能命中。
- 手工排程与 APS 排程共用同一状态列，`pending` 的语义仍是“待发布”，APS 直接写 scheduled；如果产品要求 APS 结果也先 pending，需要另加确认动作。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
