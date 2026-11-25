# MES 批量调整排产 0 行校验与整批回滚（B332）

日期：2026-11-26

## 背景

`mes.production_schedules` 本地 9678 行，状态全部 `scheduled`，当前无软删记录。

B316 已给批量调整排产的 UPDATE 补上 `status = ANY($6)`、`deleted_at IS NULL` 与租户谓词，但没有检查每条 `rows_affected`：

- 不存在的 id、已软删记录、或已进入不可调整状态的排产，UPDATE 返回 0 行；
- 循环继续执行，最后照常 `commit` 并返回“调整成功”；
- 空 `schedule_ids` 也会返回成功；
- 一批中部分成功、部分失效时，前端收到全量成功，实际只改了有效记录。

## 改动

`svc/mes/src/modules/production_scheduling.rs` 的 `adjust_schedule`：

- 空 `schedule_ids` 直接 400“未选择需要调整的排产记录”；
- 每条 UPDATE 检查 `rows_affected`，0 行计入 `invalid_ids`；
- 存在任意无效 id 时，先 `rollback` 整个请求事务，返回 409，并列出无效 id；
- 全部有效时按实际更新条数返回成功文案；
- 查询失败同样回滚后返回 500，避免半批提交。

`status = ANY(adjustable_from())`、租户、软删谓词和字段更新范围均不变。

## 验证

- `cargo fmt -p topems-mes`
- `cargo check -p topems-mes` PASS
- `cargo test -p topems-mes --lib production_schedule`：1 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地 9678 行全部 `scheduled` 且无软删，无法用存量触发 0 行路径；改动属于防御性收紧。
- 批量调整改为“任一无效应整批回滚”，前端若混合提交有效/失效 id，将从成功变为 409，需要清理选择后重试。
- 单条 `update_schedule` 已有 `fetch_optional` 与状态谓词，本批未改。
