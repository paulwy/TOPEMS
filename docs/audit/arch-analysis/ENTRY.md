# 统一入口与通信架构分析

> 分片范围：`svc/server`（模块化单体统一入口）、`svc/portal`（GraphQL BFF）、`lib/shared-bootstrap`、全局跨服务调用链与环检测、事件总线机制层（`lib/shared-event`）、网关/BFF/统一错误处理现状。
> 分析基准：28 个业务服务 + `svc/server` 统一入口。证据一律标注 `路径:行号`，以代码实测为准。
> 证据图例：[代码实证]=直接来自代码；[文档声称]=来自 docs；[漂移]=文档与代码不符。

---

## 1. 分片架构现状（代码实证）

### 1.1 svc/server 聚合机制：编译期 feature 门控 + main.rs 静态注册

- **不是运行期动态插件加载，而是「编译期 Cargo feature 门控 + main.rs 中静态逐一 `register_boxed`」**。每个业务服务在 `main.rs` 中以 `#[cfg(feature = "module-xxx")]` 块显式构建并注册，例如 erp：`svc/server/src/main.rs:74-86`（`ErpRealModule::build()` → `register_boxed`）。全部 28 个业务服务各有一个 `*_real_module.rs`（`svc/server/src/modules/` 目录实测 33 个 `.rs`，含 platform/dashboard/subscription 等非业务模块）。[代码实证]
- **路由聚合方式**：`ModuleRegistry::merge_routes()` 遍历 `HashMap<&str, Box<dyn Module>>` 逐个 `Router::merge`（`svc/server/src/registry.rs:115-129`），叠加全局 404/500 JSON 兜底（`registry.rs:175-189`）与 OpenAPI 内嵌（`registry.rs:192-210`）。[代码实证]
- **监听端口**：默认 `8099`（`svc/server/src/main.rs:536-539` `unwrap_or(8099)`），本地开发即此入口。[代码实证]
- **聚合完整性**：28 个业务服务的 `*_real_module.rs` 全部存在于 `svc/server/src/modules/`；且 **default features 已启用几乎全部**（`svc/server/Cargo.toml:67-104`），含 gis（:102）、tms（:103）、ai、analytics、mobile、integration。即 default 编译下 28 业务服务几乎全部嵌入单进程。[代码实证]
- **降级容错**：每个 real_module 构建失败仅 `tracing::error!` 后跳过（如 `main.rs:66-70`），不阻塞统一入口启动——单服务缺库时其它模块仍可用。[代码实证]

### 1.2 private / saas 双部署模式：仅有 feature 空壳，代码未实现切换（漂移）

- `svc/server/Cargo.toml:162-164` 定义了 `private-deployment = []` 与 `saas-deployment = []`，但二者**均为空 feature（无依赖、无代码门控）**。[代码实证]
- 全仓 grep `cfg(feature = "private-deployment"|"saas-deployment")` **零命中**；`main.rs:28` 硬编码打印 `部署模式: private-deployment（进程内 trait 调用）`，从不根据 feature 分支。[代码实证]
- `svc/server/src/providers.rs:39-42` 的 `InProcProvider` 枚举**只有一个变体 `AccountBalance`**——进程内 trait 调用契约机制已搭好，但实际只被 `dashboard → finance` 一处使用（`main.rs:44` `register_account_balance_provider`）。所谓「模块组间进程内 trait 调用」在 28 服务范围内仅 1 条真实边。[代码实证]
- 即：文档声称「SaaS 模式可通过 feature flag 切换为 HTTP 调用」（`modular-monolith-design.md:84`、根 `Cargo.toml:86`），**代码里该切换路径不存在**。[漂移]

### 1.3 bootstrap 三模式（A/B/C）实测

机制定义见 `lib/shared-bootstrap/src/lib.rs`：`ServiceConfig`(:552) → `bootstrap_service()`(:623) → `build_application()`(:760) 自动装配 auth/rls/rate-limit/CORS/Prometheus → `run()`(:830)；`Application{router,port,name}`(:613) 为最终产物。[代码实证]

- **纯 C（自建 Application，不用 build_application）**：ai、gis、integration、mobile、portal、unified-core（`main.rs` 中 `build_application` 调用数=0，自行构造 `Application{}`）。[代码实证]
- **analytics 实为「build_application + 外层路由补丁」**：`svc/analytics/src/main.rs:760` 调 `build_application`，:781 再 `app.router.merge(stateful_public)` 挂 WebSocket，:789 `run(app)`——**它并未跳过 build_application**，与各处「C=Application 重建」的标签不符。[代码实证/漂移]
- **rd / scm 为 B 的变体**：先 `build_application`（`rd/main.rs:127`、`scm/main.rs:269`），再手工构造最终 `Application{}`（`rd/main.rs:139`、`scm/main.rs:286` `run(Application{...})`）。[代码实证]
- **finance/hrm/wms 项目标为 A，但结构上带自定义 state**：finance 持 `workflow_client`（`svc/finance/src/main.rs:290-295`）、hrm 持 cache+encryption（`svc/hrm/src/main.rs:90` 附近）、wms 持 3 个 cache（`svc/wms/src/main.rs:230-237`）——并非 bootstrap 头注释所称「纯 PgPool+AuthState」。[代码实证/漂移]

### 1.4 portal GraphQL BFF

- **Schema 聚合**：`Schema::build(QueryRoot, MutationRoot, SubscriptionRoot)`（`svc/portal/src/modules/graphql_schema.rs:5490`），`QueryRoot`(:882) / `MutationRoot`(:2601)。[代码实证]
- **扇出方式**：`business_stats` resolver 用 `tokio::join!` 并行请求 erp/crm/hrm/finance/mes/workflow 六个下游，且每个 `.unwrap_or(默认)` 优雅降级（`graphql_schema.rs:891-907`）。[代码实证]
- **数据获取**：经 9 个强类型 `TypedServiceClient<XxxApi>`（`svc/portal/src/shared/mod.rs:26-34`：notification/workflow/mes/monitor/iam/hrm/erp/crm/finance），如 `fetch_erp_stats` 调 `erp_client.count_purchase_orders()`（`graphql_helpers.rs:17-35`）。[代码实证]
- **调用目标解析**：`MONOLITH_SERVICE_URL` 已设则所有 client 指向统一入口 topems-server，否则 `from_env_default()` 按服务 env/端口（`shared/mod.rs:53-63`）；构建失败回退硬编码 `http://localhost:8000`（`shared/mod.rs:92`）。client 携带 service token + scope（`shared/mod.rs:89`）。[代码实证]
- **DataLoader 仅局部使用**：`ServiceHealthLoader`/`TodoLoader`（`graphql_dataloader.rs:18,46`），未成为全局 N+1 治理手段；大量 resolver 仍是逐服务 HTTP 扇出。[代码实证]
- **与 REST 关系**：portal 同时保留 430+ REST 业务路由（`embedded.rs` 统一组装），GraphQL 为前端聚合层，二者并存；在模块化单体内 portal 对 erp/crm 的「HTTP」实为指向 :8099 的环回 HTTP，**非进程内 trait**。[代码实证]

### 1.5 通信全景

- **同步通信 = HTTP REST**（reqwest + `TypedServiceClient`）；**gRPC 未实际用于服务间调用**——`tonic` 仅出现在 `lib/shared-core/src/grpc/connection_pool.rs` 一个连接池工具，无任何 `svc/*` 发起 gRPC client。[代码实证]
- **异步通信 = Redis Stream 事件总线**（见 §1.6）。[代码实证]
- **调用目标解析**：`MONOLITH_SERVICE_URL`（单体内）或 per-service `XXX_SERVICE_URL` env / 默认端口；`CONSUL_ENABLED=true` 时经 `lib/shared-event/src/consul/` 注册（`shared-bootstrap/src/lib.rs:673,693-698`），未启用则 env/端口回退。[代码实证]
- **跨库直读**：`docs/architecture/service-topology/cross-db-calls.md` 列 35 条跨物理库边（workflow-service 被 14 个调用方跨库依赖，:50），但这些是「拆分预案」视角，当前仍为单 PostgreSQL 实例 + schema 隔离。[文档声称]

### 1.6 事件总线机制（lib/shared-event）

- **Redis Stream 已落地且为默认**：`EventPublisher::new` 读 `EVENT_BUS_MODE`，默认 `stream`，仅显式 `pubsub` 才回退（`lib/shared-event/src/event/publisher.rs:47-50`）；Stream 初始化失败自动降级 Pub/Sub（`publisher.rs:64-74`）。[代码实证]
- **消费组 + ACK**：`XREADGROUP`/`XACK`/`XGROUP CREATE`（`stream_subscriber.rs:188,237,443`），至少一次语义。[代码实证]
- **事件带版本**：`EventVersion{major,minor}` + `is_compatible_with`（`event/versioning.rs:24-43`），Event 含 `version` 字段（:58）。[代码实证]
- **死信/重试存在**：`DLQ_KEY_PREFIX=topems:dlq`、`retry_count`、stats（`event/dead_letter_queue.rs:11-17,61-89`）。[代码实证]
- **Schema Registry 已实现**（与 event-driven.md §9 「待办」不符）：`SchemaRegistry`/`EventSchema`/`ValidationResult`（`event/schema_registry.rs:26-129`），并可经 `with_schema_registry` 发布前校验（`publisher.rs:91`）。[漂移：文档称未实现，代码已存在]

### 1.7 网关与统一错误处理现状

- **nginx 是 Web 网关**：`deploy/nginx/topems.conf` 定义 23 个 upstream（:79-110，各指向 `localhost:80xx` 独立服务端口），`map $request_uri $api_upstream` 统一 `/api/` 路由（:115,200-204）。**注意：nginx 指向各独立服务端口，不指向模块化单体 :8099**——生产/开发双轨。[代码实证]
- **Traefik 是 docker/saas 的 8080 API 网关**：`deploy/docker/traefik/dynamic.yml` 实测 32 个 router。[代码实证]
- **统一错误体已定义但采纳率仍低**：`ErrorPayload{error_code: Option<String>}`（`lib/shared-core/src/response.rs:133,143`），`TopemsError` 类型化错误存在。但实测 `ApiResponse::error(` 手写仍 **3412** 处，`TopemsError` 仅分布在 **51** 个文件——ADR（unified-error-handling-decision.md）所述「3558:252」的失衡格局基本未变。[代码实证]

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称(路径+章节) | 代码实际(路径+行号) | 结论 |
|---|---|---|---|
| bootstrap 计数 | 根 Cargo.toml:95-100 称 A=8/B=11/C=7(含已归档 billing) | 实测纯C=6、标准A=4、B系=17、analytics混合=1（见 §5a） | 漂移 |
| bootstrap 计数 | overview.md:27,190 称 A=10/B=13/C=5；表中 mobile=B | mobile `main.rs` build_application=0、自建 Application → 实为 C | 漂移 |
| bootstrap 计数 | services.yaml:4-6 头注释 A=10/B=11/C=7 | 同文件逐行标注合计 A=7/B=14/C=7（业务） | 漂移（文件内自相矛盾） |
| A 模式定义 | shared-bootstrap/lib.rs:34-35 称 A=「纯 PgPool+AuthState」含 hrm/finance/wms | finance 持 workflow_client、hrm 持 cache+encryption、wms 持 3 cache（各 main.rs） | 漂移 |
| private/saas 模式 | modular-monolith-design.md:84 + Cargo.toml:86 称可 feature 切换 HTTP | `private-deployment`/`saas-deployment` 为空 feature（Cargo.toml:162-164），零 cfg 门控，main.rs:28 硬编码 private | 漂移 |
| 模块组间进程内 trait | modular-monolith-design.md:81-84 称模块组间走 trait | `InProcProvider` 仅 1 变体（providers.rs:39-42），仅 dashboard→finance 一条边 | 漂移（机制就绪、落地极少） |
| gis/analytics/ai 不嵌入 | modular-monolith-design.md:166-169 称「🚫明确不嵌入」 | 三者均在 default features（Cargo.toml:97,102,90）并有 *_real_module 注册（main.rs:256,336,455） | 漂移 |
| C 模式含 analytics | services.yaml:185 / Cargo.toml:100 标 analytics=C | analytics `main.rs:760` 调 build_application，仅外层补丁 WS | 漂移 |
| 事件总线升级 Redis Stream | overview.md:7 称 2026-08-29 升级 | publisher.rs:47-50 默认 stream，XREADGROUP/XACK 落地 | 一致 |
| Schema Registry 待办 | event-driven.md:439 「添加事件 Schema Registry」未勾选 | schema_registry.rs:26-129 已实现并可挂载 | 漂移（超前于文档） |
| API 网关落地 | api-gateway-plan.md:121 称 Traefik 33 router 已验证 | dynamic.yml 实测 32 个 router（rule: 计数） | 基本一致（计数差 1） |
| 统一错误采纳 | ADR 称 3558 手写/252 TopemsError，阶段一清血 | 现 3412 手写 / 51 文件用 TopemsError | 一致（问题依旧，未根本改观） |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据(路径:行号) | 影响 | 修复建议 |
|---|---|---|---|---|---|---|
| ENTRY-01 | erp ↔ hrm 同步 HTTP 双向环 | 高危 | 耦合/通信 | erp/src/modules/addressbook.rs:200（→hrm）；hrm/src/modules/payroll.rs:990（→erp POST /api/erp/vouchers） | 双向同步调用，任一服务超时/重启即放大故障，易形成级联与数据不一致 | 改为事件驱动（erp 发布凭证事件，hrm 订阅）或引入反向依赖倒置 + 熔断 |
| ENTRY-02 | erp ↔ mes 同步 HTTP 双向环 | 高危 | 耦合/通信 | erp/src/modules/production_order.rs:536（→mes create_from_erp）；mes/src/modules/work_report.rs:644（→erp sync_mes_progress） | 生产订单双向同步形成闭环，重试叠加易死循环/重复同步 | 拆为单向主数据同步 + 事件回传，去环 |
| ENTRY-03 | private/saas 双模式为空 feature，无切换实现 | 高危 | 部署/文档漂移 | svc/server/Cargo.toml:162-164；main.rs:28 | 文档承诺的 SaaS/私有化双形态不可用，实际只有 private 一种；运维误以为可切 HTTP | 要么实现 cfg 分支，要么删除空 feature 与文档表述，消除假能力 |
| ENTRY-04 | 模块组间进程内 trait 仅 1 条真实边 | 中危 | 设计缺陷/可扩展性 | svc/server/src/providers.rs:39-42（仅 AccountBalance 变体）；main.rs:44 | 「模块化单体内消除网络开销」目标基本未达成；portal→erp 等仍是环回 HTTP，单体红利打折 | 逐步把高频跨模块调用迁移为 InProcProvider 扩展变体 |
| ENTRY-05 | bootstrap A/B/C 计数三处文档互相矛盾且均与代码不符 | 中危 | 文档漂移 | Cargo.toml:95-100；overview.md:27,190；services.yaml:4-6 vs 逐行 | 启动模式口径混乱，新人无法据文档判断某服务为何种复杂度 | 以实测为准更新三处；明确 A/B 判定准则（是否带业务 state/client） |
| ENTRY-06 | 统一错误处理采纳率极低（3412 手写 vs 51 文件） | 中危 | 安全/可靠性 | svc/ 实测 `ApiResponse::error(`=3412；TopemsError=51 文件；response.rs:133 | 内部错误细节泄露面与错误码不可控依旧，ADR 阶段二/三未推进 | 按 ADR §4.4 排期继续 codemod，扩 Gate T 到存量 |
| ENTRY-07 | nginx 网关指向独立服务端口，与模块化单体 :8099 双轨 | 中危 | 部署 | deploy/nginx/topems.conf:79-110（upstream→80xx）；main.rs:539（server 8099） | 本地(单体:8099)与生产(nginx→各进程)流量路径不同，易出现「本地好、线上挂」 | 明确两套形态的路由一致性测试；逐步把 nginx upstream 切到 server:8099 |
| ENTRY-08 | portal BFF 扇出无全局 N+1 治理，DataLoader 仅局部 | 低危 | 性能 | graphql_schema.rs:891 tokio::join 六路扇出；graphql_dataloader.rs:18,46 仅 health/todo | dashboard 类聚合 query 对下游形成 6×N 次 HTTP，下游抖动直接拉低 BFF 延迟 | 把高频 resolver 改为 DataLoader 批量 + 加缓存（graphql_cache.rs 已存在需推广） |
| ENTRY-09 | gRPC 依赖存在但无实际服务间 gRPC 调用 | 低危 | 文档漂移 | lib/shared-core/src/grpc/connection_pool.rs（唯一 tonic 引用） | overview/技术栈列 tonic 0.14 易误导；实际同步全走 HTTP REST | 文档注明 gRPC 仅预留/未启用，或移除未用依赖 |
| ENTRY-10 | qms/lims/ehs 互读对方 SERVICE_URL 仅为前端配置暴露 | 低危 | 通信/文档漂移 | ehs/src/modules/data_sync.rs:523-526（仅返回 config，非后端调用） | 拓扑 csv/文档易把它误判为后端 HTTP 环；实际跨域同步走事件 | 在拓扑文档区分「后端 HTTP 边」与「前端配置 URL」 |

---

## 4. 优点与亮点（客观，带证据）

1. **Shared Bootstrap 真正做到了启动模板收敛**：28 服务全部走 `ServiceConfig→bootstrap_service→build_application→run` 三段式（`lib/shared-bootstrap/src/lib.rs:623,760,830`），新增服务脚手架成本低；`init_telemetry=false` 开关专门解决了多模块合并进程时的全局 subscriber 冲突（`lib.rs:567-570`）。
2. **事件总线完成了从 Pub/Sub 到 Redis Stream 的可靠升级**：默认持久化 + 消费组 + XACK + DLQ + 版本号 + Schema Registry 一应俱全（`publisher.rs:47-50`、`stream_subscriber.rs:188`、`dead_letter_queue.rs:11-17`、`versioning.rs:24-43`、`schema_registry.rs:65`），至少一次语义落地。
3. **模块化单体具备降级容错**：任一 real_module 构建失败不阻塞整个入口（`main.rs:66-70` 等），feature flag 支持按客户裁剪（`svc/server/Cargo.toml:67-104`）。
4. **portal BFF 的优雅降级设计**：跨服务统计每路 `.unwrap_or(默认)`（`graphql_schema.rs:891-907`），单下游不可用不拖垮整个聚合页。
5. **进程内调用机制设计严谨**：针对 Rust `Arc::downcast` 无法 downcast 到 `dyn Trait` 的限制，采用 `TypeId` 索引 + `InProcProvider` 枚举（`providers.rs:6-17`），类型安全且可扩展。
6. **统一 404/500 JSON 兜底**：未匹配路由与 panic 均返回 `ApiResponse` JSON 而非裸文本（`registry.rs:175-189`），入口层错误形态统一。

---

## 5. 可视化数据

### 5a. 全部 28 业务服务 bootstrap 模式统计表（代码实测）

判定准则：**C** = `main.rs` 不调 `build_application`（自建 `Application{}`）；**A** = 调 build_application 且 state 仅 db/ctx 衍生；**B** = 调 build_application 但注入业务自定义 state（cache/client/tenant）；**混合** = 调 build_application 后外层再补丁。

| 服务 | 实测模式 | 项目标注(services.yaml) | 证据行号 |
|---|---|---|---|
| ai | C | C | svc/ai/src/main.rs（build_application=0，自建 Application） |
| analytics | 混合(B变体) | C | svc/analytics/src/main.rs:760,781,789 |
| communication | A | A | svc/communication/src/main.rs:279,283 |
| crm | B | B | svc/crm/src/main.rs（build_application+自定义state） |
| ehs | B | B | svc/ehs/src/main.rs（tenant_mw+client） |
| erp | B | B | svc/erp/src/main.rs:170,200,283 |
| finance | B | A | svc/finance/src/main.rs:290-295,318（持 workflow_client） |
| gis | C | C | svc/gis/src/main.rs（build_application=0） |
| hrm | B | A | svc/hrm/src/main.rs:90,112,122（持 cache/encryption） |
| integration | C | C | svc/integration/src/main.rs（build_application=0） |
| lims | B | B | svc/lims/src/main.rs（tenant_mw×2） |
| master-data | A | A | svc/master-data/src/main.rs:55,83（state=db/auth/metrics） |
| mes | B | B | svc/mes/src/main.rs:67,234 |
| mobile | C | C | svc/mobile/src/main.rs（build_application=0，8字段state） |
| monitor | B | B | svc/monitor/src/main.rs |
| pdm | B | B | svc/pdm/src/main.rs（tenant_mw×2） |
| plugin-registry | B | B | svc/plugin-registry/src/main.rs |
| pm | B | B | svc/pm/src/main.rs:119,127 |
| portal | C | C | svc/portal/src/main.rs（build_application=0，GraphQL+WS） |
| qms | B | B | svc/qms/src/main.rs |
| rd | B(+Application覆盖) | B | svc/rd/src/main.rs:127,139 |
| scm | B(+Application覆盖) | B | svc/scm/src/main.rs:269,286 |
| search | A | A | svc/search/src/main.rs:49,56 |
| srm | B | B | svc/srm/src/main.rs:195,222 |
| ticket | A | A | svc/ticket/src/main.rs:72,75 |
| tms | B | B | svc/tms/src/main.rs |
| unified-core | C | C | svc/unified-core/src/main.rs（build_application=0） |
| wms | B | A | svc/wms/src/main.rs:230-237,262（持3 cache） |

**实测计数：纯 C = 6（ai/gis/integration/mobile/portal/unified-core）；标准 A = 4（communication/search/ticket/master-data）；B 系 = 17；analytics 混合 = 1。合计 28。**
（注：server 自身不使用 shared-bootstrap，属特殊自建，不计入 28。）

### 5b. 全量服务依赖边 JSON

```json
[
  {"from":"erp","to":"finance","kind":"http","note":"FinanceApi 强类型客户端"},
  {"from":"erp","to":"hrm","kind":"http","note":"addressbook.rs:200 list_employees"},
  {"from":"erp","to":"mes","kind":"http","note":"production_order.rs:536 create_from_erp"},
  {"from":"hrm","to":"erp","kind":"http","note":"payroll.rs:990 POST /api/erp/vouchers ★环"},
  {"from":"mes","to":"erp","kind":"http","note":"work_report.rs:644 sync_mes_progress ★环"},
  {"from":"crm","to":"erp","kind":"http","note":"ErpApi"},
  {"from":"crm","to":"wms","kind":"http","note":"WmsApi"},
  {"from":"crm","to":"unified-core","kind":"http","note":"WORKFLOW_SERVICE_URL"},
  {"from":"ehs","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"finance","to":"unified-core","kind":"http","note":"WorkflowApi + UNIFIED_CORE_URL"},
  {"from":"pm","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"srm","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"qms","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"mobile","to":"hrm","kind":"http","note":"HrmApi"},
  {"from":"mobile","to":"mes","kind":"http","note":"MesApi"},
  {"from":"mobile","to":"communication","kind":"http","note":"NotificationApi"},
  {"from":"mobile","to":"qms","kind":"http","note":"QmsApi"},
  {"from":"mobile","to":"wms","kind":"http","note":"WmsApi"},
  {"from":"mobile","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"portal","to":"crm","kind":"http","note":"CrmApi"},
  {"from":"portal","to":"erp","kind":"http","note":"ErpApi"},
  {"from":"portal","to":"finance","kind":"http","note":"FinanceApi"},
  {"from":"portal","to":"hrm","kind":"http","note":"HrmApi"},
  {"from":"portal","to":"unified-core","kind":"http","note":"IamApi"},
  {"from":"portal","to":"mes","kind":"http","note":"MesApi"},
  {"from":"portal","to":"monitor","kind":"http","note":"MonitorApi"},
  {"from":"portal","to":"communication","kind":"http","note":"NotificationApi"},
  {"from":"portal","to":"unified-core","kind":"http","note":"WorkflowApi"},
  {"from":"ai","to":"crm","kind":"http","note":"MCP tool crm.rs"},
  {"from":"ai","to":"erp","kind":"http","note":"MCP tool erp.rs"},
  {"from":"ai","to":"finance","kind":"http","note":"MCP tool finance.rs"},
  {"from":"unified-core","to":"portal","kind":"http","note":"iam/user/profile.rs:210 portal_url"},
  {"from":"unified-core","to":"communication","kind":"http","note":"iam/auth.rs:26 COMMUNICATION_SERVICE_URL"},
  {"from":"communication","to":"gis","kind":"http","note":"GIS_SERVICE_URL"},
  {"from":"rd","to":"ai","kind":"http","note":"AI_SERVICE_URL"},
  {"from":"integration","to":"erp","kind":"http","note":"跨域同步中枢"},
  {"from":"integration","to":"lims","kind":"http","note":"lims_qms handler"},
  {"from":"integration","to":"mes","kind":"http","note":"mes_erp handler"},
  {"from":"integration","to":"qms","kind":"http","note":"跨域同步"},
  {"from":"integration","to":"scm","kind":"http","note":"跨域同步"},
  {"from":"integration","to":"wms","kind":"http","note":"wms_scm handler"},
  {"from":"lims","to":"qms","kind":"event","note":"LimsSampleRegistered/ResultSubmitted"},
  {"from":"lims","to":"ehs","kind":"event","note":"LimsInspectionAbnormalDetected"},
  {"from":"lims","to":"communication","kind":"event","note":"异常/试剂告警通知"},
  {"from":"qms","to":"ehs","kind":"event","note":"QmsQualityIssueCreated"},
  {"from":"qms","to":"communication","kind":"event","note":"QmsInspectionCompleted"},
  {"from":"ehs","to":"qms","kind":"event","note":"EhsHazardReported/AccidentReported"},
  {"from":"ehs","to":"communication","kind":"event","note":"隐患/事故通知"},
  {"from":"erp","to":"finance","kind":"event","note":"订单/发票/付款"},
  {"from":"erp","to":"wms","kind":"event","note":"库存调整"},
  {"from":"erp","to":"scm","kind":"event","note":"采购订单"},
  {"from":"crm","to":"erp","kind":"event","note":"客户创建/更新"},
  {"from":"finance","to":"erp","kind":"event","note":"付款完成"},
  {"from":"hrm","to":"integration","kind":"event","note":"员工/部门变更同步"},
  {"from":"crm","to":"unified-core","kind":"db","note":"cross-db-calls.md:13 workflow"}
]
```

### 5c. 环检测结果

**实测同步 HTTP 2-环（真实双向调用）：**

1. **erp ↔ hrm**：erp→hrm（`erp/src/modules/addressbook.rs:200` 查员工）+ hrm→erp（`hrm/src/modules/payroll.rs:990` 写凭证）。
2. **erp ↔ mes**：erp→mes（`erp/src/modules/production_order.rs:536` 下推生产订单）+ mes→erp（`mes/src/modules/work_report.rs:644` 回传进度）。

**判定为「非环」的近似项（已排除）：**
- qms ↔ lims ↔ ehs：互读对方 `XXX_SERVICE_URL` 仅在 `ehs/src/modules/data_sync.rs:523-526` 等「向前端返回配置」的 handler 中，**非后端发起的 HTTP**；三者间同步实际走 Redis Stream 事件（见 5b event 边），不构成同步调用环。
- 未发现 3 环及以上的同步 HTTP 环。

**与拓扑文档差异**：`service-topology.runtime.csv` 未收录 ai（调用几乎所有服务的 MCP 边）、integration（同步中枢边）、unified-core→portal；文档矩阵为子集，非全量。
