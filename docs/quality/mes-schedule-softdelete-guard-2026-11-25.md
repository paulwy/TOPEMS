# B316 MES 生产排产软删隔离（2026-11-25）

## 结论

`mes.production_schedules` 本地 9678 行，全部 `scheduled`。

- delete 已有状态集合 `pending/scheduled/cancelled`，但没有 `deleted_at IS NULL`。重复删除已软删排产仍会命中并返回成功；`rows_affected=0` 仍报 404，语义也不准确。
- 批量调整 `schedule_ids` 的 UPDATE 同样没有软删过滤，已删除排产仍可被改工位/开工时间。

## 代码改动

- 单条 delete：
  - UPDATE 增加 `AND deleted_at IS NULL`；
  - 0 行由 404 改为 409“不存在、已删除或状态不允许删除”。
- 批量调整：
  - 每条 UPDATE 增加 `AND deleted_at IS NULL`，已删除排产不再被调整。

## 数据库

无 DDL。本地 9678 行均为 `scheduled`，在允许删除集合内；单条删除行为不变，重复删除不再假成功。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes --lib production_schedule` 1 passed。

## 遗留

状态迁移矩阵与 `delete_from` 集合由 `ProductionScheduleStatus` 维护，本批只补软删隔离。
