# B299 MES 工单通用编辑/删除守卫（2026-11-25）

## 结论

`mes.work_orders` 本地 56 行、status 全部 `completed`。动作端点（start/complete/pause/resume/cancel）已有起始态集合，但通用 `PUT /work-orders/{id}` 仍有缺口：

- WHERE 只有 `id + tenant_id`，无当前态谓词，可绕过动作端点直接改已完工工单的产量、计划日期、工位、班组与备注；并发状态变化会覆盖。
- 无 `deleted_at IS NULL`，已软删工单仍可编辑。
- delete 已有 `DELETABLE`（pending/cancelled）状态谓词，但无软删过滤，可对已删除记录重复返回成功。

## 代码改动

- `WorkOrderStatus` 新增 `EDITABLE`：`pending/in_progress/paused`；completed/cancelled 为终态。
- update：按 `id + tenant_id + deleted_at IS NULL` 预读当前态；缺失 404，终态 409；UPDATE 增加 `AND wo.status = $18 AND wo.deleted_at IS NULL`，0 行按现有逻辑返回 404。
- delete：WHERE 增加 `wo.deleted_at IS NULL`。

## 数据库

无 DDL。`status` 为 NOT NULL 默认 pending，五态 CHECK 已存在。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes work_order_status_db_strings_roundtrip --lib` 1 passed。
- `cargo fmt -p topems-mes` 已执行。

## 遗留

动作端点仍允许各自合法流转；本批只封住通用编辑绕开终态。已完工工单如需更正，应走专门的更正/反冲流程，而不是 PUT。
