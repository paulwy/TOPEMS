# B292 MES 设备状态守卫（2026-11-25）

## 结论

`mes.equipment` 本地 11 行全部 `idle`，五态 CHECK 已存在，但两个写入口没有终态与并发守卫：

- `PUT /api/mes/equipment/{id}` 只在请求带 `status` 时解析值域，随后 `COALESCE` 直接覆盖：`scrapped` 设备可被恢复为 `idle/running/maintenance/fault`。
- UPDATE 无 `AND status = 当前态`、无 `deleted_at IS NULL`：并发状态变化或软删后仍会写入。
- `POST /api/mes/equipment/{id}/maintain` 无条件把任意状态（包括 `scrapped`、已软删）改成 `maintenance`。

## 状态机

`svc/mes/src/modules/equipment_status.rs::EquipmentStatus`

- `scrapped` 为终态，不可恢复为其它状态；
- `idle/running/maintenance/fault` 之间允许运维调整；
- 同态幂等。

## 代码改动

- `EquipmentStatus` 补 `can_transition_to`，新增 `scrapped_is_terminal` 单测（合计 3 项）。
- `update_equipment`：
  - 无论是否改状态都先读 `SELECT status ... deleted_at IS NULL`：缺失 404、空/非法态 409。
  - 请求带目标状态时走 `can_transition_to`，`scrapped → 其它` 409。
  - UPDATE 增加 `AND status = $15 AND deleted_at IS NULL`，0 行返回 409 并发冲突。
- `maintain_equipment`：UPDATE 增加 `AND status <> 'scrapped' AND deleted_at IS NULL`，0 行返回 409。

## 数据库

无 DDL。`ck_mes_equipment_status_standard` 五态 CHECK 已存在并 VALIDATE，本地 11 行全部 `idle`，合法。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes equipment_status --lib` 3 passed。

## 遗留

设备软删 `DELETE /equipment/{id}` 仍允许删除 `scrapped` 记录；报废资产通常需要保留台账，下一批可考虑改为只允许 `idle/fault` 软删或直接禁止 scrapped 软删。
