# B293 MES 工位状态守卫（2026-11-25）

## 结论

`mes.work_stations` 本地 79 行（69 `active`、10 历史种子 `available`），三态 CHECK 已存在，但四个写入口都没有软删与并发守卫：

- `PUT /workstations/{id}` 无 `AND status = 当前态`、无 `deleted_at IS NULL`：并发状态变化或软删后仍会覆盖。
- `PUT /workstations/{id}/activate` 无来源态条件：`available` 可直接改成 `active`，已软删工位也能被激活。
- `PUT /workstations/{id}/deactivate` 有 `status = ANY(deactivate_from)`，但没有 `deleted_at IS NULL`。
- `DELETE /workstations/{id}` 可重复软删，`rows_affected=0` 时返回 404，无法区分已删与不存在。

## 代码改动

- `WorkStationStatus` 新增 `activate_from()`：`inactive`、`active`（允许幂等重放），并补单测断言。
- `update_work_station`：先按 `id + tenant_id + deleted_at IS NULL` 读当前态，缺失 404；UPDATE 增加 `AND status = $12 AND deleted_at IS NULL`，0 行返回 409。
- `activate_work_station`：WHERE 增加 `AND status = ANY(activate_from()) AND deleted_at IS NULL` 绑定 `$6`，0 行返回 409。
- `deactivate_work_station`：WHERE 增加 `AND deleted_at IS NULL`。
- `delete_work_station`：WHERE 增加 `AND deleted_at IS NULL`。

## 数据库

无 DDL。`work_stations_status_check` 三态 CHECK 已存在并 VALIDATE；本地 69 `active` + 10 `available`，均在白名单内。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes work_station_status --lib` 1 passed。

## 遗留

`available` 与 `active` 语义重叠仍未合并（模块注释已标注待业务确认）；本批只加守卫，不改历史种子值。
