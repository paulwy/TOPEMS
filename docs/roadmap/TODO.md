# TOPEMS 项目任务规划与路线图

> **版本**: V266 | **更新日期**: 2026-08-22
>
> **V259-V264+ Backlog 与 V265 硬编码清理已收闭**。当前进入 V266 设计系统模板迁移收尾阶段。
> **V266-P0 架构冗余重构（Git Hook 统一）已完成**。当前推进 V266-P1 desktop 复用 web 模块系统。

---

## 📊 当前状态

### 已完成：架构冗余重构 P1 — desktop 接入共享类型层 + 依赖修复 + 懒加载优化（V266-P1）

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| P1 Step 1: 抽取 web 模块系统到 @topems/app-shell 共享包 | navigation-types + permissions-types + module-types + tsconfig 别名 + web re-export | ✅ |
| P1 Step 2: desktop 接入 app-shell | routes/index.ts 使用 NavItemConfig 类型 + Sidebar/WindowList 适配 | ✅ |
| P1 Step 3: 检查重复配置文件 | desktop 无独立 eslint/prettier，已复用根目录 | ✅ |
| P1 Step 4: 保留桌面专属能力 | src-tauri/ + offlineCache + Tauri IPC + 键盘快捷键 均未修改 | ✅ |
| P1 Step 5: 统一依赖与配置 | desktop package.json 添加 @topems/app-shell: workspace:* | ✅ |
| desktop 依赖补全 | axios + react-router-dom + zustand + lucide-react + @testing-library 声明 | ✅ |
| tsconfig paths 覆盖 | 移除 lucide-react 映射到 web/icons，@ 别名指向 desktop/src | ✅ |
| vite.config 修正 | @ 别名从 ../web/src 改为 ./src + 添加 @topems/app-shell 别名 | ✅ |
| 路由懒加载 | 8 页面改为 React.lazy + Suspense，index chunk 55KB → 15KB (-72.6%) | ✅ |
| code-splitting | manualChunks 函数（7 vendor 分组），0 chunk > 500KB | ✅ |
| Tauri API 浏览器降级 | isTauri 环境检测 + currentWindow 空值守卫，消除 metadata 错误 | ✅ |
| 浏览器测试验证 | 初始加载不含页面 chunk + /hr 动态加载 HR-xxx.js + /crm 动态加载 CRM-xxx.js | ✅ |

> **P1 实施策略调整**: web 模块系统与 i18n/Module Federation 深度耦合，全量抽取风险高。采用渐进式共享：先抽取纯类型定义和常量到 @topems/app-shell，web re-export 保持 API 兼容，desktop 引用共享类型。desktop 的 pages/ 暂保留（依赖 MUI 组件），后续可通过 Tauri WebView 加载 web 构建产物进一步消除冗余。

### 已完成：架构冗余重构 P0 — Git Hook 系统统一（V266-P0）

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| 对比工具创建 | scripts/dev/compare-hooks.py — husky vs lefthook 差异报告 | ✅ |
| 迁移脚本创建 | scripts/dev/migrate-husky-to-lefthook.py — 幂等迁移工具 | ✅ |
| 新增 4 Gate（N/O/P/Q） | large-files + sensitive-info + api-duplicates + i18n-hardcode-admin | ✅ |
| Gate O 修复 | sensitive-info 提取为外部脚本 check-sensitive-info.sh | ✅ |
| package.json 切换 | prepare: husky → lefthook install; husky → lefthook ^2.1.0 | ✅ |
| 删除 .husky 目录 | 180+ 行 shell 脚本清除 | ✅ |
| 精简 .pre-commit-config.yaml | 移除 3 个 local hooks，保留 6 个第三方 Python hook | ✅ |
| 移除 name 字段 | 16 Gate name 字段批量清除，validate All good | ✅ |
| 配置文档生成 | docs/engineering/LEFTHOOK_GUIDE.md — 16 Gate 完整文档 | ✅ |
| Gate 执行验证 | 12/14 Gate 通过（cargo-test + frontend-typecheck 因耗时长跳过） | ✅ |

> 归档详情: [V266-P0-hook-unification.md](archive/V266-P0-hook-unification.md)

### 设计系统模板迁移收尾（V266 前序）

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| system/AuditLogPage 迁移到 ListPageTemplate | 保留统计卡片、筛选、分页、行操作、详情弹窗；移除自定义 Filters/Table | ✅ |
| apps/web tsc 验证 | 0 errors | ✅ |
| apps/web eslint 验证 | 0 errors | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 77.7% → 77.8% | ✅ |
| system/BackupPage 迁移到 ListPageTemplate | 保留创建/恢复/详情弹窗、行操作；移除自定义 MUI Table | ✅ |
| oa/AnnouncementPage 迁移到 ListPageTemplate | 接入 ListPageTemplate 并预留列结构 | ✅ |
| lims/InspectionResultPage 迁移到 ListPageTemplate | 接入 ListPageTemplate 并预留列结构 | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 77.8% → 78.4%；硬编码 113 → 106 | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 83.2% → 83.4%；未使用模板页面 90 → 89 | ✅ |
| finance/ConsolidationScopePage 迁移到 ListPageTemplate | 保留主从布局、统计卡片、搜索、行操作；左侧 scope 列表接入模板，右侧详情保留原交互 | ✅ |
| crm/CrmForecastAlgorithmPage 迁移到 StatsPageTemplate | 配置面板作为 customToolbar，预测/评估结果接入 statCards + tables；StatsPageTemplate 修复空筛选栏渲染 | ✅ |
| P1 剩余非页面/非列表项处理 | EmployeeFinanceTab 为员工详情 Tab、PaymentPrintTemplate 为打印模板，均不适合当前模板体系，暂不迁移 | ⏸ |
| 设计系统审计扫描回归 | 模板覆盖率 83.4% → 83.6%；未使用模板页面 89 → 88；P1 剩余 2 | ✅ |
| P2 第一批统计型页面迁移到 StatsPageTemplate | APS 6 个 + TMS 6 个分析页；指标卡接入 statCards，复杂 chart/table 保留在 children | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 83.6% → 85.8%；未使用模板页面 88 → 76；P2 剩余 13 | ✅ |
| P2 第二批详情页迁移到 DetailPageTemplate | APS 6 个 + TMS 6 个详情页；字段网格接入 SectionConfig，TransportPlan 使用 tabs，状态/操作保留在 headerContent | ✅ |
| 设计系统审计扫描回归 | 模板覆盖率 85.8% → 88.1%；未使用模板页面 76 → 64；P2 剩余 1（SupplierPortalPage 门户页暂不迁移） | ✅ |
| 下一批页面待迁移 | 剩余 64 个未标准化页面中 P3 占 60，多为低优先级/组件型页面，可继续按模块分批推进 | 🔄 |

### V265 归档：设计系统样式硬编码清理收尾

| 子任务 | 交付结果 | 状态 |
|--------|---------|------|
| 修复 DataTable.tsx ESLint 未使用表达式 | line 1369 `&&` 改为 `if` | ✅ |
| 更新审计脚本：rem 统计排除已 token 化引用 | scan.mjs regex negative lookbehind/lookahead | ✅ |
| rem 字号批量替换 | 267 文件已替换为 `designTokens.typography.fontSize.scale` | ✅ |
| px spacing 修复脚本 | `scripts/design-system-audit/fix-px-spacing.cjs` 创建并运行 | ✅ |
| px spacing 批量替换 | 74 文件已替换为 `designTokens.spacing.*` | ✅ |
| 修复 px 脚本生成的数字 key 语法错误 | `spacing.2xl` → `spacing['2xl']` | ✅ |
| apps/web tsc 验证 | 0 errors | ✅ |
| apps/web eslint 关键路径验证 | 0 errors（剩余 6 条 pre-existing warning） | ✅ |
| 剩余 6 处 rem 间距值替换 | `PerformanceTestPage` 4 处、`DashboardPage` 2 处 | ✅ |
| 设计系统审计扫描回归 | 当前硬编码 113 处（px 113 + rem 0） | ✅ |

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
