# Components 目录结构

## 目录说明

```
src/components/
├── common/          # 通用组件 (跨模块复用)
├── layout/          # 布局组件
├── mui/             # MUI 增强组件
├── responsive/      # 响应式适配组件
├── templates/       # 页面模板组件
├── dashboard/       # 仪表盘相关组件
├── bi/              # BI 图表组件
├── workflow/        # 工作流组件
├── export/          # 导出组件
├── auth/            # 认证/权限组件
├── notification/    # 通知组件
├── icons/           # 图标组件
├── providers/       # React Providers
├── utils/           # 工具组件
├── ai/              # AI 功能组件
├── i18n/            # 国际化组件
├── theme/           # 主题组件
├── mobile/          # 移动端组件
├── business/        # 业务组件
├── archive/         # 未使用/示例组件 (待清理)
└── [module]/        # 业务模块组件 (hrm, crm, finance 等)
```

## 组件目录

### common/ - 通用组件 (27个)

通用业务组件，可跨多个模块复用。

| 组件               | 说明                |
| ------------------ | ------------------- |
| StatusBadge        | 状态徽章            |
| DataTable          | 数据表格 (TanStack) |
| TreeView           | 树形视图            |
| ProgressBar        | 进度条              |
| Stepper            | 步骤条              |
| HelpButton         | 帮助按钮            |
| ConfirmDialog      | 确认对话框          |
| ToastNotification  | 通知提示            |
| BatchOperations    | 批量操作            |
| Pagination         | 分页组件            |
| AlertCard          | 警告卡片            |
| AlertPanel         | 警告面板            |
| AdvancedFilter     | 高级筛选            |
| DateRangePicker    | 日期范围选择器      |
| LoadingSpinner     | 加载动画            |
| Grid               | Grid 组件           |
| PerformanceMonitor | 性能监控            |
| StatusTimeline     | 状态时间线          |
| CommentList        | 评论列表            |
| UserSelect         | 用户选择器          |
| DepartmentSelect   | 部门选择器          |
| FileUpload         | 文件上传            |
| ImageUpload        | 图片上传            |
| AmountDisplay      | 金额显示            |
| DataExport         | 数据导出            |
| FormBuilder        | 表单构建器          |
| QuickSearch        | 快速搜索            |

### layout/ - 布局组件 (7个)

全局布局相关组件。

| 组件           | 说明       |
| -------------- | ---------- |
| TopNav         | 顶部导航   |
| PageHeader     | 页面头部   |
| PageBreadcrumb | 面包屑     |
| ServiceMonitor | 服务监控   |
| GlobalLayout   | 全局布局   |
| MobileNav      | 移动端导航 |
| MobileHeader   | 移动端头部 |
| ModuleTabs     | 模块标签页 |

### mui/ - MUI 增强组件 (4个)

基于 MUI 的增强组件。

| 组件         | 说明     |
| ------------ | -------- |
| EmptyState   | 空状态   |
| LoadingState | 加载状态 |
| FilterBar    | 筛选栏   |
| ActionBar    | 操作栏   |

### responsive/ - 响应式组件 (1个)

移动端适配相关组件。

| 组件             | 说明       |
| ---------------- | ---------- |
| ResponsiveHeader | 响应式头部 |

### templates/ - 页面模板 (5个)

页面模板组件，统一页面结构。

| 组件               | 说明           |
| ------------------ | -------------- |
| ListPageTemplate   | 列表页模板     |
| FormPageTemplate   | 表单页模板     |
| DetailPageTemplate | 详情页模板     |
| DashboardTemplate  | 仪表盘模板     |
| EmptyState         | 模板专用空状态 |

### dashboard/ - 仪表盘组件 (2个)

仪表盘专用组件。

| 组件              | 说明         |
| ----------------- | ------------ |
| DashboardSections | 仪表盘区块   |
| StatusBadge       | 模块状态徽章 |

### bi/ - BI 图表组件 (9个)

商业智能图表相关组件。

| 组件             | 说明      |
| ---------------- | --------- |
| BISkeleton       | BI 骨架屏 |
| ChartAnnotations | 图表标注  |
| ChartCard        | 图表卡片  |
| ChartExport      | 图表导出  |
| ChartLinker      | 图表联动  |
| DrillDownPanel   | 钻取面板  |
| FullscreenChart  | 全屏图表  |
| MetricCard       | 指标卡片  |
| StatsChart       | 统计图表  |

### workflow/ - 工作流组件 (1个)

工作流设计相关组件。

| 组件             | 说明         |
| ---------------- | ------------ |
| WorkflowDesigner | 工作流设计器 |

### export/ - 导出组件 (4个)

数据导出相关组件。

| 组件                | 说明         |
| ------------------- | ------------ |
| EnhancedExportModal | 增强导出弹窗 |
| ExportButton        | 导出按钮     |
| ExportModal         | 导出弹窗     |
| ImportExportModal   | 导入导出弹窗 |

### auth/ - 认证/权限组件 (4个)

认证和权限相关组件。

| 组件                 | 说明         |
| -------------------- | ------------ |
| PermissionGate       | 权限门       |
| ProtectedRoute       | 受保护路由   |
| SessionExpiryWarning | 会话过期警告 |
| LoginFormV2          | 登录表单 V2  |

### notification/ - 通知组件 (4个)

通知和提示相关组件。

| 组件                  | 说明         |
| --------------------- | ------------ |
| NotificationContainer | 通知容器     |
| Toast                 | Toast 提示   |
| Toaster               | Toast 提供者 |
| ToastProvider         | Toast 提供者 |

### icons/ - 图标组件 (5个)

图标封装组件。

| 组件        | 说明       |
| ----------- | ---------- |
| Icon        | 图标组件   |
| IconBox     | 图标盒子   |
| IconWrapper | 图标包装器 |
| MuiIcon     | MUI 图标   |
| StyledIcon  | 样式化图标 |

### providers/ - React Providers (2个)

全局状态和上下文提供者。

| 组件            | 说明           |
| --------------- | -------------- |
| ThemeProvider   | 主题提供者     |
| LoadingProvider | 加载状态提供者 |

### utils/ - 工具组件 (1个)

工具类组件。

| 组件            | 说明         |
| --------------- | ------------ |
| ValidationError | 验证错误显示 |

### ai/ - AI 功能组件 (13个)

AI 智能功能相关组件。

| 组件                | 说明         |
| ------------------- | ------------ |
| AISettingsModal     | AI 设置弹窗  |
| AICodeGenerator     | 代码生成器   |
| AIDocumentGenerator | 文档生成器   |
| AIFormValidator     | 表单验证器   |
| AIToolsPanel        | AI 工具面板  |
| DocumentManager     | 文档管理器   |
| AISummarizer        | AI 摘要      |
| AIAnalyzer          | AI 分析器    |
| AIHelperButton      | AI 助手按钮  |
| AIGenerateModal     | AI 生成弹窗  |
| AIDataCompleter     | 数据补全     |
| AITextOptimizer     | 文本优化     |
| FloatingAIHelper    | 浮动 AI 助手 |

### i18n/ - 国际化组件 (1个)

国际化相关组件。

| 组件             | 说明       |
| ---------------- | ---------- |
| LanguageSelector | 语言选择器 |

### theme/ - 主题组件 (1个)

主题相关组件。

| 组件       | 说明         |
| ---------- | ------------ |
| ModeToggle | 主题模式切换 |

### mobile/ - 移动端组件 (1个)

移动端专用组件。

| 组件             | 说明           |
| ---------------- | -------------- |
| MobileFileUpload | 移动端文件上传 |

### business/ - 业务组件 (3个)

业务相关组件。

| 组件                 | 说明         |
| -------------------- | ------------ |
| ReportBuilder        | 报表构建器   |
| ReportViewer         | 报表查看器   |
| DocumentPreviewModal | 文档预览弹窗 |

### archive/ - 归档组件 (3个)

未使用或示例组件，待清理。

| 组件                 | 状态 |
| -------------------- | ---- |
| WorkflowTableExample | 示例 |
| WorkflowFormExample  | 示例 |
| EnhancedDataTable    | 示例 |

## 命名规范

1. **文件名**: PascalCase (如 `StatusBadge.tsx`)
2. **组件名**: PascalCase (如 `export const StatusBadge`)
3. **类型名**: PascalCase (如 `StatusBadgeProps`)
4. **Hook 名**: camelCase (如 `useDataTable`)

## 导出规范

所有组件应在对应目录的 `index.ts` 中导出：

```typescript
// common/index.ts
export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';
```

根目录 `components/index.ts` 汇总所有组件导出，便于统一引用。

## 组件选型指南（推荐使用）

### 核心原则

- **优先使用 common/ 目录下的组件**，它们是项目标准组件
- **其次使用 MUI 原生组件**，但应通过主题系统统一风格
- **避免使用 ui/ 目录下的组件**，它们是遗留组件，正在逐步迁移
- **模板页面优先使用 templates/ 目录下的页面模板**

### 数据表格

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **DataTable** | `common/DataTable.tsx` | 标准列表页、数据展示、CRUD 操作 | ✅ 推荐 |
| BffDataTable | `bff/BffDataTable.tsx` | BFF GraphQL 数据驱动的表格 | ✅ 推荐 (BFF场景) |
| MobileDataTable | `mobile/MobileDataTable.tsx` | 移动端列表展示 | ✅ 推荐 (移动端) |
| ui/DataTable | `ui/DataTable.tsx` | - | ❌ 遗留，待迁移 |

### 页面容器/布局

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **PageContainer** | `common/PageContainer.tsx` | 标准页面容器 | ✅ 推荐 |
| **ListPageTemplate** | `templates/ListPageTemplate.tsx` | 列表页模板 | ✅ 推荐 |
| **FormPageTemplate** | `templates/FormPageTemplate.tsx` | 表单页模板 | ✅ 推荐 |
| **DetailPageTemplate** | `templates/DetailPageTemplate.tsx` | 详情页模板 | ✅ 推荐 |
| **DashboardTemplate** | `templates/DashboardTemplate.tsx` | 仪表盘模板 | ✅ 推荐 |
| ResponsivePage | `common/ResponsivePage.tsx` | 响应式页面包装 | ✅ 推荐 |

### 表单组件

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **FormBuilder** | `common/FormBuilder.tsx` | 动态表单、配置化表单 | ✅ 推荐 |
| **FormField** | `common/FormField.tsx` | 单个表单字段 | ✅ 推荐 |
| **FormFieldGroup** | `common/FormFieldGroup.tsx` | 表单字段分组 | ✅ 推荐 |
| FormDialog | `common/FormDialog.tsx` | 弹窗表单 | ✅ 推荐 |
| FormDrawer | `common/FormDrawer.tsx` | 抽屉表单 | ✅ 推荐 |
| FormSelect | `common/FormSelect.tsx` | 表单选择器 | ✅ 推荐 |

### 反馈/状态

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **EmptyState** | `common/EmptyState.tsx` | 空状态展示 | ✅ 推荐 |
| **LoadingSpinner** | `common/LoadingSpinner.tsx` | 加载状态 | ✅ 推荐 |
| **SkeletonScreen** | `common/SkeletonScreen.tsx` | 骨架屏 | ✅ 推荐 |
| **ConfirmDialog** | `common/ConfirmDialog.tsx` | 确认对话框 | ✅ 推荐 |
| **ErrorBoundary** | `common/ErrorBoundary.tsx` | 错误边界 | ✅ 推荐 |
| **StatusBadge** | `common/StatusBadge.tsx` | 状态徽章 | ✅ 推荐 |
| AlertCard | `common/AlertCard.tsx` | 警告卡片 | ✅ 推荐 |
| AlertPanel | `common/AlertPanel.tsx` | 警告面板 | ✅ 推荐 |

### 导航/菜单

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **AppSidebar** | `layout/AppSidebar.tsx` | 应用侧边栏 | ✅ 推荐 |
| **AppHeader** | `layout/AppHeader.tsx` | 应用头部 | ✅ 推荐 |
| **GlobalLayout** | `layout/GlobalLayout.tsx` | 全局布局 | ✅ 推荐 |
| **ModuleTabs** | `layout/ModuleTabs.tsx` | 模块标签页 | ✅ 推荐 |
| TabPanel | `common/TabPanel.tsx` | 标签面板 | ✅ 推荐 |
| ExtendedTab | `common/ExtendedTab.tsx` | 扩展标签 | ✅ 推荐 |

### 图表/数据可视化

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **charts/** | `charts/` | 基础图表 (Recharts) | ✅ 推荐 |
| **bi/** | `bi/` | BI 高级图表 | ✅ 推荐 |
| **MetricCard** | `bi/MetricCard.tsx` | 指标卡片 | ✅ 推荐 |
| **ChartCard** | `bi/ChartCard.tsx` | 图表卡片 | ✅ 推荐 |

### 搜索/筛选

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **GlobalSearchBar** | `GlobalSearchBar/` | 全局搜索 | ✅ 推荐 |
| **QuickSearch** | `common/QuickSearch.tsx` | 快速搜索 | ✅ 推荐 |
| **FilterBar** | `common/FilterBar.tsx` | 筛选栏 | ✅ 推荐 |
| **AdvancedFilter** | `common/AdvancedFilter.tsx` | 高级筛选 | ✅ 推荐 |
| **DateRangePicker** | `common/DateRangePicker.tsx` | 日期范围选择 | ✅ 推荐 |

### 移动端组件

| 推荐组件 | 路径 | 使用场景 | 状态 |
| -------- | ---- | -------- | ---- |
| **MobileLayout** | `mobile/MobileLayout.tsx` | 移动端布局 | ✅ 推荐 |
| **MobileHeader** | `mobile/MobileHeader.tsx` | 移动端头部 | ✅ 推荐 |
| **MobileDataTable** | `mobile/MobileDataTable.tsx` | 移动端数据表格 | ✅ 推荐 |
| **MobileForm** | `mobile/MobileForm.tsx` | 移动端表单 | ✅ 推荐 |
| **MobileCard** | `mobile/MobileCard.tsx` | 移动端卡片 | ✅ 推荐 |
| **BottomTabBar** | `mobile/BottomTabBar.tsx` | 底部标签栏 | ✅ 推荐 |
| **PullToRefresh** | `mobile/PullToRefresh.tsx` | 下拉刷新 | ✅ 推荐 |
| **SwipeAction** | `mobile/SwipeAction.tsx` | 滑动操作 | ✅ 推荐 |

### 业务模块组件

各业务模块专用组件放在对应模块目录下（如 `hrm/`, `crm/`, `finance/` 等），仅供该模块内部使用。

### 组件使用优先级

```
1. 项目标准组件 (common/ + templates/)
   ↓
2. 业务模块组件 (hrm/, crm/, finance/ 等)
   ↓
3. MUI 原生组件 (需遵循设计规范)
   ↓
4. 第三方库组件 (需审批)
```

## 组件设计原则

1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 设计时考虑跨模块复用
3. **类型安全**: 使用 TypeScript 提供完整的类型定义
4. **可测试性**: 组件逻辑应易于单元测试
5. **一致性**: 新组件应遵循现有组件的命名和编码风格
