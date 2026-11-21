# B31 · ai DSH 状态归因（2026-11-21）

## 结论
`svc/ai/src/dsh` 的 5 个状态枚举全部是**内存态**（4 个模块 `sqlx`/`query!` 命中均为 0），不入 CHECK 候选；已在映射中标记 `persisted:false`（队列 `resolved` 66→73，未解析仍在 33 个）。

| 枚举 | 位置 | 归因 |
| --- | --- | --- |
| `ComplianceFrameworkStatus` | `dsh/governance_dashboard/mod.rs` | 框架合规评估结果（compliant/partially/…），仅仪表盘展示 |
| `TaskStatus` | `dsh/multi_agent/mod.rs` | 多智能体任务分配态（assigned/timeout） |
| `TemplateStatus` | `dsh/prompt/mod.rs` | 提示词模板内存生命周期（含 deprecated） |
| `NodeExecutionStatus` | `dsh/workflow/mod.rs` | 节点执行态（含 skipped/timeout） |
| `WorkflowExecutionStatus` | `dsh/workflow/mod.rs` | 工作流执行态（含 waiting），无执行记录表 |

## 反向发现：ai schema 的 status 列另有其人
`ai` schema 13 张表里有 4 个状态列，全部无 CHECK、且不由这 5 个枚举写入：

- `ai.documents.status`：本地 32 行全 `pending`，写入方 `svc/ai/src/services/qa.rs`、`recommendation.rs`；
- `ai.ai_models.status`：6 行 `active`，写入方 `handlers/model_admin_handlers.rs`；
- `ai.usage_logs.status`：3 行 `success`，语义是调用结果而非生命周期；
- `ai.document_chunks.embedding_status`：本地 0 行，写入方 `services/vector.rs`。

这四列是下一步 ai 域收口的真实目标（需要先定值集：documents 是否只有 pending/indexed/failed、embedding_status 的 pending/embedded/failed 等）。

## 残留
- 未改 ai 代码：本批只做归因与队列收敛。
- `ai.documents.status` / `embedding_status` 的写入路径已在 `services/qa.rs`、`vector.rs`、`recommendation.rs`，尚未枚举化；建议作为 B32（ai 首个真实收口），先盘点写入字面量与前端展示键。
- 队列未解析仍有 33 个枚举（rd 3、plugin-registry 2、integration 2、analytics/communication/mes/pm 各 1 等），`persisted_unmapped` 值口径 33。
