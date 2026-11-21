# B35 · mes.production_schedules 状态单一源（2026-11-21）

## 现状（改动前）
`mes.production_schedules` 本地 9678 行，全部 `scheduled`（APS 排程产物）；生产快照库该表 0 行。

- 手工创建：`production_scheduling.rs` 写 `'pending'` 字面量；
- APS 排程：`aps_scheduling.rs#save_schedule_result` 每行写 `'scheduled'`（9678 行即此来源）；
- 六个动作端点（submit/release/hold/start/complete/cancel）走 `shared::aps_fsm::SCHEDULE`，合法态是 `pending/released/running/completed/cancelled` —— **`scheduled` 不在其中**，所以 9678 条 APS 行调任何动作都会被 `409 当前状态不允许切换`；
- 编辑接口把 `req.status` 原样 `COALESCE($9, status)` 写库，任意字符串都能落；
- 软删谓词 `status IN ('pending','cancelled')`、调整谓词 `status IN ('pending','in_progress')`：`scheduled` 既不能删也不能调整，`in_progress` 没有任何写入方也没有存量，是孤儿值；
- DB 无 CHECK 约束（`varchar(32)`，默认 `'pending'`）。

## 改动
1. 新增 `svc/mes/src/modules/production_schedule_status.rs`：`ProductionScheduleStatus` 六值（pending/scheduled/released/running/completed/cancelled）、`DEFAULT=Pending`、`APS_DEFAULT=Scheduled`、严格解析、`can_transition_to`（与 APS FSM 对齐并额外允许 `scheduled` 起点）、`delete_from`/`adjustable_from`；1 个单测（含 `in_progress` 拒绝）。
2. `production_scheduling.rs`：
   - 编辑状态先严格解析（未知值 `400`），并在落库前读当前态做状态机校验（跳态 `409`），SQL 绑枚举常量；
   - 软删改 `status = ANY($3)` 绑 `delete_from`（pending/scheduled/cancelled）；
   - 调整改 `status = ANY($6)` 绑 `adjustable_from`（pending/scheduled/released/running）；
   - `transition_schedule` 改用枚举状态机，且 UPDATE 增加 `status = $6` 起始态谓词（并发下 0 行即失败）。
3. 候选 DDL `docs/database/mes-production-schedule-status-check-candidates-2026-11-21.sql`（`NOT VALID`）。

## 验证
- `cargo test -p topems-mes --lib production_schedule`：1 passed（枚举单测）；`cargo check/clippy -p topems-mes --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `check-request-txn` / `check-scope-api`：未新增裸事务与 `Db::new`。
- 本地演练（事务内 ROLLBACK，残留 0）：`scheduled→released→running→completed` 每条 `UPDATE 1`；`completed→cancelled` → `UPDATE 0`；`scheduled→'bogus'` → 23514。
- 盘点：枚举 143→144、值 155、不在 DB CHECK 116、色板缺口 0；前端键 170 不变；队列 104→105 枚举；映射 78→79。

## 残留
- 9678 条 `scheduled` 存量此前不可删/不可调整，本批修好了谓词；但历史没有任何动作端点成功流转它们，实际业务是否要批量发布需运营确认。
- 编辑接口现在禁止跳态：以前可以直接把任一状态改成任一状态，前端若依赖该行为会开始收到 409。
- `in_progress` 从调整谓词移除：本地/快照均无该值，若有外部系统直接写库需先对齐。
- 候选 CHECK 未进 `database/migrations/`，生产窗口 + `VALIDATE`。
- 列表 `status` 过滤仍未严格校验；未知值返回空列表。
