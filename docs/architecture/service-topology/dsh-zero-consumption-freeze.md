# DSH（svc/ai `/dsh/*`）前端零消费面冻结清单

> 盘点日期：2026-10-19 · 来源：`svc/ai/src/routes.rs` 路由树 vs `apps/web/src` 活代码（`api/ai/*` + 页面，排除 `api/ai/generated/client.ts` 零消费废弃生成代码与 `__tests__`）。
> 口径：**后端已实现、前端活代码零直连**的端点 → **冻结保留**（不接真、不删除、不建前端面板），登记待未来前端面板 / 内部观测 / 外部集成复评。本清单不改任何代码。

## 1. 已被前端消费的边界（对照，证明盘点完整）

| 域 | 前端在用端点 | 前端封装 |
|---|---|---|
| agent（5/5） | `execute`(POST)、`stream`(POST)、`session/{id}`(GET/DELETE)、`tools`(GET)、`active-sessions`(GET) | `api/ai/dshAgent.ts` |
| copilot（8/8） | `sessions`(POST/GET)、`sessions/{id}`(GET/DELETE)、`sessions/{id}/messages`(POST/GET)、`sessions/{id}/records`(PUT)、`sessions/{id}/context`(PUT)、`intent/recognize`(POST)、`modules`(GET)、`modules/{module}`(GET) | `api/ai/businessCopilot.ts` |
| governance（11/12） | `dashboard`、`score`、`risk`、`compliance`、`cost`、`performance`、`metrics`、`security-events`(GET+POST)、`audit`、`recommendations`、`export` | `api/ai/governanceDashboard.ts` |
| smart-forms（3/4） | `templates`(GET)、`validate`(POST)、`ai-fill`(POST) | `api/ai/businessIntelligence.ts` |

## 2. 冻结清单（18 端点，前端零直连）

### 2.1 Agent 性能监控（4）— 运维/观测面，无前端面板
| 方法 | 路径 | 冻结理由 / 复评条件 |
|---|---|---|
| GET | `/dsh/agent/performance/metrics` | 内部性能指标；待运维观测面板或 Prometheus 抓取复评 |
| GET | `/dsh/agent/performance/prometheus` | Prometheus 文本导出；待监控接入复评 |
| POST | `/dsh/agent/performance/reset` | 指标重置（运维操作）；待管理面板复评 |
| GET | `/dsh/agent/performance/tools/{tool_name}` | 单工具性能；待观测面板复评 |

### 2.2 知识图谱 KG（9）— 能力已实现，无前端图谱视图
| 方法 | 路径 | 冻结理由 / 复评条件 |
|---|---|---|
| POST/GET | `/dsh/kg/entities` | 实体增/列；待知识图谱前端复评 |
| GET/DELETE | `/dsh/kg/entities/{entity_id}` | 实体详情/删除；同上 |
| GET | `/dsh/kg/entities/{entity_id}/neighbors` | 邻居查询；同上 |
| POST/GET | `/dsh/kg/relations` | 关系增/列；同上 |
| POST | `/dsh/kg/shortest-path` | 最短路径；同上 |
| POST | `/dsh/kg/link-entity` | 实体链接；同上 |
| GET | `/dsh/kg/communities` | 社区发现；同上 |
| GET | `/dsh/kg/stats` | 图谱统计；同上 |
| POST | `/dsh/kg/extract` | 实体抽取；同上 |

### 2.3 RAG（2）— 后端内部消费，非前端死代码
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/dsh/rag/retrieve` | 前端零直连，但被后端 enhanced_handler 内部调用（B3 已接 pgvector），**属内部依赖，不可删** |
| GET | `/dsh/rag/stats` | RAG 统计；前端零直连，待观测面板复评 |

### 2.4 多 Agent 协作（1）
| 方法 | 路径 | 冻结理由 / 复评条件 |
|---|---|---|
| POST | `/dsh/multi-agent/execute` | 多 Agent 编排执行；无前端入口，待协作面板复评 |

### 2.5 治理缓存 / 表单详情（2）
| 方法 | 路径 | 冻结理由 / 复评条件 |
|---|---|---|
| DELETE | `/dsh/governance/cache` | 治理聚合缓存清理（运维）；前端无清除按钮，待管理面板复评 |
| GET | `/dsh/smart-forms/templates/{id}` | 模板详情；前端仅取列表，未拉详情，待表单设计器复评 |

## 2.6 EHS 职业健康（`svc/ehs`，非 DSH，并入本冻结面统一登记）

> 后端 `svc/ehs/src/modules/occupational_health.rs`（1422 行）已挂路由（`modules/mod.rs:38` `create_routes()`），前端 `api/ehs/occupationalHealth.ts` 封装 CRUD，但 **pages/components 零消费**。

| 方法 | 路径 | 现状 |
|---|---|---|
| GET/POST | `/occupational-health/records`、GET/PUT/DELETE `/records/{id}` | **已接真 DB**（`ehs.health_records` SELECT/INSERT 走 pool） |
| GET/POST | `/occupational-health/check-plans`、`/check-plans/{id}` | 内存桩（硬编码 vec! 示例），待接真 |
| GET/POST | `/occupational-health/check-records`、`/check-records/{id}` | 内存桩，待接真 |
| GET | `/occupational-health/contraindications`、`/contraindications/{id}`、`/statistics` | 内存桩（职业禁忌症/统计示例），待接真 |

**冻结处置**：不接真、不删除；待职业健康页面开发时，先把 check-plans/check-records/contraindications/statistics 内存桩替换为 DB 实现，再接线前端封装。

## 3. 处置原则

- **冻结而非删除**：这些端点后端 handler 完整、带 auth+tenant 中间件，删除会破坏未来面板与内部观测；保留为已实现能力。
- **复评触发**：出现对应前端面板需求、接入 Prometheus/运维观测、或外部集成调用时，再从冻结清单移出对接。
- **RAG 例外**：`/dsh/rag/retrieve` 虽前端零直连，但是后端 RAG 增强链路的内部依赖（见 B3 核销），不得按"零消费"删除。
- 本清单与 `contract-stub-mapping.md`（core 空壳兜底核销）互补：后者管 core 占位空壳，本清单管 svc/ai 已实现但前端未用的能力面。
