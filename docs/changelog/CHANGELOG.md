# TOPEMS 变更日志

> 记录项目所有重要的变更、新功能、修复和改进
>
> **版本说明**:
> - 产品版本号遵循 `主版本.次版本.修订号` (MAJOR.MINOR.PATCH) 语义化版本规范
> - 当前产品版本: **5.15.0** (与 `package.json` 和发布说明对齐)
> - Rust crate 版本 (Cargo.toml): `0.1.0` (库内部版本，与产品版本独立)
> - 历史清理/重构记录: 见 `CHANGELOG-cleanup-history.md`

### 版本号映射

项目存在三套版本号体系，对应关系如下：

| 产品版本 (package.json) | 架构版本 (overview.md) | 任务版本 (TODO.md) | 关键里程碑 |
|------------------------|----------------------|-------------------|-----------|
| 5.15.0 | V71 | V182 | 导航三联校验 100%、RD 命名统一、文档重构 |
| 5.14.3 | V67.2 | V178~V182 | 导航架构合规化、PM 编译清零 |
| 5.14.2 | V67.1 | — | 第四轮审计 67/67 闭环、Docker 压缩 |
| 5.14.1 | V67.0 | — | ListResponse 统一、Plugin 自动注册 100% |
| 5.14.0 | V66.7 | — | 第三轮审计 31/31 闭环、Shared Bootstrap V2 |
| — | V66.2 | — | Shared Bootstrap V2 五批次迁移 28/28 |

> 产品版本通过 `package.json` 的 `version` 字段管理，架构版本记录在 `docs/architecture/overview.md` 顶部，任务版本记录在 `docs/project/TODO.md` 顶部。

---

## [Unreleased]

### Added
- **Rust 测试覆盖率基线工具链（V203 P0-3.1 落地）**：
  - `scripts/ci/coverage-baseline.sh`（27 KB）— bash 主调度：Rust `cargo test -Z instrument-coverage` + llvm-profdata/llvm-cov、TypeScript `pnpm vitest --coverage`、15+ CLI flags（`--fast`/`--full`/`--rust`/`--ts`/`-p`/`--fail-under` 等）、工具链自检与降级、per-crate JSON 产出
  - `scripts/ci/coverage-report.py`（19 KB）— Python 汇总器：读取 per-crate JSON + vitest summary、**按行数加权汇总**（非简单均值）、red/yellow/green 三级 tier、`--fail-under` 阈值门禁、Markdown + JSON + 控制台 ASCII 三输出
- **P5 覆盖率冲刺：Region 43.19% → 45.84%（+2.65pp）**
  - 30 个 `test(cov)` 系列 commit、282 个文件变更、+62,150 行测试代码
  - 策略：`Serialize`/`Deserialize` derive 密集 + 0-test 文件批量 roundtrip + 纯函数边界测试
  - 覆盖 crate：shared-core / shared-event / shared-observability / ai / erp / wms / crm / hrm / pdm / qms / lims / ehs / communication / master-data / scm / pm / mobile / finance / portal / unified-core / migration-sdk / plugin-registry 等 20+ crate
  - 代表性：finance domain 5 个文件 +72 tests、portal models +306 roundtrip、ai_form handlers.rs 从 0% → 91.46%
- **AI Form 模块接入**：`feat(ai): 接入 ai_form 模块 + 补齐 form_assistant 核心类型`
- **Mock 可测试架构**：AiFormAssistant trait 化注入，移除 handlers.rs 对 concrete client 的硬耦合

### Changed
- **finance + portal 两大 crate Region 显著提升**：finance 14.53% → 17.58%（+3.05pp，16 文件 +60 tests）、portal 23.83% → 24.52%（+0.69pp，5 文件 +28 tests）
- **ai_form handlers.rs 可测试性重构**：从直接实例化 client 改为 trait-based 注入，单测 0% → 91.46%（`refactor(ai): 引入 mock 可测试架构`）

### Fixed
- `.sqlx/` 目录缓存文件误提交风险：根目录 `.gitignore` 新增 pattern（`chore(gitignore)`）
- MES 数据库 schema refactor 后 97 个编译错误清零（`fix(mes): resolve 97 compile errors`）

---

## [V67.2] - 2026-08-11

### Changed - 导航架构里程碑（V178~V182 八提交聚合）
- 导航三联校验综合覆盖率：95.4% → 100.0%（V179→V182），1050/1050 全绿
- 第一联·页面文件匹配：302/350 (86.3%) → 350/350 (100.0%)，总缺失 48 → 34 → 0
- workflow 模块三联校验 39/39 = 100% 闭环封版（页面/路由/权限各 13/13）
- verify_navigation 脚本 10 类命名变体规则系统化落地覆盖 17 模块 34 项
- 项目版本：5.14.0 → 5.15.0（导航架构合规化里程碑）

### Fixed
- **web(PM)**: usePmReport 返回类型补齐 6 个缺失属性（projectStatistics/contractStatistics/budgetStatistics/riskStatistics/taskStatistics/dashboard），tsc --noEmit 清零
- **pm(backend)**: statistics.rs 13 个编译错误清零 — 全量 struct Default trait 实现、`#[utoipa::path]` 宏注册（修复 `__path_get_statistics` 未定义）、f64 与 int 比较修正、`ApiResponse<ProjectStatistics>` 泛型类型修正、`path` 歧义消除移除隐式 import
- **navigation(asset)**: Asset Module navItems 6 条 permission 字段补齐，第三联权限定义覆盖率 338/350 → 350/350
- **navigation(lowcode)**: Lowcode Module navItems 3 条 permission 字段补齐
- **navigation(oa)**: OA Module navItems 3 条 permission 字段补齐
- **verify_navigation V1**: pagePathToFile 候选路径生成新增 `XxxPage/index.tsx` 目录式 + 复数→单数变体，修复 workflow-templates（单数）/workflow-settings（目录式）误报 2 项
- **verify_navigation V2**: 系统化增强 7 项规则：
  1. ABBREV_DICT 缩写词典（statistics→Stats 等）
  2. toSingular 单数变体规则（`-ies→y` / `-ses→s` / `-s` 去尾，覆盖 categories→category 等）
  3. 6 类候选路径生成：目录式 index / 单数变体候选族 9 种 / 路径缩略 -management / 缩写词典候选 / 复合末段取后半段 / 模块根 index 兜底
  4. findFuzzyPageMatch 单数变体降权模糊匹配（覆盖语义扩展类 prompts→PromptLibrary 等）
  5. 单数变体精确匹配 +20 分（覆盖 Management/List 类）
  → 修复全局 34 项脚本盲点，清零第一联全部缺失

### Docs
- TODO.md V178：健康修复专项（usePmReport + statistics.rs 双模块编译清零）
- TODO.md V179：导航三联权限闭环，第三联 12 条 permission 补齐，350/350 = 100%
- TODO.md V180：verify_navigation 脚本增强 + workflow 2 项清零，第一联 90.3%
- TODO.md V181：workflow 模块页面骨架闭环封版 39/39 = 100%
- TODO.md V182：全局 34 项清零 + 导航三联校验 100% 全绿里程碑（7 版本迭代终点）

---

## [V67.1] - 2026-08-08

### Changed - 架构治理
- P0×10 / P1×25 / P2×20 / P3×12 = 67 项第四轮审计修复（综合健康评分 99/100）
- 9 服务 Docker healthcheck 统一 `/health` + wget→curl
- 12 服务 docker-compose environment 通过 YAML 锚点压缩 DRY
- 11 服务 55+ tracing::info! → debug! 日志降级（QPS +5-15%）
- 前端 17 处 barrel 0 引用导出清理（tree-shaking ↓）

### Added
- shared-core: common_types.rs (ApprovalStatus 6变体 + ResourceType 14实体)
- shared-bootstrap: audit.rs 通用审计模块（create_routes<S>/log_audit_event）
- shared-core: `handle_result!` 宏统一 357 次重复错误处理
- 前端: utils/status.ts STATUS_COLOR_MAP（4 类别 + 6 页面替换）
- 前端: utils/date.ts formatDate 工具统一
- docs/architecture/ports.md（28 服务标准端口单一信源表）

### Fixed
- 6 服务 api_prefix 三方不一致（404 路由阻断 ×6）
- ERP 6 个列表 COUNT(*) 不带 WHERE 导致 total = 全表行数
- analytics check_permission 永远返回 true 的 stub
- docker-compose bi 服务 Dockerfile 路径 + report ghost 引用
- 6 user-guide 模块文档端口号与 main.rs 实际对齐

---

## [V67.0] - 2026-08-07

### Added
- shared-core `ListResponse<T>` 统一列表响应 + 5 端点试点迁移
- master-data service `auto_register_to_core` → 插件自动注册 **28/28 (100%)**

### Changed
- DocumentsPage 1438→783 (-45.5%) · ProfilePage 1298→566 (-56.4%) 超大页拆分
- 28 services `plugin.yaml` 统一 author/category/version 字段

---

## [V66.7] - 2026-08-07

### Changed
- 第三轮深度审计 **31/31 全闭环**（P0×6 / P1×10 / P2×9 / P3×3）
- 28 服务 shared-bootstrap V2 + println → tracing 迁移
- 14 处 allow(dead_code) 收敛为 crate/mod 级单条

---

## [5.14.3] - 2026-08-11

### 🎉 重大变更
- **PM 统计子域扩展 (V176)** - 新增 6 个细分统计接口 + 1 个仪表板聚合接口
- **多模块 API 绑定全面扩展** - 覆盖 Finance/CRM/HRM/EHS/PDM/Master-data/IM 等模块
- **前端 API 函数总数**: 6,465 个（+7）

### ✨ 新功能
- **PM 统计细分接口**:
  - `getProjectStatistics` — 项目统计（按状态/类型/负责人分组、平均进度、准时率、高风险数）
  - `getContractStatistics` — 合同统计（按状态/类型分组、总金额、平均金额）
  - `getBudgetStatistics` — 预算统计（总/分配/支出/剩余/使用率+按类别分组）
  - `getRiskStatistics` — 风险统计（按等级/类别分组、开闭风险数）
  - `getTaskStatistics` — 任务统计（按状态/优先级分组、完成率、逾期数）
  - `getDashboard` — 仪表板聚合（一次返回全部分统计）
- **Finance 风控模块**:
  - risk_v54: 实时风险监测 dashboard/alerts/acknowledge/resolve + 交易反欺诈 score/rules + 合规自动审查
  - risk_v59: 实时反欺诈 analyze/decision/signals/device + 信用评分 score/profile/models + 压力测试
- **CRM 扩展**: audit log、sales funnel、customer profile
- **HRM 扩展**: setup wizard、reports、audit
- **EHS 扩展**: emergency drill/plan、environmental compliance、health monitoring、safety training
- **PDM 扩展**: material、product 管理
- **Master-data 扩展**: 21 子域 (V54-V79) 覆盖 governance/security/lifecycle/federation 等
- **IM 扩展**: 26 Phase 即时通讯功能
- **Mobile/Notification/Billing/Feedback/Ticket/WMS/Monitor** 等模块深度扩展

### 🔧 改进
- **后端 statistics.rs 扩展**: 7 路由 + 6 细分 Handler，从数据库查询真实统计数据
- **前端类型定义扩展**: 新增 13 个 TypeScript 类型（ProjectStatistics/ContractStatistics/DashboardOverview 等）
- **仪表板聚合优化**: 一次 API 调用返回项目/合同/预算/风险/任务全维度统计

### 📊 测试覆盖
- PM statistics: 15/15 集成测试通过 ✅
- Finance risk: 39/39 集成测试通过 ✅
- PDM material/product: 14/14 集成测试通过 ✅
- tsc 0 error ✅

### 📝 破坏性变更
- 无（所有 API 向后兼容，新增接口为纯增量）

---

## [5.14.2] - 2026-08-06

### 🎉 重大变更
- **缓存架构统一升级** - 所有业务服务的 InMemoryCache 实现统一到 `moka` 后端，移除手写 DashMap 实现
- **新增 L2 分布式缓存模块** - `AsyncL2Cache<T>`（moka L1 + Redis L2），支持跨实例共享和自动降级

### 🔧 改进
- **moka 替代 DashMap**：shared-core `InMemoryCache` 改用 `moka::sync::Cache`，原生支持 LRU 淘汰和 TTL 自动过期，解决手写实现中 `evict_oldest` O(n) 扫描和容量参数被忽略的问题
- **8 个服务缓存统一**：crm/ehs/lims 三个服务的自有 DashMap 实现替换为 `topems_shared::LocalInMemoryCache` re-export；srm/wms/scm/erp/hrm 五个已统一服务的 Cargo.toml 残留 dashmap 依赖清理
- **workspace 依赖配置**：`Cargo.toml` moka features 添加 `"sync"`
- **新增 `AsyncL2Cache<T>`**：write-through 写入策略，cache-aside 读取策略，Redis 不可用时自动降级为纯 L1 模式
- **文档完善**：`code-standards.md` 新增缓存规范章节（选型决策、使用示例、键命名规范、失效策略、禁止事项）；8 个服务的 `env.example` 补充 REDIS_URL 配置说明
- **环境配置说明**：根目录 `.env.example` Redis 配置块补充用途和降级行为说明

### 📊 测试覆盖
- shared-core: 94/94 通过（cache 11 + l2_cache 9 + 其他 74）
- shared-event: cache 8/8 + redis 4/4 通过
- 11 个业务服务 cargo check 全部通过（hrm/crm/scm/ehs/lims/srm/wms/erp/rd/analytics/communication）
- unified-core-service 编译通过

### 📝 破坏性变更
- 无（API 完全向后兼容，`LocalInMemoryCache` 签名不变）

---

## [5.14.1] - 2026-07-24

### 🎉 重大变更
- **服务架构精简** - 服务总数从 23 个降至 20 个，降低运维复杂度
- **svc/user-service 合并** - 用户服务合并到 `svc/unified-core`（IAM 模块）
- **svc/doc 合并** - 文档服务合并到 `svc/unified-core`（Doc 模块）
- **svc/monitor 合并** - 监控服务合并到 `svc/unified-core`（Monitor 模块）
- **svc/rs 重命名** - 研发管理服务 `svc/rs` 重命名为 `svc/rd`，消除命名歧义
- **svc/migration-sdk 迁移** - 迁移工具从 `svc/migration-sdk` 移至 `tools/migration-sdk`

### 🔧 改进
- **CI/CD 清理** - 移除已删除服务（doc、monitor、user-service）的 Docker 构建引用，更新端口健康检查列表
- **unified-core 能力扩展** - 统一核心服务现承载 IAM + Doc + Flow + File + Monitor + AI 等核心能力
- **文档同步** - 更新架构文档、部署指南、API 文档、端口分配规则中的服务列表和端口分配

---

## [5.14.0] - 2026-07-21

### 🎉 重大变更
- **项目结构全面优化** - 统一部署配置、脚本管理、文档结构、数据库目录
- **部署配置整合** - `docker/`、`k8s/` 统一归入 `deploy/` 目录，旧版配置归档到 `deploy/_legacy/`
- **脚本管理规范** - 44 个一次性脚本归档到 `scripts/archive/`，根目录仅保留 5 个核心文件
- **文档中心重构** - 统一文档目录结构，散落文件归位，外来文档分类整理
- **数据库目录优化** - 初始化脚本、迁移脚本、测试数据分层管理

### 🔧 改进
- **根目录清理** - 删除 5 个一次性修复脚本，移动散落文件到合理位置
- **监控配置归位** - Prometheus/Alertmanager/Nginx 配置移入对应子目录
- **env 模板合并** - `deploy/env/` 合并到 `config/env/`，统一配置入口
- **CHANGELOG 统一** - 多套版本号体系整合，产品版本统一为 5.14.0

---

## [5.13.0] - 2026-07-20

### 🎉 重大变更
- **端口分配规则统一** - 全面梳理和统一所有服务端口配置，消除端口冲突和不一致
- **AI 服务端口调整** - AI 服务从 8064 调整到 8013（经营管理组），符合段位分配规则
- **SRM/WMS 端口修正** - 修正 Vite 代理中 SRM（8042）和 WMS（8041）端口互换的错误
- **Report 服务端口独立** - Report 服务从共享 BI 端口（8060）调整为独立端口（8061）

### 🔧 改进
- **统一端口权威源** - 建立 `config/ports.env` 作为端口定义主文件
- **端口分配规则文档化** - 在 `config/services.yaml` 和文档中明确段位分配规则
- **跨文件配置同步** - 同步更新所有相关配置文件（vite.config.ts、.env、services.rs、k8s、docker 等）

---

## [3.5.0] - 2026-07-13

### 🎉 重大变更
- **OpenTelemetry 宏代码优化** - 重构 `lib/src/telemetry/` 模块，添加性能优化和重复初始化保护
- **CI/CD 工作流修复** - 移除对不存在的 `bi` 服务的引用，修复 split-services.yml 和 ci-cd.yml

### ✨ 新功能
- **`init_service_telemetry!` 宏** - 简化 OpenTelemetry 初始化流程
- **`TelemetryExt` trait** - 为 Axum Router 添加 `.with_telemetry()` 方法
- **分布式追踪链路验证** - 支持 traceparent 传播和 ParentSpanId 设置

### 🔧 性能优化
- **`HeaderMapExtractor::keys()`** - 返回空 Vec 避免每请求分配内存
- **Trace ID 获取** - 直接从 span 获取，避免重复查询 Context
- **Span Name 延迟格式化** - 使用 `tracing::field::display()` 延迟格式化
- **重复初始化保护** - 设置新 provider 前先 shutdown 旧 provider

### 📚 文档
- 新增 OpenTelemetry 分布式追踪指南 - 完整记录配置说明、宏代码使用、关键优化点和排查步骤（已归档）
- 更新 [TODO.md](../roadmap/TODO.md) - 标记分布式追踪任务为已完成
- 更新 运维手册 README - 添加分布式追踪指南入口（已归档）

---

## [3.4.0] - 2026-07-10

### 🎉 重大变更
- **API 定义共享** - Web 端 200+ 类型定义迁移至 `shared-types` 包，Web 端改为重新导出，消除类型重复
- **响应式共享组件库** - 新增 7 个响应式组件和 5 个自定义 hooks，支持断点适配和媒体查询
- **移动端功能增强** - 新增用户管理、任务管理、日程管理、设备管理、仪表盘 5 个 API 模块

### ✨ 新功能
- **响应式组件** - ResponsiveGrid、ResponsiveGridItem、ResponsiveStack、ResponsiveContainer、ResponsiveText、ResponsiveImage
- **响应式 Hooks** - useResponsiveColumns、useResponsivePadding、useMediaQueryValue、useBreakpoint、useResponsiveSpacing
- **移动端用户 API** - 用户信息获取、资料更新、密码修改、权限查询、部门成员管理
- **移动端任务 API** - 任务列表、创建/更新/删除、状态变更、批量操作、搜索
- **移动端日程 API** - 事件管理、今日/周/月视图、参会人管理、状态更新
- **移动端设备 API** - 设备注册、推送测试、设备统计、激活/禁用
- **移动端仪表盘 API** - 统计数据、KPI、图表、告警、公告

### 🔧 性能优化
- **请求缓存机制** - GET 请求自动缓存，支持 TTL 设置和手动清除
- **请求取消** - 相同请求重复发送时自动取消之前的请求
- **请求重试** - 429/500/502/503/504 错误自动重试（最多 3 次），指数退避延迟

### 📚 文档
- 更新 [TODO.md](../roadmap/TODO.md) - Phase 4 多端支持统一已完成
- 更新 [API_MOBILE.md](../api/API_MOBILE.md) - 添加新的 API 模块文档

---

## [3.3.0] - 2026-07-06

### 🎉 重大变更
- **WebSocket 路由统一规范** - Core WebSocket 路由统一为 `/ws/core/{feature}` 格式，消除路径不一致问题
- **GIS WebSocket 路由注册** - 在 GIS 服务 main.rs 中注册了 `/gis/ws` 和 `/gis/ws/device/{device_code}` 路由，修复 404 错误

### ✨ 新功能
- **统一 Core WebSocket 路径** - 新增 `/ws/core/notifications` 和 `/ws/core/im` 路由，保留旧路径 `/ws/notifications` 和 `/ws/im` 向后兼容
- **GIS 简化路径路由** - 新增 `/gis/ws` 和 `/gis/ws/device/{device_code}` 简化路径，与 MES 服务保持一致

### 🔧 改进
- **前端 WebSocket 路径更新** - 更新 `useNotificationWebSocket.ts` 和 `useWebSocket.ts` 使用新的统一路径
- **Vite 代理配置精简** - 移除分散的 `/ws/notifications` 和 `/ws/im` 规则，保留统一的 `/ws/core` 规则

### 📚 文档
- 更新 Vite 代理配置规范 - 添加完整的 WebSocket 代理配置规范章节（已归档）
- 更新 Vite 代理验证报告 - 反映 WebSocket 路由统一规范（已归档）
- 更新 [通知系统 API](../api/API_NOTIFICATION.md) - 修正 WebSocket 连接地址为统一规范
- 新增 [WebSocket 路径映射规范](../architecture/websocket-path-mapping.md) - 详细说明新的路径映射规则、前端实现、后端路由和代理配置
- 更新 [README.md](../README.md) - 添加 WebSocket 路径映射章节和文档链接
- 更新 开发者指南 - 添加 WebSocket 开发指南章节（已归档）

### 📜 脚本
- **topems.sh 新增 WebSocket 检查命令** - 添加 `ws check` 命令，支持检查所有 WebSocket 连接状态，显示路径规范和文档链接

### 🔧 修复
- **修复 MES WebSocket 连接 401 错误** - 在 `auth_middleware` 中添加路径匹配逻辑，直接放行 `/ws/`、`/mes/ws/` 和 `/gis/ws/` 路径的请求，解决 Firefox 无法建立 WebSocket 连接的问题

---

## [3.2.0] - 2026-07-01

### 🎉 重大变更
- **插件自动注册机制** - 服务启动时自动向 unified-core 注册，无需手动配置
- **服务自动恢复** - `topems.sh` 脚本增加 `check` 命令，自动检查并重启异常服务
- **公共注册接口** - 插件注册路由移到公共路由，无需认证即可注册

### ✨ 新功能
- **API 请求重试机制** - 为 monitor.ts 增加指数退避重试策略，支持可配置重试次数和延迟
- **结构化 API 日志** - 在 api/client.ts 中增强请求/响应拦截器，添加详细日志记录
- **防御性数据处理** - 前端 API 响应处理增加可选链和默认值，防止字段缺失导致运行时错误

### 🐛 修复
- **修复文档中心 TypeError** - 修复 `filesResponse.data.files is undefined` 错误，添加防御性检查
- **修复 LIMS 审计日志 404** - 修复双重 URL 前缀问题（`/api/lims/audit-logs` → `/audit-logs`）
- **修复 MonitorPage error_rate TypeError** - 修复 `service.error_rate` 未定义错误，添加类型检查
- **修复 ERP dict-types 404** - 修复 SQL 查询表名错误（`dict_types` → `erp.dict_types`）
- **修复插件注册 401** - 将注册接口移到公共路由，解决服务启动时自动注册被拒绝问题
- **修复多个服务健康检查 502/404** - 修复 `/plugin-health/monitor`、`/plugin-health/lims`、`/plugin-health/workflow` 等接口错误

### 🔧 改进
- **Vite 代理配置完善** - 添加 LIMS、ERP、monitor、doc 等服务的代理规则
- **单元测试增强** - 为 LIMS 审计日志 API 添加 8 个单元测试，覆盖错误处理逻辑
- **注册结果解析优化** - 修复 topems.sh 中插件注册结果的 JSON 解析逻辑

### 📚 文档
- 更新 脚本工具说明 - 添加插件自动注册功能说明（已归档）
- 更新 [快速入门指南](../getting-started/quickstart.md) - 反映新的启动和注册流程
- 更新 [本地部署指南](../getting-started/local-deployment.md) - 添加服务注册机制说明
- 更新 [故障排查手册](../deployment/troubleshooting.md) - 添加常见问题解决方案

---

## [3.1.0] - 2026-06-25

### 🎉 重大变更
- **模块用户指南完善** - 新增 BI（数据分析）和 SCM（供应链）模块用户指南，完善 MES 和 QMS 模块文档
- **权限系统设计完善** - 补充系统设置页面权限检查逻辑和表格内容
- **组件迁移指南确认** - 检查并更新 WIP 项状态

### ✨ 新功能
- **BI 高级分析** - 自助报表设计器、数据钻取与联动、多维度分析、预测分析
- **MES 生产制造增强** - 生产排产优化、物料BOM关联、质量追溯、设备OEE计算、在制品管理
- **QMS 质量管控深化** - SPC统计过程控制、质量成本分析、8D问题解决流程、FMEA失效模式分析
- **SCM 供应链集成** - 采购需求计划、采购到货检验、智能补货建议、供应链可视化看板

### 📚 文档
- 完善 权限系统设计 - 系统设置页面权限检查（已归档）
- 完善 [组件迁移指南](../development/frontend/component-migration-guide.md) - 更新 WIP 项状态
- 新增 [BI模块用户指南](../user-guide/modules/bi.md)
- 新增 [SCM模块用户指南](../user-guide/modules/scm.md)
- 完善 [MES模块用户指南](../user-guide/modules/mes.md)
- 完善 [QMS模块用户指南](../user-guide/modules/qms.md)
- 更新 [用户指南索引](../user-guide/README.md)

### 🔧 改进
- 文档体系完整性提升（用户指南覆盖12个业务模块）

---

## [3.0.0] - 2026-06-23

### 🎉 重大变更
- **统一核心服务架构** - 引入 unified-core 服务（端口 8000），统一承载 IAM、Doc、Flow、File、Mail、IM、Notification 7 个内部模块
- **AI 服务独立化** - AI 服务从 unified-core 拆分，分配独立端口 8064
- **统一服务管理脚本** - 推出 `topems.sh` 统一脚本，替代多个分散脚本

### ✨ 新功能
- **供应链集成** - 实现 SCM-WMS-SRM 三方数据同步
- **BI 自定义仪表盘** - 支持用户自定义 BI 仪表盘
- **AI 智能问答** - 基于 Ollama 本地大模型的智能问答系统
- **CRM 商机管理** - 完整的销售漏斗和商机跟踪
- **LIMS 样品管理** - 完整的实验室样品、仪器、试剂管理
- **QMS-LIMS-EHS 数据联动** - 质量管理全流程数据联动
- **移动端支持** - Mobile 服务（端口 8070）
- **PDM 产品数据管理** - 产品、BOM、版本管理
- **RD 研发管理（原 RS）** - 研发项目、配方、专利管理
- **GIS 地理信息** - 地图、位置服务
- **Monitor 系统监控** - 实时系统监控和告警

### 🔧 改进
- **统一端口分配规则** - 8000-8079 段位划分，按业务域分组
- **数据库 Schema 隔离** - 每个服务独立的数据库 Schema
- **事件驱动架构** - 引入事件总线（EventBus）实现服务间数据同步
- **JWT 认证优化** - 统一的 Token 认证和刷新机制
- **Nginx 反向代理** - 完整的反向代理配置

### 🐛 修复
- **修复 8021 端口冲突** - PM 服务从 8022 调整到 8023
- **修复 WMS 端口冲突** - WMS 端口统一为 8041
- **修复 AI 服务端口** - AI 服务从 8050 调整到独立端口 8064
- **修复 Nginx 容器名错误** - `topems-core` → `topems-unified-core`
- **修复多处端口不一致问题** - 统一所有配置文件端口

### 📚 文档
- 完善 [架构设计](../architecture/overview.md)
- 完善 [API 文档](../api/README.md)
- 完善 [部署指南](../deployment/deployment-guide-overview.md)
- 完善 [环境配置](../getting-started/environment-config.md)
- 新增 [端口分配规则](../architecture/ports.md)
- 新增各模块文档（14个）

### 🔨 重构
- 整合多个分散脚本到 `topems.sh`
- 统一服务配置到 `config/services.yaml`
- 统一环境变量到 `.env`
- 清理冗余文档 40+ 个

---

## [2.0.0] - 2026-05-15

### ✨ 新功能
- 完成核心业务模块开发（HRM、PM、CRM、MES、PDM、QMS）
- 引入 AI 服务（基于 Ollama）
- 引入 BI 商业智能服务
- 引入 Report 报表服务

### 🔧 改进
- 优化数据库设计
- 优化前端组件库

### 🐛 修复
- 修复多个已知问题

---

## [1.0.0] - 2026-03-01

### 🎉 首发版本
- 完成项目初始化
- 实现 IAM 认证服务
- 实现 Doc 文档管理
- 实现 Flow 工作流引擎
- 实现 File 文件管理
- 实现 Mail 邮件服务
- 实现 IM 即时通讯
- 实现 Notification 通知服务

---

## 变更类型说明

- 🎉 重大变更 (Major) - 不兼容的 API 变更
- ✨ 新功能 (Minor) - 向下兼容的新功能
- 🔧 改进 (Patch) - 向下兼容的问题修复
- 🐛 修复 (Bug Fix) - Bug 修复
- 📚 文档 (Documentation) - 文档变更
- 🔨 重构 (Refactor) - 代码重构

---

## 后续规划

详见 [TODO.md](../roadmap/TODO.md)
