# 系统页面模板设计文档

## 版本记录

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v2.2 | 2026-06-20 | System | 修复 85 个 TypeScript 错误：修复 DashboardTemplate 图表布局比较问题；修复 FormPageTemplate saveDraft 类型安全；删除 ListPageTemplate、FormPageTemplate、AlertCard、ConfirmDialog、DataTable、StatusBadge 重复类型导出；修复 lucide-react 图标 `Icon` 变量名冲突；修复 Grid2 导入问题；修复 Finance DashboardPage 使用自定义区域 props；修复 common 组件的 sx 属性问题；修复 StatCardBase children 属性支持；修复类型转换 `as unknown as` 问题；修复 FinancialVoucher 缺失属性问题；修复 DialogActions 导入问题 |
| v2.1 | 2026-06-20 | System | 修复测试套件中的 12 个失败测试用例；完善 formatFileSize 函数格式输出；修复 usePermission hook 权限判断逻辑；修复 DataTable.tsx 泛型语法问题 |
| v2.0 | 2026-06-20 | System | 增强 FormPageTemplate（表单验证、布局配置、表单联动、草稿保存、进度条、权限配置）；增强 DashboardTemplate（图表集成、数据卡片布局、响应式布局、卡片分组、持久化配置、自定义渲染器）；更新 common/index.ts 标记旧组件为 deprecated；添加 54 个单元测试用例 |
| v1.6 | 2026-06-16 | System | 为 ListPageTemplate 添加面包屑导航和返回按钮支持；为 HrmEmployeePage.tsx 添加面包屑导航 |
| v1.5 | 2026-06-16 | System | 重构 EmployeeManagementPage.tsx 使用 ListPageTemplate 组件；修复 Chip color 类型错误 |
| v1.4 | 2026-06-16 | System | 将统一模板规范推广到 CRM、PM 模块；修复 CRMBillingPage.tsx 中的 TypeScript 错误 |
| v1.3 | 2026-06-16 | System | 清理 98 个 *Refactored.tsx 重复文件；修复 619 → 1 个 TypeScript 错误；创建 shadcn.tsx 补齐缺失组件 |
| v1.2 | 2026-06-16 | System | 扩展 HRM 模块模板统一至所有页面（部门、招聘、培训、绩效、报表、员工管理） |
| v1.1 | 2026-06-16 | System | HRM 模块页面模板统一，包括员工、合同、休假、考勤、薪酬页面 |
| v1.0 | 2026-06-16 | System | 初始版本，存档现有模板设计 |

---

## 一、设计原则

### 1.1 一致性原则

- **视觉一致性**：所有页面使用统一的颜色、字体、间距和圆角
- **交互一致性**：相似功能使用相同的交互模式（如列表操作、表单验证）
- **布局一致性**：统一的页面结构（Header → Content → Footer）

### 1.2 可扩展性原则

- 模板组件支持自定义扩展
- 预留插槽（slots）供业务组件插入
- 类型定义完整，支持 TypeScript 类型推导

### 1.3 可维护性原则

- 单一职责：每个模板专注于一种页面类型
- 代码复用：公共逻辑提取到 hooks 或工具函数
- 文档完备：提供详细的类型定义和使用示例

---

## 二、模板组件体系

### 2.1 模板组件架构

```
┌─────────────────────────────────────────────────────────────┐
│                    页面模板组件体系                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                           │
│  │  PageHeader  │ ← 页面头部（所有页面共用）                   │
│  └──────┬───────┘                                           │
│         │                                                   │
│    ┌────┴────┬─────────────┬─────────────┬─────────────┐   │
│    ▼         ▼             ▼             ▼             ▼   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ListPageTemplate  │  DetailPageTemplate               │ │
│  │  列表页模板        │  详情页模板                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  FormPageTemplate  │  DashboardTemplate               │ │
│  │  表单页模板        │  仪表盘模板                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────┐                                           │
│  │  EmptyState  │ ← 空状态组件（所有模板共用）                 │
│  └──────────────┘                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 模板组件清单

| 组件名称 | 功能定位 | 使用场景 | 状态 |
|----------|----------|----------|------|
| `PageHeader` | 页面头部 | 所有页面 | ✅ 稳定 |
| `ListPageTemplate` | 列表页 | 数据列表展示 | ✅ 稳定 |
| `DetailPageTemplate` | 详情页 | 数据详情展示 | ✅ 稳定 |
| `FormPageTemplate` | 表单页 | 数据创建/编辑 | ✅ 稳定 |
| `DashboardTemplate` | 仪表盘 | 数据概览展示 | ✅ 稳定 |
| `EmptyState` | 空状态 | 数据为空时展示 | ✅ 稳定 |

---

## 三、各模板详细设计

### 3.1 PageHeader（页面头部）

**组件位置**：`/components/templates/PageHeader.tsx`

**设计标准**：

| 区域 | 功能 | 设计规范 |
|------|------|----------|
| 面包屑 | 导航路径 | 使用 `Breadcrumbs` 组件，分隔符为 `ChevronRight` |
| 返回按钮 | 返回上一页 | 位于标题左侧，使用 `ArrowLeft` 图标 |
| 标题 | 页面标题 | 使用 `h4` 字号（移动端 `h5`），fontWeight: 600 |
| 副标题 | 页面描述 | 使用 `body2`，color: text.secondary |
| 操作按钮 | 页面级操作 | 位于右侧，支持多个操作按钮，移动端折叠多余按钮 |

**接口定义**：

```typescript
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageAction[];
  backButton?: {
    href?: string;
    onClick?: () => void;
  };
  onRefresh?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}
```

**使用示例**：

```tsx
<PageHeader
  title="员工管理"
  subtitle="管理企业员工信息"
  breadcrumbs={[
    { label: "人力资源", href: "/hrm" },
    { label: "员工列表" },
  ]}
  actions={[
    {
      label: "新增员工",
      icon: <Plus />,
      variant: "contained",
      onClick: handleAdd,
    },
  ]}
  backButton={{ onClick: () => navigate(-1) }}
/>
```

---

### 3.2 ListPageTemplate（列表页模板）

**组件位置**：`/components/templates/ListPageTemplate.tsx`

**设计标准**：

| 区域 | 功能 | 设计规范 |
|------|------|----------|
| 搜索栏 | 全局搜索 | 支持 `searchable` 配置，placeholder 为"搜索..." |
| 筛选栏 | 条件筛选 | 支持 `filters` 配置，包含多种筛选类型 |
| 表格 | 数据展示 | 使用 `TableContainer` + `Table`，支持排序 |
| 行操作 | 单行操作 | 使用 `RowAction` 配置，支持条件显示 |
| 分页 | 数据分页 | 使用 `TablePagination`，默认每页 10 条 |
| 空状态 | 无数据展示 | 使用 `EmptyState` 组件 |

**接口定义**：

```typescript
export interface ListPageTemplateProps<T = any> {
  // 页面信息
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;

  // 数据
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;

  // 行标识
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;

  // 选择
  selectable?: boolean;
  selection?: {
    selected?: (string | number)[];
    onChange?: (ids: (string | number)[]) => void;
  };

  // 排序
  sortable?: boolean;
  onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;

  // 分页
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };

  // 搜索
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;

  // 筛选
  filters?: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;

  // 操作
  actions?: Array<{ label: string; icon?: React.ReactNode; onClick?: () => void }>;
  rowActions?: RowAction<T>[];
  batchActions?: Array<{ label: string; icon?: React.ReactNode; onClick?: () => void }>;

  // 空状态
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  // 自定义
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  // 行展开
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);

  // 列配置
  columnConfigurable?: boolean;
}
```

**使用示例**：

```tsx
<ListPageTemplate
  columns={columns}
  data={data.items}
  loading={loading}
  pagination={{
    page: data.page - 1,
    pageSize: data.page_size,
    total: data.total,
    onPageChange: (page) => fetchData({ page: page + 1 }),
    onPageSizeChange: (pageSize) => fetchData({ page_size: pageSize }),
  }}
  rowActions={rowActions}
  onRowClick={handleView}
  emptyMessage="暂无数据"
/>
```

---

### 3.3 DetailPageTemplate（详情页模板）

**组件位置**：`/components/templates/DetailPageTemplate.tsx`

**设计标准**：

| 区域 | 功能 | 设计规范 |
|------|------|----------|
| 信息卡片 | 主体信息 | 渐变背景（primary → secondary），白色文字 |
| 标签页 | 内容分区 | 使用 `Tabs` 组件，支持 badge 显示 |
| 区块 | 信息分组 | 使用 `Paper` 组件，带标题和内容区 |
| 侧边栏 | 辅助信息 | 移动端折叠，桌面端固定定位 |
| 操作按钮 | 数据操作 | 编辑、删除、分享等默认操作 |

**接口定义**：

```typescript
export interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  loading?: boolean;
  error?: string;

  backHref?: string;
  onBack?: () => void;

  actions?: PageAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;

  tabs?: TabConfig[];
  defaultTab?: string;

  sections?: SectionConfig[];

  sidebar?: React.ReactNode;
  sidebarWidth?: number;

  infoCard?: {
    avatar?: React.ReactNode;
    title?: string;
    subtitle?: string;
    tags?: string[];
    stats?: Array<{ label: string; value: string | number }>;
  };

  headerContent?: React.ReactNode;
  children?: React.ReactNode;
}
```

**使用示例**：

```tsx
<DetailPageTemplate
  title="员工详情"
  subtitle={employee.name}
  breadcrumbs={breadcrumbs}
  onBack={() => navigate(-1)}
  onEdit={() => setShowEditModal(true)}
  onDelete={() => handleDelete(employee.id)}
  infoCard={{
    avatar: <Avatar>{employee.name.charAt(0)}</Avatar>,
    title: employee.name,
    subtitle: employee.position,
    tags: [getStatusBadge(employee.status)],
    stats: [
      { label: "入职日期", value: employee.hire_date },
      { label: "部门", value: departmentName },
    ],
  }}
  sections={sections}
/>
```

---

### 3.4 FormPageTemplate（表单页模板）

**组件位置**：`/components/templates/FormPageTemplate.tsx`

**设计标准**：

| 区域 | 功能 | 设计规范 |
|------|------|----------|
| 表单区块 | 字段分组 | 使用 `Paper` 组件，支持折叠 |
| 表单字段 | 数据输入 | 支持多种字段类型（text/select/date/file等） |
| 验证提示 | 错误提示 | 使用 `Alert` 组件，支持字段级和表单级提示 |
| 操作按钮 | 表单提交 | 保存、取消、重置按钮 |

**接口定义**：

```typescript
export interface FormPageTemplateProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  sections: FormSection[];
  schema?: z.ZodType;
  defaultValues?: Record<string, any>;

  loading?: boolean;
  submitting?: boolean;
  error?: string;
  success?: string;

  onSubmit: (data: any) => Promise<void> | void;
  onCancel?: () => void;
  onReset?: () => void;
  submitText?: string;
  cancelText?: string;
}
```

**使用示例**：

```tsx
<FormPageTemplate
  title="新增员工"
  subtitle="填写员工基本信息"
  breadcrumbs={breadcrumbs}
  sections={sections}
  defaultValues={formData}
  onSubmit={handleSubmit}
  onCancel={() => setModalVisible(false)}
/>
```

---

### 3.5 DashboardTemplate（仪表盘模板）

**组件位置**：`/components/templates/DashboardTemplate.tsx`

**设计标准**：

| 区域 | 功能 | 设计规范 |
|------|------|----------|
| 统计卡片 | 数据概览 | 使用 `StatCard` 组件，带图标和数值 |
| 图表卡片 | 数据可视化 | 使用 `ChartCard` 组件，支持多种图表类型 |
| 快捷操作 | 快速入口 | 使用 `QuickAction` 配置 |
| 最近记录 | 最新动态 | 使用 `RecentItem` 配置 |

---

### 3.6 EmptyState（空状态组件）

**组件位置**：`/components/templates/EmptyState.tsx`

**设计标准**：

| 类型 | 场景 | 设计规范 |
|------|------|----------|
| NoDataEmptyState | 无数据 | 显示空文件夹图标和"暂无数据"提示 |
| SearchEmptyState | 搜索无结果 | 显示搜索图标和"未找到相关结果"提示 |
| FilterEmptyState | 筛选无结果 | 显示筛选图标和"当前筛选条件下无数据"提示 |
| FolderEmptyState | 文件夹为空 | 显示文件夹图标和"文件夹为空"提示 |
| ErrorEmptyState | 加载错误 | 显示错误图标和错误信息，提供重试按钮 |

---

## 四、通用设计标准

### 4.1 颜色规范

| 用途 | 颜色 | 值 |
|------|------|-----|
| 主色调 | primary | `#3b82f6` |
| 成功色 | success | `#10b981` |
| 警告色 | warning | `#f59e0b` |
| 错误色 | error | `#ef4444` |
| 信息色 | info | `#06b6d4` |
| 背景色 | background | `#f5f5f5` |
| 卡片色 | surface | `#ffffff` |

### 4.2 间距规范

| 层级 | 间距 | 值 |
|------|------|-----|
| 页面内边距 | page | `24px` (md) / `16px` (xs) |
| 卡片内边距 | card | `24px` |
| 元素间距 | element | `16px` |
| 小间距 | small | `8px` |

### 4.3 圆角规范

| 组件 | 圆角 | 值 |
|------|------|-----|
| 卡片/按钮 | 默认 | `8px` |
| 输入框 | 默认 | `4px` |
| 圆形组件 | 圆形 | `50%` |

### 4.4 字体规范

| 层级 | 字号 | 字重 |
|------|------|------|
| 页面标题 | 24px | 600 |
| 卡片标题 | 16px | 600 |
| 正文 | 14px | 400 |
| 辅助文字 | 12px | 400 |

---

## 五、模板使用规范

### 5.1 必须使用模板的场景

| 页面类型 | 必须使用 | 说明 |
|----------|----------|------|
| 数据列表页 | ✅ | 使用 `ListPageTemplate` |
| 数据详情页 | ✅ | 使用 `DetailPageTemplate` |
| 数据表单页 | ✅ | 使用 `FormPageTemplate` |
| 仪表盘页 | ✅ | 使用 `DashboardTemplate` |
| 页面头部 | ✅ | 使用 `PageHeader` |

### 5.2 禁止直接使用的组件

| 组件 | 禁止场景 | 替代方案 |
|------|----------|----------|
| `<Table>` | 数据列表 | 使用 `ListPageTemplate` |
| `<TextField>` 搜索 | 列表搜索 | 使用 `ListPageTemplate` 的 `searchable` |
| `<Paper>` + `<Card>` | 详情展示 | 使用 `DetailPageTemplate` |
| `<form>` | 数据表单 | 使用 `FormPageTemplate` |

### 5.3 代码组织规范

```
src/
├── components/
│   ├── templates/          # 模板组件
│   │   ├── PageHeader.tsx
│   │   ├── ListPageTemplate.tsx
│   │   ├── DetailPageTemplate.tsx
│   │   ├── FormPageTemplate.tsx
│   │   ├── DashboardTemplate.tsx
│   │   ├── EmptyState.tsx
│   │   ├── index.ts        # 统一导出
│   │   └── docs/           # 文档
│   │       └── PageTemplateDesign.md
│   └── mui/                # MUI 基础组件封装
│
└── pages/
    ├── HrmEmployeePage.tsx    # 使用 ListPageTemplate
    ├── HrmContractPage.tsx    # 使用 ListPageTemplate
    └── ...
```

---

## 六、迭代计划

### 6.1 当前已完成（v1.1）

- ✅ 合同管理页面重构为统一模板
- ✅ 路由权限模块统一
- ✅ 通知系统统一
- ✅ 员工列表页添加 `PageHeader` 组件
- ✅ 员工列表页添加面包屑导航
- ✅ 合同管理页添加面包屑导航
- ✅ 休假管理页面重构并添加面包屑
- ✅ 考勤管理页面重构并添加面包屑
- ✅ 薪酬管理页面重构并添加面包屑

### 6.2 待实施（v1.2）

| 序号 | 任务 | 优先级 | 预计完成时间 |
|------|------|--------|-------------|
| 1 | 统一所有 HRM 页面的模板使用 | 高 | 2026-Q3 |
| 2 | 添加 AI 辅助功能到合同管理页面 | 中 | 2026-Q3 |
| 3 | 招聘管理页面模板统一 | 中 | 2026-Q3 |
| 4 | 培训管理页面模板统一 | 中 | 2026-Q3 |

### 6.3 长期规划（v2.0）

| 序号 | 任务 | 说明 |
|------|------|------|
| 1 | 通用 HRM 列表模板 | 抽象 HRM 模块的通用列表逻辑 |
| 2 | 主题化支持 | 支持多主题切换 |
| 3 | 响应式优化 | 完善移动端适配 |
| 4 | 性能优化 | 虚拟滚动、懒加载 |

---

## 七、文档维护

### 7.1 文档更新规则

- 模板组件修改后必须同步更新文档
- 新增模板组件必须添加对应的文档章节
- 设计标准变更必须更新版本记录

### 7.2 代码审查规则

- 新增页面必须使用模板组件
- 禁止手写表格、表单等重复代码
- 类型定义必须完整

---

## 附录：模板组件导出清单

```typescript
// /components/templates/index.ts

export { PageHeader } from "./PageHeader";
export type { BreadcrumbItem, PageAction, PageHeaderProps } from "./PageHeader";

export { ListPageTemplate } from "./ListPageTemplate";
export type {
  ColumnDef,
  FilterConfig,
  FilterOption,
  RowAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
} from "./ListPageTemplate";

export { DetailPageTemplate } from "./DetailPageTemplate";
export type {
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
} from "./DetailPageTemplate";

export { FormPageTemplate } from "./FormPageTemplate";
export type {
  FormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from "./FormPageTemplate";

export { DashboardTemplate } from "./DashboardTemplate";
export type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from "./DashboardTemplate";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps, EmptyStateAction, EmptyStateType } from "./EmptyState";
export { NoDataEmptyState, SearchEmptyState, FilterEmptyState, FolderEmptyState, ErrorEmptyState } from "./EmptyState";
```