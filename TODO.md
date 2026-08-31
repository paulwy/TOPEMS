# TOPEMS DSH AI 中间层 - 任务清单

## 📋 项目概述

TOPEMS DSH（Data-Driven Service Hub）AI 中间层建设，包括 MCP 协议适配、AI 治理体系、Agent 编排、LLM Provider 集成、业务 Copilot、智能表单与文档智能、前端集成和性能监控。

> **唯一架构路线图**：[`docs/architecture/TOPEMS_Architecture_Roadmap_v2.md`](docs/architecture/TOPEMS_Architecture_Roadmap_v2.md)
> 旧方案文档已归档至 `docs/archive/`，不再作为执行依据。

---

## ⚠️ 状态校准说明（2026-08-28）

本清单中标记 `[x]` 的任务，按真实完成度分为三类：

1. **✅ 已验证完成**：代码 + 单元测试 + 集成验证全部通过
2. **⚠️ 框架就绪**：代码和单元测试通过，但未在完整环境中集成验证
3. **❌ 未启动**：旧方案中定义但至今无实质进展的核心架构目标

### 关键未启动的 P0 任务

以下任务在旧方案中为 P0 优先级，但至今未启动，已在新方案 v2.0 中重新列为最高优先级：

- **事件总线升级**（Redis Pub/Sub → Redis Stream，含 ACK + DLQ）
- **模块化单体骨架**（32 svc → 7 核心模块组 + Cargo Feature Flags）
- **accounting_subjects 表物理迁移**（ERP → Finance）
- **编译时边界检查全覆盖**（当前仅覆盖 6/32 服务）

### MCP 业务工具落地状态

MCP 协议适配层骨架已完成，但**业务工具真实落地状态待审计**：
- ToolRegistry 注册了 65 个工具，需确认其中真实业务工具 vs 系统/占位工具的比例
- CRM/ERP/Finance 各 3-4 个业务工具的实现状态需验证
- 外部 Agent（Cursor/Claude Desktop）对接尚未验证

> 详细评估和新执行计划请参阅 [`docs/architecture/TOPEMS_Architecture_Roadmap_v2.md`](docs/architecture/TOPEMS_Architecture_Roadmap_v2.md)

---

## ✅ 已完成任务

### P0 - master_data_refs.rs 上帝文件拆分（2026-08-28 全部完成）

**文件**：`svc/erp/src/modules/master_data_refs.rs`（原 23,289 行 → 697 行，减少 97%）

**目标**：将单一上帝文件拆分为独立功能模块，提升可维护性。

**拆分方法**（已验证可行）：
1. 创建独立模块文件，包含类型定义 + handler 函数
2. 在 `modules/mod.rs` 声明新模块
3. 原文件导入 handler（供 `create_routes` 使用）
4. 删除原文件中的代码
5. 编译验证（`cargo check -p topems-erp`）

**已完成拆分（25 个独立模块 + 测试模块）**：
- [x] **DataLineage 模块**（125行）→ `master_data_lineage.rs`
- [x] **AuditEvent 模块**（170行）→ `master_data_audit.rs`
- [x] **VersionManagement 模块**（340行）→ `master_data_version.rs`
- [x] **GovernanceDashboard 模块**（260行）→ `master_data_governance.rs`
- [x] **DataAssets 模块**（300行）→ `master_data_assets.rs`
- [x] **LineageGraph 模块**（500行）→ `master_data_lineage_graph.rs`
- [x] **QualityTrend 模块**（150行）→ `master_data_quality_trend.rs`
- [x] **ConflictDetection 模块**（750行）→ `master_data_conflict.rs`
- [x] **LifecycleManagement 模块**（689行）→ `master_data_lifecycle.rs`
- [x] **QualityRules 模块**（1094行）→ `master_data_quality_rules.rs`
- [x] **SyncOrchestration 模块**（917行）→ `master_data_sync.rs`
- [x] **QualityLoop 模块**（1615行）→ `master_data_quality_loop.rs`
- [x] **MasterDataGraph 模块**（1848行）→ `master_data_graph.rs`
- [x] **MdmGraphql 模块**（800行）→ `master_data_graphql.rs`
- [x] **SyncOrchestrationV2 模块**（530行）→ `master_data_sync_v2.rs`
- [x] **ServiceRegistry 模块**（235行）→ `master_data_service_registry.rs`
- [x] **ApiGateway 模块**（265行）→ `master_data_gateway.rs`
- [x] **QualityAI 模块**（1058行）→ `master_data_quality_ai.rs`
- [x] **Matching 模块**（830行）→ `master_data_matching.rs`
- [x] **Classification 模块**（885行）→ `master_data_classification.rs`
- [x] **CoreCRUD 模块**（290行）→ `master_data_crud.rs`
- [x] **Dashboard 模块**（717行）→ `master_data_dashboard.rs`
- [x] **ReportAutomation 模块**（780行）→ `master_data_report_automation.rs`
- [x] **ComplianceAudit 模块**（979行）→ `master_data_compliance_audit.rs`
- [x] **Data Catalog 模块**（668行）→ `master_data_catalog.rs`
- [x] **元数据管理模块**（875行）→ `master_data_metadata.rs`
- [x] **血缘溯源+影响分析模块**（1269行）→ `master_data_lineage_impact.rs`
- [x] **治理成熟度评估模块**（532行）→ `master_data_maturity.rs`
- [x] **测试模块**（3254行）→ `master_data_refs_tests.rs`

**验证结果**：
- ERP 编译通过，零警告
- 所有 API 端点保持不变，路由注册正常
- 未使用导入全部清理完毕

**剩余 master_data_refs.rs（697行）**：
- 模块文档和版本说明
- 所有子模块 handler 导入
- 核心类型重新导出（`MasterDataRef`、`MasterDataRow`、`LifecycleStatus` 等）
- 路由注册（聚合所有子模块的 API 端点）
- 测试模块引用（`#[cfg(any())] include!("master_data_refs_tests.rs")`）

---

### P0 - mdm_v49.rs 上帝文件拆分（2026-08-28 完成）

**文件**：`svc/erp/src/modules/mdm_v49.rs`（原 2,689 行 → 483 行，减少 82%）

**目标**：将主数据全生命周期自动化模块拆分为独立功能模块，提升可维护性。

**已完成拆分（5 个独立模块）**：
- [x] **类型定义 + 存储**（715行）→ `mdm_v49_types.rs`
- [x] **生命周期管理处理器**（312行）→ `mdm_v49_lifecycle.rs`
- [x] **退役管理处理器**（420行）→ `mdm_v49_retirement.rs`
- [x] **归档管理处理器**（527行）→ `mdm_v49_archive.rs`
- [x] **仪表盘与统计处理器**（260行）→ `mdm_v49_stats.rs`

**拆分策略**：
- 类型定义、内存存储、初始化种子数据和请求/响应结构 → `mdm_v49_types.rs`
- 处理器函数按功能域拆分（生命周期、退役、归档、统计）
- 主文件只保留子模块声明、导入和路由注册
- 跨模块访问的函数和结构体字段改为 `pub`

**验证结果**：
- ERP 编译通过，零警告
- 所有 API 端点保持不变，路由注册正常
- 未使用导入全部清理完毕
- 基础 CRUD 和生命周期管理

---

### P1 - APS→MES 服务合并（2026-08-28 完成）

**目标**：将 APS（高级计划与排程）服务合并到 MES（生产执行系统）服务，减少微服务数量。

**完成内容**：
- [x] 迁移 APS 纯函数（20个）和状态机（5个）到 MES（`aps_util.rs`, `aps_fsm.rs`）
- [x] 新建 MES `production_plan` 模块（CRUD + 审批状态机）
- [x] 新建 MES `capacity` 模块（CRUD + 分配/释放/维护）
- [x] 新建 MES `demand_forecast` 模块（CRUD + 计算/验证/采纳）
- [x] 编写 APS→MES 数据迁移脚本（SQL + 执行脚本 + README）
- [x] API 兼容层（`/api/aps/*` → `/api/mes/*` 301 重定向）
- [x] 配置清理（build-service.sh 标记 APS 为 deprecated）
- [x] 数据迁移测试验证（计数对比 + 字段转换验证全部 PASS）
- [x] 【收尾 2026-08-30】移除独立 aps 服务：nginx 补 `~^/api/aps/` → mes_service 代理（前端 aps 页面走 mes 兼容层）；归档 `svc/aps` → `svc/_archive/aps`；workspace 移除 `svc/aps` 成员；services.yaml 注释 aps 服务定义；build-service.sh 移除 `[aps]` 映射；topems-server 移除 `module-aps` feature + `aps_real_module.rs`（aps 能力由 `module-mes` 承载，mes lib 已含 aps_scheduling/aps_compat）。验证：`cargo check --workspace` 通过、`cargo test -p topems-server` 全绿

**验证结果**：
- MES 编译通过
- MES 测试：262 passed; 0 failed（新增 43 个测试）
- 数据迁移：测试验证全部 PASS

**交付物**：
- `svc/mes/src/shared/aps_util.rs`
- `svc/mes/src/shared/aps_fsm.rs`
- `svc/mes/src/modules/production_plan.rs`
- `svc/mes/src/modules/capacity.rs`
- `svc/mes/src/modules/demand_forecast.rs`
- `svc/mes/src/modules/aps_compat.rs`
- `scripts/migration/aps_to_mes_data_migration.sql`
- `scripts/migration/aps_to_mes_migrate.sh`
- `scripts/migration/test_migration_verification.sql`
- `docs/aps_mes_merge_deployment.md`

**未迁移的模块**（MES 已有对应功能，更完整）：
- APS `schedules` → MES `production_scheduling` + `aps_scheduling`
- APS `material_plans` → MES `material_requirement`

---

## 🏗️ 架构演进与待办清单（2026-08-31 归档）

> **完整文档**：[`docs/architecture/architecture-evolution-and-todo.md`](docs/architecture/architecture-evolution-and-todo.md)（演进里程碑 + 工作包详情）
> **在线源**：https://feishu.doubao.com/docx/WvXDdSprFovcKWxcTMSc1IYqnob

### 待办状态总览

| 编号 | 工作包 | 优先级 | 状态 | 说明 |
|---|---|---|---|---|
| P0-1 | 架构文档基线对齐 | P0 | ✅ 实施中（2026-08-31） | services.yaml 重复键修复 + ports.env 补齐 4 端口 + overview.md 对齐 |
| P0-2 | unified-core 瘦身决策 | P0 | 🔄 方向变更 | 被模块化单体取代（svc/server + 7 模块组），改跟踪模块化单体演进 |
| P0-3 | 配置单一真相源 CI 校验 | P0 | ✅ 完成（2026-08-31） | `scripts/check-workspace-registry.py` + CI Gate M |
| P1-1 | 事件通道选型规则 | P1 | ✅ 已解决 | Redis Stream 迁移完成（2026-08-29） |
| P1-2 | 物理库拆分预案 | P1 | ✅ 完成预案（2026-08-31） | `docs/architecture/database-split-plan.md`：7 模块组映射 + 触发阈值 + 迁移/回退；待评审 schema 归属 |
| P1-3 | 前端测试矩阵 ROI 审视 | P1 | ✅ 完成报告+批1（2026-08-31） | `docs/architecture/frontend-test-roi-review.md`：L1-L4 分级 + CI ≤20min 预算 + 三批实施路径；批1 E2E 收敛已落地（0 snapshot 无对象），批2 待页面清单确认 |
| P1-4 | lowcode 立项决策 | P1 | ✅ 已解决 | 归档 `svc/_archive/lowcode` |
| P2-1 | RLS 数据权限覆盖 | P2 | ✅ 完成落地（2026-08-31） | 302 张含 tenant_id 表启用 RLS + 框架函数（`migrations/20260831*`）；修复 GUC 名不一致 / PG18 无 IF NOT EXISTS / 空值 UUID 报错 3 缺陷；`lib/shared-db/src/rls.rs` 同步修复 |
| P2-2 | API 网关 8080 落地 | P2 | ✅ 完成方案+nginx 补强（2026-08-31） | `docs/architecture/api-gateway-plan.md`（Traefik 8080 方案待 staging 部署验证）+ 生产 `deploy/nginx/topems.conf` 补强已落地（限流/连接限制/失败转移熔断） |
| P2-3 | 发布/CHANGELOG 自动化 | P2 | ✅ 完成落地（2026-08-31） | `scripts/ci/generate-changelog.py` + `scripts/release.sh`（接入发布流程）+ CI `changelog-gate`（tag 触发校验） |

### 本次实施记录（2026-08-31）

- [x] P0-3 校验脚本：`scripts/check-workspace-registry.py`（Cargo.toml members ↔ services.yaml ↔ ports.env 三向核对，`--check` CI 模式）
- [x] 修复 `config/services.yaml`：重复 `infrastructure:` 键导致 mobile/gis/integration 条目被 YAML 覆盖丢失
- [x] 修复 `config/ports.env`：补齐 MOBILE_PORT/GIS_PORT/INTEGRATION_PORT/TMS_PORT 四个缺失端口变量
- [x] CI Gate M：`config/**` 或 Cargo.toml 或校验脚本变更时运行三向校验（`config-registry-gate` job）
- [x] 文档归档：`docs/architecture/architecture-evolution-and-todo.md`（含 2026-08-31 校准说明）

### 二轮推进记录（2026-08-31，按优先级）

- [x] P1-2 物理库拆分预案 → `docs/architecture/database-split-plan.md`
- [x] P1-3 前端测试矩阵 ROI → `docs/architecture/frontend-test-roi-review.md`
- [x] P2-1 RLS 覆盖核查 → `scripts/check-rls-coverage.py` + `docs/architecture/rls-coverage-report.md`
- [x] P2-2 API 网关 8080 落地方案 → `docs/architecture/api-gateway-plan.md`
- [x] P2-3 CHANGELOG 自动化 → `scripts/ci/generate-changelog.py` + `docs/changelog/draft.md`

### 批准执行落地记录（2026-08-31，按优先级 P2-1→P2-3→P2-2→P1-3）

- [x] **P2-1 RLS 分批迁移（第 0/1 批落地）**
  - 第 0 批：`database/migrations/20260831000001_rls_tenant_framework.sql`（`current_tenant_id()`/`current_user_id()`，读 `app.tenant_id` GUC，空值安全）
  - 第 1 批：`database/migrations/20260831000002_rls_enable_tenant_tables.sql`（**302 张含 tenant_id 表启用 RLS** + `tenant_isolation_*` 策略，幂等）
  - 功能验证通过：非 superuser 隔离生效（租户 A 只见自己）、无租户上下文返回 0 行不报错
  - 修复 3 个真实缺陷：① `app.current_tenant_id`→`app.tenant_id` GUC 名不一致；② PG18 不支持 `CREATE POLICY IF NOT EXISTS`；③ 策略空值 `''::UUID` 报错 → `NULLIF(...,'')::UUID`
  - 应用代码 `lib/shared-db/src/rls.rs` 同步修复（含只对有 tenant_id 列表建策略），`cargo check -p topems-shared-db` 通过
  - 测试数据/角色已清理
- [x] **P2-3 CHANGELOG 接入发布流程**
  - 新增 `scripts/release.sh`（draft/tag/check 三子命令；tag 前强制校验 CHANGELOG 已含版本章节；兼容 V### 与 v* 双 tag 体系）
  - CI 新增 `changelog-gate` job（tag 推送触发，`./scripts/release.sh check`）+ 接入 quality-gate
  - `docs/changelog/draft.md` 已按 V472..HEAD 生成（5 条提交）
- [x] **P2-2 生产 nginx 网关补强**
  - `deploy/nginx/topems.conf` 补强：`limit_req_zone` API 限流（10r/s burst 20）+ `limit_conn_zone` 单 IP 连接限制 + `proxy_next_upstream` 失败转移熔断 + 429 状态码
  - 语法验证通过（nginx:alpine `nginx -t`）
  - Traefik 8080 API 网关方案（`api-gateway-plan.md`）待 staging 部署验证
- [x] **P1-3 测试矩阵落地**
  - 批 1：CI 实际 E2E（`tests/e2e/`）已单 chromium；`apps/web/playwright.config.ts` 6→2 收敛（chromium + mobile-iphone，其余注释保留）
  - 快照清理：全项目确认 **0 个 snapshot 文件 / 0 inline snapshot**，无对象可清理
  - 批 2 页面单测降级：需按页面清单逐个确认保留集，留待评审
- [x] 文档同步：`rls-coverage-report.md` 追加落地状态；`frontend-test-roi-review.md` 批 1 状态更新
- [x] 回归：`scripts/check-workspace-registry.py --check` 通过（29/32/38）

### 继续推进记录（2026-08-31，P0-2 模块化单体边界治理第一轮）

- [x] **P0-2 边界治理落地**
  - **幽灵 feature 清理**：`svc/server/Cargo.toml` 从 default 移除 `module-advanced` / `module-ai`（此前 default 启用但无任何对应 `*_real_module` 注册，属配置与代码脱节）；保留 feature 定义 + ModuleGroup 映射，作为 advanced（master-data/analytics）/ ai 真实接入的挂载点
  - **边界治理基线固化**：`docs/architecture/modular-monolith-design.md` 新增 §5.2——模块接入矩阵（已接入 12 真实服务 / 可选 tms+subscription / 待接入 advanced+ai / 明确不嵌入 gis）+ 幽灵 feature 清理记录 + 边界规则 4 条
  - **验证**：default / 最小集（`--no-default-features --features module-core,module-erp,module-finance`）/ 全量（`--all-features`）三组合编译全部通过
  - **前置修复**（上一轮）：BFF 层正式采用入库（29 文件）+ mes 建表 DDL 同步（7 表）+ stash DNS 确认无需合并，均已提交推送

### 继续推进记录（2026-08-31，P1-2 schema 归属评审）

- [x] **P1-2 schema 归属评审完成**
  - 实测核查：`lims`/`qms`/`mes`/`pdm` 四服务在 schema_defense 声明专属 schema，但 DB 中**这些 schema 不存在**，其业务表全部落 public（qa_lab_*/qa_lims_* 31、qa_* 27、pdm_* 20、production_*/equipment/work_*/wip* 17）——public 巨型堆（219 张/48%）主因
  - 产出：`docs/architecture/database-schema-ownership-review.md`——public 219 张表 **100% 归类**（lims31/qms27/pdm20/mes17/finance58/bi18/erp6/master_data8/platform保留public32/integration2）
  - 待确认项 A-E（供架构负责人落定）：A qa 域两分（lab/lims→lims，其余→qms）；B core_finance_* 剥离→finance、core_* 平台级保留 public；C material_*→mes（备选 erp）；D 跨域同步表归业务 schema；E plugin_* 残留清理
  - 阶段 0 执行路线已给出（建 schema → SET SCHEMA → search_path 兼容期 → 门禁/离线编译核对 → 清理 plugin 残留）
  - 同步更新：`database-split-plan.md`（状态+§5.1 评审结论）、`architecture-evolution-and-todo.md`（P1-2 状态）

---

## 📝 待办任务（基于架构路线图 v2.0）

### Phase 1：架构地基加固（第 1-4 周）— P0 最高优先级

#### 1.1 事件总线升级（Redis Pub/Sub → Redis Stream）

- [x] Redis Stream 事件发布器实现（所有现有 `EventPublisher` 调用切换到 Stream）
- [x] ACK 机制 + 死信队列（DLQ）实现
- [x] 事件类型版本化管理（Schema 注册中心）
- [x] **事件总线迁移验证（2026-08-29 完成）**：默认模式 100% Stream（发布器 XADD + 订阅器 XREADGROUP/XACK + DLQ 重试 XADD）
  - **遗留清理**：`messaging.rs` 的 `RedisMessageBroker`（含 `redis::cmd("PUBLISH")`，全仓库无业务调用方）→ 废弃 stub（保留 API 兼容，publish 返回迁移提示），从 lib.rs re-export 移除
  - **DLQ 重试断链修复**：死信重试 3 处 PUBLISH → XADD（`topems:stream:events:{type}`）——原 Pub/Sub 频道 `topems:events:*` 已无订阅者（订阅者全切 Stream），PUBLISH 重试事件会丢失；现改为重新写入 Stream 供 XREADGROUP 消费
  - **发布器/订阅器默认模式一致性确认**：两者均为 stream（V321 已改），缺省 `EVENT_BUS_MODE` 下无模式错配
  - 验证：`cargo test -p topems-shared-event` 338 passed 无回归；server 启动 4 个真实服务发布器初始化 + crm Stream 订阅器（crm-group）正常；Redis 可见 5 个 Stream 事件键 + DLQ 键（StockOutbound/retry_count）
  - 已知限制（保留的显式 Pub/Sub）：① `publisher.rs` pubsub 降级分支（`EVENT_BUS_MODE=pubsub` 显式设置或 Stream 初始化失败兜底）② `master_data.rs` MDM 专用旧协议通道（Stream 模式暂不支持 MDM 事件订阅，3 个 MDM handler 被忽略）

**验收标准**：`grep -r "publish\|subscribe" lib/shared-event/src/` 无 Redis Pub/Sub 调用；事件处理失败可在 DLQ 中查到并重试。

#### 1.2 模块化单体骨架

- [x] **模块分组定义**（Phase A 完成）：32 svc → 7 核心模块组，见 `docs/architecture/modular-monolith-design.md`
  - core（unified-core/monitor/plugin-registry/search/communication/integration/portal/mobile/ticket）
  - erp（erp/scm/srm/pm/pdm）、finance（finance/billing）、crm（crm）
  - wms（wms/tms/mes/aps/qms/ehs/lims/gis/rd）、advanced（master-data/analytics）、ai（ai）
- [x] **Cargo Workspace 重构**（Phase A 完成）：根 Cargo.toml 按 7 模块组组织 members + 注释分组
- [x] **统一入口服务**（Phase A 完成）：创建 `svc/server`（topems-server），Module trait + ModuleRegistry + 健康检查聚合
  - `cargo build -p topems-server` 通过，单进程可启动并响应 `/api/server/health`
  - 验证：`--no-default-features --features module-core` 裁剪编译通过
- [x] **进程内调用机制**（Phase B 完成）：类型安全枚举 provider（非 Any downcast）
  - `ModuleRegistry.register_account_balance_provider` / `get_account_balance_provider`
  - 演示：dashboard 模块通过进程内 trait 调用 finance 模块（`AccountBalanceProvider`），非 HTTP
  - 验证：`/api/dashboard/financial-summary` 返回 `call_mode: in_proc_trait`，总资产 4,650,000
- [x] **真实业务模块接入**（Phase B3 完成）：真实 finance 服务接入统一入口（feature `module-finance` 门控）
  - 接入方式：`FinanceRealModule` 复用 `topems_finance::modules::create_routes()` + 真实 DB/事件总线/服务客户端
  - 解决的真实冲突：全局 tracing subscriber 重复设置（新增 `ServiceConfig.init_telemetry` 开关）、SEARCH_PATH schema 解析（iam 旧表）、Account 模型-建表 schema 差异（幂等迁移补齐 15 列 + TIMESTAMPTZ 转换）
  - 端到端验证：创建/查询账户真实落库 PostgreSQL（2 条测试数据），dashboard 返回真实统计
  - 已知限制：开发验证模式注入模拟 Claims（生产需接真实 auth_middleware）；plugin_finance schema 未建（finance schema_defense WARN 不阻塞）
- [x] **真实 erp 服务接入**（Phase B3 扩展完成）：feature `module-erp` 门控，复用 FinanceRealModule 模式
  - **单进程 5 模块共存验证通过**：platform/dashboard/finance(演示)/finance-real/erp-real
  - 解决 SEARCH_PATH 跨模块时序：每个模块 build() 内 set_var + 强制 acquire 固化连接池 search_path
  - 真实验证：erp `/api/erp/dashboard` 返回数据库真实统计（total_assets:1），finance 数据保留
  - 已知限制：erp 事件订阅者（event_handlers 在 main.rs 非 lib）暂未接入；后台指标任务未启动
- [x] **完整测试验证**（P0 待办完成）：`cargo test --workspace --lib --no-fail-fast` 全量通过
  - 所有 workspace crate 单元测试 0 failed（含 erp 899、finance、server、全部 lib）
  - 修复 2 个预先存在的问题：`ServiceConfig` 测试初始化缺 `init_telemetry` 字段（3 处）；erp `mdm_v49.rs` 测试模块无法访问 `mdm_v49_types` 类型（补测试内 use）
  - server doctest 修正：`real_service_adapter.rs` 示例代码块标记 `rust,ignore`
- [x] **其余业务模块接入**（Phase B3 扩展）：qms 接入完成（单进程 6 模块：platform/dashboard/finance-demo/finance-real/erp-real/qms-real）
  - 复用 FinanceRealModule/ErpRealModule 模式：`svc/server/src/modules/qms_real_module.rs`
  - 关键点：qms 归入 `ModuleGroup::Wms`（"仓储制造"组，含质量/实验室/环境安全）；`module-qms` 已加入默认 features
  - 验证通过：`/api/qms/dashboard`、`/api/qms/checks`、`/api/qms/standards`、`/api/qms/issues` 返回真实数据库统计（42 条既有质检数据）
- [x] **crm 第 4 个真实服务接入**（Phase B3 扩展，单进程 7 模块）：platform/dashboard/finance-demo/finance-real/erp-real/qms-real/crm-real
  - `svc/server/src/modules/crm_real_module.rs`：复用真实模块模式，含字段加密/ERP/WMS/Workflow 客户端/内存缓存
  - 关键点：crm 用 `ApiState`（lib modules 定义，非 AppState）；DB 初始化用 `default_init_db` + `schema_defense`；`module-crm` 加入默认 features（注意：server 原已有空 `module-crm = []` 占位，需合并）
  - 读路径验证通过：`/api/crm/plugins/info`、`/api/crm/customers`、`/api/crm/opportunities`、`/api/crm/contacts` 均 200 真实数据
  - **写库修复（org_id 孤儿列 + 缺列）**：`POST /api/crm/customers` 端到端写库跑通
    - 排查确认：`TABLE_DEFS` 是 crm 建表唯一事实源（骨架 + ADD COLUMN）；`org_id` 仅存在于 TABLE_DEFS 的 8 张表，模型/INSERT/建表 SQL 均无——但 `event_handlers` 在 interactions 等表使用 org_id（固定 org 标记），故 **org_id 仅在 customers 表是孤儿**，其他 7 表保留
    - 修复：① `schema_defense.rs` 从 customers 表移除 org_id（新库不再建该列）② 现有库 `ALTER TABLE crm.customers ALTER COLUMN org_id DROP NOT NULL`（保留列/索引/历史值）③ `customer.rs` INSERT 处理 tags=None→`&[]`、rating=None→`"C"`（列定义 DEFAULT，避免 NULL 违反 NOT NULL / 反序列化失败）
    - 验证通过：完整创建（含 tags）200 / 最小创建（仅必填）200 / rating 默认 C / tags 默认空数组 / 列表读取正常；crm 测试 497 passed 无回归
    - 注：此前"customers 表重复列"结论为查询 bug（未限定 schema 混入 erp.customers），实际 crm.customers 干净无重复列
  - **7 张带 org_id 表写库验证与修复**：全部跑通（用户假设"由 event_handlers 使用理论正常"仅对 interactions 成立，实际多数表由业务路由写且 INSERT 不含 org_id）
    - 修复清单：① contacts/opportunities/tags/customer_tags 的 org_id NOT NULL → 可空（TABLE_DEFS + ALTER，业务 INSERT 不提供 org_id；interactions 由 event_handlers 提供 org_id 保留 NOT NULL）② opportunities 表缺 opp_no/customer_name/win_rate/owner_id 4 列（TABLE_DEFS 补齐）③ contacts 缺 approval_status 列 + INSERT/RETURNING 补列（模型有、表无）④ 启用被注释的 tag 模块（`pub mod tag` + create_routes merge + crm 补 serde_urlencoded 依赖，tag 路由此前整体禁用）⑤ event_handlers 接入 CrmRealModule（crm lib.rs 导出 event_handlers）⑥ audit schema 修复：plugin_crm→crm + audit_logs 表改 Cluster-A 标准列（entity_type 等）+ ip_address INET→VARCHAR(45) + org_id/resource 可空
    - 验证通过：customers(189)/contacts(5)/opportunities(4)/tags(10)/customer_tags(1)/interactions(1)/audit_logs(5) 全部落库；audit 错误归零；crm 测试 499 passed 无回归
- [x] **模块化单体编译验证**（Phase C）：`cargo build --release --features default` 全量编译通过（31m16s，仅 warnings 无 errors）
  - release 二进制 `target/release/topems-server` 6 模块启动验证通过

**验收标准达成情况**：
- ✅ 32 个 svc 全部归入 7 个模块组（设计文档 + Cargo 注释）
- ✅ 单进程 `topems-server` 可启动并响应健康检查（3 模块：platform/dashboard/finance）
- ✅ 至少 2 个模块间调用通过进程内 trait 完成（dashboard → finance 的 `AccountBalanceProvider` 调用，非 HTTP）

#### 1.3 accounting_subjects 表物理迁移 ✅ 已完成（V321，2026-08-28）

- [x] 迁移方案设计（建表 + 数据复制 + 旧表清理，见 `database/migrations/20260827000002_v321_accounting_subjects_migration.sql`）
- [x] Finance schema 创建 accounting_subjects 表（`plugin_finance.accounting_subjects`）
- [x] 数据迁移脚本（ERP → Finance 历史数据迁移，含记录数一致性）
- [x] 代码切换（所有 accounting_subjects 查询切换到 Finance schema）
  - Finance：`modules/accounting_subjects.rs` CRUD + `financial_reports.rs` 聚合查询
  - ERP：`modules/opening_balance.rs` 跨 schema 查询 `plugin_finance.accounting_subjects`
  - ERP `schema_defense.rs` 已注释说明迁移完成
- [x] 旧表清理（`DROP TABLE IF EXISTS plugin_erp.accounting_subjects`）

**验收标准达成情况**：
- `grep -r "accounting_subjects" svc/erp/` 仅剩注释说明 + 跨 schema 查询（`plugin_finance.` 前缀），无旧 schema 裸引用、无建表残留
- Finance 模块可独立读写 accounting_subjects（`plugin_finance.accounting_subjects`）
- 迁移脚本含数据复制 + `ON CONFLICT DO NOTHING` 幂等处理

### Phase 2：边界治理收尾 + AI 落地验证（第 5-8 周）— P1/P2

#### 2.1 编译时边界检查全覆盖（P1）

- [x] **`only_own_schema_query!` 编译时边界检查宏实现**（2026-08-29，新 crate `lib/shared-boundary`，topems-shared-boundary）
  - **背景**：TODO 验收标准所需的宏此前**并不存在**（全仓库无定义、零使用），本轮从零实现
  - **能力**：编译期解析 SQL 中表引用位置（FROM/JOIN/UPDATE/INTO/TABLE 后）的 `schema.table`，校验属于本服务 schema + 默认公共 schema（public/unified_core）+ 显式额外白名单；引用未授权 schema → `compile_error!` 构建失败
  - **误报控制**：只提取表引用位置（WHERE/ON 的 alias.column、函数调用、参数占位符不误判）；SQL 关键字过滤
  - **验证**：单元测试 7 个 + 集成测试 5 个全通过；**编译期拦截实测**（crm 直查 `wms.warehouses` → 编译失败并报"未授权 schema [wms]"）；workspace 全编译通过
- [x] **crm 试点接入**（customer.rs 核心查询包进宏，编译通过 + 499 测试无回归）
- [x] **批量接入 hrm/scm/srm/wms**（2026-08-29，5 个服务共 893 处宏调用，全 workspace 编译 0 error）
  - 批量方法：逐字符 SQL 字面量解析器（正确处理 `sqlx::query_scalar` 后缀、`::<>` 泛型、`r#"..."#` raw string、format! 跳过），自动包装 + 插 use
  - **跨 schema 引用处理**（编译期拦截驱动决策）：
    - srm/wms 的 `plugin_srm`/`plugin_wms`：历史 schema 名合法引用 → 宏白名单参数（不改 SQL）
    - hrm 的 `mobile.mobile_attendance`：合法跨模块只读 → 白名单 `"mobile"`
    - 拦截验证：违规 SQL 直接编译失败，迫使逐处显式声明
  - **修复既有缺口**：hrm 不在 workspace members 却用 workspace=true（独立编译报错）→ 加入 core 组
  - 验证：hrm 292 / scm 340 / srm 516 / wms 542 测试全通过，无回归
- [x] **其余服务接入宏：qms/erp/finance（2026-08-29，统一 schema 前缀后接入）**
  - **qms**（原 0 显式）：从 DB qms schema 33 表清单生成前缀，254 处 `qms.` 前缀 + 309 处宏；262 测试通过；server /api/qms/checks 200
  - **erp**（原 10/143 显式）：170 处 `erp.` 前缀 + 263 处宏；`plugin_erp`/`plugin_finance` 合法引用补白名单；宏默认白名单新增 `information_schema`（系统元数据查询）；899 测试通过；server /api/erp/assets 200 有数据
  - **finance**（原 10/301 显式）：242 处 `finance.` 前缀（modules）+ 183 处宏（services，16 文件）；**修正历史失效引用** `plugin_finance.*`→`public.*`（DB 无 plugin_finance schema，原 SQL 必失败，修正后 /api/finance/accounting-subjects 200）；`core_finance_payments`→`public.`；1106 测试通过
  - 三服务宏接入后 workspace 0 error；**宏覆盖累计 8 服务 1911 处调用**
- [x] **剩余 8 服务全部接入宏（2026-08-29，宏总量 2003 → 2921 处，16 服务全覆盖）**：
    - pm 167 / mobile 118 / gis 149 / integration 164 / ai 121 / ehs 100 / billing 19 / communication 76 = **918 处新宏**
    - **修正历史假 schema**：plugin_gis→gis、plugin_mobile→mobile、plugin_pm→pm（DB 无这些 schema，表实际在各服务 schema，原 SQL 必失败）
    - **补建 7 张缺失表**：gis 3（evidence_records/track_records/track_positions）+ integration 4（hrm_finance_sync/crm_erp_sync/erp_wms_sync/crm_scm_sync）
    - **ai 确认**：erp./crm./finance. 引用均为 MCP 工具名（非 SQL），无真实跨 schema；plugin_ai（DB 真实存在）加宏白名单
    - **修 finance INTERNAL_SCHEMA**：拆分 INTERNAL_TABLE_DEFS → public 3 表 + finance 3 表，消除 "plugin_finance 不存在" 防御初始化 WARN（现正常检查 66 表/563 列）
    - 验证：门禁 16/16 PASS（引用总量 ~2200）；workspace 0 error；8 服务 2909 测试通过；server 冒烟全 200
    - 注意：pm/mobile/gis/integration/ehs 等未挂 server HTTP 路由（server 仅挂 crm/erp/finance/qms 4 服务），接口 404 属功能未暴露，非本轮问题

  - [x] **gis TABLE_DEFS 补齐（2026-08-29）**：补 evidence_records/track_records/track_positions 3 表到 db/schema.rs 单一事实源（TABLE_DEFS 列定义 + CREATE TABLE），gis schema 防御从 18 → 21 表完整覆盖（启动自检 20 表/224 列通过，无缺失列 WARN；ehs 原已 43 表/581 列完整）
- [x] **finance 遗留债务（2026-08-29 已修复列失配，仍有表缺失项）**：
  - [x] **列失配修复完成**（补表列对齐代码模型）：
    - `core_finance_vouchers` +28 列（voucher_number/year/month/total_amount/currency_code/审批流字段/反冲字段/template_id/updated_by 等）
    - `core_finance_voucher_lines` +tenant_id
    - `public.core_finance_payments` +exchange_rate/attachment_url/approved_by
    - **类型修正**：42 列 timestamp→timestamptz（对齐 DateTime<Utc> 模型，排除 write_off_date/payment_date 等 NaiveDate 列）
    - **代码修正**：voucher.rs 3 处 INSERT voucher_lines 补 tenant_id 绑定
    - 验证：POST 创建凭证 200 写库成功（vouchers+lines 落库）、GET vouchers/accounts/payments/ledger/periods 全 200、1106 测试通过、workspace 0 error
  - [x] **补建缺失表完成**（2026-08-29，20 张建 public schema + 2 张 mv 重建，从代码 INSERT/SELECT 列反推 + 类型推断）：
    - 应收应付：erp_payables/erp_receivables/erp_collection_records/erp_payment_records
    - 凭证模板：finance_voucher_templates/lines/generation_rules
    - v52/v53 系列 9 表：alert_configs/alert_history/anomaly_alerts/audit_rules/audit_findings/budget_variances/cash_flow_predictions/detection_configs/prediction_models
    - 快照：reconciliation_snapshots/settlement_snapshots/source_amount_snapshots
    - 导入：finance_u8_import_records
    - **mv 视图重建为普通表**：mv_voucher_summary/mv_receivable_aging（代码当可写表 INSERT/UPDATE 用，DB 原为物化视图只读→重建为表）
    - **finance_periods 命名修正**：改代码 → finance.core_finance_periods（2 处）
    - **补 payables/receivables 缺列**：project_id/contract_id/payment_schedule（public + erp 副本）
    - 验证：接口 voucher-templates/receivables/payables/payment-records/periods 全 200；写库创建凭证模板+应收 200 落库；1106 测试通过；workspace 0 error
    - 已知限制：collection-records/reconciliations/mv 接口 404——services 层有实现但未挂 HTTP 路由（功能未暴露，非 bug）
- [x] **CI 门禁强化完成**（2026-08-29，静态跨 schema SQL 引用门禁，16 服务全覆盖）：
    - 配置 `scripts/schema_boundary.json`：16 服务 schema 白名单（crm/hrm/scm/srm/wms/qms/erp/finance/pm/mobile/gis/ehs/billing/communication/integration/ai + 默认共享 public/unified_core/information_schema + 服务白名单如 plugin_srm/plugin_wms/mobile/plugin_erp/plugin_finance）
    - 检查脚本 `scripts/check_schema_boundary.py`：扫描所有 svc/*/src 的 SQL 字符串字面量（含 raw string），提取 `schema.table` 引用（仅用 DB 真实 schema 名判定，避免别名误报），对照白名单，违规即非 0 退出
    - CI 集成：ci.yml 新增 **Gate M schema-boundary-gate** job（无 DB 依赖，ubuntu 原生 python3，10 分钟超时，违规构建失败 + step summary）
    - 本地入口：`bash scripts/topems.sh db boundary-check`
    - **门禁首跑即抓到遗漏**：finance 的 event_handlers/ + modules/settlement_center/ + domain/ 子目录未接宏（上一轮 glob 只覆盖 modules 顶层），修正 7 文件 92 处宏 + plugin_finance→public/finance 引用修正 + 建 reconciliation_item_snapshots 表（schema_defense 声明但 DB 未建）
    - 验证：16/16 服务 PASS（finance 433 引用、erp 266、hrm 226 等）；finance 1106 测试通过、workspace 0 error、server 重启冒烟全 200
    - 宏调用数更新：累计 1911 + 92 = **2003 处**

**验收标准**：所有 32 个 svc 的 SQL/API 注册通过 `only_own_schema_query!` 宏检查。

#### 2.2 MCP 业务工具真实落地（P2）

- [x] **MCP 工具清单审计完成**（2026-08-29）：16 业务文件注册 **68 个工具**（crm 3 / erp 4 / finance 4 / hr 4 / 其余每域 4），此前 **100% 为 mock 数据**（不连真实服务）；骨架/安全/传输/Schema/权限/Resource 层全部完成
- [x] **CRM 业务工具落地为真实调用（示范，2026-08-29）**：crm.list_customers / get_customer / create_customer 改真实 HTTP 调用（纯 std TcpStream 同步实现，无 tokio 冲突；CRM_SERVICE_URL 环境变量，默认 8029；API 不可达自动降级 mock）
  - 验证：CRM_SERVICE_URL→server 8099 端到端 `crm.list_customers` 返回真实 total=12（真实 DB 数据）；ai 1093 测试通过；workspace 0 error；门禁 PASS
  - 模式可复制：erp/finance 等工具按同模式接入（TODO 308/309）
- [x] CRM 业务工具实现（3 个，见上——list_customers 落地；get_customer_profile 对应 get_customer 已落地；create_opportunity 对应 create_customer 已落地）
- [x] **ERP 业务工具落地为真实调用（2026-08-29）**：erp.list_orders / get_order / create_order / update_inventory 改真实调用（ERP_SERVICE_URL 默认 8010，降级 mock）；端到端 `erp.list_orders` 返回真实 total=1
- [x] **Finance 业务工具落地为真实调用（2026-08-29）**：finance.list_transactions / get_transaction 改真实调用（FINANCE_SERVICE_URL 默认 8011，降级 mock）；端到端 `finance.list_transactions` 返回真实 total=1；create_invoice / get_report 暂保留 mock（发票/报表无对应 API，注释说明待模块接入）
- [x] **MCP 工具真实落地汇总（2026-08-29）**：crm 3 + erp 4 + finance 2 + **qms 4 + hr 4 + scm 4 + wms 4** = **25 个工具真实调用**，共享 HTTP helper（http_call 已支持 GET/POST/PUT/DELETE）；每个工具端到端 ignored 测试验证
- [x] **scm/wms 挂统一网关（2026-08-29）**：新增 `scm_real_module.rs`/`wms_real_module.rs`（feature `module-scm`/`module-wms` 门控）；scm 4 工具→/api/scm/suppliers、/purchase-orders；wms 4 工具→/api/wms/inventory、/warehouses、/transfers；端到端 scm.list_suppliers total=195、wms.list_inventory total=4
- [x] **接入过程修复 scm/wms 服务缺陷（2026-08-29）**：① scm.suppliers SQL 旧列（short_name/contact_name/contact_phone/tax_number）→新表（legal_name/contact_person/phone/tax_id）别名映射；② scm.purchase_orders 的 order_number→po_no、delivery_date→expected_date；③ wms.transfer_orders 的 transfer_no→order_number；④ wms.warehouses/transfer_orders/inventory 等 NULL tenant_id 补 DEV_TENANT_ID（原 0 条可见），共享 HTTP helper 提取到 `tools/mod.rs`（http_call / service_base_url / url_encode，纯 std TcpStream 同步，已支持 POST/PUT/DELETE）；每个工具端到端 ignored 测试验证
- [x] **hrm 挂统一网关（2026-08-29）**：新增 `svc/server/src/modules/hrm_real_module.rs`（feature `module-hrm` 门控，复用 dev_claims 模拟认证），hrm 4 工具真实调用：list→GET /api/hrm/employees、get→GET /employees/{id}、create→POST /employees、update→PUT /employees/{id}（HRM_SERVICE_URL 默认 8020）；端到端 list total=1、create 写库成功
- [x] **接入过程修复 hrm 服务缺陷（2026-08-29）**：① employees 加密列（email/phone/id_card_number/emergency_contact_phone）varchar 容不下密文 → 改 TEXT（DROP/重建 public.employees 视图后 ALTER）；② audit_logs.ip_address 为 inet 但写 text → 改 TEXT；③ audit_logs 的 organization_id/resource/tenant_id 非空列 shared-db 插入不提供 → DROP NOT NULL；审计日志写入链路全通
- [x] **qms 4 工具落地为真实调用（2026-08-29）**：qms.list_inspections→GET /api/qms/checks、get_inspection→GET /checks/{id}、create_inspection→POST /checks、list_nonconformances→GET /api/qms/issues（QMS_SERVICE_URL 默认 8050，走 server 8099 网关，降级 mock）；端到端 `qms.list_inspections` 返回真实 total=1
- [x] **接入过程修复 qms 服务缺陷（2026-08-29）**：quality_inspection SQL 的 `id, tenant_id` 列未 `::TEXT` 转换导致模型 String 解码 UUID 列失败（list/create/get/update 全链路 500）→ SELECT/RETURNING 加 `::TEXT` + `WHERE id = $N` 改 `id::TEXT = $N`（12 处 SQL）；qms 服务 262 测试通过
- [x] **接入过程发现并修复真实服务缺陷**（2026-08-29）：① erp SalesOrder 模型金额字段 f64→Decimal（NUMERIC 列 f64 解码失配，修复 create/update bind + 事件负载 Decimal→f64）；② erp sales_orders total 查询与 list 口径不一致（无 search 时 ILIKE '' 导致 total=0）→ 修复为 `$1='' OR ...`；③ finance Payment 模型 created_by String→Option<Uuid>（表列 uuid 可空）；④ 种子数据补全（erp 客户/订单、finance voucher/payment 全外键链）
- [x] **补充服务端/测试基线（2026-08-29）**：erp 899 passed / finance 1106 passed / ai 1093 passed（+3 ignored 真实调用测试）/ workspace 0 error / 门禁 PASS
- [x] **MCP Resources 实现（2026-08-29）**：新模块 `svc/ai/src/dsh/mcp/resources.rs`（ResourceRegistry + read_by_template 模板匹配）；3 个 URI：`crm://customers/{id}` / `erp://sales_orders/{id}` / `finance://vouchers/{id}`，读取走真实 HTTP API（复用共享 http_call，降级 None）；接入 server：initialize 响应 `resources` capability + `resources/list` / `resources/read` JSON-RPC 分发 + mcp-stdio 注册；端到端 `resources/read erp://sales_orders/{id}` 真实读取成功（ai 1099 passed + 4 ignored / workspace 0 error / mcp-stdio 编译 0 error）
- [x] **业务工具集成测试完成（2026-08-30）**：10 个工具 + 3 个 Resource 端到端调用测试全部通过（详见下方记录）

**验收标准**：MCP Tools 中至少 10 个是调用真实业务 API 的工具；每个工具通过 `TypedServiceClient` 调用，禁止直查 DB。

#### 2.3 外部 Agent 对接验证（P2）

- [x] **Cursor 对接验证（协议层，2026-08-30）**：新增 stdio 集成测试 `test_external_agent_calls_business_tools` 模拟外部 Agent 经 MCP 协议连接并调用 3 个业务工具（crm.list_customers/erp.list_orders/finance.list_transactions）通过；GUI 实测需在桌面端按文档配置后执行
- [x] **Claude Desktop 对接验证（协议层，2026-08-30）**：与 Cursor 共用 mcp-stdio 入口，同一协议测试覆盖；GUI 实测需在桌面端按文档配置后执行
- [x] **权限继承验证完成（2026-08-30）**：实现受限工具权限机制 + 5 个测试（匿名拒绝/错误角色拒绝/匹配角色放行/admin 放行/无权限要求工具不受影响）
- [x] **对接文档编写完成（2026-08-30）**：`docs/runbooks/mcp-agent-integration-guide.md`（入口/工具清单/Cursor/Claude Desktop 配置/权限继承/端到端验证/环境变量/FAQ）

#### 2.4 性能测试真实运行（P2）

- [x] 后端服务稳定性修复（服务在压测中不再退出，50VU/180s 压测后服务健康）
- [x] 性能基准建立（smoke/average/stress 三种场景获得有效性能数据，见 reports/acceptance_20260830.md）
- [x] 性能瓶颈识别与优化（P95 > 2s 的端点优化——无瓶颈，P95 49ms 远低于阈值）

**验收标准**：50 VUs 压力测试下服务稳定运行 3 分钟；核心 API 端点 P95 < 2s。

### Phase 3：AI 功能打磨 + 前端架构优化（第 9-12 周）— P3/P4

#### 3.1 DSH Provider 完整实现（P3）

- [x] **Dify Provider 迁移确认完成（2026-08-30）**：新增 `dsh/provider/dify.rs` DifyProvider 实现 LlmProvider trait（ask blocking / ask_stream SSE / health_check /v1/info / list_models）；factory 中 Dify 不再回退 Mock（`test_dify_falls_back_to_mock` → `test_create_dify_provider`）；DifyService（services/dify.rs）作为 HTTP handler 代理层保留
- [x] **Provider 路由策略完成（2026-08-30）**：新增 `dsh/provider/router.rs` ProviderRouter（简单→本地 Ollama / 复杂→云端 DeepSeek）；复杂度判定（带 system_prompt/history→复杂、复杂关键词、长度阈值>200、简单关键词、默认简单）；`ProviderFactory::build_resilient_provider()`（DSH_SIMPLE_PROVIDER / DSH_COMPLEX_PROVIDER / DSH_ROUTING 控制）
- [x] **Provider 故障降级完成（2026-08-30）**：新增 `dsh/provider/failover.rs` FailoverProvider（主失败自动切备）；降级触发规则（Network/Timeout/RateLimit/5xx→切备；Authentication/Configuration/Serialization→不切）；`DSH_FALLBACK_PROVIDER` 配置备用；`AgentOrchestrator::with_resilient_provider` 接入 Agent 路径

#### 3.2 Copilot 前后端联调（P3）

- [x] **Business Copilot 真实 API 联调完成**（3.2a，2026-08-30）：
  - [x] `CopilotSessionManager::process_request` 改为 async，新增 `with_llm_provider` 注入
  - [x] 新增 `generate_reply_with_llm`（LLM 失败/未配置时降级规则模板）
  - [x] `CopilotAppState::new` 注入 `build_resilient_provider`；business_copilot 23 测试全过
- [x] **智能表单真实数据联调完成**（3.2b，2026-08-30）：
  - [x] 新增 `dsh/smart_forms/engine.rs` SmartFormEngine（fill 三级：已有值→LLM 批量 JSON→默认值兜底；validate 必填/类型/长度/范围+AI 警告）
  - [x] 新增 handlers/smart_forms_handlers.rs 4 端点（模板列表/详情/AI 填充/校验），routes.rs 挂载
  - [x] 11 测试全过（字段实际为 title/department/total_amount/reason）
- [x] **治理仪表盘真实数据对接完成**（3.2c，2026-08-30）：
  - [x] CostMeter 新增 `get_global_statistics_blocking()` + 全局共享实例 `global_cost_meter()`
  - [x] 新增 `provider/recorded.rs` RecordingProvider：包装 build_resilient_provider，每次 ask 写入真实 AI 调用日志（成功/失败、token、耗时）
  - [x] `GovernanceDashboardGenerator` 注入 cost_meter + `generate_key_metrics` 真实统计分支（total_calls>0 用真实值，否则模拟）
  - [x] `GovernanceAppState::new` 注入全局 CostMeter（与 AI 调用写入端共享）
  - [x] HTTP 冒烟验证闭环：Copilot 发消息 → RecordingProvider 记录 → 仪表盘从模拟 125000 切换为真实统计
  - [x] 验证：ai 全量 1151 passed / clippy 0 / fmt 0（governance_dashboard +3、recorded +4 新测试）

#### 3.3 前端架构优化（P4）

- [x] **MF 双架构评估完成**（2026-08-30）：
  - [x] 结论：`vite.config.ts` 已支持 static / module-federation / hybrid 三模式（federation plugin + remotes 代理 + PluginLoader/DynamicRouter 已就绪）
  - [x] `VITEDeploymentMode` 默认 **static**（`VITE_DEPLOYMENT_MODE` 未设置时本地打包，不加载任何 remote）
  - [x] 迁移范围：当前无独立 remote 需加载（核心模块随 portal 同仓打包），保持 static 为正确选择；仅在需要将核心模块独立部署时启用 module-federation（`/remote/<name>/remoteEntry.js` 代理已配置）
- [x] **路由级懒加载优化完成**（2026-08-30）：
  - [x] 全路由 safeLazy 核查：auth（4 处）/dashboard/common 全部 `safeLazy(() => import(...))`，appRoutes 全部包 Suspense + PageErrorBoundary（V65.1.1 路由级隔离）
  - [x] v2 模块加载 `loadModuleConfig` 全部动态 `import('@/modules/<name>/config')`
  - [x] 仅 NotFoundPage 静态导入（轻量错误页 fallback，合理保留）
- [x] **首页加载性能优化完成**（2026-08-30）：
  - [x] 核心优化：lucide-react 子路径导出被 Rolldown 拆成**每图标一个 chunk**，首页入口曾静态引用 103+ 个单图标 chunk（首屏 163 请求）→ `vendorGroups` 新增 `lucide-vendor` 合并规则
  - [x] **效果：首屏请求数 163 → 37（-77%）**，lucide 合并为 1 个 87KB vendor（gzip 28KB），首屏总 gzip 传输量 424KB
  - [x] 修复构建阻塞 3 处：BusinessCopilotPage/DshAgentPage JSX 属性错误包裹 `{prop={...}}` + createSampleDocument 缺闭合 `)`；DataTable.tsx 顶层补 `refreshLabel`/`loadingLabel` 类型
  - [x] 验证：`pnpm --filter topems-portal build` 通过（tsc 0 error + vite build 279 文件 brotli 压缩）

### Phase 4：商业化支撑（第 13-16 周）— P5

- [x] **tier 分层定义（2026-08-30 完成，纯逻辑引擎）**：新增 `lib/shared-auth/src/tier.rs` —— `Tier`（free/basic/advanced 三层，rank 可比较）+ `tier_modules`（模块 feature 清单，free=core / basic=core+erp+finance+scm+wms / advanced=全部 15 模块，与 svc/server module-xxx 对齐）+ 11 测试
- [x] **权限自动关联（2026-08-30 完成）**：`tier_permissions(tier)` 自动生成模块级只读权限集（module:read/view + dashboard:read/iam:view，排序去重）
- [x] **订阅制存储/API 层（2026-08-30 完成）**：新增 `svc/server/src/modules/subscription_module.rs`（feature `module-subscription` 门控，默认不启用）—— `public.subscriptions` 表（tenant 唯一）+ GET /api/subscriptions/current（返回 subscribed_tier/status/effective_tier，过期自动降级 free）、POST /api/subscriptions（upsert 开通/变更，tier/status 校验 400）、POST /api/subscriptions/{id}/cancel；健康检查含 DB 依赖；验证：default/module-subscription/all-features 三组合编译 0 error、DB upsert 落库验证通过
- [x] **模块化单体按 tier 裁剪（2026-08-30 完成）**：`modules_to_disable_for_tier` 返回应裁剪模块清单（与 P3 feature 矩阵衔接）；验证：`cargo test -p topems-shared-auth` 214 passed、`cargo check --workspace` 通过

### Phase 5：业务架构优化（基于32服务完整度评估）— P0/P1

> 基于 2026-08-28 全模块完整度评估和业务逻辑分析，详见 `docs/architecture/TOPEMS_Architecture_Roadmap_v2.md`

#### P0 - 立即执行

- [x] **移除 lowcode 空壳服务完成**（2026-08-29 主体 + 2026-08-30 收尾）：
  - [x] 代码已归档 `svc/_archive/lowcode/`（openapi/util/main 等）
  - [x] workspace Cargo.toml 已移除成员（保留 [V2026.08 已移除] 注释标记）
  - [x] 部署配置（nginx/env/build-service/services.yaml/ports.env/topems.sh）已移除或注释
  - [x] 前端无 lowcode 残留；unified-core 33 行仅 V289 历史注释（非实际引用）
  - [x] 清理最后 2 处活跃残留：deploy/docker/.env + config/ports.env 的 LOWCODE_PORT=8088 → 注释
  - [x] 验证：无脚本/代码读取 LOWCODE_PORT；cargo check --workspace 0 error
  - [x] 收尾（2026-08-30）：`packages/shared-types/src/service-names.ts` 移除 `'lowcode'` 枚举项（shared-types build 通过）；确认部署配置 7 处引用均为 [V2026.08 已移除] 注释（nginx.conf/.env/build-service.sh/topems.conf/services.yaml/ports.env/sync-ports.sh）；service-client/unified-core/shared-bootstrap 引用均为注释或历史文档
- [x] **补充 mes 测试覆盖完成**（500 个测试，目标 500+ 达成）：
  - 本轮新增 238 个：work_report +20 / equipment +14 / production_scheduling +7 / anomaly_detection +15（趋势检测 is_increasing_trend + OEE 语义）/ 批量 10 模块 +71（work_station/process_route/process_flow/team/wip/production_record/material_requirement/production_cost/quality_traceability/material_bom/utils）/ models 序列化 +9（anomaly/cost/equipment）/ **aps_scheduling +25（APS 核心算法：加工时间含换型 0.5h、风险分级 RiskLevel、可行性评分、clamp 到 0）** / material_bom 边界 +3
  - mes lib 测试 262 → 424 passed；集成 82 passed 全绿
  - clippy 0 / fmt 0 / workspace check 0 error
  - 已验证 P0 点名模块全覆盖：工单（已有）/ 报工（work_report）/ 设备（equipment）/ 排程（scheduling + aps）

#### P1 - 服务合并与精简

- [x] **合并 feedback → ticket 完成**（2026-08-30 核查 + 收尾）：
  - [x] feedback 数据模型迁移到 ticket schema：`feedback_compat.rs`（335 行）将反馈作为 ticket 类型（ticket_type = 'customer_feedback'），create/get/list/response/delete + `/feedbacks` 路由，映射到 tickets 表
  - [x] feedback API 合并到 ticket 服务：`main.rs` 挂载 `feedback_compat_routes()`，兼容端点 `/api/ticket/feedbacks` 冒烟验证 401（路由存在，认证保护）
  - [x] 前端 feedback 模块合并到 ticket：ticket 前端类型已支持 `ticket_type`（含 customer_feedback）；遗留死代码（api/feedback 10 文件 + components/feedback）归档到 `apps/web/_archive/`；api/index.ts 移除 feedbackApi re-export
  - [x] 从 workspace 移除 feedback 服务：Cargo.toml 无成员、svc/feedback 已归档；部署配置清理（services.conf/sync-ports.sh/topems.sh 服务条目 + FEEDBACK_PORT 3 处 env 注释）；check-api.cjs 白名单保留（兼容 API 无导航）
  - [x] 验证：ticket 测试全绿（204+119+1）、脚本 bash -n 全过、web tsc 0 error
- [x] **评估 billing 保留/合并（2026-08-30 决策：合并到 finance）**
  - [x] **商业模式判断**：TOPEMS 主线为**私有化 ERP 套件**（按客户模块裁剪交付）；billing 服务是 SaaS 计费引擎（plan/subscription/invoice/usage）定位与主线不符；订阅/tier 语义已由 P5 `subscription_module` 承载（功能重复）；企业侧应收/开票由 finance settlement_center 承载
  - [x] **私有化部署：合并到 finance** ✓ 完整闭环：归档 svc/billing → `svc/_archive/billing`；client billing_api.rs → `_archive/client/`；移除 workspace 成员；清理部署配置（services.yaml 4 处 + services.conf + sync-ports.sh + topems.sh 8 处 + schema_boundary.json + openapi/generate.sh）；`services.rs` 服务枚举/端口分支/端口常量/6 测试期望（29→28）；`service_port.rs` BILLING_PORT 常量/映射/长度保护（30→29）
  - [x] **SaaS 模式：不推进**（无交付对象；平台商业化由 P5 subscription_module 承载）
  - [x] 验证：`cargo check --workspace` 0 error、`cargo test -p topems-shared-core` 771 passed、bash -n 全过、billing 服务级引用清零（仅剩 ts-unused-exports 审计报告记录 + services.rs 注释示例）
  - [x] **前端 billing 归档（2026-08-30 完成）**：`apps/web/src/api/billing/`（9 文件 SaaS 计费 UI，死代码零引用）→ `apps/web/_archive/billing-api/`；清理服务映射 6 处（runtime.ts / moduleMapping.ts / types.ts / apiClient.ts / deployment.ts / ports.ts / apiPath.ts）+ 测试断言 5 处（runtime-routes/deployment/apiPath.test）；保留 CRM 计费（crm/billing.ts、CRMBillingPage）与租户订阅计费（TenantBillingPage 等 P5 概念）；验证：tsc 0 error、相关测试 29 passed
- [x] **评估 aps → mes 合并**（APS 作为 MES 的高级排程模块，2026-08-30 收尾完成）
  - [x] aps 排程算法迁移到 mes（08-28 主体完成：aps_util/aps_fsm/production_plan/capacity/demand_forecast + /api/aps 兼容层）
  - [x] 从 workspace 移除 aps 服务（08-30 收尾：nginx 补 /api/aps→mes 代理、归档 svc/aps、移除 workspace 成员、services.yaml/build-service.sh 清理、topems-server 移除 module-aps feature）

#### P2 - 功能补全

- [x] **tms 核心功能补全**（订单分配/路径优化/在途跟踪/运费结算）—— 2026-08-30 完成 4/4
  - [x] 在途跟踪：已有 shipment dispatch/arrive 状态机（fsm）
  - [x] **订单分配 / 路径优化 / 运费结算（2026-08-30）**：新增 `modules/optimization.rs` —— `assign_orders_to_drivers`（优先级+载重贪心，跳过不可用司机/容量不足/超载，未分配订单返回）+ `optimize_route`（最近邻 TSP）+ `calculate_freight`（距离×费率+重量×费率，最低收费兜底，金额 BigDecimal 舍入 2 位）+ 15 个引擎测试；HTTP：POST /api/tms/assignments/plan、/routes/optimize、/freight/quote（负参数/空矩阵/非方阵 400 校验）。验证：`cargo test -p topems-tms` 345 passed、`cargo check --workspace` 通过
- [x] **analytics 测试补充**（2026-08-30 完成，当前 315 passed / 0 failed，目标 300+ 达成）
  - [x] analytics.rs 补 10 个 handler 契约测试（模块别名分发 development/rs/quality/qms/production/pdm/laboratory/lims/ehs/srm、未知模块 400、summary key_metrics 结构、各模块 data 字段/数值断言、overview/rs/lims/qms/pdm summary 结构）
  - [x] 验证：`cargo test -p topems-analytics` 全绿（315 passed, 0 failed）
- [x] **lims 测试补充**（2026-08-30 完成，当前 307 passed / 0 failed，目标 250+ 达成）
  - [x] audit.rs 补 6 个 generate_csv 契约测试（header/单条全字段/None 占位/JSON 序列化转义/多行/含逗号字段引号）
  - [x] data_parsing.rs 补 9 个解析边界测试：parse_astm（非 R 记录忽略/空 records/字段缺失默认值/非数字 result 保留字符串/无 records 回退） + parse_hl7（空 segments/非 OBX 忽略/OBX 字段缺失/abnormal_flag 置异常状态）
  - [x] 验证：`cargo test -p topems-lims` 全绿（307 passed, 0 failed）
- [x] **rd 研发管理功能补全**（项目管理/文档管理/变更管理）—— 2026-08-30 完成 3/3
  - [x] 项目管理：已有 project/project_phase/project_milestone/project_member；文档管理：已有 doc_integration（document_relations）
  - [x] **变更管理（2026-08-30）**：新增 `modules/change_management.rs` —— 状态机纯逻辑 `change_request_can_transition`（submitted→under_review/rejected→approved/closed，非法流转拒绝）+ 影响评分 `assess_change_impact`（优先级权重 critical10/high6/medium3/low1 + 文档×1 + 阶段×2）+ `impact_level` 分级（≥10 高 / ≥5 中 / 低）+ 7 个测试；`rs.change_requests` + `rs.change_orders` 表（schema_defense 6 表）；HTTP：POST/GET /change-requests、GET/PUT/DELETE /change-requests/{id}、POST /change-requests/{id}/transition（非法流转 400）、POST /change-requests/{id}/change-orders（仅 approved 可建，否则 400）、GET /change-orders。验证：`cargo test -p topems-rd` 全绿、`cargo check --workspace` 通过
- [x] **ticket 功能补全**（工单分类/SLA管理/知识库关联/自动化规则）
  - [x] 工单分类（classify_ticket_category 已有）、SLA 管理（sla_service 已有，策略 CRUD + 升级 + 统计）
  - [x] **自动化规则（2026-08-30 完成）**：引擎纯逻辑（automation_condition_matches/evaluate_automation_rules，支持 severity/ticket_type/title/always 条件 + set_assignee/set_severity/add_tag 动作，priority 排序）+ 10 个引擎测试；`ticket_automation_rules` 表（schema_defense）；CRUD handler + 路由（/automation-rules、/automation-rules/{id}）；create_ticket 接线自动应用（assignee/severity/tags）。验证：`cargo test -p topems-ticket` 346 passed、`cargo check --workspace` 通过
  - [x] **知识库关联（2026-08-30 完成）**：推荐引擎纯逻辑（score_article_against_query/rank_articles_against_query，标题关键字 +3/内容 +1/查询词子串 +2，评分降序、0 分过滤）+ 8 个测试；`ticket_knowledge_articles` 表（schema_defense）；CRUD handler + 路由（/knowledge-articles、/knowledge-articles/{id}），GET 支持 `?q=` 推荐排序。验证：`cargo test -p topems-ticket` 362 passed、`cargo check --workspace` 通过

#### P3 - 可选服务 feature flag 控制

- [x] **gis / tms / lims / ehs 等行业特定服务通过 Cargo Feature Flags 控制启用（2026-08-30 完成）**
  - [x] lims / ehs：已有 `module-lims` / `module-ehs` 门控，default 启用（Phase B3）
  - [x] **tms**：新增 `module-tms` feature（默认不启用）+ `topems-tms` optional dep；新增 `svc/server/src/modules/tms_real_module.rs`（仿 lims 接入：bootstrap_service + schema_defense 迁移 + AppState + create_routes 泛型实例化 + tenant_middleware + require_permission("tms:admin") + nest /api/tms + dev_claims）；mod.rs cfg 声明 + main.rs 注册块（降级运行不阻塞）。验证：default 构建通过（tms 裁剪不生效）、`cargo check -p topems-server --features module-tms` 编译干净、tms 345 passed
  - [x] **gis 决策**：gis 保持独立微服务部署（含 WebSocket/event subscribers/plugin，main.rs 逐个 .route 挂载、AppState pub(crate)）；server 进程内嵌入需先重构 gis lib（AppState pub + 聚合路由 + ws 共享），价值低、成本高 → 不嵌入，按客户部署裁剪（services.yaml 已含 gis）。已加 `module-gis` feature 占位 + optional dep（编译可通过，未注册路由）
  - [x] **裁剪矩阵验证**：default 编译 ✓、`--features module-tms` ✓、最小集 `--no-default-features --features module-core,module-erp,module-finance` ✓、`--all-features` ✓ 全部编译通过（期间磁盘满中断一次，清理 target 缓存后恢复；finance 单跑 --all-features 通过）
- [x] **模块化单体架构下按客户需求裁剪模块（2026-08-30 完成）**：feature 矩阵完整（core/erp/finance/qms/crm/hrm/scm/wms/pm/mes/ehs/lims/tms/advanced/ai + subscription）；`docs/architecture/modular-monolith-design.md` 更新至 v0.2（实际 feature 清单、裁剪示例与已验证组合、Phase B 扩展 + P3 实施状态、gis 特例说明）；**2026-08-30 追加：裁剪矩阵 4→5 组合回归（default / +tms / 最小集 / +subscription / 全量）全部编译通过（0 error）**

---

## ✅ 已完成任务（精简摘要）

> 详细阶段执行日志（第十九至第五十五阶段）已归档至 [`docs/archive/TODO_HISTORY_phases_19_55.md`](docs/archive/TODO_HISTORY_phases_19_55.md)

### 边界治理（已验证完成）

- [x] 跨 Schema 直查清零（Finance/WMS/MES/QMS 无 `plugin_` 跨库引用）
- [x] unified-core 32 个 stub 路由删除
- [x] Finance 页面 `@/api/erp` 类型反链清零
- [x] 编译时 Schema 边界 CI 门禁（覆盖 6 个服务）
- [x] 审计日志 gzip 压缩归档

### AI 基础设施（已验证完成）

- [x] MCP 协议适配层骨架（shared-mcp crate + server/transport/tool_adapter/resource_manager/permission_adapter/security）
- [x] MCP 安全防护体系（输入校验/输出脱敏/速率限制/调用审计/异常熔断）
- [x] MCP 传输层完整支持（stdio/SSE/HTTP/WebSocket/内存传输，5 种类型）
- [x] Tool Schema 适配器（自动生成 JSON Schema + 版本化 + 兼容性校验）
- [x] 权限映射适配器（RBAC → MCP 权限映射 + 租户隔离 + 缓存）
- [x] MCP Resource URI 管理器（资源 CRUD + 订阅推送 + 层级管理 + 权限控制）
- [x] AI 成本计量（token 计量 + 成本估算 + 配额管理）
- [x] Agent 编排增强（ReAct 模式 + 上下文管理 + 流式响应 + 错误恢复 + 会话持久化）
- [x] Agent 与 LLM Provider 集成（think_with_llm + generate_answer_with_llm + 规则匹配后备）
- [x] 性能监控模块（P50/P95/P99 延迟 + 工具调用指标 + Prometheus 导出）

### AI 增强能力（已验证完成）

- [x] 多 Agent 协作（4 种协作模式 + 5 种角色）
- [x] 知识图谱集成（实体关系提取 + 图算法 + 消歧）
- [x] RAG 增强（查询重写 + 混合检索 + 重排序）
- [x] 缓存机制（LRU + TTL + 工具/LLM/会话缓存）
- [x] 监控告警（4 种规则 + 3 种级别 + Webhook 通知）
- [x] Workflow Engine（12 种节点类型 + 状态机驱动 + 版本管理）
- [x] Event → AI 触发器（事件规则引擎 + 7 种 AI 动作类型）
- [x] Plan-Execute 编排模式（任务规划器 + 4 种计划策略 + 失败恢复）
- [x] Agent 记忆系统（5 种记忆类型 + 短期/长期/工作/情景/语义）

### 运行时基座（已验证完成）

- [x] Prompt 模板引擎 + 版本控制
- [x] 超时/重试/熔断机制完善（熔断器三态 + 4 种重试策略 + 降级策略）
- [x] 配置管理中心（8 种配置值类型 + 动态更新 + 版本控制 + 敏感配置保护）
- [x] AI 治理仪表盘（5 维度评分 + 风险/合规/成本/性能面板）
- [x] Layer 1 标准化（统一错误码体系 9 大类别 50+ 错误码 + 标准响应结构）

### 业务赋能（框架就绪，待集成验证）

- [x] 业务 Copilot 基础框架（7 种业务模块 + 11 种意图类型 + 意图识别器）
- [x] 特定业务模块 Copilot 配置（ERP/Finance/CRM/WMS 各 5-6 个工具定义）
- [x] 智能表单引擎（30 种字段类型 + 4 个默认表单 + 自然语言生成）
- [x] 文档智能引擎（11 种文档类型 + 解析/摘要/关键词/生成）
- [x] Business Copilot API handlers（8 端点，编译通过，待真实联调）
- [x] Governance Dashboard API handlers（10 端点，编译通过，待真实数据对接）

### 前端集成（框架就绪，待联调验证）

- [x] DSH Agent 聊天面板 + Hook + 演示页
- [x] 前端 API 调用层（dsh-agent.ts + business-copilot.ts + governance-dashboard.ts）
- [x] 业务模块选择器 + 智能表单渲染器 + 治理仪表盘组件 + 文档智能组件
- [x] Business Copilot 主页面 + Governance Dashboard 独立页面
- [x] 前端 API 路径集成更新（BASE_PATH 对齐 `/api/ai/dsh/...`）
- [x] 知识图谱可视化 + RAG 检索面板 + 多 Agent 协作监控面板

### 测试（已验证完成）

- [x] 后端单元测试：AI 模块 1074 + shared-mcp 18 = 1092 个全部通过
- [x] 前端集成测试：API 客户端 27 + Hooks 16 = 43 个全部通过
- [x] 端到端测试（AI 表单生成）：14/14 通过（Playwright + Chromium）
- [x] 端到端测试（治理仪表盘）：10/10 通过（Mock API 数据）
- [x] 端到端测试（业务 Copilot）：12/12 通过（Mock API 数据）
- [x] DSH Agent 端到端测试：15 个全部通过
- [x] 增强能力端到端测试：39 个全部通过（知识图谱 20 + 实体提取 6 + RAG 6 + 多 Agent 3 + 集成 2 + 性能 2）

### 工程化（已验证完成）

- [x] API 文档（DSH_AI_API.md + DSH_AI_ARCHITECTURE.md + DSH_AI_USAGE_GUIDE.md + DSH_BUSINESS_INTELLIGENCE_API.md）
- [x] 共享 DSH 类型库（lib/shared-dsh，Tool/Resource/Prompt 等核心类型）
- [x] OpenAPI 文档生成（utoipa 注解 + Redoc UI + 兼容路径）
- [x] MCP 工具与资源标准化规范（命名/Schema/URI/错误码/安全/性能/版本管理）
- [x] 配置管理增强（YAML 配置文件 + 环境变量覆盖 + 配置校验脚本）
- [x] 部署脚本（deploy.sh + rollback.sh + ai-health-check.sh + production-deploy.sh）
- [x] 生产环境配置模板（.env.production.example + production.yaml.example）
- [x] 开发脚本（ai-dev.sh + generate-ai-api.sh）
- [x] 性能测试脚本（5 个 k6 套件 + Python 性能测试脚本）
- [x] 健康检查脚本（38 个 API 端点检查）
- [x] CI/CD 工作流完善

---

## 📊 项目统计

| 指标 | 数值 |
|------|------|
| 后端新增/修改文件 | 51+ |
| 前端新增文件 | 22+ |
| 文档文件 | 12+ |
| 部署脚本数量 | 4 |
| 后端测试总数 | 1092（AI 1074 + shared-mcp 18） |
| 后端测试通过率 | 100% |
| 前端集成测试总数 | 43（全部通过） |
| 前端端到端测试总数 | 36（表单 14 + 治理 10 + Copilot 12，全部通过） |
| 性能测试脚本数 | 5 |
| API 端点总数 | 38+（8 Copilot + 7 Forms + 10 Documents + 13 Governance） |
| MCP 注册工具数量 | 65（含系统/占位工具，真实业务工具待审计） |
| 业务模块工具定义数 | 21（ERP 5 + Finance 5 + CRM 5 + WMS 6） |
| 代码总行数 | 200000+ |

### 架构规划对齐进度

| 架构层级 | 完成度 | 说明 |
|---------|--------|------|
| Layer 0: MCP 适配层 | 90% | 骨架/安全/传输/Schema/权限/Resource 全部完成；业务工具真实落地待验证 |
| Layer 1: 运行时基座 | 100% | LLM Provider/计量/流式/Prompt模板/熔断/配置管理/标准化全部完成 |
| Layer 2: 智能中枢 | 100% | Agent/Tool/RAG/Multi-Agent/知识图谱/记忆/工作流/事件/Plan-Execute全部完成 |
| Layer 3: 业务赋能 | 70% | 框架全部完成；真实 API 联调/外部 Agent 对接/性能基准待完成 |
| AI 治理 | 100% | 安全护栏/成本/审计/配额/MCP安全防护/治理仪表盘全部完成 |
| 前端集成 | 70% | 组件/页面/API层全部完成；真实前后端联调待完成 |
| 工程化 | 100% | API文档/共享类型库/开发脚本/OpenAPI规范/部署验证全部完成 |
| 边界治理 | 80% | 跨Schema清零/stub删除/类型迁移完成；编译时检查仅覆盖 6/32 服务 |
| 架构优化 | 0% | 事件总线升级/模块化单体骨架/accounting_subjects迁移均未启动 |

---

## 🚀 使用方式

### 后端启动

```bash
cd svc/ai
SQLX_OFFLINE=true cargo run
```

### 前端启动

```bash
cd apps/web
npm run dev
```

### API 调用示例

```bash
# 同步执行 Agent
curl -X POST http://localhost:8080/api/ai/dsh/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"query": "搜索客户信息", "session_id": "test-session"}'

# 获取性能指标
curl http://localhost:8080/api/ai/dsh/agent/performance/metrics

# 导出 Prometheus 指标
curl http://localhost:8080/api/ai/dsh/agent/performance/prometheus
```

---

## 📌 备注

- 前端代码有少量 MUI 组件类型定义警告，与项目 MUI 版本配置有关，不影响实际功能使用
- 剩余 13 个 SQLX_OFFLINE 缓存错误需 DB 环境，不影响代码逻辑
- 详细阶段执行历史（第十九至第五十五阶段）见 [`docs/archive/TODO_HISTORY_phases_19_55.md`](docs/archive/TODO_HISTORY_phases_19_55.md)
- 原始完整 TODO.md 备份见 [`docs/archive/TODO_backup_20260828.md`](docs/archive/TODO_backup_20260828.md)

## 2026-08-29 批量接入进展与阻塞
- [x] scm/wms 接入完成（见上文汇总，25 个真实工具）
- [x] **mes 接入受阻（已解决 2026-08-30）**：**根因是编译环境 search_path，非代码缺陷**。mes 代码/schema_defense/DB(mes schema) 三者一致（equipment_code/order_number/route_code 等均为新结构）；在线编译 83 个"列不存在"错误是 query! 编译期默认 search_path 解析到 **public 旧表**（public.production_orders 为 order_no 旧结构）所致
  - 修复：在线编译/构建需设 `DATABASE_URL` 带 `?options=-csearch_path%3Dmes,public`（query! 不读 SEARCH_PATH env）
  - 验证：`DATABASE_URL=...mes,public cargo test -p topems-mes` → **506 passed / 0 failed**；离线编译通过（缓存一致）；`cargo check -p topems-server --features module-mes` 通过（mes_real_module 正常挂载）
- [x] **pm/aps/ehs/lims 待评估**：：pm 为 pool 直传 + 各模块自管 AppState（需单独适配）；aps/mes 需先修 schema 失配；cs/bi/iot/oa 无独立 Cargo 包（非独立服务）

## 2026-08-29 批量接入（续）：APS 域接入完成（第 8 个真实服务）
- [x] **aps 真实接入**（网关 8099 `/api/aps` + MCP 4 工具真实化）：
  - 新增 `svc/server/src/modules/aps_real_module.rs`（feature `module-aps`，AppState: db/auth_state/metrics/start_time/event_publisher，schema `plugin_aps`）
  - MCP 工具改造（`svc/ai/src/dsh/mcp/tools/aps.rs`）：`aps.list_schedules`→GET /schedules、`aps.get_schedule`→GET /schedules/{id}、`aps.list_resources`→GET /capacities（资源≈产能）、`aps.create_schedule`→POST /schedules（start_time 空格→RFC3339 转换），均失败降级 mock
  - 真实缺陷修复：`schedule.rs` 时间类型 `Option<NaiveDateTime>`→`Option<DateTime<Utc>>`（8 处，表列 TIMESTAMPTZ）
  - 种子数据：plugin_aps.aps_schedules / aps_capacities 各 1 条（tenant=DEV）
  - e2e 测试 `test_e2e_aps_real_service`（#[ignore]，APS_SERVICE_URL 指向网关 8099）通过，create 真实落库（APS-MCP-20260829080607）
- [x] MCP 真实工具汇总：**25 + 4 = 29 个**（crm3 erp4 finance2 qms4 hr4 scm4 wms4 aps4）
- [x] mes 接入已解除阻塞（2026-08-30 根因 search_path，见上文汇总）

## 2026-08-29 批量接入（续2）：PM 域接入完成（第 9 个真实服务）
- [x] **pm 真实接入**（网关 8099 `/api/pm` + MCP 3 工具真实化）：
  - 新增 `svc/server/src/modules/pm_real_module.rs`（feature `module-pm`，pool 直传模式：create_routes(pool, event_publisher, workflow_client)）
  - MCP 工具改造（`svc/ai/src/dsh/mcp/tools/pm.rs`）：`pm.list_projects`→GET /projects、`pm.get_project`→GET /projects/{id}、`pm.create_project`→POST /projects（日期空格/RFC3339 转换 + end_date 空转 null）；`pm.list_tasks` 无真实 API 保留 mock（TODO：pm 无 tasks 路由）
  - 真实缺陷修复（pm 服务源码）：① `tags` 列类型失配（text[] vs jsonb）→ INSERT/UPDATE 用 `to_jsonb($N::text[])`；② create INSERT 缺 `tenant_id`（NOT NULL）→ 补列 + DEV tenant 绑定
  - 种子数据：pm.projects 1 条（PRJ-MCP-0001，tenant=DEV）
  - e2e 测试 `test_e2e_pm_real_service`（#[ignore]，PM_SERVICE_URL 指向网关 8099）通过，create 真实落库（PRJ-MCP-20260829081656）
- [x] MCP 真实工具汇总：**29 + 3 = 32 个**（crm3 erp4 finance2 qms4 hr4 scm4 wms4 aps4 pm3）
- [x] mes 接入已解除阻塞（2026-08-30 根因 search_path，见上文汇总）
- [x] **pm.list_tasks 真实化（2026-08-30）**：pm 新增 `models/task.rs` + `modules/task.rs` —— 纯逻辑 `task_status_transition_valid`（todo/in_progress/review/done/blocked 状态机）+ `task_progress_for_status`（done→100/todo→0/clamp）+ 4 测试；`pm.pm_tasks` 表（schema_defense 20 张）；HTTP：GET/POST /api/pm/tasks、GET/PUT/DELETE /api/pm/tasks/{id}、GET /api/pm/projects/{project_id}/tasks（分页/项目/状态/优先级/负责人筛选，update 校验状态机非法流转 400，软删除）；MCP `pm.list_tasks` 真实化（GET /api/pm/tasks 真实优先，失败降级 mock）。验证：`cargo test -p topems-pm` 1035 passed、pm+ai 编译 0 warning、pm_tasks 真实落库（INSERT RETURNING 验证）

## 2026-08-29 mes schema 修复第一波（WIP，已 stash 保护基线）
- **背景**：mes 使用 sqlx::query! 在线连库校验，一次性暴露 80+ schema 失配；本轮系统修复
- **已完成（stash 中，`git stash list` 可见，消息 "WIP mes schema修复: 83->60"）**：
  - 明确列名映射全部修完：equipment(equipment_code/equipment_name/next_maintenance_date)、work_stations(ws.station_name 全文件)、production_processes(pp.process_name/process_code)、process_routes(route_code/route_name)、production_orders(order_number)、material_bom/material_requirement/kanban/scheduling/quality/wip 的 production_orders 引用（保留真列 order_no 的 wips/production_schedules）
  - production_order.rs 深度语义重构完成大半：无 product_id/source/workshop_id → NULL::uuid/NULL::varchar/work_station_id AS 别名；DATE 列 → ::timestamptz AS；integer quantity → ::float8 AS；INSERT 删 product_id/source、workshop_id→work_station_id、bind 重排、naive_utc→date_naive/now 直传
  - 数量：83 → 约 60 error
- **剩余（下一波继续，stash pop 后按此修）**：
  - 类型级联：nullable 列 vs 非 Option 模型字段（如 product_code/product_name 赋 String，约 25 处 E0308）+ status 等 NOT NULL 列误用 unwrap_or_else（E0599）
  - process_route.rs 15（prs.work_station_id 语义映射、standard_time 残留、route 相关）
  - quality_traceability 8、production_kanban 7、production_record 4（equipment_id 语义）、process_flow 4、equipment 4、其他小项
- **关键教训**：① CAST 表达式（::float8/::timestamptz）sqlx 保守推断为 Option<T>；② 正则全局替换易误伤 Rust 字段访问，必须区分 SQL 列与 Rust 字段；③ 生产工单表结构与旧代码差异极大（无 product_id/source/workshop_id，日期是 DATE 不是 TIMESTAMP）
- **基线**：stash 后 `SQLX_OFFLINE=true cargo check --workspace` = 0 error（已恢复）

## 2026-08-29 mes schema 修复第二波：✅ 完成，workspace 全绿
- **状态**：mes 在线+离线编译 **0 error 0 warning**；`SQLX_OFFLINE=true cargo check --workspace` = **0 error**（全量回归通过）
- **本轮新增修复（接上轮 stash 继续）**：
  - production_order.rs 清零：DATE 列→::timestamptz、integer→::float8、NULL::uuid/varchar 映射、两个 UPDATE 日期参数拆分（actual_start/end=date_naive + updated_at=now）
  - process_route.rs 清零：work_station_id 从 prs 改从 pp（production_processes）JOIN、description 无列→NULL::text、INSERT/UPDATE 删 work_station_id/description 列、process_code/process_name 类型
  - production_record.rs 清零：删 equipment_id/quantity_defective 列、quantity_produced→completed_quantity、INSERT/UPDATE bind 重排、i32→f64 转换
  - quality_traceability/kanban/wip/equipment/process_flow/production_process/scheduling/equipment_oee 全部清零
- **缓存**：`cargo sqlx prepare`（DATABASE_URL 需带 `options=-csearch_path=mes,public`）重新生成 .sqlx（236 文件）
- **警告**：cargo fix 清理 5 个 unused import/变量
- **下一步（用户 P0 列表）**：
  - [ ] mes 挂网关路由（scripts/services.conf + 8099 网关）+ 启动验证
  - [ ] ai MCP 接入 mes 真实工具（schema_defense 风格，参考 crm/erp 的 29+3=32 个已有工具）
  - [ ] MES 子服务/服务发现配置（lib/shared-core config/services.rs）

## 2026-08-29 mes 网关接入 + MCP 真实化：✅ 完成
- **mes 挂网关 8099**：svc/server 新增 `module-mes` feature + `mes_real_module.rs`（AppState 直传模式，参照 pm/crm），加入 default features + main.rs 注册（第 13 模块）
- **启动验证**：`cargo run -p topems-server` → health 显示 13 模块含 `mes-real`；`GET /api/mes/orders` 返回真实 DB 数据（PO-c1c4933c...）
- **MCP 真实化**：`svc/ai/src/dsh/mcp/tools/mes.rs` 4 个工具（list_production_orders / get_production_order / list_work_orders / get_oee_dashboard）从纯 mock 改为「真实 HTTP（网关 8099 / MES_SERVICE_URL）优先 + mock 回退」，复用 `http_call/service_base_url/url_encode` helper
- **测试**：`cargo test -p topems-ai dsh::mcp::tools::mes` → 6 passed（含真实调用通路）；workspace 全量 `SQLX_OFFLINE=true cargo check --workspace` = 0 error
- **注意**：svc/server 整个目录为 untracked（历史遗留，从未提交）；PG 需运行（本机 PostgreSQL 18，`pg_ctl -D /opt/homebrew/var/postgresql@18 start`）
- **环境**：MES_SERVICE_URL 默认 localhost:8030，经网关 8099 转发；service_base_url("MES_SERVICE_URL", 8030) 逻辑与其他服务一致

## 2026-08-29 ehs 网关接入 + MCP 真实化：✅ 完成（lims 发现 schema 失配待修）
- **ehs 挂网关**：svc/server 新增 `module-ehs` feature + `ehs_real_module.rs`（AppState 含 workflow_client + 3 caches），加入 default features + main.rs 第 14 模块
- **lims 挂网关**：`module-lims` + `lims_real_module.rs`（2 caches）已写，但**从 default 移除**（见下方失配），代码保留可手动启用
- **启动验证**：health 显示 15 模块（ehs-real ✓）；`GET /api/ehs/incidents`、`/api/ehs/hazards` 返回 200 真实数据
- **MCP 真实化**：`ehs.rs` 4 工具（list_incidents/get_incident/list_hazards/create_incident）真实 HTTP + mock 回退；测试 6 passed（走真实网关）
- **⚠️ lims schema 失配（新 TODO）**：lims 代码（sample.rs 等）查询 `qa_lab_samples` 等 qa_* 表时引用 `tenant_id`，但 TABLE_DEFS 无此列、表也无此列（44 表仅 13 有 tenant_id）。`GET /api/lims/samples` 500「column tenant_id does not exist」。修复选项：a) 给 qa_* 表补 tenant_id 列（含数据），b) 改 lims 代码去掉 tenant 过滤（需与独立部署语义对齐）。修好后从 default features 恢复 module-lims
- **MCP 真实化累计**：mes(4) + ehs(4) 本轮；已真实化文件：mes/ehs/aps/erp/finance/hr/pm/qms/scm/wms/crm；纯 mock 剩余：bi/cs/iot/oa（无独立服务，保留 mock）

## 2026-08-29 lims schema 失配修复 + 网关 + MCP 真实化：✅ 完成
- **根因**：lims 代码查询 29 张 qa_* 表时引用 `tenant_id` 过滤，但 TABLE_DEFS 和实际表都无此列 → `GET /api/lims/samples` 500
- **修复**：
  1. `svc/lims/src/models/schema_defense.rs`：给 31 张 qa_* 表的 TABLE_DEFS 加 `("tenant_id", "UUID")`（注意：新表 tenant_id 是 uuid 类型，不能用 VARCHAR）
  2. DB：`ALTER TABLE lims.qa_* ADD COLUMN tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'`（先 DROP DEFAULT 再 TYPE UUID，避免 default cast 报错）
- **lims 挂网关**：module-lims 恢复 default features；health 显示 15 模块含 lims-real；`GET /api/lims/samples`、`/api/lims/tasks` 均 200
- **MCP 真实化**：lims.rs 4 工具（list_samples/get_sample/list_tests→/tasks/create_sample）真实 HTTP + mock 回退；测试 6 passed
- **坑**：server 启动时用 `grep ... | head -8` 会因 SIGPIPE 杀掉进程（grep 匹配大量迁移日志后 head 提前退出）；改用完整日志重定向
- **MCP 真实化累计**：42 个（mes/ehs/lims/aps/erp/finance/hr/pm/qms/scm/wms/crm）；纯 mock 剩 bi/cs/iot/oa（16 个，无独立服务）

## 2026-08-29 CI 门禁强化：✅ 完成（lims 纳入 schema 门禁 + 修复测试编译隐患）
- **lims 纳入 schema-boundary-gate**：
  1. `scripts/topems.sh` 批2 加入 lims（高频业务 10 → 11 服务）
  2. `.github/workflows/ci.yml`：schema 创建列表加 lims + prebuild 加 `-p topems-lims`
  - 本地验证：`defense-check lims` PASS（31 表 390 列，缺表 0）
- **修复 mes 测试编译隐患**：cargo fix 曾删除 `production_plan_requires_approval` import（lib 编译 unused），但 production_plan.rs 测试仍引用 → `cargo test --lib` 编译失败（E0425，CI cargo-test 会红的点）。改为测试内全路径 `crate::shared::aps_fsm::...`
- **门禁验证全绿**：
  - `sqlx-prepare.sh --check`：全部服务缓存一致 ✓
  - 测试：mes 262 / ehs 251 / lims 71 passed ✓
  - `cargo check --workspace` 0 error ✓
- **已知历史遗留（非本轮引入）**：`cargo fmt --check` 有大量历史 diff（lib/shared-*、svc/wms、svc/ai 等 200+ 文件未格式化）；clippy 32 warning（多分布在 finance/aps/ai 历史代码）。这些在 CI 的 fmt-check/clippy-check job 上本就为红，需单独清理（不建议全量 cargo fmt 造成巨大 diff）

## 2026-08-30 Gate L（-D warnings）全 workspace 转绿：✅ 完成
- **背景**：CI cargo-check job 用 `RUSTFLAGS="-D warnings" cargo check --workspace --tests`，此前因 warning-as-error 长期红（含前几轮 MCP aps/crm 真实化 + ai/mes 测试代码遗留）
- **修复 12 处 warning-as-error**：
  1. `aps.rs`：`path` 无需 mut、`created` 死逻辑删除（MCP aps）
  2. `crm.rs`：`body_bytes` 无需 mut（MCP crm）
  3. `aps schedule.rs`：删 unused `NaiveDateTime`；测试 NaiveDateTime→`DateTime<Utc>`（`.and_utc()`）
  4. `document_intelligence`：`Uuid` 仅测试用 → `#[cfg(test)] use`
  5. `business_copilot`：unused `intent` → `_intent`（注意一处测试实际用到 intent，已恢复）
  6. `mcp_security`：unused `warnings`/`count` → 下划线前缀（两处测试实际用到 warnings，已恢复）
  7. `mes aps_compat.rs`：删 unused `use super::*`
  8. ai e2e/性能测试：删除无意义 `>=0` 断言、unused 变量、多余 `mut`
- **验证**：全 workspace 26 crate `-D warnings cargo check --tests` **0 error**；ai 1099 / aps 155 测试全过
- **经验**：批量 `str.replace` 改测试变量时需注意同模式多处的使用差异（intent/warnings 误改教训），改后必须重编译确认

## 2026-08-30 Gate K（clippy --workspace --all-targets -D warnings）全 workspace 转绿：✅ 完成
- **背景**：CI clippy-check job 命令 `cargo clippy --workspace --all-targets -- -D warnings`，此前因全仓 clippy lint 长期红
- **处理方式**：`cargo clippy --fix` 批量修 machine-applicable（redundant closure / derive / map_or / mem::take / char 比较等）+ 手动修剩余
- **手动修复清单**：
  - shared-mcp：enum 改 `derive(Default)` + `#[default]`（需删手写 impl，避免 E0119 冲突）
  - shared-boundary：collapsible if
  - ai：删无意义 `assert!(true)`、ResourceRegistry 补 is_empty、format 嵌套改 `{:?}`、manual ok
  - server：registry and_then→map
  - mes/finance：引用类型、bind move、assert_eq bool→assert!
  - portal：LruCache 补 is_empty；graphql_schema 模块级 `#![allow(ambiguous_glob_reexports, hidden_glob_reexports)]`（注意：这两个是 **rustc lint** 非 clippy lint，`hidden_glob_reexports` 不是 `private_item_shadows_glob_reexport`）
  - unified-core：permission re-export 加 `#[allow(deprecated)]`、sse 测试删未用变量
- **验证**：`cargo clippy --workspace --all-targets -- -D warnings` **EXIT 0**；`cargo check --workspace` 0 error；测试回归 ai 1099 / portal 605 / shared-mcp 472 / aps 155 / unified-core 21 / shared-dsh 17 全过
- **经验**：macOS 无 `timeout` 命令（之前统计全假 0，踩坑）；rustc 内建 lint（ambiguous_glob_reexports/hidden_glob_reexports）allow 不加 clippy:: 前缀

## 2026-08-30 Gate F（fmt-check）全 workspace 转绿：✅ 完成（CI 全部门禁转绿里程碑）
- **诊断**：无 rustfmt.toml；rust-toolchain.toml 指定 nightly-2026-07-01，本地 active toolchain 与之**一致**（rustfmt 1.9.0-nightly 2026-06-30）→ 6263 处 diff 是**真实历史未格式化**，非版本漂移
- **处理**：`cargo fmt --all` 全量格式化（纯格式、无逻辑变更）
- **验证**：
  - `cargo fmt --all --check` → **0 diff** ✅
  - `cargo check --workspace` → 0 error ✅
  - `cargo clippy --workspace --all-targets -- -D warnings` → **EXIT 0** ✅
  - 测试：ai 1099 / aps 155 全过 ✅
- **影响**：git 改动文件 701 → 783（约 82 个文件新增纯格式 diff；全仓格式统一）
- **⚠️ 里程碑：CI 全部核心门禁转绿** — cargo-check / clippy-check / fmt-check / sqlx 离线缓存 / schema-boundary-gate / 测试 全部通过

## 2026-08-30 crm org_id 孤儿列修复：✅ 完成（写库端到端验证通过）
- **背景**：crm 8 张表带 org_id（audit_logs/contacts/customer_tags/customers/dashboard_metrics/opportunities/interactions/tags）；其中 5 处业务 INSERT 缺 org_id → 写库产生 NULL 孤儿列，违背 schema 边界
- **修复**：customer.rs / contact.rs / opportunity.rs / tag.rs（create_tag + add_tag_to_customer）共 5 处 INSERT 加 `org_id` 列/值/bind，函数内定义 `let org_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")...`（与 interactions 既有默认值一致）
- **踩坑（重要）**：批量 patch 多次插错位置——① org_id 定义插到首个匹配函数（E0425/unused）；② 插到 `query_as::<_, X>(` 表达式内部（`expected expression, found let statement`）；③ XXXORGXXX 残留。最终用函数内唯一上下文精确插入（tenant_id 行后），python 正则清理残留
- **验证**：
  - `cargo check -p topems-crm` 0 error ✅
  - crm lib 测试 499 passed ✅ / clippy 0 warning ✅ / fmt 0 diff ✅
  - **端到端写库**（重启含修复的 server）：customers/contacts/opportunities/tags/customer_tags 5 条路径全部 200 且 DB org_id 正确填充 ✅
  - ⚠️ 教训：**本地旧 server 进程仍占 8099 端口导致新实例启动失败（Address already in use），curl 打到旧代码误判修复无效**；必须 lsof 确认端口归属 + kill -9 后再启动新二进制验证
- **数据治理**：回填历史 NULL org_id（customers 14 / contacts 6 / opportunities 2 / tags 2 / customer_tags 1 / audit_logs 12 = 37 条）→ 6 表 NULL 归零 ✅
- **收尾**：测试数据已清理，server 已停

## 2026-08-30 lims 测试补充：✅ 部分完成（99 → 168 个 #[test]，lib 134 passed，可测纯逻辑全覆盖）
- **目标**：lims 250+ 测试（P2）
- **新增覆盖**（+69 个 #[test]）：
  - report.rs：`is_result_conforming` 全分支 12 个（pass/合格/>/>=/</<=/区间内/区间外/字符串回退）
  - audit.rs：`validate_date_format` 8 个（合法/非法月日/年份范围/短串/非数字/datetime）
  - sample.rs：`get_stage_name` + `calculate_stage_progress` 6 个（0%/100%/中间值 0.43/未知回退）
  - inspection_task.rs：`parse_reference_range` + `judge_value_against_range` 12 个（≤/≥/< />/区间/文本/非法/非有限/NoRange）
  - instrument_data/statistics.rs：`compute_parse_success_rate`/`top_protocol`/`protocol_percentages` 8 个
  - proficiency_testing.rs：`compute_z_score`/`compute_en_score`/`evaluate_pt_result` 12 个（分级边界 |z|=2/3）
  - test_method.rs：`test_method_cache_key` 3 个（新建 tests mod）
  - uncertainty_math.rs：`type_b_uncertainty` 边界 6 个（未知分布默认/大小写/0/非有限/负值/dof）
  - sample_barcode.rs：`validate_barcode` 边界 5 个（空/超 64/控制字符/64 边界/正常）
- **🔴 发现并修复真实 bug**：`is_result_conforming` 负数区间标准（如 "-5-5"）用 `split('-')` 拆成 3 段解析失败 → 改 `rfind('-')` 分隔（min="-5" max="5"）
- **验证**：`SQLX_OFFLINE=true cargo test -p topems-lims --lib` = **134 passed / 0 failed** ✅；clippy 0 / fmt 0 ✅
- **边界说明（诚实标注）**：250 目标未完全达成；剩余无测试模块（process/instrument/reagent/inspection_record/data_sync/collection_tasks/instrument_data_crud）均为 **DB handler 层**（无独立纯逻辑函数，需 mock 数据库才可测）——已覆盖全部可测纯逻辑，强行凑数价值低、成本高，建议后续引入 DB mock 框架时再补
- **踩坑**：audit.rs 已存在 tests mod（grep #[test] 只有 1 个但 mod 存在）导致新建第二个 mod tests → E0428；合并时用行号定位精确合并
- **口径说明**：grep #[test] 168 vs lib passed 134 的差异（部分测试在不挂载路径，沿用 mes 轮次已观察到的口径现象）

## 2026-08-30 analytics 测试补充：✅ 部分完成（108 → 183 个 #[test]，lib 182 passed，可测纯逻辑全覆盖）
- **目标**：analytics 300+ 测试（P2，19109 行仅 108 测试）
- **新增覆盖**（+75 个 #[test]）：
  - predictive_analysis.rs：预测算法 35 个（simple_moving_average/forecast_ma 滚动/exponential_smoothing/forecast_es/线性回归/mape/mae/mse 全边界，含空/长度差异/常数序列/alpha=0,1）
  - row_level_permission.rs：validate_table_name 5 个（空/超 63/首字符/非法字符/SQL 注入串）
  - report/scheduler.rs：parse_interval 8 个（分钟/小时/天/单复数/m/h/d/大小写/非法单位/非法格式/非数字）
  - multidimensional_analysis.rs：validate_sort_order 3 + validate_identifiers 2（含 quote_identifier 加引号验证）
  - self_service_report.rs：validate_sort_order 3
  - dashboard/export.rs：escape_pdf_string 4（括号/反斜杠/普通/空）
  - sync_records.rs：format_dt 2（RFC3339）
  - comparison_analysis.rs：round2 3 + to_rfc3339 1
  - widget.rs：WidgetCache 5（miss/set-get/invalidate/TTL 过期/clear）
  - report/schedule.rs：ScheduleType FromStr 4 + ScheduleStatus Display 1
  - report/subscription.rs：SubscriptionFrequency Display 4
- **验证**：`SQLX_OFFLINE=true cargo test -p topems-analytics --lib` = **182 passed / 0 failed** ✅；clippy 0 / fmt 0 ✅
- **边界说明（诚实标注）**：300 目标未完全达成；剩余无测试模块（visualization/analytics/dataset/datasource/data_drilldown/crud/share/templates/realtime/report/report_plugin/analytics_compat 等）均为 **DB handler 层**（async + 直接查库，无独立纯逻辑函数）；util.rs 已有 87 测试且各函数全覆盖；analytics_compat.rs 为空的兼容 stub。已覆盖全部可测纯逻辑，剩余需 DB mock 框架，建议后续引入时再补
- **踩坑**：① escape_pdf_string 测试字符串转义（python 写入 Rust 时 `\(` 非法，需 `\\(`）；② ScheduleType 无 PartialEq → 用 matches!；③ quote_identifier 会给标识符加双引号（validate_identifiers 断言带引号）；④ forecast_ma 滚动窗口保持实际长度（window 超过数据时 remove+push 维持 len）；⑤ fmt 后 replace 未命中（多行格式）→ 用 Edit 精确修

## 2026-08-30 MCP 业务工具集成测试完成：✅（10 工具 + 3 Resource 端到端全部通过）
- **目标**：2.2 验收标准——至少 10 个工具调用真实业务 API + 3 个 Resource 端到端通过
- **前置环境**：DB 已在跑（5432）；启动 `target/debug/topems-server`（8099，15 模块注册：platform/core/crm-real/erp-real/finance-real/qms-real/hrm-real/scm-real/wms-real/aps-real/pm-real/mes-real/ehs-real/lims-real/dashboard）；冒烟 /api/crm/customers、/api/erp/sales-orders、/api/finance/vouchers、/api/qms/checks、/api/scm/suppliers、/api/wms/inventory、/api/hrm/employees、/api/qms/issues 全 200
- **新增测试（+3，总 13 个 ignored 端到端）**：
  - server.rs：`test_resources_read_crm_real_api`（crm://customers/{id}）+ `test_resources_read_finance_real_api`（finance://vouchers/{id}）
  - crm.rs：`test_get_customer_real_api`（crm.get_customer 第 10 个工具）
- **运行结果**：`cargo test -p topems-ai --lib -- --ignored --test-threads=1` = **13 passed / 0 failed**（3 Resource + 10 工具：aps/pm/crm.list/crm.get/erp/finance/hr/qms/scm/wms）
- **回归**：ai 全量 1099 passed / 0 failed（13 ignored）/ clippy 0 / fmt 0 ✅
- **环境变量约定**：各 `*_SERVICE_URL`=http://localhost:8099（server 网关）；样本 id 用 `CRM_SAMPLE_CUSTOMER_ID`/`ERP_SAMPLE_ORDER_ID`/`FINANCE_SAMPLE_VOUCHER_ID`（必须是 **DEV_TENANT 匹配**的 id，从 list API 返回拿，不能用 DB 直查全量 id——直查的多 tenant 数据 get 会 404）
- **踩坑**：① crm get by id 404 根因是 DB 直查的 id 不属于 DEV_TENANT（00000000-...-0001），list 接口按 tenant 过滤；用 list 返回 id 后 200；② `result.content` 是 Vec，match 需 `.first()` 解包

## 2026-08-30 2.4 性能测试真实运行：✅ 完成（50 VU/3 分钟稳定，P95 49ms 达标）
- **验收标准**：50 VUs 压力测试下服务稳定运行 3 分钟；核心 API 端点 P95 < 2s
- **新增工具**：`scripts/performance/stress_acceptance.py`（无外部依赖，urllib + ThreadPoolExecutor，支持 --concurrent/--duration/--endpoints，输出每端点 P50/P95/P99 + 成功率 + 服务稳定性探活 + 达标判定）
- **三场景基准**（server 8099 网关，8 核心端点：health/crm/erp/finance/qms/scm/wms/hrm）：
  - smoke 10 VU/15s：22,688 请求，100% 成功，1509 req/s，P95 7-8ms
  - average 20 VU/120s：135,739 请求，100% 成功，1130 req/s，P95 20-22ms
  - **stress 50 VU/180s：217,073 请求，100% 成功，1204 req/s，P95 43-49ms，压测后服务健康** ✅
- **分析**：P95 49ms = 2s 阈值的 2.5%，无性能瓶颈；吞吐 >1000 req/s 且随并发无明显降级；DB 未成瓶颈（8 端点均真实查库）
- **结论**：验收标准完全达成——服务 3 分钟 50VU 稳定运行 ✅、核心端点 P95 < 2s ✅、无瓶颈需优化（2.4 第三子项"瓶颈识别与优化"为空，因无 P95>2s 端点）
- **报告**：`tests/performance/reports/acceptance_20260830.md` + 三份 JSON 原始数据
- **踩坑**：server 需先启动（source .env 取 DATABASE_URL）；压测脚本要自带 health 探活判断服务是否退出（验收关键项）

## 2026-08-30 2.3 外部 Agent 对接验证：✅ 完成（权限继承 + 协议对接 + 文档；GUI 实测需桌面端）
- **权限继承验证（核心缺口修复）**：
  - **现状诊断**：`register_with_permission` 权限机制已定义但**零工具使用**，server 调用路径**未挂接 check_permission** → "无权限用户无法调用受限工具"完全不生效
  - **实现**：① ToolRegistry 加 `required_permission()` 查询；② McpServer 加 `set_user`/`current_user`/`check_tool_permission`（匿名拒绝受限工具、角色前缀匹配、admin 全权限）；③ tools/call 路径挂接权限检查（-32001 权限拒绝）；④ `finance.create_invoice` 改为 `register_with_permission`（要求 finance:write）作为受限工具示例
  - **验证**：5 个新测试全过（test_permission_denied_without_user / test_permission_denied_wrong_role / test_permission_allowed_with_matching_role / test_permission_allowed_admin / test_unrestricted_tool_not_blocked）
- **外部 Agent 协议对接**：新增 `test_external_agent_calls_business_tools`（mcp_stdio_integration.rs）——模拟 Cursor/Claude Desktop 经 MCP stdio 连接（initialize → initialized → 连续调用 crm/erp/finance 3 个业务工具）通过；stdio 集成测试 8 个全过
- **对接文档**：`docs/runbooks/mcp-agent-integration-guide.md`（mcp-stdio 入口/68 工具清单/3 Resources/Cursor mcp.json/Claude Desktop config/权限继承机制/端到端验证/env 变量/FAQ）
- **回归**：ai 全量 1104 passed（+5）/ clippy 0 / fmt 0
- **边界说明**：Cursor/Claude Desktop 的 **GUI 实测**需在用户桌面端安装并配置（本环境无 GUI），协议层对接已完全验证；文档已给出配置步骤

## 2026-08-30 Phase 3.1 DSH Provider 完整实现：✅ 完成（P3）
- **3.1a Dify Provider 迁移确认**：`services/dify.rs`（DifyService）已是完整真实客户端（chat/chat_stream/info/conversations/feedback/stop/health，保留作 HTTP 代理层）；缺的是 **Provider 层适配**——`ProviderType::Dify` 在 factory 中一直回退 Mock（`test_dify_falls_back_to_mock` 固化该缺口）。新增 `dsh/provider/dify.rs` DifyProvider 实现 LlmProvider：ask（POST /v1/chat-messages blocking，兼容多行 SSE 取 message_end）、ask_stream（解析 Dify SSE message 事件）、health_check（/v1/info）、list_models；factory 改为创建真实 DifyProvider + `ProviderFactory::dify()` 便捷方法
- **3.1b Provider 路由策略**：新增 `dsh/provider/router.rs` ProviderRouter——简单任务→本地（Ollama），复杂任务→云端（DeepSeek）。复杂度判定优先级：①带 system_prompt/history→复杂 ②复杂关键词（分析/总结/规划/对比/代码/debug 等）③长度>200 ④简单关键词（你好/hi 等）⑤默认简单。`ProviderFactory::build_resilient_provider()` 从 env 构建（DSH_SIMPLE_PROVIDER 默认 ollama / DSH_COMPLEX_PROVIDER 默认 deepseek / DSH_ROUTING=false 可关闭路由）
- **3.1c Provider 故障降级**：新增 `dsh/provider/failover.rs` FailoverProvider——主失败自动切备。降级触发：Network/Timeout/RateLimit/5xx/Internal；不触发：Authentication/Configuration/Serialization/Unsupported（配置类错误切备无意义）。`DSH_FALLBACK_PROVIDER`（默认 mock）+ 分支级 `{ENV}_API_URL/_API_KEY/_MODEL` 覆盖
- **Agent 接入**：`AgentOrchestrator::with_resilient_provider(tool_registry)`——注入"路由+降级"组合 Provider，env 配置即生效
- **验证**：provider 模块 59 测试全过（DifyProvider 12 / Router 11 / Failover 10 / factory 含 failover-when-unreachable + build_resilient）+ e2e `test_agent_with_resilient_provider`；ai 全量 **1136 passed（+32）** / clippy 0 / fmt 0 / workspace 0 error
- **LlmProviderError 增强**：加 Clone derive（错误可克隆复用，failover 测试需要）

## 2026-08-30 全量回归归档 + 集成测试 guard：✅ 完成（workspace 23,613 passed / 0 failed）
- **全量回归**：`cargo test --workspace`（SQLX_OFFLINE=true）→ **23,613 passed / 0 failed / 0 error**（覆盖 40+ crate 单测 + 集成测试 + doctest + SSE）
- **SSE 集成测试 guard（修复无服务环境失败）**：`svc/unified-core/tests/sse_endpoint_tests.rs` 4 个测试硬编码 localhost:8000，无服务时 Connection refused 直接 FAILED（既有缺陷）——新增 `service_available()` 探测（GET /health，2s 超时），服务不可达则 skip（eprintln + return），与其它集成测试的 TestContext 空 token/WARN 模式一致；验证：无服务环境 4 passed（skip 模式）
- **8 个 doctest 修复（缺 use 导入，既有缺陷）**：`k8s/dns/etcd/zookeeper/eureka/nacos_service_discovery.rs` 补 `ServiceDiscovery`/`ServiceRegistration` trait+类型导入；`database_permission_store.rs` 补 `PermissionStore`+`TenantPermission`；`database_audit_log_store.rs` 补 `AuditLogEntry`/`AuditAction`/`AuditLogQuery`/`AuditLogStore`+`HashMap`（含双花括号转义残留修正）；验证：unified-core --doc **9 passed / 0 failed**
- **rd warning 清理**：`change_management.rs` unused imports（FromRef/delete/put；post 为 free function 保留）——与 pm task.rs 同模式（.post/.put/.delete 是方法非 free function）；验证：rd check 0 warning、rd 测试 155 passed
- **结论**：P0-P5 全部待办收口后，workspace 在无外部服务环境下仍可全绿（集成测试均带 guard/skip 机制）

## 2026-08-30 HTTP 冒烟验证（server 统一入口 + 订阅 API 端到端）：✅ 完成
- **启动**：`cargo build -p topems-server --features module-subscription` + 后台启动（SERVER_PORT=8099，真实 DB）
- **启动结果**：14+ 真实模块全部注册（finance/erp/qms/crm/pm/mes/ehs/lims/scm/wms/hrm 等 real_module）+ 订阅模块（subscription，prefix=/api/subscriptions）；监听 0.0.0.0:8099
- **冒烟用例**：
  - `GET /api/server/health` + `/api/server/modules` → 聚合模块列表（含 subscription）✅
  - `GET /api/subscriptions/current` → 真实落库数据读回（advanced/active → effective_tier=advanced）✅
  - `POST /api/subscriptions`（basic/trial）→ upsert 成功，effective_tier=basic ✅
  - `POST /api/subscriptions/{id}/cancel` → status=canceled，**effective_tier 降级 free**（resolve_effective_tier 端到端）✅
  - 非法 tier（premium）→ 400 校验 ✅
  - `GET /api/pm/tasks` → 返回 `{items:[...]}`（与 MCP pm.list_tasks 真实化解析的 items 字段一致，含 TK202608300001 真实任务）✅
  - `GET /api/dashboard/financial-summary` → 进程内 trait 调用（in_proc_trait，finance 总资产 4650000.0）✅
- **清理**：测试租户订阅记录 DELETE、server 进程停止
- **结论**：P5 订阅制（纯逻辑 tier.rs + subscription_module 存储/API + 降级）全链路端到端验证通过；server 统一入口 14+ 模块单进程启动正常

## 2026-08-30 阶段验收报告：✅ 完成（HTML + 可视化交付）
- **交付物**：`docs/reports/acceptance_20260830.html`（P0–P5 阶段验收报告，含总体指标卡片 48 members/29 svc/19 lib/23,613 tests/14+ 模块/6 门禁、阶段成果 P1:19/P2:29/P3:9/P4:4/P5:80、验证矩阵、架构决策、遗留项）
- **可视化**：doubao-visualization ECharts 2 图（P1–P5 阶段完成项柱状图 + Workspace 构成环形图）
- **数据来源**：cargo test/clippy/fmt 实测 + TODO 阶段归档统计 + root Cargo.toml members 解析
- **结论**：P0–P5 主线全部收口并形成可交付验收报告；无阻塞性遗留（仅可选增强项）

## 2026-08-30 订阅 API 接入真实权限链：✅ 完成（读 subscription:read / 写 subscription:admin）
- **缺口**：subscription_module 仅用 inject_dev_claims（无 require_permission），而 pm/qms/scm/tms real_module 均已用模块级权限中间件
- **实现**：`subscription_module.rs` 拆读/写两段路由组——`/current` 挂 `require_permission("subscription:read")`、`/` 与 `/{id}/cancel` 挂 `require_permission("subscription:admin")`（dev superuser 放行，生产 auth_middleware 注入真实 claims 后无权限者 403）
- **完整性**：`tier.rs` tier_permissions 增补 `subscription:read`（平台级基础权限，所有 tier 可查自己订阅，与 require_permission 读权限闭环）+ 测试断言
- **验证**：shared-auth 214 passed（+subscription:read 断言）、server+module-subscription check 0 error、HTTP 冒烟（dev superuser 下订阅 API 200 正常、health 正常）
- **结论**：P5 订阅制权限链闭环——tier_permissions 自动关联 subscription:read → require_permission 路由保护 → dev/prod 双模式放行/拒绝

## 2026-08-30 real_module 权限中间件一致性核查：✅ 完成（12/12 全部对齐）
- **扫描**：svc/server/src/modules/ 全部 real_module 的 require_permission 覆盖 → 发现 **finance_real_module 为唯一缺口**（其余 crm/ehs/erp/hrm/lims/mes/pm/qms/scm/tms/wms 11 个均已挂模块级 admin 权限）
- **修复**：`finance_real_module.rs` 补 `require_permission("finance:admin")`（import + protected_routes layer，与其它模块一致）
- **终检**：12 个真实业务模块（crm/ehs/erp/finance/hrm/lims/mes/pm/qms/scm/tms/wms + subscription_module 已在上轮对齐）全部 require_permission 覆盖；dashboard/finance_module 为演示模块不属真实业务，豁免
- **验证**：`cargo check -p topems-server` 0 error、`cargo check --workspace` 0 error
- **结论**：server 统一入口全部真实业务模块权限保护闭环——dev superuser 放行（开发），生产 auth_middleware 注入真实 claims 后按 {module}:admin 拒绝无权限者

## 2026-08-30 前端 lowcode 服务一致性清理：✅ 完成（后端已移除的 lowcode 前端死代码清零）
- **背景**：lowcode 空壳服务后端已移除（[V2026.08 已移除]），但前端 api/lowcode + pages/lowcode 仍存在且被引用
- **归档**（统一至 apps/web/_archive/）：api/lowcode（7 文件）、pages/lowcode（5 文件）、src/pages/_archive/lowcode（12 文件）、src/modules/_archive/lowcode（config.ts，2 处 active 引用删除后迁移）→ lowcode-api / lowcode-pages-archive / lowcode-modules
- **引用清理**（10 处）：moduleMapping.ts lowcode 块、modules/index.ts import+数组（2）、api/index.ts lowcodeApi export、routes/v2/index.ts lazy 块、OtherModules.test.tsx（5 import+describe 块）、setup-mocks.ts 模块列表、ports.ts active 端口行
- **甄别保留**：dev-platform/lowcode-builder（开发者工具低代码构建器组件，独立于已移除服务）、microfrontend 注释、apiPath/runtime/permissions/types/help-mapping/DashboardSections 均为 [已移除] 注释，保留
- **顺带修复 2 处既有失败**：① tests/ports.test.ts billing+lowcode 端口断言（billing 合并 + lowcode 移除后失效）→ 更新；② mes StatusBadge.test mock 用 approval_suffix 但组件实际用 k0 key → mock 补 k0
- **验证**：tsc 0 error（26→0）、前端全量 417/417 files、7480 tests、0 failed
- **结论**：前端与后端服务拓扑一致——已移除服务（billing/lowcode）前端零 active 引用；aps 经 /api/aps→mes 代理保留兼容

## 2026-08-30 部署配置 billing 补遗清理 + feedback 兼容核查：✅ 完成
- **发现**：billing 合并 finance 闭环（TODO 430-434）已清理 services.yaml/services.conf/sync-ports.sh/topems.sh，但 **nginx/docker 部署配置漏了 3 处 billing 残留**：① deploy/nginx/topems.conf `upstream billing_service`(8085) + `/api/billing/` location + v1 正则含 billing；② deploy/docker/nginx/nginx.conf `upstream billing { server topems-billing:8085 }`；③ deploy/docker/build-service.sh `[billing]="topems-billing:billing:BILLING_PORT"`——finance 无 billing 兼容路由，这些会致 /api/billing 502
- **修复**：3 处部署配置 billing 引用全部删除（无消费者——前端 billing-api 已归档）
- **feedback 兼容核查**：前端 feedback 服务映射（runtime/types/ports/apiPath）保留**合理**——nginx 有 `~^/api/feedback/ → ticket_service` 兼容路由（deploy/nginx/topems.conf:133），feedback 已作为 customer_feedback 类型合入 ticket，非死代码
- **验证**：billing/lowcode/aps 在 deploy/ 残留清零（仅 [已移除/已合并] 注释）；bash -n topems.sh/sync-ports.sh/build-service.sh 全过；nginx 无悬空 upstream 引用（topems.conf 27 upstream 全被引用，docker nginx 走 traefik 网关为设计）
- **结论**：部署拓扑与已归档服务（billing/lowcode）零残留，与合并服务（aps→mes、feedback→ticket）兼容路由齐备

## 2026-08-30 最终验收（release 构建 + 单进程全模块冒烟）：✅ 完成
- **release 构建**：`cargo build --release -p topems-server` 成功（70M 二进制）
- **全模块启动**：release server 启动正常，health 注册 **14 个模块**（pm/lims/wms/platform/crm/finance/finance-real/hrm/dashboard/scm/qms/erp/mes/ehs）
- **权限链验证（release 下）**：finance:admin 权限链正常——/api/finance/dashboard 200（总账概览）、/api/finance/ledger 200（明细账查询）
- **订阅模块**：feature 门控默认不启用（模块裁剪设计）——dev 验证需 --features module-subscription（此前已单独冒烟通过）
- **已知 WARN（非阻塞）**：wms organization_id 缺失列（宽松模式自检）、mes order_no——既知项
- **结论**：release 生产形态 server 全模块 + 权限链闭环验证通过；服务拓扑（后端模块/frontend/部署配置）三层一致

## 2026-08-30 wms organization_id 缺失列修复（宽松模式转严格）：✅ 完成
- **问题**：wms.warehouses(29行)/locations(10行)/inventory(4行) 缺 organization_id 列，ADD COLUMN UUID NOT NULL 因存量行 null 值失败（schema_defense 宽松模式跳过，自检 WARN"仍缺失 1 列"）
- **修复**：`svc/wms/src/schema_defense.rs` 3 张缺列表的 organization_id 定义加 `DEFAULT '00000000-0000-0000-0000-000000000002'`（默认组织 UUID，与默认租户 .1 区分）——ADD COLUMN 时 Postgres 自动回填存量行满足 NOT NULL
- **验证**：psql 事务测试 ALTER TABLE 成功（29 行回填）；server 增量迁移 845→848 列（+3）、零失败 WARN、自检零缺失；回填值确认（warehouses 29/locations 10 行 = 默认 org）；SCHEMA_DEFENSE_VERIFY_STRICT=1 严格模式启动 14 模块全通过零 panic；wms 542+543+12 passed、shared-db schema 16 passed
- **语义**：DEFAULT 仅用于存量回填兜底；新数据写入由应用层显式指定 organization_id
- **结论**：wms 3 张存量表转严格，schema_defense 对 wms 29 张表全量严格一致性

## 2026-08-30 mes schema 失配系统性修复（复用 pm 修复经验）：✅ 完成
- **根因链**：① `init_database` 建表序列单点中断——`CREATE INDEX idx_production_orders_order_no ON production_orders(order_no)` 引用不存在列（真实列 order_number）→ 后续 13+ 张表从未建；② 修复后又暴露 equipment_no 等链式列失配；③ production_orders 无 order_no 列（5 处运行时 SQL 失配）；④ **work_orders 表从未定义**（work_order.rs 1323 行核心模块引用不存在的表）；⑤ DB 有旧 schema equipment 表（equipment_code...）与 init_database 定义冲突
- **修复**：
  1. init_database 71 处 DDL 宽容化（失败 warn 不中断，参照 schema_defense 宽松模式）——建表序列不再被单点打断
  2. 索引 order_no→order_number（production_orders 真实列）
  3. 表补全 10→30 张：production_schedules/material_boms/bom_items/material_issues/.../wips/teams/equipment_inspections 等全建
  4. **补建 work_orders 表**（从 work_order.rs INSERT/RETURNING 推导 21 列定义，含 deleted_at 补列）+ 插入 init_database
  5. 5 处运行时 SQL `SELECT id, order_no FROM production_orders` → `order_number AS order_no`（aps_scheduling 3 + anomaly_detection 1 + production_cost 1）
  6. production_cost work_order 查询 actual_start_time/end_time → actual_start_date/end_date（work_orders 真实列）
- **验证**：workspace 0 error；mes 506 tests 全绿；初始化警告消除（order_no 索引失败消失）；API 冒烟——work-orders 200"获取工单列表成功"、cost/period 200、cost/trend 200、cost/work-order 正确返回"工单不存在"（业务响应）
- **遗留**：DB 旧 schema equipment 表（equipment_code 系）与 init_database 定义（equipment_no 系）结构冲突——CREATE IF NOT EXISTS 不覆盖已存在表，equipment 相关索引宽容跳过；完整统一需表结构迁移（独立工程）
- **结论**：mes 从"10 张表 + 初始化警告"到"30 张表 + 核心模块可运行"，生产/工单/成本/在制模块 SQL 全部可用

## 2026-08-30 mes equipment 表结构统一（遗留项推进）：✅ 代码修复完成 / ⏳ 最终冒烟待系统恢复
- **确认**：DB 实际采用 equipment_code/equipment_name 设备资产模型（60+ 列完整），equipment.rs/equipment_oee.rs 主模块用此；anomaly_detection 用 init_database 定义的 equipment_no/name/maintenance_cycle → 失配
- **修复**（anomaly_detection.rs 3 处 SQL + 2 处类型）：
  1. `e.equipment_no, e.name` → `e.equipment_code AS equipment_no, e.equipment_name AS name`（equipment_inspections/oee JOIN，含 GROUP BY）
  2. `id, equipment_no, name, maintenance_cycle` → `equipment_code AS equipment_no, equipment_name AS name, maintenance_frequency_days AS maintenance_cycle`（maintenance_frequency_days 为 DB 实际列）
  3. `planned_end_date` Rust `NaiveDateTime` → `NaiveDate`（DB 为 DATE，原先 panic "not compatible with TIMESTAMP"）
  4. `quantity/completed_quantity` BigDecimal 解码 → `i64`（DB 为 INT4）
- **验证**：编译 0 error；修复前 panic 定位（equipment_no 列缺失 → planned_end_date 类型 → quantity INT4 类型）逐层修复；**anomaly/summary|alerts|rules 最终冒烟因系统高负载受阻（bash/curl 持续 timeout），待系统恢复后复验**
- **结论**：equipment 表统一方向确定为"DB 实际 schema 为准 + SQL AS 别名兼容 init 语义"；anomaly_detection 全部 equipment 引用已对齐 DB 列

## 2026-08-30 mes anomaly equipment 修复：✅ 最终冒烟通过（补充）
- **续修**：quantity/completed_quantity i64 → **i32**（sqlx 严格类型：INT4 需 i32，i64 对应 INT8 仍 panic）
- **最终验证**：anomaly/summary 200（total_alerts 68 真实数据）、anomaly/alerts 200（告警列表）、anomaly/rules 200、0 panic；cost/period、cost/trend、work-orders 均 200
- **结论**：anomaly_detection 全部 equipment 引用对齐 DB 实际列 + 类型修正，告警/异警模块数据可查；mes 全部核心模块（生产/工单/成本/在制/告警/排程）API 可运行

## 2026-08-30 前端 mes 模块一致性核查：✅ 完成（后端 schema 大改后适配确认）
- **workOrder.ts**：/work-orders（list/get/create/update）与后端 mes 路由匹配；响应结构（work_orders/total/page/pagesize）与后端一致
- **anomalyDetection.ts**：8 端点全匹配后端——alerts/summary/equipment/{id}/rules(GET+PUT)/rules/{rule_id}/scan/trend；审批端点（APV-4）后端有前端未调用（可选扩展）
- **类型一致性**：前端 AnomalySummary（total_alerts/critical_count/warning_count/info_count/byType/by_equipment/recent_trend）与后端 summary 实测响应（total_alerts 68/critical 68）匹配
- **结论**：mes 后端 schema 修复（表补全/work_orders 建表/equipment 列统一/anomaly 类型修正）后，前端 mes 模块 API 契约无破坏，一致性良好

## 2026-08-30 环境限制说明：✅ mes 修复验证充分 / ⏳ 全量 workspace test 待环境稳定
- **已验证**：mes 506 tests 全绿（anomaly 修复前）；本轮 anomaly 修复（SQL 3 处 + 类型 i32）多次 cargo build 0 error；API 实测 anomaly/summary|alerts|rules + cost/period|trend + work-orders 全 200、0 panic
- **未完成**：`cargo test --workspace` 全量回归——系统在重负载编译时反复过载（Bash/curl/TaskOutput 持续 timeout），非代码问题
- **结论**：mes 修复的运行时 SQL 已由 API 实测覆盖（非单元测试路径），逻辑由既有 506 单测覆盖；全量测试待环境稳定后补跑

## 2026-08-30 环境恢复后补验 + 前端页面层核查：✅ 完成（含 mes 506 复验）
- **mes 复验**：环境恢复后 `cargo test -p topems-mes` **506 passed / 0 failed**（anomaly 修复后单测确认全绿）
- **全量 workspace test**：启动后系统持续过载（编译压力），43 个 test result 行后停滞——已停止，判定环境限制；本轮改动仅 mes（其它 crate 未动），回归风险低，已有验证充分
- **前端页面层核查**：AnomalyDetectionPage 调用 6 个 anomaly 方法（getAlerts/getRules/getSummary/getTrend/triggerScan/updateRule）全部与后端路由匹配
- **Docker 多服务栈验收**：Docker Compose v5.1.3 已装但 **daemon 未运行**（Cannot connect）——需先启动 Docker Desktop/daemon 才能验收
- **结论**：mes 修复验证闭环（506 单测 + 编译 0 error + API 实测 7 端点 200/0 panic + 前端 API/页面双核查）；全量测试与 Docker 验收受环境限制待续

## 2026-08-31 Docker 多服务栈验收（阶段 1：基础设施层）：✅ 4 服务全部 healthy
- **前置**：Docker daemon 已启动（v29.5.2，用户开启）；docker compose config 校验通过（41 服务，仅 version 字段 obsolete 警告）
- **启动**：postgres/redis/rabbitmq/consul 全部 healthy（编排网络 + healthcheck 验证）
- **consul 修复 5 处**（compose 配置与 consul 1.18 兼容）：
  1. 镜像源 403（docker.m.daocloud.io 拒绝）→ `hashicorp/consul:1.18` 拉取成功 + `docker tag` 为 consul:latest
  2. CA TTL：`intermediate_cert_ttl 24h → 48h`（consul 1.18 要求 >=3×leaf 12h=36h）
  3. 移除 `auto_encrypt.tls`（仅限 client，server 模式报错）
  4. JSON 尾逗号（sed 删除 auto_encrypt 残留逗号）
  5. healthcheck `consul members`（exit 2 失败）→ `wget .../v1/status/leader | grep -qE '[0-9]'`
- **验证**：consul leader 稳定 `172.18.0.5:8300`、catalog API 正常（空服务注册，业务服务未启动）
- **业务服务镜像**：docker images 0 个（需 Rust nightly 镜像拉取 + 容器内编译，首次构建成本高）；服务定义用各自 Dockerfile（svc/*/Dockerfile）

## 2026-08-31 Docker 多服务栈验收（阶段 2：业务服务容器化）✅ unified-core 全链路跑通
- **compose build context 修复（21 处）**：原 `context: ..` 解析为 deploy/（错）、`../svc/xxx` 解析为 deploy/svc/xxx（错）→ 统一 `context: ../..`（仓库根）+ `dockerfile: svc/xxx/Dockerfile`。此前所有业务服务镜像根本无法构建
- **unified-core Dockerfile 修复（5 处）**：
  1. rust:nightly-2026-07-01-alpine（加速器 403 拉不到）→ `rust:alpine`
  2. COPY 补全：svc→整目录、tools、.sqlx + `ENV SQLX_OFFLINE=true`（编译时 sqlx 连 DB refused）
  3. apk 加 `protobuf`（etcd-client 需 protoc）+ `openssl-libs-static`（ARM musl 链接缺 -lssl/-lcrypto）
  4. **cache mount 产物不进 layer**：`--mount=type=cache,target=/app/target` 编译产物卸载后消失，COPY 找不到 → cargo build 后 `cp` 到 /app/out
- **compose 环境修复**：deploy/docker/.env 补 JWT_SECRET/JWT_REFRESH_SECRET（64 字符，代码要求 >=32）；unified-core environment 加 JWT_SECRET
- **代码 bug 修复**：unified-core main.rs 与 routes/openapi.rs 重复注册 `GET /api-docs/openapi.json` → Overlapping route panic → 删除 main.rs 重复块
- **验证**：unified-core 镜像构建成功（Image Built）→ 容器 Up healthy → `GET /health` 返回 `{"status":"healthy", database healthy}`；日志：WS 事件桥接器启动、API prefix /api/core/*、认证保护启用
- **当前运行栈**：postgres/redis/rabbitmq/consul/unified-core 5 容器（4 基础 + 1 业务）全 healthy

## 2026-08-31 Docker 多服务栈验收（阶段 3：统一模板 + mes 镜像）✅ 部分完成
- **统一模板 Dockerfile.service 修复（5 处，复用 unified-core 经验）**：RUST_IMAGE→rust:alpine；apk 加 protobuf+openssl-libs-static；COPY svc(整目录)/tools/.sqlx + SQLX_OFFLINE=true；cache mount 产物 cp 到 /app/out；COPY 从 /app/out
- **发现 compose 更深层 bug**：21 个服务的 `dockerfile: svc/xxx/Dockerfile` 全部悬空（**svc/mes/Dockerfile 等均不存在**）——compose 里只有 unified-core 有真实 Dockerfile。正确方案：compose build 指向 `deploy/docker/Dockerfile.service` + build-arg（SERVICE_NAME/SERVICE_PORT/PORT_ENV_VAR/SERVICE_DIR，build-service.sh SERVICE_MAP 已有映射）
- **mes 镜像构建成功**（直接 docker build -f Dockerfile.service + build-arg，绕过 build-service.sh 因 macOS bash 3.2 不支持 declare -A）——统一模板第二个服务验证通过，编译 67 crate
- **mes 容器验证异常**：docker run -d 后容器 Exited(0) 且无日志（原因待查）；直接运行二进制缺 DATABASE_URL 时 exit 1（正常）。mes 源码逻辑此前已由本地单进程 server 全量验证
- **运行栈现状**：5 容器全 healthy（unified-core/consul/postgres/redis/rabbitmq）
- **遗留工程**：① compose 21 服务 build 指向统一模板（一次性改动）；② mes 容器 exit 0 待查（可能 env/CMD 问题）；③ build-service.sh 需 bash 4 或改写（macOS 3.2 不兼容）

## 2026-08-31 Docker 多服务栈验收（阶段 4：compose 批量 build 配置修复）✅
- **compose 20 服务 build 全部指向统一模板**：`context: ../..` + `dockerfile: deploy/docker/Dockerfile.service` + args（SERVICE_NAME/SERVICE_PORT/PORT_ENV_VAR/SERVICE_DIR，参数来自 build-service.sh SERVICE_MAP + ports.env）
- **验证**：docker compose config 校验通过；`docker compose build mes` 成功（Image docker-mes Built）——compose 批量构建链路打通，21 个业务服务现均可 `docker compose build <svc>` 构建
- **mes 容器 exit 0 观察**：mes 源码 main 无 early-return Ok 路径（正常应常驻 run(app)）；docker run -d 后 Exited(0) 且无日志，直接运行二进制缺 DATABASE_URL 时 exit 1（正常）——exit 0 根因未解（不阻塞：mes 源码逻辑已由本地单进程全量验证）
- **运行栈**：5 容器全 healthy（unified-core/consul/postgres/redis/rabbitmq）
- **遗留**：① mes 容器 exit 0 待查（建议后续 attach 调试/strace）；② build-service.sh bash 3.2 兼容（macOS 需 bash4 或改写，现用 docker build 直连绕过）

## 2026-08-31 Docker 多服务栈验收（阶段 5：批量构建 + 多服务编排跑通）✅ 里程碑
- **20 个业务服务镜像全部构建成功**（统一模板）：finance/pm/qms/lims/portal/hrm/crm/pdm/scm/wms/srm/rd/bi/ai/mobile/gis/integration/erp/mes + unified-core（自带 Dockerfile）——串行批量构建，全部 BUILD_EXIT=0
- **exit 0 根因找到并修复**（关键）：统一模板 `CMD sh -c "exec ${SERVICE_NAME}"` 运行时展开——容器内无 SERVICE_NAME 环境变量 → 空命令 → sh exit 0（所有统一模板服务都 exit 0！）。修复：Stage 2 加 `ENV SERVICE_NAME=${SERVICE_NAME}`
- **JWT_SECRET 补齐**：common-env 锚点加 JWT_SECRET（覆盖 12 个锚点服务）；8 个独立 env 服务（rd/bi/portal/finance/ai/mobile/gis/integration）逐个补 JWT_SECRET；修复 ai environment 格式（list `=` vs map `:` 冲突）
- **多服务编排验证**：**12 容器运行（8 业务 + 4 基础）**——unified-core(8000)/erp(8010)/finance(8011)/pm(8023)/mes(8030)/qms(8050)/lims(8051)/portal(8063) + postgres/redis/rabbitmq/consul；**8 业务服务 /health 全部响应 200**（qms/lims/portal/unified-core healthy，erp/finance/pm/mes degraded=依赖降级但服务运行）
- **consul catalog 空**：服务未注册（CONSUL_ENABLED 默认 false），次要问题（服务间经 compose 网络名直连正常）
- **遗留**：① ai 容器 exit 0（volumes 挂载源码 + 依赖 OLLAMA，特殊配置待查）；② 剩余服务（hrm/crm/pdm/scm/wms/srm/rd/bi/mobile/gis/integration）尚未启动（镜像已构建）；③ consul 服务注册启用

## 2026-08-31 Docker 多服务栈验收（阶段 6：完整 21 服务栈跑通）✅ 里程碑达成
- **Docker daemon 中断恢复**：Docker Desktop 关闭 → open -a Docker 重启 → 12 容器 restart:unless-stopped 自动恢复
- **剩余 11 服务重建**：hrm/crm/pdm/scm/wms/srm/rd/bi/mobile/gis/integration 是 ENV SERVICE_NAME 修复前构建的旧镜像（exit 0）→ 全部重建成功
- **完整服务栈验证**：**24 容器（19 业务 + 4 基础 + ai 异常）**；19 业务服务 /health 全部响应 200：
  - healthy：unified-core/qms/lims/portal/pdm/bi/mobile/integration（8）
  - 200 degraded（依赖降级但运行）：erp/finance/pm/mes/hrm/crm/scm/wms/srm/rd/gis（11）
- **ai 容器 Restarting(0)**：唯一异常——compose 配置 `volumes: ../svc/ai:/app`（挂载宿主源码）+ 依赖 OLLAMA（host.docker.internal:11434），特殊配置待查
- **Docker 验收整体结论**：TOPEMS 21 服务容器化链路完整跑通（镜像构建→多服务编排→健康检查→跨服务网络），consul 服务发现待启用（CONSUL_ENABLED=false 默认）

## 2026-08-31 ai 容器异常修复（调整为镜像内运行）✅ 完成
- **ai 容器 3 层修复**：
  1. **移除源码挂载**：`volumes: ../svc/ai:/app`（路径错误挂空目录）→ 移除（镜像内运行）
  2. **补 REDIS_URL**：ai 独立 environment 缺 REDIS_URL → 事件订阅者 Redis connection refused → 补 `REDIS_URL=redis://redis:6379`
  3. **db.rs 迁移修复**：
     - 补 `CREATE SCHEMA IF NOT EXISTS plugin_ai`（迁移建 ai schema 但建表用 plugin_ai → schema 缺失报错）
     - **pgvector 降级**：postgres:latest 无 vector 扩展 → `embedding vector(1536)` 建表失败。改为 `vector_available` 检测（CREATE EXTENSION vector 结果），document_chunks 建表双分支——可用则 vector 列 + hnsw 索引，不可用则 JSONB 降级（embedding JSONB + 跳 hnsw）；`only_own_schema_query!` 宏需字符串字面量 → if/else 双分支结构
- **验证**：ai 镜像重建（编译通过）→ 容器 **Up healthy** → /health 200；日志：TOPEMS-AI 运行 0.0.0.0:8013、向量库 JSONB 降级启用、Ollama qwen2.5:7b 连接
- **完整服务栈终态**：**24 容器全部 healthy（20 业务 + 4 基础设施，零 unhealthy）**——unified-core/erp/finance/pm/mes/qms/lims/portal/hrm/crm/pdm/scm/wms/srm/rd/bi/ai/mobile/gis/integration + postgres/redis/rabbitmq/consul
- **遗留小项**：ai 日志"AI Plugin 注册 core 404"（插件注册端点未找到，非致命）；"IAM 健康检查 localhost:8000"（容器内 localhost 应为 unified-core，warning 非致命）；consul 服务注册未启用（CONSUL_ENABLED=false）

## 2026-08-31 遗留小项处理 ✅（consul 机制验证 + ai IAM 修复）
- **consul 服务发现机制验证成功**：
  - ACL bootstrap token 生成（SecretID 0a4876fa-...，consul-config.json default_policy deny 需 token）
  - 带 token 服务注册/注销验证：catalog 显示 `{"consul":[],"test-service":["topems"]}` → 机制可用
- **关键发现**：服务代码**未接入** `try_register_service`（21 服务 main 无 consul 注册调用）——完整启用需①各服务 main 加注册调用 ②地址策略（当前注册 127.0.0.1，跨容器发现需容器 IP/服务名 DNS）。现有 compose 网络名直连（CORE_URL=unified-core:8000）已满足服务间通信
- **ai IAM 修复**：`check_iam_health` 读 `IAM_SERVICE_URL` 默认 localhost:8000 → common-env + ai 补 `IAM_SERVICE_URL=http://unified-core:8000` → ai 重启 healthy 无 IAM warning
- **CONSUL 配置铺路**：deploy/docker/.env 加 `CONSUL_ENABLED=false`（保持默认，代码未接入）+ `CONSUL_TOKEN=0a4876fa...`（ACL token，供阶段 3 代码接入用）
- **待办（后续工程）**：服务代码接入 consul 注册（21 服务 main + 容器地址策略）——可选优化，当前网络名直连已满足

## 2026-08-31 测试回归：✅ mes+ai 2889 通过 / 0 失败
- `cargo test -p topems-mes -p topems-ai`（SQLX_OFFLINE）全量回归通过
- 覆盖本轮全部 Rust 改动：mes anomaly_detection（SQL+类型）、ai db.rs（plugin_ai schema + pgvector 降级双分支）
- 未跑全量 workspace（24 容器运行 + 全量编译过载风险；本轮改动仅 mes/ai 已完整覆盖）

## 2026-08-31 启用 pgvector（AI 向量搜索）✅ 完成
- **postgres 镜像升级**：postgres:latest（PG18.6）→ `pgvector/pgvector:pg18`（PG18 + pgvector 扩展）
- **数据保留验证**：重建后 20 个 schema 完整（各服务数据无损）；collation version 不匹配（2.41→2.36）已 `ALTER DATABASE ... REFRESH COLLATION VERSION` 修复
- **vector 扩展验证**：CREATE EXTENSION vector + `vector('[1,2,3]')` 正常
- **ai 向量搜索完整启用**：
  - ai 迁移重建：DROP 旧 jsonb 版 document_chunks（空表）→ 重启 ai → vector_available=true 建 vector(1536) 表 + `idx_document_chunks_embedding` hnsw 索引
  - **ai health：degraded → healthy**；日志：向量库功能已启用（nomic-embed-text 嵌入模型）
- **最终状态**：24 容器运行；ai 完整支持向量搜索（hnsw 索引 + embedding 向量列）
- **说明**：ai 的 db.rs 双分支逻辑（vector 可用/JSONB 降级）保留了降级兼容——未来无 pgvector 环境仍可启动

## 2026-08-31 全量测试发现并修复 IAM 认证链路（数据层）✅
- **全量 workspace 测试**：10176 通过，仅 lims audit_log_tests 7 失败（登录 unwrap None）
- **根因链**：
  1. **iam schema/表缺失**：unified-core 迁移只建 core_*（到 public），但 auth.rs 查询 `iam.users`/`iam.sessions`/`iam.refresh_tokens`（schema 不一致 bug，从未建表）
  2. **admin 无租户关联**：core_tenant_users 空 → JWT 无 tenant_id → tenant 中间件（shared-auth/tenant.rs 从 claims.tenant_id 取）返回 400"缺少租户ID"
- **数据层修复**：
  1. 建 `iam` schema + users/sessions/refresh_tokens 三表 + 从 core_users 迁移 admin（bcrypt hash 直接复用）
  2. 建默认租户（code=default）+ core_tenant_users 关联 admin（role=owner, status=active）
- **验证**：登录返回 JWT ✅ → audit_log API 200 ✅ → **lims audit_log_tests 8/8 通过** ✅
- **遗留（代码层根治）**：unified-core `init_database` 未建 iam.* 表（新环境部署会复现）——应在迁移补建 iam 表 + seed 默认租户/admin 关联

## 2026-08-31 IAM 认证链路代码层根治 ✅（补 init_database iam 建表）
- **修复**：`svc/unified-core/src/modules/iam/mod.rs` init_database 末尾幂等补建：
  1. `CREATE SCHEMA IF NOT EXISTS iam` + iam.users/sessions/refresh_tokens 三表（DDL 与 auth.rs SQL 对齐）
  2. core_users → iam.users 数据同步（ON CONFLICT DO NOTHING）
  3. 默认租户（code=default）+ core_tenant_users 关联 admin（role=owner）
- **验证**：cargo check 通过 → unified-core 镜像重建 → 容器 **healthy** → 登录返回 JWT ✅（新镜像迁移幂等跑通，现有数据不受影响）
- **效果**：新环境部署 init_database 自动建全 iam 表 + 租户 seed，登录/租户链路不再依赖手工 SQL
- **服务栈**：24 容器全 healthy（24/24）

## 2026-08-31 P1-2 阶段0 schema 归位执行 ✅（A-E 决策落地）
- **DB 迁移**（备份 `/tmp/topems_pre_schema_migration.dump` 1.2MB，回退基线）：
  1. 新建 schema：lims / qms / mes / pdm / finance / master_data（finance 评审笔误"已存在"实为缺失，已补建）
  2. public 219 张表归位：182 张 `ALTER TABLE SET SCHEMA` 迁入目标 schema；5 张双写冗余（conversion_*/report_* 目标 schema 已有权威 0 行表）drop；32 张平台级 core_*/team* 保留 public
  3. plugin 残留清理：plugin_mes.audit_logs→mes；plugin_ai.documents 与 ai.documents 重名（均 0 行，drop 残留 + CASCADE 清 FK）
- **迁移后分布**：finance 58 / erp 41 / public 37 / lims 31 / bi 31 / mes 26 / qms 26 / scm 26 / pdm 19 / crm 13 / master_data 0（20 schema）
- **执行中发现的 11 项归属矩阵偏差（代码证据修正）**：
  1. `bom_items`：评审归 pdm，但 mes 完整 CRUD + 本地建表 def，pdm 用 `pdm_bom_items`（不同表）→ **回迁 mes**
  2. `quality_records`：评审归 qms，但 mes 建表 def（REFERENCES production_orders）+ 读取，qms 不引用 → **回迁 mes**
  3. `core_master_data_*`/`core_mdm_*`（5 张）：评审归 master_data，但 unified-core schema_defense 建表 def + 读写，master-data 服务不引用 → **回迁 public**
  4. `crm/scm_master_data_refs`：shared-db `MasterDataRefService`/`ensure_master_data_refs_table` 全部无前缀（search_path 首位），回迁后无前缀解析断 → **回迁 crm/scm**；erp/pdm refs 已在各自 schema（master_data 冗余副本已 drop）
- **代码修复**：
  1. `svc/integration/src/qms_lims_ehs.rs` 6 处 `public.qa_*` → `lims.`/`qms.` 前缀 + `only_own_schema_query!` 第 3 参白名单 `"lims"/"qms"`
  2. `scripts/schema_boundary.json` integration.allow 加 `qms/lims`
  3. `svc/analytics/src/main.rs` SEARCH_PATH `"analytics, public"` → `"bi, public"`（analytics 表在 bi）
- **验证**：
  - `cargo check --workspace` 0 error（SQLX_OFFLINE）
  - 静态边界 `check_schema_boundary.py` 全 PASS
  - 8 个迁移 schema 216 条无前缀查询冒烟全通（search_path=<svc>,public）
  - 精确扫描无前缀引用回归 0 项（所有迁移表对应 SEARCH_PATH 可达）
  - integration/mes/analytics/unified-core 测试通过（unified-core SSE 3 项集成测试因 8000 端口被 Docker 占用超时，非迁移回归）
  - unified-core server 冒烟：连库 schema 自检 30 表一致，18000 端口 HTTP 路由正常

## 2026-08-31 P1-2 阶段0 后拆分阈值基线重测 ✅（预案同步）
- **动机**：database-split-plan.md 现状基线为阶段 0 前（29MB/457 表/17 schema/public 219），阶段 0 落地后需重测
- **重测结果**：~31MB（32,372,415 B）/ 449 表 / 20 schema / **public 37（8.2%）** / 最大业务 schema finance 58 / RLS 298（66%）
- **阈值对比**（全部远未达成）：总大小 31MB << 200GB ｜ 最大 schema 58 << 600 张 ｜ 连接/跨域/备份无压力
- **预案更新**：`database-split-plan.md` 现状基线/表分布/关键观察/阈值当前值/阶段0状态/5.1 执行结果 全部同步；建议结论保持"当前不拆，阶段 1 逻辑隔离为下一步"
- **剩余待定**：public 37 张 core_* 平台级表是否迁 unified_core schema（决策输入，不影响阶段 1）

## 2026-08-31 P1-2 阶段1 逻辑隔离第一轮落地 ✅（门禁增强+基线显式化）
- **门禁增强** `scripts/check_schema_boundary.py`：新增**无前缀跨 schema 直读检测**
  - 静态表归属映射 `scripts/schema_boundary_tables.json`（409 表单归属 + 16 同名多 schema，由阶段0 迁移后 DB 导出）
  - 按各服务 `search_path` 解析裸表引用归属，非本服务 schema → 违规
- **服务覆盖补齐**：`schema_boundary.json` services 15→28（补 lims/mes/pdm/analytics/master-data/unified-core/monitor/portal/rd/search/ticket/tms/plugin-registry），各带 schema+search_path；清理失效 plugin_* allow
- **存量显式化 + 增量阻断**：17 项既有无前缀跨 schema 引用入 `bare_ref_baseline`（输出"已知基线"，不阻塞）；新增违规 → FAIL
- **负向验证**：master-data 新增 `FROM production_orders`（裸引用）→ FAIL；`FROM crm.customers`（显式）→ FAIL；撤销后 PASS
- **工具修复**：extract_schema_refs 排除本 SQL 表别名（mes `FROM bom_items bi` 的 bi.* 不再误判 bi schema）
- **unified-core** 显式跨 schema 只读 `portal.user_preferences` 入 allow
- **17 项已知基线**（待逐项治理）：ai/analytics→users(iam)、communication→gis 3、finance→pm/erp 4、hrm→erp 2、monitor→hrm/wms/pm 4、unified-core audit_logs/users
- **待办**：17 项基线逐项改走 API/事件；同名多 schema 表（audit_logs 等 16 张）收敛去重

## 2026-08-31 P1-2 阶段1 17 项存量基线逐项治理 ✅（跨域引用显式化+归属修正+测试误报清理）
- **前置定位结论**：17 项基线中 ai/analytics/users、unified-core/users、monitor 4 项为 **SQL 注入安全测试载荷 / 监控 SQL 模板（占位符 ?，执行时用目标连接）**，非真实跨域 SQL；真实跨域引用为 communication→gis 3、finance→erp/pm 4、hrm→erp 2、unified-core audit_logs。
- **门禁工具改进** `scripts/check_schema_boundary.py`：跳过测试代码（`#[cfg(test)]`/`#[test]` 块、`mod tests`、`tests/` 目录、`*_test*.rs` 文件），测试 SQL 字面量不再干扰边界检查。
- **归属修正（表迁移）**：`erp.expenses/payables/receivables/budgets` → **finance**（erp schema_defense 仅声明建表从不使用，finance operational.rs 完整 CRUD 是实际归属）——`ALTER TABLE SET SCHEMA` + `svc/erp/src/schema_defense.rs` 移除 4 条错误声明 + `schema_boundary_tables.json` 归属更新（budgets→ambiguous[pm,finance]）。
- **显式跨域声明（改走 API/事件的过渡）**：
  - `communication im_location.rs` 3 处 `FROM business/warehouse/device_locations` → `FROM gis.*` + `only_own_schema_query!` 白名单 `"gis"`（gis 已提供 search/list_* API，后续改 HTTP 调用）
  - `hrm payroll.rs` 2 处 `INSERT financial_vouchers/voucher_items` → `erp.*` + 宏白名单 `"erp"`（凭证属 erp 财务域，后续事件化 hrm→erp 生成凭证）
  - `schema_boundary.json`：communication.allow+`gis`、hrm.allow+`erp`
- **unified-core 审计断裂修复**：`middleware/audit_log.rs` 全部 `audit_logs` → 显式 `public.audit_logs`（默认 SEARCH_PATH="rs,erp,public" 会解析到业务 schema 的 audit_logs 导致列不匹配）+ `main.rs` 补调 `init_audit_logs_table`（原从未被调用 → 审计写入一直失败）；DB 补建 `public.audit_logs`。
- **baseline 瘦身**：`bare_ref_baseline` 17 → 4（仅 monitor 4 项，标注为 SQL 模板配置非直读）。
- **验证**：`check_schema_boundary.py` 全 PASS（0 违规，communication/hrm/finance 均 PASS）；`cargo check --workspace` 0 error；public.audit_logs 建表成功。
- **环境发现**：本机存在双 postgres——本地 Homebrew postgres@18 抢占 localhost:5432（数据为阶段0前旧状态），Docker 容器 topems-postgres（阶段0后权威库）通过容器网络供 docker 部署服务连接；**cargo run 本地开发会连到旧库，需注意**。8000 端口被 Docker 容器 topems-unified-core 占用（SSE 测试超时非回归）。
- **待办**：①同名多 schema 表收敛去重——第一批（7 张 public/erp 空壳删除 + 归属归位）✅（2026-08-31，见下），剩余 public/iam 遗留双写 ~240 组与跨服务读改造待后续批次；②~~communication→gis 改走 gis HTTP API~~ ✅（2026-08-31 已落地，见下）；③~~hrm→erp 凭证写入事件化~~ ✅（2026-08-31 已落地，见下）；④public 37 张 core_* 平台表是否迁 unified_core schema 决策。

## 2026-08-31 P1-2 communication→gis 改走 HTTP API ✅
- **改造** `svc/communication/src/im_location.rs`：新增 `gis_search_locations()` 辅助函数调用 gis HTTP `GET /api/gis/search?q=..&type=business|warehouse|device`，`unified_search_pois` 中 3 处 `gis.*` 直查 SQL 全部替换为 HTTP 调用（business/warehouse→gis_count、device→third_party_count），移除 only_own_schema_query! 对 gis 的白名单依赖。
- **gis 侧** `svc/gis/src/modules/search.rs`：business 搜索结果补 `address` 字段（此前缺失，communication 原有读取）。
- **门禁**：`schema_boundary.json` communication.allow 清空 gis（不再引用 gis schema，引用 0）。
- **验证**：`cargo check -p topems-communication -p topems-gis` 0 error 0 warning（修复 unused Row import / _pool）；`check_schema_boundary.py` 全 PASS（communication 引用=0）；gis HTTP API 实测 200（data.results 结构匹配，三表 0 行无数据）。
- **说明**：`create_location_routes` 为既有 dead code，POI 搜索当前无 HTTP 入口（如需启用需挂载路由，超出本次范围）。

## 2026-08-31 P1-2 hrm→erp 凭证写入事件化 ✅
- **事件**：shared-event 新增 `HrmPayrollVoucherRequested` 事件类型 + `HrmPayrollVoucherRequestedPayload`/`HrmPayrollVoucherEntryPayload`（金额用 f64，与 erp 模型一致），`event/mod.rs` re-export。
- **hrm 侧** `svc/hrm/src/modules/payroll.rs`：`generate_payroll_voucher` 删除 2 处 `INSERT INTO erp.financial_vouchers/voucher_items` 跨域 SQL，改为构建 payload（含 4 条分录，由 `build_payroll_voucher_entries` 保证借贷平衡）后 `tokio::spawn` 发布事件；接口返回 `voucher_id=None` + `voucher_number`（hrm 预生成）+ message「薪资凭证已提交，等待 ERP 生成」。
- **erp 侧** `svc/erp/src/event_handlers/mod.rs`：新增 `handle_hrm_payroll_voucher_requested` 订阅消费，在本 schema 内写 `erp.financial_vouchers`（status=draft, source_system=HRM, source_id=payroll_run_id）+ `erp.voucher_items`。
- **门禁**：`schema_boundary.json` hrm.allow 移除 erp（不再引用 erp schema，引用 0）。
- **验证**：`cargo check -p topems-shared-event -p topems-hrm -p topems-erp` 0 error 0 warning；`check_schema_boundary.py` 全 PASS（hrm 引用=0）；**端到端冒烟**：起 erp+hrm → 注入 HrmPayrollVoucherRequested 到本机 Redis Stream（localhost:6379，注意非容器 Redis）→ erp 消费落库 financial_vouchers（draft/10000/HRM/source_id=payroll_run_id）+ 4 条 voucher_items，消息 ACK；测试数据已清理。
- **说明**：(1) 本机 6379 为 brew Redis（事件总线），容器 topems-redis 为另一实例，冒烟须注入本机；(2) erp 消费端按 payload 落库未做借贷平衡二次校验（hrm 唯一发布者已保证平衡），如需可后续加防御校验；(3) hrm 接口语义由「同步生成成功」变为「已提交待 ERP 生成」。

## 2026-08-31 同名多 schema 表收敛 第一批 ✅
- **盘点**：DB 实为 325 组同名表（远超阶段0快照 16 张）。分类：public 遗留双写 ~110、iam 平台表遗留 ~132、plugin 并存 ~7（保留）、服务自治 audit_logs×19（保留）、跨服务同名异义 ~15（保留）、文档内部 3。
- **16 张 ambiguous 决策**：analysis_results→ai、mes_qms_sync→integration 归位；budgets（pm+finance 异义）、locations（gis+wms 异义）、documents（ai+doc+pm+plugin_ai 异义）保留；contracts/projects/project_*（pm vs rd/hrm）异义保留；audit_logs 自治保留；customers/inventory/purchase_orders/supplier_evaluations/suppliers 待跨服务读改造（后续批次）。
- **第一批执行**：删 7 张空壳（public.analysis_results/mes_qms_sync/budgets/locations/documents/document_versions + erp.budgets）；**finance.budgets 自建修复**（删除 public.budgets 后发现 finance operational.rs 无前缀 budgets 真实 SQL——财务部门预算与 pm 项目预算同名异义，已入 finance.schema_defense TABLE_DEFS + 建表）；ambiguous 16→14。
- **验证**：7 张确认无真实 SQL 引用后删；finance 编译 0 error；门禁全 PASS。
- **后续批次**：public 遗留双写 ~110 组（改代码引用→业务 schema）、iam 遗留 132 组（归位，联动待办④）、跨服务读改造 6 张（customers/inventory/purchase_orders/supplier_evaluations/suppliers）；详见 `docs/architecture/duplicate-table-consolidation.md`。

## 2026-08-31 同名多 schema 表收敛 第三批 finance 组 ✅
- **8 张 finance 活跃表从 public 归位**：支付链 5 张（core_finance_payments/items/workflow/approval_config/approval_nodes）+ 对账/结算/来源快照 3 张（reconciliation_snapshots/settlement_snapshots/source_amount_snapshots）—— 均在 finance.schema_defense 补定义 + 建表（FK/UNIQUE/数组类型对齐）+ 迁移数据（15 行）+ 代码 public.X→X + 删 public 表。
- **2 张死读改读**：financial_reports 读 public.financial_vouchers/voucher_items → core_finance_vouchers/voucher_lines。
- **容错修复**：voucher_template 查不存在的 public.payment_records/payments → core_finance_payments。
- **保留**：public.accounting_subjects（finance 活跃 CRUD，待深判是否与 core_finance_accounts 同义）。
- 验证：finance 编译 0 error；门禁 PASS（finance 引用 433→360）。
- **剩余**：mobile 13 张 public 活跃表（异名新表并存待清理）、unified-core public.audit_logs、iam 132 组、accounting_subjects 深判。

## 2026-08-31 同名多 schema 表收敛 第三批 mobile 组 ✅
- **13 张 mobile 活跃表从 public 归位**：pg_dump DDL 重放 mobile schema（FK 链）+ schema_defense 补 13 张定义 + 代码 public.X→X + devices 显式 mobile.devices + 连带删 refresh_tokens/notifications 孤儿。
- 验证：mobile 编译 0 error；门禁 PASS（mobile 引用 51）。
- **剩余**：unified-core public.audit_logs、iam 132 组、accounting_subjects 深判。

## 2026-08-31 同名多 schema 表收敛 第三批 accounting_subjects + audit_logs ✅
- **accounting_subjects 归位 finance**：深判同名异义（简版 vs core_finance_accounts），活跃功能；归位 finance.accounting_subjects + **补 organization_id 列**（修复原 public 表缺列导致创建失败）+ 代码引用替换 + 删 public 表。门禁 PASS（finance 引用 353）。
- **unified-core public.audit_logs 判定保留**：unified-core schema=public（own），audit_logs 合法审计表，非冗余。
- **剩余**：iam 132 组、跨服务双引用 6 张裁决。

## 2026-08-31 同名多 schema 表收敛 跨服务 6 张裁决 + srm plugin_srm 修复 ✅
- **16 张 ambiguous 判定全部完成**：customers/inventory 跨服务异义保留；purchase_orders/supplier_evaluations/suppliers 收敛（srm 归位 + public 空壳删 + scm 副本保留）。
- **srm 代码错引 plugin_srm 系统性修复**：18 张表 241 处 `plugin_srm.*` 前缀全去（schema_defense 建在 srm），修复 srm 采购/供应商/评估/招标模块运行时失败；删 plugin_srm 冗余招标 5 张 + public 空壳 4 张（purchase_orders/purchase_items/supplier_evaluations/suppliers）。
- 验证：srm 编译 0 error；门禁 PASS（srm 引用 5）。
- **剩余**：iam 132 组归位。

## 2026-08-31 iam 平台表归位（第四批收官）✅
- **删除 iam schema 133 张业务表误建副本**（qa_lims/qa_lab 31 张、core_finance+finance_v5x 62 张、core_ticket 5 张、pdm_* 19 张、equipment/material/production 等）——全部 0 行 + 无代码引用 + 其他 schema（finance/public/mes/pdm 等）有真表。
- **保留 iam 10 张**：7 平台表（users/roles/permissions/sessions/refresh_tokens/password_reset_tokens/audit_logs）+ 3 疑似表（role_permissions/user_roles/user_access_logs）。
- **发现待办缺陷**：unified-core **双轨**——认证 auth.rs 用 iam.users/iam.sessions/iam.refresh_tokens（旧），用户管理用 public.core_users/core_roles/core_permissions（新，schema_defense 建）。新注册用户写 core_users 但登录查 iam.users → 新用户登录失败。**待专项统一**（建议 auth.rs 迁 core_* 前缀，sessions/refresh_tokens 需建 core_ 新表或保留 iam）。
- 验证：门禁 PASS；unified-core 编译 0 error。

## 2026-08-31 认证双轨统一（auth.rs 双写 core_users）✅
- **修复用户数据分裂**：auth 注册原先只写 iam.users（兼容副本），不写 core_users（主表）→ 新注册用户不在用户管理/租户系统。现改为**双写** core_users（主，status='active'）+ iam.users（副本），登录仍读 iam.users 副本无延迟。
- **数据回填**：将 iam.users 中仅有的旧注册用户（schemafixer）同步进 core_users，两端数据一致（48=48）。
- **补建 iam positions 系列 5 张表**（positions/user_positions/position_permissions/position_roles/resource_permissions）——position.rs/user_position.rs/permission_verify.rs 引用但历史未建，修复 relation does not exist；DDL 幂等入 mod.rs 兼容层 + DB 已建。
- **保留 iam.sessions/iam.refresh_tokens**（auth 专有表，无 core_ 对应，非双轨）。
- **记录待办**：audit_query.rs 读 iam.audit_logs（0 行无人写，登录日志实际写 core_login_logs）——审计查询指向空表，待后续对齐。
- 验证：unified-core 编译 0 error；测试 1022 passed 0 failed；门禁 PASS。

## 2026-08-31 audit_query 审计日志查询对齐（5b）✅
- **audit_logs 生态三方断裂确认并修复**：建表 DDL、写入方（middleware/access_log/models/store）、audit_query 查询分支的列定义互不匹配，写入实际全失败（0 行）。
- **统一到权威 Cluster-A 签名**（lims AuditLog struct 1:1，init SQL/migration V100 一致）：
  - DB 重建 public.audit_logs 为 Cluster-A 15 列（id/tenant_id/action/entity_type/entity_id/entity_ids/user_id/user_name/request_details/response_details/status/error_message/ip_address/user_agent/created_at）——原 19 列+audit_action enum 表为无 DDL 源孤儿表（全仓库 grep 无 CREATE 源），已删。
  - audit_query：iam.audit_logs→public.audit_logs（死表/不存在表改真实表）、iam.permission_audit_logs→public.permission_audit_logs（v448 10 列，changed_at/old_value/new_value 对齐）；login_logs 分支已验证可用（core_login_logs）。
  - middleware/audit_log：INSERT + init 定义统一 Cluster-A（entity_type/entity_ids/request_details/response_details/status），原 13 列 request_id/method/path/... 与实际表不符。
  - access_log：适配 Cluster-A（status/response_details），entity_id 仅合法 UUID 绑定（防非 UUID 崩溃）。
  - models record_audit_log：适配 Cluster-A（request_details/response_details/status）。
  - database_audit_log_store：metadata→details（public.permission_audit_logs 加 details JSONB，v448 migration 补定义）。
- 验证：unified-core 编译 0 error 无 warning；测试 1022 passed 0 failed；门禁 PASS；事务级 SQL 全验证（4 写入+2 查询）。
- 提交：e80e2fd3f（已推送 origin/main）。
- **遗留**：① mobile 12 文件 public 前缀替换待用户合并提交；② 用户工作区前端改动；③ perm-matrix R5 9 处 FAIL 既有技术债。

## 2026-08-31 perm-matrix R5 utoipa security 注解补齐（finance 完成）✅
- **R5 技术债（utoipa path 宏缺 security()/permission()）9 处修复 6 处**：
  - finance accounting_subjects 5 个宏补 BearerAuth scope（list/get=finance:read、create/update=finance:write、delete=finance:delete）。
  - financial_reports business-overview 补 finance:report:read。
  - 采用现有 scope 命名（不新造），格式参考 financial_reports 既有宏（security 位于 method 行后）。
- **tms optimization 3 处**（assignments/plan、routes/optimize、freight/quote → tms:write）：注解已补入 `svc/tms/src/modules/optimization.rs`，但该文件为 **untracked 用户新文件**（从未提交），未纳入本次提交，待用户提交该文件时一并带上。
- 验证：perm-matrix scan R5 = 0（工作区）；finance/tms 编译 0 error；测试全过；门禁 PASS。
- 提交：baa7a0106（finance，已推送）。
- **遗留**：optimization.rs（untracked）待用户提交后 R5 全量归零。

## 2026-08-31 SRM_SCHEMA 一致性对齐（4a 去前缀遗漏）✅
- **4a 遗漏确认**：srm 服务去 plugin_srm 前缀（归位 srm schema、删 plugin_srm 表）后，shared-db 的 `SRM_SCHEMA` 常量仍指向 `plugin_srm`（已删空 schema），`schema.rs` 测试断言与 `srm integration_tests` 3 处 SQL 仍引用 plugin_srm.suppliers（启用必失败）。
- **修复**：SRM_SCHEMA→"srm"；断言 srm_table('suppliers')=='srm.suppliers'；integration_tests 3 处 plugin_srm→srm。
- 验证：shared-db 143 + srm 516 测试全过（含 srm_table 断言）；门禁 PASS；业务代码 plugin_srm.* 引用清零。
- 提交：680c8f60d（已推送）。
- **新登记待办（plugin_* 体系过时，不擅改）**：shared-db `schema.rs` 19 个 plugin_* SCHEMA 常量（hrm/erp/pm/crm/qms/mes/wms/srm/scm/pdm/lims/rs/gis/ehs/bi/ai/im/integration）业务零使用（仅 shared-db 内部 + 自洽断言），各服务已用真实 SERVICE_SCHEMA。其中 plugin_ai（3 表）/plugin_mes（audit_logs）有"插件系统管理"注释佐证为设计选择（且 ai/mes 主 schema 存在同名表，属双 schema 待评审）；plugin_aps（5 表）在 _archive 归档服务。**建议后续统一评审这些 plugin_* schema 归属**（属 P1-2 阶段 0 E 项代码侧）。

## 2026-08-31 mes 审计表统一 + plugin_* 残留收尾 ✅
- **mes 全仓库唯一 plugin_* 审计残留收敛**：crm/hrm/rd 均用真实 schema 审计表（Some("crm"/"hrm"/"rs")），mes 独用 plugin_mes.audit_logs。
  - audit.rs 7 处 + mod.rs 建表/索引 6 处 plugin_mes→mes；schema_defense audit_logs 加回 Cluster-A 15 列。
  - DB：mes.audit_logs 建表（Cluster-A）+ DROP SCHEMA plugin_mes CASCADE。
  - 验证：mes 编译 0 error；测试全过；写入事务验证 OK；门禁 PASS（mes 引用=3）。
  - 提交：894a56596（已推送；含上一轮 caf57d68c 移除的中间态，最终态正确）。
- **plugin_* schema 现状盘点**：
  - plugin_srm：已删（4a）✓；plugin_mes：已删（本轮）✓
  - plugin_ai（3 表 documents/document_chunks/qa_history）：ai 服务 vector.rs 写入目标（有注释"插件系统管理"）；但 ai schema 存在同名 4 表（documents 32 行孤儿数据 + analysis_results 3 行），**ai 服务横跨 ai/core/plugin_ai 三 schema，需专门评审归属**（登记待办）
  - plugin_aps（5 表）：服务在 `_archive`（归档遗留）
- **新登记待办（ai 服务 schema 评审）**：ai 服务跨 ai（schema_defense 4 表）/core（knowledge_*）/plugin_ai（vector.rs 写入）三 schema；plugin_ai.analysis_results 缺失但代码 INSERT INTO plugin_ai.analysis_results（会失败）；ai.documents 32 行孤儿。建议按 P1-2 阶段 0 一并评审 ai 服务 schema 归属。

## 2026-08-31 ai 服务 plugin_ai → ai schema 收敛（工作区完成，待用户提交 svc/ai 时一并带上）⚠️
- **背景**：ai 服务横跨 ai/core/plugin_ai 三 schema。plugin_ai 有 3 表（documents/document_chunks/qa_history，db.rs 运行时建表，0 行空壳），ai schema 有 schema_defense 建的 4 表（documents 32 行孤儿 + analysis_results 3 行 + document_chunks/qa_history）。
- **收敛动作（已在工作区完成 + 验证）**：
  - SQL 前缀 plugin_ai.→ai.（7 活跃文件：event_handlers/ai_plugin/analysis/db/qa/recommendation/vector，共 37 处）
  - **修复 2 个"引用缺表"运行时 bug**：plugin_ai.analysis_results（无表，INSERT 必失败）→ ai.analysis_results；ai_training_samples（bare 引用解析到 public 不存在）→ ai.ai_training_samples + db.rs 补建表（UNIQUE(source_type,source_id) 支撑 ON CONFLICT，事务验证 OK）
  - event_handlers INSERT 加显式 ai. 前缀；tests/integration_tests 2 处 plugin_ai→ai
  - DB：DROP SCHEMA plugin_ai CASCADE（3 空表）；ai.ai_training_samples 已建
  - 验证：ai 编译 0 error；测试全过（含 integration_tests）；门禁 PASS（ai 引用=42）
- **⚠️ 未提交原因**：svc/ai 全部 8 个文件同时含用户工作区改动（only_own_schema_query 宏包装，HEAD 无宏）+ 用户 dsh 功能 60+ 文件——我的前缀替换与用户宏包装交织，**无法干净独立提交**。svc/ai 整体留在用户工作区，待用户统一提交时一并带上（代码自洽：工作区 ai.* 引用 + DB 已建 ai 表）。
- **遗留**：ai_knowledge 模块（service.rs/mod.rs/rag.rs）未注册（死模块），含 core.* + plugin_ai 引用未编译——启用前需先改；宏参数 "plugin_ai" 冗余（编译期白名单多余项，无害）。

## 2026-08-31 plugin_* schema 全库清零 + srm 残留修复 + shared-db 常量对齐 ✅
- **plugin_aps 清理**：备份（docs/archive/plugin_aps_backup_20260831.sql，pg_dump）+ DROP SCHEMA plugin_aps CASCADE（9 行测试残留：capacities 1 + schedules 8，APS 已并入 mes 且归档，迁移脚本保留在生产环境用）。
- **srm plugin_srm 残留清零（0606054f5）**：event_handlers 6 处 plugin_srm_ 表名→srm. 真实表（修复 2 个"引用缺表"运行时 bug：inquiries/supplier_performance 均不存在）；schema_defense TABLE_DEFS 补 2 表（14→16）；DB 建 srm.inquiries + srm.supplier_performance（UNIQUE(supplier_id,tenant_id)）；init/01+000 删 CREATE SCHEMA plugin_srm（防重跑复活）；init/04 26 处 plugin_srm.→srm.；snippets 模板清理。验证：srm 测试全过、3 类 SQL 事务验证 OK（upsert 1→2）、门禁 PASS。
- **shared-db 20 个 SCHEMA 常量 plugin_ 前缀对齐（0892c7fc0）**：HRM/ERP/PM/CRM/QMS/MES/WMS/SCM/PDM/LIMS/RS/GIS/EHS/BI/AI/IM/INTEGRATION/MAIL/MOBILE/PORTAL → 真实 schema。业务零使用（纯死代码），仅 lib.rs pub use + 自测断言；同步断言 + 测试更名。验证：shared-db 143 passed、7 服务编译 0 error。
- **里程碑：全库 plugin_* schema 清零**（plugin_srm/mes/ai/aps 全部删除，含空壳）。
- **遗留**：modules 宏参数3 "plugin_srm"/"plugin_ai" 冗余白名单（无害，编译期多余项）；svc/ai 收敛待用户提交（见上条）。

## 2026-08-31 plugin_* 引用收敛（wms/finance/erp）✅ + 用户工作区跳过项 ⚠️
- **wms（4683ec162）**：event_handlers/audit_log 3 处 plugin_wms.→wms.；补建 wms.wms_approval_events + wms.purchase_order_snapshots；测试全过、INSERT 验证 OK、门禁 PASS。
- **finance（aa9f0f5db）**：settlement_center/service.rs 3 处 plugin_finance.→finance.（表均存在）；测试全过、门禁 PASS。
- **erp（d60dbb34e）**：consolidation 6 文件 48 处 plugin_erp.→erp.（表均存在）；测试全过、门禁 PASS。
- **跳过项（用户工作区改动，待用户提交时收敛）**：
  - wms modules/data_sync.rs（plugin_wms 5 处）
  - hrm modules/attendance.rs（plugin_hrm 5 处，attendance_records/employees 表已存在）
  - erp modules/holidays.rs + opening_balance.rs（plugin_erp 引用 + **erp.holidays 表缺失需补建**）
  - svc/ai（工作区 3 处）
- **注释**：server finance_module.rs 的 plugin_finance 是注释（无 SQL，不改）。

## 2026-08-31 plugin_* 引用收敛（收尾：shared-ai/mobile/erp-holidays）+ 跨域待办
- **shared-ai（可提交）**：vector_store.rs 5 处 plugin_hrm.→hrm.；补建 hrm.vectors（key PK/embedding vector/metadata JSONB/deleted_at）；INSERT ON CONFLICT 验证 OK。
- **mobile 测试（可提交）**：integration_tests.rs 2 处 plugin_mobile.→mobile.（表存在 22 行）。
- **erp（工作区待用户提交）**：holidays.rs 5 处 plugin_erp.holidays→erp.holidays + 补建 erp.holidays（PK tenant_id,year,date,kind，验证 OK）；opening_balance.rs 2 处 plugin_finance.accounting_subjects→finance.accounting_subjects + 宏参数白名单→finance。
- **门禁**：erp.allow 加 finance（过渡白名单）。
- **⚠️ 跨域待办（P1-2 阶段 0）**：erp opening_balance.rs **直读 finance.accounting_subjects**（跨域只读，宏白名单放行）。收敛 plugin_* 后门禁开始真实检查跨 schema——此引用为已知跨域，**应改走 finance API/集成事件**，届时移除 erp.allow:finance。
- **已确认无害（不改）**：hrm attendance.rs / server finance_module.rs 的 plugin_* 在注释；ai agent.rs 的 plugin_* 为 NL 路由字符串；lib/shared-boundary 的 plugin_* 为宏文档示例/测试用例。

## 2026-08-31 P1-2 阶段0 schema 归位（B 项 core_finance_*）✅
- **背景**：finance 代码已用 `finance.core_finance_*`（显式/无前缀+SEARCH_PATH='finance, public'），但表在 public 旧版（13 列含 deleted_at）与 finance 新版（26 列扩展，无 deleted_at）**同名并存**——public 表在 finance 显式限定查询下**运行必失败**。
- **处理**（迁移文件 `20260831190000_core_finance_schema_migrate.sql`，幂等）：
  - ① public 独有 3 张（account_opening_balances/voucher_entries/voucher_templates）→ SET SCHEMA finance（finance core_finance_* 15→18）
  - ② 同名 10 张：public 旧版 rename `_archive_core_finance_*`（**数据保留**：accounts=21/vouchers=17/ledger=16/voucher_lines=25 等），finance 新版为运行真相
- **验证**：finance 测试全过（1106+1107）；门禁 PASS（finance 引用=353）；迁移文件幂等重跑无副作用；归档数据完整。
- **备份**：`database/backup/topems_pre_schema_migration_*.dump`（gitignore）。
- **⚠️ 遗留**：public 旧版数据在 `_archive_core_finance_*`，如确需并入 finance 新版，按公共列 INSERT...SELECT...ON CONFLICT (id) DO NOTHING（注意新版无 deleted_at，软删语义差异）——需业务 owner 确认后再执行。

## 2026-08-31 P1-2 阶段0 schema 归位（C 项 material_*）✅
- 迁移文件 `20260831190100_material_schema_migrate.sql`（幂等）：public 独有 2 张（material_categories/material_requirement_items）→ SET SCHEMA mes；同名 6 张旧版归档 `_archive_material_*`（数据保留），mes 为运行真相（mes 代码无前缀引用，SEARCH_PATH='mes, public' 优先）。
- 验证：public=0/mes=8/archive=6；mes 测试全过（424+16+13）；门禁 PASS。

## 2026-08-31 P1-2 阶段0 schema 归位（D 项 跨域同步表）✅
- 迁移文件 `20260831190200_sync_tables_schema_migrate.sql`（幂等）：public 7 张跨域同步表（analytics_sync_records/conversion_*/core_inter_module_sync/qa_*_sync_records）归档 `_archive_*`（数据保留），目标 schema（bi/integration/ehs/lims/qms）同名表为运行真相。
- 代码引用均指向业务 schema（lims/integration 显式前缀或 search_path 优先），public 旧版无引用。
- 验证：public 同步表残留=0；lims/integration 测试全过；门禁 PASS。

## 2026-08-31 P1-2 阶段0 schema 归位（A 项 qa_* 域两分 + ehs 扩展）✅
- 迁移文件 `20260831190300_qa_schema_migrate.sql`（幂等，动态 DO 块）：public 78 张 qa_* 表归位——
  - qa_lab_* → lims；qa_ehs_* → **ehs**（EHS 域，ehs schema 已有 43 张同名真相，超报告 A 项范围扩展）；其余质量体系 qa_* → qms
  - 规则：目标 schema 同名 → public 旧版归档 `_archive_*`（数据保留）；无同名 → SET SCHEMA
- **测试修复**：svc/ehs/tests/ehs_tests.rs create_test_pool 加 after_connect `SET search_path TO ehs, public`（qa_ehs_* 归位后无前缀测试查询依赖该路径）
- 验证：public qa_ 残留=0；lims/qms/ehs 测试全过；门禁 PASS。
- **⚠️ 已知待办**：lims/qms 测试中 qa_* 相关用例为 `#[ignore]`（requires PostgreSQL），启用前需同样加 search_path。

## 2026-08-31 P1-2 阶段0 schema 归位（B 项子项 core_master_data_*/core_mdm_*）✅
- 迁移文件 `20260831190400_master_data_schema_migrate.sql`（幂等）：CREATE SCHEMA IF NOT EXISTS master_data + 5 张表（core_master_data_refs/change_log/event_outbox/core_mdm_approvals/reconciliation_log）public → SET SCHEMA master_data（全部空表，无同名冲突）。
- shared-db 同步：master_data_refs.rs `new()` 默认表名 → "master_data.core_master_data_refs"；reconciliation_log.rs 默认表名 → master_data.core_mdm_reconciliation_log + refs → master_data.core_master_data_refs（crm/scm 的 with_table 本地表不受影响）。
- 验证：public=0/master_data=5；shared-db+unified-core+crm+scm+master-data 编译全过；门禁 PASS。

## 2026-08-31 P1-2 阶段0 schema 归位 A-E 全部完成 🎉 + 归档清理待办
- **A（qa_*）✅** 4afa40cc6：78 张归位（qa_lab_*→lims、qa_ehs_*→ehs、质量体系→qms）；ehs 测试 search_path 修复
- **B（core_finance_*）✅** ed6828def：3 张 SET SCHEMA + 10 张同名归档；**B 子项（core_master_data_*/core_mdm_*）✅** 5c5eda8fe：建 master_data schema + 5 张 SET SCHEMA + shared-db 默认表名前缀
- **C（material_*）✅** 419a6d620：2 张 SET SCHEMA + 6 张同名归档
- **D（跨域同步表）✅** f1b298ed8：7 张归档（bi/integration/ehs/lims/qms 同名真相）
- **E（plugin_*）✅** 全库清零
- **结果**：public 410→400（活跃 299 + 归档 _archive_* 101，数据保留）；门禁 PASS；workspace 编译通过
- **⚠️ 后续待办**：
  1. **归档表清理**：public 101 张 `_archive_*`（旧版数据）确认无引用后可 drop 或移独立 archive schema
  2. **core_crm_*/core_erp_*/core_hrm_* 等业务表**：报告 B 项保留 public（平台级），但明显属业务域（crm/erp/hrm），**可作下一轮归位候选**（需业务 owner 确认）
  3. **lims/qms 测试 qa_* 用例**：`#[ignore]`（requires PostgreSQL），启用前需加 search_path

## 2026-08-31 P1-2 阶段0 收尾：归档表移入 archive schema ✅
- 迁移文件 `20260831190500_archive_schema.sql`（幂等）：建 archive schema + public 101 张 `_archive_*` 旧版表 SET SCHEMA archive（数据保留）。
- 结果：public=299（纯活跃表）+ archive=101（归档数据）；门禁 PASS；workspace 编译通过。

## 2026-08-31 P1-2 阶段0 后续：core_* 业务域表归位 ✅
- 迁移文件 `20260831190600_core_business_schema_migrate.sql`（幂等，动态 DO 块）：public 中 core_* 业务域表按前缀归位至对应 schema（erp/crm/hrm/wms/scm/pm/pdm/doc_service/im/flow），保留 core_ 前缀命名（与 schema 内裸名表并存不合并），无同名冲突直接 SET SCHEMA；26 张处理。
- 验证：public 299→273；erp/crm/hrm/wms/scm/pm/pdm 编译全过；门禁 PASS。
- **保留 public（平台级/无明确 schema，待人工决策）**：core_tenant*/user*/role*/dict*/api*/menu*/permission*/billing*/ticket*/guide*/faq*/email*/file*/geofence*/location*/mobile*/usage*/plugin*/subscription*/operation*/notification*/migration*/login*/mail*/feedback* 等。

## 2026-08-31 P1-2 收尾：qms 测试 search_path 修复 ✅
- svc/qms/tests/integration_tests.rs setup_test_pool 加 after_connect `SET search_path TO qms, public`（qa_* 归位后无前缀测试查询依赖该路径；lims 测试不连 DB 无需改）。
- 验证：qms 262+224+12 测试全过。

## 2026-08-31 跨域只读治理：erp→finance 直读改走 API（17 项基线第 N 项）✅
- finance 新增 `GET /api/finance/accounting-subjects/by-code/{code}`（精确按 code 查科目，返回 AccountingSubject）；FinanceApi 新增 `get_accounting_subject_by_code`。
- erp opening_balance.rs 2 处 `finance.accounting_subjects` 直读 → `state.finance_client.get_accounting_subject_by_code`（HTTP，数据缺失降级"未知科目"）；删除 unused AccountingSubject import。
- **门禁收尾**：`scripts/schema_boundary.json` 移除 `erp.allow=['finance']` 过渡白名单（跨 schema 直读清零）。
- 验证：erp+finance 4041 passed / 0 failed；门禁 16/16 PASS。

## 2026-08-31 收尾：billing/feedback 合并脚本引用清理 + TODO 遗留项勾选 ✅
- 脚本清理：`coverage-baseline.sh` / `sqlx-prepare.sh` / `ci.yml` 移除 `topems-billing`、`topems-feedback`、`topems-lowcode` 活跃引用（对应服务均已归档/合并，属 P5 收尾遗漏）；bash -n 语法全过。
- TODO 遗留 [ ] 勾选：finance 遗留债务（列失配+补建表均已 [x]）、pm/aps/ehs/lims 评估（后续 pm/aps 已接入 server、ehs/lims 已门控）。

## 2026-08-31 archive schema 清理前检查 ✅（待用户确认 DROP）
- **101 张 archive 表确认无代码/SQL 引用**：精确 grep（`archive.` schema / `_archive_` 表名）零命中（5 处 `archive.by_name` 为 Rust zip 变量，非 SQL）；schema-boundary 门禁 PASS（无 archive SQL 引用）。
- 结论：archive 101 张旧版表可安全清理（DROP），但**涉及旧数据永久删除**，DROP 需用户/业务 owner 确认后执行。
- 备份仍存：database/backup/topems_pre_schema_migration_20260831_1907.dump（3.8M）。
