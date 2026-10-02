# core 模块组架构分析

> 分片范围：`svc/unified-core`、`svc/monitor`、`svc/plugin-registry`、`svc/search`、`svc/communication`、`svc/integration`、`svc/mobile`、`svc/ticket`、`svc/hrm`
> （`svc/portal` GraphQL BFF、`svc/server` 统一入口、`lib/shared-*` 跨切面不在本片）
> 分析日期：2026-10-02 · 方法：代码实测（grep -n / ls / find -exec wc）+ 设计文档对照
> 证据标记：[代码实证] 直接来自代码事实 · [文档声称] 来自 docs/architecture/*.md · [漂移] 文档与代码不符

---

## 1. 分片架构现状（代码实证）

### 1.1 服务清单与部署形态（权威源 `config/services.yaml`）

本组 9 个服务，全部 `dependencies: [unified-core]`（即统一认证/IAM 枢纽）[代码实证 `config/services.yaml`]：

| 服务 | 端口 | 包/目录 | 角色 | Bootstrap 模式（实测 main.rs） |
|---|---|---|---|---|
| unified-core | 8000 | `svc/unified-core` | IAM/Flow/File/Tenant + 业务镜像聚合 | **C**（`Application{router,port,name}` 重建）`svc/unified-core/src/main.rs:750` |
| monitor | 8095 | `svc/monitor` | 系统监控/健康/指标（V68.1 A2.1 从 unified-core 拆出） | **B 形**（自定义 `AppState` + `build_application`）`svc/monitor/src/main.rs:43-48,67` |
| plugin-registry | 8096 | `svc/plugin-registry` | 插件注册/运行时/导航（V68.1 A2.2 拆出） | **A 形**（`build_application`）`svc/plugin-registry/src/main.rs:84` |
| search | 8082 | `svc/search` | 全文搜索 | **A**（`build_application`）`svc/search/src/main.rs:56` |
| communication | 8084 | `svc/communication` | 邮件/通知/IM（外迁独立进程） | **A**（`build_application`）`svc/communication/src/main.rs:283` |
| integration | 8072 | `svc/integration` | Webhook/Scheduler/跨域联动 | **C**（`Application{}`）`svc/integration/src/main.rs:102` |
| mobile | 8070 | `svc/mobile` | 移动聚合（6+ 服务客户端） | **C**（`Application{}`）`svc/mobile/src/main.rs:188` |
| ticket | 8086 | `svc/ticket` | 工单（含 feedback 合并） | **A**（`build_application`）`svc/ticket/src/main.rs:75` |
| hrm | 8020 | `svc/hrm` | 人力资源 | **A**（`build_application`）`svc/hrm/src/main.rs:122` |

[代码实证] 启动统一走 `topems_shared_bootstrap`：`bootstrap_service(&config)` → 组装路由 → `run(app)`，9 个服务 `#[tokio::main]` + `bootstrap_service` 全部命中（各 `src/main.rs`）。

### 1.2 代码规模（实测 `find ... -name '*.rs' -not -path '*/target/*'`）

| 服务 | .rs 文件数 | 代码行数 |
|---|---|---|
| unified-core | 256 | 79,657 |
| hrm | 44 | 21,431 |
| integration | 39 | 19,999 |
| mobile | 42 | 15,772 |
| plugin-registry | 21 | 9,086 |
| communication | 10 | 9,217 |
| monitor | 17 | 7,314 |
| ticket | 11 | 7,529 |
| search | 9 | 2,683 |
| **合计** | **449** | **172,688** |

[代码实证] unified-core 一个服务占本组 ~46% 代码量，是绝对核心。

### 1.3 unified-core 的“业务镜像聚合”结构（本片最重要事实）

[代码实证] `svc/unified-core/src/modules/` 下共有 **39 个子目录**，其中 **23 个是业务域镜像目录**：
`ai, analytics, crm, ehs, erp, finance, gis, hrm, integration, lims, master_data, mes, mobile, pdm, pm, portal, qms, rd, scm, srm, ticket, tms, wms`。

这些目录**不是空壳**——每个含 278–978 行 Rust，内含真实 SQL。例：
- `svc/unified-core/src/modules/erp/handlers.rs:35-58` 直接 `SELECT ... FROM erp.purchase_orders`、`erp.sales_orders`、`erp.erp_production_orders`（`erp/handlers.rs:38,53,124,139,203,217`）。

[代码实证] 这些模块在 `svc/unified-core/src/modules/mod.rs:36-81` 以 `pub mod wms; mod mes; mod scm; ... mod ai;` **全部显式导出**（未注释）。

[代码实证] 路由挂载是**双轨**的（`svc/unified-core/src/routes/mod.rs:240-314`）：
- **嵌入模式**（`embed_mode=true`，被 `svc/server` 以 `build_router_embedded` 挂载）：`routes/mod.rs:257-261` 只 merge `core_router`，**不挂载**业务路由（注释 `:258` “wms/mes/scm 由 server 统一提供”）。
- **独立模式**（`embed_mode=false`，unified-core 自己 `main.rs` 跑）：`routes/mod.rs:267-313` 连续 **24 个 `.merge(xxx_router())`**（wms/mes/scm/finance/erp/crm/hrm/qms/pdm/ehs/analytics/pm/lims/srm/gis/tms/master_data/communication/ticket/rd/integration/portal/mobile/ai），全部挂载上线。

[代码实证] 双轨入口在 `svc/unified-core/src/embedded.rs:22-37`：`build_router(..., false)` = 独立；`build_router_embedded(..., true)` = 嵌入。两者共享 `build_router_inner`（`embedded.rs:39`）。

[代码实证] 独立模式下这些业务路由挂在与独立服务**相同的 URL 前缀**——如 `svc/unified-core/src/routes/erp_routes.rs:13-24` 注册 `/api/erp/purchase-orders`、`/api/erp/sales-orders`、`/api/erp/production-orders`，与 `svc/erp` 自身路由重叠，但实现是 unified-core 内直接读 `erp.*` schema 的瘦只读投影。

### 1.4 跨 schema 数据引用（实测 grep schema 限定符）

[代码实证] 各服务 `src` 中 `<schema>.<table>` 限定引用统计：

| 服务 | 主要 schema 引用 | 说明 |
|---|---|---|
| unified-core | public 125、iam 86；**业务 schema 合计 180 处**（crm 15、tms/srm/lims/hrm/gis 各 10、wms/scm/rd/master_data/finance 各 8、qms/pdm/erp/ehs 各 6…） | 独立模式跨域直读（见 1.3） |
| plugin-registry | core 107、plugin 35 | 本域 + core_* 共享层，干净 |
| hrm | hrm 235 | 只读本域，干净 |
| integration | qms 8、ehs 3（直写） | 跨域直写残留（见 §3 CORE-02） |
| search | erp 3（`handlers.rs:113,167,197`） | 跨域直读 erp |
| mobile | notification 4 | 跨域读通知 |
| monitor | public 7 | 干净 |
| communication / ticket | 0 限定引用 | 走 sqlx 宏/本域表 |

### 1.5 服务间调用拓扑（实测）

[代码实证] 全组 **gRPC/tonic 命中 0**——尽管 workspace 依赖声明了 `tonic 0.14`（`Cargo.toml:378`），本组 9 个服务均无 tonic/grpc 调用，跨服务通信 = **HTTP(reqwest/service_client) + Redis Stream 事件 + 直连 DB** 三种。

- **HTTP 出站**（实测 `reqwest` / `SERVICE_URL` / `service_client` 命中）：
  - unified-core：`service_client` 引用 246、reqwest 24——主要是 `business_tools` 统一业务工具注册表（`svc/unified-core/src/modules/business_tools/`）。
  - mobile：`service_client` 引用 90（移动聚合多下游）。
  - integration：reqwest 10，出站目标 env = `ERP_SERVICE_URL/MES_SERVICE_URL/LIMS_SERVICE_URL/QMS_SERVICE_URL/SCM_SERVICE_URL/WMS_SERVICE_URL/CORE_URL`（`svc/integration/src` grep 实测）。
  - hrm：`svc/hrm/src/modules/payroll.rs:990` `POST {erp_url}/api/erp/vouchers`（薪酬→ERP 凭证）；`svc/hrm/src/modules/hrm_plugin.rs:171-175` reqwest POST 自注册插件。
  - communication：`svc/communication/src/im_location.rs:714-718` 调 `{GIS_SERVICE_URL}/api/gis/search`。
- **事件（Redis Stream）**：integration 事件引用 35、hrm 17、mobile 23、unified-core 59。integration 的 `event_handlers/` 订阅 QMS/LIMS/EHS 领域事件做跨域联动。
- **入站**：`config/services.yaml` 全部 `dependencies:[unified-core]`——所有服务依赖 unified-core 做 IAM/JWT 认证。

### 1.6 平台核心：IAM / 租户 / 插件 / 导航

- **IAM/RBAC**：`svc/unified-core/src/modules/iam/`（auth.rs、role.rs、user/、permission.rs、permission_verify.rs、position.rs 等 19 文件 7,871 行）。JWT 中间件 `topems_shared_auth::auth::auth_middleware` 挂载在 `core_protected_routes`（`routes/mod.rs:228-231`）。
- **多租户 RLS**：`svc/unified-core/src/middleware/tenant_rls.rs:170-178` 用 `set_config('app.tenant_id',$1,false)` 设会话 GUC；`:180-258` 中间件逐请求设/重置（superuser 设空串放行，普通用户设实际租户）。
- **插件注册令牌**：`svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:15-45` `verify_registration_token`——`PLUGIN_REGISTRATION_TOKEN` + `X-Plugin-Token` 头校验。
- **导航配置**：`svc/plugin-registry/src/modules/plugin/mod.rs:75-76` `GET /api/plugin/navigation-config` → `runtime::get_navigation_config`（`runtime.rs:360`）。
- **插件心跳**：注册/心跳写库 `core.core_plugin_instances.last_heartbeat=NOW()`（`runtime.rs:160-163,230`）；**但离线检测后台任务不存在**（见 §3 CORE-03）。

### 1.7 可观测性与错误出口（实测计数）

[代码实证] `tracing::` 命中：unified-core 757、hrm 216、mobile 174、communication 149、integration 117、plugin-registry 110、ticket 14、search 7、monitor 6。`/metrics` Prometheus 由 `build_application` 统一注入（monitor 14、unified-core 10、plugin-registry/integration 4 等自有引用）。

[代码实证] 统一错误出口（`TopemsError`/`HandlerResult` 采纳 vs 手写 `ApiResponse::error(`）：

| 服务 | TopemsError/HandlerResult | 手写 ApiResponse::error |
|---|---|---|
| integration | 78 | 24 |
| ticket | 64 | 33 |
| unified-core | 48 | 20 |
| mobile | **8** | **230** |
| hrm | 2 | 20 |
| communication | 0 | 12 |
| monitor/plugin-registry/search | 0 | 0（薄透传） |

---

## 2. 文档声称 vs 代码实证对照表

| 主题 | 文档声称（路径 + 章节） | 代码实际（路径 + 行号） | 结论 |
|---|---|---|---|
| unified-core 业务模块已移除 | `docs/architecture/overview.md:348`：“unified-core 现仅保留核心模块 iam/doc/flow/file/mail/im/notification/plugin/search/communication”；`:340-346` 称 erp/crm/hrm/wms/finance 已迁至独立服务 | `svc/unified-core/src/modules/mod.rs:36-81` 仍 `pub mod erp/crm/hrm/wms/mes/scm/finance/qms/...ai`（23 个）；`routes/mod.rs:267-313` 独立模式挂载 24 个业务路由；`modules/erp/handlers.rs:38` 仍直读 `erp.purchase_orders` | **[漂移]** 模块未删，独立部署时仍上线且跨 schema 直读 |
| 业务模块目录性质 | overview 暗示为“残留已清理” | 23 目录非空壳（278–978 行/个，含真实 SQL） | **[漂移]** 是活跃瘦投影层，非待删残留 |
| Bootstrap 模式计数 A/B/C | `overview.md:190,223-225`：A=10、B=13、C=5（合计 28） | `Cargo.toml:95-100` 注释：A=8、B=11、C=7（合计 26）；且 monitor/plugin-registry 未入任一枚举 | **[漂移]** 两处口径自相矛盾，拆分后未回写 |
| 插件心跳离线检测 | `overview.md:221,269-271`：“PluginHeartbeatMonitor 后台任务每 30 秒检测、90 秒超时标记 offline”，位置 `svc/unified-core/src/main.rs` | `svc/unified-core/src/embedded.rs:311-317` 心跳循环体为空（注释“简化：跳过 plugin heartbeat 检测”）；plugin-registry 全仓无 `tokio::spawn`/`interval(` 后台循环 | **[漂移]** 心跳只写库不评估，离线标记未实现 |
| integration 跨域直写已改 reqwest | `docs/architecture/integration-cross-domain-api.md:40-43,70-72`：步骤B“6 处直写→reqwest”、步骤D“撤销 allowlist 2→1”全部 `[x]` | `svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174,196,244,315` 仍 8 处 `only_own_schema_query!("integration","INSERT INTO qms./ehs.")`，`:274` 仍 `UPDATE qms.qa_quality_inspections`（共 9 处） | **[漂移]** 直写代码仍在，与“直写清零”不符 |
| 插件注册令牌安全 | `overview.md:258`：“令牌未设置→开发模式跳过验证” | `runtime.rs:18-31`：未设令牌时，`PROFILE=prod/production` **拒绝**，其余才放行——比文档更严 | [代码实证] 比文档更安全，但依赖 PROFILE 精确取值（见 CORE-05） |
| 模块化单体 core 组成员 | `modular-monolith-design.md:39` core 组 = unified-core/monitor/plugin-registry/search/communication/integration/portal/mobile/ticket（9，无 hrm） | `Cargo.toml:33-43` workspace 把 `svc/hrm` 也放在 core 组注释块内（`"svc/hrm"` 紧接 ticket） | **[漂移]** hrm 分组归属两处不一致（本片按任务要求纳入 hrm） |
| RLS 多租户隔离 | `overview.md:503`“RBAC + 细粒度权限”、`permission-persistence-design.md` 未提池化 GUC 风险 | `tenant_rls.rs:170-178` 会话 GUC 设在连接池连接上，业务查询可能借另一连接 | **[漂移/设计观察]** 代码自承 RLS 仅纵深防御（`:214-215`） |
| 服务发现机制 | `overview.md:302-318` Consul + 环境变量回退 | `.env.example:224` `CONSUL_ENABLED=false` 默认关；`lib/shared-service-client/.../trait_api.rs:361-363` Consul 可选 | 一致（默认 env 回退，Consul 未启用） |
| 敏感数据加密 | `overview.md:509`“密码、个人信息等敏感数据加密存储” | `svc/unified-core/src/embedded.rs:336-340` `init_field_encryption()` 直接 `return None`（注释“简化：跳过字段加密”） | **[漂移]** 嵌入路径字段加密未启用 |

---

## 3. 发现项

| ID | 标题 | 严重级 | 类别 | 证据（路径:行号） | 影响 | 修复建议 |
|---|---|---|---|---|---|---|
| CORE-01 | unified-core 仍聚合 23 个业务镜像模块，独立部署时跨 schema 直读 180 处业务表 | 高危 | 耦合/数据架构 | `svc/unified-core/src/modules/mod.rs:36-81`；`routes/mod.rs:267-313`；`modules/erp/handlers.rs:38,124,203` | 与“已瘦身”文档矛盾；独立运行时 unified-core 直接读 erp/hrm/wms 等库，破坏 schema 边界，且与独立 svc/* 路由重叠易双写/歧义 | 明确二选一：①独立部署也走 `embed_mode` 等效（不挂业务路由）；②将这批瘦投影显式登记为“只读仪表盘层”并补 schema-boundary allowlist 注释，同步回写 overview.md:348 |
| CORE-02 | integration 跨域直写未真正改 reqwest，9 处直写 qms.*/ehs.* 残留 | 高危 | 数据架构/通信 | `svc/integration/src/qms_lims_ehs.rs:26,39,80,136,174,196,244,274,315` | 文档称直写清零、allowlist 2→1，代码仍跨库 INSERT/UPDATE；物理库拆分时会跨库事务断裂 | 按 integration-cross-domain-api.md 步骤B 真正落地 reqwest，或删除该未接线文件；更新 §5 状态为未完成 |
| CORE-03 | 插件心跳离线检测为死代码（空循环），无后台评估任务 | 中危 | 可靠性/可观测性 | `svc/unified-core/src/embedded.rs:311-317`；plugin-registry 无 `tokio::spawn` | 插件挂掉后 `last_heartbeat` 永不被判定，运行时状态永远 running，运维盲区 | 在 plugin-registry 补 30s 扫描任务（`last_heartbeat<90s`→offline），或从 overview.md:221,269 删除该声称 |
| CORE-04 | Bootstrap A/B/C 计数三处不一致（Cargo 26 vs overview 28），monitor/plugin-registry 漏登 | 中危 | 文档漂移/部署 | `Cargo.toml:95-100`；`overview.md:190,223-225`；`svc/monitor/src/main.rs:43-67` | 启动模式台账失真，新增服务接入时易漏配 | 以实测 main.rs 为准重算 A/B/C，补 monitor(B形)/plugin-registry，同步两份文件 |
| CORE-05 | 插件注册令牌门控依赖 `PROFILE=="prod"/"production"` 精确串，否则放行 | 中危 | 安全 | `svc/plugin-registry/src/modules/plugin/handlers/runtime.rs:18-31` | 若生产部署 PROFILE=staging/未设，未配令牌时任意方可注册插件 | 改为“未设令牌即默认拒绝”，或要求显式 `ALLOW_DEV_REGISTRATION=true` 才放行 dev |
| CORE-06 | RLS 会话 GUC 在连接池上设置，业务查询借连接不保证生效 | 中危 | 安全/数据架构 | `svc/unified-core/src/middleware/tenant_rls.rs:170-178,214-225` | 池化下 `set_config(is_local=false)` 的连接与 handler 查询连接可能不同，RLS 纵深防御实际不兜底；靠显式 SQL tenant 条件为主 | 用 `pool.acquire()` 持同一连接贯穿请求，或改用行级中间件把 tenant 条件注入查询；文档明确 RLS 非主防线 |
| CORE-07 | mobile 服务错误泄露面大（230 处手写 ApiResponse::error，仅 8 处类型化） | 中危 | 安全/可观测性 | `svc/mobile/src`（grep 实测 230 vs 8） | sqlx 原始错误（表名/SQL 片段）直达客户端，违背统一错误出口决策 V517 | 按 unified-error-handling-decision.md §3.5 `TopemsError::internal()` 批量迁移 mobile handler |
| CORE-08 | search 跨 schema 直读 erp.customers/sales_orders/purchase_orders | 低危 | 数据架构 | `svc/search/src/handlers.rs:113,167,197` | schema-boundary 门禁 FAIL（审计 M1）；搜索服务越界读 ERP 库 | 经 erp API/视图取数，或将 search→erp 引用补入 allowlist 并注明设计原因 |
| CORE-09 | hrm 在 core 组分组归属两处不一致 | 低危 | 文档漂移 | `Cargo.toml:43`（core 块内含 hrm） vs `modular-monolith-design.md:39`（core 列 9 无 hrm） | 模块组边界定义模糊，裁剪 feature 时易误判 | 统一 modular-monolith-design.md §2 表，把 hrm 显式归入或移出 core |
| CORE-10 | unified-core 嵌入路径字段加密被跳过（return None） | 低危 | 安全 | `svc/unified-core/src/embedded.rs:336-340` | 与“敏感数据加密存储”声称不符；嵌入部署时字段加密不生效 | 生产嵌入路径补 KeyManager 初始化，或文档降级该声称 |
| CORE-11 | Consul 服务发现默认关闭，实际全走环境变量 | 低危 | 部署 | `.env.example:224` `CONSUL_ENABLED=false`；`trait_api.rs:361-363` | 文档以 Consul 为主线描述，默认形态是静态 env；多实例扩缩时无注册发现 | 私有化多实例前启用 Consul，文档标注“单实例默认 env” |

---

## 4. 优点与亮点（客观，带证据）

- **双轨启动共享同一组装链，主动防漂移**：`embedded.rs:22-37` `build_router`/`build_router_embedded` 复用 `build_router_inner`，注释 `:8` 明言“与独立部署共享同一份组装逻辑，避免双轨漂移”——正是 portal 此前双轨漂移教训后的正解。[代码实证]
- **统一 Bootstrap 覆盖全组**：9/9 服务 `bootstrap_service` + `build_application`/`run`（各 main.rs），中间件栈（auth/rate_limit/security_headers/compression/audit/body_limit）由 `build_application` 自动装配，一致性高。[代码实证]
- **插件令牌生产默认拒绝比文档更严**：`runtime.rs:21-25` 在 PROFILE=prod 且未配令牌时直接 `return false` 拒绝注册，安全姿态高于 overview.md:258 的“跳过验证”描述。[代码实证]
- **integration / ticket 已较好采纳类型化错误**：TopemsError 命中 78 / 64 处，是统一错误出口决策的正面样板（对照 mobile 230 处手写）。[代码实证]
- **连接池 GUC 残留有显式处理意识**：`tenant_rls.rs:221-223` 注释明确“set_config is_local=false 会残留，每请求必须显式设/重置”，superuser 设空串避免零值误拦（`:214`）——设计意图清晰。[代码实证]
- **Schema 防御自检**：unified-core 启动跑 `schema_defense::run_schema_migration_and_verify`（`embedded.rs:109-111`）做增量迁移 + 一致性校验。[代码实证]
- **主数据/权限/审计 Store 可插拔**：`embedded.rs:179-203` PermissionStore/AuditLogStore 经工厂 `from_env` 切换 memory/database，预留多实例共享能力（对齐 permission-persistence-design.md）。[代码实证]

---

## 5. 可视化数据

### 5.1 依赖边清单（覆盖本组服务对外全部已核实依赖）

```json
[
  {"from":"unified-core","to":"db(iam/core/public)","kind":"db","note":"本域+共享层，86 iam / 125 public 限定引用"},
  {"from":"unified-core","to":"db(erp/crm/hrm/wms/mes/scm/qms/lims/ehs/finance/pdm/rd/srm/gis/tms/master_data/analytics/pm)","kind":"db","note":"独立模式 180 处业务 schema 直读（CORE-01），嵌入模式不挂载"},
  {"from":"search","to":"db(erp)","kind":"db","note":"handlers.rs:113,167,197 读 erp.customers/sales_orders/purchase_orders（CORE-08）"},
  {"from":"integration","to":"db(qms/ehs)","kind":"db","note":"qms_lims_ehs.rs 9 处 only_own_schema_query! 直写残留（CORE-02）"},
  {"from":"mobile","to":"db(notification)","kind":"db","note":"4 处 notification schema 引用"},
  {"from":"plugin-registry","to":"db(core/plugin)","kind":"db","note":"core 107 / plugin 35，本域+共享层"},
  {"from":"hrm","to":"erp","kind":"http","note":"payroll.rs:990 POST {erp_url}/api/erp/vouchers 薪酬推凭证"},
  {"from":"hrm","to":"plugin-registry","kind":"http","note":"hrm_plugin.rs:171 reqwest POST 自注册插件"},
  {"from":"integration","to":"erp/mes/lims/qms/scm/wms/core","kind":"http","note":"env *_SERVICE_URL + reqwest（跨域编排）"},
  {"from":"communication","to":"gis","kind":"http","note":"im_location.rs:718 GET {GIS_SERVICE_URL}/api/gis/search"},
  {"from":"mobile","to":"notification/analytics+多下游","kind":"http","note":"service_client 90 处（移动聚合）"},
  {"from":"all-9-services","to":"unified-core","kind":"http","note":"config/services.yaml 全 dependencies:[unified-core]（JWT/IAM 认证）"},
  {"from":"integration","to":"qms/lims/ehs-domains","kind":"event","note":"event_handlers 订阅 Redis Stream 领域事件做跨域联动"},
  {"from":"hrm","to":"event-bus","kind":"event","note":"17 处事件引用"},
  {"from":"mobile","to":"event-bus","kind":"event","note":"23 处事件引用"},
  {"from":"unified-core","to":"event-bus","kind":"event","note":"59 处事件引用"}
]
```

> 注：本组实测 **gRPC/tonic 边 = 0**（workspace 虽声明 tonic 0.14，但 9 个服务均未使用）；Consul 服务发现边默认关闭（CONSUL_ENABLED=false），运行时实为静态 env 回退，未计为活跃边。

### 5.2 统计数字（全部实测）

- 服务数：**9**（unified-core / monitor / plugin-registry / search / communication / integration / mobile / ticket / hrm）
- 代码文件数：**449** 个 `.rs`（不含 target）
- 代码行数：**172,688** 行
- unified-core 业务镜像模块目录：**23** 个；独立模式挂载业务路由：**24** 个
- unified-core 跨业务 schema 限定引用：**180** 处
- integration 跨 schema 直写残留：**9** 处（`only_own_schema_query!`）
- Bootstrap 模式分布（实测）：**C=3**（unified-core/integration/mobile）、**A=4**（search/communication/ticket/hrm）、**B形=2**（monitor/plugin-registry）
- 插件心跳离线检测后台任务：**0**（死代码）
- 统一错误出口采纳：integration 78 / ticket 64 / unified-core 48 / mobile 8（手写 230）/ hrm 2

---

> 自检：以上路径均存在于当前工作树；行号来自 `grep -n` / `sed -n` 实测；本片未触碰 svc/portal、svc/server、lib/shared-* 内部实现；未读取或输出 .env 任何密钥值（仅引用 `PLUGIN_REGISTRATION_TOKEN` 等机制名与 `.env.example` 公开键名）。
