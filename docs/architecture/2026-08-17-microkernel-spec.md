# TOPEMS 微内核化架构规范 v1.0

> 文档元信息
> - 版本：`1.0`
> - 日期：`2026-08-17`
> - 状态：`📋 Draft`（待评审签字后转为 `✅ Approved`）
> - 分类：架构规范 / 后端演进 / 部署模式
> - 范围：后端运行时、模块组织、消息总线、租户规则沙箱、CI/CD 双产物
> - 相关现有资产：[shared-bootstrap](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs) · [services.yaml](file:///Users/air/TOPEMS/config/services.yaml) · [plugin.yaml](file:///Users/air/TOPEMS/svc/ai/plugin.yaml) · [frontend vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts)

---

## 目录

- [1. 背景与目标](#1-背景与目标)
- [2. 架构总览](#2-架构总览)
- [3. 核心设计决策](#3-核心设计决策)
- [4. 分阶段实施计划](#4-分阶段实施计划)
- [5. 验收标准 Definition of Done](#5-验收标准-definition-of-done)
- [6. 文件改动清单](#6-文件改动清单)
- [7. 关键 Rust Trait 骨架](#7-关键-rust-trait-骨架)
- [8. 风险清单与缓解策略](#8-风险清单与缓解策略)
- [9. 回退策略](#9-回退策略)
- [10. Feature Flag 参考](#10-feature-flag-参考)
- [11. 下一步推进建议](#11-下一步推进建议)
- [附录 A：GA 8 项硬门槛总表](#附录-aga-8-项硬门槛总表)

---

## 1. 背景与目标

### 1.1 现状痛点

TOPEMS 当前采用 28 个独立 Axum 服务进程的微服务架构，通过 [shared-bootstrap](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs) 三段式模板（`ServiceConfig → bootstrap_service → build_application`）统一启动，前端通过 [Module Federation](file:///Users/air/TOPEMS/apps/web/vite.config.ts) 微前端集成。实际运行暴露了四个典型痛点：

| 痛点 | 量化现状 | 对业务的影响 |
|---|---|---|
| 资源浪费 | 28 tokio runtime + 28 PgPool → RSS ≈ 3 GB，PG 连接 ≈ 560 | 私有化客户 4C8G 机器跑不满业务，云成本高 |
| 跨服务调用延迟高 | CRM → IAM 用户查询 P99 ≈ 500 µs + HTTP/TLS 握手 | 复杂业务链路（ERP → MES → QMS → HRM）累积延迟肉眼可见 |
| 租户级定制故障域大 | 租户自定义规则跑在 Native 低代码引擎里 → 单租户死循环/OOM = 全局崩 | SaaS 多租户 SLA 风险；私有化客户改规则需动核心二进制 |
| 运维门槛高 | 30 端口 + 28 独立镜像 + 多服务监控排障 | 中小企业私有化部署上手难；K8s 是强依赖 |

### 1.2 目标（量化 & 可验证）

| 目标 | 硬指标 | 对应痛点 |
|---|---|---|
| 兼顾私有化交付 | `docker compose up` 单命令，4C8G 机器 5 分钟内全量可用 | 运维门槛高 + 资源浪费 |
| 兼顾 SaaS 多租户 | 租户级规则崩溃域 = 单 WASM 沙箱，不扩散 | 租户级定制故障域大 |
| 性能提升 | 跨模块 in-proc 调用 P99 < 50 µs；RSS 节省 ≥ 75% | 资源浪费 + 延迟高 |
| 可渐进可回退 | 任何阶段可在 60 s 内切回现状 28 进程模式 | 降低改造风险，不锁死路线 |

---

## 2. 架构总览

> 核心原则：**微内核（代码组织规范 · Day 1 骨架） + 三层 Runtime（Native / Remote / WASM-Tenant 各司其职） + 双 MQ 插槽（MessageBus trait 解耦，NATS Feature Flag 延后启用） + 渐进双产物（CI 同时出 28 进程镜像 + 1×all-in-one，可回退可切换）**

### 2.1 运行时分层语义（Canonical，不可随意变更）

每个模块通过 `plugin.yaml.runtime` 字段声明自己的运行模式，由内核 `RuntimeRouter` 透明路由到对应的适配器。

```
plugin.yaml
├── runtime: native       → L1 Native 内嵌（in-proc）
├── runtime: remote       → L2 Remote 独立服务/sidecar
└── runtime: wasm-tenant  → L3 WASM 租户规则（每租户独立沙箱）
```

| 层级 | 语义 | 典型模块 | 选择依据 |
|---|---|---|---|
| **L1 · Native 内嵌** | 编译期链接，直接函数调用；与内核同进程 | IAM / HRM / CRM / PM / ERP / Portal / 工作流 / 低代码引擎 / 插件注册 等 | CRUD 为主、算力轻、稳定成熟 → **性能最优** |
| **L2 · Remote（可选拆）** | 独立 OS 进程/sidecar，通过 TypedServiceClient 或 gRPC 本地回环访问 | MES（高算力 SPC）/ BI（OLAP）/ AI（GPU）/ GIS / 大文件处理 / 报表引擎 | CPU/内存密集或故障面大 → **故障域独立 + 可单独 HPA** |
| **L3 · WASM Tenant 沙箱** | 每租户一个独立 WASM 线性内存实例，通过 HostFn 白名单访问内核能力 | **租户 A 审批流规则 / 租户 B 定价公式 / 租户 C 单据校验 / 租户 D 预警策略 / 租户 E 数据脱敏** | 每个租户代码质量不可控 + 需热更新 + 需交付独立文件 → **100% 故障隔离 + 零重启热加载 + 私有化干净交付** |

### 2.2 消息总线设计（MessageBus Trait 解耦）

业务代码**永远只依赖 `MessageBus` trait + `QoS` 枚举**，不直接依赖具体 MQ 实现。两种 MQ 通过 Feature Flag 组合使用。

```
业务 → MessageBus::publish(QoS, topic, payload)
        │
        ├── QoS::Persistent ──▶ 默认 RabbitMQ（事务/持久化/延迟/死信队列）
        │
        └── QoS::Realtime   ──▶ RabbitMQ（MQ_NATS_ENABLED=false）
                               └──▶ NATS JetStream（MQ_NATS_ENABLED=true · 按需分流）
```

- **P1-P3 只启用 RabbitMQ**：100% 复用现有 [shared-event](file:///Users/air/TOPEMS/lib) 资产，SRE 无需学习新技术
- **P4 当租户级广播 P95 > 5 ms 或 QPS > 10k 时**：`MQ_NATS_ENABLED=true` 自动分流 Realtime 类消息到 NATS
- 永远保持：事务消息 RMQ、实时广播 NATS，两线不混

### 2.3 渐进双产物（零破坏回退的基础）

CI 每次提交同时构建**两套部署产物**，两者共享 PostgreSQL schema 和 RabbitMQ vhost，切换时零数据层改动。

| 产物模式 | `DEPLOY_MODE` | 组成 | 典型适用场景 |
|---|---|---|---|
| A · 现状多进程 | `multi` | 28 个独立镜像 + 原 main.rs 不变 | 现有 SaaS 大租户 / 灰度对比基准 / 紧急回退 |
| B · 内核全量（Hybrid 部署） | `mono` / `hybrid` | 1 个 `svc/all-in-one` 二进制 + 可选 remote sidecar（MES/BI/AI/GIS） | 私有化客户 / 中小租户 / 开发者本地 |

切换操作（SRE 必须 3 次演练全部通过）：
```
# mono → multi（回到现状）
1. export DEPLOY_MODE=multi
2. 停 all-in-one 容器
3. 起 28 服务容器；Nginx/Vite proxy target 改回多端口列表

# multi → mono（正向）
反向操作，数据库与 MQ 完全不改动
```

### 2.4 前端：完全零改动

前端 [Module Federation 配置](file:///Users/air/TOPEMS/apps/web/vite.config.ts)、[路由模块定义](file:///Users/air/TOPEMS/apps/web/src/routes/v2/types.ts)、业务代码全不修改。所有 API 路由前缀和响应契约与现状 100% 一致。

---

## 3. 核心设计决策

### 决策 1：微内核作为「代码组织规范」（Day 1 骨架），但**保留渐进回退能力**

- **原因**：如果微内核只是事后重构目标，很容易陷入「中间态多年」；但如果直接强制 28 个 main.rs 删除，回退代价不可接受
- **落地**：P0 即定义 `Module` trait 作为 Canonical 骨架（所有新模块必须实现）；**28 个现有 main.rs 完全保留**，CI 双产物并行产出
- **收益**：架构正确性 + 风险最小的交集

### 决策 2：WASM **首先承载租户自定义规则**，而非核心业务模块

- **原因**：TOPEMS 最大风险点是「租户个性化逻辑」——多租户场景下每个租户可能自己写审批流/定价公式/校验脚本，这部分代码质量不可控且频繁改动
- **对比常见做法**：很多项目把 WASM 用来跑核心业务模块（HostFn 往返多 + 性能损失大），本方案**不这样做**
- **收益**：WASM 规则单次执行 P99 < 100 µs（不含 HostFn）；故障被严格限制在单沙箱；私有化客户规则 = `.wasm` 附件，不修改核心二进制

### 决策 3：MessageBus trait 先抽象，NATS 用 Feature Flag 延后启用

- **原因**：NATS 在租户广播场景性能很强，但引入第二个 MQ = 运维 + 排障知识全部双份
- **落地**：P1-P3 只启用 RMQ（默认）；NATS 实现写好但 Feature off，真实压测出现 RMQ 瓶颈时才开
- **收益**：任何阶段都只有**一套** MQ 要维护；业务代码零改动切实现

### 决策 4：L2 Remote 名单按压测决定，不事先一刀切

- **原因**：MES/BI/AI/GIS 是否真的需要拆，要看实际 in-proc 时的 RSS 增长、panic 频率、GC 压力
- **落地**：P2 全 28 模块默认 `runtime=native` 接入，P3 压力测试后才定逃逸名单
- **收益**：避免过度设计导致不必要的 remote 序列化开销

---

## 4. 分阶段实施计划（12 周 · P0–P4）

共 5 个阶段 + 5 个评审里程碑（M0-M4）。每个阶段产出的 MVP 都可用、都能通过 DoD 回滚。人力规模：**架构 2 人 + 后端 3-4 人 + 前端 1 人 + SRE 1 人 + 测试 1 人**，共 6-8 人，与日常业务发版完全并行。

### 4.1 阶段总览

| 阶段 | 周数 | 核心交付 | 里程碑 |
|---|---|---|---|
| P0 · 微内核骨架定义 | W1 | Module/MessageBus/RuntimeRouter 三 Trait 定版；CI 双产物脚本就绪 | 🚪 **M0 骨架评审门**（W1 结束） |
| P1 · 首批 8 模块接入 | W2–W4 | IAM/HRM/CRM/PM/Portal/PluginReg/Workflow/低代码 in-proc；单 RMQ；CatchUnwind 墙 | 🚪 **M1 内核 Beta 评审门**（W4 结束） |
| P2 · WASM + 20 模块批量接入 | W5–W7 | WASM 租户规则试点（审批流）+ HostFn 白名单 5 条；剩余 20 模块按模板接入 | 🚪 **M2 沙箱 + 全模块评审门**（W7 结束） |
| P3 · 性能 + 逃逸策略 + 私有化 | W8–W10 | 压测定 remote 名单；OOM/panic 故障演练；docker compose 私有化交付包 v1.0 | 🚪 **M3 RC 候选评审门**（W10 结束） |
| P4 · NATS FF + SaaS 灰度 + GA | W11–W12 | MessageBus::NATS impl 就位；SaaS 10%→30%→50%→100% 四步灰度；GA 签字 | 🚪 **M4 GA 发布门**（W12 结束） |

### 4.2 各阶段详细交付物

#### P0 · W1 骨架周

1. 新建 `lib/shared-kernel` crate，发布 `Module` / `MessageBus` / `RuntimeRouter` 三 trait（定义见 §7）
2. 新建 `lib/shared-messagebus-rabbitmq`（复用现有 RMQ 资产）+ `lib/shared-messagebus-nats` crate 骨架（Feature off）
3. 新建 `svc/all-in-one` crate，空壳 `cargo build --release` 链接时间 ≤ 60 s
4. CI 添加 `build-all-in-one` job，两产物（28 镜像 + 1 all-in-one）构建矩阵
5. Dockerfile 三模板：`Dockerfile.all-in-one` / `compose.mono.yml` / `compose.hybrid.yml`

#### P1 · W2-W4 首批 L1 模块

1. 首批 8 模块（IAM/HRM/CRM/PM/Portal/PluginReg/Workflow/低代码）实现 `Module trait`
2. `RuntimeRouter` Native 适配器跑通：跨模块 CRM→IAM 直接函数调用（日志确认，不走 HTTP）
3. MessageBus::RabbitMQ impl 集成，行为与现状 TypedClient 100% 对齐
4. 冲突治理三项：Prometheus 指标前缀化（加 `module_code` label）+ 中心化 Scheduler 去重复执行 + CatchUnwindWall 隔离
5. 前端 8 模块 E2E 100% 通过（单端口代理 vs 多端口代理响应 diff = 0）
6. 双模式回退演练：SRE 3 次 `DEPLOY_MODE` 切换全部成功

#### P2 · W5-W7 WASM + 全接入

1. 新建 `lib/shared-wasm-tenant`（wasmtime/extism），HostFn 白名单定 5 条：`db_query / event_emit / current_user / cache_get_put / tenant_config_get`
2. 真实租户审批流 Demo：3 个真实客户样例规则（金额阈值、多级审批、告警）全流程跑通
3. 沙箱资源配额：`wasm_cpu_ms_per_call=50` + `wasm_mem_mb=16`，超限自动终止并告警
4. 3 租户同时跑 WASM 沙箱：互不共享内存、不可访问彼此 PG 数据行（强制 RLS 验证）
5. 剩余 20 模块按接入模板批量实现 `Module trait`（MES/BI/AI/GIS 暂填 `runtime=native`，P3 后定）

#### P3 · W8-W10 调优 + 私有化

1. 全量压测：MES/BI/AI/GIS in-proc 场景 vs remote 场景对比，输出 Final 逃逸名单决策文档
2. 三级故障演练：in-proc panic / remote OOM / WASM 超限 → 验证故障扩散范围与文档一致
3. 168h soak（7 天浸泡）：200 RPS 混合流量，OOM 次数=0、panic 恢复率=100%
4. 私有化交付包 `TOPEMS-Appliance-v1.0.zip`：`docker compose up` 4C8G 5 分钟首启
5. Helm Chart SaaS 版：`global.deployMode=mono|hybrid` 参数化

#### P4 · W11-W12 NATS + 灰度 + GA

1. MessageBus::NATS impl Feature on 验证：JetStream 持久化 + 广播 10k QPS P95 < 250 µs
2. SaaS 小租户灰度：10%（6h）→ 30%（6h）→ 50%（24h）→ 100%（48h），每步通过阈值才继续
3. 双向切换：RMQ ↔ NATS 3 次回滚，消息零丢失（幂等 key 验证）
4. On-call 交接 + Runbook v2.0 签字 + GA 发布 Checklist 50+ 项全勾
5. 对外发布 GA 版本

### 4.3 角色分工（主导 = 主责，参与 = 协作，评审 = 里程碑把关）

| 阶段 | 架构组 2 人 | 后端组 3-4 人 | 前端组 1 人 | SRE 1 人 | 测试 1 人 |
|---|---|---|---|---|---|
| **P0 · W1** | 主导（trait/骨架定义） | 参与（bootstrap 对齐） | 参与（双模式 proxy 验证） | 参与（CI 双产物脚本） | 评审 M0 |
| **P1 · W2-W4** | 主导（Router + 治理） | 主导（8 模块接入模板） | 参与（单端口 E2E 验证） | 参与（部署模板切换） | 主导（回归 + 基线） |
| **P2 · W5-W7** | 主导（WASM + HostFn） | 主导（20 模块批量接入） | 评审（租户 UI 联动） | 参与（沙箱资源限制） | 主导（全量回归 M2） |
| **P3 · W8-W10** | 参与（逃逸名单策略） | 参与（MES/BI 拆 remote） | 评审（私有化流程） | 主导（compose 包 + 监控） | 主导（压测 + 故障演练） |
| **P4 · W11-W12** | 参与（NATS impl） | 评审（灰度业务观察） | 评审（灰度租户 E2E） | 主导（灰度部署/回退） | 主导（GA D-1 回归 M4） |

---

## 5. 验收标准 Definition of Done

每个阶段必须通过**四维 DoD**（功能 ✅ / 性能 ⚡ / 稳定性 🛡️ / 运维 ⚙️）才能进入下一阶段；每个里程碑有**硬评审门签字**，不通过则停在本阶段整改。

### 5.1 M0 · W1 结束：骨架评审门

| 维度 | 验收项（必须全部达标） |
|---|---|
| ✅ 功能 | Module/MessageBus/RuntimeRouter 三 trait 评审通过；`svc/all-in-one` 空壳构建成功；28 原服务 build 100% 不变绿 |
| ⚡ 性能 | `cargo build --release` 空壳链接 ≤ 60 s；空壳启动 < 50 ms；热路径路由查找 P99 < 50 ns |
| 🛡️ 稳定性 | CI 双产物矩阵 3 次零失败（防 flaky）；Module 启动错误不 panic（Result 统一）；Trait 对象安全确认 |
| ⚙️ 运维 | 三 Docker 模板齐备；DEPLOY_MODE 切换文档；Prometheus 内核/服务双前缀不冲突 |
| 🧾 签字 | 架构 2 人 + 技术负责人签字确认「trait 设计不阻塞未来扩展」 |

### 5.2 M1 · W4 结束：内核 Beta 评审门

| 维度 | 验收项（必须全部达标） |
|---|---|
| ✅ 功能 | 8 模块 trait 实现零 `todo!()`；200+ 前端路由 100% 通过；MessageBus RMQ impl 与现状行为一致；700+ 测试 100% 过 |
| ⚡ 性能 | 登录 API P95 ≤ 现状 110%；跨模块调用 P99 < 50 µs；RSS ≤ 350 MB（对比 8 进程 800 MB 降 56%+）；PgPool ≤ 40；10k RPS wrk P99 ≤ 5 ms |
| 🛡️ 稳定性 | CatchUnwindWall 演练（单模块 panic 不扩散）；指标零注册冲突；Scheduler 10 分钟无重复执行；48h soak RSS 增长 < 50 MB |
| ⚙️ 运维 | DEPLOY_MODE 双向切换 3 次 < 1 分钟零中断；Grafana 双看板就位；Trace ID 全程连续；5 项 Feature Flag 全热切换 |
| 🧾 签字 | 产品 + 测试（业务回归）+ 架构组（性能达标）+ SRE（回退可行）四方签字 |

### 5.3 M2 · W7 结束：沙箱 + 全模块评审门

| 维度 | 验收项（必须全部达标） |
|---|---|
| ✅ 功能 | 28 模块 100% 接入；3 租户审批流规则 Demo 全流程；5 条 HostFn 齐备；租户隔离验证；前端 MF 路由 100% 通过 |
| ⚡ 性能 | 全量 RSS ≤ 750 MB（降 75%）；PgPool ≤ 100（降 82%）；WASM 规则 P99 < 100 µs；审批流全场景 P95 < 20 ms；100 RPS 1h soak P99 < 50 ms |
| 🛡️ 稳定性 | WASM 故障注入 9/9 通过（unreachable/无限循环/OOM 各 3 次 → 只影响单租户）；28 模块 panic 恢复率 100%；72h soak 无 P0/P1 |
| ⚙️ 运维 | .wasm 热加载流程文档 + 演练通过；WASM 沙箱独立指标；私有化 compose 单命令 ≤ 5 min 首启；3 类告警接入 PagerDuty |
| 🧾 签字 | 架构 + 安全 + 产品（沙箱安全签字）；测试 + 业务（E2E 全绿）；1-2 客户 Pilot Review |

### 5.4 M3 · W10 结束：RC 候选评审门

| 维度 | 验收项（必须全部达标） |
|---|---|
| ✅ 功能 | Remote 适配器就绪；Final in-proc / remote 名单发布 + 决策依据文档；私有化文档 v1.0 + FAQ + Runbook；模块级 FF 关闭 |
| ⚡ 性能 | MES in-proc RSS 增长 ≤ 250 MB；拆 remote 后 P95 ≤ in-proc 的 110%；BI 100 并发 P95 达标；4C8G idle RSS ≤ 1.2 GB；PG active ≤ 120，CPU ≤ 40% |
| 🛡️ 稳定性 | 三级故障演练 100% 通过；168h soak（7 天）无 OOM 无死锁 panic recover 100%；PG/RMQ 主从切换自愈 ≤ 1 min；版本滚动 WASM 规则兼容不重编 |
| ⚙️ 运维 | TOPEMS-Appliance-v1.0.zip 交付包；Helm Chart 参数化；Runbook 10 故障场景全演练；SRE 培训笔试 ≥ 80 分 |
| 🧾 签字 | 架构 + SRE（逃逸策略 + Runbook 签字）；客户 PM（私有化 UAT 通过）；测试（7 天浸泡 0 P0/P1） |

### 5.5 M4 · W12 结束：GA 发布门

| 维度 | 验收项（必须全部达标） |
|---|---|
| ✅ 功能 | NATS impl 分流策略稳定（QoS 级别 + topic 规则）；灰度 4 步跑完；RMQ↔NATS 回滚 3 次消息零丢 |
| ⚡ 性能 | NATS 广播 10k QPS P95 < 250 µs（对比 RMQ ≥ 8× 快）；JetStream 写入 P95 < 1 ms；灰度期间全局 P95 波动 ≤ 5% |
| 🛡️ 稳定性 | NATS 3 节点集群 1 节点 Kill 无感知；双模式回退 3 轮 < 60 s；72h soak 全栈无 P0/P1 |
| ⚙️ 运维 | 双 MQ 看板齐备；Runbook v2.0；On-call 交接 3 场演练；GA Checklist 50+ 项全勾 |
| 🧾 签字 | CTO + SRE（现场 3 次回退演练签字）；产品负责人（SLA ≥ 99.95% 签字）；文档 4 份签版入册 |

### 5.6 GA 硬门槛 8 项（不可绕过）

| # | 指标 | 基线（28 进程现状） | GA 阈值 |
|---|---|---|---|
| 1 | 全量 RSS | ~3 GB | **≤ 750 MB（↓ 75%）** |
| 2 | PgPool 连接 | ~560 | **≤ 100（↓ 82%）** |
| 3 | 跨模块 in-proc 调用 P99 | ~500 µs | **≤ 50 µs（↓ 90%）** |
| 4 | 单模块故障扩散（CatchUnwind） | N/A（进程级隔离） | **0 扩散（WASM/Remote/Native 三层隔离）** |
| 5 | 私有化 4C8G 首启动 | N/A（多进程 20+ min） | **≤ 5 min**（docker compose 一键） |
| 6 | mono ↔ multi 模式切换耗时 | N/A | **≤ 60 s**，双向切换业务 0 中断 |
| 7 | 测试通过率（700+ 用例） | 100% | **100%，0 skip** |
| 8 | SaaS 灰度 SLA（对比 multi 模式） | ≥ 99.95% | **≥ 99.95%（不低于现状）** |

---

## 6. 文件改动清单

### 6.1 新建 Crate / 文件（P0–P2 逐项创建）

| 路径 | 职责 | 创建阶段 |
|---|---|---|
| `lib/shared-kernel/Cargo.toml` + `src/lib.rs` | 微内核骨架 crate：trait 集合 + RuntimeRouter + Scheduler 中心 + MetricsPrefix + CatchUnwindWall + KernelContext | **P0** |
| `lib/shared-kernel/src/module/mod.rs` | `pub trait Module { code / metadata / init / routes / start / stop }` | **P0** |
| `lib/shared-kernel/src/bus/mod.rs` | `pub enum QoS { Persistent, Realtime }` + `pub trait MessageBus { publish, subscribe }` | **P0** |
| `lib/shared-kernel/src/router/mod.rs` | `RuntimeRouter` + 三 Adapter：`NativeAdapter / RemoteAdapter / WasmTenantAdapter` | **P0** |
| `lib/shared-kernel/src/scheduler/mod.rs` | 中心化任务调度，模块注册 interval/cron，全局去重 | **P1** |
| `lib/shared-kernel/src/error.rs` + `lifecycle.rs` | 统一错误类型；模块生命周期状态机（Init→Started→Stopped） | **P0** |
| `lib/shared-messagebus-rabbitmq/Cargo.toml` + `src/lib.rs` | MessageBus RabbitMQ 实现（Feature：默认 on），复用 [shared-event](file:///Users/air/TOPEMS/lib) 现有 RMQ 资产 | **P1** |
| `lib/shared-messagebus-nats/Cargo.toml` + `src/lib.rs` | MessageBus NATS 实现（Feature：默认 off，P4 才用），含 JetStream | **P0 骨架 / P4 实现** |
| `lib/shared-wasm-tenant/Cargo.toml` + `src/lib.rs` | WASM 租户规则运行时（wasmtime/extism），HostFn 白名单 5 条 + 配额/隔离 | **P2** |
| `svc/all-in-one/Cargo.toml` + `src/main.rs` | 全量内核二进制入口：读 DEPLOY_MODE → 注册 28 模块 → 挂 WASM → 起 Axum | **P0** |
| `docker/Dockerfile.all-in-one` | all-in-one 生产镜像构建模板 | **P0** |
| `docker/compose.mono.yml` | 私有化单二进制一键部署（内核 + PG + RMQ） | **P0** |
| `docker/compose.hybrid.yml` | SaaS hybrid 部署（内核 + remote MES/BI/AI/GIS + PG + RMQ + NATS） | **P3** |
| `docs/architecture/2026-08-17-microkernel-spec.md` | **本规范文档** | 即本文件 |

### 6.2 修改现有 Crate / 文件

| 路径 | P0 修改 | P1 修改 | P2 修改 |
|---|---|---|---|
| [shared-bootstrap/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs) | 加 `IntoKernelModule` 适配 trait；保证原 bootstrap_service 逻辑不变 | 适配 `Module trait` 的 create_routes（不破坏 28 main.rs） | 批量模板接入 |
| 每个 [plugin.yaml](file:///Users/air/TOPEMS/svc/ai/plugin.yaml) schema | 加字段：`runtime`（native/remote/wasm-tenant）、可选 `sidecar_port`、`wasm_cpu_ms`、`wasm_mem_mb` | 首批 8 模块填 `native` | 28 模块全量填 runtime；MES/BI 填 native，等 P3 压测后改 |
| [services.yaml](file:///Users/air/TOPEMS/config/services.yaml) | 加字段 `kernel_runtime_override`（部署期覆盖 plugin.yaml 用） | 写首批 8 模块配置 | 写全量 28 模块配置 |
| 每个 `svc/*/Cargo.toml` | 加 `dep shared-kernel`，带 `optional kernel-module` feature | 首批 8 模块 feature on，导出 `struct XxxModule; impl Module` | 20 模块同上 |
| 每个 `svc/*/src/lib.rs` | 无破坏改动 | 首批 8 模块包装 Module trait impl | 20 模块同上 |
| 每个 `svc/*/src/main.rs` | **完全不动** | 不动 | 不动 |
| [apps/web/vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts) proxy | 不动 | 不动 | 不动 |
| CI 工作流（`.github/workflows/*` 或等价） | 加 `build-all-in-one` job | 加 E2E：双模式 API diff job | 加 WASM 沙箱测试 job |

---

## 7. 关键 Rust Trait 骨架（概念层，评审定版后进入 P0）

```rust
// ====== lib/shared-kernel/src/module/mod.rs ======

use async_trait::async_trait;
use axum::Router;
use serde::{Deserialize, Serialize};

use crate::context::KernelContext;
use crate::error::KernelResult;
use crate::state::KernelAppState;

/// 对齐 plugin.yaml 字段的元数据；在模块启动时加载
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleMetadata {
    pub code: &'static str,
    pub runtime: ModuleRuntime,
    pub category: String,
    pub tier: String,
    pub permissions: Vec<String>,
    /// remote 用：本地回环地址，默认 127.0.0.1:<sidecar_port>
    pub sidecar_port: Option<u16>,
    /// wasm-tenant 用：单调用 CPU 毫秒和内存 MB 限制
    pub wasm_cpu_ms_per_call: Option<u32>,
    pub wasm_mem_mb: Option<u32>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ModuleRuntime {
    Native,
    Remote,
    WasmTenant,
}

/// TOPEMS 微内核 Canonical 骨架；每个模块必须实现此 trait
#[async_trait]
pub trait Module: Send + Sync {
    /// 对齐 plugin.yaml.code；用于 RuntimeRouter 路由和 Metrics 前缀
    fn code(&self) -> &'static str;
    /// 来自 plugin.yaml 反序列化的完整元数据
    fn metadata(&self) -> &ModuleMetadata;

    /// 内核启动阶段：注入 DI（PgPool/AuthState/EventBus 等）
    async fn init(&mut self, ctx: &KernelContext) -> KernelResult<()>;
    /// 返回此模块的 Axum 路由（挂载前缀由 kernel 统一根据 code 拼接，如 /api/iam/v1）
    fn routes(&self, ctx: &KernelContext) -> Router<KernelAppState>;
    /// 路由就绪后：启动定时任务（通过 Scheduler）、后台 Worker 等
    async fn start(&self, ctx: &KernelContext) -> KernelResult<()>;
    /// 内核优雅关闭：停止 Worker、提交事务、断开 MQ 订阅
    async fn stop(&self, ctx: &KernelContext) -> KernelResult<()>;
}

// ====== lib/shared-kernel/src/bus/mod.rs ======

use bytes::Bytes;

use crate::error::KernelResult;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum QoS {
    /// 持久化、事务、可重放 → 默认走 RabbitMQ
    Persistent,
    /// 实时广播、轻量命令、租户事件 → 可分流到 NATS（Feature Flag on）
    Realtime,
}

#[async_trait]
pub trait MessageBus: Send + Sync {
    async fn publish(&self, qos: QoS, topic: &str, payload: Bytes) -> KernelResult<()>;
    async fn subscribe(
        &self,
        topic: &str,
        cb: Box<dyn Fn(Bytes) -> KernelResult<()> + Send + Sync>,
    ) -> KernelResult<()>;
}

// ====== lib/shared-kernel/src/router/mod.rs ======

use std::collections::HashMap;

use crate::error::KernelResult;
use crate::module::{Module, ModuleRuntime};

pub enum ModuleRef<'a> {
    Native(&'a std::sync::Arc<dyn Module>),
    Remote { module_code: &'a str, base_url: &'a str },
    WasmTenant { tenant_id: String, wasm_path: std::path::PathBuf },
}

/// 读取 plugin.yaml / services.yaml，按 runtime 路由到三种适配器
pub struct RuntimeRouter {
    modules: HashMap<String, ModuleRuntime>,
}

impl RuntimeRouter {
    pub fn resolve(&self, module_code: &str) -> KernelResult<ModuleRef<'_>> {
        // P1-P4 逐步实现：按 registry 查找 + 类型安全分派
        todo!("Spec 评审后 P0 实现")
    }
}
```

---

## 8. 风险清单与缓解策略

| ID | 风险描述 | 概率 | 影响 | 缓解策略 |
|---|---|---|---|---|
| R01 | 单二进制 28 crate `cargo build --release` 链接 > 20 min | 中 | 高（阻塞发布节奏） | P0 即监控阈值 ≤ 60 s；超标时：(1) `mold` / `lld` linker；(2) codegen-units 调优；(3) 仍超标 → MES/BI/AI 默认拆 remote 减少 heavy crate linkage |
| R02 | in-proc 某模块内存泄漏 → RSS 不可控 | 中 | 高 | P1 注入 CatchUnwindWall；P3 7 天 soak 严格 RSS 增长阈值（+50 MB/warn、+200 MB/强制 remote 迁移）；Final remote 名单按 RSS 增长曲线强制拆 |
| R03 | 28 crate macro / global static / Prometheus register 顺序冲突 | 中 | 中 | 强制规范：**所有 Prometheus register 必须走 `KernelContext::register_metric(module_code, builder)`**；tracing subscriber 只能在 main.rs 初始化一次；CatchUnwindWall 不跨 `.await` |
| R04 | HostFn 接口设计不完备 → 后期改签名导致 .wasm 全量重编 | 中 | 高 | P2 锁定最小 5 条 HostFn（db_query / event_emit / current_user / cache_get_put / tenant_config_get）；第 6 条必须过架构评审；ABI v1 永不修改签名、只能新增接口；HostFn 版本号内建于 wasm header |
| R05 | NATS + RMQ 双栈长期并存 → SRE 运维知识双份、排障复杂度翻倍 | 高 | 中 | P1-P3 默认只启用 RMQ；NATS Feature Flag 只在「真实 RMQ 延迟 > SLA」时才开；即使开启，只有 `QoS::Realtime` 走 NATS，事务消息永远 RMQ |
| R06 | 研发团队没掌握微内核「不能在 start 阻塞」的心智 → 写卡死整个 tokio runtime 的模块 | 高 | 中 | (1) 模块接入 template + 新人 30 min 培训；(2) `start()` 内禁止 `loop/sleep` 长同步；(3) tokio-console 接入 CI，task poll time 异常直接 fail；(4) Clippy lint：禁止 `async fn start` 中 > 50 ms 的同步代码 |
| R07 | 私有化客户 4C8G 大模块内存越界 | 中 | 中 | 私有化默认 `REMOTE_MODULES=` 空（全 in-proc）；启动脚本检测 `TOPEMS_APPLIANCE_MEM<8192` → 自动禁用 MES/BI，并提示客户升级；Runbook 明示硬件门槛 |
| R08 | WASM 沙箱逃逸（CPU 侧信道、memory bug 曝内核地址） | 低 | 极高（安全） | (1) wasmtime 始终按 CVE 升级 schedule 走（每两周 bump）；(2) HostFn 全部走字节切片 + 严格长度校验；(3) 每租户 WASM 实例独立 store，禁止共享；(4) P2 必须经过内部安全 team 评审 + 依赖 `cargo audit`/`cargo deny` 的 CI gate |

---

## 9. 回退策略（三级，每一级都可独立触发，业务 0 数据丢失）

### 9.1 部署级回退（最常用，≤ 60 s 完成）

任何阶段、任何时间，执行以下操作**立刻回到 28 进程现状**：

```
# mono → multi
1. export DEPLOY_MODE=multi
2. docker stop topems-all-in-one  # 停内核容器
3. docker compose -f compose.multi.yml up -d  # 起 28 服务
4. 更新 Nginx/Vite proxy config：proxy_pass 从 :8000 切回多端口列表
5. 健康检查：/healthz 28 服务全绿
```

反向操作（multi → mono）同样不改动 PG schema 和 RMQ vhost，零状态丢失。

### 9.2 模块级回退（单个模块拆 remote / 收回 native，≤ 30 s 完成）

```yaml
# config/services.yaml
# 单独把 MES 从 native 拆 remote：
services:
  mes:
    kernel_runtime_override: remote
    sidecar_port: 18030
```

- `kernel reload config`（热 reload，不改代码）即可：`mes` 从 in-proc 注销 → remote 适配器接管；或反向收回。
- P3 每模块做双向迁移耗时 + 业务中断测试，阈值 ≤ 30 s

### 9.3 Feature Flag 紧急关停（秒级生效，无需重启）

```bash
# P0 即定义 5 个紧急关停 Flag，全部在 CI 矩阵中验证通过

# 情况1：NATS 出问题 → 退回全 RMQ
MQ_NATS_ENABLED=false

# 情况2：WASM 租户沙箱出问题 → 退回内置低代码规则引擎
WASM_TENANT_ENABLED=false

# 情况3：内核整体不稳 → 强制所有模块走 remote（近似回到 28 进程）
FORCE_ALL_REMOTE=true

# 情况4：某模块在 in-proc 持续 panic → 单独关停
DISABLE_MODULE_MES=true
DISABLE_MODULE_BI=true

# 情况5：指标名冲突爆炸 → 关掉模块前缀用旧命名
MODULE_METRIC_PREFIX=false
```

所有 Flag 必须在 CI 里做「打开 → 业务回归 → 关闭 → 业务回归」的双向往返测试。

---

## 10. Feature Flag 参考

全部 Flag 汇总；默认值标「★」。

| Flag | 默认 | 说明 | 启用阶段 |
|---|---|---|---|
| `DEPLOY_MODE` | `multi` ★ → P1 后 `mono` 可选 | mono / multi / hybrid | P0 |
| `MQ_NATS_ENABLED` | `false` ★ | 是否启用 NATS 作为 Realtime QoS 实现；默认只有 RMQ | P4 按需 |
| `WASM_TENANT_ENABLED` | `false` ★ | 是否启用租户 WASM 沙箱；关闭后走内置低代码 | P2 试点 |
| `FORCE_ALL_REMOTE` | `false` ★ | 紧急：全部模块走 remote（近似现状） | P0 |
| `MODULE_METRIC_PREFIX` | `true` ★ | Prometheus 指标加 module_code label 前缀 | P1 |
| `CATCH_UNWIND_WALL` | `true` ★ | in-proc 模块启用 catch_unwind 隔离墙 | P1 |
| `DISABLE_MODULE_<CODE>` | N/A | 单个模块关停（如 DISABLE_MODULE_MES=true） | P2 |
| `TOPEMS_APPLIANCE_MEM` | `auto` ★ | 私有化模式下自检测内存，低于阈值降级 | P3 |
| `REMOTE_MODULES` | `mes,bi,ai,gis`（P3 后默认，之前空） | 强制哪些模块走 remote 路径 | P2 |
| `TOPEMS_KERNEL_LOG` | `info` ★ | 内核日志级别 | P0 |

---

## 11. 下一步推进建议

1. **本周内：90 分钟架构评审会**，评审 §3「核心设计决策」× 4 + §4「阶段划分」× 5 + 附录 A「GA 8 硬门槛」× 8，只做高层 Yes/No 决策，不讨论具体代码。目标共识率 ≥ 90% 再进入签字。
2. **评审通过后**：本文档状态从 `Draft` → `Approved`，签版归档；同时创建 `P0 骨架周` 子计划（按 writing-plans skill 的 bite-sized 粒度拆）。
3. **并行路径**：P0 骨架可以和业务日常发版完全并行推进，不会阻塞 28 服务的任何发布节奏。

---

## 附录 A：GA 8 项硬门槛总表

| # | 指标 | 阈值 | 采集工具 |
|---|---|---|---|
| 1 | 全量 28 模块 in-proc RSS | ≤ 750 MB | `/metrics process_resident_memory_bytes` + Grafana |
| 2 | PgPool 最大连接占用 | ≤ 100 | `pg_stat_activity` count |
| 3 | 跨模块同步调用 P99 | ≤ 50 µs | wrk 压测 + tracing span duration |
| 4 | 单模块故障扩散 | 0（CatchUnwindW/WASM/Remote 三层隔离） | 故障演练报告 |
| 5 | 私有化 4C8G compose 首启动 | ≤ 5 min | `time docker compose up` 脚本 |
| 6 | mono ↔ multi 双向切换 | ≤ 60 s + 业务 0 停机 | SRE 演练录像 + PagerDuty 指标 |
| 7 | 测试通过率（700+ 用例） | 100%，0 skip | CI Dashboard |
| 8 | SaaS 100% 灰度期间 SLA | ≥ 99.95%（不低于 multi 模式基线） | SaaS Monitoring Dashboard |
