# B272 Mobile 任务状态写入口守卫

日期：2026-11-25
范围：`mobile.mobile_tasks.status`（五态任务状态）

## 根因

`svc/mobile/src/modules/task.rs` 已有 `is_valid_task_status`、`is_valid_task_transition` 两个校验函数，并且数据库 `ck_mobile_tasks_status_standard` 已限制五态（`pending/in_progress/completed/cancelled/on_hold`），但三个真实写入口都没有使用它们：

1. `update_task`：`status = payload.status.unwrap_or(current_task.status)` 直接落库，可写入域外值，也可 `pending -> completed` 等跳步；
2. `update_task_status`：单条状态接口直接写 `payload.status`，可把 `completed` 回退到 `cancelled` 等非法转移；
3. `batch_update_status`：批量接口直接循环写 `status`，既绕过值域/来源态校验，也不在完成时补 `completed_at`。

## 改动

- 新增 `ensure_task_status_change(from, to)`：统一校验目标值域与来源态，返回可直接给 400 的中文原因；三个写入口全部复用。
- `update_task`：
  - 写入前用 `current_task.status` 校验；
  - UPDATE 增加 `AND status = $14` 来源态条件，防止并发交错；
  - `completed_at` 只在 `completed` 时保留/补写，离开 `completed` 时清空。
- `update_task_status`：
  - 先按 `id + assignee/user + deleted_at IS NULL` 读取当前状态，任务不存在返回 404；
  - 校验值域与转移后写入；UPDATE 增加 `AND status = $6` 来源态条件。
- `batch_update_status`：
  - 先校验目标值；
  - 一次性读取本批任务当前状态，任一非法转移整批拒绝 400，不产生部分成功；
  - 逐条 UPDATE 增加 `AND status = $4` 来源态条件；
  - `completed` 时 `COALESCE(completed_at, NOW())`，非 `completed` 清空。
- 新增 4 个单元测试覆盖 `ensure_task_status_change` 的合法/非法值与非法回退。

## 验证

- `cargo test -p topems-mobile`：256 passed + OpenAPI 1 passed，0 failed。
- 数据库约束已存在且 `convalidated=t`：`pending/in_progress/completed/cancelled/on_hold`，列 `NOT NULL`、默认 `pending`。
- 本批无新增迁移；约束由 `20261121110000_mobile_schema_canonical.sql` 幂等维护。
- 未改前端契约；接口仍返回 200 + `success/failed`，非法请求改由 400 拒绝。

## 说明

批量接口在任一任务当前态不允许目标态时整批拒绝，而不是把合法任务先改掉、非法任务计入 `failed`，避免一次批量操作产生分裂状态。
