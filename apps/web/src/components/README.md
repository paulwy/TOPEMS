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

## 组件设计原则

1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 设计时考虑跨模块复用
3. **类型安全**: 使用 TypeScript 提供完整的类型定义
4. **可测试性**: 组件逻辑应易于单元测试
