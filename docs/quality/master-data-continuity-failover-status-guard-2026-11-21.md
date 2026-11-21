# B66 · master-data 连续性与故障转移状态入口收敛（2026-11-21）

## 现状（改动前）
- `master_data.mdm_continuity_plans`：本地 active/tested 各 1；`mdm_failover_records`：1 行 completed；候选 CHECK 均已在 `master-data-status-check-candidates-2026-11-21.sql`，未应用。
- 连续性计划编辑接口：`status` 未知值静默回退 `Draft`，`recovery_strategy` 未知值静默回退 `HotStandby`，非法输入被改写后照样落库。
- 连续性计划 UPDATE 不检查 `rows_affected`；故障转移完成接口把 `status='completed'` 写死，也不检查 0 行。

## 改动
1. 连续性计划编辑：`status` 只接受 draft/active/tested/expired，`recovery_strategy` 只接受五个合法值，未知值 400，不再静默改默认。
2. 连续性计划 UPDATE 补 `rows_affected` 检查：0 行显式 `rollback()` 后 409。
3. 故障转移完成 UPDATE 的 `completed` 改绑 `FailoverStatus`，补 0 行检查并显式 `rollback()` 后 409。
4. 候选 DDL 沿用 `docs/database/master-data-status-check-candidates-2026-11-21.sql`。

## 验证
- `cargo check -p topems-master-data`、`cargo clippy -p topems-master-data --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `txn-write-non2xx --changed-only` 通过。
- 本地演练（事务内 ROLLBACK，残留 0）：连续性计划 active→draft→active、tested→expired→tested 各 `UPDATE 1`；故障转移 completed→rolled_back→completed 各 `UPDATE 1`；连续性 `bogus` → 23514。
- 状态盘点/队列 `--check` 不变（本批不新增枚举）。

## 残留
- 连续性计划读取侧仍宽松解析，集合外值回退 `Draft`/`HotStandby`。
- 故障转移、恢复计划的读取侧同样是宽松解析，未处理。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
