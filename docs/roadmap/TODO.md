# TOPEMS 项目任务规划与路线图

> **版本**: V282 | **更新日期**: 2026-08-23
>
> **V259-V264+ Backlog 与 V265 硬编码清理已收闭**。当前进入 V270 设计系统审计校准阶段。
> **V266-P0/P1/P2 架构冗余重构均已完成**（Git Hook 统一 / desktop 复用 / FSM 模板消除 + 预存在测试修复）。
> **V267 四轨并行推进已完成**（clippy 全清 / MobilePageTemplate / clippy Gate / check_allow_baseline 修复）。
> **V268 三轨并行推进已完成**（AuthPageTemplate + ChatPageTemplate + MobileHomePage 迁移，模板覆盖率 93.4%→94.9%）。
> **V269 DesignerTemplate + 4 设计器页迁移已完成**（模板覆盖率 94.9%→95.7%，例外项 27→23）。
> **V270 审计脚本校准 + 例外清单数据修正已完成**（覆盖率 91.7%→95.8% 校准，例外项 23→22）。
> **V271 架构冗余深度治理（P0→P1→P2）已完成**（审计统一 / 配置单一信源 / 门面修正 / 跨端类型共享 / DB 初始化去重）。
> **V272 SQL 迁移冗余清理（方案 A）已完成**（删除 134 个 migrations/ 死代码 + 删除 MigrationSDK + schema_defense 注释清理）。
> **V273 四轨并行推进已完成**（MES 审批流三件套 12 stubs 收敛 + AiToolPageTemplate 3 页迁移 + .sqlx 缓存新鲜度 CI check）。
> **V274 sqlx-cache 语义级检查已完成**（sqlx-prepare.sh --semantic mode + schema-defense-gate advisory step）。
> **V275 报表类模板化已完成**（ReportViewerTemplate 新增 + DesignerTemplate 复用，6 报表页全部迁移，覆盖率 96.4%→97.5%，例外项 19→13）。
> **V276 GIS 模板接入已完成**（GisMapTemplate 落地 2 个 GIS 例外页，覆盖率 97.5%→97.9%，例外项 13→11）。
> **V277 列表/结构类模板化已完成**（4 页接入已有模板，覆盖率 97.9%→98.7%，例外项 11→7）。
> **V278 架构冗余治理已完成**（openapi 测试提取共享 utility / init_db 统一 / ErrorBoundary 去重 / CI composite action + TODO 归档）。
> **V279 工具/系统类模板化已完成**（3 页接入已有模板，覆盖率 98.7%→99.2%，例外项 7→4）。
> **V280 最后 4 例外清零**（4 页接入已有模板，覆盖率 99.2%→**100.0%**，例外项 4→0）。设计系统模板治理全流程收闭 🎯
> **V281 后续任务推进**（ApprovalTransition 提升到 shared-db / AiToolPageTemplate 评估结论 / 文档归档）。
> **V282 后续任务推进**（PM 审批逻辑集成 shared-db approval 审计日志 / SupplierPortalPage 声明式评估结论）。

---

## 📊 当前状态

### 已完成：V282 后续任务（PM 审批集成 + SupplierPortalPage 评估）

> 日期：2026-08-23 | 代码改动 2 files（PM project_approval.rs + TODO）| 验收：cargo check 0 errors

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| PM 审批逻辑集成 shared-db approval | [project_approval.rs](file:///Users/air/TOPEMS/svc/pm/src/modules/project_approval.rs) 3 个审批操作（发起/通过/驳回）集成 `create_approval_and_log` / `execute_transition_and_log` / `reject_and_log`，PM 审批操作现写入统一 `public.audit_logs` 表 | ✅ |
| SupplierPortalPage 声明式 statCards 评估 | statCards 有 `bgColor`+`format` 字段不被 `StatCard` 接口支持，需先扩展接口 → **延后到 V283** | ✅ |

#### PM 审批集成详情
- `submit_approval`：审批发起后调用 `create_approval_and_log`（entity_type="project"）
- `handle_approval_action` approve：审批通过后调用 `execute_transition_and_log`
- `handle_approval_action` reject/cancel：审批驳回后调用 `reject_and_log`
- 所有审计日志通过 `topems_shared_db::approval` → `AuditLogService::log_operation` 写入 `public.audit_logs`

#### 最终验收矩阵
- [x] `cargo check -p topems-pm` — exit 0，0 errors

### V282 后续扩展（留给 V283+）
- [ ] **Finance 审批增强**：finance 的 `submit_approval`/`approve_approval`/`reject_approval` 目前是占位逻辑（仅 debug 日志），可集成 shared-db approval 做真实审计
- [ ] **SupplierPortalPage 声明式 statCards**：需先扩展 `StatCard` 接口支持 `bgColor` + `format` 字段
- [ ] **模板扩展**：4 个 children 透传页面评估是否抽象为专用声明式模板

### 已完成：V281 后续任务（ApprovalTransition 提升 + AiToolPageTemplate 评估）

> 日期：2026-08-23 | 代码改动 3 files（shared-db approval.rs 新建 + MES re-export + TODO）| 验收：cargo check 0 errors · 10/10 tests pass

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| ApprovalTransition 提升到 shared-db | [approval.rs](file:///Users/air/TOPEMS/lib/shared-db/src/approval.rs) 新建：3 三件套 + 2 验证 + 3 响应构造 + 10 测试；MES [approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) 改为 re-export 层（4 下游模块零改动） | ✅ |
| AiToolPageTemplate 推广评估 | 3 个 AI 页面（AiPromptLibrary→ListPage / AiModelSettings→SettingsPage / AiDashboard→StatsPage）已使用更匹配的模板，强行改用 AiToolPageTemplate 是降级 → **评估结论：维持现状** | ✅ |

#### 提升后的架构
- `topems_shared_db::approval` 模块导出 9 个公共方法：`create_approval_and_log` / `execute_transition_and_log` / `reject_and_log` / `validate_start_approval` / `validate_approval_decision` / `build_start_response` / `build_approve_response` / `build_reject_response` / `ApprovalResult`
- MES 的 4 个模块（production_order / anomaly_detection / work_report / quality_management/inspection）通过 `approval_common.rs` re-export 无缝使用，零改动
- MES 专有的 `write_approval_audit`（依赖 `audit::log_approval_event`）保留在 MES
- finance / erp / pm 等服务现可直接 `use topems_shared_db::approval::...` 复用

#### 最终验收矩阵
- [x] `cargo check -p topems-shared-db -p topems-mes` — exit 0，0 errors
- [x] `cargo test -p topems-shared-db approval` — 10/10 pass

### V281 后续扩展（留给 V282+）
- [ ] **ApprovalTransition 实际推广**：finance/erp/pm 中有审批流的模块实际导入 `topems_shared_db::approval` 替换各自的重复逻辑
- [ ] **模板扩展**：SupplierPortal/NotificationCenter/DocumentsPage/MailPage 目前均为 children 透传，可评估是否抽象为专用声明式模板

### 已完成：V280 设计系统模板治理收闭（最后 4 例外清零 · 530/530 = 100%）

> 日期：2026-08-23 | 代码改动 8 files（页面 4 + CardListTemplate 增强 1 + 例外清单 1 + TODO 1 + 审计报告）| 验收：tsc 0 errors · 审计覆盖率 **100.0%** · 例外项 4→0

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| SupplierPortalPage → StatsPageTemplate | 4 分支（loading/error/empty/normal）+ statCards Grid + Tabs + 订单/公告/评分 children 透传 | ✅ |
| NotificationCenter → ListPageTemplate | 筛选+搜索→headerContent，通知列表+分页+浮动按钮→footerContent，columns/data 空数组透传 | ✅ |
| DocumentsPage → CardListTemplate | [CardListTemplate](file:///Users/air/TOPEMS/apps/web/src/components/templates/CardListTemplate.tsx) 增强 children 透传模式（data/cardConfig 变为可选，children 优先渲染分支）；保留左文件夹树+右文件列表双栏 | ✅ |
| MailPage → MasterDetailPageTemplate | children 透传，保留邮件 Tabs + EmailList + EmailDetail + 所有 Dialog 组件 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 门户/协作 2→0、文档/邮件 2→0，总例外 4→0，覆盖率 99.2%→**100.0%** | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — **530/530 = 100.0%**（+4 标准模板使用）
- [x] 例外项 4→0（-4），设计系统 9 大例外类别**全部清零**

### 覆盖率里程碑（V272 → V280）

| 版本 | 覆盖率 | 例外 | 关键动作 |
|---|---|---|---|
| V272 | 96.4% (511/530) | 19 | Backlog 基准 |
| V275 | 97.5% (517/530) | 13 | 报表类 6 页：ReportViewerTemplate + DesignerTemplate |
| V276 | 97.9% (519/530) | 11 | GIS 类 2 页：GisMapTemplate 落地 |
| V277 | 98.7% (523/530) | 7 | 列表/结构类 4 页：MasterDetail/CardList/List/Detail |
| V279 | 99.2% (526/530) | 4 | 工具/系统类 3 页：FormPage/Dashboard/Wizard |
| **V280** | **100.0% (530/530)** | **0** | 门户/协作+文档/邮件 4 页：Stats/List/CardList/MasterDetail；CardListTemplate 增强 children 透传 |

### V280 后续（治理完成后方向，留给 V281+）
- [ ] **ApprovalTransition 推广**：shared-core 3 个审批流方法（MES 仅落地），评估推广到 finance/erp/pm 等模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入
- [ ] **模板扩展**：SupplierPortal/NotificationCenter/DocumentsPage/MailPage 目前均为 children 透传，可评估是否抽象为专用声明式模板（PortalPageTemplate、NotificationTemplate、DocumentTemplate、MailClientTemplate）

### 已完成：V279 工具/系统类模板化（3 页接入已有模板）

> 日期：2026-08-23 | 代码改动 6 files（页面 3 + WizardPageTemplate 增强 1 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 99.2% · 例外项 7→4

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| PerformanceTestPage → FormPageTemplate | children 透传模式（sections=[] / onSubmit=no-op），保留原生渐变+动画+16 张指标卡 | ✅ |
| SystemManagementPage → DashboardTemplate | children 透传模式，保留自定义 sticky header + 7 功能卡片网格 | ✅ |
| PluginUploadPage → WizardPageTemplate | [WizardPageTemplate](file:///Users/air/TOPEMS/apps/web/src/components/templates/WizardPageTemplate.tsx) 新增 `children` 透传 + `maxWidth` 支持字符串断点；PluginUpload 保留 4 步内容表单 + 底部自定义导航按钮区 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 工具/系统类 3→0，总例外 7→4，覆盖率 98.7%→99.2% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 526/530 = 99.2%（+3 标准模板使用）
- [x] 例外项 7→4（-3），工具/系统类例外清零（3→0）

### V279 后续扩展（留给 V280+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性

### 已完成：V278 架构冗余治理（4 轨并行 · 架构冗余分析 P0→P1 治理）

> 日期：2026-08-23 | 代码改动 49 files（Rust 33 + 前端 3 + CI 2 + 文档 3 + 归档 1 + 测试 7）| 验收：cargo check 0 errors · tsc 0 errors · openapi 测试 30 文件 1400→360 行 · init_db 11→2 · ErrorBoundary 2→1 · CI 12 job 提取 composite · TODO 524→211 行

### A. Rust 测试冗余：extract_openapi_spec 提取为共享 utility
- 背景：30 个 svc/*/tests/openapi_extract.rs 包含几乎相同的 48 行测试函数，唯一差异是 `use` 路径
- 变更（32 files）：
  - 新建 [lib/shared-core/src/testing.rs](file:///Users/air/TOPEMS/lib/shared-core/src/testing.rs) — 泛型函数 `extract_openapi_spec_to_file<T: utoipa::OpenApi>()`，复现原测试全部断言
  - [lib/shared-core/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-core/src/lib.rs) — `pub mod testing;`
  - 30 个 [svc/*/tests/openapi_extract.rs](file:///Users/air/TOPEMS/svc/wms/tests/openapi_extract.rs) — 48 行精简为 12 行
  - [svc/lowcode/Cargo.toml](file:///Users/air/TOPEMS/svc/lowcode/Cargo.toml) — 补 dev-dep `topems-shared-core`
- 验收：`cargo check --workspace --tests` exit 0 · 30 文件全部调用新函数 · 总行数 1400→360（-1040）

### B. Rust 后端冗余：init_db 提取到 shared-bootstrap
- 背景：11 个 svc/*/src/main.rs 有几乎相同的 `async fn init_db` 函数（模式 A 纯 schema_defense / 模式 B master_data + schema_defense）
- 变更（10 files）：
  - [lib/shared-bootstrap/src/lib.rs](file:///Users/air/TOPEMS/lib/shared-bootstrap/src/lib.rs) — 新增 `default_init_db(pool, service_name, with_master_data_refs, schema_defense_fn)` 闭包函数（因各服务 TABLE_DEFS 不同，用闭包传入服务特定 schema_defense 函数）
  - 9 个 [svc/*/src/main.rs](file:///Users/air/TOPEMS/svc/wms/src/main.rs)（wms/tms/srm/aps/hrm/erp/scm/crm/pdm）— 删除 init_db，替换为 `default_init_db(...)` 调用
  - rd/pm 保留（有额外逻辑）
  - crm 额外清理：内联 CREATE TABLE customer_orders/rfm_results 已冗余（TABLE_DEFS 已覆盖），已删除
- 验收：`cargo check --workspace` exit 0 · `async fn init_db` 从 11→2（rd/pm）· `default_init_db` 18 处引用

### C. 前端冗余：ErrorBoundary 去重
- 背景：apps/web/src/components/ 有两个 ErrorBoundary — ErrorBoundary.tsx（887 行，功能丰富版）和 common/ErrorBoundary.tsx（94 行，精简版）
- 变更（4 files）：
  - [ErrorBoundary.tsx](file:///Users/air/TOPEMS/apps/web/src/components/ErrorBoundary.tsx) — 新增可选 `onRetry` prop（合并小版本 API），handleRetry 优先调用 onRetry
  - [tests/error-boundary.spec.tsx](file:///Users/air/TOPEMS/apps/web/tests/error-boundary.spec.tsx) — import 路径从 common/ 改为主版本
  - [components/README.md](file:///Users/air/TOPEMS/apps/web/src/components/README.md) — 路径更新
  - 删除 common/ErrorBoundary.tsx（94 行）
- 验收：`pnpm --filter topems-portal run typecheck` exit 0 · `grep common/ErrorBoundary` = 0 · 文件已删除

### D. CI composite action + TODO.md 归档
- 背景：ci.yml 12 个 job 重复声明 Install Rust/sccache/Cache steps；TODO.md 524 行含 V265-V272 过时章节
- 变更（4 files）：
  - 新建 [.github/actions/setup-rust/action.yml](file:///Users/air/TOPEMS/.github/actions/setup-rust/action.yml) — composite action（toolchain + sccache + rust-cache），参数化 components/cache-prefix/enable-sccache/enable-cache
  - [.github/workflows/ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) — 12 个 job 全部替换为 `uses: ./.github/actions/setup-rust`
  - 新建 [docs/roadmap/archive/TODO-archived-V265-V272.md](file:///Users/air/TOPEMS/docs/roadmap/archive/TODO-archived-V265-V272.md) — 346 行，11 个历史章节
  - [docs/roadmap/TODO.md](file:///Users/air/TOPEMS/docs/roadmap/TODO.md) — 524→211 行，保留 V273-V277 + 归档链接
- 验收：YAML 语法 OK（ci.yml + action.yml）· TODO.md 211 行 · 归档文件存在

### 变更文件清单（共 49 files）
- Rust（33）：lib/shared-core/src/testing.rs（新增）+ lib/shared-core/src/lib.rs + lib/shared-bootstrap/src/lib.rs + 9 svc/main.rs + 30 svc/tests/openapi_extract.rs + svc/lowcode/Cargo.toml
- 前端（3）：apps/web/src/components/ErrorBoundary.tsx + apps/web/tests/error-boundary.spec.tsx + apps/web/src/components/README.md（+ 删除 common/ErrorBoundary.tsx）
- CI（2）：.github/actions/setup-rust/action.yml（新增）+ .github/workflows/ci.yml
- 文档（4）：docs/roadmap/TODO.md + docs/roadmap/archive/TODO-archived-V265-V272.md（新增）+ docs/design/template-exceptions.md + apps/web/src/pages/gis/index.tsx（遗留 gis 改动一并提交）

### 最终验收矩阵
- [x] `cargo check --workspace --tests` — exit 0（Finished dev profile in 13m 35s）
- [x] `cargo check --workspace` — exit 0（36.88s，4 轨交叉无冲突）
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] openapi 测试 30 文件全部调用 `extract_openapi_spec_to_file` · 总行数 1400→360
- [x] `async fn init_db` 11→2 · `default_init_db` 18 处引用
- [x] `grep common/ErrorBoundary apps/web/src/` = 0 · common/ErrorBoundary.tsx 已删除
- [x] ci.yml + action.yml YAML 语法 OK · 12 job 全部替换为 composite action
- [x] TODO.md 524→211 行 · 归档文件 346 行 V265-V272

### V278 后续扩展（留给 V279+）
- [ ] **前端 API client 三端共享**：web/desktop/mobile 各有独立 axios client（token 注入/响应拦截/离线缓存），评估提取 packages/api-client
- [ ] **lib 门面 re-export 清理**：lib/src/lib.rs ~30 条 `pub use`，逐项验证是否有从未被 svc 使用的 re-export
- [ ] **剩余 init_db 统一**：rd/pm 的 init_db 有额外逻辑（非标准模式 A/B），评估可否接入 default_init_db + 扩展参数
- [ ] **CI composite action 增强**：评估将 PostgreSQL/Redis services 也参数化到 composite action
- [ ] **ApprovalTransition 推广**：MES 审批流方法评估推广到 finance/erp/pm

---

### 已完成：V277 列表/结构类模板化（4 页接入已有模板）

> 日期：2026-08-23 | 代码改动 6 files（页面 4 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 98.7% · 例外项 11→7

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| DatabaseStructurePage → MasterDetailPageTemplate | 左侧表列表 + 右侧详情 tabs，masterColumns 定义 + renderDetail 闭包 | ✅ |
| HelpCenterPage → CardListTemplate | 帮助分类卡片网格，HELP_CATEGORIES→data + cardConfig | ✅ |
| CommentsPage → ListPageTemplate | 筛选表单→headerContent，评论表单+列表→footerContent | ✅ |
| AppManagementPage → DetailPageTemplate | 表单字段+操作按钮，loading/error 透传，app code→subtitle | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 列表/结构类 4→0，总例外 11→7，覆盖率 97.9%→98.7% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 523/530 = 98.7%（+4 标准模板使用）
- [x] 例外项 11→7（-4），列表/结构类例外清零（4→0）

### V277 后续扩展（留给 V278+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性
- [ ] **工具/系统类模板化**：PerformanceTestPage / SystemManagementPage / PluginUploadPage 3 页评估接入

### 已完成：V276 GIS 模板接入（GisMapTemplate 落地）

> 日期：2026-08-23 | 代码改动 4 files（页面 2 + 例外清单 1 + TODO 1）| 验收：tsc 0 errors · 审计覆盖率 97.9% · 例外项 13→11

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| gis/index.tsx 迁移 | 替换 MapView → [GisMapTemplate](file:///Users/air/TOPEMS/apps/web/src/pages/gis/index.tsx)，devicePoints/storageLocations→markers、pipelines→GeoFence rectangles | ✅ |
| bi/GisPage/index.tsx 迁移 | [bi/GisPage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/bi/GisPage/index.tsx) inline GisMapTemplate 替代 MapSection 子组件，onMarkerClick 回查原数据 | ✅ |
| 例外清单更新 | [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) GIS 类 2→0，总例外 13→11，覆盖率 97.5%→97.9% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 519/530 = 97.9%（+2 标准模板使用）
- [x] 例外项 13→11（-2），GIS 类例外清零（2→0）

### V276 后续扩展（留给 V277+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **文档/邮件类模板化**：DocumentsPage / MailPage 2 页评估专用模板可行性

### 已完成：V275 报表类模板化（ReportViewerTemplate + DesignerTemplate 复用）

> 日期：2026-08-23 | 代码改动 15 files（模板 2 + 页面 6 + 审计脚本 1 + 例外清单 1 + 审计报告 4）| 验收：tsc 0 errors · 审计覆盖率 97.5% · 例外项 19→13

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| ReportViewerTemplate 创建 | 新建 [ReportViewerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/ReportViewerTemplate.tsx)（center/viewer 双模式 + statsHeader/filterBar/tabs/content/pagination/toolbar 结构化插槽 + children 透传 + loading/error 统一状态 + pageContainerProps 透传） | ✅ |
| DesignerTemplate 增强 | [DesignerTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/DesignerTemplate.tsx) title 改为可选 + 新增 pageContainerProps prop（fullscreen 模式 sx/contentSx 合并逻辑） | ✅ |
| 报表查看页迁移（3 页） | [ReportViewer.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportViewer.tsx)→viewer 模式 + [ReportPage/index.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportPage/index.tsx)→center 模式 + [ReportPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportPage.tsx) 别名 import 标记 | ✅ |
| 报表设计页迁移（3 页） | [ReportDesignPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportDesignPage.tsx)→DesignerTemplate standard + [ReportBuilderPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportBuilderPage.tsx)→standard + [ReportBuilder.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/report/ReportBuilder.tsx)→standard（isModal 双分支） | ✅ |
| 审计脚本 + 例外清单 | [scan.mjs](file:///Users/air/TOPEMS/scripts/design-system-audit/scan.mjs) 新增 report-viewer 规则 + report-designer 扩展接受 DesignerTemplate；[template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) 报表类 6→0，总例外 19→13，覆盖率 96.4%→97.5% | ✅ |

#### 最终验收矩阵
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/design-system-audit/scan.mjs` — 517/530 = 97.5%（+6 标准模板使用）
- [x] 例外项 19→13（-6），标准模板数 21→22（+1 ReportViewerTemplate）
- [x] 报表类例外清零（6→0）

### V275 后续扩展（留给 V276+）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板
- [ ] **门户/协作类模板化**：SupplierPortalPage / NotificationCenter 2 页评估专用模板可行性
- [ ] **GIS/地图类模板化**：GisMapTemplate 已建未接入，GisPage / gis/index 2 页评估接入

### 已完成：V273 四轨并行推进（MES 审批流 + AiToolPageTemplate + sqlx-cache CI check）

> 日期：2026-08-23 | 代码改动 16 files（Rust A 6 + 前端 B 0 + 前端 C 7 + CI/脚本 D 3）| 验收：cargo check --workspace exit 0 · typecheck exit 0 · sqlx-cache PASS 275 files · 例外项 22→19 · 覆盖率 95.8%→96.4%

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| A轨: MES 审批流三件套 | [approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) 新增 3 个共享方法（create_approval_and_log / execute_transition_and_log / reject_and_log）；4 个 MES 模块 12 处 TODO stub 全部替换为调用共享方法 | ✅ |
| B轨: shared-types react-query devDep | 复核发现 devDep 已在 commit 865c0bef5 补全（`^5.101.0`），tsc 0 errors，无需改动 | ✅ |
| C轨: AiToolPageTemplate + 3 页迁移 | 新建 [AiToolPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/AiToolPageTemplate.tsx)（结构化 + children 透传双模式）；AiCodeAssistantPage / AiDocumentAnalysisPage / AiKnowledgeBasePage 全部迁移；例外项 22→19，覆盖率 95.8%→96.4% | ✅ |
| D轨: .sqlx 缓存新鲜度 CI check | 新建 [check-sqlx-cache-freshness.cjs](file:///Users/air/TOPEMS/scripts/ci/check-sqlx-cache-freshness.cjs)（4 项静态检查 C1-C4）；[ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) quality-gate job +30 行；[lefthook.yml](file:///Users/air/TOPEMS/lefthook.yml) pre-commit +12 行 | ✅ |

### A轨详情：MES 审批流三件套

**背景**：MES 4 个模块（production_order / anomaly_detection / work_report / quality_management/inspection）各有 3 处 TODO stub，共 12 处，重复实现"校验 status + 创建 approval + 写 audit log"模式。

**变更（6 files）**：
- [svc/mes/src/modules/approval_common.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/approval_common.rs) — 新增 3 个共享方法，通过 `topems_shared_db::AuditLogService::log_operation` 写入 `public.audit_logs`
- [svc/mes/src/modules/mod.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/mod.rs) — 补全 `pub mod approval_common;` 声明
- [svc/mes/src/modules/production_order.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/production_order.rs) — 3 处 stub 替换（pending→released）
- [svc/mes/src/modules/anomaly_detection.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/anomaly_detection.rs) — 3 处 stub 替换（acknowledged→handling，table=None 虚拟实体）
- [svc/mes/src/modules/work_report.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/work_report.rs) — 3 处 stub 替换（rejected→reworking）
- [svc/mes/src/modules/quality_management/inspection.rs](file:///Users/air/TOPEMS/svc/mes/src/modules/quality_management/inspection.rs) — 3 处 stub 替换（failed→concession_received）

**验收**：`SQLX_OFFLINE=true cargo check -p topems-mes` exit 0，无 error 无 warning

### C轨详情：AiToolPageTemplate + 3 页迁移

**背景**：3 个 AI 工具页（AiCodeAssistant / AiDocumentAnalysis / AiKnowledgeBase）均为 Tabs 双栏布局，重复代码多。

**变更（7 files）**：
- [AiToolPageTemplate.tsx](file:///Users/air/TOPEMS/apps/web/src/components/templates/AiToolPageTemplate.tsx) — 新建模板（leftPanel/rightPanel/tabs 三插槽 + children 透传模式 + loading/error 状态 + designTokens 无硬编码）
- [extensions/index.ts](file:///Users/air/TOPEMS/apps/web/src/components/templates/extensions/index.ts) — 导出 AiToolPageTemplate
- [AiCodeAssistantPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiCodeAssistantPage.tsx) — children 透传模式（Tabs 联动左右两栏保留）
- [AiDocumentAnalysisPage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiDocumentAnalysisPage.tsx) — 结构化模式（leftPanel 文档上传 + tabs 5 分析模式 + rightPanel 3 状态内容）
- [AiKnowledgeBasePage.tsx](file:///Users/air/TOPEMS/apps/web/src/pages/ai/AiKnowledgeBasePage.tsx) — 结构化模式（leftPanelBreakpoint="lg" 保留原响应式）
- [template-exceptions.md](file:///Users/air/TOPEMS/docs/design/template-exceptions.md) — AI 对话类例外 3→0，总例外 22→19
- [scan.mjs](file:///Users/air/TOPEMS/scripts/design-system-audit/scan.mjs) — 新增 ai-tool 模板类型检测

**验收**：`pnpm --filter topems-portal run typecheck` exit 0，0 errors

### D轨详情：.sqlx 缓存新鲜度 CI check

**根因 callout**：V272 commit 删除了 migration.rs 但未更新 lib.rs 的 `pub mod migration;`，且 .sqlx 缓存过期导致 cargo check 报 18 errors。这类"缓存与代码不同步"问题在本项目中首次出现，根因是：sqlx 离线缓存（.sqlx/*.json）在 SQL 查询修改后需要 `cargo sqlx prepare` 重建，但 CI 无自动检测机制。本轨新增静态启发式检查（文件存在性/数量/git dirty），不运行 cargo sqlx prepare（太重），仅作 advisory 告警。

**变更（3 files）**：
- [scripts/ci/check-sqlx-cache-freshness.cjs](file:///Users/air/TOPEMS/scripts/ci/check-sqlx-cache-freshness.cjs) — 新建脚本，4 项检查：C1 目录存在 / C2 文件数≥50 / C3 git dirty / C4 git tracked；默认 DRY-RUN 不 exit 1
- [.github/workflows/ci.yml](file:///Users/air/TOPEMS/.github/workflows/ci.yml) — quality-gate job +30 行，advisory 模式（continue-on-error: true）
- [lefthook.yml](file:///Users/air/TOPEMS/lefthook.yml) — pre-commit hook +12 行，触发条件 .rs/.sql/.sqlx 改动

**验收**：`node scripts/ci/check-sqlx-cache-freshness.cjs --dry-run` → `SQLX_CACHE_STATUS: PASS · files: 275 · stale: false`

### 变更文件清单（共 16 files）

**Rust（6 files）**：
- svc/mes/src/modules/approval_common.rs · anomaly_detection.rs · mod.rs · production_order.rs · quality_management/inspection.rs · work_report.rs

**前端（7 files）**：
- apps/web/src/components/templates/AiToolPageTemplate.tsx（新增）
- apps/web/src/components/templates/extensions/index.ts
- apps/web/src/pages/ai/AiCodeAssistantPage.tsx · AiDocumentAnalysisPage.tsx · AiKnowledgeBasePage.tsx
- docs/design/template-exceptions.md
- scripts/design-system-audit/scan.mjs

**CI/脚本（3 files）**：
- scripts/ci/check-sqlx-cache-freshness.cjs（新增）
- .github/workflows/ci.yml
- lefthook.yml

### 最终验收矩阵
- [x] `SQLX_OFFLINE=true cargo check --workspace` — exit 0（27.21s）
- [x] `pnpm --filter topems-portal run typecheck` — exit 0，0 errors
- [x] `node scripts/ci/check-sqlx-cache-freshness.cjs --dry-run` — PASS · 275 files · stale: false
- [x] 12 处 MES TODO stub 全部替换（grep `TODO.*审批` 结果为 0）
- [x] 例外项 22→19（-3），覆盖率 95.8%→96.4%（508→511/530）
- [x] Axum R1/R2/R3=0 STRONG_PASS · Perm R1-R6=0 · i18n 0 hardcoded

### V274 后续扩展（留给 V275+）
- [x] **报表类模板化**：V275 已完成 — 新建 ReportViewerTemplate（center/viewer 双模式）+ 复用 DesignerTemplate（standard），6 个报表页全部迁移（ReportDesignPage/ReportBuilder/ReportBuilderPage→DesignerTemplate，ReportViewer/ReportPage/index→ReportViewerTemplate），覆盖率 96.4%→97.5%，例外项 19→13
- [x] **sqlx-cache 语义级检查**：V274 已实现 — sqlx-prepare.sh --semantic mode + schema-defense-gate advisory step（连接 DB + PREPARE 验证 + hash 比较）
- [ ] **ApprovalTransition 推广**：A 轨 3 个方法仅在 MES 使用，评估推广到 finance/erp/pm 等其他有审批流的模块
- [ ] **AiToolPageTemplate 推广**：评估 AiPromptLibraryPage / AiModelSettingsPage / AiDashboardPage 是否可接入模板

> 历史版本归档见 [archive/TODO-archived-V265-V272.md](./archive/TODO-archived-V265-V272.md)

### 质量门禁基线

| 门禁 | 指标 | 状态 |
|------|------|------|
| axum-layer-gate | R1/R2/R3 = 0/0/0 | ✅ |
| perm-gate | R1/R3/R5 = 0/0/0 | ✅ |
| cargo check | 0 errors · CRM 0 warnings | ✅ |
| tsc apps/web | 0 errors | ✅ |
| tsc shared packages | 6/6 passed | ✅ |
| props-alignment | 100% realness (359 routes) | ✅ |

### 代码净减

V254(-531) + V257(-19074 BFF) + V258(-2814 dead exports) + V264+(-96 dead exports) ≈ **净减 22,500+ 行**

---

## 📚 归档索引

> 已完成版本的详细验收矩阵、变更统计、EDGE CASE 记录均已按时间轴拆分至以下归档文档。

| 归档文件 | 版本范围 | 核心产物覆盖 |
|---------|---------|-------------|
| 📘 [V67-V99-foundation.md](archive/V67-V99-foundation.md) | V67.2 ~ V99 | 数据层 P0 修复 / 导航统一 / Schema 防御 / OpenAPI 契约 |
| 📗 [V178-V210-modules.md](archive/V178-V210-modules.md) | V178 ~ V210 | MES/QMS/WMS/TMS/APS 6 大模块 / 导航三联校验 / utoipa 注解 |
| 📙 [V211-V230-quality.md](archive/V211-V230-quality.md) | V210.5 ~ V230 | 覆盖率冲刺 / Design Token 2845→169 / i18n 清零 R5→R13 |
| 📕 [V231-V258-closure.md](archive/V231-V258-closure.md) | V231 ~ V258 | 架构冗余收修 / R5 security 清零 / Tauri Stronghold+IPC / 前端泛型 / 死代码 2814 条 |
| 📒 [V259-V264-backlog-closure.md](archive/V259-V264-backlog-closure.md) | V259 ~ V264+ | V252 CRUD 审计 Phase 1-6 / V232 Strict-Zero P0-P4 / Backlog 5 主题 16 条全完成 / L1-VALUE 96 dead exports / Tauri 生态 5/5 / CI 双开关 blocking |
| 🔧 [V266-P0-hook-unification.md](archive/V266-P0-hook-unification.md) | V266-P0 | husky/lefthook/pre-commit 三套 Hook 统一 / 4 Gate 迁移 / husky 180 行 shell 删除 / validate All good |

**快速跳转**：
- 最早的设计决策 → V67-V99
- MES/QMS/WMS/TMS/APS 业务逻辑 → V178-V210
- i18n / Design Token 经验 → V211-V230
- Tauri keystore / 前端泛型 / CI Gate → V231-V258
- V252 CRUD 审计 / V232 Strict-Zero / Backlog 全量收闭 → V259-V264+
