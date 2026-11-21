# B88 · 工作流推进/批准/拒绝并发与假成功收口（2026-11-21）

## 现状（改动前）
- advance：没有 in_progress 步骤时仍执行 UPDATE 并返回 200，属于假成功；并发推进靠“先读后无条件写”。
- approve/reject：只校验内存里的 step.status，UPDATE 无状态/时间戳谓词；并发批准与拒绝可互相覆盖，后写者胜。
- approve/reject 在上一次更新成功后仍会追加历史，重复/冲突请求可能重复记录。

## 改动
1. 新增 `WorkflowTransitionOutcome`：Updated / NotFound / Conflict；三个流转函数都返回明确结果。
2. advance 要求 workflow=running 且存在 in_progress 步骤；否则 409。UPDATE 增加 `status='running'` + `updated_at` 乐观锁谓词，0 行 409。
3. approve/reject 要求 workflow=running、目标步骤 in_progress；UPDATE 在同样时间戳谓词外增加 `steps @> [{"id":..,"status":"in_progress"}]`，确保内存判断与库内状态一致，0 行 409。
4. 三个 handler 的“无法操作”从 400 / 假 200 改为 404（工作流或步骤不存在）与 409（状态已变更）；历史只在 UPDATE 成功后写入。

## 验证
- `cargo fmt --all`、`cargo clippy -p topems-master-data --all-targets -- -D warnings` 干净。
- 工作流单测通过。
- 本地演练（事务内 ROLLBACK）：running + in_progress 临时工作流，advance 谓词首次 `UPDATE 1`、重复 `UPDATE 0`；approve 的 JSONB + 时间戳谓词首次 `UPDATE 1`、重复 `UPDATE 0`。

## 残留
- 当前没有 pause/resume/cancel 写接口；paused 仍只读。
- 工作流状态候选 CHECK 已登记但未在生产执行；本地 12 行状态全部合法。
