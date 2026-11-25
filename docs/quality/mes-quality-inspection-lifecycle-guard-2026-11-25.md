# B298 MES 质量检验生命周期守卫（2026-11-25）

## 结论

`mes.quality_inspections` 本地 2 行、status 均为 `pending`；列可空、默认 `pending`，七态集合由代码侧 `InspectionStatus` 定义。写入侧缺口：

- update 已做 status 白名单，但 WHERE 只有 `id + tenant_id`，无当前态谓词，并发状态变化会被覆盖；无 `deleted_at IS NULL`，已软删记录仍可编辑。
- 终态（`passed/scrapped/concession_received`）仍可改数量、结果或回退状态，检验结论可被事后篡改。
- delete 无软删过滤，且不检查 `rows_affected`，对不存在/已删除记录返回成功（假成功）。

## 代码改动

- `InspectionStatus` 新增 `editable_from()`（`pending/inspecting/failed/rework`）与 `can_update_from(target)`：
  - 终态不可编辑；
  - `pending → inspecting`；
  - `inspecting → passed/failed/rework/scrapped/concession_received`；
  - `failed/rework → inspecting`；
  - 禁止回退 `pending`，同态幂等。
- update：先按 `id + tenant_id + deleted_at IS NULL` 读当前态（NULL 视为 pending），缺失 404、非法 409、越权流转 409；UPDATE 增加 `AND status IS NOT DISTINCT FROM $10 AND deleted_at IS NULL`，0 行 409。
- delete：WHERE 增加 `status = ANY(editable_from) AND deleted_at IS NULL`，检查 `rows_affected`，0 行 409。

## 数据库

无 DDL。`status` 可空、默认 `pending`；本批按可空读取并归一。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes update_lifecycle_is_strict --lib` 1 passed。
- `cargo fmt -p topems-mes` 已执行。

## 遗留

`concession_received` 的权限审批入口仍走独立 approval 流程；本批只保证普通 update 不能绕过审批直接落终态。
