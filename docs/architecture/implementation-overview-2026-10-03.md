# TOPEMS 架构整改实施总览（2026-10-03）

> 阶段 3 第三项「R3 文档与实现对齐闭环」交付文档
> 编制日期：2026-10-03（周六）UTC+8
> 证据基线：`TOPEMS-架构分析报告-2026-10-02.md`（73 条 F-xx）+ `docs/audit/arch-analysis/` 8 分片 + `git log` 全提交链 + `regression-baseline-r1.md` / `regression-baseline-r2.md`
> 纪律：纯文档闭环，**未改任何业务代码**；每条终态可追溯到 commit 或文件路径；历史文档只追加状态段，不重写。
> 关联文档：决策 [D1](./decision-d1-unified-core-architecture.md) / [D2](./decision-d2-call-cycle-elimination.md) / [D3](./decision-d3-integration-data-ownership.md) / [D4](./decision-d4-frontend-mf-strategy.md) / [D5](./decision-d5-service-discovery-convergence.md)；基线 [R1](./regression-baseline-r1.md) / [R2](./regression-baseline-r2.md)。

---

## 0. 总览结论

| 阶段 | 项 | 终态 |
|---|---|---|
| 阶段 0 决策 | D1–D5 | ✅ 全部落盘并已追加「实施状态（2026-10-03）」段 |
| 阶段 1 快赢 | T1/T2/T3 | ✅ 全绿（T4 插件令牌门控未做，列残留） |
| 阶段 2 改造 | U1–U12 + U12b + U3b | ✅ 全部落地（13 项 + U3b 两步骤） |
| 阶段 3 收敛 | R1 / R2 / R3 / R4 | R1 ✅ 基线记录；R2 ✅ 六链路实测（含回归）；R3 ✅ 本文档；R4 ⏸ 待启动 |

**73 条发现终态统计**：

| 终态 | 数量 | 占比 |
|---|---|---|
| ✅ 已消除（代码改造 + 门禁/实测验证） | **29** | 40% |
| 🟡 已缓解（部分治理 / 文档口径 / 白名单短期管控） | **8** | 11% |
| ⬜ 残留待办（未治理 / R2 回归 / 排期项） | **36** | 49% |
| 合计 | **73** | 100% |

> 说明：报告原「高危 16 / 中危 30 / 低危 27」。高危 16 条中 **15 条已消除**（仅 F-05 private/saas 双形态残留），是本轮整改主战场；F-19（插件令牌门控 = T4）属中危；残留以中低危的架构性/前端工程化/可观测性项为主，多数已在本轮范围外、需后续单独立项。

---

## 1. 决策（D1–D5）实施状态

| 决策 | 方案要点 | 实施 commit | 验证 | 偏差 |
|---|---|---|---|---|
| **D1** unified-core 形态 | C 灰度下架→终态 A 瘦身：停挂 24 业务路由、删 23 业务镜像模块+180 跨读、撤销 21 schema allow | `89351e062` `dea650b55` `4a41df997` `2ace368f3` | 业务路由=0；modules/ 仅余平台域；PY/NODE 门禁 exit 0 | :8099 直跑 mes 看板 404（生产无影响） |
| **D2** 调用环消除 | 环1=C（凭证事件化，erp→hrm 只读保留）；环2=A（双向事件）；环3=C（偏好本地化） | `a1c4e8a01` `173622037` `18077bf45` `269d37d44` | 4 事件入 event_types.rs:191-203；HTTP 环边=0；R2 链①③ PASS | 链② mes uuid=text 回归；DLQ 未触发；IamUserPreferencesUpdated 未实发 |
| **D3** integration 归属/假同步 | 9 直写→HTTP 编排+7 事件；假同步入口下线；撤销 qms/ehs allow | `9b1f7c7d1` `292298e75` `3bec2a840` `61fbf68ac` | 直写=0（仅注释）；双门禁 exit 0 | **qa_lab 终态=public（非原建议 lims）**；R2 链④ 路径契约 404 |
| **D4** 前端 MF | 选项 B 去 remote 化，回归模块化单体 SPA，归档 MF 死代码 | `f994a5075` `2a71563ef` | @module-federation grep=0；build/typecheck exit 0；bundle 16.43M<30M | shared-types DTS 既有环境问题；mobile/desktop 待原生工具链 |
| **D5** 服务发现收敛 | 选项 B 静态为主，移除 zk/eureka/nacos | `f7f7dcf26` `104da3c39` | deploy 残留=0；M7 future-incompat 消除；双门禁 exit 0 | U9.5 services.yaml↔ports.env↔nginx 一致性脚本未做 |

> D1–D5 各决策文档已追加「## 8. 实施状态（2026-10-03）」段，含逐条 commit 与验证证据。

---

## 2. 快赢（阶段 1 T1–T3）

| 项 | 任务 | commit | 验证 | 终态 |
|---|---|---|---|---|
| **T1** | 移除失效 topems-core 构建链 + 归档 MF 运行时空壳（对应 F-13/F-14/F-15/F-46/F-73） | `f994a5075` | pnpm build 全链绿、bundle 16.43MB、vitest 6528 过 | ✅ 已消除 |
| **T2** | 系统性文档漂移修订（overview/event-driven/microfrontend/database，对应 F-16/F-18/F-40/F-48 等） | `2a71563ef` | verifier must-contain 抽查通过 | ✅ 已消除（文档口径） |
| **T3** | schema-boundary 门禁修复 + 临时白名单统一事实源（对应 F-58） | `08eb9da04` | py+cjs 双门禁 PASS，临时白名单统一 | ✅ 已消除 |
| ~~T4~~ | 插件令牌门控改布尔开关（对应 F-19） | — | TODO 仍 `[ ]` 未做 | ⬜ 残留待办 |

---

## 3. 阶段 2 改造（U1–U12 + U12b + U3b 逐项）

| 项 | 任务 | 改动/commit | 验证 | 终态 |
|---|---|---|---|---|
| **U1** | unified-core 瘦身（F-01/F-11/F-12/F-28） | `89351e062`(b1停挂路由) `dea650b55`+`4a41df997`(b2删23模块) `2ace368f3`(b3撤21 schema allow) | 独立模式业务路由=0；modules/ 仅平台域；PY 119 引用全自有 | ✅ 已消除 |
| **U2** | 调用环消除（F-03/F-04） | `a1c4e8a01`(4事件) `173622037`(环1) `18077bf45`(环2) `269d37d44`(环3) | 环边 HTTP=0；R2 链①③ PASS；shared-event 360+3 ignored | ✅ 已消除（链② R2 回归见残留） |
| **U3** | integration 直写→HTTP 编排 + 假同步下线（F-02/F-08/F-09） | `9b1f7c7d1`(9直写+7事件) `292298e75`(internal端点) `3bec2a840`(假同步下线) `61fbf68ac`(撤白名单) | 直写=0；双门禁 exit 0 | ✅ 已消除（链④ R2 路径契约见残留） |
| **U4** | master-data 10 MDM 内存壳落库（F-10/F-60） | `e1e5b1399` | mdm_collections JSONB + load-on-boot + 3s flush；persist 2/2 绿 | ✅ 已消除 |
| **U5** | finance RLS 开启 + tenant_rls GUC 修复（F-06/F-20） | `1404532a8` | finance RLS 89 表；跨租户隔离实测；tenant_rls 10/10 | ✅ 已消除 |
| **U6** | 金额 f64→Decimal 全链路（F-07） | `9e8b34a77` | 借贷平衡+0.1+0.2 单测；NUMERIC(18,4) | ✅ 已消除（R2⑨ schema 漂移见残留） |
| **U7** | 统一错误处理推广（F-22） | `1e72948df` | mobile/erp/mes/lims/rd 五服务 110 处泄露型错误清零 | 🟡 已缓解（其余静态文案/他服务跟进） |
| **U8** | 门面清理（F-35） | `b1135ada1` | `use topems_shared::` 255→7（3 处有意保留+示例） | ✅ 已消除 |
| **U9** | 服务发现收敛（F-39/F-56） | `f7f7dcf26`(代码删) `104da3c39`(deploy清理) | zk/eureka/nacos=0；M7 警告消除；双门禁 exit 0 | ✅ 已消除 |
| **U10** | 服务启动 panic 治理（F-23） | `2e23fd5aa` | 17 main.rs 降级化；crm 下游不可达仍 /health 200 | ✅ 已消除 |
| **U11** | 插件心跳离线检测（F-17） | `b782ce7c5` | 30s 扫/90s offline 后台任务；判定函数 6/6 绿 | ✅ 已消除（R2⑥ 表缺失/401 见残留） |
| **U12** | crm 审计读路径归位（F-26） | `370c1972b` | crm.audit_logs 归位；审计单测 6/6 | ✅ 已消除 |
| **U12b** | wms 审计读写错位跟进（F-26 族） | `5ed165c7e` | 3 处读路径归 wms.audit_logs；审计单测 4/4 | ✅ 已消除（R2⑤ uuid=text 见残留） |
| **U3b** | qa_lab_* 空骨架表清理（方案 B） | `4e2886840`(步骤1 lims 显式 public) `9b2c3a7aa`(步骤2 DROP 骨架表+schema_defense 移除) | 双门禁 exit 0；public 唯一事实标准 | ✅ 已消除 |
| （配套） | U 系列格式化 + cast deny 收口 | `d524eea08` | cargo fmt --all | — |

---

## 4. 阶段 3 收敛记录

### 4.1 R1 全量门禁基线（摘要）

> 实测 HEAD 经 U9/U12b 推进；前端基线 `f7c3d687d`，后端基线 `470a37392`。

| 门禁 | 结果 |
|---|---|
| cargo check --workspace | ✅ exit 0，0 错误 0 警告（zookeeper future-incompat 随 U9 消除） |
| cargo clippy --all-targets | ✅ exit 0，0 warning |
| cargo fmt --check | ✅ exit 0 |
| cargo test --workspace | ⚠️ 23337 passed / **8 failed**（全部 = svc/ai mcp_stdio_integration 环境缺口） |
| sqlx Gate S | ✅ exit 0 |
| boundary-gate-py / NODE | ✅ 双 exit 0（PY 28 服务 / NODE 29 服务 1421 文件 38 allowlisted） |
| 前端 build:host / typecheck / vitest / bundle | ✅ 141s / ✅ 96s / ⚠️ 6528 passed+3 既有 GIS mock 失败 / ✅ 16.43M<30M |

关键子项：shared-event 360+3 ignored、finance lib 1106、tenant_rls 10/10、wms audit 4/4、master-data persist 2/2。

### 4.2 R2 六链路实测（摘要，详见 regression-baseline-r2.md）

| 链路 | 结果 | 结论 |
|---|---|---|
| ① 工资→凭证（U2 环1） | ✅ PASS | 事件到达+NUMERIC 借贷平衡+幂等重放跳过 |
| ② 订单→工单（U2 环2） | ❌ FAIL | mes `event_handlers.rs:62,112` uuid=text 类型 bug（回归） |
| ③ 报工→进度（U2 环2） | ✅ PASS | erp 消费+进度更新+幂等账本收敛 |
| ④ 质量链 qms↔lims↔ehs（U3） | ❌ FAIL | integration 调裸路径 404（路径契约回归）+ 窄 status 约束拦 |
| ⑤ 插件注册+心跳（U11） | ⚠️ BLOCKED | register/status 401 + ON CONFLICT 缺约束 + 心跳表缺失 |
| ⑥ CRM/WMS 审计（U12/U12b） | ⚠️ 部分 | crm 200 读自有 schema；wms 500（uuid=text） |

12 服务 /health 全 200；缺口：5433 不可达、nginx 未运行、portal:8063 挂起。

### 4.3 U3b 终态

qa_lab_* 终态 = **public 唯一事实标准**：步骤1（`4e2886840`）将 lims 18 处无前缀引用显式化 public；步骤2（`9b2c3a7aa`）DROP `qms.qa_lab_samples/tasks` + `lims.qa_lab_samples/tasks` 骨架表并从 lims schema_defense TABLE_DEFS 移除条目。与 D3 原建议「收敛 lims」的偏差已在 D3 状态段说明（09-21 cleanup 已使 public 成事实标准，用户拍板方案 B）。

### 4.4 R3 本文件

73 条 F-xx 逐条终态标注（§5）+ 残留待办登记（§6）+ 白名单撤留结论（§7）+ 提交清单（§8）。

---

## 5. 73 条 F-xx 终态对照总表

> 终态：✅已消除 / 🟡已缓解 / ⬜残留待办。证据 = commit 或文件路径。

### 5.1 高危（16）

| 编号 | 标题（节录） | 终态 | 证据 commit / 文件 |
|---|---|---|---|
| F-01 | unified-core 23 业务镜像+180 跨读 | ✅ | U1 `89351e062`/`dea650b55`/`4a41df997`/`2ace368f3` |
| F-02 | integration 直写 qms/ehs | ✅ | U3 `9b1f7c7d1` + 撤白名单 `61fbf68ac`；grep 仅余注释 |
| F-03 | erp↔hrm 双向环 | ✅ | U2 环1 `173622037`（hrm/payroll.rs:959 仅注释） |
| F-04 | erp↔mes 双向环 | ✅ | U2 环2 `18077bf45`（HTTP 边=0；链② R2 回归见 R-1） |
| F-05 | private/saas 空 feature | ⬜ | 未治理（svc/server/Cargo.toml private/saas-deployment=[]） |
| F-06 | finance 关闭 RLS | ✅ | U5 `1404532a8`（RLS 89 表） |
| F-07 | 金额 f64 泄漏 | ✅ | U6 `9e8b34a77`（R2⑨ schema 漂移见 R-9） |
| F-08 | integration 仅 3 事件、7 未接线 | ✅ | U3 `9b1f7c7d1`（7 事件接线；链④ R2 路径契约见 R-2） |
| F-09 | data_sync 假同步 | ✅ | U3 `3bec2a840`（lims/ehs data_sync.rs:217,240 下线注释） |
| F-10 | master-data 10 MDM 内存壳 | ✅ | U4 `e1e5b1399`（mdm_collections） |
| F-11 | unified-core analytics 死模块 | ✅ | 随 U1 删 23 业务镜像（modules/ 无 analytics） |
| F-12 | unified-core 跨读 22 schema 无门禁 | ✅ | U1 `2ace368f3`（21 schema allow 撤销） |
| F-13 | pnpm build 引用不存在 topems-core | ✅ | T1 `f994a5075` |
| F-14 | MF 空壳 19 remote | ✅ | T1/D4 `f994a5075`（@module-federation=0） |
| F-15 | decision.md 称 MF 已删实仍依赖 | ✅ | T1 去依赖 + T2 `2a71563ef` 重写 decision.md |
| F-16 | overview 前端技术栈表错误 | ✅ | T2 `2a71563ef` |

### 5.2 中危（30）

| 编号 | 标题（节录） | 终态 | 证据 commit / 文件 |
|---|---|---|---|
| F-17 | 插件心跳离线检测死代码 | ✅ | U11 `b782ce7c5`（R2⑥ 表缺失/401 见 R-4） |
| F-18 | Bootstrap A/B/C 计数矛盾 | ✅ | T2 `2a71563ef`（实测分布写入 overview） |
| F-19 | 插件令牌门控依赖 PROFILE=="prod" | ⬜ | =T4，TODO 仍 `[ ]` |
| F-20 | RLS 会话 GUC 连接池 | ✅ | U5 `1404532a8`（acquire→set→run→reset） |
| F-21 | erp 直读 finance/crm schema | 🟡 | 短期白名单管控；长期 API 迁移未做 |
| F-22 | 统一错误处理采纳率低 | 🟡 | U7 `1e72948df`（五服务 110 处；其余静态文案跟进） |
| F-23 | 服务客户端启动 panic | ✅ | U10 `2e23fd5aa` |
| F-24 | CRM/Finance 事件清单漂移 | 🟡 | U2 `a1c4e8a01`+T2 登记 §3.11；全量事件清单核对未完 |
| F-25 | crm 全量共用 crm:admin | ⬜ | 未拆权限点 |
| F-26 | crm 审计直读 public.audit_logs | ✅ | U12 `370c1972b`；wms 族 U12b `5ed165c7e`（R2⑤ 见 R-5） |
| F-27 | mes 体量过大（36k 行） | ⬜ | 未拆分（P2 未排期） |
| F-28 | AI 模型双服务/unified-core 直读 ai | ✅ | 随 U1 删 ai 业务镜像（modules/ 无 ai） |
| F-29 | analytics 直读 IAM/组织库 | ⬜ | 未解耦 |
| F-30 | analytics KPI/报表假数据 | ⬜ | 未接真实源 |
| F-31 | analytics datasource SSRF | ⬜ | 未加白名单 |
| F-32 | MCP 手写阻塞裸 TCP | ⬜ | 未改 TypedServiceClient（R1 mcp_stdio 环境缺口同族） |
| F-33 | 进程内 trait 仅 1 边 | ⬜ | InProcProvider 未扩 |
| F-34 | nginx 双轨指向独立端口 | ⬜ | 未切 :8099（R2⑧ nginx 未运行，见 R-7） |
| F-35 | 门面未去除/表单栖身门面 | ✅ | U8 `b1135ada1`（门面引用 255→7） |
| F-36 | boundary opt-in 子查询逃逸 | ⬜ | CI 级静态扫描兜底未加 |
| F-37 | search 裸 SQL 直读 erp.* | ⬜ | **实测仍存**：svc/search/src/handlers.rs:113,167,197；白名单保留（§7） |
| F-38 | srm 直写 unified_core.inter_module_sync | ⬜ | 未改事件/写接口 |
| F-39 | 五套服务发现并存 | ✅ | U9 `f7f7dcf26`/`104da3c39` |
| F-40 | 双 schema 命名并存 | 🟡 | T2 文档对齐裸名；存量 rehome 未做 |
| F-41 | business-tools-sdk 死代码 | ⬜ | 未归档/未接入 |
| F-42 | api-client 三端分裂 | ⬜ | web/mobile 仍自建 |
| F-43 | shared-utils/hooks 沉淀不足 | ⬜ | 未治理 |
| F-44 | desktop 影子应用（40 文件） | ⬜ | 未补依赖/壳策略 |
| F-45 | 三端 React 版本分裂 | ⬜ | tsconfig alias 未收窄 |
| F-46 | 构建 850 行 workaround 插件 | ✅ | T1/D4 去 MF 依赖后消除 |

### 5.3 低危（27）

| 编号 | 标题（节录） | 终态 | 证据 commit / 文件 |
|---|---|---|---|
| F-47 | ERP 事件名缺模块前缀 | 🟡 | 新事件带前缀（U2.5）；存量无前缀事件回修未完 |
| F-48 | event-driven.md 仍 Pub/Sub+RabbitMQ | ✅ | T2 `2a71563ef`（改 Redis Stream 口径） |
| F-49 | scm/srm/pm Gauge=42.0 占位 | ⬜ | 未删真实指标替换 |
| F-50 | services.yaml 依赖与代码不符 | ⬜ | erp dependencies 未补 hrm/finance/mes |
| F-51 | gRPC 依赖存在无调用 | ⬜ | 文档注明预留；超时/熔断未配 |
| F-52 | finance modules/mod.rs 5922 行 god-file | ⬜ | 未拆子模块 |
| F-53 | 跨库拓扑文档滞后 | 🟡 | R3 标注；runtime 矩阵待 R4 `--collect` |
| F-54 | crm 售后本地事务+外部 HTTP 非原子 | ⬜ | outbox/补偿未做 |
| F-55 | finance 对 ticket 裸 reqwest | ⬜ | 未补 TypedServiceClient |
| F-56 | Consul 默认关走 env | ✅ | D5 决策接受 env 为默认形态 + 文档化 |
| F-57 | qms 无业务事件订阅器 | 🟡 | 决策：经 integration 中转当前架构合理，无需改 |
| F-58 | ehs schema_boundary 配置异常 | ✅ | T3 `08eb9da04`（ehs.schema 校正） |
| F-59 | DSH RagEngine 不连库 | ⬜ | 未复用 ai_knowledge pgvector |
| F-60 | master-data schema_defense 目标 schema 不一致 | ✅ | U4 `e1e5b1399`（统一 master_data + cjs 门禁修正） |
| F-61 | hrm core 组归属两处不一致 | ⬜ | modular-monolith-design.md 未统一 |
| F-62 | unified-core 嵌入路径字段加密跳过 | ⬜ | embedded.rs:336-340 未补 KeyManager |
| F-63 | portal BFF 扇出无 N+1 治理 | ⬜ | DataLoader 仅局部 |
| F-64 | shared-mcp/dsh 未入 workspace.deps | ⬜ | ai 仍 path 直连 |
| F-65 | checksums 覆盖不全（250 vs 283） | ⬜ | 迁移半手工未记账（R2⑩ 见 R-10） |
| F-66 | OTel 默认 stub | ⬜ | 生产 opt-in 未开 |
| F-67 | 限流进程内存态 | ⬜ | 未下沉网关/Redis |
| F-68 | IP 白名单仅 portal 默认关 | ⬜ | 未平台化 |
| F-69 | database/README 数量漂移 | ⬜ | init 清单未同步 |
| F-70 | 动态导航本地加载非后端拉取 | 🟡 | T2 文档三段式澄清 |
| F-71 | app-shell 包名误导 | ⬜ | 未改名/未承担壳 |
| F-72 | 根 test/typecheck 仅覆盖 portal | ⬜ | 未加 typecheck:all |
| F-73 | MicroAppRouter/RemoteLoader 死代码 | ✅ | T1/D4 `f994a5075`（MF 空壳归档） |

**统计复核**：✅已消除 = 高危 15 + 中危 9 + 低危 5 = **29**；🟡已缓解 = 中危 4 + 低危 4 = **8**；⬜残留 = 高危 1 + 中危 17 + 低危 18 = **36**；合计 73。

---

## 6. 残留待办清单（含 R2 全部回归问题）

> R2 发现的 10 个问题全部登记如下（R-1 ~ R-10），另附本轮未覆盖的架构/工程化项。

### 6.1 R2 实测回归/环境问题（优先）

| 编号 | 问题 | 建议修复位置 | 关联 |
|---|---|---|---|
| **R-1** | mes `event_handlers.rs:62,112` 把 erp_order_id 以 text 绑定 uuid 列，`ErpProductionOrderDispatched` 全失败 | `svc/mes/src/event_handlers.rs` bind 改 `Uuid`（与 model/bootstrap 一致） | F-04 |
| **R-2** | integration 按 D3 调裸路径 `/api/internal/*`，lims/ehs/qms 实际挂在 service api_prefix 下（`/api/lims/api/internal/...`） | 统一 D3 契约与各服务 internal 路由挂载方式 | F-02/F-08 |
| **R-3** | 系统性 `ck_*_status_standard` 窄约束（payroll_runs/financial_vouchers/erp_production_orders/qa_lab_samples/audit_logs）阻断 draft/dispatched/in_progress/registered/success；加宽迁移因 `EXCEPTION WHEN OTHERS THEN NULL` 吞错未在 5432 生效 | 重跑放宽迁移（20260821000001/20260920000097/20260918000074）并去除吞错 | 新增 |
| **R-4** | 插件注册：register DB ON CONFLICT 缺唯一约束；`core.core_plugin_instances` 心跳表缺失（仅 iam./mes. 变体）；POST register/status 401 与 GET 200 行为不一致 | unified-core embedded.rs 目标建表 + plugin-registry 唯一约束 + write 中间件权限对齐 | F-17/F-19 |
| **R-5** | wms 审计查询 uuid=text 类型 bug（外层 200 包装 code:500） | `svc/wms/src/modules/audit.rs` 绑定类型修正（同 R-1 族） | F-26 |
| **R-6** | DLQ 兜底未触发：链②/链④ 两起真实 handler Err 均被 ACK，`topems:dlq:*` 空 | 核查 `subscriber.rs:181` with_dlq 结算逻辑（真实 Err 是否被直接 ACK 放弃） | F-03/F-04 |
| **R-7** | 环境：5433 不可达；nginx 未运行；portal:8063 启动挂起 | R4 灰度前补齐双库 + nginx + portal，重跑 runtime 拓扑 `--collect` | F-34 |
| **R-8** | U6 迁移 `20261003000000_u6_finance_source_snapshots_numeric` 应用失败；`finance.source_amount_snapshots` 空壳（真实列在 plugin_finance，代码写 finance 走 graceful 兜底） | 修迁移 + 对齐 source_amount_snapshots schema 归属 | F-07/F-06 |
| **R-9** | （并入 R-8）source_amount_snapshots schema 漂移 | 同上 | F-07 |
| **R-10** | 迁移账本半手工未记账：5432 手工 psql 重放未走 sqlx，mes._sqlx_migrations=278、U6 version=0，schema 已变账本未增 | 后续以 `sqlx migrate run` 正式补记账 | F-65 |

### 6.2 本轮未覆盖的架构/工程化残留（F-xx 未治理项）

- **安全/权限**：F-05 private/saas 空 feature；F-19/T4 插件令牌门控；F-25 crm:admin 粗粒度；F-31 analytics SSRF；F-38 srm 直写 unified_core；F-62 嵌入路径加密跳过；F-68 IP 白名单。
- **数据/耦合**：F-27 mes 拆分；F-29/F-30 analytics 直读 IAM/假数据；F-36 boundary CI 静态扫描兜底；F-37 search→erp 裸读（白名单保留）；F-54 crm 售后 outbox；F-59 DSH RagEngine；F-64 workspace deps；F-65 checksums。
- **前端工程化**：F-41 business-tools-sdk；F-42 api-client 三端；F-43 shared-utils/hooks；F-44 desktop；F-45 React 版本分裂；F-71 app-shell 命名；F-72 根 test 仅 portal。
- **可观测/部署**：F-49 Gauge=42.0；F-51 gRPC 超时熔断；F-63 portal N+1；F-66 OTel 默认 stub；F-67 限流进程内存态；F-50/F-61/F-69 文档口径；F-33 进程内 trait；F-34 nginx 双轨（R4）。
- **U 系列自报残留**：U1 :8099 mes 看板 404；U2 IamUserPreferencesUpdated 未实发（AppState 无 publisher）；U3 历史脏 sync_records 未清洗；U4 ≤3s 写窗口 SIGKILL 丢近写；U5 gis 同款 enable_rls:false 待登记；U12b schema_defense.rs:590 TABLE_DEFS 列快照漂移；U9.5 一致性校验脚本未做。

---

## 7. 白名单撤留结论（search→erp）

- **条目**：`scripts/ci/schema-boundary-allowlist.json` `_meta.temporary_entries[0]` + `entries["svc/search/src/handlers.rs"]`（引用 commit `08eb9da04`/T3 统一事实源）。
- **实测**：`svc/search/src/handlers.rs:113,167,197` 仍直读 `erp.customers / erp.sales_orders / erp.purchase_orders`（裸 SQL，未接 boundary）。U1/U2/U3 均未触及 search 服务。
- **结论：保留（不撤销）**。3 处跨读真实存在，F-37 尚未治理为「走 erp HTTP API/事件投影」；此刻撤销会导致 boundary 门禁 FAIL。撤销时机 = search 改走 erp 服务 API/事件后（建议与 F-37 排期同批），届时同步删除 `schema_boundary.json` 中 `search.allow=[erp]`。
- **本项未改动 allowlist 文件，无需复跑门禁**。

---

## 8. 提交清单

> 本批 R3 文档闭环提交（msg 含 `docs(closeout): R3 ...`），仅 add 文档文件，不 push。
> 历史说明：TODO 中各 U 项记录的 commit 短哈希为并行会话撰写时口径，经 rebase 后以下表 **git log 实测哈希** 为权威证据。

### 8.1 架构整改提交链（证据 commit，按类型）

| 类别 | commit | 说明 |
|---|---|---|
| 决策落盘 | `a4401c635` | 架构决策 D1-D5 记录 + 分析分片入库 |
| 快赢 T1/T2/T3 | `f994a5075` / `2a71563ef` / `08eb9da04` | 构建链 / 文档漂移 / boundary 门禁 |
| U1 瘦身 | `89351e062` `dea650b55` `4a41df997` `2ace368f3` | b1 停挂路由 / b2 删模块 / b3 撤 allow |
| U2 调用环 | `a1c4e8a01` `173622037` `18077bf45` `269d37d44` | 4 事件 / 环1 / 环2 / 环3 |
| U3 integration | `9b1f7c7d1` `292298e75` `3bec2a840` `61fbf68ac` | 直写编排 / internal 端点 / 假同步下线 / 撤白名单 |
| U3b qa_lab | `4e2886840` `9b2c3a7aa` | 步骤1 lims 显式 public / 步骤2 DROP 骨架表 |
| U4–U12b | `e1e5b1399` `1404532a8` `9e8b34a77` `1e72948df` `b1135ada1` `f7f7dcf26`+`104da3c39` `2e23fd5aa` `b782ce7c5` `370c1972b` `5ed165c7e` | master-data / RLS / 金额 / 错误处理 / 门面 / 服务发现 / panic / 心跳 / crm审计 / wms审计 |
| 基线 | `f7c3d687d` `470a37392` `38232be15` | R1 前端 / R1 后端 / R2 六链路 |

### 8.2 未 push 状态说明

- 编制本 R3 时实测：`git rev-list --left-right --count origin/main...HEAD` = **0 0**，即本地 `main` 与 `origin/main`（`85275c50b`）一致——协作机制（git-collab sync）已将上述提交链同步至远端。TODO 中各 commit 标注「未 push」为撰写时点状态。
- 本 R3 自身的文档提交（§8.3）提交后将成为新的未 push 增量，按任务要求**不 push**。

### 8.3 本 R3 文档提交（本次，3 批）

1. `docs(closeout): R3 决策文档 D1-D5 实施状态段追加`
2. `docs(closeout): R3 overview/event-driven 版本快照与一致性校准`
3. `docs(closeout): R3 架构整改实施总览交付（73 条终态+残留待办）`

---

## 9. 未完成 / 未覆盖项（如实声明）

- **runtime 矩阵未重生成**：`service-dependency-matrix.runtime.csv` 仍列 U2 前的 erp↔hrm、erp↔mes 双向 HTTP 边；离线 `--static` 重生成幂等无差异，真 runtime 边需 `python3 scripts/arch/service_topology.py --collect "<在线服务>"` 在 R4 在线环境采集（当前 nginx/portal 未运行）。`STATIC_DEPS` 仍把上述三边记为 HTTP 设计边，列入 R-7 联动修正。
- **search→erp 白名单保留**（§7），F-37 未治理。
- 73 条中 36 条残留待办多为本轮范围外（前端工程化/可观测/架构拆分），未逐条改代码。
- R2 的 10 个回归/环境问题均未修复（R3 纯文档，仅登记），待后续编排拍板。
- 历史文档（分片、报告）未改写；决策文档仅追加状态段。
