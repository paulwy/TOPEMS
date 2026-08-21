# TOPEMS 前端页面模板与设计资产盘点报告

> 生成时间：2026-08-21
> 范围：`apps/web`、`packages/shared-components`、`packages/tokens`
> 用途：为后续页面统一、设计系统完善、模板扩展提供数据基线与改进路线

---

## 1. 总体概览

TOPEMS Web 端是一个面向制造业/企业资源管理的大型 React 应用，采用 **Monorepo + Module Federation** 架构。当前已形成一套较完整的页面模板体系、共享组件库与设计 Token 层，但页面数量庞大、模块众多，存在模板使用率不均、部分页面重复造轮子、设计资产分散等可优化空间。

| 维度 | 数量 | 备注 |
|------|------|------|
| 页面文件 | **537** | `apps/web/src/pages/**/*.tsx`（不含测试/子组件/hooks） |
| 业务模块 | **37** | `apps/web/src/modules/*/config.ts` |
| 一级业务域 | **10** | workbench / core / operation / manufacturing / quality / supply / finance_hr / data_ai / system / profile |
| 页面模板类型 | **15** | 5 核心 + 10 扩展 |
| 模板相关文件 | **47** | 核心/扩展模板 + list 子组件 + dashboard 子组件 |
| 共享组件 | **29** | `packages/shared-components/src/components` |
| 表单/数据 Schema | **267** | `apps/web/src/schemas/**/*` |
| 路由文件 | **8** | `apps/web/src/routes/**/*` |
| 设计 Token | 1 套 | `packages/tokens/src/tokens.ts` |

---

## 2. 页面分布热力图

按顶层目录统计，页面文件最多的 10 个业务域如下：

| 排名 | 模块 | 页面数 | 所属一级域 | 典型场景 |
|------|------|--------|------------|----------|
| 1 | MES | 42 | manufacturing | 工单、工艺、设备、质检、WIP |
| 2 | WMS | 33 | supply | 入库、出库、盘点、库位、波次 |
| 3 | HRM | 26 | finance_hr | 员工、考勤、薪酬、绩效、招聘 |
| 4 | QMS | 24 | quality | 检验、审核、FMEA、8D、SPC |
| 5 | RD | 23 | operation | 项目、实验、配方、bug、构建 |
| 6 | Finance | 23 | finance_hr | 凭证、预算、报销、报表、税务 |
| 7 | ERP | 23 | core | 采购/销售订单、资产、客户、供应商 |
| 8 | CRM | 21 | operation | 客户、商机、合同、销售漏斗 |
| 9 | Admin | 21 | system | 租户、权限、审计、系统参数 |
| 10 | PDM | 20 | core | BOM、物料、版本、变更、文档 |

其余模块：SCM(19)、TMS(18)、LIMS(18)、APS(18)、SRM(16)、EHS(16)、Workflow(14)、PM(14)、Mobile(14)、Shared(13)、BI(13)、Report(11)、Lowcode(11)、Monitor(10)、Integration(10)、AI(9)、Notification(8)、Doc(6)、OA(5)、Automation(5)、Asset(5)、System(4)、Plugin(4)、IAM(4)、GIS(4)、IM(3)、Help(3)、Ticket(2)、Desktop(2)、Performance(1)。

### 关键发现

- **制造与供应链类页面占绝对大头**（MES+WMS+SCM+SRM+QMS+LIMS+APS = 174 页，约 32%），是模板统一收益最高的区域。
- **共享页（shared）仅 13 页**，但承载登录、仪表盘、个人中心、帮助中心等高频入口。
- **部分模块页面数与配置数不匹配**：37 个 module config 中，部分模块（如 `integration`、`asset`）页面较少，可能以微前端或动态路由承载。

---

## 3. 页面模板体系分析

### 3.1 模板分类（15 种）

模板定义位于 `apps/web/src/components/templates/classification.ts`。

#### 核心模板（5 种，建议覆盖 80% 场景）

| 类型 | 组件 | 分类 | 频率 | 典型页面 |
|------|------|------|------|----------|
| `list` | `ListPageTemplate` | data-display | 高 | 列表、CRUD、查询 |
| `detail` | `DetailPageTemplate` | data-display | 高 | 详情、审批记录 |
| `form` | `FormPageTemplate` | data-entry | 高 | 新建/编辑表单 |
| `dashboard` | `DashboardTemplate` | overview | 高 | 首页、统计看板 |
| `kanban` | `KanbanPageTemplate` | data-display | 高 | 任务看板、状态流转 |

#### 扩展模板（10 种，按需引入）

| 类型 | 组件 | 分类 | 频率 | 典型页面 |
|------|------|------|------|----------|
| `tree` | `TreePageTemplate` | data-display | 中 | 组织架构、分类树 |
| `stats` | `StatsPageTemplate` | analytics | 中 | 统计报表、分析页 |
| `settings` | `SettingsPageTemplate` | data-entry | 中 | 系统设置、个人设置 |
| `card-list` | `CardListTemplate` | data-display | 中 | 卡片式列表 |
| `wizard` | `WizardPageTemplate` | data-entry | 低 | 分步表单、向导 |
| `timeline` | `TimelinePageTemplate` | data-display | 低 | 时间轴、审批流 |
| `master-detail` | `MasterDetailPageTemplate` | data-display | 低 | 主从布局 |
| `markdown-editor` | `MarkdownEditorTemplate` | data-entry | 低 | 文档编辑 |
| `report-designer` | `ReportDesignerTemplate` | analytics | 低 | 报表设计器 |
| `gis-map` | `GisMapTemplate` | special | 低 | GIS 地图页 |

### 3.2 模板子组件清单

`ListPageTemplate` 已拆分为 18 个原子子组件，是体系化程度最高的模板：

- 布局：`PageHeader`、`TableSection`、`StatsCards`、`MobileCardView`
- 交互：`ViewModeToggle`、`RowActionMenu`、`ListBatchActions`、`ListSearchBar`、`ListColumnConfig`
- 数据操作：`CrudFormDialog`、`BatchDialogs`、`ExportMenu`、`EditCell`、`Pagination`
- 空状态：`EmptyState`
- 钩子：`hooks.tsx`

`DashboardTemplate` 拆分为 3 个子组件：`StatCardComponent`、`CardGroupComponent`、`ChartCardComponent`。

### 3.3 模板使用现状（基于扫描脚本实测）

通过 `scripts/design-system-audit/scan.mjs` 扫描 537 个页面得到：

- **模板覆盖率为 68.0%**：365 个页面使用了标准模板，172 个页面为自定义实现。
- **CrudPage 是绝对主力**：233 个页面（43.4%）使用 `CrudPage`，它内部封装了 `ListPageTemplate` + `FormBuilder` + 详情能力，但未在 `classification.ts` 的 15 种类型中体现。
- **Dashboard 模板使用率第二**：48 个页面使用 `DashboardTemplate`。
- **Detail / Form / Settings / Stats 模板少量使用**：分别为 29、12、26、11 个页面。
- **扩展模板使用率极低**：wizard、gis-map、card-list、tree、master-detail、kanban、timeline 各 1-2 个页面。
- **TemplateDemoPage 与页面模板体系脱节**：当前演示的是「文本模板变量渲染」，而非 15 种页面模板的交互展示。

> 关键结论：项目中实际运行的是「15 种模板 + CrudPage」的混合体系，应补充 CrudPage 进模板选型规范。

---

## 4. 共享组件库盘点

`packages/shared-components` 目前导出 **29 个组件**，按功能可归纳为：

### 4.1 基础交互

- `ActionButton`：统一按钮（primary/secondary/success/warning/danger/text）
- `BackButton`：返回按钮
- `LoadingSpinner` / `LoadingOverlay` / `SkeletonLoader`：加载态

### 4.2 表单输入

- `FormField`、`FormSelect`、`FormCheckbox` / `FormCheckboxGroup`、`FormSwitch`
- `NumberField`、`CurrencyField`、`PercentField`
- `DatePicker`、`DateRangePicker`
- `Cascader`、`FileUpload`

### 4.3 数据展示

- `DataTable`：基于 TanStack Table，支持搜索、筛选、排序、分页、选择、导出、移动端卡片视图、虚拟滚动
- `Pagination`：分页
- `StatusBadge`：状态徽标（含多业务状态预设）
- `ProgressBar`、`RelativeTime`、`EmptyState` 系列

### 4.4 布局与反馈

- `PageContainer`：页面容器（已解耦路由依赖）
- `FilterBar`、`Stepper`、`ConfirmDialog` 系列
- `CommandPalette`：命令面板
- `LazyImage`、`OrgTree`、`UserSelect`
- `Responsive` 系列：响应式断点工具

### 4.5 主题与注册

- `theme/`：提供 `lightTheme`、`darkTheme`、`cyberpunkTheme`
- `registry/`：组件注册表，支持动态组件查找

### 关键发现

- **DataTable 能力非常完善**，但部分页面可能仍直接使用 MUI Table 或业务自研表格，导致体验分裂。
- **表单组件覆盖较全**，但缺少 `FormRadio`、`FormSlider`、`FormAutocomplete` 等常见控件。
- **图表组件未纳入共享包**，Dashboard 中的图表能力依赖外部库（如 Recharts），未统一封装。
- **缺少布局级共享组件**：如 `DetailLayout`、`FormLayout`、`SettingsLayout` 等高级布局抽象。

---

## 5. 设计 Token 与设计系统

### 5.1 Token 架构

`packages/tokens/src/tokens.ts` 分为两层：

- **基础 Token（`designTokens`）**：颜色、间距、圆角、阴影、动效、字体、zIndex、断点等。
- **语义 Token（`semanticTokens`）**：按场景映射，如 `space.page`、`text.heading`、`elevation.card`、`border.input`、`background.hover` 等。

### 5.2 颜色系统

| 色系 | 用途 |
|------|------|
| Primary（蓝） | 主按钮、链接、选中态 |
| Secondary（紫） | 辅助强调 |
| Success / Warning / Error / Info | 状态反馈 |
| Grey | 中性色、文本、边框、背景 |
| 扩展色（Orange/Yellow/Blue/Cyan/Purple/Teal/Pink） | 业务分类、图表、标签 |
| Neon（Cyber 扩展） | AI 面板、实时看板、状态辉光 |

### 5.3 特殊视觉体系

- **Cyber 玻璃态**：`cyber.glass.*` 提供半透明背景、边框、模糊。
- **Neon 辉光阴影**：`neonShadows.*` 提供青/品红/黄/绿/红发光效果。
- **渐变背景**：`cyber.gradients.aurora/sunset/ocean/tech` 用于 AI 大屏。

### 关键发现

- **Token 体系已相当完整**，但语义层与实际组件/页面之间可能存在未完全覆盖的缝隙。
- **Cyber 主题与常规主题并存**，需要确认是否所有页面都支持主题切换，以及 AI 面板是否只在 Cyber 主题下生效。
- **缺少组件级 Token**：如 `button.primary.bg`、`input.borderRadius` 等更细粒度的组件 Token。

---

## 6. 路由与导航结构

### 6.1 路由分层

`apps/web/src/routes/appRoutes.tsx` 中：

- `/performance`：性能测试页（独立布局）
- `/login`、`/forgot-password`：认证路由（GuestRoute）
- `/`、`/dashboard`、`/modules`、`/profile`、`/favorites`、`/comments`、`/attachments`、`/help/*`：仪表盘与公共路由
- `/ehs/accident`、`/doc/documents`、`/v4-demo`、`/desktop/*`：公共业务路由
- `*`：动态路由（DynamicRoutes）
- `/core/*`：微前端核心模块（Module Federation 或静态降级）
- `/template-demo`：模板演示页

### 6.2 导航业务域

`layouts/constants.ts` 定义 10 个一级业务域，29 个二级模块映射关系：

| 一级域 | 二级模块 |
|--------|----------|
| workbench | mobile |
| core | iam, workflow, notification, integration, automation, erp, pdm |
| operation | crm, pm, rd, doc, oa, im, ticket |
| manufacturing | mes, ehs |
| quality | qms, lims |
| supply | scm, wms, srm |
| finance_hr | finance, hrm, asset |
| data_ai | bi, report, ai, gis |
| system | admin, monitor, lowcode, plugin |
| profile | profile_center, profile_favorites |

### 关键发现

- **导航与页面目录并非严格 1:1**：例如 `asset` 模块在导航中，但页面目录 `pages/asset` 仅有 5 页，可能更多页面由动态路由或微前端提供。
- **部分模块跨多个一级域**：如 `doc` 在 operation 域，但 `doc` API 与 `documents` 页面独立。

---

## 7. 主要问题与优化机会

### 7.1 模板体系

1. **模板使用率不透明**：537 个页面中有多少真正使用了 `ListPageTemplate` / `DetailPageTemplate` 等模板？建议通过代码扫描建立「页面 → 模板」映射。
2. **缺少模板使用规范**：部分页面可能直接复制 MUI 代码，导致同一模块内出现不同表格样式、按钮布局、空状态。
3. **扩展模板覆盖不足**：`wizard`、`timeline`、`master-detail`、`gis-map` 等模板使用率低，需要更多示例页面和 Storybook 文档。
4. **TemplateDemoPage 与页面模板体系脱节**：当前演示的是「文本模板变量渲染」，而非 15 种页面模板的交互展示。

### 7.2 组件与布局

1. **缺少高级布局组件**：建议补充 `DetailLayout`、`FormLayout`、`SettingsLayout`、`MasterDetailLayout` 等。
2. **图表未统一封装**：Dashboard 中图表能力应纳入共享组件或设计系统。
3. **表单控件不完整**：缺少 Radio、Slider、Autocomplete、Rating 等。
4. **DataTable 与业务表格并存**：应制定强制使用 `DataTable` 的规则，逐步替换业务自研表格。

### 7.3 设计 Token

1. **组件级 Token 缺失**：建议增加 `components.button.*`、`components.input.*`、`components.card.*` 等。
2. **暗色模式覆盖**：需确认 Cyber 主题与暗色模式的关系，避免两套深色体系冲突。
3. **Token 使用监控**：建议通过 lint 或扫描确保新增页面使用 `semanticTokens` 而非硬编码颜色。

### 7.4 页面与模块

1. **页面命名与目录规范不统一**：部分页面使用 `Page.tsx` 后缀，部分不使用；部分放在 `pages/<module>/` 根目录，部分放在 `pages/<module>/setting/` 或 `pages/<module>/components/`。
2. **重复页面风险**：如 `erp/AnnouncementPage.tsx` 与 `oa/AnnouncementPage.tsx` 可能存在功能重叠。
3. **schema 与页面未对齐**：267 个 schema 与 537 个页面之间的复用关系不清晰。

---

## 8. 设计改进路线图建议

### 第一阶段：建立基线（1-2 周）

1. **页面模板使用扫描**：输出「页面 → 模板 → 组件」映射表，识别未使用模板的页面。
2. **统一入口页**：将 `DashboardPage`、`ModulesOverviewPage`、`HybridHomePage` 统一使用 `DashboardTemplate`。
3. **制定模板选型指南**：明确什么场景必须用哪个模板，减少自由发挥。

### 第二阶段：补齐模板与组件（2-4 周）

1. **完善扩展模板示例**：为 `wizard`、`timeline`、`master-detail`、`report-designer` 提供标准示例页。
2. **新增布局组件**：`DetailLayout`、`FormLayout`、`SettingsLayout`。
3. **统一图表组件**：封装 `ChartCard`、`StatChart`、`TrendChart` 等。
4. **表单控件补齐**：`FormRadio`、`FormSlider`、`FormAutocomplete`。

### 第三阶段：设计系统深化（4-6 周）

1. **组件级 Token**：在 `semanticTokens` 下增加 `components.*` 层级。
2. **暗色/Cyber 主题统一**：明确主题切换策略，统一玻璃态/霓虹效果的使用范围。
3. **Lint 与扫描**：禁止硬编码颜色，强制使用 `semanticTokens`。
4. **Storybook / 模板展示页**：将 15 种模板以可视化方式展示，便于业务方选择。

### 第四阶段：治理与推广（持续）

1. **模板使用率 KPI**：每月统计新增页面使用标准模板的比例。
2. **页面重构清单**：按模块优先级，逐步将高频页面迁移到标准模板。
3. **设计-研发同步机制**：设计变更优先更新 Token 与共享组件，再同步到业务页面。

---

## 9. 可立即落地的设计输出

为便于后续调整，建议优先产出以下设计资产：

1. **页面模板使用地图**：基于代码扫描的 Excel/CSV，列明每个页面使用的模板、组件、主题。
2. **模板示例库**：为 15 种模板制作高保真示例页（可作为 `.design` 项目或 Storybook）。
3. **组件使用规范**：明确 `DataTable`、`PageContainer`、`ActionButton` 等核心组件的使用场景与禁用场景。
4. **设计 Token 扩展方案**：补充组件级 Token 与暗色模式映射。
5. **模块级设计走查**：优先对 MES、WMS、ERP、CRM 等页面最多的模块进行视觉一致性检查。

---

## 10. 附录：关键文件索引

| 用途 | 路径 |
|------|------|
| 页面模板分类 | `apps/web/src/components/templates/classification.ts` |
| 页面模板入口 | `apps/web/src/components/templates/index.ts` |
| 模板演示页 | `apps/web/src/components/templates/TemplateDemoPage.tsx` |
| 列表模板子组件 | `apps/web/src/components/templates/list/*` |
| 仪表盘模板子组件 | `apps/web/src/components/templates/dashboard/*` |
| 路由总览 | `apps/web/src/routes/appRoutes.tsx` |
| 导航业务域 | `apps/web/src/layouts/constants.ts` |
| 导航树逻辑 | `apps/web/src/layouts/navTree.ts` |
| 共享组件入口 | `packages/shared-components/src/index.ts` |
| 设计 Token | `packages/tokens/src/tokens.ts` |
| 页面容器 | `packages/shared-components/src/components/PageContainer.tsx` |
| 数据表格 | `packages/shared-components/src/components/DataTable.tsx` |
| 状态徽标 | `packages/shared-components/src/components/StatusBadge.tsx` |
| 应用入口 | `apps/web/src/App.tsx` |

---

*本报告可作为后续设计系统完善、页面重构、模板扩展的需求输入。如需进一步生成高保真模板示例、设计 Token 扩展文件或具体模块的设计走查，可在此基础上继续推进。*
