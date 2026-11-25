# B296 MES 工艺流程生命周期守卫（2026-11-25）

## 结论

`mes.process_flows` 本地 1 行、status 为 `active`，三态 CHECK 已存在，但 update/delete 仍有缺口：

- `PUT /process-flows/{id}` 直接透传 `body.status`：非法值不在白名单时由 DB CHECK 报 23514，接口落 500，而不是 400。
- UPDATE 无 `deleted_at IS NULL`、无当前态条件：已软删流程仍可编辑，并发状态变化会被覆盖；`archived` 流程也仍可改字段。
- `DELETE /process-flows/{id}` 无软删过滤，且 `match result { Ok(_) => success }` 不检查 `rows_affected`，对不存在/已删除记录也返回成功。

## 代码改动

- 新增 `PROCESS_FLOW_STATUSES` 与 `normalize_process_flow_status`：`active/inactive/archived`，大小写归一，非法返回 `None`；新增单测。
- update：
  - `body.status` 先严格解析，非法 400。
  - 先按 `id + tenant_id + deleted_at IS NULL` 读当前态，缺失 404；`archived` 返回 409。
  - UPDATE 增加 `AND status IS NOT DISTINCT FROM $11 AND deleted_at IS NULL`，`fetch_one` 的 `RowNotFound` 仍映 404，并发变化由状态谓词兜底。
- delete：WHERE 增加 `AND deleted_at IS NULL`，并检查 `rows_affected`；0 行返回 404。

## 数据库

无 DDL。`ck_process_flows_status_standard` 三态 CHECK 已存在；本地 1 行 `active`，合法。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes process_flow_status --lib` 1 passed。

## 遗留

`inactive → active` 与 `archived` 终态没有独立接口，本批只阻止 archived 编辑；状态机完整化可和质量标准合并到后续主数据批次。
