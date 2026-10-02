# 服务发现与配置收敛决策（D5 架构优化实施）

> 状态：✅ 决策已出（2026-10-02）· 归属：TODO.md「🚧 架构优化实施（2026-10-02）」阶段 0 · 关联：[D1 unified-core 目标形态决策](./decision-d1-unified-core-architecture.md)、[D2 调用环消除策略决策](./decision-d2-call-cycle-elimination.md)、[模块化单体设计](./modular-monolith-design.md)
> 依据：架构分析报告 `TOPEMS-架构分析报告-2026-10-02.md`（F-39 服务发现 5 套并存）+ `docs/audit/arch-analysis/XCUT.md`（XCUT-07）+ 既有审计报告（M7 zookeeper future-incompat）。本文档所有路径与行号为 2026-10-02 实测。

## 1. 背景与决策问题

服务发现/配置存在**机制并存、职责边界不清**的问题：`deploy/docker/` 下同时存在 **5 套注册中心 compose**（consul / etcd / eureka / nacos / zookeeper-compose.yml，XCUT-07），`svc/unified-core/src/shared/mod.rs:4-13` 同时导出 **8 种服务发现实现**（config_store_simple / consul / dns / etcd / eureka / k8s / nacos / zookeeper）；另叠加 env 环境变量与静态端口登记（services.yaml/ports.env）两套静态体系。**每套机制的职责边界、生效与否、维护归属均不明确**，新成员无法判断生产实际依赖哪套。

另有三个叠加问题：
1. **zookeeper v0.8.0 future-incompat 警告**（既有审计 M7，`docs/audit/TOPEMS项目全面审计报告_2026-09-30.md:45`，Cargo.lock 在册）——未来 Rust 版本将拒绝编译。
2. **config-center 服务已废弃整合**（`docs/architecture/code-wiki.md:1290` "svc/config-center 功能整合"，`svc/config-center` 目录已不存在）——配置管理归属需重新明确。
3. **部署模式需求未定义**：`config/deployment.yaml` mode: on-premise 单租户；`svc/server` 的 private/saas 双模式为空 feature（D1/ENTRY-03 已核实）——SaaS 化的发现/配置需求当前不成立。

**决策问题**：服务发现与配置管理收敛到哪种形态——上单一动态注册中心 / 静态配置为主 + 明确边界 / 维持现状文档化？该决策决定 TODO.md 阶段 2 U9（服务发现收敛）的拆解方式。

## 2. 现状盘点（2026-10-02 实测）

### 2.1 5 套注册中心机制状态清单

| 机制 | 代码/依赖位置（实测） | 部署资产 | 生效状态（实测） |
|---|---|---|---|
| **ZooKeeper** | `lib/shared-event/Cargo.toml:50`（`zookeeper = "0.8"`，M7 future-incompat 来源）；`lib/shared-event/src/zookeeper/mod.rs`（事件协调）；`svc/unified-core/src/shared/zookeeper_service_discovery.rs` | `deploy/docker/zookeeper-compose.yml` | **发现未接线**：unified-core main.rs/embedded.rs 零调用（grep 无命中）；事件协调无生产启用证据（主事件机制已迁 Redis Stream） |
| **Eureka** | `svc/unified-core/src/shared/eureka_service_discovery.rs`；`svc/unified-core/tests/eureka_watch_integration.rs` | `deploy/docker/eureka-compose.yml` | **未接线**：仅实现 + 集成测试，入口零调用 |
| **etcd** | `lib/shared-event/src/etcd/mod.rs`；`svc/unified-core/src/shared/etcd_service_discovery.rs` | `deploy/docker/etcd-compose.yml` | **opt-in 配置管理**（XCUT-07/XCUT.md:96 实测：仅 `svc/ai/src/dsh/config_center/` 与 `svc/portal/src/state.rs` 使用，`ETCD_ENABLED` 默认 false）；发现未接线 |
| **Nacos** | `svc/unified-core/src/shared/nacos_service_discovery.rs`；`tests/nacos_watch_integration.rs` | `deploy/docker/nacos-compose.yml` | **未接线**：仅实现 + 集成测试，入口零调用 |
| **Consul** | `lib/shared-service-client/src/service_client/trait_api.rs:138,361-363`（`try_consul_discovery`，`CONSUL_URL` 设置即启用）；`lib/shared-event/src/config_center.rs` | `deploy/docker/consul-compose.yml` | **代码级可选发现，默认关闭**：`.env.example:224` `CONSUL_ENABLED=false`、`:225` `CONSUL_URL=http://localhost:8500` |

**汇总**：5 套中 **0 套是生产实际依赖**——3 套完全未接线（zookeeper/eureka/nacos）、1 套 opt-in 默认关（etcd，仅配置管理）、1 套默认关的可选发现（Consul）。`svc/unified-core/src/shared/mod.rs:4-13` 的 8 种发现实现全部"定义但未接线"。

### 2.2 实际寻址路径（唯一生效的体系）

| 层 | 机制（实测） | 证据 |
|---|---|---|
| 客户端寻址 | **env SERVICE_URL → ServiceClient::new(base_url)**：`lib/shared-service-client/src/service_client/base_client.rs:33-34` 构造仅接收 base_url 参数，不查注册中心；`svc/unified-core/src/shared/service_client.rs:133` 同构；base_url 由调用方从环境变量/静态配置构造 | `base_client.rs:33`、`service_client.rs:133` |
| 服务端路由 | **nginx 静态 upstream**：`deploy/nginx/topems.conf` 按前缀静态映射（`~^/api/erp/ → erp_service` 等，:122-128）；upstream 为静态端口 | `topems.conf:122-128` |
| 权威源 | **`config/services.yaml`**（服务/端口/bootstrap 模式登记，自陈"权威源 + 任何端口变更必须同步 services.conf/ports.env/docker-compose/vite.config.ts/.env"，:16-17）→ 派生 `config/ports.env`（41 个端口，头注"generated from config/services.yaml"）→ `scripts/topems.sh` 解析清单启动（`get_service_port`，:82-83） | `config/services.yaml:16-17`、`config/ports.env:1-8`、`scripts/topems.sh:82-83` |
| 动态发现（唯一活路径） | Consul：`trait_api.rs:138` 在 `CONSUL_URL` 存在时先试 Consul，失败回退 env——**默认关闭（CONSUL_ENABLED=false），属预留能力** | `.env.example:224-225` |

**结论**：生产服务发现 = **客户端 env 静态寻址 + nginx 静态转发**的双静态体系，`services.yaml` 是唯一权威源；**nginx 即事实上的服务发现层**。5 套注册中心 compose 与 8 种发现实现均为"预留/残留"。

### 2.3 配置管理现状

| 配置载体 | 职责（实测） | 证据 |
|---|---|---|
| `config/services.yaml` | 服务/端口/模式权威源 | 见 2.2 |
| `config/ports.env` | services.yaml 派生端口登记（41 项） | `ports.env:1-8` |
| `config/deployment.yaml` | 部署模式（on-premise）+ 功能开关 + 默认租户 | `deployment.yaml:5-20` |
| `config/env/.env`、`.env.production`、`.env.example` | 应用环境变量（含 CONSUL_ENABLED 等） | `.env.example:224-225` |
| `config/standalone.env` | 独立运行模式 env | — |
| `config/database.toml` | DB 连接配置 | — |
| `config/keys/` | 密钥目录（当前为空，密钥走 env，D1 已核） | — |
| **etcd（opt-in）** | 配置管理（ai DSH + portal，ETCD_ENABLED 默认 false） | XCUT.md:96 |
| **config-center 服务** | **已废弃整合**：`svc/config-center` 目录不存在；`code-wiki.md:1290` 记载"功能整合"进 unified-core | `code-wiki.md:1290` |

**结论**：配置管理归属已从独立 config-center 收敛到 unified-core（config_store_simple + etcd opt-in）；当前生产配置 = `config/` 目录 YAML/env 文件体系，etcd 仅 ai/portal 可选使用。

### 2.4 与 D1 联动

- 模块化单体（svc/server :8099 聚合）+ 独立服务并存下，服务发现真实需求：单体内进程内 trait 调用（仅 1 条真实边，ENTRY-04）+ 环回 HTTP；独立部署 nginx 静态路由。**当前 30 服务规模、on-premise 单租户（deployment.yaml:11）、private/saas 空 feature（D1）下，动态注册中心的真实需求不存在**。
- D1 瘦身不影响发现体系（unified-core 仍是 :8000 独立服务，nginx 转发规则不变）。

## 3. 关键前置事实核对结论（写入决策依据）

| 核对项 | 结论（实测） |
|---|---|
| 5 套机制哪些"活"哪些"残留" | **全部非生产依赖**：3 套未接线（zookeeper/eureka/nacos）、1 套 opt-in 默认关（etcd 配置管理）、1 套默认关预留（Consul）；生产实际 = env + nginx + services.yaml 静态体系 |
| 服务间实际寻址 | 客户端 env base_url（ServiceClient::new，不查注册中心）+ nginx 静态 upstream；**nginx 即事实发现层** |
| 配置管理归属 | config-center 已整合进 unified-core；生产配置 = config/ 目录 YAML/env 体系；etcd 仅 ai/portal opt-in |
| 部署模式需求 | on-premise 单租户（deployment.yaml:11）；private/saas 空 feature——SaaS 动态发现/配置需求当前不成立 |
| zookeeper future-incompat | 在册（`lib/shared-event/Cargo.toml:50` zookeeper 0.8，审计 M7），依赖可移除性取决于事件协调是否有生产使用（实测无） |
| 与 D1 联动 | 正交；瘦身不改变发现拓扑 |

## 4. 决策选项分析

### 选项 A 收敛到单一动态注册中心（Consul 或 etcd）

- **定义**：启用 Consul（代码已支持，`trait_api.rs:138`）或 etcd 作为统一注册/发现；各服务注册接线、nginx 改动态 upstream 或客户端直查；移除 zookeeper/eureka/nacos 残留；配置中心统一到 etcd。
- **工作量**：中-高（每服务注册代码接线 + 部署拓扑改造 + 动态路由验证 + 迁移）。
- **风险**：中（引入新运行时依赖；当前静态体系工作正常；30 服务规模静态管理无压力；动态体系故障面更大）。
- **收益**：为动态扩缩容/SaaS 多租户铺路——但该需求当前不成立（§2.4，on-premise + 空 feature）。
- **适用条件**：服务数量显著增长、需要自动扩缩容或多租户动态配置时——当前无触发证据。

### 选项 B 静态配置为主 + 明确边界（推荐）

- **定义**：确立**唯一事实源**——`config/services.yaml`（服务/端口/模式）+ nginx（服务端路由）+ env SERVICE_URL（客户端寻址）；**移除未接线的 zookeeper/eureka/nacos**（代码 + compose + zookeeper 依赖，消除 M7 警告）；etcd 明确为"opt-in 配置管理（ai/portal）"；Consul 保留为"预留扩展点"（代码不动、默认关、文档标注）。
- **工作量**：低-中（删 3 套残留 + 移除 zookeeper 依赖 + 文档化事实源与同步校验）。
- **风险**：低（全部基于"已核实的未接线/默认关"证据；移除无功能影响）。
- **收益**：消除 5 套并存噪音与 M7 编译风险；维护成本下降；新成员可明确"静态体系即事实发现层"；将来需动态发现时启用 Consul 即可（代码已在，无需从零建设）。

### 选项 C 维持现状 + 文档化职责边界

- **定义**：保留 5 套 compose + 8 种实现，仅写文档说明职责。
- **工作量**：低。
- **风险**：中（zookeeper future-incompat 警告持续；维护噪音持续；文档与"零接线"代码仍是漂移源）。
- **适用条件**：无——不解决 M7，也不降低维护成本。

## 5. 推荐与理由

**推荐：选项 B（静态配置为主 + 明确边界）**。

理由：
1. **实测证据支撑**：8 种发现实现全部未接线（`shared/mod.rs:4-13` 导出、入口零调用）、Consul 默认关（`.env.example:224`）、etcd opt-in 默认关（XCUT）——**"静态体系即事实发现层"是代码实证**，B 只是让文档与代码一致，并清除无用残留。
2. **消除 M7 编译风险**：zookeeper 0.8 future-incompat（审计 M7）随依赖移除一并消失；zookeeper 事件协调无生产使用证据（主事件机制已迁 Redis Stream）。
3. **与模块化单体演进一致**：单体进程内调用 + 独立部署 nginx 静态，30 服务规模静态管理完全可行；动态注册中心需求（扩缩容/SaaS）当前不成立（on-premise + 空 feature），不应为此引入新运行时依赖。
4. **保留低成本扩展路径**：Consul 代码已内置于 service-client（`trait_api.rs:138`，设 CONSUL_URL 即自动启用），B 保留其为"预留扩展点"，将来需要时零改造启用——不必像 A 那样现在迁移。
5. **配置管理归属明确**：config-center 已整合（code-wiki.md:1290），B 固化"config/ 目录 YAML/env 为事实源 + etcd 仅 ai/portal opt-in"边界，消除归属争议。

**否决 A 的理由**：无触发需求（§2.4）+ 引入新运行时依赖 + 当前静态体系零故障证据；A 是"为不存在的需求预付成本"。**否决 C 的理由**：不解决 M7、维护噪音持续、文档漂移源保留。

## 6. 实施路径与验收标准（对应 TODO.md 阶段 2 U9）

### U9 服务发现与配置收敛（依赖 D5）

| 步骤 | 内容 | 入口 |
|---|---|---|
| U9.1 | **移除 ZooKeeper**：`lib/shared-event/Cargo.toml:50` 删除 zookeeper 依赖；删除 `lib/shared-event/src/zookeeper/`、`svc/unified-core/src/shared/zookeeper_service_discovery.rs` 及 `deploy/docker/zookeeper-compose.yml`（保留 git 历史） | `lib/shared-event/Cargo.toml:50`、`deploy/docker/zookeeper-compose.yml` |
| U9.2 | **移除 Eureka/Nacos**：删除 `eureka_service_discovery.rs`、`nacos_service_discovery.rs`、`tests/eureka_watch_integration.rs`、`tests/nacos_watch_integration.rs` 与两个 compose | `svc/unified-core/src/shared/mod.rs:6,9`、`deploy/docker/{eureka,nacos}-compose.yml` |
| U9.3 | **etcd 边界固化**：保留 ai/portal opt-in 用法，文档标注"仅配置管理（ETCD_ENABLED）"，不承担服务发现 | `svc/ai/src/dsh/config_center/`、`svc/portal/src/state.rs` |
| U9.4 | **Consul 预留标注**：`.env.example:224-225` 注释"预留扩展点（设 CONSUL_URL 启用）"；`trait_api.rs:138` 文档化 | `.env.example:224-225`、`trait_api.rs:138` |
| U9.5 | **事实源收敛文档**：明确 `config/services.yaml` 为唯一服务/端口权威源（services.yaml:16-17 既有声明落地为规范）；`ports.env`/`topems.sh`/nginx upstream 均标注为派生物；补一个一致性校验脚本（services.yaml ↔ ports.env ↔ nginx upstream） | `config/services.yaml:16-17`、`config/ports.env:1-3`、`deploy/nginx/topems.conf` |

**验收标准（可测量）**：

1. **注册中心残留归零**：`grep -rn "zookeeper\|eureka\|nacos" lib/ svc/ --include="*.rs" --include="*.toml"` = 0（除文档）；`deploy/docker/` 下对应 compose 移除（仅保留 consul/etcd）。
2. **M7 关闭**：`cargo build` 无 zookeeper future-incompat 警告（Cargo.lock 无 zookeeper 条目）；`cargo check --workspace` 0 错误。
3. **运行期寻址单一事实源**：`ServiceClient::new` 的 base_url 构造点全部来自 env SERVICE_URL/静态配置（grep 无注册中心查询路径）；nginx upstream 端口与 services.yaml 一致（同步校验脚本通过）。
4. **配置边界可查**：etcd 引用仅限 ai/portal（grep 命中局限 `ETCD_ENABLED` opt-in）；Consul 仅预留（CONSUL_ENABLED 仍 false 默认）。
5. **回归**：`scripts/topems.sh` 启动全服务、nginx 转发、跨服务调用（erp↔hrm、portal 扇出等既有链路）e2e 全绿；`cargo build --workspace` + 部署拓扑（docker-compose 44 容器清单更新）无缺漏。
6. **文档对齐**：`code-wiki.md`/`overview.md` 服务发现与配置章节更新（5 套→2 套 + 静态事实源），无失实陈述。

## 7. 风险与回退

| 风险 | 缓解 |
|---|---|
| 移除 zookeeper 后发现事件协调有隐藏使用 | U9.1 前 grep 全仓引用（lib/svc/tests）确认零引用；shared-event 主机制为 Redis Stream（messaging.rs deprecated 声明），zk 协调无生产证据 |
| 移除 eureka/nacos 后集成测试引用断裂 | 对应 tests 同步删除（U9.2 同批）；无生产使用证据 |
| 静态端口漂移（services.yaml 与 nginx 不一致） | U9.5 补一致性校验脚本（CI 门禁），消除人工同步错误 |
| Consul"预留"被误认为已启用 | `.env.example` 注释 + 文档明确默认关状态 |

**回退路径**：U9.1/U9.2 均为删除（git 历史可恢复）；U9.5 校验脚本可独立停用；全程无数据迁移、无运行时行为变化（移除对象本就未接线/默认关）。
