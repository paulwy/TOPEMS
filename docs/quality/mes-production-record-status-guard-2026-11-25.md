# B291 MES 生产记录状态守卫（2026-11-25）

## 结论

`mes.production_records` 本地 3 行、status 全为 `in_progress`，四态 CHECK 已存在，但两个写入口没有状态生命周期：

- `PUT /api/mes/records/{id}` 仅按 `end_time` 是否存在决定写 `completed` 或 `in_progress`，不读当前态：
  - `completed/cancelled` 记录可被“复活”为 `in_progress`；
  - `pending` 记录带 `end_time` 可直接跳到 `completed`；
  - UPDATE 无 `AND status = 当前态`、无 `deleted_at IS NULL`，并发流转或软删后仍会覆盖；
  - 记录不存在时 `fetch_optional → None` 被当作 404，但并发冲突同样落 404。
- `DELETE /api/mes/records/{id}` 可软删 `completed/cancelled` 记录，也没有软删幂等过滤。

## 状态机

`svc/mes/src/modules/production_record_status.rs::ProductionRecordStatus`

- `pending → in_progress / cancelled`
- `in_progress → completed / cancelled`
- `completed / cancelled` 为终态
- 同态幂等
- `editable_from()`：`pending`、`in_progress`

## 代码改动

- 枚举补 `can_transition_to`、`editable_from()`，新增 1 项状态矩阵单测（合计 3 项）。
- `update_record`：
  - 先按 `id + tenant_id + deleted_at IS NULL` 读取当前态（缺失 404、空/非法态 409）。
  - 仅 `pending/in_progress` 可编辑，终态 409。
  - 目标态仍按 `end_time` 推导，但统一走状态机；`pending + end_time` 直接 409。
  - UPDATE 增加 `AND status = $11 AND deleted_at IS NULL`，`fetch_optional=None` → 409。
- `delete_record`：UPDATE 增加 `AND status = ANY(editable_from()) AND deleted_at IS NULL`，0 行返回 409，不再误报 404。

## 数据库

无 DDL。`ck_mes_production_records_status_standard` 四态 CHECK 已存在并 VALIDATE，本地 3 行全部 `in_progress`，合法。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes production_record_status --lib` 3 passed。

## 遗留

`complete_record` 已带 `AND status='in_progress'`，但没有 `deleted_at IS NULL`；和本轮 update/delete 同表，下一批可与 `complete_record` 一起补齐软删谓词。
