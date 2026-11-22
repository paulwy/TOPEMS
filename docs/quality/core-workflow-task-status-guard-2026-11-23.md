# B170 · 工作流任务状态（2026-11-23）

## 枚举
- `svc/unified-core/src/modules/flow/workflow_task_status.rs` → `WorkflowTaskStatus`：`pending / claimed / approved / rejected / completed / delegated / error`，默认 `pending`。
- 值集来源：任务列表过滤、`task.rs` 与 `approval.rs` 两处任务创建，以及领取/退回/通过/驳回/完成/转办六个流转端点；`error` 保留给异常任务统计。

提供 `DB_VALUES / DEFAULT / as_db_str / from_db_str / 单测`。

## 代码收口
- 列表：`status` 过滤支持空 / `all`，非法值返回 400（`ValidationFailed`），计数与列表查询只绑定规范值。
- 任务创建：`approval.rs` 的 `VALUES ($1, 'start', $2, 'pending', $3)` 改为 `VALUES ($1, 'start', $2, $4, $5)`，状态与租户分别绑定 `WorkflowTaskStatus::DEFAULT` 和原租户参数。
- 状态流转：领取、退回、通过、驳回、完成、转办全部绑定枚举；`SET status = '...'` 改为参数绑定，单条与批量路径均补第三绑定（`$3`），保留 `comment = COALESCE($2, comment)`。

## 本地 DB 应用
文件：`docs/database/core-workflow-task-status-check-candidates-2026-11-23.sql`，约束 `NOT VALID`：

- `public.core_workflow_tasks.status` → `ck_core_workflow_tasks_status_standard`（七值）

表当前 0 行。用只读事务构造 `status='bogus'` 的新插入，被 `ck_core_workflow_tasks_status_standard` 拦截，随后 `ROLLBACK`，未留下数据。

## 刷新结果
- catalog：**349 条状态 CHECK / 5 个 PG ENUM / 374 个无约束状态列**
- 盘点：**232 个 Rust 枚举 / 206 个值 / 59 个不在 DB CHECK / 216 个前端键 / 色板缺口 0**
- 缺口队列：**45 个枚举 / 59 个值，全部 `internal_state`**
- 前端键不在 DB CHECK：**69**
- 映射：共 **204 条**

## 门禁
- `cargo clippy -p topems-unified-core --lib --tests --no-default-features -- -D warnings`：PASS
- `cargo test -p topems-unified-core --lib`：569 passed / 0 failed
- catalog / inventory / queue 的 `--check`：PASS（`--strict-palette` 色板缺口 0）

## 边界
候选只应用到本地 `topems`；生产快照只读，未应用。生产发布需执行候选并按窗口 `VALIDATE`。`public.core_workflow_tasks.status` 可空，约束显式放行 `NULL`，非空值必须在七值集合内。
