# TOPEMS 页面迁移指南

## 一、迁移概述

本文档指导开发人员将旧版页面（使用 shadcn/ui 组件或自定义布局）迁移到新的模板架构。新架构统一使用 MUI 组件库 + 模板组件，提供一致的用户体验和开发体验。

### 迁移收益

- **统一 UI**：所有页面使用相同的布局规范和样式
- **开发效率**：模板组件封装了常用功能，减少重复代码
- **可维护性**：集中管理模板，更新一处即可生效
- **响应式支持**：内置响应式布局，自动适配移动端

---

## 二、迁移原则

1. **功能优先**：迁移只改 UI 布局，不改业务逻辑
2. **增量迁移**：逐个页面迁移，确保不影响其他功能
3. **测试验证**：每个页面迁移后需手动测试核心功能
4. **类型安全**：保持 TypeScript 类型完整

---

## 三、迁移步骤

### 步骤 1：分析旧页面结构

在迁移前，仔细分析旧页面的：
- 页面布局结构（头部、内容区、底部）
- 数据展示方式（表格、卡片、表单等）
- 用户交互（搜索、筛选、排序、操作按钮）
- 状态管理（loading、error、empty）

### 步骤 2：选择目标模板

根据页面类型选择对应模板：

| 页面类型 | 目标模板 | 典型场景 |
|---------|---------|---------|
| 列表页 | `ListPageTemplate` | 客户列表、订单列表、用户列表 |
| 表单页 | `FormPageTemplate` | 新建客户、编辑设置 |
| 详情页 | `DetailPageTemplate` | 客户详情、订单详情 |
| 仪表盘 | `DashboardTemplate` | 首页概览、数据看板 |

### 步骤 3：提取数据模型

从旧页面提取：
- 数据类型接口
- 列/字段定义
- 操作配置

### 步骤 4：编写新页面代码

按照模板规范重写页面。

### 步骤 5：验证功能

- 页面正常渲染
- 数据正确展示
- 操作按钮功能正常
- 响应式布局正常

---

## 四、列表页迁移

### 4.1 旧代码（shadcn/ui）

```tsx
// 旧代码：使用 shadcn/ui Table
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerList() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <Button onClick={handleCreate}>新建客户</Button>
      </div>
      <div className="flex gap-2 mb-4">
        <Input placeholder="搜索..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>客户名称</TableHead>
            <TableHead>客户代码</TableHead>
            <TableHead>行业</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.code}</TableCell>
              <TableCell>{customer.industry}</TableCell>
              <TableCell>
                <Badge>{customer.status === "active" ? "活跃" : "停用"}</Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => handleView(customer)}>
                  查看
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                  编辑
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 4.2 新代码（模板组件）

```tsx
// 新代码：使用 ListPageTemplate
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { Button } from "@mui/material";
import { Eye, Edit, Plus } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  code: string;
  industry: string;
  status: "active" | "inactive";
}

const columns: ColumnDef<Customer>[] = [
  { id: "name", label: "客户名称", sortable: true },
  { id: "code", label: "客户代码" },
  { id: "industry", label: "行业" },
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

const rowActions: RowAction<Customer>[] = [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: (row) => navigate(`/customer/${row.id}`),
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: (row) => handleEdit(row),
  },
];

export const CustomerListPage: React.FC = () => {
  return (
    <ListPageTemplate
      title="客户管理"
      columns={columns}
      data={customers}
      loading={loading}
      rowActions={rowActions}
      searchable
      searchValue={search}
      onSearch={setSearch}
      pagination={{
        page,
        pageSize,
        total,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      actions={[
        {
          label: "新建客户",
          icon: <Plus style={{ width: 18, height: 18 }} />,
          onClick: handleCreate,
          variant: "contained",
        },
      ]}
      onRowClick={(row) => navigate(`/customer/${row.id}`)}
    />
  );
};
```

### 4.3 迁移检查清单

- [ ] 将 shadcn/ui Table 替换为 ListPageTemplate
- [ ] 将 Tailwind className 替换为 MUI sx prop
- [ ] 使用 lucide-react 图标替代 shadcn 图标
- [ ] 将 Badge 替换为 MUI Chip
- [ ] 将 Button variant="ghost" 替换为 MUI text variant
- [ ] 提取 columns 配置
- [ ] 提取 rowActions 配置
- [ ] 配置 pagination 属性
- [ ] 配置 searchable 属性

---

## 五、表单页迁移

### 5.1 旧代码（自定义布局）

```tsx
// 旧代码：自定义表单布局
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerForm() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">新建客户</h1>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <Label>客户名称</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>客户代码</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>行业</Label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">请选择</option>
              <option value="internet">互联网</option>
              <option value="finance">金融</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button type="submit">保存</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### 5.2 新代码（模板组件）

```tsx
// 新代码：使用 FormPageTemplate
import { FormPageTemplate, type FormSection } from "@/components/templates";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "客户名称不能为空"),
  code: z.string().min(1, "客户代码不能为空"),
  industry: z.string().optional(),
});

const sections: FormSection[] = [
  {
    id: "basic",
    title: "基本信息",
    fields: [
      {
        name: "name",
        label: "客户名称",
        type: "text",
        required: true,
      },
      {
        name: "code",
        label: "客户代码",
        type: "text",
        required: true,
      },
      {
        name: "industry",
        label: "所属行业",
        type: "select",
        options: [
          { label: "互联网", value: "internet" },
          { label: "金融", value: "finance" },
        ],
      },
    ],
  },
];

export const CustomerFormPage: React.FC = () => {
  const handleSubmit = async (data: z.infer<typeof customerSchema>) => {
    await saveCustomer(data);
    navigate("/customer");
  };

  return (
    <FormPageTemplate
      title="新建客户"
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "客户管理", href: "/customer" },
        { label: "新建" },
      ]}
      sections={sections}
      schema={customerSchema}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
      columns={2}
    />
  );
};
```

### 5.3 迁移检查清单

- [ ] 将自定义表单布局替换为 FormPageTemplate
- [ ] 使用 zod 定义表单验证 Schema
- [ ] 将表单字段提取到 sections 配置
- [ ] 将 Input/Label/select 替换为 FormField 配置
- [ ] 配置 breadcrumbs 面包屑导航
- [ ] 配置 onSubmit 和 onCancel 回调

---

## 六、详情页迁移

### 6.1 旧代码（Card 布局）

```tsx
// 旧代码：Card 布局详情页
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CustomerDetail({ customer }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-gray-500">{customer.code}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEdit}>编辑</Button>
          <Button variant="destructive" onClick={handleDelete}>删除</Button>
        </div>
      </div>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          <TabsTrigger value="contacts">联系人</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">行业</dt>
                  <dd>{customer.industry}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">电话</dt>
                  <dd>{customer.phone}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="contacts">
          {/* 联系人列表 */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 6.2 新代码（模板组件）

```tsx
// 新代码：使用 DetailPageTemplate
import {
  DetailPageTemplate,
  type TabConfig,
} from "@/components/templates";
import { Edit, Trash2 } from "lucide-react";

const tabs: TabConfig[] = [
  {
    id: "info",
    label: "基本信息",
    content: (
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">行业</Typography>
            <Typography>{customer.industry}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">电话</Typography>
            <Typography>{customer.phone}</Typography>
          </Grid>
        </Grid>
      </Box>
    ),
  },
  {
    id: "contacts",
    label: "联系人",
    badge: customer.contacts?.length || 0,
    content: <ContactsList contacts={customer.contacts} />,
  },
];

export const CustomerDetailPage: React.FC = () => {
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
    />
  );
};
```

### 6.3 迁移检查清单

- [ ] 将 Card 布局替换为 DetailPageTemplate
- [ ] 将 shadcn Tabs 替换为 tabs 配置
- [ ] 使用 infoCard 替代顶部信息区
- [ ] 配置 onEdit 和 onDelete 回调
- [ ] 配置 breadcrumbs 面包屑导航
- [ ] 配置 backHref 返回链接

---

## 七、仪表盘迁移

### 7.1 旧代码（Grid 布局）

```tsx
// 旧代码：自定义 Grid 布局
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">数据概览</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">客户总数</p>
            <p className="text-2xl font-bold">128</p>
            <p className="text-xs text-green-500">+12%</p>
          </CardContent>
        </Card>
        {/* 更多统计卡片 */}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>销售趋势</CardHeader>
          <CardContent>{/* 图表 */}</CardContent>
        </Card>
        <Card>
          <CardHeader>最近动态</CardHeader>
          <CardContent>{/* 动态列表 */}</CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 7.2 新代码（模板组件）

```tsx
// 新代码：使用 DashboardTemplate
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type RecentItem,
} from "@/components/templates";
import { Users, TrendingUp } from "lucide-react";

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
];

const charts: ChartCard[] = [
  {
    id: "sales",
    title: "销售趋势",
    chart: <SalesChart data={salesData} />,
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
];

export const DashboardPage: React.FC = () => {
  return (
    <DashboardTemplate
      title="数据概览"
      subtitle="欢迎回来，这是您的业务数据概览"
      stats={stats}
      charts={charts}
      recentItems={recentItems}
      recentTitle="最近动态"
    />
  );
};
```

---

## 八、常见问题

### Q1: 如何处理自定义表格列？

```tsx
// 使用 render 函数自定义列
const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    label: "客户名称",
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar src={row.avatar} sx={{ width: 32, height: 32 }} />
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

### Q2: 如何实现条件性操作按钮？

```tsx
const rowActions: RowAction<Customer>[] = [
  {
    label: "审核",
    onClick: (row) => handleReview(row),
    show: (row) => row.status === "pending", // 仅待审核状态显示
  },
  {
    label: "删除",
    color: "error",
    onClick: (row) => handleDelete(row),
    divider: true,
  },
];
```

### Q3: 如何添加自定义筛选条件？

```tsx
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
  {
    id: "industry",
    label: "行业",
    type: "select",
    options: industryOptions,
  },
];

<ListPageTemplate
  filters={filters}
  onFilterChange={(filters) => {
    console.log("筛选条件变化:", filters);
  }}
/>
```

### Q4: 如何在表单中使用 Zod 验证？

```tsx
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "客户名称不能为空"),
  code: z.string().min(1, "客户代码不能为空"),
  email: z.string().email("邮箱格式不正确").optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "手机号格式不正确").optional(),
});

const sections: FormSection[] = [
  {
    id: "basic",
    title: "基本信息",
    fields: [
      { name: "name", label: "客户名称", type: "text", required: true },
      { name: "code", label: "客户代码", type: "text", required: true },
      { name: "email", label: "电子邮箱", type: "email" },
      { name: "phone", label: "手机号码", type: "text" },
    ],
  },
];

<FormPageTemplate
  sections={sections}
  schema={customerSchema}
  onSubmit={handleSubmit}
/>
```

### Q5: 如何处理表单提交状态？

```tsx
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string>();

const handleSubmit = async (data: any) => {
  setSubmitting(true);
  setError(undefined);
  try {
    await saveCustomer(data);
    navigate("/customer");
  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
};

<FormPageTemplate
  sections={sections}
  onSubmit={handleSubmit}
  error={error}
/>
```

### Q6: 如何在详情页添加自定义标签页？

```tsx
const tabs: TabConfig[] = [
  {
    id: "info",
    label: "基本信息",
    icon: <InfoIcon />,
    content: <BasicInfo data={customer} />,
  },
  {
    id: "custom",
    label: "自定义Tab",
    icon: <CustomIcon />,
    content: <CustomContent data={customer} />,
  },
];

<DetailPageTemplate
  title={customer.name}
  tabs={tabs}
/>
```

### Q7: 如何实现移动端适配？

所有模板组件已内置响应式支持，无需额外配置：

- 列表页：移动端行操作按钮自动折叠到"更多"菜单
- 表单页：移动端自动切换为单列布局
- 详情页：移动端侧边栏自动移到主内容下方
- 仪表盘：移动端统计卡片和图表自动堆叠

### Q8: 如何保持与旧页面的状态同步？

```tsx
// 如果旧页面有复杂的状态逻辑，先保留状态管理
const [customState, setCustomState] = useState({});

const handleStateChange = (newState) => {
  // 更新自定义状态
  setCustomState(newState);
  // 同时更新模板所需的数据
  setCustomers(newState.customers);
};

<ListPageTemplate
  data={customers}
  loading={loading}
  // ...其他属性
/>
```

---

## 九、迁移进度跟踪

### 已完成迁移的页面

| 模块 | 页面 | 模板类型 | 状态 | 完成日期 |
|------|------|---------|------|----------|
| HRM | 员工管理 | ListPageTemplate | ✅ 完成 | 2026-06-15 |
| CRM | 客户管理 | ListPageTemplate | ✅ 完成 | 2026-06-15 |
| CRM | 客户详情 | DetailPageTemplate | ✅ 完成 | 2026-06-15 |
| CRM | 新建/编辑客户 | FormPageTemplate | ✅ 完成 | 2026-06-15 |

### 待迁移页面

| 模块 | 页面 | 模板类型 | 优先级 | 状态 |
|------|------|---------|--------|------|
| PM | 项目列表 | ListPageTemplate | P0 | 待处理 |
| PM | 项目详情 | DetailPageTemplate | P0 | 待处理 |
| Flow | 流程列表 | ListPageTemplate | P1 | 待处理 |
| BI | 数据看板 | DashboardTemplate | P1 | 待处理 |

---

## 十、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2026-06-15 | 初始版本，包含迁移指南 |
