# TOPEMS Frontend Storybook — Components Index

> **启动命令**: `cd apps/web && pnpm storybook` → http://localhost:6006
> **构建命令**: `cd apps/web && pnpm build-storybook`（产物 `apps/web/storybook-static`，已 gitignore）
> **配置位置**: `apps/web/.storybook/main.ts`（最小配置：framework=react-vite + addon-docs）
> **全局 Provider**: 当前最小配置未定义全局 Provider；若组件依赖 QueryClient/MUI Theme 等，需新建 `.storybook/preview.tsx` 补充 decorator

---

## 📊 覆盖统计（实测，构建产物 storybook-static/index.json）

| 分类 | Story 文件数 | Story 条目数 |
|------|-------------|-------------|
| Charts | 7 | 18 |
| Common | 53 | 162 |
| Templates | 4 | 9 |
| Mobile | 10 | 26 |
| Design Tokens | 1 | 3 |
| **总计** | **75** | **218** |

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
- `.storybook/main.ts` — Storybook 10 最小配置（framework=react-vite + addon-docs）；此前缺失导致 storybook 无法启动
- `.storybook/preview.tsx` — **未创建**（最小配置，无全局 decorator）；组件若需全局 Provider 请补充此文件

### Storybook 版本
`storybook@10.5.4` + `@storybook/react-vite`（Vite builder）+ `@storybook/addon-docs@10.5.4`（须与主包同版本）
- 组件文档页（autodocs）：75 个，随构建自动生成
- CI：`.github/workflows/storybook-docs.yml` 已配置 GitHub Pages 自动发布

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
