# RD 关联项目生命周期事件补全（B258）

## 背景

B253 已把 `rs.rs_projects.status` 收敛为四态 `pending/in_progress/completed/cancelled`，
并修复完成事件按 `name` 误伤同名项目的问题；但当时只有创建（pending）与完成（completed）
两个写入方，`in_progress` 与 `cancelled` 没有任何事件来源，统计接口的“进行中”长期为 0。

PM 项目状态实际为 `draft/pending_approval/active/paused/completed/cancelled/rejected`，
原 `PmProjectCreated` 在创建时固定写 `draft`，后续变成 `active` 或 `cancelled` 不会通知 RD。

## 方案

新增事件 `EventType::PmProjectStatusChanged` 与 `PmProjectStatusChangedPayload`：

```rust
pub struct PmProjectStatusChangedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub status: String,          // PM 原始状态：active/cancelled/rejected
    pub changed_by: Option<String>,
    pub changed_at: Option<DateTime<Utc>>,
    pub tenant_id: Option<Uuid>,
}
```

PM 侧只在真实流转时发布一次：

- `active`：`draft/pending_approval/paused → active`
- `cancelled` / `rejected`：进入终态
- `completed` 继续走既有 `PmProjectCompleted`，避免同一流转发两条事件

RD 侧新增 `RdProjectStatus::from_pm_status` 映射：

| PM status | RD status |
|---|---|
| `active` | `in_progress` |
| `cancelled` / `canceled` / `rejected` | `cancelled` |
| `draft` / `pending_approval` / `paused` / `completed` | 不处理 |

SQL 更新带来源态守卫，保证只沿生命周期正向流转：

```sql
-- active → in_progress：只允许 pending
WHERE source_type='pm_project' AND source_id=$3 AND tenant_id=$4 AND status='pending'

-- cancelled/rejected → cancelled：只允许 pending/in_progress
WHERE source_type='pm_project' AND source_id=$3 AND tenant_id=$4
  AND status IN ('pending','in_progress')
```

已完成或已取消的项目不会被后续事件复活；重复投递同一事件是幂等空操作。

## 验证

- `cargo fmt --check` PASS
- `cargo clippy -p topems-shared-event -p topems-pm -p topems-rd --all-targets -- -D warnings` PASS
- `cargo test -p topems-rd --lib`：**160 passed**（新增 `pm_status_mapping_covers_lifecycle`）
- `cargo test -p topems-pm --lib`：540 passed
- `cargo test -p topems-shared-event --lib`：379 passed，3 ignored

本地 `topems_rd_test` 事务探针（已回滚）：

| 动作 | rows_affected | 结果 |
|---|---:|---|
| pending → in_progress | 1 | 允许 |
| in_progress → cancelled | 1 | 允许 |
| cancelled → in_progress | 0 | 终态保护，不复活 |

现有 17 条真实 `rs.rs_projects` 仍全部为 `pending`；本批只补事件接线，不改数据、不加约束、不动迁移。

## 残余

- `paused` 目前不改变 RD 状态：RD 侧没有暂停态，项目仍算执行中。
- `rejected` 统一落为 `cancelled`，因为 RD 只有终止态；如未来需要区分拒绝原因，应扩展 RD 枚举而不是复用文本。
- 事件投递仍依赖 outbox/commit_retry；PM 发布失败会入重试队列，RD 消费幂等。
