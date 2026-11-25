# B294 MES 在制品状态守卫（2026-11-25）

## 结论

`mes.wips` 本地 2 行、status 全为 `in_progress`，四态 CHECK 已存在，但写入口存在生命周期与租户隔离缺口：

- `PUT /api/mes/wips/{id}` 只按 `id` 更新，没有 `tenant_id`、没有 `deleted_at IS NULL`、没有来源态条件：`completed/transferred` 可被改回 `in_progress`，也可重复完成。
- `fetch_optional → None` 统一 404，无法区分不存在与并发冲突。
- `POST /api/mes/wips/transfer` 预读只过滤软删，不拦 `completed/transferred`；插入 `wip_transfers` 后对 WIP 的回写用 `let _` 吞掉结果，且回写无 tenant/status/删除谓词，可能落一条孤立转移单。
- `DELETE /api/mes/wips/{id}` 只允许 completed，但没有 `deleted_at IS NULL`，可重复软删。

## 状态机

`svc/mes/src/modules/wip_status.rs::WipStatus`

- `pending → in_progress`
- `in_progress → completed / transferred`
- `completed / transferred` 为终态
- 同态幂等
- `transferable_from()`：`pending`、`in_progress`

## 代码改动

- `update_wip`：
  - 补 `require_write_tenant`，先按 `id + tenant_id + deleted_at IS NULL` 读当前态。
  - 缺失 404；当前态解析失败回退 `DEFAULT`（兼容历史 NULL）。
  - 目标态走 `can_transition_to`，终态/非法流转 409。
  - UPDATE 增加 `AND tenant_id = $7 AND status IS NOT DISTINCT FROM $8 AND deleted_at IS NULL`；`fetch_optional=None` → 409。
  - 原 `sqlx::query!` 改为 `sqlx::query_as::<_, WipCreateRow>`，避免新增 `.sqlx` 缓存依赖。
- `transfer_wip`：
  - 父行状态预检：仅 `pending/in_progress` 可转移。
  - 子表 `wip_transfers.tenant_id` 改用请求租户，不再二次查询可能为空的父租户。
  - WIP 回写改为带 `tenant_id + status = ANY(transferable_from()) + deleted_at IS NULL` 的 UPDATE，并检查 `rows_affected`；0 行回滚 409，不再吞错。
- `delete_wip`：WHERE 增加 `AND deleted_at IS NULL`。

## 数据库

无 DDL。`ck_mes_wips_status_standard` 四态 CHECK 已存在并 VALIDATE，本地 2 行 `in_progress`，合法。

## 验证

- `cargo check -p topems-mes` PASS。
- `cargo test -p topems-mes wip_status --lib` 3 passed。

## 遗留

`WipStatus::Transferred` 目前没有独立写入口，transfer 接口结束后仍保持 `in_progress`；状态语义可在业务流程批次再确认。
