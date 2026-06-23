# TOPEMS 模板使用指南

## 一、概述

TOPEMS 前端采用统一的页面模板架构，提供四种核心模板组件，分别对应不同类型的页面场景。所有模板组件位于 `@/components/templates` 目录下。

### 模板类型

| 模板类型 | 组件名称 | 适用场景 |
|---------|---------|---------|
| 列表页 | `ListPageTemplate` | 数据列表展示、搜索筛选、分页浏览 |
| 表单页 | `FormPageTemplate` | 数据新建、编辑、复杂表单 |
| 详情页 | `DetailPageTemplate` | 数据详情查看、Tab 切换展示 |
| 仪表盘 | `DashboardTemplate` | 数据概览、统计卡片、图表展示 |

---

## 二、通用导入

所有模板组件的导入方式：

```typescript
import {
  ListPageTemplate,
  FormPageTemplate,
  DetailPageTemplate,
  DashboardTemplate,
} from "@/components/templates";
```

---

## 三、ListPageTemplate 列表页模板

### 3.1 功能特性

- 表格展示（排序、选择、分页）
- 搜索输入框
- 筛选下拉框
- 行操作菜单（查看、编辑、删除等）
- 批量选择
- 加载状态骨架屏
- 空状态展示
- 响应式布局（移动端操作菜单折叠）

### 3.2 导入

```typescript
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";
```

### 3.3 基本使用

```tsx
import { ListPageTemplate } from "@/components/templates";
import { Eye, Edit, Trash2 } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  code: string;
  industry: string;
  status: "active" | "inactive";
}

// 列定义
const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    label: "客户名称",
    sortable: true,
  },
  {
    id: "code",
    label: "客户代码",
    width: 120,
  },
  {
    id: "industry",
    label: "行业",
  },
  {
    id: "status",
    label: "状态",
    render: (row) => (
      <Chip
        label={row.status === "active" ? "活跃" : "停用"}
        color={row.status === "active" ? "success" : "default"}
        size="small"
      />
    ),
  },
];

// 行操作
const rowActions: RowAction<Customer>[] = [
  {
    label: "查看详情",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: (row) => navigate(`/customer/${row.id}`),
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: (row) => handleEdit(row),
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error",
    onClick: (row) => handleDelete(row.id),
    divider: true,
  },
];

// 筛选配置
const filters: FilterConfig[] = [
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "" },
      { label: "活跃", value: "active" },
      { label: "停用", value: "inactive" },
    ],
  },
];

// 页面组件
const CustomerListPage: React.FC = () => {
  return (
    <ListPageTemplate
      title="客户管理"
      subtitle="共 128 名客户"
      columns={columns}
      data={customers}
      loading={loading}
      rowActions={rowActions}
      filters={filters}
      searchable
      searchPlaceholder="搜索客户名称..."
      pagination={{
        page: currentPage,
        pageSize: pageSize,
        total: total,
        onPageChange: setCurrentPage,
        onPageSizeChange: setPageSize,
      }}
      onRowClick={(row) => navigate(`/customer/${row.id}`)}
      actions={[
        {
          label: "新建客户",
          onClick: handleCreate,
        },
      ]}
      onRefresh={fetchCustomers}
    />
  );
};
```

### 3.4 ColumnDef 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 列标识符，对应数据字段名 |
| `label` | `string` | 列头显示文本 |
| `width` | `number \| string` | 列宽度 |
| `minWidth` | `number` | 列最小宽度 |
| `align` | `'left' \| 'center' \| 'right'` | 文本对齐方式 |
| `sortable` | `boolean` | 是否可排序 |
| `render` | `(row: T, index: number) => ReactNode` | 自定义单元格渲染 |
| `renderHeader` | `(column: ColumnDef<T>) => ReactNode` | 自定义表头渲染 |

### 3.5 RowAction 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `label` | `string` | 操作按钮文本 |
| `icon` | `ReactNode` | 图标 |
| `onClick` | `(row: T) => void` | 点击回调 |
| `href` | `string` | 跳转链接 |
| `color` | `'primary' \| 'secondary' \| 'error' \| 'warning' \| 'success' \| 'info'` | 按钮颜色 |
| `show` | `(row: T) => boolean` | 条件显示 |
| `divider` | `boolean` | 是否显示分隔线 |

### 3.6 批量选择示例

```tsx
const CustomerListPage: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  return (
    <ListPageTemplate
      title="客户管理"
      columns={columns}
      data={customers}
      selectable
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      actions={[
        {
          label: "批量删除",
          onClick: () => handleBatchDelete(selectedIds),
        },
        {
          label: "批量导出",
          onClick: () => handleBatchExport(selectedIds),
        },
      ]}
    />
  );
};
```

### 3.7 自定义空状态

```tsx
<ListPageTemplate
  title="客户管理"
  columns={columns}
  data={[]}
  emptyMessage="暂无客户数据"
  emptyIcon={<EmptyCustomerIcon />}
/>
```

---

## 四、FormPageTemplate 表单页模板

### 4.1 功能特性

- 表单分 Section 区块展示
- 支持区块折叠/展开
- react-hook-form + zod 表单验证
- 字段级错误提示
- 加载状态骨架屏
- 提交中状态指示
- 粘性底部操作栏
- 响应式多列布局

### 4.2 导入

```typescript
import {
  FormPageTemplate,
  type FormField,
  type FormSection,
} from "@/components/templates";
import { z } from "zod";
```

### 4.3 基本使用

```tsx
import { FormPageTemplate } from "@/components/templates";
import { z } from "zod";

// 表单验证 Schema
const customerSchema = z.object({
  name: z.string().min(1, "客户名称不能为空"),
  code: z.string().min(1, "客户代码不能为空"),
  industry: z.string().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确").optional(),
  email: z.string().email("邮箱格式不正确").optional(),
});

// 表单字段配置
const sections: FormSection[] = [
  {
    id: "basic",
    title: "基本信息",
    description: "请填写客户的基本信息",
    fields: [
      {
        name: "name",
        label: "客户名称",
        type: "text",
        required: true,
        placeholder: "请输入客户名称",
      },
      {
        name: "code",
        label: "客户代码",
        type: "text",
        required: true,
        disabled: isEdit,
      },
      {
        name: "industry",
        label: "所属行业",
        type: "select",
        options: [
          { label: "互联网", value: "internet" },
          { label: "金融", value: "finance" },
          { label: "制造业", value: "manufacturing" },
        ],
      },
    ],
  },
  {
    id: "contact",
    title: "联系方式",
    collapsible: true,
    defaultExpanded: true,
    fields: [
      {
        name: "phone",
        label: "手机号码",
        type: "text",
        placeholder: "请输入手机号码",
      },
      {
        name: "email",
        label: "电子邮箱",
        type: "email",
        placeholder: "请输入电子邮箱",
      },
      {
        name: "address",
        label: "详细地址",
        type: "textarea",
        rows: 3,
        span: 2,
      },
    ],
  },
];

// 表单页面组件
const CustomerFormPage: React.FC = () => {
  const handleSubmit = async (data: z.infer<typeof customerSchema>) => {
    await saveCustomer(data);
    navigate("/customer");
  };

  return (
    <FormPageTemplate
      title={isEdit ? "编辑客户" : "新建客户"}
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "客户管理", href: "/customer" },
        { label: isEdit ? "编辑" : "新建" },
      ]}
      sections={sections}
      schema={customerSchema}
      defaultValues={{
        name: customer?.name || "",
        code: customer?.code || "",
        industry: customer?.industry || "",
      }}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
      columns={2}
    />
  );
};
```

### 4.4 FormField 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `name` | `string` | 字段名称 |
| `label` | `string` | 字段标签 |
| `type` | `'text' \| 'number' \| 'email' \| 'password' \| 'textarea' \| 'select' \| 'date' \| 'checkbox' \| 'switch' \| 'autocomplete'` | 字段类型 |
| `placeholder` | `string` | 占位文本 |
| `required` | `boolean` | 是否必填 |
| `disabled` | `boolean` | 是否禁用 |
| `defaultValue` | `any` | 默认值 |
| `options` | `Array<{ label: string; value: any }>` | 下拉选项（select 类型） |
| `span` | `number` | 跨列数量 |
| `rows` | `number` | textarea 行数 |
| `helperText` | `string` | 帮助文本 |
| `validation` | `z.ZodTypeAny` | Zod 验证规则 |

### 4.5 FormSection 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 区块标识符 |
| `title` | `string` | 区块标题 |
| `description` | `string` | 区块描述 |
| `fields` | `FormField[]` | 字段列表 |
| `collapsible` | `boolean` | 是否可折叠 |
| `defaultExpanded` | `boolean` | 默认展开状态 |

---

## 五、DetailPageTemplate 详情页模板

### 5.1 功能特性

- 页面头部（标题、副标题、操作按钮）
- 返回按钮
- 信息卡片（头像、标签、统计数据）
- Tab 标签页切换
- Section 区块展示
- 侧边栏（响应式）
- 快捷操作（编辑、删除、分享、打印、下载）

### 5.2 导入

```typescript
import {
  DetailPageTemplate,
  type TabConfig,
  type SectionConfig,
} from "@/components/templates";
```

### 5.3 基本使用

```tsx
import { DetailPageTemplate } from "@/components/templates";
import { Edit, Trash2, Share2 } from "lucide-react";

const CustomerDetailPage: React.FC = () => {
  const tabs: TabConfig[] = [
    {
      id: "info",
      label: "基本信息",
      icon: <UserIcon />,
      content: <BasicInfoTab customer={customer} />,
    },
    {
      id: "contacts",
      label: "联系人",
      icon: <ContactsIcon />,
      badge: customer?.contacts?.length || 0,
      content: <ContactsTab contacts={customer?.contacts || []} />,
    },
    {
      id: "orders",
      label: "订单记录",
      icon: <OrderIcon />,
      content: <OrdersTab orders={customer?.orders || []} />,
    },
  ];

  const sections: SectionConfig[] = [
    {
      id: "company",
      title: "公司信息",
      content: (
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">公司名称</Typography>
            <Typography>{customer.companyName}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">成立时间</Typography>
            <Typography>{customer.establishedDate}</Typography>
          </Grid>
        </Grid>
      ),
    },
  ];

  return (
    <DetailPageTemplate
      title={customer.name}
      subtitle={customer.code}
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "客户管理", href: "/customer" },
        { label: customer.name },
      ]}
      backHref="/customer"
      tabs={tabs}
      infoCard={{
        avatar: <Avatar src={customer.avatar} />,
        title: customer.name,
        subtitle: customer.companyName,
        tags: [customer.industry, customer.status],
        stats: [
          { label: "订单数", value: customer.orderCount },
          { label: "累计金额", value: `¥${customer.totalAmount}` },
        ],
      }}
      onEdit={() => navigate(`/customer/${id}/edit`)}
      onDelete={handleDelete}
      onShare={handleShare}
    />
  );
};
```

### 5.4 TabConfig 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | Tab 标识符 |
| `label` | `string` | Tab 显示文本 |
| `icon` | `ReactNode` | Tab 图标 |
| `content` | `ReactNode` | Tab 内容 |
| `badge` | `number \| string` | 徽章数字 |
| `disabled` | `boolean` | 是否禁用 |

### 5.5 SectionConfig 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | Section 标识符 |
| `title` | `string` | Section 标题 |
| `description` | `string` | Section 描述 |
| `content` | `ReactNode` | Section 内容 |
| `collapsible` | `boolean` | 是否可折叠 |
| `defaultExpanded` | `boolean` | 默认展开状态 |

### 5.6 侧边栏使用

```tsx
<DetailPageTemplate
  title={customer.name}
  tabs={tabs}
  sidebar={
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>操作记录</Typography>
      <Timeline items={activityTimeline} />
    </Box>
  }
  sidebarWidth={320}
/>
```

---

## 六、DashboardTemplate 仪表盘模板

### 6.1 功能特性

- 统计卡片（数值、趋势、图标）
- 图表区域（支持多个图表并列）
- 最近事项列表
- 快捷操作按钮网格
- 加载状态骨架屏
- 响应式布局

### 6.2 导入

```typescript
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type RecentItem,
  type QuickAction,
} from "@/components/templates";
```

### 6.3 基本使用

```tsx
import { DashboardTemplate } from "@/components/templates";
import { Users, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

const DashboardPage: React.FC = () => {
  const stats: StatCard[] = [
    {
      id: "customers",
      title: "客户总数",
      value: 128,
      change: 12,
      changeLabel: "较上月",
      icon: <Users style={{ width: 24, height: 24 }} />,
      color: "primary",
    },
    {
      id: "revenue",
      title: "本月收入",
      value: "¥128,000",
      change: 8.5,
      changeLabel: "较上月",
      icon: <DollarSign style={{ width: 24, height: 24 }} />,
      color: "success",
    },
    {
      id: "orders",
      title: "订单数量",
      value: 456,
      change: -3.2,
      changeLabel: "较上月",
      icon: <ShoppingCart style={{ width: 24, height: 24 }} />,
      color: "warning",
    },
    {
      id: "growth",
      title: "增长率",
      value: "15.8%",
      unit: "",
      change: 5.2,
      changeLabel: "较上月",
      icon: <TrendingUp style={{ width: 24, height: 24 }} />,
      color: "info",
    },
  ];

  const charts: ChartCard[] = [
    {
      id: "sales",
      title: "销售趋势",
      subtitle: "近30天销售数据",
      chart: <SalesChart data={salesData} />,
      height: 400,
    },
    {
      id: "category",
      title: "产品分类占比",
      chart: <CategoryPieChart data={categoryData} />,
      height: 400,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: "1",
      title: "新订单 #1001",
      description: "客户：张三，金额：¥5,000",
      time: "5分钟前",
    },
    {
      id: "2",
      title: "客户拜访完成",
      description: "拜访客户：李四公司",
      time: "1小时前",
    },
  ];

  const quickActions: QuickAction[] = [
    { id: "new-customer", label: "新建客户", icon: <Plus />, onClick: () => {} },
    { id: "new-order", label: "新建订单", icon: <ShoppingCart />, onClick: () => {} },
    { id: "view-report", label: "查看报表", icon: <BarChart />, onClick: () => {} },
    { id: "send-mail", label: "发送邮件", icon: <Mail />, onClick: () => {} },
  ];

  return (
    <DashboardTemplate
      title="数据概览"
      subtitle="欢迎回来，这是您的业务数据概览"
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle="最近动态"
      quickActions={quickActions}
      quickActionsTitle="快捷操作"
      loading={loading}
    />
  );
};
```

### 6.4 StatCard 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 卡片标识符 |
| `title` | `string` | 标题 |
| `value` | `string \| number` | 数值 |
| `unit` | `string` | 单位 |
| `change` | `number` | 变化值（正数上涨，负数下跌） |
| `changeLabel` | `string` | 变化说明 |
| `icon` | `ReactNode` | 图标 |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | 颜色主题 |
| `onClick` | `() => void` | 点击回调 |

### 6.5 ChartCard 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 图表标识符 |
| `title` | `string` | 标题 |
| `subtitle` | `string` | 副标题 |
| `chart` | `ReactNode` | 图表组件 |
| `height` | `number` | 图表高度 |
| `actions` | `ReactNode` | 操作按钮区域 |

### 6.6 RecentItem 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 项目标识符 |
| `title` | `string` | 标题 |
| `description` | `string` | 描述 |
| `time` | `string` | 时间 |
| `avatar` | `ReactNode` | 头像 |
| `onClick` | `() => void` | 点击回调 |

### 6.7 QuickAction 完整属性

| 属性 | 类型 | 说明 |
|-----|------|------|
| `id` | `string` | 操作标识符 |
| `label` | `string` | 标签文本 |
| `icon` | `ReactNode` | 图标 |
| `onClick` | `() => void` | 点击回调 |
| `href` | `string` | 跳转链接 |
| `color` | `string` | 颜色 |

---

## 七、PageHeader 页面头部组件

所有模板都使用统一的 PageHeader 组件作为页面头部。

### 7.1 导入

```typescript
import PageHeader from "@/components/layout/PageHeader";
import type { PageHeaderAction } from "@/components/layout/PageHeader";
```

### 7.2 基本使用

```tsx
<PageHeader
  title="客户管理"
  subtitle="共 128 名客户"
  backButton={{
    href: "/crm",
    onClick: () => navigate(-1),
  }}
  searchBox={{
    value: searchValue,
    onChange: setSearchValue,
    placeholder: "搜索客户...",
  }}
  actions={[
    {
      label: "新建",
      icon: <Plus style={{ width: 18, height: 18 }} />,
      onClick: handleCreate,
      variant: "contained",
    },
    {
      label: "导出",
      icon: <Download style={{ width: 18, height: 18 }} />,
      onClick: handleExport,
    },
  ]}
  helpContent={
    <Box>
      <p>帮助信息...</p>
    </Box>
  }
/>
```

---

## 八、常见问题

### Q1: 如何处理自定义列渲染？

```tsx
const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    label: "客户名称",
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar src={row.avatar} />
        <Box>
          <Typography>{row.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.email}
          </Typography>
        </Box>
      </Box>
    ),
  },
];
```

### Q2: 如何实现条件性行操作？

```tsx
const rowActions: RowAction<Customer>[] = [
  {
    label: "审核",
    onClick: (row) => handleReview(row),
    show: (row) => row.status === "pending",
  },
  {
    label: "删除",
    color: "error",
    onClick: (row) => handleDelete(row),
    show: (row) => row.canDelete,
  },
];
```

### Q3: 如何在表单中使用自定义字段？

```tsx
const sections: FormSection[] = [
  {
    id: "custom",
    title: "自定义区块",
    fields: [
      {
        name: "customField",
        label: "自定义选择",
        type: "select",
        options: customOptions,
        span: 2,
      },
    ],
  },
];
```

### Q4: 如何实现动态 Tab？

```tsx
const [tabs, setTabs] = useState<TabConfig[]>(initialTabs);

useEffect(() => {
  // 根据数据动态更新 Tab
  setTabs((prev) =>
    prev.map((tab) =>
      tab.id === "orders"
        ? { ...tab, badge: newOrdersCount }
        : tab,
    ),
  );
}, [newOrdersCount]);
```

### Q5: 如何在 Dashboard 中集成图表？

```tsx
import { AreaChart, PieChart } from "@mui/x-charts";

// 使用 MUI X Charts
const charts: ChartCard[] = [
  {
    id: "sales",
    title: "销售趋势",
    chart: (
      <AreaChart
        series={[{ data: salesData, label: "销售额" }]}
        xAxis={[{ data: months }]}
        height={300}
      />
    ),
  },
];
```

---

## 九、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2026-06-15 | 初始版本，包含四种核心模板组件 |
