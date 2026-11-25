# B297 MES 质量标准生命周期守卫（2026-11-25）

## 结论

`mes.quality_standards` 本地 1 行、status 为 `active`；列可空、默认 `'active'`，三态 CHECK 已存在。写入侧缺口：

- create/update 直接透传任意 `status`，非法值落到 DB 23514，接口以 500 暴露。
- update 无 `deleted_at IS NULL`，已软删标准仍可修改；无当前态谓词，并发状态变化会被覆盖；`archived` 仍可编辑。
- delete 无软删过滤，且不检查 `rows_affected`，对不存在/已删除记录返回成功（假成功）。

## 代码改动

- 新增 `QUALITY_STANDARD_STATUSES` 与 `normalize_quality_standard_status`（`active/inactive/archived`，大小写归一，非法 `None`），附单测。
- create：`status` 先归一，缺省写 `active`，非法 400。
- update：`status` 先归一，非法 400；按 `id + tenant_id + deleted_at IS NULL` 读当前态（可为 NULL），缺失 404，`archived` 409；UPDATE 增加 `AND status IS NOT DISTINCT FROM $12 AND deleted_at IS NULL`，绑定当前态。
- delete：WHERE 增加 `deleted_at IS NULL`，检查 `rows_affected`；0 行 404。

## 数据库

无 DDL。`status` 仍可空但默认 `active`；接口层读写均按可空处理。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes status_is_strict --lib` 2 passed（含本批 1 项）。

## 遗留

`archived` 终态与 `inactive → active` 仍无独立接口，本批只阻止 archived 编辑。
