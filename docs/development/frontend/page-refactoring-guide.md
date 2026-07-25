# TOPEMS 页面重构指南

## 一、重构原则

1. **使用页面模板**：列表页使用 ListPageTemplate，详情页使用 DetailPageTemplate
2. **统一组件导入**：使用 `@/components` 别名导入
3. **移除 Tailwind/shadcn**：使用 MUI sx prop 替代
4. **保持功能不变**：重构只改 UI，不改业务逻辑

---

## 二、列表页重构示例

### 原始代码（CustomerManagementPage）

```tsx
// 原始导入
import {
  Button,
  TextField,
  Card,
  Table,
  TableBody,
  TableCell,
  ...
} from "@mui/material";

// 原始布局
<Box sx={{ p: 3 }}>
  <Card>
    <CardHeader title="客户管理" />
    <CardContent>
      <Stack direction="row" spacing={2}>
        <TextField placeholder="搜索..." />
        <Button variant="contained">新建</Button>
      </Stack>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              ...
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                ...
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
</Box>
```

### 重构后代码

```tsx
// 新导入
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { PageHeader } from "@/components/layout";
import { FilterBar, type FilterConfig } from "@/components/mui";

// 列定义
const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    header: "客户名称",
    accessor: "name",
    sortable: true,
  },
  {
    id: "code",
    header: "客户代码",
    accessor: "code",
  },
  {
    id: "industry",
    header: "行业",
    accessor: "industry",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => (
      <Chip
        label={value === "active" ? "活跃" : "停用"}
        color={value === "active" ? "success" : "default"}
        size="small"
      />
    ),
  },
];

// 行操作
const rowActions: RowAction<Customer>[] = [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: (row) => navigate(`/crm/customer/${row.id}`),
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: (row) => handleEdit(row),
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (row) => handleDelete(row.id),
    color: "error",
  },
];

// 筛选配置
const filters: FilterConfig[] = [
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "active", label: "活跃" },
      { value: "inactive", label: "停用" },
    ],
  },
];

// 页面组件
const CustomerManagementPage: React.FC = () => {
  return (
    <ListPageTemplate
      title="客户管理"
      breadcrumbs={[
        { label: "首页", path: "/dashboard" },
        { label: "客户", path: "/crm" },
        { label: "客户管理" },
      ]}
      columns={columns}
      data={customers}
      loading={loading}
      rowActions={rowActions}
      filters={filters}
      onFilterChange={handleFilterChange}
      pagination={{
        page: currentPage,
        pageSize: pageSize,
        total: total,
        onPageChange: setCurrentPage,
      }}
      actions={
        <Button
          variant="contained"
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={handleCreate}
        >
          新建客户
        </Button>
      }
      onRowClick={(row) => navigate(`/crm/customer/${row.id}`)}
    />
  );
};
```

---

## 三、详情页重构示例

### 原始代码（CustomerDetailPage）

```tsx
// 原始布局
<Box sx={{ p: 3 }}>
  <Card>
    <CardHeader
      title={customer?.name}
      action={
        <Stack direction="row" spacing={1}>
          <Button onClick={handleEdit}>编辑</Button>
          <Button color="error" onClick={handleDelete}>删除</Button>
        </Stack>
      }
    />
    <CardContent>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="body2">客户代码</Typography>
          <Typography>{customer?.code}</Typography>
        </Grid>
        ...
      </Grid>
    </CardContent>
  </Card>
</Box>
```

### 重构后代码

```tsx
import { DetailPageTemplate } from "@/components/templates";
import { PageHeader } from "@/components/layout";

const CustomerDetailPage: React.FC = () => {
  const tabs = [
    { label: "基本信息", path: "info" },
    { label: "联系人", path: "contacts" },
    { label: "商机", path: "opportunities" },
    { label: "交互记录", path: "interactions" },
  ];

  const sections = [
    {
      title: "基本信息",
      fields: [
        { label: "客户名称", value: customer?.name },
        { label: "客户代码", value: customer?.code },
        { label: "行业", value: customer?.industry },
        { label: "状态", value: customer?.status, type: "status" },
      ],
    },
    {
      title: "联系方式",
      fields: [
        { label: "电话", value: customer?.phone },
        { label: "邮箱", value: customer?.email },
        { label: "网站", value: customer?.website },
        { label: "地址", value: customer?.address },
      ],
    },
  ];

  return (
    <DetailPageTemplate
      title={customer?.name || "客户详情"}
      subtitle={customer?.code}
      breadcrumbs={[
        { label: "首页", path: "/dashboard" },
        { label: "客户", path: "/crm" },
        { label: "客户管理", path: "/crm/customer" },
        { label: customer?.name },
      ]}
      tabs={tabs}
      sections={sections}
      headerActions={
        <>
          <Button
            variant="outlined"
            startIcon={<Edit style={{ width: 18, height: 18 }} />}
            onClick={handleEdit}
          >
            编辑
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 style={{ width: 18, height: 18 }} />}
            onClick={handleDelete}
          >
            删除
          </Button>
        </>
      }
    />
  );
};
```

---

## 四、表单页重构示例

### 重构后代码

```tsx
import { FormPageTemplate } from "@/components/templates";

const CreateCustomerForm: React.FC = () => {
  const sections = [
    {
      title: "基本信息",
      fields: [
        { name: "name", label: "客户名称", required: true, type: "text" },
        { name: "code", label: "客户代码", required: true, type: "text" },
        { name: "industry", label: "行业", type: "select", options: industries },
        { name: "status", label: "状态", type: "select", options: statusOptions },
      ],
    },
    {
      title: "联系方式",
      fields: [
        { name: "phone", label: "电话", type: "tel" },
        { name: "email", label: "邮箱", type: "email" },
        { name: "website", label: "网站", type: "url" },
        { name: "address", label: "地址", type: "textarea" },
      ],
    },
  ];

  return (
    <FormPageTemplate
      title="新建客户"
      breadcrumbs={[
        { label: "首页", path: "/dashboard" },
        { label: "客户", path: "/crm" },
        { label: "新建客户" },
      ]}
      sections={sections}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
      submitText="创建"
    />
  );
};
```

---

## 五、重构检查清单

每个页面重构完成后需检查：

- [ ] 使用正确的页面模板组件
- [ ] 移除所有 shadcn/ui 组件引用
- [ ] 移除所有 Tailwind className
- [ ] 使用 MUI sx 属性或 styled 组件
- [ ] 导入路径使用 `@/` 别名
- [ ] 图标使用 lucide-react
- [ ] 保持原有功能不变
- [ ] 响应式布局正常
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

---

## 六、模块重构优先级

| 优先级 | 模块 | 页面数 | 状态 |
|--------|------|--------|------|
| P0 | HRM | 15 | ✅ HrmEmployeePage 已完成 |
| P0 | CRM | 8 | 待重构 |
| P0 | PM | 10 | 待重构 |
| P1 | Finance | 12 | 待重构 |
| P1 | Flow | 8 | 待重构 |
| P2 | BI | 8 | 待重构 |
| P2 | RD | 13 | 待重构 |
| P3 | 其他 | 50+ | 待重构 |

---

## 七、常见问题

### Q: 如何处理复杂表格？
A: 使用 DataTable 组件，支持排序、筛选、分页。

### Q: 如何处理自定义渲染？
A: 在 ColumnDef 中使用 `render` 函数自定义单元格渲染。

### Q: 如何处理行选择？
A: 使用 `selection` 属性启用行选择，`onSelectionChange` 处理选择变化。

### Q: 如何处理批量操作？
A: 使用 `batchActions` 属性定义批量操作按钮。

---

## 八、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2026-06-15 | 初始版本 |