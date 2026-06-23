# TOPEMS 组件使用指南

## 一、公共组件

### 1. TreeView 树状目录

**用途**：展示层级结构数据，如部门树、文件目录、菜单结构等。

**导入**：
```typescript
import TreeView, { TreeNode } from "@/components/common/TreeView";
```

**使用示例**：
```tsx
const data: TreeNode[] = [
  {
    id: "1",
    label: "技术部",
    children: [
      { id: "1-1", label: "前端组", badge: 5 },
      { id: "1-2", label: "后端组", badge: 8 },
    ],
  },
  { id: "2", label: "产品部" },
];

<TreeView
  data={data}
  selected="1-1"
  expanded={["1"]}
  onSelect={(node) => console.log("选中:", node)}
  onExpand={(id) => console.log("展开:", id)}
  density="normal"
/>
```

**属性**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `data` | `TreeNode[]` | - | 树形数据 |
| `selected` | `string` | - | 选中的节点ID |
| `expanded` | `string[]` | - | 展开的节点ID列表 |
| `onSelect` | `(node: TreeNode) => void` | - | 选择回调 |
| `onExpand` | `(nodeId: string) => void` | - | 展开/折叠回调 |
| `density` | `'compact' | 'normal' | 'comfortable'` | `'normal'` | 显示密度 |

---

### 2. ProgressBar 进度条

**用途**：展示进度状态，支持线性、圆形、分段三种样式。

**导入**：
```typescript
import ProgressBar from "@/components/common/ProgressBar";
```

**使用示例**：
```tsx
// 线性进度条
<ProgressBar value={75} variant="linear" label="下载进度" />

// 圆形进度条
<ProgressBar value={60} variant="circular" showValue />

// 分段进度条
<ProgressBar value={66} variant="segmented" max={100} />

// 渐变颜色
<ProgressBar value={50} color="gradient" animated striped />
```

**属性**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `number` | 0 | 当前值（0-100） |
| `max` | `number` | 100 | 最大值 |
| `variant` | `'linear' | 'circular' | 'segmented'` | `'linear'` | 进度条类型 |
| `color` | `'primary' | 'success' | 'warning' | 'error' | 'gradient'` | `'primary'` | 颜色 |
| `size` | `'small' | 'medium' | 'large'` | `'medium'` | 尺寸 |
| `label` | `string` | - | 标签文字 |
| `showValue` | `boolean` | `true` | 显示数值 |
| `animated` | `boolean` | `false` | 流动动画 |
| `striped` | `boolean` | `false` | 条纹效果 |

---

### 3. Stepper 步骤器

**用途**：展示流程步骤，如表单填写流程、审批流程等。

**导入**：
```typescript
import Stepper, { StepItem } from "@/components/common/Stepper";
```

**使用示例**：
```tsx
const steps: StepItem[] = [
  { label: "填写信息", description: "填写基本信息" },
  { label: "审核", description: "等待审核" },
  { label: "完成", description: "流程完成" },
];

<Stepper
  steps={steps}
  activeStep={1}
  orientation="horizontal"
  variant="gradient"
  showDescriptions
  onStepClick={(step) => console.log("点击:", step)}
/>
```

**属性**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `steps` | `StepItem[]` | - | 步骤列表 |
| `activeStep` | `number` | 0 | 当前步骤索引 |
| `orientation` | `'horizontal' | 'vertical'` | `'horizontal'` | 方向 |
| `variant` | `'default' | 'outlined' | 'gradient'` | `'default'` | 样式变体 |
| `showLabels` | `boolean` | `true` | 显示标签 |
| `showDescriptions` | `boolean` | `false` | 显示描述 |
| `onStepClick` | `(step: number) => void` | - | 点击回调 |

---

### 4. HelpButton 帮助按钮

**用途**：提供页面帮助信息入口。

**导入**：
```typescript
import HelpButton from "@/components/common/HelpButton";
```

**使用示例**：
```tsx
<HelpButton
  title="使用帮助"
  content="这是一份帮助文档内容..."
  dialogWidth="md"
/>
```

**属性**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | `'帮助'` | 对话框标题 |
| `content` | `React.ReactNode` | - | 帮助内容 |
| `size` | `'small' | 'medium' | 'large'` | `'medium'` | 按钮尺寸 |
| `dialogWidth` | `'sm' | 'md' | 'lg' | 'xl'` | `'md'` | 对话框宽度 |

---

## 二、布局组件

### 1. PageHeader 页面头部

**用途**：统一页面头部布局，包含标题、返回按钮、操作按钮等。

**导入**：
```typescript
import PageHeader from "@/components/layout/PageHeader";
```

**使用示例**：
```tsx
<PageHeader
  title="员工管理"
  subtitle="共 128 名员工"
  showBack
  onBack={() => navigate(-1)}
  showSearch
  onSearch={(text) => handleSearch(text)}
  actions={[
    { label: "新建", icon: <Plus />, onClick: handleCreate },
    { label: "导出", icon: <Download />, onClick: handleExport },
  ]}
  showHelp
  helpContent="员工管理帮助文档..."
/>
```

**属性**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | - | 页面标题 |
| `subtitle` | `string` | - | 副标题 |
| `showBack` | `boolean` | `false` | 显示返回按钮 |
| `onBack` | `() => void` | - | 返回回调 |
| `showSearch` | `boolean` | `false` | 显示搜索框 |
| `onSearch` | `(text: string) => void` | - | 搜索回调 |
| `actions` | `PageHeaderAction[]` | - | 操作按钮列表 |
| `showHelp` | `boolean` | `false` | 显示帮助按钮 |

---

### 2. PageBreadcrumb 面包屑

**用途**：展示页面层级导航。

**导入**：
```typescript
import PageBreadcrumb from "@/components/layout/PageBreadcrumb";
```

**使用示例**：
```tsx
<PageBreadcrumb
  items={[
    { label: "首页", path: "/dashboard" },
    { label: "人力", path: "/hrm" },
    { label: "员工管理", path: "/hrm/employee" },
  ]}
  showHome
/>
```

---

### 3. ServiceMonitor 服务状态监测

**用途**：展示系统各服务的运行状态。

**导入**：
```typescript
import ServiceMonitor, { ServiceStatus } from "@/components/layout/ServiceMonitor";
```

**使用示例**：
```tsx
const services: ServiceStatus[] = [
  { name: "IAM", key: "iam", status: "online" },
  { name: "HRM", key: "hrm", status: "online" },
  { name: "CRM", key: "crm", status: "warning" },
];

<ServiceMonitor
  services={services}
  onRefresh={() => fetchServiceStatus()}
  refreshInterval={30000}
  collapsible
/>
```

---

## 三、响应式组件

### 1. useResponsive Hook

**用途**：获取设备响应式状态。

**导入**：
```typescript
import { useResponsive } from "@/hooks/useResponsive";
```

**使用示例**：
```tsx
const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();

if (isMobile) {
  // 移动端逻辑
}
```

**返回值**：
| 属性 | 类型 | 说明 |
|------|------|------|
| `isMobile` | `boolean` | 是否为移动端（< sm） |
| `isTablet` | `boolean` | 是否为平板端（sm - lg） |
| `isDesktop` | `boolean` | 是否为桌面端（≥ lg） |
| `breakpoint` | `string` | 当前断点值 |

---

### 2. ResponsiveHeader 响应式导航

**用途**：根据设备类型自动调整导航显示。

**导入**：
```typescript
import ResponsiveHeader from "@/components/responsive/ResponsiveHeader";
```

**特性**：
- 桌面端：完整导航菜单
- 平板端：折叠部分导航到"更多"菜单
- 移动端：汉堡菜单 + Drawer 抽屉

---

## 四、首页组件

### 1. DashboardSection 分区组件

**用途**：首页分区布局，支持折叠/展开。

**导入**：
```typescript
import DashboardSection from "@/components/dashboard/DashboardSections";
```

**使用示例**：
```tsx
<DashboardSection
  title="今日概览"
  collapsible
  defaultExpanded
>
  {/* 内容 */}
</DashboardSection>
```

---

## 五、主题系统

### 1. 渐变颜色

**导入**：
```typescript
import { gradients } from "@/theme/gradients";
```

**使用示例**：
```tsx
// 在 sx prop 中使用
<Box sx={{ background: gradients.primary }}>
  主色调渐变
</Box>

// 模块专属渐变
<Box sx={{ background: gradients.modules.hrm }}>
  HRM 模块
</Box>
```

**可用渐变**：
| 名称 | 值 |
|------|-----|
| `primary` | `linear-gradient(135deg, #3b82f6, #2563eb)` |
| `secondary` | `linear-gradient(135deg, #8b5cf6, #7c3aed)` |
| `success` | `linear-gradient(135deg, #22c55e, #16a34a)` |
| `warning` | `linear-gradient(135deg, #f59e0b, #d97706)` |
| `error` | `linear-gradient(135deg, #ef4444, #dc2626)` |
| `modules.hrm` | `linear-gradient(135deg, #3b82f6, #60a5fa)` |
| `modules.crm` | `linear-gradient(135deg, #22c55e, #4ade80)` |
| `modules.pm` | `linear-gradient(135deg, #f59e0b, #fbbf24)` |

---

## 六、页面模板

### 1. ListPageTemplate 列表页模板

**用途**：标准列表页面布局。

**导入**：
```typescript
import ListPageTemplate from "@/components/templates/ListPageTemplate";
```

### 2. DetailPageTemplate 详情页模板

**用途**：详情页面布局，支持Tab切换。

### 3. FormPageTemplate 表单页模板

**用途**：表单页面布局，分组展示表单字段。

### 4. DashboardTemplate 仪表盘模板

**用途**：仪表盘页面布局，包含统计卡片、图表等。

---

## 七、最佳实践

1. **统一导入路径**：使用 `@/` 别名导入组件
2. **类型安全**：导入组件时同时导入类型定义
3. **响应式设计**：使用 `useResponsive` Hook 适配不同设备
4. **主题一致性**：使用 `gradients` 和 `theme` 保持视觉一致
5. **组件复用**：优先使用模板组件，避免重复开发

---

## 八、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2026-06-15 | 初始版本，包含 TreeView、ProgressBar、Stepper 等组件 |