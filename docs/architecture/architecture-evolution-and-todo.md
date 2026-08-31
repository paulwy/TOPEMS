# TopEMS 架构演进与待办清单

> **归档信息**
> - 文档版本：v1.0（2026-08-31 归档）
> - 状态：生效中 · 待办部分以交付物、依赖、完成定义和验收为标准
> - 来源：飞书云文档 [《TopEMS 架构演进与待办清单》](https://feishu.doubao.com/docx/WvXDdSprFovcKWxcTMSc1IYqnob)
> - 关联文档：`docs/architecture/overview.md` · `docs/architecture/TOPEMS_Architecture_Roadmap_v2.md` · `config/services.yaml` · `TODO.md`
> - 待办状态追踪：见 `TODO.md`「架构演进与待办清单」章节

---

本文档面向 TopEMS 架构决策者，回答两个问题：平台是如何演进到当前形态的，以及下一步应该推进哪些架构待办。待办部分以交付物、依赖、完成定义和验收为标准，便于直接进入执行；所有尚未批准的方向均明确标注为待定项，不构成承诺。

# 架构演进脉络

TopEMS 从早期的集中式服务逐步演进为"微服务 + 插件化 + 统一规范"的企业级平台。关键演进动作与版本里程碑如下：

## 演进里程碑

| 阶段 / 版本 | 关键动作 | 结果 | 状态 |
|-|-|-|-|
| 初期 | 集中式服务（user-service / shared / config-center 等）承担业务与平台职责 | 单体瓶颈、职责混杂，为后续拆分提供反向基线 | 已废弃整合 |
| 微服务拆分期 | erp / crm / hrm / wms / finance 等业务模块从 unified-core 迁出为独立服务 | unified-core 瘦身，业务服务独立部署 | 已完成 |
| V13.0 | 插件化架构整改 7 大缺陷：插件令牌注册、服务发现（Consul + 回退）、心跳检测、依赖检查、前端动态导航 | 插件注册/发现/生命周期闭环 | 已完成 |
| V24.0 | 引入 gRPC 微服务基础（tonic/prost） | 预留 gRPC 通道能力（当前以 REST 为主） | 可用 |
| V66.2 | Shared Bootstrap V2 五批次迁移，28 服务统一为 ServiceConfig → bootstrap_service → build_application → run 三段式 | 服务启动标准化 28/28 = 100%，A/B/C 三模式覆盖 | 已完成 |
| V66.7 | 第三轮深度架构审计 31 项问题（P0×6 / P1×10 / P2×9 / P3×3） | 31/31 全闭环 | 已完成 |
| V67.0 | 统一 ListResponse 响应、Plugin 自动注册补齐、超大页 TOP5 拆分 | 响应契约统一，插件注册 100%，首屏体积下降 | 已完成 |
| V67.1 | 第四轮四探针并行审计（plugin schema / println 清理 / 死代码 / Docker 锚点） | 67/67 全闭环 | 已完成 |
| V67.2 | 数据层审计：审计日志覆盖率 25% → 100%，状态枚举统一，schema 校验 | 审计与数据一致性强化 | 已完成 |
| V68.0 | 质量门禁：tsc 0 error、cargo check 0 warning、vite build 通过，CI 门禁上线 | 质量基线可机器校验 | 已完成 |
| V68.1 | monitor、plugin-registry 从 unified-core 拆分为独立服务（8095/8096） | 核心服务继续外迁，单点面收窄 | 已完成 |
| V69 | UUID 主键迁移、company_id → org_id 统一、organization_id 归并 | 主键与组织维度统一 | 已完成 |
| V76 | UUID 清理、is_deleted 规范、pgvector 索引落地 | 数据层规范收敛，AI 向量检索可用 | 已完成 |
| V252–V256 | 加密字段 varchar→text、约束收敛、schema 空值统一、业务快照表（finance/wms/hrm/rd） | 数据历史可追溯，schema 语义收敛 | 持续中 |
| 近期扩展 | 新增 tms/aps 物流服务、master-data 主数据、lowcode 占位 | 业务域覆盖扩充至 \~32 个服务 crate | 部分完成 |

## 演进主线归纳

- **从单体到平台**：集中式服务 → 独立微服务 → 插件化注册 → Shared Bootstrap 统一启动，先拆分、再收编、后标准化。
- **从分散到单一真相源**：端口分配、API 路径、服务清单、启动模板逐步收敛为可校验的规范（services.yaml + ports.env + Cargo.toml）。
- **数据层持续规范化**：UUID 化、org_id 统一、加密字段收敛、审计日志全覆盖、业务快照表引入。
- **质量从人工到门禁**：多轮审计闭环后沉淀为 CI 机器校验（tsc / cargo / vite / secret-scan）。

# 当前架构基线（V71+ 快照）

作为待办清单的事实基线，现状要点如下：

- **后端**：Rust + Axum 0.8 + SQLx 0.8，Cargo workspace 约 32 个服务 crate（含 1 个 unified-core），共享库拆分为 8 个按域子 crate（core/db/auth/service-client/event/observability/ai/bootstrap）。
- **核心服务**：unified-core（8000）承载 IAM/Doc/Flow/File；monitor（8095）、plugin-registry（8096）已独立。
- **业务域与端口**：经营管理 8010-8019、协同办公 8020-8029、生产制造 8030-8039、供应链 8040-8049、质量研发 8050-8059、数据分析/门户 8060-8069、基础设施 8070-8079、扩展 8082-8088、主数据 8090、物流 8073-8074。
- **数据层**：PostgreSQL 16 单实例多 Schema（pgvector / pg_trgm / uuid-ossp），Redis 7，RabbitMQ 可靠消息，PgBouncer 连接池，SQLx 离线编译缓存。
- **事件**：Redis Pub/Sub（轻量）+ RabbitMQ（可靠，DLQ/ACK），事件命名 {Module}{Entity}{Action}。
- **前端**：React 19 + TS + Vite + Module Federation 微前端；Web / Tauri 桌面 / Expo 移动三端；共享 packages（types/utils/constants/components/hooks/tokens）。
- **运维**：本地进程（默认）/ Docker Compose / K8s / systemd 多形态；Prometheus + Grafana + Loki + OTel；GitHub Actions CI/CD。

# 2026-08-31 现状校准（重要）

> 本清单初稿基于 2026-08-22 前后代码状态；2026-08-31 归档时项目已发生多项重大演进，以下为最新口径，**优先于上文基线**。

## 归档时点的新演进（2026-08-22 → 2026-08-31）

- **模块化单体重构**：新增 `svc/server` 统一入口（topems-server），32 svc → 7 核心模块组（core / erp / finance / crm / wms / advanced / ai），详见 `docs/architecture/modular-monolith-design.md`；部署模式分 private-deployment（进程内 trait）与 saas-deployment（HTTP）。
- **共享库扩容**：新增 `shared-mcp` / `shared-dsh` / `shared-boundary` 子 crate。
- **服务合并与归档**：aps → mes 合并（`aps_scheduling`/`aps_compat`，`/api/aps` 兼容层由 mes 提供）；feedback → ticket 合并（`customer_feedback` 类型）；lowcode、billing 归档至 `svc/_archive/`。
- **事件总线升级**：Redis Pub/Sub → **Redis Stream**（XADD/XREADGROUP + ACK + DLQ），2026-08-29 完成迁移验证。
- **当前构建口径**：28 业务服务 + `svc/server` 统一入口 + 12 个共享库子 crate；`config/services.yaml` 为端口单一信源，已由三向校验脚本守护。

## 待办清单校准（10 项 → 最新状态）

| 原编号 | 工作包 | 2026-08-31 校准状态 |
|---|---|---|
| P0-1 | 架构文档基线对齐 | ✅ 本次实施：修复 services.yaml 重复键、补齐 ports.env 4 端口、接入 CI Gate M、overview.md 对齐 |
| P0-2 | unified-core 继续瘦身决策 | 🔄 **方向变更**：被"模块化单体"取代（svc/server + 7 模块组），改为跟踪模块化单体演进与边界治理 |
| P0-3 | 配置单一真相源 CI 校验 | ✅ **本次实施完成**：`scripts/check-workspace-registry.py` + CI Gate M（`config/**` 或 Cargo.toml 变更触发） |
| P1-1 | 事件通道选型规则落地 | ✅ **已解决**：Redis Stream 迁移完成（2026-08-29），Pub/Sub 仅保留显式降级分支 |
| P1-2 | 物理库拆分预案 | ✅ **完成预案**：`database-split-plan.md`（7 模块组映射 + 触发阈值 + 迁移/回退）；待评审 schema 归属 |
| P1-3 | 前端测试矩阵 ROI 审视 | ✅ **完成报告+批1**：`frontend-test-roi-review.md`（L1-L4 分级 + ≤20min 预算 + 三批实施路径）；批1 E2E 收敛已落地（CI 单 chromium + apps/web 6→2，0 snapshot），批2 待页面清单确认 |
| P1-4 | lowcode 立项决策 | ✅ **已解决**：已归档 `svc/_archive/lowcode` |
| P2-1 | RLS 数据权限覆盖 | ✅ **完成落地**：`migrations/20260831*`（框架函数 + 302 张含 tenant_id 表启用 RLS + 策略）；修复 GUC 名不一致 / PG18 无 IF NOT EXISTS / 空值 UUID 报错 3 缺陷；`lib/shared-db/src/rls.rs` 同步修复 |
| P2-2 | API 网关 8080 落地 | ✅ **完成方案+nginx 补强**：`api-gateway-plan.md`（Traefik 8080 待 staging 部署验证）+ 生产 `deploy/nginx/topems.conf` 补强落地（限流/连接限制/失败转移熔断） |
| P2-3 | 发布/CHANGELOG 自动化 | ✅ **完成落地**：`scripts/ci/generate-changelog.py` + `scripts/release.sh`（接入发布流程）+ CI `changelog-gate`（tag 触发校验） |

> 待办状态追踪的权威来源：`TODO.md`「架构演进与待办清单」章节，后续在此更新进度。本轮（P1-2/P1-3/P2-1/P2-2/P2-3）产物均已归档至 `docs/architecture/` 与 `scripts/`。
>
> **2026-08-31 批准执行落地（P2-1→P2-3→P2-2→P1-3）**：详见 `TODO.md`「批准执行落地记录」——RLS 302 表启用+3 缺陷修复（含 `lib/shared-db/src/rls.rs` 编译通过）、release.sh+changelog-gate 接入发布、nginx 限流/熔断补强（`nginx -t` 通过）、E2E 矩阵收敛；`rls-coverage-report.md` 已追加活库落地状态。

---

# 待办清单

以下待办按优先级 P0（近期）/ P1（中期）/ P2（持续）组织。P0 为影响架构健康度与维护成本的事项，逐项给出背景、交付物、依赖、完成定义与验收；P1/P2 以要点展开。所有 owner 未指定的项均为待定，由架构负责人确认后再进入排期。

## 待办总览

| 优先级 | 工作包 | 建议窗口 | 关键依赖 | 完成定义（简） |
|-|-|-|-|-|
| P0 | 架构文档基线对齐 | 1–2 周 | 无 | overview/services.yaml/Cargo.toml 三者一致 |
| P0 | unified-core 继续瘦身决策 | 2–4 周 | 拆分评估产出 | doc/flow/file 外迁给出明确决策与排期 |
| P0 | 配置单一真相源 CI 校验 | 1–2 周 | CI 门禁（已具备） | 端口/服务清单不一致即 CI 失败 |
| P1 | 事件通道选型规则落地 | 1 个月 | event-driven.md 修订 | 双通道决策矩阵 + 存量事件标注 |
| P1 | 物理库拆分预案 | 1–2 个月 | 容量/增长基线 | 拆分触发阈值 + 迁移路径文档 |
| P1 | 前端测试矩阵 ROI 审视 | 1 个月 | 测试耗时基线 | 用例分级与裁剪建议、时间预算 |
| P1 | lowcode 立项决策 | 1 个月 | 业务评估 | 立项或撤销，消除 reserved 占位 |
| P2 | RLS 数据权限覆盖 | 持续 | 剩余表清单 | RLS 覆盖到全部业务表 |
| P2 | API 网关 8080 落地 | 持续 | 路由映射表 | 网关路由 + 灰度切换 |
| P2 | 发布/CHANGELOG 自动化 | 持续 | Git 规范 | 版本发布自动生成变更记录 |

## P0 近期工作包

### P0-1 架构文档基线对齐

**背景**：docs/architecture/overview.md 停留在 V71 / 28 服务口径，而实际 Cargo workspace 已含 \~32 个服务 crate，且 tms/aps、monitor/plugin-registry 等新增/拆分未归档。文档与代码清单脱节会误导后续排期与新人认知。

- **交付物**：更新 overview.md 服务清单与版本说明；核对 code-wiki.md / services.yaml / Cargo.toml members 逐项一致。
- **依赖**：无外部依赖。
- **完成定义**：以 services.yaml 为基准，Cargo.toml members 与文档服务表三处逐项核对一致；文档标注"版本基线 + 最后核对日期"。
- **验收**：架构负责人复核文档与 services.yaml 无差异。
- **风险/预警**：services.yaml 本身可能落后于 main.rs 实际端口；校验时以运行中服务的实际监听端口为最终证据。

### P0-2 unified-core 继续瘦身决策

**背景**：monitor、plugin-registry 已独立，但 IAM/Doc/Flow/File 仍内聚于 8000，是事实上的单点依赖与单点故障面；所有业务服务都依赖 unified-core 认证，扩容与发布受影响。

- **交付物**：doc/flow/file 外迁的可行性评估（依赖面、共享 state、虚拟服务到独立进程的迁移成本），输出"拆分 / 暂缓"决策及理由。
- **依赖**：依赖评估先行，拆分排期须由评估产出推导。
- **完成定义**：决策文档含明确结论、若拆分则给出服务清单、端口段与迁移顺序；暂缓则给出复核触发条件。
- **验收**：架构负责人批准；拆分后以插件注册 + 心跳验证服务发现闭环。
- **风险/预警**：拆分期间认证链路不可用——建议以"先加反向依赖缓存 + 分阶段切换"降低回归面。

### P0-3 配置单一真相源 CI 校验

**背景**：端口与服务清单目前需人工同步 services.yaml、ports.env、各服务 main.rs、vite.config.ts 等多处，属于高成本、易出错的人工契约。

- **交付物**：CI 校验脚本，对比 Cargo.toml members、services.yaml、ports.env、config 目录，端口冲突与清单不一致直接失败。
- **依赖**：CI 门禁（V68.0 已上线）直接复用。
- **完成定义**：任一不一致即 CI 红；运行超时 < 30s；支持 --check 本地预检。
- **验收**：人为引入一处端口冲突提交，CI 能正确拦截。
- **风险/预警**：一次性脚本过度耦合——以纯解析 + 断言实现，不引入额外构建依赖。

## P1 中期工作包

### P1-1 事件通道选型规则落地

- **背景**：Redis Pub/Sub 与 RabbitMQ 双通道并存，但 event-driven.md 未给出"何时用哪个"的明确标准。
- **交付物**：通道决策矩阵（可靠性/持久化/延迟/消费语义）；存量事件清单补注通道归属。
- **依赖**：无。
- **完成定义**：新增事件按矩阵选型；文档可作为评审依据。

### P1-2 物理库拆分预案

- **背景**：单实例多 Schema 运维简单，但跨 Schema 事务不可用、容量扩展与备份恢复受限。
- **交付物**：按业务域（如 unified-core / erp / manufacturing / quality）物理库拆分预案，含触发阈值、迁移路径与回退方案。
- **依赖**：需要容量与增长基线数据作为阈值依据。
- **完成定义**：预案文档 + 阈值指标（连接数/容量/跨库查询占比）可度量。

### P1-3 前端测试矩阵 ROI 审视

- **背景**：8 分片 Vitest + 3 套 Playwright + Storybook + Lighthouse，维护与执行成本高。
- **交付物**：用例分级（单元/组件/E2E）与裁剪建议；单次全量执行时间预算。
- **依赖**：先采集各层测试耗时基线。
- **完成定义**：给出可执行的裁剪清单，CI 全量时间收敛到预算内。

### P1-4 lowcode 立项决策

- **背景**：svc/lowcode 为占位服务（status: reserved），后端模板已就位但功能未立项。
- **交付物**：立项/撤销的明确决策，避免长期保留"半成品占位"。
- **依赖**：业务优先级评估。
- **完成定义**：决策记录 + 相应行动（立项排期或从 workspace 移除并归档模板）。

## P2 持续工作包

### P2-1 RLS 数据权限覆盖

- **背景**：database/postgres/rls_remaining_tables.sql 表明行级安全仍有剩余表未覆盖。
- **交付物**：RLS 未覆盖表清单 + 分批迁移。
- **完成定义**：业务表 RLS 覆盖率 100%，策略可审计。

### P2-2 API 网关 8080 落地

- **背景**：8080 网关为 reserved，本地开发直连各服务端口，生产路由收敛度不足。
- **交付物**：路由映射表 + 网关灰度切换方案。
- **完成定义**：生产请求经网关转发且鉴权/限流生效。

### P2-3 发布/CHANGELOG 自动化

- **背景**：CHANGELOG.md 为手工维护，易遗漏。
- **交付物**：基于 Git 提交规范自动生成变更记录。
- **完成定义**：每次版本发布自动产出 CHANGELOG 草案，人工仅复核。

# 推进与治理方式

- **责任接口**：架构负责人为唯一决策入口，负责 P0/P1 的立项、owner 指派与验收；业务 owner 对各自域内工作包的进度负责。
- **节奏**：P0 三项先行（可并行推进，无相互阻塞）；P0 完成后进入 P1 立项评审。
- **基线变更**：任何端口、服务清单、API 前缀变更必须同步 services.yaml 与校验脚本，否则 CI 拦截。
- **验收机制**：每个工作包按"完成定义"逐项验收，未达定义不标记完成；文档类待办以"可被新人按文档复现现状"为最低验收线。
- **决策待定项**：unified-core 拆分、lowcode 立项、物理库拆分三项属于方向决策，本文档不预设结论，由架构负责人评审后落定。
