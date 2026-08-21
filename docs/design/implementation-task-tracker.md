# TOPEMS 设计系统治理实施任务跟踪表

> 版本：V1.0  
> 状态：执行中  
> 生成时间：2026-08-21  
> 关联文档：[`design-system-implementation-plan.md`](./design-system-implementation-plan.md)

---

## 说明

本文件为可勾选清单，可直接在 Markdown 编辑器或 Git 中跟踪进度。每个任务包含：

- **阶段**：所属实施阶段
- **编号**：任务唯一编号
- **任务**：具体工作内容
- **负责人**：建议负责角色
- **优先级**：P0/P1/P2/P3
- **计划周期**：建议完成时间
- **状态**：未开始 / 进行中 / 已完成 / 阻塞
- **验收标准**：完成判定依据
- **输出物**：交付成果

---

## 阶段 0：准备与基线（第 1-2 周）

| 编号 | 任务 | 负责人 | 优先级 | 计划周期 | 状态 | 验收标准 | 输出物 |
|------|------|--------|--------|----------|------|----------|--------|
| 0.1 | 建立页面-模板-组件映射扫描 | 前端架构 / DevEx | P0 | 第 1 周 | 已完成 | 扫描覆盖 100% 页面；输出 CSV；误报率 < 5% | `scripts/design-system-audit/scan.mjs`、`reports/page-template-map.csv`、`reports/shared-component-usage.csv` |
| 0.2 | 制定《页面模板选型规范》 | 前端架构 + 设计负责人 | P0 | 第 1 周 | 已完成 | 15 种模板各含适用场景、必选子组件、不推荐场景；每模板 1 正例 1 反例 | `docs/design/page-template-selection-guide.md` |
| 0.3 | 制定《共享组件使用规范》 | 前端架构 + 设计负责人 | P0 | 第 1 周 | 已完成 | 10+ 核心组件 DO/DON'T；明确禁止自研表格、自定义按钮变体、优先使用共享表单控件 | `docs/design/shared-component-guidelines.md` |
| 0.4 | 搭建 Token 合规扫描 | 前端架构 / DevEx | P0 | 第 1-2 周 | 已完成 | 识别颜色、px 间距、rem 字号硬编码；CI 失败给出文件路径行号；支持白名单 | `scripts/ci/check-design-tokens.cjs` |
| 0.5 | 建立设计系统看板 | 项目经理 / DevEx | P1 | 第 2 周 | 未开始 | 含待开始/进行中/待验收/已完成四列；关键指标每周五自动更新 | 项目管理看板 + 自动化脚本 |

### 阶段 0 详细任务清单

- [x] 0.1 建立页面-模板-组件映射扫描
- [x] 0.2 制定《页面模板选型规范》
- [x] 0.3 制定《共享组件使用规范》
- [x] 0.4 搭建 Token 合规扫描
- [ ] 0.5 建立设计系统看板

---

## 阶段 1：核心模板统一（第 3-6 周）

| 编号 | 任务 | 负责人 | 优先级 | 计划周期 | 状态 | 验收标准 | 输出物 |
|------|------|--------|--------|----------|------|----------|--------|
| 1.1 | 统一 Dashboard 入口页 | 业务前端 | P0 | 第 3 周 | 已完成 | `DashboardPage`、`HybridHomePage`、`ModulesOverviewPage` 均接入 `DashboardTemplate`；tsc/eslint 通过；设计系统审计覆盖率提升 | 3 个页面重构 |
| 1.2 | 统一 List 类型页面 | 业务前端 | P0 | 第 3-5 周 | 进行中 | 150-200 个列表页使用 `ListPageTemplate` + `DataTable` + `Pagination`；已完成：`tms/ShipmentManagementPage`、`lowcode/AppListPage`、`lowcode/PageListPage`、`lowcode/FormListPage`、`lowcode/DataModelListPage`、`erp/AuditLogPage`；`oa/DocumentManagementPage`、`oa/MeetingManagementPage`、`oa/VehicleManagementPage` 迁移到 `ListPageTemplate`；ERP DatabaseManagementPage 使用 `DataTable` + `Pagination` 替换自定义表格；ERP FinancialAnalysisPage / FinancialReportPage 迁移到 `StatsPageTemplate`；`mes/AnomalyDetectionPage`、`mes/EnergyManagementPage`、`mes/ProductionCostPage`、`mes/ApsSchedulingPage`、`mes/ProductionKanbanPage`、`mes/QualityTraceabilityPage` 及 MES analytics 6 页迁移到 `StatsPageTemplate` / `DashboardTemplate`；当前标准模板覆盖率 75.2%，DataTable 使用率 45.4% | 列表页重构批次 |
| 1.3 | 统一 Detail 类型页面 | 业务前端 | P0 | 第 4-5 周 | 未开始 | 80-120 个详情页使用 `DetailPageTemplate` | 详情页重构批次 |
| 1.4 | 统一 Form 类型页面 | 业务前端 | P0 | 第 4-6 周 | 未开始 | 80-120 个表单页使用 `FormPageTemplate`；共享表单控件 ≥ 90% | 表单页重构批次 |
| 1.5 | Kanban 看板页试点 | 业务前端 | P1 | 第 5-6 周 | 未开始 | 至少 1 个看板页完全使用 `KanbanPageTemplate` | 看板页试点 |

### 阶段 1 详细任务清单

- [x] 1.1 统一 Dashboard 入口页
- [x] 1.2 统一 List 类型页面（试点完成，批量迁移待续）
- [ ] 1.3 统一 Detail 类型页面
- [ ] 1.4 统一 Form 类型页面
- [ ] 1.5 Kanban 看板页试点

### 阶段 1 模块优先级（列表/详情/表单页）

按业务优先级分批推进：

1. **P0 优先**：MES（42 页）、WMS（33 页）、ERP（23 页）
2. **P1 批次**：CRM（21 页）、Finance（23 页）、HRM（26 页）、QMS（24 页）
3. **P2 批次**：SCM、SRM、PDM、RD、LIMS、APS

---

## 阶段 2：组件与 Token 深化（第 7-10 周）

| 编号 | 任务 | 负责人 | 优先级 | 计划周期 | 状态 | 验收标准 | 输出物 |
|------|------|--------|--------|----------|------|----------|--------|
| 2.1 | 新增布局组件 | 前端架构 | P0 | 第 7-8 周 | 未开始 | `DetailLayout`、`FormLayout`、`SettingsLayout`、`MasterDetailLayout` 通过单测，各提供 Storybook 示例 | 4 个布局组件 |
| 2.2 | 新增/补齐表单组件 | 前端架构 | P0 | 第 7-8 周 | 未开始 | `FormRadio`、`FormSlider`、`FormAutocomplete`、`FormRating` API 一致，接入 FormField 体系 | 新表单组件 |
| 2.3 | 统一图表组件 | 前端架构 | P1 | 第 8-9 周 | 未开始 | 5 种图表组件颜色从 Token 获取；支持空/加载/错误态；响应式；暗色模式 | `LineChartCard`、`BarChartCard`、`PieChartCard`、`AreaChartCard`、`StatTrendChart` |
| 2.4 | 组件级 Token 扩展 | 设计负责人 + 前端架构 | P0 | 第 8-9 周 | 未开始 | ≥20 个组件级 Token；共享组件优先使用；Token 变更自动响应 | `semanticTokens.components.*` |
| 2.5 | 暗色模式与 Cyber 主题统一 | 设计负责人 | P1 | 第 9 周 | 未开始 | 三套主题边界清晰；切换无闪烁；共享组件在三套主题下正常 | `docs/design/theme-strategy.md` |
| 2.6 | Token 合规扫描接入 CI | DevEx | P0 | 第 9-10 周 | 已完成 | CI 对新增/修改文件执行检查；硬编码导致 CI 失败；白名单生效 | `scripts/ci/check-design-tokens.cjs --changed-only` 接入 CI |

### 阶段 2 详细任务清单

- [ ] 2.1 新增布局组件
- [ ] 2.2 新增/补齐表单组件
- [ ] 2.3 统一图表组件
- [ ] 2.4 组件级 Token 扩展
- [ ] 2.5 暗色模式与 Cyber 主题统一
- [x] 2.6 Token 合规扫描接入 CI

---

## 阶段 3：模块级重构（第 11-16 周）

| 编号 | 任务 | 负责人 | 优先级 | 计划周期 | 状态 | 验收标准 | 输出物 |
|------|------|--------|--------|----------|------|----------|--------|
| 3.1 | P0 模块 100% 迁移 | 业务前端 | P0 | 第 11-13 周 | 未开始 | MES、WMS、ERP 全部页面完成模板迁移 | 模块迁移报告 |
| 3.2 | P1 模块 80% 迁移 | 业务前端 | P1 | 第 12-14 周 | 未开始 | CRM、Finance、HRM、QMS 80% 页面迁移 | 模块迁移报告 |
| 3.3 | P2 模块 50% 迁移 | 业务前端 | P2 | 第 14-16 周 | 未开始 | SCM、SRM、PDM、RD、LIMS、APS 50% 页面迁移 | 模块迁移报告 |
| 3.4 | 全站验收 | QA + 设计负责人 | P0 | 第 16 周 | 未开始 | 模板覆盖率 ≥ 80%；Token 合规率 ≥ 90%；P0/P1 无 P0/P1 Bug | 验收报告 |

### 阶段 3 详细任务清单

- [ ] 3.1 P0 模块 100% 迁移
  - [ ] 3.1.1 MES 模块迁移（42 页）
  - [ ] 3.1.2 WMS 模块迁移（33 页）
  - [ ] 3.1.3 ERP 模块迁移（23 页）
- [ ] 3.2 P1 模块 80% 迁移
  - [ ] 3.2.1 CRM 模块迁移（21 页）
  - [ ] 3.2.2 Finance 模块迁移（23 页）
  - [ ] 3.2.3 HRM 模块迁移（26 页）
  - [ ] 3.2.4 QMS 模块迁移（24 页）
- [ ] 3.3 P2 模块 50% 迁移
  - [ ] 3.3.1 SCM 模块迁移
  - [ ] 3.3.2 SRM 模块迁移
  - [ ] 3.3.3 PDM 模块迁移
  - [ ] 3.3.4 RD 模块迁移
  - [ ] 3.3.5 LIMS 模块迁移
  - [ ] 3.3.6 APS 模块迁移
- [ ] 3.4 全站验收

---

## 阶段 4：机制固化与持续治理（长期）

| 编号 | 任务 | 负责人 | 优先级 | 计划周期 | 状态 | 验收标准 | 输出物 |
|------|------|--------|--------|----------|------|----------|--------|
| 4.1 | 建立设计评审流程 | 设计负责人 + 产品经理 | P0 | 第 17 周 | 未开始 | 流程写入 Wiki；新增页面 100% 经过模板选型确认 | 设计评审流程文档 |
| 4.2 | 建立设计系统贡献流程 | 前端架构 + 设计负责人 | P0 | 第 17-18 周 | 未开始 | RFC → 评审 → 开发 → Storybook → 发布流程落地 | 贡献指南文档 |
| 4.3 | 持续监控与报告 | DevEx | P1 | 第 18 周起 | 未开始 | 每周五自动发送健康度报告；每月召开治理会议 | 自动化报告脚本 |
| 4.4 | 模板市场/示例库建设 | 前端架构 | P2 | 第 18-20 周 | 未开始 | 15 种模板均有可交互示例 + 代码片段；支持 light/dark 切换 | Storybook + `/template-demo` |
| 4.5 | 文档站点建设 | DevEx + 设计负责人 | P2 | 第 19-20 周 | 未开始 | 文档站点可访问；Token 支持一键复制；组件文档与代码同步 | 设计系统文档站点 |

### 阶段 4 详细任务清单

- [ ] 4.1 建立设计评审流程
- [ ] 4.2 建立设计系统贡献流程
- [ ] 4.3 持续监控与报告
- [ ] 4.4 模板市场/示例库建设
- [ ] 4.5 文档站点建设

---

## 质量保障体系

| 检查项 | 工具 | 触发时机 | 负责集成 | 状态 |
|--------|------|----------|----------|------|
| Token 合规检查 | `scripts/ci/check-design-tokens.cjs` | PR / 本地 commit | DevEx | 已完成 |
| 模板使用检查 | `scripts/design-system-audit/scan.mjs` | PR / 阶段评审 | 前端架构 | 已完成 |
| 组件导入检查 | ESLint | PR | 前端架构 | 待接入 |
| TypeScript 类型检查 | `tsc` | PR | 前端架构 | 已接入 |
| 单元测试 | `vitest` | PR | 业务前端 | 已接入 |
| 视觉回归测试 | Playwright / Chromatic | 关键 PR | QA | 待接入 |

---

## 当前基线（2026-08-21）

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 页面总数 | 537 | 控制增长 |
| 模板覆盖率 | 73.2% | ≥ 80%（阶段 3）/ ≥ 90%（长期） |
| DataTable 使用率 | 44.9% | ≥ 80% |
| PageContainer 使用率 | 60.5% | ≥ 90% |
| 公共/共享组件使用率 | 61.3% | ≥ 85% |
| 硬编码样式问题 | 480 处 / 114 文件 | 新增 0，存量 ≤ 50 |
| Token 合规率 | 待精确统计 | 新增 100%，存量 ≥ 90% |

---

## 使用说明

### 作为 Markdown 勾选清单

直接编辑本文件，将 `- [ ]` 改为 `- [x]` 标记完成。

### 导入到任务管理工具

本目录下同时提供 [`implementation-task-tracker.csv`](./implementation-task-tracker.csv)，可导入到：

- 飞书多维表格 / Lark Base
- Notion Database
- Jira / Linear（通过 CSV 导入插件）
- Excel / Google Sheets

CSV 字段：阶段、编号、任务、负责人、优先级、计划周期、状态、验收标准、输出物。

---

## 更新记录

| 版本 | 时间 | 变更内容 |
|------|------|----------|
| V1.0 | 2026-08-21 | 初稿，基于 design-system-implementation-plan.md 拆分可执行任务 |
| V1.1 | 2026-08-21 | 阶段 1.1 完成：DashboardPage / HybridHomePage / ModulesOverviewPage 接入 DashboardTemplate；tsc/eslint 通过；模板覆盖率由 70.4% 提升至 70.9% |
| V1.2 | 2026-08-21 | 阶段 1.2 推进：完成 `tms/ShipmentManagementPage` 与 `lowcode/AppListPage` 的 ListPageTemplate 迁移；tsc/eslint 通过；模板覆盖率由 70.9% 提升至 71.3% |
| V1.3 | 2026-08-21 | 阶段 1.2 ERP 优先批次：完成 `erp/AuditLogPage` 的 ListPageTemplate 迁移；`erp/DatabaseManagementPage` 改用 `DataTable` + `Pagination` 替换自定义表格；tsc/eslint 通过；模板覆盖率由 71.3% 提升至 71.5% |
| V1.4 | 2026-08-21 | 阶段 1.2 ERP 剩余页面：完成 `erp/FinancialAnalysisPage` 与 `erp/FinancialReportPage` 到 `StatsPageTemplate` 的迁移；tsc/eslint 通过；模板覆盖率由 71.5% 提升至 71.9%，DataTable 使用率由 44.3% 提升至 44.7%，硬编码样式问题减少 1 处 |
| V1.5 | 2026-08-21 | 阶段 1.2 OA 批次：完成 `oa/DocumentManagementPage`、`oa/MeetingManagementPage`、`oa/VehicleManagementPage` 到 `ListPageTemplate` 的迁移；同步补充 `zh/oa.json` 与 `en/oa.json` 翻译 key；tsc/eslint 通过；模板覆盖率由 71.9% 提升至 72.4% |
| V1.6 | 2026-08-21 | 阶段 1.2 lowcode 批次：完成 `lowcode/PageListPage`、`lowcode/FormListPage`、`lowcode/DataModelListPage` 到 `ListPageTemplate` 的迁移，保留预览/发布/设为首页等自定义行操作；tsc/eslint 通过；模板覆盖率由 72.4% 提升至 73.0% |
