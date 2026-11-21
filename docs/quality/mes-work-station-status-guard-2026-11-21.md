# B54 · mes.work_stations 状态入口收敛（2026-11-21）

## 现状（改动前）
- `mes.work_stations`：本地 79 行，`active` 69 / `available` 10；列非空，DB 默认仍是 `'available'`。
- 列表 `?status=` 直接拼进 SQL，任意字符串都接受，未知值静默返回 0 行。
- 停用 `deactivate_from` 只允许 `active`，10 行 `available` 种子工位永远无法停用，接口返回 404。
- 创建已绑 `WorkStationStatus::DEFAULT`（active），更新和激活已严格解析状态。

## 改动
1. `work_station_status.rs`：`deactivate_from` 纳入 `available`，与 `active` 等价；补单测。
2. `work_station.rs`：列表状态筛选严格解析，未知值 400；停用 0 行 404→409。
3. 候选 CHECK 沿用 `docs/database/mes-work-station-status-check-candidates-2026-11-21.sql`（三值、`NOT VALID`），补 B54 演练记录。

## 验证
- `cargo check -p topems-mes`、`cargo test -p topems-mes --lib work_station_status`：1 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：`available→inactive` 带 `available/active` 谓词 `UPDATE 1`；`inactive→inactive` 同谓词 `UPDATE 0`；`active→maintenance` 23514。

## 残留
- DB 列默认仍是 `'available'`，代码创建写 `'active'`；候选 DDL 里已写 `ALTER COLUMN status SET DEFAULT 'active'`，需随窗口执行。
- 10 行 `available` 未回填 `active`；业务确认等价后可执行候选里的清理 UPDATE，再 `VALIDATE CONSTRAINT`。
- 编辑接口仍允许任意状态互转（含 `inactive→active`），激活接口与之并存；是否只保留激活动作需产品确认。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
