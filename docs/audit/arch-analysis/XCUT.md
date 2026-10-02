# 跨切面架构分析

> 分片：XCUT（Cross-Cutting / 横切能力）
> 范围：`lib/`（主 crate + 11 子 crate）、`database/`、`.sqlx/`、`config/`、`deploy/`、`.github` 后端构建、可观测性与安全横切机制。
> 方法：文档对照 + `grep -n` / `wc -l` / `python` 实测；所有数量均为实测，非估算。
> 证据类型：[代码实证] / [文档声称] / [漂移]。
> 既有的「依赖漏洞 / 敏感信息泄露 / 仓库卫生」清单以 `docs/audit/TOPEMS项目全面审计报告_2026-09-30.md` 为准，本文件不重复。

---

## 1. 分片架构现状（代码实证）

### 1.1 共享库拆分（lib/）

**主 crate 与子 crate 清单** [代码实证]
- 根 `Cargo.toml:2-16` 声明 workspace 成员：主 crate `lib` + **11 个子 crate**：
  `shared-core / shared-db / shared-auth / shared-service-client / shared-event / shared-observability / shared-ai / shared-bootstrap / shared-mcp / shared-dsh / shared-boundary`。
- 源文件规模（`find lib/shared-*/src -name '*.rs' | wc -l`）：
  shared-core=41、shared-event=31、shared-service-client=27、shared-auth=23、shared-db=17、shared-observability=16、shared-ai=10、shared-dsh=6、shared-mcp=5、shared-bootstrap=2、shared-boundary=1。

**(a) shared-core 是否大杂烩** [代码实证]
- `lib/shared-core/src/` 含：`api/ api_security.rs api_version.rs cache.rs common_types.rs compression/ config/ cors.rs crud.rs error/ feature_flag.rs fsm.rs grpc/ health.rs hrm.rs id/ l2_cache.rs layers.rs locale/ logging/ metrics.rs n_plus_one_detector.rs plugin/ response.rs service_config.rs service_port.rs supplier.rs testing.rs validation.rs`（共 41 文件）。
- 其中 `hrm.rs`（118 行）只是一个含 `db: PgPool` 的瘦 `AppState` + `PaginationQuery`；`supplier.rs`（533 行）是**跨服务供应商主数据的"标准视图模型"**（注释明确：消除 SRM/SCM/ERP/unified-core 四套模型的字段分歧，"不碰 schema"）。二者属于有意的跨服务类型归一，**非业务逻辑泄漏**。真正的"聚合度"体现在一个 crate 同时承载 error/response/config/logging/cors/cache/metrics/health/api_version/crud/fsm/testing 等约 20 类横切关注点——职责偏宽但边界尚清晰。

**(b) 去门面化 A4.2 是否彻底** [代码实证] —— **未彻底，且为有意保留**
- `lib/src/lib.rs:2` 自陈"topems_shared 门面 Crate"；`lib/src/lib.rs:5-8` 记录 P1-R3 治理（2026-08-23）："经审计，32 个 svc 全部依赖本门面……原先 V70-2 注释声称'已完成去门面化迁移'与事实不符，已修正。本门面作为统一入口**长期保留**"。
- 实测门面残留：`grep -rn "use topems_shared::" svc/*/src` = **228 处**；`grep -rl "topems_shared::"` = **186 个文件 / 22 个服务目录**。
- 实测 Cargo 依赖：**22 个 svc 的 Cargo.toml 仍直接依赖门面 `topems-shared = { workspace = true }`**；同时服务也直接依赖子 crate（core=29、bootstrap=29、auth=29、db=25、event=23、boundary=15、service-client=12、observability=6、ai=2、mcp=1）。
- 结论：A4.2 的真实形态是"**服务可直接依赖子 crate**"（已落地），而非"**拆除门面**"（未做）。门面与子 crate **双轨并存**。

**(d) lib/src 主 crate 还剩什么** [代码实证]
- `lib/src/lib.rs`（142 行）几乎全部是 re-export（`pub use topems_shared_{auth,bootstrap,core,db,event,service_client,ai}::…`），即一个**纯转发门面**；外加 `pub mod form_assistant`（见下）与一个扩展 trait `AuditContextExt`（`lib/src/lib.rs:107-141`）。
- **异常点**：`lib/src/form_assistant/` 内含 **22 个业务表单文件**（crm_forms / ehs_forms / erp_finance_forms / erp_inventory_forms / erp_production_forms / erp_purchase_forms / erp_sales_forms / hrm_forms / iam_forms / lims_forms / mes_forms / pm_forms / qms_forms / rd_forms / scm_forms / system_forms / wms_forms + registry）。**各业务域的表单配置被放在了"共享门面 crate"内部**，而非各 svc 内——这是门面里残留的业务内容，是最大的耦合异味。

**(c) shared-boundary 的 only_own_schema_query! 宏** [代码实证]
- 定义：`lib/shared-boundary/src/lib.rs`（proc-macro）。编译期解析 SQL 中 `FROM/JOIN/UPDATE/INTO/TABLE` 后的 `schema.table`，未授权即 `compile_error!`。
- 默认放行白名单：`lib/shared-boundary/src/lib.rs:192` `DEFAULT_SHARED_SCHEMAS = ["public","unified_core","information_schema"]`（宏调用方可追加额外共享 schema）。
- 使用规模：`grep -rn only_own_schema_query svc/*/src` = **3288 处调用**，分布在 **15 个服务**（finance=620、qms=300、erp=295、wms=239、integration=205、srm=203、hrm=207、scm=190、pm=169、gis=153、mobile=144、ehs=100、ai=125、communication=79、crm=5）。
- **可被绕过的方式**：① 宏是 **opt-in**——服务写 `sqlx::query("SELECT ...")` 不包裹宏即无编译期检查（如 search 服务根本不依赖 boundary crate，见 §1.2）；② 宏对 `FROM (SELECT …)` 子查询括号形态直接跳过（`extract_schema_refs` 中遇 `(` 即 continue）；③ 仅识别 `FROM/JOIN/UPDATE/INTO/TABLE` 位置的表引用。
- **不在 boundary 约束内的服务**：unified-core、monitor、search、master-data、analytics、ticket、server、plugin-registry（其 Cargo.toml 未依赖 `topems-shared-boundary`）。

**(e) shared-bootstrap 职责边界** [代码实证]
- `lib/shared-bootstrap/src/lib.rs:623` `bootstrap_service()`：dotenv → 可选 telemetry → `create_database_pool` → 双轨迁移池 `create_migrate_pool()`（MIGRATE_URL，失败回退运行时池）→ metrics → `AuthState::from_env()` → 可选 EventPublisher → `register_with_consul()`。
- `lib/shared-bootstrap/src/lib.rs:760` `build_application()`：组装 CORS + Prometheus(`pair()` + `GLOBAL_METRIC_HANDLE` OnceLock) + **硬编码限流 `RateLimitConfig::new(200, 60)`**（`:774`，by_ip）+ auth_middleware + 可选 rls_middleware + request_context + telemetry_middleware。
- 职责清晰：bootstrap_service 管"资源初始化"，build_application 管"中间件装配"；并提供 `default_init_db()`（`:726`）收敛 master_data_refs + schema_defense。边界合理。

### 1.2 数据架构（database/ + .sqlx/）

**Schema 清单与 owner** [代码实证]
- `database/migrations/000_create_schemas.sql` 实际创建了**两套并行 schema 命名**：裸名（`iam doc flow unified_core erp finance hrm crm ai pm rs lims pdm mes qms ehs scm srm wms gis im bi report mail mobile core shared`）+ 插件名（`plugin_erp plugin_finance … plugin_ai` 等 20 个）。
- owner 权威映射见 `scripts/schema_boundary.json`（§5-b）。

**跨 schema 直读实测**（python 正则扫描 `from|join|into|update <schema>.<table>`，剔除 own/public/unified_core/core/information_schema）[代码实证]
- **unified-core 跨读约 22 个业务 schema**：ai/communication/crm/ehs/erp/finance/gis/hrm/iam/integration/lims/master_data/mobile/pdm/pm/portal/qms/scm/srm/ticket/tms/wms。因 `schema_boundary.json` 中 unified-core `schema=public`、`search_path=public`，它**不受 boundary 宏约束**，是最大的跨 schema 聚合点。
- `svc/search/src/handlers.rs:113,167,197`：`FROM erp.customers / erp.sales_orders / erp.purchase_orders`（search 未依赖 boundary crate，裸 SQL 直查 erp）。
- `svc/srm/src/modules/data_sync.rs:860` `FROM unified_core.inter_module_sync`、`:933` `INSERT INTO unified_core.inter_module_sync`（srm 直写 unified_core schema）。
- `svc/crm/src/modules/audit.rs:86` `FROM public.audit_logs`（crm 直读公共审计表；public 在宏默认白名单内，故不报错）。
- `wms -> scm.supplier_products`（1 表）。
- crm 对 erp 的历史直写（`erp.vouchers/erp.inventory`）**已被改造为 HTTP 调用**——见 `svc/crm/src/modules/aftersales.rs:1618,1647,1791,1818` 注释"原 INSERT INTO erp.* 改为调用 POST /api/erp/…"，当前残留的是注释而非真实 SQL。

**迁移管理机制** [代码实证]
- `database/migrations/` = **283 个 .sql**；命名双制：早期序号制 `000_…`~`013_…`（14 个）+ 当前时间戳制 `YYYYMMDDHHMMSS_…`。
- **无 `sqlx::migrate!` 内嵌迁移**：全仓 grep `sqlx::migrate!` 仅命中 ai 服务自管的 `run_migrations()`（`svc/ai/src/services/db.rs:68`）。迁移靠外部 `sqlx migrate run` / scripts 执行（`database/README.md:36`）。
- `database/checksums.txt` = **250 个 SHA256**（`grep -cE '^[a-f0-9]{64}'`），对照 283 个迁移文件 → **33 个迁移未登记 checksum**。
- 双迁移源核查：`deploy/migrations/` 仅 2 个文件（`migrate_feedback_to_ticket.sql` + README），属一次性归档迁移，**非并行迁移链**。
- `database/init/` 实际只有 `03_init_permissions.sql / 04_create_scm_wms_srm_tables.sql / 05_mobile_init.sql / 07_create_qms_tables.sql + README`。

**SQLx offline 缓存** [代码实证]
- `.sqlx/` = **309 项，1.2MB**，已被 git 跟踪（`git ls-files .sqlx | wc -l` = 309）。
- `.gitignore:246-253`：根 `.sqlx/` 白名单放行 `query-*.json / data-*.json`（供 CI 离线编译），`svc/*/.sqlx` 与 `lib/*/.sqlx` 仍忽略。
- 离线模式：`SQLX_OFFLINE=true` 写入 `.env:204`、`.env.production:53`、`config/standalone.env:51`；`Makefile:43` `check-offline`。
- 双锚点漂移已收口：`git log -- .sqlx Cargo.lock` 含 `9feb7cd5c fix(build): Cargo.lock 入库，统一两端依赖锚点`、`5760dc9c7 chore: 刷新sqlx离线缓存`——Cargo.lock 现亦入库（`git ls-files Cargo.lock` 命中）。

**多库/一致性** [代码实证]
- 单 PostgreSQL 实例 + schema 隔离（overview §数据库策略）；`lib/shared-event/src/saga/` 有 `orchestrator.rs/step.rs/store.rs`，且 finance 实际落地了事件溯源 + Saga（`svc/finance/src/domain/saga.rs`、`event_pipeline.rs`），erp/portal 亦引用。即 Saga 并非文档规划，已在 finance 域真实使用。
- 事件总线已从 Redis Pub/Sub+RabbitMQ 升级为 **Redis Stream**：`lib/shared-event/src/messaging.rs:3,69,92` 标注"事件总线已迁移至 Redis Stream（V321）"，旧 `RedisMessageBroker` 变为 deprecated shim；全仓无任何 svc 实际依赖 lapin/RabbitMQ。

### 1.3 部署与基础设施（deploy/ + config/）

**容器化** [代码实证]
- `deploy/docker/`：`Dockerfile.server`（单体）、`Dockerfile.service`（通用模板，`build-service.sh <svc>` 按 `config/services.yaml` 名构建任意服务）；compose 文件 8 个（full/monolith/services/domains/observability/dify + base）。
- `docker-compose.yml` 含 **44 个容器**，业务侧同时编进 `topems-server`（单体）与 crm/erp/finance/mes/qms/wms/unified-core 等。

**k8s** [代码实证]
- `deploy/k8s/services/` = **24 个 manifest**（含 monolith.yaml + 各业务服务 + gis-deployment）；`deploy/k8s/base/` 含 configmap/consul/ingress/postgres/rabbitmq/redis/monitoring/grafana/canary/namespace。CI 有 `deploy-k8s.yml` + `docker-build.yml`（build-push-action）。

**systemd** [代码实证]
- `deploy/systemd/topems-*.service` = **22 个业务 unit** + `topems.target` + grafana/prometheus unit。

**nginx** [代码实证]
- `deploy/nginx/topems.conf`：限流 `limit_req_zone … 10r/s burst 20`、`limit_conn_zone`、`proxy_next_upstream` 故障转移、TLS1.2/1.3 强密码套件——网关层硬蚀到位。

**服务发现现状** [代码实证]
- 代码内存在 **5 套**：`lib/shared-event/src/` 下 `consul/`、`etcd/`、`zookeeper/`、`service_discovery.rs`；`deploy/docker/` 下还有 `eureka-compose.yml`、`nacos-compose.yml`、`zookeeper-compose.yml`、`etcd-compose.yml`。
- 真实启用：**Consul**——`docker-compose.yml` 多处 `CONSUL_ENABLED: "true"`（如 :11,:169,:582），bootstrap 启动即 `register_with_consul`（`lib/shared-bootstrap/src/lib.rs:673,693`）。
- etcd：仅 ai DSH + portal 使用（`svc/ai/src/dsh/config_center/`、`svc/portal/src/state.rs`），opt-in（`ETCD_ENABLED` 默认 false）。
- zookeeper：仅 unified-core 内部引用（`svc/unified-core/src/shared/zookeeper_service_discovery.rs`）。
- eureka：`deploy/eureka-mock/server.py` 仅为**本地集成测试 mock**（官方镜像不可用的替代），非运行时依赖。
- nacos：仅有 compose 文件，代码侧未发现使用。

**配置中心 / keys / env 体系** [代码实证]
- `config/services.yaml` 为服务清单权威源（33 个 name 条目，含虚拟服务 flow/file/doc/automation）；`config/ports.env` = 41 个 `*_PORT` 变量；由 `scripts/check-workspace-registry.py` 三向校验守护。
- `config/keys/` **为空目录**（仅 `.gitkeep`）——JWT/加密密钥实际全部来自环境变量（`JWT_SECRET / JWT_REFRESH_SECRET / ENCRYPTION_KEY`），非文件密钥。
- `config/deployment.yaml`：默认 `mode: on-premise`、`multi_tenant_enabled: false`、`quota/billing/sso/two_factor/ip_whitelist` **全部 false**。
- `config/database.toml`：dev 段 `postgres://…@localhost:5433/topems`。

### 1.4 可观测性横切机制

- **tracing**：`lib/shared-observability/src/telemetry/mod.rs:41` `init_telemetry()`（真 OpenTelemetry）与 `telemetry_stub.rs:18`（`otel` feature 关闭时的桩，回退 `shared_core::logging::init_logging`）双轨。默认构建走 stub → **无 OTel 分布式链路**，仅本地日志。
- **trace-id 传播**：`telemetry/middleware.rs:58,129,161` 从 span 取 trace_id 写入响应头 `x-request-id`，并 `inject_context` 到出站请求。机制完整。
- **metrics**：`build_application` 自动挂 `PrometheusMetricLayer::pair()`（`lib/shared-bootstrap/src/lib.rs:771`）；`/health` 命中 **49 处**、`/metrics` 命中 **19 处**（grep `"/health"` / `"/metrics"`）。`svc/monitor/src/modules/monitor/metrics.rs` 为聚合指标源。
- **日志**：`shared-core/logging/structured_logger.rs` 支持 `LOG_FORMAT=JSON` 切换（默认非 JSON）；`telemetry/sensitive_filter.rs` 做 PII 过滤。
- **告警/日志查询/SLO**：`shared-observability/src/observability/` 含 alerting/log_query/slo/presets。

### 1.5 安全横切机制

- **JWT**：`lib/shared-auth/src/auth.rs` 支持 HS256（`from_secret`）与 RS256（RSA PEM）双算法（`:70-80`）；密钥来自 `JWT_SECRET`，生产（`PROFILE/RUST_ENV/ENV`）强制拒绝默认密钥并要求长度≥32（`:115,131,150-171`）。
- **加密**：`lib/shared-auth/src/security/encryption.rs` 用 **AES-256-GCM + 版本化密钥**（`key_version`，`:38,46,58`），base64 32 字节主密钥。
- **边界防护组件**：`shared-auth/security/` = audit_logger / body_limit / encryption / mask_sensitive / rate_limiter / security_headers。
- **限流**：进程内内存 `RateLimitMiddleware`（`shared-auth/src/rate_limit.rs`），bootstrap 硬编码 200 次/60s 按 IP（`lib/shared-bootstrap/src/lib.rs:774`）。
- **CORS**：`shared-core/src/cors.rs:15-35` 可配置 origin 白名单（非通配 `Any`），max_age 3600。
- **IP 白名单**：仅 `svc/portal/src/modules/gateway_security.rs` 实现，且 `deployment.yaml` 默认 `ip_whitelist_enabled: false`。
- **审计日志**：132 个 svc 源文件引用 audit_log（shared-db `AuditLogService`），公共表 `public.audit_logs`（见 §1.2）。
- **RLS**：`build_application` 按 `config.enable_rls` 挂 `rls_middleware`；但 `svc/finance/src/main.rs:244` 显式 `enable_rls: false`。
- **SECURITY.md**：仅为漏洞披露流程（报告邮箱为占位 `security@topems.example.com`），**不含架构级安全设计**。

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称(路径+章节) | 代码实际(路径+行号) | 结论 |
|---|---|---|---|
| 子 crate 数量 | overview.md:6「12 个共享库子 crate」 | Cargo.toml:6-16 实为 **11 个子 crate**（+主 crate=12） | 漂移（口径） |
| 去门面化 | Cargo.toml:388-392 注释「A4.2 去门面化迁移」 | lib/src/lib.rs:5-8 自陈门面长期保留；228 处 `use topems_shared::` / 22 svc 依赖门面 | 漂移（"去门面"实为"可直连子 crate"） |
| 事件总线 | event-driven.md:7-10 称 Redis Pub/Sub + RabbitMQ(lapin) | messaging.rs:3,69 已迁 **Redis Stream(V321)**；全仓无 lapin 使用 | 漂移 |
| DB schema 命名 | database.md:87-110 统一 `plugin_*` + `unified_core` | 000_create_schemas.sql 同时建裸名 `iam/erp/hrm…` 与 `plugin_*` 两套 | 漂移 |
| DB 端口 | database.md:27 `Port: 5432` | config/database.toml dev 段 `:5433` | 漂移 |
| init/ 脚本 | database/README.md:14-19 列 01/02/06 | init/ 实际仅 03/04/05/07，缺 01/02/06 | 漂移 |
| 迁移总数 | database/README.md:11,53 称 278 个 | `ls database/migrations/*.sql` = 283 | 漂移（数量） |
| SQLx 缓存 | database/README.md:86 称 424 文件 | `.sqlx/` = 309 项 | 漂移（数量） |
| 服务发现 | overview.md:219,302-318 称 Consul + env 回退 | consul 真实启用(docker-compose CONSUL_ENABLED=true)；另并存 etcd/eureka-mock/zookeeper/nacos | 一致（但文档未提 5 套并存） |
| 配置中心 | overview.md 称 etcd + unified-core 配置 | etcd 仅 ai/portal 用；config/keys/ 为空，密钥走 env | 部分漂移 |
| 健康检查 | overview.md:526 称每服务 /health | 49 处 `/health` 命中 | 一致 |
| Prometheus | overview.md:445「Prometheus(可选)」 | build_application 默认挂 Prometheus layer，19 处 /metrics | 一致 |
| IP 白名单 | overview.md:517「生产可配置 IP 白名单」 | 仅 portal 实现；deployment.yaml 默认 false | 漂移（默认未启用） |
| 限流 | overview.md:518「按用户/IP 限流」 | 进程内存 200/60s 按 IP，多实例不共享 | 部分漂移 |
| 分布式追踪 | overview.md:534「统一日志格式含 TraceID」 | OTel 为 feature-gated，默认 stub 无链路 | 漂移（默认无） |
| RLS/多租户 | database.md:522-531「行级安全隔离」 | finance 显式关闭 RLS(main.rs:244) | 漂移 |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据(路径:行号) | 影响 | 修复建议 |
|---|---|---|---|---|---|---|
| XCUT-01 | unified-core 跨读约 22 个业务 schema，且不受 boundary 约束 | 高危 | 数据架构 | scripts/schema_boundary.json(unified-core schema=public)；扫描命中 svc/{crm,erp,finance,hrm,qms,…} 表 | 模块化单体"模块边界"在数据层被核心服务整体穿透，跨 schema 耦合无门禁 | 为 unified-core 聚合路由加只读视图层 / 明确哪些聚合查询合法并纳入 schema_boundary allowlist |
| XCUT-02 | 门面未去除，业务表单配置栖身门面 crate | 中危 | 耦合 | lib/src/lib.rs:5-8；lib/src/form_assistant/*（22 个业务表单文件） | 业务域表单配置被塞进"共享门面"，业务与横切库纠缠；228 处门面引用 | 将 form_assistant 下沉至各 svc 或独立 ui-config crate；门面仅留高频 re-export |
| XCUT-03 | boundary 宏 opt-in 且子查询可逃逸，可被绕过 | 中危 | 安全/数据架构 | lib/shared-boundary/src/lib.rs:192（默认放行 public/unified_core）；extract_schema_refs 遇 `(` 跳过 | 未包裹宏的 SQL（如 search 裸查 erp）零检查；边界靠自觉 | 增加 CI 级静态扫描（scripts/schema_boundary.json 已有，需强门禁）兜底，与宏互补 |
| XCUT-04 | search 服务裸 SQL 直读 erp.*（未接 boundary） | 中危 | 数据架构 | svc/search/src/handlers.rs:113,167,197 | 搜索服务直接依赖 erp 表结构，erp schema 变更会打断搜索 | 改走 erp HTTP API 或事件投影；为 search 接入 boundary crate |
| XCUT-05 | srm 直写 unified_core.inter_module_sync | 中危 | 数据架构 | svc/srm/src/modules/data_sync.rs:860,933 | 业务服务反向写核心 schema，破坏"核心单向被依赖" | 改为统一集成表/事件同步，由 unified-core 侧提供写接口 |
| XCUT-06 | finance 显式关闭 RLS | 中危 | 安全 | svc/finance/src/main.rs:244 `enable_rls: false` | 财务数据脱离行级租户隔离 | 复核是否确为兼容需要；逐步补 RLS policy 后开启 |
| XCUT-07 | 五套服务发现并存（consul/etcd/eureka/zookeeper/nacos） | 中危 | 部署 | deploy/docker/{etcd,eureka,zookeeper,nacos}-compose.yml；lib/shared-event/src/{consul,etcd,zookeeper} | 运维面大、选型分散，增加部署与理解成本 | 收敛为 Consul 一套；etcd 限 ai/portal 场景；其余标记 deprecated |
| XCUT-08 | shared-mcp/shared-dsh 未入 workspace.dependencies，依赖方式不一致 | 低危 | 设计缺陷 | Cargo.toml:393-402（无 mcp/dsh）；svc/ai/Cargo.toml:25,33（path 直连 boundary/mcp） | 依赖声明不统一，新服务引用易写错路径 | 将 mcp/dsh 补入 workspace.dependencies；ai 的 path 直连改 workspace 引用 |
| XCUT-09 | crm 直读 public.audit_logs | 低危 | 数据架构 | svc/crm/src/modules/audit.rs:86 | 公共审计表被业务服务直查（虽在默认白名单） | 审计查询收口到 unified-core/monitor，避免业务侧读公共表 |
| XCUT-10 | 双 schema 命名（裸名 iam/hrm/erp… 与 plugin_* 并存） | 中危 | 数据架构 | database/migrations/000_create_schemas.sql 两套 CREATE SCHEMA | search_path 与表前缀易混，新迁移易写错 schema | 明确废弃其中一套，新迁移统一前缀；存量给出 rehome 计划 |
| XCUT-11 | checksums.txt 覆盖不全（250 vs 283 迁移） | 低危 | 数据架构 | database/checksums.txt（250 hash）vs migrations/（283 文件） | 33 个迁移未登记校验和，漂移检测有盲区 | 补登记缺失迁移 checksum 或将其纳入 CI 校验 |
| XCUT-12 | OTel 分布式追踪默认关闭（stub） | 低危 | 可观测性 | lib/shared-observability/src/telemetry_stub.rs:18,33 | 默认部署无跨服务链路，故障定位靠日志 trace_id | 私有化生产默认开 otel feature + OTLP collector |
| XCUT-13 | 限流为进程内存态，多实例不共享 | 低危 | 可靠性 | lib/shared-bootstrap/src/lib.rs:774（200/60s 硬编码） | k8s 多副本时每副本独立计数，实际阈值×副本数 | 限流下沉到网关(nginx 已 10r/s)或改用 Redis 共享计数 |
| XCUT-14 | ehs 在 schema_boundary.json 配置异常（schema=public，allow=[ehs]） | 低危 | 数据架构 | scripts/schema_boundary.json(ehs: schema=public, search_path=ehs,public, allow=[ehs]) | ehs 真实表在 ehs schema，但声明 own=public，boundary 语义混乱 | 校正 ehs 的 schema 字段为 ehs |
| XCUT-15 | IP 白名单仅 portal 实现且默认关闭 | 低危 | 安全 | config/deployment.yaml（ip_whitelist_enabled: false）；svc/portal/src/modules/gateway_security.rs | overview 声称的 IP 白名单未平台化 | 若生产需要，下沉为统一中间件并在 deployment.yaml 开启 |
| XCUT-16 | database/README 与 init/ 文件、数量多处漂移 | 低危 | 文档漂移 | database/README.md:14-19,86 vs init/ 实际、.sqlx=309 | 新同学按 README 重建数据库会找不到脚本 | 同步 README 的 init 清单与数量口径 |

---

## 4. 优点与亮点（客观，带证据）

1. **Shared Bootstrap 三段式真正落地**：`ServiceConfig → bootstrap_service → build_application → run`（`lib/shared-bootstrap/src/lib.rs:623,760`），消除各 main.rs 重复样板；双轨迁移池（MIGRATE_URL）设计体现了"DDL 走 owner、查询走受限用户"的最小权限思路（`:648-652`）。
2. **编译期 schema 边界宏**：`only_own_schema_query!`（`lib/shared-boundary/src/lib.rs`）是少见的**编译期**而非运行期边界护栏，且已铺到 3288 处调用、15 个服务——方向正确、覆盖广。
3. **JWT/加密机制严谨**：HS256/RS256 双算法自适应、生产强制拒绝默认密钥（`shared-auth/src/auth.rs:131,150-171`）；AES-256-GCM + 版本化密钥支持轮换（`security/encryption.rs:38,58`）。
4. **网关层硬蚀到位**：nginx 限流/并发/故障转移/TLS 强套件（`deploy/nginx/topems.conf`），与应用层限流形成双层。
5. **模块化单体演进有明确边界规则**：modular-monolith-design.md §5.2 明确"何时嵌入 server vs 保持独立微服务"，并清理了幽灵 feature（module-advanced/ai），有编译验证记录。
6. **SQLx offline + Cargo.lock 双锚点收口**：`.gitignore:246-253` 白名单放行 `.sqlx/query-*.json` 供 CI 纯离线编译，Cargo.lock 入库统一两端锚点（commit 9feb7cd5c）。
7. **Saga/事件溯源已在 finance 真实落地**（`svc/finance/src/domain/saga.rs`），而非停留在 event-driven.md 的"后续规划"清单。

---

## 5. 可视化数据

### (a) 共享库依赖图 JSON

```json
[
  {"from":"svc/*(22个)","to":"topems-shared(门面)","kind":"dep","note":"228处 use topems_shared:: / 186文件；门面长期保留(lib/src/lib.rs:5-8)"},
  {"from":"svc/*(29个)","to":"shared-core","kind":"dep","note":"直接依赖最多的子crate"},
  {"from":"svc/*(29个)","to":"shared-bootstrap","kind":"dep","note":"三段式启动框架"},
  {"from":"svc/*(29个)","to":"shared-auth","kind":"dep","note":"JWT/中间件/权限"},
  {"from":"svc/*(25个)","to":"shared-db","kind":"dep","note":"连接池/审计/schema"},
  {"from":"svc/*(23个)","to":"shared-event","kind":"dep","note":"Redis Stream 事件总线"},
  {"from":"svc/*(15个)","to":"shared-boundary","kind":"dep","note":"only_own_schema_query! 宏，3288处调用"},
  {"from":"svc/*(12个)","to":"shared-service-client","kind":"dep","note":"出向HTTP客户端"},
  {"from":"svc/*(6个)","to":"shared-observability","kind":"dep","note":"多数经 bootstrap 间接引入"},
  {"from":"svc/ai","to":"shared-ai","kind":"dep","note":"2个服务"},
  {"from":"svc/ai","to":"shared-mcp","kind":"dep","note":"path直连，未入workspace.deps"},
  {"from":"svc/ai","to":"shared-dsh","kind":"dep","note":"DSH仅ai使用，未入workspace.deps"},
  {"from":"lib(门面)","to":"shared-{core,db,auth,event,service-client,ai,observability,bootstrap}","kind":"reexport","note":"lib/src/lib.rs 纯转发+form_assistant业务模块"},
  {"from":"svc/{unified-core,monitor,search,master-data,analytics,ticket,plugin-registry}","to":"shared-boundary","kind":"missing","note":"未接编译期边界宏"}
]
```

### (b) schema ↔ owner 服务映射表（据 scripts/schema_boundary.json）

| schema | owner 服务 | search_path | 额外 allow |
|---|---|---|---|
| public | unified-core / monitor / search | public | — |
| iam/unified_core | unified-core(核心层) | — | 默认白名单放行 |
| erp | erp | erp,public | finance,crm |
| finance | finance | finance,public | — |
| hrm | hrm | hrm,public,shared | mobile |
| crm | crm | crm,public,shared | — |
| ai / ai_service | ai | ai_service,public,shared | — |
| mes | mes | mes,public | — |
| wms | wms | wms,public,shared | — |
| scm | scm | scm,public,shared | — |
| srm | srm | srm,public,shared | — |
| qms | qms | qms,public | — |
| lims | lims | lims,public | — |
| ehs | ehs(声明异常:schema=public) | ehs,public | ehs |
| rs | rd | rs,public | — |
| pdm/pm/gis/mobile/tms/master_data/portal/ticket/communication | 对应同名服务 | …,public | integration allow qms,ehs |

### (c) 跨 schema 引用统计（python 实测）

| 访问方 | 被访问 schema | 表数 | 性质 |
|---|---|---|---|
| unified-core | ai/communication/crm/ehs/erp/finance/gis/hrm/iam/integration/lims/master_data/mobile/pdm/pm/portal/qms/scm/srm/ticket/tms/wms | 各 3-8 | 聚合查询，无门禁 |
| search | erp | 3 (customers/sales_orders/purchase_orders) | 裸SQL，未接boundary |
| srm | unified_core | inter_module_sync(读+写) | 业务写核心schema |
| crm | public | audit_logs | 公共表直读(白名单内) |
| wms | scm | supplier_products | 跨schema读 |

### (d) 部署覆盖统计（实测）

| 形态 | 覆盖 |
|---|---|
| Docker 业务镜像 | Dockerfile.service 通用模板 + build-service.sh（任意服务可构建）；compose 44 容器 |
| k8s manifest | 24 个 services/ + base/(configmap/consul/ingress/postgres/rabbitmq/redis/monitoring/grafana/canary) |
| systemd unit | 22 个 topems-*.service + topems.target |
| nginx | 1 份 topems.conf（限流/SSL/故障转移） |
| 服务发现 | Consul(启用) / etcd(ai,portal) / zookeeper(unified-core) / eureka(mock) / nacos(compose only) |
| CI | ci.yml(cargo) + docker-build.yml(build-push) + deploy-k8s.yml |
