# lib/shared-* 状态归因与租户约束候选（W5-B / B24）

- 日期：2026-11-21
- 范围：`lib/shared-auth`、`lib/shared-core`、`lib/shared-db`、`lib/shared-event`、`lib/shared-observability`、`lib/shared-service-client` 共 14 个状态枚举
- 结论：共享库里只有 `TenantStatus` 真正落库（`public.core_tenants.status`），候选 CHECK 本地演练通过；其余 13 个是内存态/计算态/无列类型。同时发现两处口径漂移：`core_users.status` 有枚举外的 `inactive`、`public.notification_templates` 有 `status` 列但代码实际读写的是无 `status` 列的 `core_notification_templates`。

## 1. 归因

| 枚举 | 结论 | 依据 |
| --- | --- | --- |
| `TenantStatus` | **落库**：`public.core_tenants.status` | `svc/unified-core` tenant handlers 以 status 过滤/读取，表在 `public` |
| `UserStatus` | 不落库（且存在漂移） | 无代码把该枚举写入表；`public.core_users.status` 有 `inactive`（本地 1 行）不在枚举 `active/invited/suspended` 内 |
| `SubscriptionStatus`（shared-auth） | 内存态 | `svc/unified-core/src/modules/subscription/mod.rs` 无 SQL，纯 tier 计算 |
| `ApprovalStatus`（shared-core） | 无固定列 | 各服务自己的审批表各自定义值域 |
| `HealthStatus` / `ServiceStatus` / `SLOStatus` | 计算态 | 健康度/监控指标运行期计算，不落库 |
| `BackupStatus` / `DsrRequestStatus` | 内存态 | 备份只有内存元数据 + 文件路径；DSR 在内存统计 |
| `NodeStatus` / `TraceStatus` / `SagaStatus` / `StepStatus` | 内存态 | 集群、事件轨迹、saga 编排均为进程内结构 |
| `TemplateStatus` | 无列 | `public.core_notification_templates` 没有 `status` 列，模板状态只在内存/API |

## 2. 租户状态候选 CHECK（已演练）

`lib/shared-auth` 的 `TenantStatus` 四值 `active/suspended/trial/deleted`，本地 `public.core_tenants`：active 794、trial 3，无越界值。

```sql
ALTER TABLE public.core_tenants
  ADD CONSTRAINT core_tenants_status_check
  CHECK (status IN ('active','suspended','trial','deleted')) NOT VALID;
```

演练（`docs/database/tenant-status-check-candidates-2026-11-21.sql`）：

```text
BEGIN
预检                                     → 0 行
ALTER ... NOT VALID                       → 成功
pg_constraint                            → core_tenants_status_check 在位
UPDATE core_tenants SET status=status WHERE status='trial' → UPDATE 3
ROLLBACK
回滚后复查                                → 0 条
```

## 3. 两处漂移（需业务/治理决策，本批未改）

1. **`core_users.status='inactive'`**：`UserStatus` 只有 `active/invited/suspended`。若将来把用户状态接 DB CHECK，这一行会直接违例；同时 `core_users` 已在 2026-10-28 双身份表收敛中被标注废弃（见 `svc/search/src/handlers.rs:96` 注释）。建议先确认用户状态以哪张表为准（`iam.users` 或 `public.core_users`），再决定补枚举还是清洗数据。
2. **模板表双份**：`public.notification_templates` 有 `status` 列但 0 行、代码零引用；`public.core_notification_templates` 无 `status` 列却是实际读写表。属于“列定义与代码错位”，建议在死表治理里合并或删掉前者。

## 4. 队列同步

- 映射 JSON 增至 52 条；`resolved` 38 → 52，未解析 61 → 47。
- 未解析集中在 `ai`(5)、`analytics`(1)、`communication`(1)、`erp`(10)、`finance`(若干候选已备)、`integration`(2)、`mes`(1)、`plugin-registry`(2)、`pm`(1)、`rd`(3)、`unified-core`(4)。

## 5. 验证

- `node scripts/ci/status-db-check-queue.mjs --check`：PASS。
- 本地事务演练见第 2 节；未执行任何生产 DDL。

## 6. 遗留

- `public.core_tenants.status` 的生产分布未知，窗口前需在快照库跑预检。
- `unified-core` 自身的 `TenantStatus/SubscriptionStatus/VersionStatus/HealthStatus`（4 条）与 shared-auth 同名但独立定义，下一批按“同名不同源”处理。
- `core_users` / `notification_templates` 的取舍需单独立项。
