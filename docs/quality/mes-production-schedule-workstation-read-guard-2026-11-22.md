# MES 排产与工位读取集合收口（B96）

日期：2026-11-22
范围：`mes.production_schedules` 列表/详情/甘特图；`mes.work_stations` 列表/详情。

## 问题

- 排产列表 `status` 仍是自由文本，任意值直接进动态 SQL；基础 WHERE 只有 `deleted_at`，集合外历史值会进入分页与总数。
- 排产详情按 `id + tenant_id` 直读；甘特图查询也未过滤状态。
- 工位列表 `status` 已严格解析，但列表与详情 SQL 都没有 `status IN (...)`，集合外行可读。

## 方案

- 排产：列表 `status` 用 `ProductionScheduleStatus::from_db_str` 严格解析，未知 400；动态 WHERE 固定加六值过滤。
- 排产详情：`query!` 宏 SQL 不变（避免离线缓存漂移），在 Rust 侧按 `from_db_str` 校验状态，未知/缺失按 404。
- 甘特图：保持 `query!` SQL 不变，取回后在 Rust 侧过滤集合外状态，避免脏值进入任务与资源列表。
- 工位：列表与详情 SQL 固定加三值过滤；列表参数仍严格解析。
- 写入与流转谓词未放宽。

## 验证

- `cargo check -p topems-mes`：通过。
- `cargo clippy -p topems-mes --all-targets -- -D warnings`：通过。
- `cargo test -p topems-mes --lib production_scheduling`：14 passed；`--lib work_station`：7 passed。
- 本地 `mes.production_schedules` 9678 行全为 `scheduled`：事务内插入 1 行 `bogus` 后全表 9679、六值过滤 9678；对脏值更新为 `UPDATE 0`；`ROLLBACK` 后无残留。
- 本地 `mes.work_stations` 77 行（available 10 / active 67）：插入 1 行 `bogus` 后全表 78、三值过滤 77；更新为 `UPDATE 0`；`ROLLBACK` 后无残留。
- 状态盘点/队列：172 枚举、181 前端键、色板缺口 0；118 枚举 / 127 值分桶一致。
- 候选约束仍为 `docs/database/mes-production-schedule-status-check-candidates-2026-11-21.sql`、`docs/database/mes-work-station-status-check-candidates-2026-11-21.sql`，均保持 `NOT VALID`。
