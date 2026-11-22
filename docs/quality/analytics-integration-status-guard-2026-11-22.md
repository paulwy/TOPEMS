# B147 · 报表排程 / 异步任务状态收口

日期：2026-11-22

## 目标

替换 `bi.report_schedules` 与 `analytics.report_schedules` 上错误的 VALID CHECK；给 `integration.async_tasks` 补状态约束。其余 4 个未解决枚举确认是内存态并归档。

## 收口前

- `bi.report_schedules`：本地/生产 0 行，nullable 默认 active；已有 VALID 错误 CHECK `active/inactive/archived`，会拦截 `paused/completed/failed`。
- `analytics.report_schedules`：历史副本，0 行、无代码引用，同样错误 VALID CHECK。
- `integration.async_tasks`：本地/生产 0 行，`NOT NULL` 默认 pending，无 CHECK。
- `AsyncTaskStatus::from_str` 未知值回退 Pending，不严格。

## 代码改动

- `ScheduleStatus`：补 `DB_VALUES = active/paused/completed/failed`、`DEFAULT = Active`、`as_db_str/from_db_str`；`Display` 委托 `as_db_str`。
- `AsyncTaskStatus`：补 `DB_VALUES = pending/in_progress/completed/failed/max_retries_exceeded/cancelled`、`DEFAULT = Pending`、`from_db_str`；`from_str` 改为 `from_db_str(...).unwrap_or(Pending)`，保留既有 row 解析签名。
- 列表/创建/更新仍使用枚举类型参数，非法值在反序列化阶段拒绝。

## 本地应用

候选：`docs/database/analytics-integration-status-check-candidates-2026-11-22.sql`

- `bi.report_schedules` 与 `analytics.report_schedules`：DROP 错误 VALID 约束，默认 active、`NOT NULL`、四值 `NOT VALID`。
- `integration.async_tasks`：默认 pending、六值 `NOT VALID`。
- 三表本地/生产均 0 行；生产快照未修改。

## 内部态归档

- `SyncStatus`：同步重试执行器内存态，无表列。
- `EmailQueueStatus`：邮件 DashMap 队列内存态，`core_emails` 只存发送结果。
- `UpgradeStatus` / `UpgradeQueueStatus`：插件升级编排/队列内存态，无状态列。
- 队列 `resolved_enums` 134→140，仅剩 RD 3 + PM 1。

## 门禁

- analytics + integration clippy 通过；两包 `--lib` 197 passed / 0 failed。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。
