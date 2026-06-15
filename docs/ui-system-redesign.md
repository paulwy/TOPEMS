# TOPEMS UI 系统重构实施方案

## 一、当前状态分析

### 1.1 UI 技术栈现状

| 技术 | 状态 | 文件数 |
|------|------|--------|
| **MUI (Material-UI)** | ✅ 主要框架 | 全局使用 |
| **shadcn/ui** | ⚠️ 待移除 | 33个组件 |
| **Tailwind CSS** | ⚠️ 混合使用 | 30+页面 |
| **Radix UI** | ⚠️ shadcn依赖 | 15个组件 |

### 1.2 页面统计

| 模块 | 页面数 | Tailwind使用 |
|------|--------|-------------|
| HRM (人力) | 15 | 部分 |
| CRM (客户) | 8 | 部分 |
| PM (项目) | 10 | 部分 |
| BI (数据) | 8 | 部分 |
| Finance (财务) | 12 | 部分 |
| Flow (工作流) | 8 | 部分 |
| RS (研发) | 13 | 部分 |
| LIMS (实验室) | 4 | 部分 |
| QMS (质量) | 3 | 部分 |
| EHS (安全) | 3 | 部分 |
| 其他 | 50+ | 部分 |
| **总计** | **~140** | **30+** |

### 1.3 shadcn/ui 组件清单

```
src/components/ui/
├── alert-dialog.tsx    → MUI Dialog
├── alert.tsx           → MUI Alert
├── avatar.tsx          → MUI Avatar
├── badge.tsx           → MUI Chip
├── button.tsx          → MUI Button
├── calendar.tsx        → MUI DatePicker
├── card.tsx            → MUI Card
├── checkbox.tsx        → MUI Checkbox
├── date-picker.tsx     → MUI DatePicker
├── dialog.tsx          → MUI Dialog
├── dropdown-menu.tsx   → MUI Menu
├── form.tsx            → React Hook Form + MUI
├── input.tsx           → MUI TextField
├── label.tsx           → MUI FormLabel
├── pagination.tsx      → MUI Pagination
├── popover.tsx         → MUI Popover
├── progress.tsx        → MUI LinearProgress
├── scroll-area.tsx     → MUI Box + overflow
├── select.tsx          → MUI Select
├── separator.tsx       → MUI Divider
├── sheet.tsx           → MUI Drawer
├── skeleton.tsx        → MUI Skeleton
├── slider.tsx          → MUI Slider
├── switch.tsx          → MUI Switch
├── table.tsx           → MUI Table
├── tabs.tsx            → MUI Tabs
├── textarea.tsx        → MUI TextField multiline
├── toast.tsx           → MUI Snackbar
├── toaster.tsx         → ToastProvider
└── tooltip.tsx         → MUI Tooltip
```

---

## 二、迁移策略

### 2.1 总体原则

1. **渐进式迁移**：按模块逐步重构，不影响业务运行
2. **组件优先**：先建立MUI基础组件库，再迁移页面
3. **样式统一**：建立设计Token系统，确保视觉一致性
4. **保留兼容**：迁移期间保持shadcn组件可用

### 2.2 迁移阶段

```
阶段1: 基础设施 (Week 1-2)
├── 建立MUI设计Token系统
├── 创建基础组件库
├── 建立页面模板系统
└── 编写迁移指南

阶段2: 核心模块迁移 (Week 3-6)
├── HRM 模块 (15页面)
├── CRM 模块 (8页面)
├── PM 模块 (10页面)
└── Finance 模块 (12页面)

阶段3: 扩展模块迁移 (Week 7-10)
├── BI 模块 (8页面)
├── Flow 模块 (8页面)
├── RS/LIMS/QMS/EHS (23页面)
└── 其他模块 (50+页面)

阶段4: 清理与优化 (Week 11-12)
├── 移除shadcn/ui依赖
├── 移除Tailwind CSS
├── 代码审查与优化
└── 文档完善
```

---

## 三、MUI 设计系统

### 3.1 设计Token

```typescript
// src/theme/tokens.ts
export const designTokens = {
  // 颜色系统
  colors: {
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b5cf6',
      light: '#a78bfa',
      dark: '#7c3aed',
    },
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  // 间距系统
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // 圆角
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // 阴影
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // 字体
  typography: {
    fontFamily: '"Inter", "Noto Sans SC", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  },
};
```

### 3.2 页面模板系统

#### 3.2.1 列表页模板 (ListPageTemplate)

```typescript
// 适用于：员工列表、客户列表、项目列表等
interface ListPageTemplateProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  filters?: FilterConfig[];
  columns: ColumnDef[];
  data: any[];
  pagination?: PaginationConfig;
  onRowClick?: (row: any) => void;
  onRefresh?: () => void;
}

// 布局结构
┌─────────────────────────────────────────────────────┐
│ 面包屑导航                                           │
├─────────────────────────────────────────────────────┤
│ 页面标题                              操作按钮区     │
├─────────────────────────────────────────────────────┤
│ 筛选条件区 (可折叠)                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│                    数据表格                          │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 分页器                                               │
└─────────────────────────────────────────────────────┘
```

#### 3.2.2 详情页模板 (DetailPageTemplate)

```typescript
// 适用于：员工详情、客户详情、项目详情等
interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerActions?: React.ReactNode;
  tabs?: TabConfig[];
  sections: SectionConfig[];
  sidebar?: React.ReactNode;
}

// 布局结构
┌─────────────────────────────────────────────────────┐
│ 面包屑导航                                           │
├─────────────────────────────────────────────────────┤
│ 返回按钮  页面标题 / 副标题              操作按钮    │
├─────────────────────────────────────────────────────┤
│ Tab1 │ Tab2 │ Tab3 │ Tab4 │                        │
├─────────────────────────────────────────────────────┤
│ 主内容区                              │ 侧边栏      │
│                                      │             │
│                                      │             │
└─────────────────────────────────────────────────────┘
```

#### 3.2.3 表单页模板 (FormPageTemplate)

```typescript
// 适用于：新建员工、编辑客户、创建项目等
interface FormPageTemplateProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  sections: FormSection[];
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
}

// 布局结构
┌─────────────────────────────────────────────────────┐
│ 面包屑导航                                           │
├─────────────────────────────────────────────────────┤
│ 返回按钮  页面标题                                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  分组标题                                            │
│  ┌─────────────────────────────────────────────────┐│
│  │ 字段1    字段2    字段3                         ││
│  │ 字段4    字段5    字段6                         ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  分组标题                                            │
│  ┌─────────────────────────────────────────────────┐│
│  │ ...                                             ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
├─────────────────────────────────────────────────────┤
│                              取消  提交              │
└─────────────────────────────────────────────────────┘
```

#### 3.2.4 仪表盘模板 (DashboardTemplate)

```typescript
// 适用于：首页仪表盘、数据看板等
interface DashboardTemplateProps {
  title: string;
  stats?: StatCard[];
  charts?: ChartConfig[];
  recentItems?: RecentItem[];
  quickActions?: QuickAction[];
}

// 布局结构
┌─────────────────────────────────────────────────────┐
│ 页面标题                                             │
├─────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │统计1│ │统计2│ │统计3│ │统计4│                    │
│ └─────┘ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────────────┤
│ ┌───────────────────┐ ┌───────────────────┐        │
│ │                   │ │                   │        │
│ │     图表1         │ │     图表2         │        │
│ │                   │ │                   │        │
│ └───────────────────┘ └───────────────────┘        │
├─────────────────────────────────────────────────────┤
│ 最近事项                    快捷操作                 │
│ ┌─────────────────────┐ ┌─────────────────────┐    │
│ │                     │ │                     │    │
│ └─────────────────────┘ └─────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 四、页面重构计划

### 4.1 模块优先级排序

| 优先级 | 模块 | 页面数 | 理由 |
|--------|------|--------|------|
| P0 | HRM | 15 | 核心业务，使用频率高 |
| P0 | CRM | 8 | 核心业务，客户管理 |
| P0 | PM | 10 | 核心业务，项目管理 |
| P1 | Finance | 12 | 核心业务，财务管理 |
| P1 | Flow | 8 | 核心功能，工作流 |
| P2 | BI | 8 | 数据分析模块 |
| P2 | RS | 13 | 研发管理 |
| P3 | LIMS | 4 | 实验室管理 |
| P3 | QMS | 3 | 质量管理 |
| P3 | EHS | 3 | 安全管理 |
| P3 | 其他 | 50+ | 辅助功能 |

### 4.2 HRM 模块重构计划

| 页面 | 类型 | 模板 | 优先级 |
|------|------|------|--------|
| HrmEmployeePage | 列表 | ListPageTemplate | P0 |
| HrmEmployeeDetailPage | 详情 | DetailPageTemplate | P0 |
| HrmDepartmentPage | 列表 | ListPageTemplate | P0 |
| HrmOrganizationPage | 详情 | DetailPageTemplate | P1 |
| HrmAttendancePage | 列表 | ListPageTemplate | P1 |
| HrmPayrollPage | 列表 | ListPageTemplate | P1 |
| HrmContractPage | 列表 | ListPageTemplate | P1 |
| HrmPerformancePage | 列表 | ListPageTemplate | P2 |
| HrmRecruitmentPage | 列表 | ListPageTemplate | P2 |
| HrmTrainingPage | 列表 | ListPageTemplate | P2 |
| HrmLeavePage | 列表 | ListPageTemplate | P2 |
| HrmPositionPage | 列表 | ListPageTemplate | P2 |
| HrmCompanyPage | 列表 | ListPageTemplate | P2 |
| HrmReportsPage | 报表 | DashboardTemplate | P2 |
| CreateEmployeeForm | 表单 | FormPageTemplate | P0 |
| EditEmployeeForm | 表单 | FormPageTemplate | P0 |

### 4.3 CRM 模块重构计划

| 页面 | 类型 | 模板 | 优先级 |
|------|------|------|--------|
| CustomerManagementPage | 列表 | ListPageTemplate | P0 |
| CustomerDetailPage | 详情 | DetailPageTemplate | P0 |
| ContactManagementPage | 列表 | ListPageTemplate | P1 |
| OpportunityManagementPage | 列表 | ListPageTemplate | P1 |
| InteractionManagementPage | 列表 | ListPageTemplate | P1 |
| CRMDashboardPage | 仪表盘 | DashboardTemplate | P1 |
| CRMCustomerScoringPage | 详情 | DetailPageTemplate | P2 |
| CRMSalesForecastPage | 报表 | DashboardTemplate | P2 |

### 4.4 PM 模块重构计划

| 页面 | 类型 | 模板 | 优先级 |
|------|------|------|--------|
| PmProjectListPage | 列表 | ListPageTemplate | P0 |
| PmProjectDetailPage | 详情 | DetailPageTemplate | P0 |
| PmProjectCreatePage | 表单 | FormPageTemplate | P0 |
| PmDashboardPage | 仪表盘 | DashboardTemplate | P1 |
| PmContractListPage | 列表 | ListPageTemplate | P1 |
| PmContractDetailPage | 详情 | DetailPageTemplate | P1 |
| PmContractCreatePage | 表单 | FormPageTemplate | P1 |
| PmReportPage | 报表 | DashboardTemplate | P2 |
| PmTemplatePage | 列表 | ListPageTemplate | P2 |

---

## 五、组件迁移映射

### 5.1 shadcn → MUI 映射表

| shadcn 组件 | MUI 组件 | 说明 |
|-------------|----------|------|
| `<Button>` | `<Button>` | variant映射: default→contained, outline→outlined, ghost→text |
| `<Input>` | `<TextField>` | 需要包装为FormControl |
| `<Select>` | `<Select>` + `<MenuItem>` | 需要FormControl + InputLabel |
| `<Checkbox>` | `<Checkbox>` + `<FormControlLabel>` | 需要标签包装 |
| `<Switch>` | `<Switch>` + `<FormControlLabel>` | 需要标签包装 |
| `<Dialog>` | `<Dialog>` + `<DialogContent>` | 结构略有不同 |
| `<Sheet>` | `<Drawer>` | 从侧边滑出 |
| `<Tabs>` | `<Tabs>` + `<Tab>` | 结构相同 |
| `<Table>` | `<Table>` + `<TableBody>` | 结构相同 |
| `<Card>` | `<Card>` + `<CardContent>` | 结构相同 |
| `<Badge>` | `<Chip>` | 功能相似 |
| `<Avatar>` | `<Avatar>` | 相同 |
| `<Tooltip>` | `<Tooltip>` | 相同 |
| `<Popover>` | `<Popover>` | 相同 |
| `<Alert>` | `<Alert>` | 相同 |
| `<Skeleton>` | `<Skeleton>` | 相同 |
| `<Progress>` | `<LinearProgress>` / `<CircularProgress>` | 两种形态 |
| `<Pagination>` | `<Pagination>` | 相同 |
| `<Calendar>` | `<DatePicker>` | 来自@mui/x-date-pickers |
| `<Form>` | React Hook Form + MUI | 需要自定义Controller |

### 5.2 Tailwind → MUI sx 映射

| Tailwind 类 | MUI sx | 示例 |
|-------------|--------|------|
| `p-4` | `p: 2` | 16px = 2 * 8px |
| `m-4` | `m: 2` | 同上 |
| `gap-4` | `gap: 2` | 同上 |
| `flex` | `display: 'flex'` | |
| `flex-col` | `flexDirection: 'column'` | |
| `items-center` | `alignItems: 'center'` | |
| `justify-between` | `justifyContent: 'space-between'` | |
| `w-full` | `width: '100%'` | |
| `h-screen` | `height: '100vh'` | |
| `rounded-lg` | `borderRadius: 2` | |
| `shadow-md` | `boxShadow: 2` | |
| `text-sm` | `fontSize: '0.875rem'` | |
| `font-bold` | `fontWeight: 700` | |
| `bg-blue-500` | `bgcolor: 'primary.main'` | |
| `text-white` | `color: 'white'` | |

---

## 六、实施步骤

### 6.1 阶段1：基础设施 (Week 1-2)

#### Step 1.1: 创建设计Token系统

```bash
# 创建文件
apps/web/src/theme/tokens.ts
apps/web/src/theme/theme.ts
apps/web/src/theme/components.ts
apps/web/src/theme/overrides/
```

#### Step 1.2: 创建页面模板组件

```bash
# 创建文件
apps/web/src/components/templates/
├── ListPageTemplate.tsx
├── DetailPageTemplate.tsx
├── FormPageTemplate.tsx
├── DashboardTemplate.tsx
└── index.ts
```

#### Step 1.3: 创建MUI基础组件

```bash
# 创建文件
apps/web/src/components/mui/
├── DataGrid/
├── SearchInput/
├── FilterBar/
├── PageHeader/
├── StatCard/
├── ActionBar/
└── index.ts
```

### 6.2 阶段2：核心模块迁移 (Week 3-6)

#### HRM 模块迁移顺序

1. **Week 3**: 员工管理
   - HrmEmployeePage (列表)
   - HrmEmployeeDetailPage (详情)
   - CreateEmployeeForm (新建)
   - EditEmployeeForm (编辑)

2. **Week 4**: 组织架构
   - HrmDepartmentPage
   - HrmOrganizationPage
   - HrmPositionPage
   - HrmCompanyPage

3. **Week 5**: 考勤薪酬
   - HrmAttendancePage
   - HrmPayrollPage
   - HrmContractPage

4. **Week 6**: 招聘培训
   - HrmRecruitmentPage
   - HrmTrainingPage
   - HrmPerformancePage
   - HrmLeavePage
   - HrmReportsPage

### 6.3 迁移检查清单

每个页面迁移完成后需检查：

- [ ] 移除所有 shadcn/ui 组件引用
- [ ] 移除所有 Tailwind className
- [ ] 使用 MUI sx 属性或 styled 组件
- [ ] 使用页面模板组件
- [ ] 保持原有功能不变
- [ ] 响应式布局正常
- [ ] 暗黑模式正常
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告
- [ ] 通过功能测试

---

## 七、验收标准

### 7.1 代码质量

- TypeScript 类型完整，无 any 类型
- ESLint 检查通过
- 代码格式统一
- 组件可复用性高

### 7.2 视觉一致性

- 所有页面使用统一的设计Token
- 颜色、字体、间距符合规范
- 组件样式一致
- 暗黑模式完美支持

### 7.3 功能完整性

- 所有原有功能正常工作
- 表单验证正常
- 数据加载和刷新正常
- 错误处理正常

### 7.4 性能

- 页面加载时间 < 2s
- 首屏渲染时间 < 1s
- 无内存泄漏
- 无不必要的重渲染

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 迁移周期长 | 业务迭代受影响 | 分模块渐进式迁移 |
| 功能回归 | 用户体验下降 | 完整的测试用例 |
| 样式不一致 | 视觉体验差 | 建立设计评审机制 |
| 团队学习成本 | 开发效率下降 | 编写详细文档和示例 |

---

## 九、附录

### A. 文件结构

```
apps/web/src/
├── theme/
│   ├── tokens.ts          # 设计Token
│   ├── theme.ts           # MUI主题配置
│   ├── components.ts      # 组件样式覆盖
│   └── overrides/         # 组件样式覆盖
│       ├── Button.tsx
│       ├── Card.tsx
│       └── ...
├── components/
│   ├── layout/            # 布局组件
│   ├── templates/         # 页面模板
│   ├── mui/               # MUI增强组件
│   └── ui/                # 待移除(shadcn)
└── pages/
    └── (各模块页面)
```

### B. 参考资源

- [MUI 官方文档](https://mui.com/)
- [MUI X (Data Grid, Date Pickers)](https://mui.com/x/)
- [Material Design 3](https://m3.material.io/)
- [React Hook Form](https://react-hook-form.com/)
