# advanced+ai 架构分析

> 分片范围：`svc/master-data`(8090)、`svc/analytics`(8060)、`svc/ai`(8013)。
> 证据标记：[代码实证] / [文档声称] / [漂移]。所有行号均经 `grep -n`/`Read` 实测。
> 分析日期：2026-10-02。不分析 svc/server、svc/portal、lib/shared-*、database/、deploy/、前端。

---

## 1. 分片架构现状（代码实证）

### 1.1 服务清单与规模（实测）

| 服务 | 端口 | api_prefix | src 文件数 | src 行数 | 测试文件/行数 | 自有 Schema |
|------|------|-----------|-----------|---------|--------------|-------------|
| master-data | 8090 | `/api/master-data` | 24 | 25,686 | 15 / 3,769 | `public`（SEARCH_PATH，见下） |
| analytics | 8060 | `/api/bi`（legacy `/api/v1/bi`） | 46 | 20,313 | 3 / 490 | `bi` |
| ai | 8013 | `/api/ai`（legacy `/api/v1/ai`、`/api/core/ai/v1`） | 139 | 81,409 | 7 / 2,491 | `ai` |

- 端口/服务名权威源 `config/services.yaml`：analytics→bi:8060（services.yaml:179-188，注释"report 功能已整合到 analytics (bi) 服务中 (2026-07)"，:178）；master-data:8090（services.yaml:243-251）。[代码实证]
- 三服务 src 合计 **209 文件 / 127,408 行**；其中 ai 占 64%（81k 行）。[代码实证]

### 1.2 bootstrap 模式（各服务 main.rs 实测）

| 服务 | 模板调用 | 自定义 state | 后台任务 | 判定 | 文档声称(overview V71) |
|------|---------|-------------|---------|------|------|
| master-data | `bootstrap_service`+`build_application`（main.rs:37,83） | legacy `AppState{db,auth_state,metrics,start_time}`（shared/mod.rs:9-14） | plugin auto-register（main.rs:102） | **build_application 系（A/B 混合垫片）** | A |
| analytics | `bootstrap_service`+`build_application`（main.rs:51,760） | legacy `AppState{auth_state,pool,health_config}`（main.rs:72-76） | ReportScheduler（main.rs:65-68） | **build_application 系**（路由逐行手搓于 main.rs:91-749） | **C（自定义 Prometheus）→ 漂移** |
| ai | `bootstrap_service` + **直接 `Application{router,port,name}`**（main.rs:341-345） | 巨型 `AppState`（20+ 字段，main.rs:290-311） | event subscribers + 自动索引 + plugin register | **C（自建 Application）** | **B → 漂移** |

关键证据：
- ai 没有调用 `build_application`，而是 `run(Application { router, port: resolve_port(&config), name: config.name })`（svc/ai/src/main.rs:341-345），中间件由 `routes::create_routes` 自行装配（svc/ai/src/routes.rs:344-400 手工叠 tenant/auth/rate_limit/cors/prometheus layer）。这是 Shared Bootstrap **模式 C**，与 overview V71 表（overview.md:156 "ai … **B**"）不符。[漂移]
- analytics 的 `/metrics` 用的是 **shared-bootstrap 统一**的 `prometheus_metrics_handler`（svc/analytics/src/main.rs:87；实现于 lib/shared-bootstrap/src/lib.rs:756-772 的 `GLOBAL_METRIC_HANDLE`），并非"自定义 Prometheus"。overview.md:174 "bi(analytics) … **C**（自定义 Prometheus）"已过时。真正自建 Prometheus（`PrometheusMetricLayer::pair()`+`default_registry().register(Gauge)`）的是 **ai**（svc/ai/src/main.rs:46-66）。[漂移]

### 1.3 master-data：实体范围与同步机制

- **SEARCH_PATH 仅 `public`**（svc/master-data/src/main.rs:22 `set_var("SEARCH_PATH","public")`）；`enable_events:false`（main.rs:29）；AppState 只有 `db/auth_state/metrics/start_time`，**无任何服务客户端**（shared/mod.rs:9-14）。[代码实证]
- **对外 HTTP 仅 1 处**：启动后向 unified-core 注册插件（master_plugin.rs:151 `reqwest::Client::new()`，:152-155 POST `{CORE_URL}/api/core/plugin/dev/plugins/master-data/register`，core_url 默认 `http://localhost:8000`，:131）。[代码实证]
- **无事件发布/订阅**（grep `EventPublisher|publish_event|XADD` 于 svc/master-data/src 零命中）。[代码实证]
- **无跨 schema 直读**（grep `unified_core.|plugin_*.|public.companies/...` 零命中）。[代码实证]
- **真实落库的表只有 4 张**：`core_dict_types`、`core_dict_items`、`schema_registry`、`dynamic_data`（schema_defense.rs:17-69 TABLE_DEFS）。dict 模块以**非限定名**查询 `core_dict_types/core_dict_items`（modules/dict/*.rs），依赖 SEARCH_PATH=public → 实际落在 `public.*`。[代码实证]
- **10 个 v51–v60 模块（quality/lineage/knowledge/versioning/commercial/disaster/semantic/governance/ai_governance/metadata）全部为内存 Store，不落库**：
  - 每个模块文件 `sqlx::query` 计数为 0（实测：quality_v51=0 … metadata_v60=0，仅 schema_registry.rs=14、master_plugin.rs=1）；
  - handler 签名 `State(_state): State<AppState>`（quality_v51.rs:647）——连接池被 `_state` 显式丢弃；
  - 数据源是进程内 `LazyLock<…Store>`，quality_v51.rs:9 自述"设计风格：ApiResponse + LazyLock 内存存储"，:266-272 `static STORE: LazyLock<…>`；
  - 实测 10/10 个 v5x 模块走 `get_*_store()`/`ensure_initialized()` 全局内存存储。
- **结论**：master-data **既不是"数据中台"也不是又一个业务库**——它是一个约 200 条路由（modules/mod.rs:24-568）的 MDM 能力 REST 骨架，其中 95%+ 的路由（v51–v60）返回进程内内存/硬编码数据，重启即失；真正持久化的只有字典(dict)与动态 schema(schema_registry)两块。它与各业务服务之间**没有事件同步、没有 API 同步、没有直读**——是一个近乎孤岛的演示/壳服务。[代码实证]

### 1.4 analytics：bi+report 整合形态与数据来源

- **历史整合**：svc/bi 与 svc/report 已并入 svc/analytics；main.rs 顶部自述"Unified service for BI and Report"（main.rs:8），内部 `modules/bi/`（~25 文件）与 `modules/report/`（7 文件）并存。[代码实证]
- **路由兼容层**：
  - 统一前缀 `/api/bi`（main.rs:46），legacy alias `/api/v1/bi`（main.rs:47）；
  - 遗留分析路径兼容：新路径 `/summary` 与旧路径 `/analytics/summary` 同时注册（main.rs:584-640 成对注册 7 组）；
  - **不存在 `/api/report/` 前缀**：report 模块挂在 `/api/bi/report*`（main.rs:737 `.merge(modules::report::create_routes())`，注释 :734-736）。overview.md:174 声称的 "/api/report/" 前缀在本服务内无注册（应由网关/前端代理重写，属越界，不展开）。[漂移]
- **BI 平台自身持久化**：`bi` schema，表 `analytics_dashboards/widgets/datasources/datasets/...`（bi/mod.rs:31-469，非限定名 + SEARCH_PATH="bi,public" main.rs:36；schema_defense.rs:9,17 `SERVICE_SCHEMA="bi"`）。这部分是真实 CRUD（bi/mod.rs 58 处 sqlx）。[代码实证]
- **数据来源分三类**：
  1. **直读其他域表（跨 schema）**：`reports_center_stats` 一条 SQL 直查 `iam_users/iam_roles/iam_permissions/org_companies/org_departments/org_employees/public.audit_logs`（main.rs:860-874，非限定名经 search_path 解析）——BI 不走事件/ETL，直接 join 读 IAM/组织库。[代码实证]
  2. **用户自定义外部数据源**：datasource 可保存 host/port/db/user/password 并**真实外联**：`test_connection_result` 用用户给的凭据 `PgPoolOptions::connect(postgres://user:pass@host:port/db)` 跑 `SELECT 1`（datasource.rs:165-196）。BI 服务因此获得对任意 Postgres 的出网能力。[代码实证]
  3. **硬编码/随机假数据**：领域汇总接口 `get_lims_summary` 等直接返回字面量（"total_samples":856 …，bi/analytics.rs，sqlx=0）；`reports_center_stats` 用 `rand::random()` 伪造近 6 个月用户增长（main.rs:883-884）。即"BI 仪表盘"中大部分按业务域的 KPI 是占位假数据。[代码实证]
- **ReportScheduler**：job_scheduler_ng cron 驱动（scheduler.rs:28-130），但"邮件通知"只 `info!("Sending report notification to: {}", email)`（scheduler.rs:363-375）——**无真实发信后端**，订阅投递是空操作。[代码实证]
- **对外 HTTP 仅插件注册**（bi/plugin.rs:172、report/report_plugin.rs:130 → core）。[代码实证]

### 1.5 ai：LLM / 向量 / RAG / 与 unified-core 关系

- **LLM 接入**：默认 Ollama 本地 `http://localhost:11434/v1`，模型 `qwen2.5:7b-instruct`，embedding `nomic-embed-text`（main.rs:118-126）；另支持 OpenAI 兼容云端、DeepSeek、Dify（provider/ 目录：ollama.rs/deepseek.rs/dify.rs/mock.rs/router.rs/failover.rs/recorded.rs）。Provider 抽象与 ai-architecture.md §3.3 一致。[代码实证]
- **向量检索（pgvector）**：真实 RAG 在 `modules/ai_knowledge/rag.rs`——`generate_embedding` 后用 pgvector `<=>` 余弦距离 `ORDER BY c.embedding <=> $1::vector`（rag.rs:55-75）；表 `core.knowledge_chunks.embedding vector(1536)` + ivfflat 索引（ai_knowledge/mod.rs:182,219）。[代码实证]
- **RAG 流程双实现**：`dsh/rag/mod.rs` 达 1033 行但 **0 处 sqlx::query**——它是查询改写/检索方法枚举的内存骨架，**不真正查向量库**；真正落 pgvector 的是 `modules/ai_knowledge/rag.rs`。routes.rs:80 把 `RagEngine::with_defaults()` 以 `Some` 注入 AppState，但该引擎不连库。[代码实证]
- **与 unified-core 的重复/冲突**：
  - unified-core 在 **:8000** 暴露 `GET /api/ai/models`、`/api/ai/prompt-templates`、`/api/ai/documents`、`/api/ai/qa-history`（svc/unified-core/src/routes/ai_routes.rs:12-24），handler **直查 `ai.ai_models`**（svc/unified-core/src/modules/ai/handlers.rs:31-49）；
  - 同时独立 ai 服务在 **:8013** 也暴露 `GET /models`、`/models/usage`、`/models/config`（svc/ai/src/routes.rs:196-201，model_admin_handlers.rs 读 `ai.usage_logs/ai.qa_history/public.audit_logs` :93-99）。
  - → **同一资源（AI 模型列表）由两个服务、两个端口、两条独立 SQL 提供**，属于重复实现；且 unified-core 直接跨库读 ai schema，绕过了 ai 服务边界。[代码实证/漂移]
  - 更严重：unified-core 还暴露 `modules/analytics/handlers.rs`，直查 **`analytics.analytics_dashboards/datasets/datasources/widgets`**（analytics/handlers.rs:34,48,106,120,179,193,254,268）。但库内**没有 `analytics` schema**（CREATE SCHEMA 列表仅有 bi/report…，database/migrations 注释明确"analytics_*→bi"）——该 handler 读的是不存在的 schema，属失效/死代码。[漂移]
- **MCP 业务工具 → 业务服务**：16 个域工具注册（routes.rs:109-124：erp/crm/finance/hr/mes/ehs/wms/qms/pm/lims/bi/aps/cs/scm/iot/oa）。工具以 `TypedServiceClient<ErpApi>::from_env_default()` + service token（`"ai-service"`，scope `erp:read/erp:write`）调用真实业务 API，失败降级 mock（tools/erp.rs:24-27,43）。[代码实证]
- **事件消费**：ai 订阅 3 个领域事件 `QmsQualityIssueCreated / LimsInspectionAbnormalDetected / EhsHazardReported`（event_handlers/mod.rs:35,40,46），收到后向 `ai.ai_training_samples` 插训练样本（event_handlers add_training_samples）。[代码实证]

### 1.6 跨服务调用点与调用环核查

- 三服务对外同步调用**无环**：master-data→core(注册)；analytics→core(注册)；ai→core(注册+文件)、ai→Ollama、ai→Dify、ai→16 业务域(MCP)。反向（core→ai/bi）仅体现在 **unified-core 跨 schema 直读 ai.*/bi.***，不是 HTTP 同步环。[代码实证]
- ai→bi 经 MCP `register_bi_tools`（routes.rs:119），但 analytics 不反向调 ai，故无环。[代码实证]

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称(路径+章节) | 代码实际(路径+行号) | 结论 |
|------|--------------------|--------------------|------|
| ai bootstrap 模式 | overview.md:156 "ai(8013) … V2模式 **B**" | svc/ai/src/main.rs:341-345 直接 `Application{router,port,name}`，routes.rs 自装全部中间件 | **漂移**（实为 C） |
| analytics bootstrap / Prometheus | overview.md:174 "bi(analytics)(8060) … **C**（自定义 Prometheus）" | analytics 用 `build_application`+共享 `prometheus_metrics_handler`（main.rs:87,760；shared-bootstrap/lib.rs:756-772）；自建 Prometheus 的是 ai（ai/main.rs:46-66） | **漂移**（实为 build_application 系；自定义 Prometheus 归属错配到 ai） |
| master-data 模式 | overview.md:187 "master-data(8090) … **A**" | build_application + legacy AppState 垫片（main.rs:55-83,shared/mod.rs:9-14） | 基本一致（带 state 垫片，仍属 build_application 系） |
| 事件总线形态 | event-driven.md §1/§4 "Redis Pub/Sub + RabbitMQ(lapin)" | lib/shared-event/src/messaging.rs:3,69,92 "事件总线已迁移至 **Redis Stream**；RedisMessageBroker 已废弃" | **漂移**（文档停留在 2026-07-02 快照） |
| AI schema 命名 | database.md:96,425-486 "`plugin_ai` / `core`… 知识库表" | ai SEARCH_PATH="ai,public"（main.rs:32）；真实库 schema 为 `ai`（schema_defense.rs:19）+ `core.knowledge_*`（ai_knowledge/mod.rs:182） | **漂移**（无 plugin_ai schema，混用 ai 与 core） |
| BI 路由前缀 | overview.md:174 "/api/bi/, /api/report/" | 服务内仅 /api/bi（+legacy /api/v1/bi），report 挂在 /api/bi/report*（main.rs:46,737），无 /api/report/ | **漂移**（/api/report 前缀不在本服务） |
| DSH Agent/RAG 完整性 | ai-architecture.md §3.1/§3.4/§4 "AgentOrchestrator+RagEngine 完整数据流" | orchestrator 已接线（routes.rs:60-102 Some）；但 dsh/rag/mod.rs 1033 行 0 处 sqlx，不连 pgvector；真实 RAG 在 modules/ai_knowledge/rag.rs | **部分漂移**（RAG 引擎壳实分离） |
| 主数据=数据中台 | database.md §1 "public 共享实体 companies/departments/employees 统一"；modular-monolith §2 "advanced=master-data,analytics" | master-data 不写 companies/departments/employees，无事件/API/直读同步，10 模块内存存储（quality_v51.rs:647,266） | **漂移**（非数据中台，是 MDM 壳） |
| unified-core 瘦身 | overview.md:348 "unified-core 仅保留核心模块 iam/doc/flow/file/mail/im/notification/plugin/search/communication" | unified-core 仍残留 modules/ai、modules/analytics（ai_routes.rs:12-24、analytics/handlers.rs:34-268） | **漂移**（外迁不彻底） |
| 统一错误出口 | unified-error-handling-decision.md §4.4 "master-data/ai 各 1 处泄露" | 本组服务仍大量 `ApiResponse::error(500,&format!(...))`（如 master_plugin.rs:120、main.rs 多处）；AI/MDM 未迁移 TopemsError | 一致（属已知存量，非本 ADR 范围） |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据(路径:行号) | 影响 | 修复建议 |
|----|------|--------|------|----------------|------|----------|
| ADVAI-01 | master-data 10 个 MDM 模块为内存壳，不落库 | 高危 | 数据架构/设计缺陷 | svc/master-data/src/modules/quality_v51.rs:647(`State(_state)`)、:266-272(LazyLock STORE)；10 个 *_v*.rs 均 0 处 sqlx | ~200 条"数据质量/血缘/版本/计费/容灾/AI 治理"路由重启即失，客户误以为是真实 MDM 中台 | 明确标注为 demo/规划路由；或补 PostgreSQL 持久化；至少在 API 文档与健康检查中区分"已持久化"vs"内存演示" |
| ADVAI-02 | unified-core 残留 analytics 模块读不存在的 `analytics` schema | 高危 | 数据架构/漂移 | svc/unified-core/src/modules/analytics/handlers.rs:34,48,106,120,179,193,254,268；database/migrations 注释"analytics_*→bi" | :8000 的 BI 聚合接口运行期必然 relation 不存在报错，是死代码 | 改为读 `bi.analytics_*`，或删除该残留模块，统一由 svc/analytics(8060) 提供 |
| ADVAI-03 | AI 模型列表双服务重复暴露且跨库直读 | 中危 | 耦合/通信 | svc/unified-core/src/routes/ai_routes.rs:12-24；unified-core/src/modules/ai/handlers.rs:31-49 直查 `ai.ai_models`；svc/ai/src/routes.rs:196 | 同一资源两条 SQL、两个端口，unified-core 绕过 ai 服务边界直读 ai schema | 统一收口到 svc/ai；unified-core 改为 HTTP 调用或删除 |
| ADVAI-04 | analytics 直读 IAM/组织库做 BI 汇总 | 中危 | 数据架构/耦合 | svc/analytics/src/main.rs:860-874（iam_users/iam_roles/org_*/public.audit_logs） | BI 与 IAM/组织库 schema 强耦合，库拆分/改名即崩；无 ETL/事件解耦 | 走事件物化或只读副本视图；按 integration-cross-domain-api 模式改 API 编排 |
| ADVAI-05 | analytics 领域 KPI 与报表投递为假数据 | 中危 | 可靠性/性能 | svc/analytics/src/modules/bi/analytics.rs(get_lims_summary 字面量 856)；main.rs:883-884 rand::random；report/scheduler.rs:363-375 仅 log 不发信 | 仪表盘/订阅报表展示编造数字、定时报表"投递"从不发出 | 接真实数据源或显式标注 mock；实现真实邮件/webhook 投递 |
| ADVAI-06 | datasource 可外联任意 Postgres（SSRF 面） | 中危 | 安全 | svc/analytics/src/modules/bi/datasource.rs:165-196（用户凭据直连 `postgres://host:port`） | 具备 analytics 权限者可让 BI 服务探测/连内网任意 DB，凭据落库 | 限制 host 白名单/内网段；凭据加密存储；连接源审计 |
| ADVAI-07 | MCP 工具存在手写阻塞式裸 TCP HTTP 客户端 | 中危 | 可靠性/性能 | svc/ai/src/dsh/mcp/tools/mod.rs:317-364（`std::net::TcpStream` 同步阻塞在 async runtime） | 阻塞 tokio worker，高并发下拖垮 ai 进程；无 TLS/无连接池 | 统一改用 TypedServiceClient（tools/erp.rs:24 已用）；下线 http_call |
| ADVAI-08 | DSH RagEngine 1033 行不连库 | 低危 | 设计缺陷/漂移 | svc/ai/src/dsh/rag/mod.rs(0 处 sqlx)；routes.rs:80,99 以 Some 注入 | ai-architecture.md §4 描述的 RAG 数据流实为空壳，真实 RAG 在 modules/ai_knowledge/rag.rs:55-75 | 让 dsh/rag 复用 ai_knowledge 的 pgvector 检索，或删除冗余引擎 |
| ADVAI-09 | 事件总线文档停留在 Pub/Sub+RabbitMQ | 低危 | 文档漂移 | event-driven.md §1/§4 vs lib/shared-event/src/messaging.rs:3,69,92(Redis Stream) | 新人按文档选型会用错废弃 API | 刷新 event-driven.md 为 Redis Stream 口径 |
| ADVAI-10 | ai/analytics bootstrap 模式与 overview V71 标注不符 | 低危 | 文档漂移 | overview.md:156,174 vs ai/main.rs:341(C)、analytics/main.rs:87,760(build_application) | 模式治理统计失真 | 校准 overview 服务表 V2 模式列 |
| ADVAI-11 | master-data schema_defense 目标 schema 与 SEARCH_PATH 不一致 | 低危 | 数据架构 | svc/master-data/src/schema_defense.rs:3(注释"Schema: public") vs :13(SERVICE_SCHEMA="master_data") vs main.rs:22(SEARCH_PATH=public) | 防御建表指向 master_data schema，实际读写走 public.core_dict_*，自检可能与真实表错位 | 统一 SERVICE_SCHEMA 为 public 或修正 SEARCH_PATH |

---

## 4. 优点与亮点（客观，带证据）

1. **Shared Bootstrap 统一启动基座被复用**：三服务均走 `bootstrap_service`（master-data/main.rs:37、analytics/main.rs:51、ai/main.rs:73），telemetry/auth_state/事件发布统一初始化，符合 V66.2 目标。[代码实证]
2. **AI Provider 抽象到位**：`LlmProvider` trait + Factory + Router(简单→Ollama/复杂→DeepSeek) + Failover 降级 + RecordingProvider 成本计量闭环（provider/{trait_,factory,router,failover,recorded}.rs；ai-architecture.md §3.3/§7.1）。[代码实证]
3. **MCP 服务间认证规范**：业务工具以 `ai-service` 身份签发 service token、按 scope（erp:read/write）调用下游，且 API 不可达时降级 mock（tools/erp.rs:24-27,43）——比手写 HTTP 更安全。[代码实证]
4. **真实 pgvector RAG**：`embedding vector(1536)`+ivfflat+`<=>` 余弦检索闭环可用（ai_knowledge/mod.rs:182,219；rag.rs:55-75）。[代码实证]
5. **analytics BI 平台核心是真持久化**：dashboard/widget/dataset/datasource 全套 CRUD 落 bi schema（bi/mod.rs 58 处 sqlx），并有行级权限模型（row_level_permission.rs）。[代码实证]
6. **Schema 防御机制**：三服务均接入 shared-db 的 `run_schema_defense` 做列级一致性自检（master-data/schema_defense.rs:80、ai/schema_defense.rs:139、analytics/schema_defense.rs:125）。[代码实证]

---

## 5. 可视化数据

### 5.1 依赖边（本组服务对外全部依赖边）

```json
[
  {"from":"master-data","to":"unified-core(8000)","kind":"http","note":"POST /api/core/plugin/dev/plugins/master-data/register 插件注册 (master_plugin.rs:151-155)"},
  {"from":"master-data","to":"PostgreSQL(public)","kind":"db","note":"core_dict_types/items、schema_registry、dynamic_data；SEARCH_PATH=public (main.rs:22; schema_defense.rs:17-69)"},
  {"from":"analytics","to":"unified-core(8000)","kind":"http","note":"bi+report 插件注册 (bi/plugin.rs:172; report/report_plugin.rs:130)"},
  {"from":"analytics","to":"PostgreSQL(bi)","kind":"db","note":"analytics_dashboards/widgets/datasources/datasets 等自有表 (bi/mod.rs:31-469; schema_defense.rs:17)"},
  {"from":"analytics","to":"PostgreSQL(iam/org/public)","kind":"db","note":"跨 schema 直读 iam_users/iam_roles/org_*/public.audit_logs (main.rs:860-874)"},
  {"from":"analytics","to":"外部任意 Postgres","kind":"db","note":"datasource 用户配置凭据外联 SELECT 1 (datasource.rs:165-196)"},
  {"from":"ai","to":"unified-core(8000)","kind":"http","note":"插件注册(main.rs:318-321) + FILE_SERVICE_URL 文件服务(main.rs:182-191)"},
  {"from":"ai","to":"Ollama(11434)","kind":"http","note":"LLM 对话 + embeddings (main.rs:118-126)"},
  {"from":"ai","to":"Dify(8180)","kind":"http","note":"可选 workflow 编排 (main.rs:147)"},
  {"from":"ai","to":"erp/crm/finance/hr/mes/ehs/wms/qms/pm/lims/bi/aps/cs/scm/iot/oa","kind":"http","note":"MCP TypedServiceClient 16 域工具调用 (routes.rs:109-124; tools/erp.rs:24)"},
  {"from":"qms/lims/ehs","to":"ai","kind":"event","note":"Redis Stream: QmsQualityIssueCreated/LimsInspectionAbnormalDetected/EhsHazardReported → 写 ai.ai_training_samples (event_handlers/mod.rs:35-46)"},
  {"from":"unified-core","to":"ai(ai schema)","kind":"db","note":"跨 schema 直读 ai.ai_models/prompt_templates/documents/qa_history (unified-core modules/ai/handlers.rs:31-49)"},
  {"from":"unified-core","to":"bi(analytics_* 目标 schema 不存在)","kind":"db","note":"跨 schema 直读 analytics.analytics_* —— 失效死代码 (unified-core modules/analytics/handlers.rs:34-268)"}
]
```

### 5.2 统计数字（实测）

- 服务数：**3**（master-data / analytics / ai）。
- src 文件：master-data 24 + analytics 46 + ai 139 = **209**；src 行数 25,686 + 20,313 + 81,409 = **127,408**。
- 测试文件/行数：15+3+7=**25** 文件；3,769+490+2,491=**6,750** 行。
- master-data v5x 内存壳模块：**10/10**（sqlx=0）；真实落库表 **4 张**。
- analytics 跨 schema 直读他域表：**7 处 SQL 列引用**（iam_users/roles/permissions/org_companies/departments/employees/public.audit_logs）。
- ai MCP 业务工具域：**16**；event 订阅：**3**；LLM Provider 实现：**5**（ollama/deepseek/dify/mock/+router/failover 组合）。
- 本组对外 HTTP 出站点：master-data 1 处、analytics 2 处（均插件注册）、ai 插件注册+文件服务+Ollama+Dify+16 域工具。
- 同步调用环：**无**。
