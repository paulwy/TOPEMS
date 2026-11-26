# MES 排产单状态并发与空状态口径（B345，2026-11-26）

## 背景

`mes.production_schedules` 本地 9678 行，status 全 `scheduled`；列可空、默认 `pending`，CHECK 允许 pending/scheduled/released/running/completed/cancelled，但没有 NOT NULL。

两个写入口存在问题：

1. `transition_production_schedule`（`POST /api/mes/schedules/{id}/transition`）
   - 读当前态用 `query_as::<_, (String,)>`：若 status 为 NULL，解码失败直接 500，而不是可解释的业务错误；
   - 读 → 校验 → UPDATE 带 `status = $6` 并发谓词，但 `rows_affected = 0` 时返回 404「排产单不存在」——并发被别人改掉或软删都会误导成不存在，且此前已 `commit` 空事务。
2. `update_production_schedule`（`PUT /api/mes/schedules/{id}`）
   - 已经有当前态读取（`Option<String>`，NULL 时 409）与并发谓词，但 0 行时先 `commit` 再返回 409，事务提交了空操作。

## 修复

`svc/mes/src/modules/production_scheduling.rs`：

- transition：当前态改为 `Option<(Option<String>,)>`；行存在但 status 为 NULL → 409「排产单状态为空，需人工处理」；未知值仍 409「当前状态非法」；
- transition：UPDATE `rows_affected = 0` 改 409「排产单状态已变化或已删除，请刷新后重试」，不再误报 404；
- update：`commit` 移入 `Some(row)` 分支，0 行时直接 409「排产单状态已被并发修改，更新失败」，不提交空事务；
- 租户、软删谓词、`status = $13` 并发谓词、目标态绑定都保持不变。

创建入口的 `INSERT ... status 'pending'` 字面量本次**未改**：该语句是 `sqlx::query!` 编译期校验查询，改成绑定枚举默认值需要 `cargo sqlx prepare` 重生成缓存（会顺带重写大量 `.sqlx`），超出本批范围，留作后续一致性批次。

## 验证

- `cargo check -p topems-mes` 通过；`cargo test -p topems-mes --lib production_schedule` 通过（1 项状态枚举往返测试）。
- 本地 9678 行状态均为 `scheduled`，无 NULL/越界，状态机分支可直接按现有数据运行。
- 并发语义：读当前态 → UPDATE 带 `status = 当前态` → 0 行即 409，不把并发失败当 404。

## 遗留

- `mes.production_schedules.status` 仍可空；B346 计划做定向迁移（NOT NULL + 六态 CHECK 重建），与 `mes.work_orders.status`（56 行全 completed 且全软删、可空）一并评估。
- 创建入口字面量 `'pending'` 与 `ProductionScheduleStatus::DEFAULT` 的双源仍存在，待 sqlx 缓存批次统一。
