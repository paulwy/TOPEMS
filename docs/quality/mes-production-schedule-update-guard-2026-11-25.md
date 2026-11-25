# B290 MES 生产排产更新守卫（2026-11-25）

## 结论

`mes.production_schedules` 本地 9678 行（status 全为 `scheduled`），六态 CHECK 已存在，但 `PUT /api/mes/schedules/{id}` 的更新路径有四个缺口：

- 只有请求里带 `status` 时才预读当前态；只改工位/时间/备注时完全不读状态。
- UPDATE 没有 `AND status = 当前态`，预读与写入之间状态被并发流转后仍会覆盖。
- UPDATE 没有 `deleted_at IS NULL`，已软删排产仍可被编辑。
- 没有限制可编辑来源态，`completed/cancelled` 也能改字段。

## 代码改动

`svc/mes/src/modules/production_scheduling.rs::update_production_schedule`

- 无论是否改状态，统一预读 `SELECT status ... AND deleted_at IS NULL`：
  - 记录缺失 → 404；
  - 状态为空或不在六态集合 → 409；
  - 当前态不属于 `ProductionScheduleStatus::adjustable_from()`（pending/scheduled/released/running）→ 409。
- 目标态 = 请求状态或当前态；统一走 `can_transition_to`，非法流转 409。
- UPDATE 增加 `AND status = $13 AND deleted_at IS NULL`；`fetch_optional` 为 None 返回 409 并发冲突，不再误报 404。

`svc/mes/src/modules/production_schedule_status.rs`

- 单测补充 `adjustable_from()` 边界：running 可编辑、completed 不可编辑。

## 数据库

无 DDL。`production_schedules_status_check` 六态 CHECK 已存在并 VALIDATE；本地 9678 行全部为 `scheduled`，合法。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes production_schedule_status --lib` 1 passed。

## 遗留

`adjust_schedule`（批量调工位/时间）已有 `status = ANY(adjustable_from)` 谓词，但没有 `deleted_at IS NULL`；本批先收口单条更新，批量调整的软删过滤放入下一批。
