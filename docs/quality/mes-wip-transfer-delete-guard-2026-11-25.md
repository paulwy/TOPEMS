# B318 MES 在制品转移来源校验与删除隔离（2026-11-25）

## 结论

`mes.wips` 本地 2 行，均为 `in_progress`，且 `tenant_id`、`current_process_id`、`current_work_station_id` 全为空；`mes.wip_transfers` 0 行。

- update 已有当前态与软删谓词，但事务在 `fetch_optional` 返回 `None` 时仍先 commit，再返回 409，0 行更新被当作已提交。
- transfer 读取父 WIP 只按 `id + deleted_at`，没有 `tenant_id`；同时不校验请求里的 `from_process_id/from_work_station_id` 是否等于 WIP 当前工序/工位，可从任意工序伪造转移。
- delete 只按 `id + status`，没有 `tenant_id`；仅允许 `completed`，0 行仍报 404。

## 代码改动

- update：仅 `Ok(Some(_))` 才 commit；`Ok(None)` 走 rollback 后返回 409。
- transfer：
  - 父行查询增加 `tenant_id = $2`，并同时取 `current_process_id/current_work_station_id`；
  - 请求提供来源工序/工位时，与父行当前值不一致返回 409 并回滚；
  - 改用 `query_as::<_, WipTransferSource>`，避免新增 `sqlx::query!` 触发离线缓存缺项。
- delete：
  - 增加 `tenant_id = $3::uuid`；
  - 删除集合由 `WipStatus::deletable_from()` 统一为 `["completed"]`；
  - 0 行由 404 改为 409“不存在、已删除或状态不允许删除”。

## 数据库

无 DDL。本地 2 行 WIP 缺少租户与当前工序/工位，是本批唯一数据面风险：这两行在转移入口会因租户过滤返回 404；生产中有租户的 WIP 不受影响。

## 验证

- `cargo fmt -p topems-mes`、`cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes wip_status` 4 passed（新增 deletable 集合断言）。

## 遗留

- 本地 WIP 种子缺 `tenant_id/current_process_id/current_work_station_id`，建议后续单独修种子或回填，不在本批扩大范围。
- transfer 仍未扣减 WIP 数量，是否应拆分批/减量需业务确认。
