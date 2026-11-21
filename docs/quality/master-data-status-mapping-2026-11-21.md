# master-data 状态映射与候选 CHECK 演练（W5-B / B22）

- 日期：2026-11-21
- 范围：`svc/master-data` 5 个模块、`docs/database/master-data-status-check-candidates-2026-11-21.sql`、`docs/database/status-db-check-mappings.json`
- 结论：master-data 13 个状态枚举全部完成“枚举 → 表列”映射，其中 12 个有独立 `status` 列、1 个（`WorkflowStepStatus`）嵌在 `steps` jsonb 无列可约束；12 条候选 `NOT VALID` CHECK 本地事务内全部创建成功，存量更新不拦截，约束回滚后零残留。

## 1. 映射表

| 枚举 | 表.列 | 唯一集合 | 本地分布 |
| --- | --- | --- | --- |
| `SubscriptionStatus` | `master_data.mdm_subscriptions.status` | active/expired/cancelled/pending | 0 行 |
| `BillingStatus` | `master_data.mdm_billing_records.status` | pending/invoiced/paid/overdue | 0 行 |
| `IncidentStatus` | `master_data.mdm_sla_incidents.status` | open/investigating/resolved/closed | 0 行 |
| `RecoveryPlanStatus` | `master_data.mdm_recovery_plans.status` | draft/active/executing/completed/failed | draft 2 + completed 1 |
| `ContinuityPlanStatus` | `master_data.mdm_continuity_plans.status` | draft/active/tested/expired | active 1 + tested 1 |
| `RegionStatus` | `master_data.mdm_region_configs.status` | online/offline/degraded | 各 1 |
| `ReplicationStatus` | `master_data.mdm_replication_configs.status` | stopped/running/paused/lagging | stopped 2 |
| `FailoverStatus` | `master_data.mdm_failover_records.status` | initiated/in_progress/completed/rolled_back | completed 1 |
| `DataProductStatus` | `master_data.mdm_data_products.status` | draft/published/deprecated/retired | published 4 |
| `QualityStatus` | `master_data.mdm_quality_checks.status` | passed/failed/warning | passed 181 + warning 15 + failed 1 |
| `FixStatus` | `master_data.mdm_auto_fix_actions.status` | pending/applied/verified/failed | applied 1 + verified 1 |
| `WorkflowStatus` | `master_data.mdm_workflows.status` | draft/running/paused/completed/cancelled | running 7 + cancelled 3 + completed 2 |
| `WorkflowStepStatus` | `master_data.mdm_workflows.steps`（jsonb） | pending/in_progress/approved/rejected/skipped | 无独立列，**不加 CHECK** |

12 个列均为 `text NOT NULL`；本地存量值全部落在枚举集合内，预检 0 违例。

## 2. 代码侧事实

- 5 个模块的枚举都带 `#[serde(rename_all = "snake_case")]`，读写各有一对 `*_status_to_str` / `*_status_from_str`。
- `from_str` 全部是“兜底归默认”式写法（如 `billing_status_from_str` 未知值归 `Pending`、`incident_status_from_str` 归 `Open`、`quality_status_from_str` 归 `Passed`），不是严格解析。
- 这意味着写库值域理论上可控，但非法值静默归一仍在读路径；DB CHECK 落地后，非法写入会在写库处直接 23514，不再进入兜底分支。
- `mdm_workflows.steps` 是 jsonb 数组，步骤状态不落独立列，列级 CHECK 无法覆盖，只能后续做 jsonb 结构校验。

## 3. 演练

```text
BEGIN
\i 第 1 节（12 条 ALTER ... NOT VALID）   → 12 次 ALTER TABLE 成功
pg_constraint 计数                        → 12 条 mdm_*_status_check
UPDATE mdm_workflows SET status=status     → UPDATE 7（存量合法行不被拦截）
（无非法写入；master-data 未做 bogus 用例，finance 批次已验证 23514 生效）
ROLLBACK
```

回滚后复查：`mdm_%status_check` 0 条，本地库未被修改。

## 4. 队列同步

- `docs/database/status-db-check-mappings.json` 新增 13 条人工映射（含 1 条 `persisted: false` 说明）。
- `status-db-check-queue.mjs` 读取该映射，队列行上输出 `resolved` 字段；当前 `resolved_enums` = 13，master-data `persisted_unmapped` 归零。
- 队列的启发式分桶保留不变，映射是人工确认结果，两者互不覆盖。

## 5. 遗留

- 候选仍未进 `database/migrations/`，等生产窗口。
- `from_str` 静默兜底未改严格解析；DB CHECK 落地后建议同步改为 `Option`/`Err`，让非法值在应用层也显式失败。
- `WorkflowStepStatus` 需要 jsonb 级校验（后续可加 `CHECK (NOT EXISTS ...)` 或用应用层校验），本次未做。
- portal 的 21 个 `persisted_unmapped` 值尚未映射，是下一批重点。
