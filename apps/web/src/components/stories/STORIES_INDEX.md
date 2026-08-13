# TOPEMS Frontend Storybook — Components Index

> **启动命令**: `cd apps/web && pnpm storybook` → http://localhost:6006
> **配置位置**: `apps/web/.storybook/main.ts` + `apps/web/.storybook/preview.tsx`
> **全局 Provider**: QueryClientProvider + MUI ThemeProvider + Dayjs LocalizationProvider

---

## 📊 覆盖统计

| 分类 | Story 文件数 | Story 条目数 |
|------|-------------|-------------|
| Charts | 5 | 20 |
| Common | 38 | ~260 |
| Templates | 3 | 12 |
| Mobile | 5 | 20 |
| Design Tokens | 1 | 5 |
| **总计** | **51** | **~317** |

---

## 📁 Tier 1 — 核心模板组件

| 组件 | 已有 | 本次新增 | Stories | 说明 |
|------|------|---------|---------|------|
| **CrudPage** | ❌ | ✅ | 4 | Schema 驱动 CRUD：Default / ReadOnly / LimitedActions / WithBreadcrumbs |
| **FormBuilder** | ❌ | ✅ | 6 | Schema 驱动表单：CreateMode / EditMode / ViewMode / SingleColumn / AsyncAutocomplete / FormSections |
| ListPageTemplate | ✅ | — | 4 | Default / WithRowNumbers / EmptyState / LoadingState |
| DashboardTemplate | ✅ | — | 4 | Default / Loading / StatsOnly / StatsWithProgress |

### CrudPage 关键设计
- 使用内存 `mockEmployees` 作为后端，`employeeApi` 实现 `CrudApiAdapter`
- 构建最小 `EntitySchema<Employee>`（7 个字段）
- 所有异步操作加 300ms 延迟模拟真实 API

### FormBuilder 关键设计
- 完整字段覆盖：text / email / password / number / select / autocomplete / date / checkbox / textarea
- 内置正则校验（email / minLength / maxLength）
- 分组 + 单列/双列 + 异步选项加载三种高级场景

---

## 📁 Tier 2 — 高频独立组件（本次新增）

| 组件 | 文件 | Stories | 说明 |
|------|------|---------|------|
| **StatCard** | `components/common/StatCard.stories.tsx` | 5 | MetricCard（带 Sparkline + 趋势 + 目标进度）/ ChartCard / StatCardBase |
| **AlertCard** | `components/common/AlertCard.stories.tsx` | 7 | success/warning/error/info + 可展开 + inline 模式 + 预设组件 |
| **SkeletonScreen** | `components/common/SkeletonScreen.stories.tsx` | 4 | dashboard / list / form / detail 四种骨架屏布局 |

---

## 📁 已有组件（之前就有 stories）

### Charts（5 个）
AreaChart, BarChart, LineChart, PieChart, RadarChart — 各 4 stories

### Common（33 个）
ActionButton, Avatar, BackButton, CommandPalette, CommentList, ConfirmDialog, DataExport, DataTable, DateRangePicker, DepartmentSelect, DescriptionList, DesignTokens, Dialog, EmptyState, FileUpload, FilterBar, FormField, FormFieldGroup, FormSelect, ImageUpload, LoadingSpinner, NumberFields, PageContainer, Pagination, ProgressBar, QuickSearch, RelativeTime, StatusBadge, Stepper, TabPanel, ThemePresetSwitcher, Timeline, TreeView, UserSelect

### Mobile（5 个）
MobileButton, MobileCard, MobileSkeleton, PullToRefresh, SwipeAction

---

## 🔧 维护记录

### 本次修复的已有 bugs（5 处）
1. **ConfirmDialog.stories.tsx** — `AlertDialog` / `ErrorDialog` import-export 命名冲突 → 改为 `AlertDialogStory` / `ErrorDialogStory`（Story 内部用 `name:` 保持显示名）
2. **DesignTokens.stories.tsx** — `Typography` import-export 命名冲突 → 改为 `TypographyDemo`
3. **DashboardTemplate.stories.tsx** — `value: 1,284,` 和 `value: 5,680,` 逗号在 JS 中会被当作逗号运算符 → 改为 `1284` / `5680`
4. **ActionButton.stories.tsx** — `variant = 'text'`（等号） → 改为 `variant: 'text'`（冒号）

### 本次创建的 Storybook 配置
- `.storybook/main.ts` — 零配置 Storybook 10 必需（之前缺失，导致无法启动）
- `.storybook/preview.tsx` — 全局 decorator（之前缺失）

### Storybook 版本
`storybook@^10.4.6` + `@storybook/react-vite`（Vite builder）

---

## 🎯 后续可补

| 优先级 | 组件 | 原因 |
|--------|------|------|
| P2 | `DetailPageTemplate` (11.5KB) | 详情页模板，依赖 react-query + FormBuilder |
| P2 | `FormPageTemplate` (44KB) | 表单页模板，中等复杂度 |
| P2 | `TreePageTemplate` (24KB) | 树形模板，需 TreeBuilder |
| P2 | `KanbanPageTemplate` (22KB) | 看板模板，自定义 DnD |
| P3 | `CardListTemplate` (28KB) | 卡片列表模板 |
| P3 | `StatsPageTemplate` (24KB) | 统计页模板 |
| P3 | `SettingsPageTemplate` (19KB) | 设置页模板 |
| P3 | `TimelinePageTemplate` (20KB) | 时间线模板 |
| P3 | `MasterDetailPageTemplate` (31KB) | 主从模板 |
| P3 | `MarkdownEditorTemplate` (32KB) | Markdown 编辑器模板 |
| P3 | `ReportDesignerTemplate` | 报表设计器 |
| P3 | `TemplateEditor` / `TemplateSelector` / `TemplateDemoPage` | 模板开发工具链 |
