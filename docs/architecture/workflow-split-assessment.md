# Workflow（流程引擎）拆分专项评估

> **状态**：评估完成（2026-09-01） · **背景**：服务调用拓扑 × 物理库拆分预案显示 workflow-service 被 **14 个跨库调用方**依赖，是拆分最大成本点
> **关联**：`service-topology.cross-db.html` · `cross-db-calls.md` · `database-split-plan.md` §3 阶段 2 · `TODO.md`

## 1. 现状

| 项 | 事实 |
|---|---|
| **引擎归属** | workflow 为 **unified-core 的 flow 模块**（虚拟服务，8000 端口与 iam/doc/file 共用，按 URL 路径区分） |
| **数据位置** | core 库 `flow` schema（12 张表） |
| **表清单** | `workflows`（流程定义）· `workflow_versions` · `workflow_instances` · `workflow_instance_snapshots` · `core_workflow_instances` · `core_workflow_tasks` · `approvals` · `approval_records` · `approval_withdrawals` · `workflow_rollbacks` · `audit_logs` · `notifications` |
| **API 形态** | `TypedServiceClient<WorkflowApi>`：`/tasks/my/pending\|completed\|stats\|count`、`/tasks/{id}/approve\|reject\|claim\|delegate`、`/api/flow/instances[...]`、`/api/flow/statistics` |
| **调用方** | crm / ehs / finance / mobile / pm / qms / srm / portal + server 模块（erp/crm/pm/qms/finance/srm/ehs-module）= **14 个** |
| **认证** | 全部经 `with_service_token`（`workflow:read`）——**服务间认证已就绪** |

## 2. 调用模式分析

按 WorkflowApi 端点归类（决定"复制 vs 共享"的关键证据）：

| 调用类别 | 端点 | 频率 | 跨域性 |
|---|---|---|---|
| **个人待办/已办** | `/tasks/my/pending/completed/stats/count` | 高（每个页面/门户聚合） | **强跨域**（一个用户聚合所有域审批任务） |
| **任务操作** | `/tasks/{id}/approve/reject/claim/delegate` | 低（人工审批） | **强跨域**（srm 发起 → qms 会签 → finance 审批） |
| **实例管理** | `/api/flow/instances[...]`、`/instances` | 中（业务触发发起/查询） | **中**（实例归属发起域，但流转跨域） |
| **全局统计** | `/api/flow/statistics` | 低 | 全局 |

**关键判断**：一个审批流**天然横跨多域**（供应商准入→质量会签→财务审批）。任务按**审批人用户**分配而非按域分配——`my_task_stats`（portal/mobile 个人中心）需要**全局任务视图**。

## 3. 方案对比：独立共享库 vs 分片复制

### 方案 A：保持独立共享库（flow 留在 core 库，API 跨库调用）
- workflow 数据单一源；各域通过已就绪的 service token API 调用
- 拆分后 flow schema 归属 **topems_core**（unified-core 继续提供 workflow API）

### 方案 B：流程数据随各域复制/分片
- 每个业务域库维护本域 flow 副本（instances/tasks 按域分片），事件同步（Redis Stream + DLQ）

### 多维度评分（1-5 分，越高越优）

| 维度 | A 独立共享库 | B 分片复制 | 权重说明 |
|---|---|---|---|
| 数据一致性 | **5**（本地事务强一致） | 2（最终一致，跨库事务难） | 审批状态不容最终一致 |
| 跨域审批支持 | **5**（天然全局流转） | 1（分片后跨域流转断裂） | 核心业务模式 |
| 待办聚合（个人中心） | **5**（单点查询） | 1（跨库聚合复杂） | portal/mobile 高频依赖 |
| 调用延迟 | 3（跨库 API） | 4（域内本地） | 流程操作非实时高频 |
| 拆分改造量 | **5**（零额外改造，API 已就绪） | 2（同步/补偿/冲突处理） | 当前阶段最关键 |
| core 库去中心化 | 2（中心依赖） | 4（去中心） | 唯一支持 B 的点 |
| 审计追溯 | **5**（全局 audit_logs） | 2（跨库碎片化） | 合规需求 |
| 运维复杂度 | **5**（单一数据源） | 2（多副本一致性运维） | — |
| **加权总分** | **35** | **18** | — |

## 4. 结论

**采用方案 A（保持独立共享库）**，理由：

1. **流程引擎的本质是跨域协调器**——审批流天然横跨 srm/qms/finance 等多域，任务按审批人分配而非按域分配。分片复制违背流程引擎的全局性本质，强行分片会引入跨库事务/最终一致/待办聚合三大难题。
2. **A 方案的唯一代价是跨库 API 调用（14 条边）**——但这些调用**已全部 service token API 化**（前序服务间认证体系），拆分后零额外改造，延迟与可用性通过服务限流桶（by_service 1000）+ ServiceCallMonitor 告警已可控。
3. **流程操作非实时高频**——审批、发起为低频写；唯一高频是待办查询，可通过聚合缓存解决（见 §5），无需数据复制。

> 方案 B 仅适用于"域内自包含、审批流不跨域"的系统。TopEMS 审批流强跨域，**不适用**。

## 5. 拆分前置优化（方案 A 的增量改进）

| # | 行动项 | 说明 | 优先级 |
|---|---|---|---|
| 1 | **待办聚合缓存** | portal/mobile 侧缓存 `my_task_stats`（TTL 30-60s），避免每个页面请求跨库 | P1（高频读）✅ 已落地（2026-08-31 portal `cached_my_task_stats`） |
| 2 | **流程定义只读副本**（可选） | `workflows` 定义表规模大后可各域缓存/事件同步只读副本 | P3（规模触发）→ 评估见 §5.1 |
| 3 | **跨库调用可观测** | 已做：metrics（service 维度）+ 独立限流桶 + ServiceCallMonitor 告警；接 Prometheus 定时抓取即可闭环 | P2 ✅ 已落地（含搜索降级告警 + 熔断器） |
| 4 | **workflow API 熔断** | 服务不可用时调用方降级（现状已降级为 0/默认值），补熔断器防雪崩 | P2 ✅ 已落地（2026-09-01 CircuitBreaker） |

### 5.1 流程定义只读副本（P3）——规模触发评估

**触发条件**（建议，达到任一即启动实施）：

| 指标 | 建议触发值 | 当前值（2026-09-01 实测） |
|---|---|---|
| `flow.workflows` 定义表行数 | **> 100,000 行** | **18 行** |
| 流程定义变更频率 | 每日变更 > 100 次（触发副本同步失效频度） | 未达 |

**结论：规模未触发**，按预案维持"workflow API 单一权威源"，等待规模增长后再实施副本。

**实施预案**（规模达成时按此执行）：

1. **方案**：各域（portal/mobile/srm/qms/finance 等高频读方）本地 TTL 缓存 `workflows` 只读副本（与 P1 待办缓存同款 `CacheManager` 泛型），TTL 60-300s。
2. **同步机制**：可选两级——
   - 轻量：TTL 过期回源 workflow API（最简单，副本数据最多滞后 TTL）；
   - 强一致（可选）：`workflows` 表变更时经 `topems-shared-event`（Redis Stream）广播 `WorkflowDefinitionUpdated`，消费方增量刷新本地副本（复用现有事件基建）。
3. **只读副本边界**：仅 `workflows`（流程定义，低频变更、多域只读）；**不复制** `core_workflow_instances`/`core_workflow_tasks`（运行态数据，强一致要求高，维持 API 调用）。
4. **回退**：副本失效 → 熔断器（P2 已落地）快速失败 + 降级告警，不阻塞主链路。

## 6. 对物理拆分预案的影响

- `flow` schema **确认留在 topems_core**（不随任何业务库迁移）——拆分后 unified-core（8000）继续为全域提供 workflow API。
- 拆分预案 §3 阶段 2 无需修改；workflow 相关 14 条跨库边为**已就绪的 API 调用**，不构成前置阻塞。
- 真正前置治理保持预案 3 项不变（integration 直写、unified-core→portal、跨库事务边界）。

## 7. 建议行动

1. **采纳方案 A**，在 `database-split-plan.md` 标注 flow schema 归属 core 库且 workflow 跨库调用已就绪。
2. ~~落地 **P1 待办聚合缓存**（portal `my_task_stats` 缓存）~~ ✅ 已落地（2026-08-31）。
3. ~~将 `mark_cross_db.py` 接入 `check_split_threshold.py`——阈值触发时自动输出跨库清单（workflow 14 边将自动高亮）~~ ✅ 已接入（2026-09-01）：`check_split_threshold.py` 新增 `--mark` 显式触发 + 阈值触发时自动联动 `mark_cross_db.py` 重新生成跨库清单（实测跨库 31/同库 5，workflow 14 边高亮）。
