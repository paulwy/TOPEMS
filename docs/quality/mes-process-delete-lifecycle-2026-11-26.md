# MES 生产工序删除生命周期与引用守卫（B333）

日期：2026-11-26

## 背景

`mes.production_processes` 本地 10 行，状态全部 `active`，当前无软删记录；六类引用当前均为 0。

工序的写入口存在生命周期不一致：

- `update_process` 只允许 `status='active'`；
- `deactivate_process` 只允许 `active -> inactive`，且没有重新启用入口；
- `delete_process` 却允许 `status IN ('active','inactive')`，active 工序可以跳过停用直接软删；
- 删除前不检查工艺路线、生产记录、排产、在制品、转移记录、前后工序引用，可能留下指向已删工序的悬挂引用；
- 0 行返回 404，无法区分“不存在/已删除/状态冲突”。

## 改动

`svc/mes/src/modules/production_process.rs` 的 `delete_process`：

- 写前读取当前状态（带 `tenant_id` 与 `deleted_at IS NULL`），不存在或已删除返回 404；
- 仅 `inactive` 可删除，active 返回 409“请先停用”；
- 新增引用检查：`process_route_steps`、`production_records`、`production_schedules`、`wips.current_process_id`、`wip_transfers.from/to_process_id`、其他工序的 predecessor/successor；任一未软删引用存在即 409；
- 软删 UPDATE 收敛为 `status='inactive' AND deleted_at IS NULL`；
- 0 行由 404 改为 409“不存在、已删除或状态已变化”。

## 验证

- `cargo fmt -p topems-mes`
- `cargo check -p topems-mes` PASS
- `cargo test -p topems-mes --lib production_process`：2 passed

本批无 migration、无 DDL。

## 风险与遗留

- 本地 10 行工序全部 active 且引用为 0，上线后直接删除 active 工序会从成功变为 409，必须先停用；这是有意的生命周期收紧。
- 仍无“重新启用工序”入口；如需 inactive -> active，应另立状态迁移与并发谓词批次。
- 引用检查只覆盖当前已知六类关系；若后续新增工序引用表，需要同步扩展该检查。
