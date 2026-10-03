# unified-core 目标形态决策（D1 架构优化实施）

> 状态：✅ 决策已出（2026-10-02）· 归属：TODO.md「🚧 架构优化实施（2026-10-02）」阶段 0 · 关联：[unified-core 继续瘦身决策](./unified-core-slimming-decision.md)、[模块化单体设计](./modular-monolith-design.md)、[数据库设计](./database.md)、[架构总览](./overview.md)
> 依据：架构分析报告 `TOPEMS-架构分析报告-2026-10-02.md`（F-01/XCUT-01/CORE-01 等）+ `docs/audit/arch-analysis/CORE.md`。本文档所有路径与行号为 2026-10-02 实测。

## 1. 背景与决策问题

`svc/unified-core` 在 V13.0 声称"瘦身"（移除 erp/crm/hrm/wms/finance 业务模块，见 `docs/architecture/overview.md:340-348`），但代码事实是 23 个业务镜像模块仍在活跃导出、独立部署时挂载 24 个业务路由、跨 schema 直读 180 处业务表，且不受 `only_own_schema_query!` boundary 约束——这是 schema-boundary 门禁 FAIL 的根因（审计 M1），也是物理库拆分预案中"跨 schema 直读清零"阈值的阻塞项。

**决策问题**：unified-core 的目标形态是什么——恢复瘦身（删除业务投影）、承认单体（投影转正）、还是灰度下架（分批收敛）？该决策直接决定 `TODO.md` 阶段 2 的 U1（瘦身落地）与 U5（RLS 开启）的拆解方式。

## 2. 现状盘点（2026-10-02 实测）

### 2.1 代码事实

| 事实 | 证据位置（实测） |
|---|---|
| 23 个业务镜像模块仍 `pub mod` 活跃导出（erp/crm/hrm/wms/mes/scm/finance/qms/pdm/ehs/lims/rd/srm/gis/tms/ai/analytics/…） | `svc/unified-core/src/modules/mod.rs:36-81` |
| 独立模式（`embed_mode=false`）连续 merge **24 个业务路由**（wms/mes/scm/finance/erp/crm/hrm/qms/pdm/ehs/analytics/pm/lims/srm/gis/tms/master_data/communication/ticket/rd/integration/portal/mobile/ai） | `svc/unified-core/src/routes/mod.rs:267-313` |
| 嵌入模式（`embed_mode=true`，被 svc/server 挂载）只 merge `core_router`，**不挂**业务路由（注释"wms/mes/scm 由 server 统一提供"） | `svc/unified-core/src/routes/mod.rs:257-261` |
| 业务路由是**只读投影**（全 GET 列表）：如 `/api/crm/customers` list_*、`/api/finance/receivables` list_*、`/api/mes/dashboard/stats` | `svc/unified-core/src/routes/crm_routes.rs:12-20`、`finance_routes.rs:13-19`、`mes_routes.rs:14-23` |
| 投影直接跨 schema 直读业务表：如 `erp.purchase_orders` | `svc/unified-core/src/modules/erp/handlers.rs:38` |
| 跨业务 schema 限定引用合计 **180 处**（crm 15、tms/srm/lims/hrm/gis 各 10、wms/scm/rd/master_data/finance 各 8、qms/pdm/erp/ehs 各 6…），另 public 125 / iam 86 | `docs/audit/arch-analysis/CORE.md` §1.3 |
| unified-core 在 `scripts/schema_boundary.json` 中登记为可跨读方，业务投影不受 `only_own_schema_query!` 约束 | `scripts/schema_boundary.json:4,149` |
| 嵌入开关：`embed_mode: bool` 贯穿 `embedded.rs:43,273` 与 `routes/mod.rs:118,237-257` | 同上 |

### 2.2 运行时事实（决定选项可行性）

| 事实 | 证据位置（实测） |
|---|---|
| **生产 nginx 不把业务前缀转发到 unified-core**：`~^/api/erp/ → erp_service`、`~^/api/finance/ → finance_service`、`~^/api/crm/ → crm_service`、`~^/api/mes/ → mes_service`；unified-core 虚拟服务仅含已合并的 doc/monitor（`/api/core/*`），对 :8000 只有 `/health`、`/metrics` 转发 | `deploy/nginx/topems.conf:81,114-128,247-252` |
| **前端业务契约指向各独立服务**：`VITE_API_BASE_URL=/api`（同源代理 → nginx → 各服务端口）；平台能力走 `/api/core/{iam,flow,file,doc,automation,…}`（默认值定义于 `apps/web/src/config/runtime.ts`）；业务域 `/api/erp` 被 35 个前端文件使用、`/api/mes` 26、`/api/crm` 11、`/api/finance` 11 | `apps/web/.env.local:2`、`apps/web/src/config/runtime.ts:62-126`、grep 实测 |
| **svc/server 单体（:8099）嵌入 unified-core 仅含 core 路由**，业务能力由 server 的模块聚合提供（此前因 embedded 缺 mes dashboard 路由还补挂过 3 条） | `svc/server/src/main.rs:469-482,543-557` |
| 独立服务与投影**前缀重叠**：`svc/erp` 自身 `api_prefix: "/api/erp"`，与 unified-core 投影同前缀 | `svc/erp/src/main.rs:65` vs `svc/unified-core/src/routes/erp_routes.rs:13-24` |
| 未发现服务间/脚本直连 :8000 业务前缀的调用（grep 无命中） | 2026-10-02 抽样 |

### 2.3 文档声称 vs 代码（漂移）

| 文档声称 | 代码实际 | 结论 |
|---|---|---|
| `overview.md:340-348`：erp/crm/hrm/wms/finance 已迁独立服务，unified-core 仅保留 iam/doc/flow/file/mail/im/notification/plugin/search/communication | `modules/mod.rs:36-81` 23 个业务模块仍导出；`routes/mod.rs:267-313` 独立模式挂 24 个业务路由 | **漂移**：瘦身是文档层面完成、代码层面未完成 |
| `unified-core-slimming-decision.md`：物理拆分预案阈值含"跨 schema 直读清零" | 独立模式 180 处业务 schema 直读仍存在 | **未达成**（阻塞项） |

## 3. 关键前置事实核对（决定选项可行性）

### 3.1 路由双活性核对结论：**双活但不冲突的"第二实现"，生产无入向流量**

24 个业务投影路由与各独立服务使用**相同的 URL 前缀**（如 `/api/erp/*`），但：(a) 独立服务是完整 CRUD 主实现（nginx 唯一转发目标）；(b) 投影是只读 GET 子集；(c) 嵌入模式（:8099 单体）下投影不挂载。**生产 nginx 已证明业务前缀全部转发到独立服务**（topems.conf:122-128），投影路由当前无前端、无服务间、无 nginx 入向流量。即：投影是"瘦只读投影层"，双活但非并发冲突（只读 vs 读写），其存在价值仅为独立模式下的聚合只读视图——但该视图无人消费。

### 3.2 180 处直读业务表归属核对结论：**全部归属各独立服务，unified-core 仅是跨读方**

业务 schema（erp/finance/hrm/crm/mes/wms/scm/srm/qms/lims/ehs/rd/gis/tms/pm/pdm/master_data/ai/analytics 等）由各独立服务拥有（各服务 `main.rs` 的 SEARCH_PATH 指向自己的裸名 schema，对照 `database/migrations/000_create_schemas.sql:21-42` 的裸名 schema 清单）。unified-core 的 180 处引用全部是**只读投影查询**（无 INSERT/UPDATE），不构成数据归属争议，只有读耦合与边界穿透。平台共享层（public/core_*、unified_core）不在本次下架范围。

### 3.3 调用方核对结论：**投影路由无已知消费方，下架破坏面接近零**

- 前端：业务前缀经 nginx → 独立服务；平台前缀 `/api/core/*` 属于 unified-core 核心域（保留）。
- 服务间：服务调用经 SERVICE_URL env 指向各服务自身端口；未发现指向 :8000 业务前缀的调用。
- 运维/脚本：未发现脚本直连 :8000 业务前缀（2026-10-02 抽样 grep）。
- 结论：删除投影对现有流量无影响；唯一风险是"未登记的隐藏调用方"，通过分批停挂+回归可拦截。

## 4. 决策选项分析

### 选项 A 恢复瘦身（删除/禁用 23 个业务镜像模块与 24 个业务路由）

- **定义**：删除/注释 `modules/mod.rs:36-81` 的业务模块导出与 `routes/mod.rs:267-313` 的业务路由 merge；删除 180 处跨 schema 直读代码；业务能力完全收敛到各独立服务（或 svc/server 聚合）。
- **工作量**：中。删除代码 + 逐批验证调用方为零 + 全量回归；**无数据迁移**（投影只读，业务表本就归各服务）。
- **风险**：低-中。若存在未登记直连 :8000 业务前缀的调用方会断链；删除动作大、回退粒度粗（一次性提交）。
- **DB schema 归属与路由挂载影响**：归属不变（各业务 schema 仍归各服务）；独立模式不再挂业务路由（等效强制 `embed_mode=true` 行为），路由唯一入口 = 各独立服务 / svc/server :8099。
- **对 D2/D3/D4 联动**：D2 无影响（调用环在业务服务之间）；D3 正向（unified-core 不再需要业务 schema allowlist，boundary 门禁从"已知 FAIL"走向清零）；D4 无影响（前端契约不指向投影）。

### 选项 B 承认单体（镜像模块转正为"只读投影层"）

- **定义**：投影模块正式转正，文档改口（overview.md 改为"unified-core 含业务只读投影"），补 schema-boundary allowlist 注释，明确"只读仪表盘层"定位。
- **工作量**：低。文档 + 白名单登记。
- **风险**：低（代码不动），但**长期成本高**：180 处跨读持续存在（物理库拆分"跨读清零"阈值永远达不到）；同前缀双实现歧义持续（维护者需区分两套 /api/erp）；与瘦身决策文档（unified-core-slimming-decision.md）方向冲突。
- **DB schema 归属与路由挂载影响**：需长期声明 unified-core 对 16+ 业务 schema 的只读访问权；路由双活保留。
- **对 D2/D3/D4 联动**：D3 的 boundary 治理需长期维护业务 allow；D2/D4 无影响。

### 选项 C 灰度下架（推荐）

- **定义**：按模块组/按流量分**批次**下架：每批依次 ① 验证调用方为零（grep 前端/服务间/脚本 + nginx 转发确认）→ ② 停挂路由（先注释 `routes/mod.rs` 对应 merge，观察回归）→ ③ 删除镜像模块目录与跨读代码 → ④ 回归（独立服务全量路由 + 前端 e2e）。任一批发现调用方即暂停该批并登记迁移。
- **工作量**：中。分批执行，每批含验证+删除+回归；总工作量 ≈ A，但每步可回退。
- **风险**：低。分批停挂先于删除，任何异常可在单文件粒度回退；生产 nginx 已证实无业务前缀流量到 :8000，破坏面接近零。
- **DB schema 归属与路由挂载影响**：逐批释放跨读；终态与 A 相同（unified-core 只保留 iam/doc/flow/file/tenant/plugin/audit/communication/monitor 等平台域 + public 共享层）。
- **对 D2/D3/D4 联动**：同 A（D3 正向收敛；D2/D4 无影响）；且与 U5（RLS 开启）联动——下架完成后 unified-core 的 RLS 策略范围收敛到平台域，边界更清晰。

## 5. 推荐与理由

**推荐：选项 C 灰度下架**，目标终态 = 选项 A 的瘦身形态（unified-core 只保留平台核心域）。理由：

1. **运行时证据充分**：生产 nginx 已证明业务前缀全部转发到各独立服务（`deploy/nginx/topems.conf:122-128`），:8000 的业务投影当前无任何入向流量——"瘦身名存实亡"是既有事实，下架只是让代码与事实一致，破坏面接近零。
2. **与既定方向一致**：`overview.md:348` 的瘦身声明、`unified-core-slimming-decision.md` 的"跨 schema 直读清零"阈值、schema-boundary 门禁的治理目标，三者都指向同一终态；C 是实现该终态风险最低的路径。
3. **与 private/saas 空 feature 现状相容**：瘦身不依赖部署模式切换；瘦身后的 unified-core 定位更接近"平台核心（IAM/Flow/File/Tenant/Plugin）"，为将来 SaaS 化（HTTP 模式）铺平边界。
4. **不破坏前端契约**：前端 `/api/core/{iam,flow,file,doc,…}`（平台能力）与 `/api/{erp,mes,crm,finance}`（各独立服务）都**不指向业务投影**，下架对前端零影响（`apps/web/.env.local:2`、nginx 转发规则）。
5. **与 D2/D3 正向联动**：不增加调用环（环在业务服务间）；撤销业务 schema allowlist 后 boundary 门禁清零，D3 的 integration 直写治理更聚焦。
6. **可回退**：停挂先于删除、单文件粒度回退、无数据迁移（投影只读）。

否决 A（一次性删除）的理由：A 的终态与 C 相同，但一次性提交回退粒度粗、无观察窗口；C 以批次换取可验证性，成本相近。否决 B 的理由：B 是"现状合法化"，不解决 180 处跨读对物理拆分的阻塞，长期维护成本最高。

## 6. 决策影响与实施路径（对应 TODO.md 阶段 2 U1/U5）

### 6.1 U1 unified-core 瘦身落地（依赖 D1）

拆解要点（按批，批次建议：先低流量组 crm/portal/mobile/analytics/master_data/communication/ticket，再 erp/finance/hrm，最后 mes/wms/scm/srm/pm/pdm/qms/lims/ehs/rd/gis/tms/integration/ai）：

| 步骤 | 内容 | 证据/入口 |
|---|---|---|
| U1.1 | 逐路由调用方验证（前端 grep `/api/<module>` 指向、服务间 SERVICE_URL、脚本直连 :8000），形成"零调用方"清单 | `deploy/nginx/topems.conf:122-128` 作主依据 |
| U1.2 | 停挂：注释 `routes/mod.rs:267-313` 对应 merge（保留注释记录原状） | `svc/unified-core/src/routes/mod.rs:267-313` |
| U1.3 | 删除镜像模块目录与 180 处跨读（`svc/unified-core/src/modules/<module>/`、`modules/mod.rs:36-81` 对应行） | `svc/unified-core/src/modules/mod.rs:36-81` |
| U1.4 | 撤销 `scripts/schema_boundary.json` 中 unified-core 对业务 schema 的 allow 登记 | `scripts/schema_boundary.json:149` |
| U1.5 | 文档回写：`overview.md:348` 校准、`modular-monolith-design.md` 模块组描述、`unified-core-slimming-decision.md` 状态更新 | — |

**验收标准（可测量）**：
1. 独立模式（`embed_mode=false`）下 unified-core 业务路由数 = 0（`routes/mod.rs` 无业务 merge；抽样 `curl :8000/api/erp/...` 404）。
2. `svc/unified-core/src` 对业务 schema 名的 SQL 引用 = 0（grep erp./finance./mes. 等 16+ schema 前缀，排除注释与公共层）。
3. boundary 门禁零 FAIL（`scripts/schema_boundary.json` 无业务 allow 残留）。
4. `cargo check --workspace` 0 错误；svc/server :8099 与各独立服务全量路由 e2e 绿（前端主路径不受影响）。
5. 每批提交独立，可单文件 revert 回退。

### 6.2 U5 RLS 开启与租户隔离修复（依赖 D1 的 schema 归属确认）

拆解要点：
1. D1 下架完成后，unified-core 数据面收敛到平台域（iam/doc/flow/file/tenant/audit + public 共享层），RLS 策略声明范围与之一致。
2. 开启 `svc/finance` 的 `enable_rls: true`（`svc/finance/src/main.rs:244`），前置核对 finance 表 tenant_id 字段覆盖与策略（对照 unified-core `middleware/tenant_rls.rs:170-178` 机制）。
3. 修复 `tenant_rls.rs:170-178` 会话 GUC 设在连接池连接上、业务查询借连接不保证生效的问题（改为查询级显式租户参数或连接级绑定，报告 CORE-06）。

**验收标准（可测量）**：
1. finance RLS 开启后跨租户查询返回空集（单测覆盖）。
2. unified-core 平台域 RLS 策略与下架后的 schema 集合一致（无失效策略）。
3. 既有多租户 e2e 全绿；`grep enable_rls: false svc/*/src/main.rs` 结果为 0。

## 7. 风险与回退

| 风险 | 缓解 |
|---|---|
| 某投影路由存在未登记隐藏调用方（内部脚本/BI 直连 :8000） | 每批停挂前 grep 验证可拦截；发现即暂停该批并登记调用方迁移路径 |
| 停挂后前端/服务间出现 404（理论应为零，防御性验证） | 停挂先于删除，观察窗口内可单文件 revert；nginx 转发规则不变，404 只可能来自直连 :8000 |
| 删除镜像模块后发现遗留依赖（如 svc/server 曾补挂 mes dashboard 3 条路由的先例） | 删除前对 24 个投影逐一比对 svc/server `main.rs:543-557` 等补挂清单，确认 server 聚合已覆盖 |
| 文档回写滞后造成新一轮漂移 | U1.5 与代码删除同批提交，验收项 3/5 强制关联 |

**回退路径**：停挂阶段 = 单文件 git revert；删除阶段 = 从 git 历史恢复模块代码（无数据迁移，投影只读）；已撤销的 boundary allow 可按原值恢复。

---

## 8. 实施状态（2026-10-03）

> 本节为 R3「文档与实现对齐闭环」追加，记录 D1 方案落地的最终 commit、验证结果与偏差；不改动上文决策内容。

- **方案要点**：推荐 C（灰度下架）→ 终态 A（瘦身）。停挂 24 条业务投影路由 → 删除 23 个业务镜像模块与 180 处跨 schema 直读 → 撤销 unified-core 对 21 个业务 schema 的 boundary allow。
- **实施 commit**（阶段 2 U1）：
  - `89351e062` U1-b1 停挂业务投影路由（独立模式移除 24 条业务 merge + `/ws/mes/dashboard`）；
  - `dea650b55` U1-b2 删除 23 业务镜像模块与 180 处跨读 + 解引用 svc/server mes 借用；
  - `4a41df997` U1-b2 补全 24 个业务投影 routes 文件删除；
  - `2ace368f3` U1-b3 撤销 unified-core 21 业务 schema 跨读白名单。
- **验证结果**：独立模式业务路由 = 0；`svc/unified-core/src/modules/` 现仅余平台域模块（audit/automation/communication/doc/file/flow/iam/master/menu/settings/subscription/system_audit/tenant 等），无 erp/hrm/wms/crm/qms 业务镜像；PY 门禁 exit 0（unified-core 119 引用全 public/自有）、NODE 门禁 PASS；`cargo check --workspace` 0 错误（R1 基线 `f7c3d687d`/`470a37392`）。
- **联动**：U5 RLS（`1404532a8`）在 unified-core 数据面收敛平台域后启动 finance RLS 与 tenant_rls 修复。
- **偏差/残留**：
  - :8099 直跑时 mes 看板 REST 端点 404（生产 nginx 转独立服务无影响，已登记）；
  - F-11（unified-core analytics 死模块）/ F-28（unified-core 直读 ai schema）随 23 业务镜像模块一并删除，确认消除；
  - search→erp 跨读（F-37）不在 D1 范围，仍保留于临时白名单，见总览残留待办。
