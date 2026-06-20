# DataTable组件迁移指南

## 一、迁移背景

为了统一组件规范、增强组件能力，我们整合了根目录和common目录的DataTable组件，创建了一个统一的增强版DataTable组件。新组件使用TanStack React Table，支持搜索、排序、筛选、分页、选择、导出等功能。

## 二、新组件特性

### 2.1 核心特性

| 特性 | 说明 |
|------|------|
| **搜索功能** | 支持按指定字段搜索 |
| **排序功能** | 支持列排序 |
| **筛选功能** | 支持筛选按钮 |
| **分页功能** | 支持分页导航 |
| **选择功能** | 支持单选和多选 |
| **导出功能** | 支持导出CSV |
| **列设置** | 支持显示/隐藏列 |
| **新建按钮** | 支持显示新建按钮 |
| **刷新按钮** | 支持显示刷新按钮 |
| **加载状态** | 支持加载中状态 |

### 2.2 新增特性

| 特性 | 说明 |
|------|------|
| **行选择** | 支持单选和全选 |
| **新建按钮** | 内置新建功能 |
| **刷新按钮** | 内置刷新功能 |
| **列设置菜单** | 可配置列显示/隐藏 |
| **响应式设计** | 支持移动端适配 |
| **MUI sx属性** | 使用MUI sx属性替代Tailwind CSS |

### 2.3 增强特性（v1.1.0）

| 特性 | 说明 |
|------|------|
| **列配置持久化** | 列显示/隐藏配置自动保存到localStorage |
| **行展开功能** | 支持点击展开行详情 |
| **列固定** | 支持表头固定和首列固定 |
| **行号显示** | 支持显示行号列 |
| **重置列配置** | 一键重置到默认配置 |

## 三、迁移步骤

### 3.1 从根目录DataTable迁移

**旧代码**:
```tsx
import { DataTable } from '@/components/DataTable';

const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
  {
    header: "状态",
    accessorKey: "status",
  },
];

<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  loading={loading}
  onRowClick={handleRowClick}
  enablePagination={true}
  pageCount={10}
  totalItems={100}
  pageSize={10}
  onPageChange={handlePageChange}
  onPageSizeChange={handlePageSizeChange}
  currentPage={0}
/>
```

**新代码**:
```tsx
import { DataTable } from '@/components/common/DataTable';

const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
  {
    header: "状态",
    accessorKey: "status",
  },
];

<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  loading={loading}
  onRowClick={handleRowClick}
  enablePagination={true}
  totalPages={10}
  totalItems={100}
  pageSize={10}
  onPageChange={handlePageChange}
  onPageSizeChange={handlePageSizeChange}
  currentPage={0}
/>
```

### 3.2 从common/DataTable迁移

**旧代码**:
```tsx
import DataTable from '@/components/common/DataTable';

const columns = [
  { key: "name", label: "名称", sortable: true },
  { key: "status", label: "状态" },
];

<DataTable
  columns={columns}
  data={data}
  showSearch={true}
  showFilters={true}
  showExport={true}
  showSelection={true}
  showPagination={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  onSelectionChange={handleSelectionChange}
  onCreateNew={handleCreate}
/>
```

**新代码**:
```tsx
import { DataTable } from '@/components/common/DataTable';

const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
  {
    header: "状态",
    accessorKey: "status",
  },
];

<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  showSearch={true}
  showFilters={true}
  showExport={true}
  showSelection={true}
  showPagination={true}
  onRowClick={handleRowClick}
  onExport={handleExport}
  onSelectionChange={handleSelectionChange}
  showCreate={true}
  onCreate={handleCreate}
/>
```

## 四、API对比

### 4.1 Props对比

| 属性 | 旧版(根目录) | 旧版(common) | 新版 | 说明 |
|------|-------------|-------------|------|------|
| columns | ✅ | ✅ | ✅ | 列定义 |
| data | ✅ | ✅ | ✅ | 数据 |
| searchKey | ✅ | ❌ | ✅ | 搜索字段名 |
| searchPlaceholder | ✅ | ✅ | ✅ | 搜索占位符 |
| showSearch | ❌ | ✅ | ✅ | 是否显示搜索框 |
| showFilters | ❌ | ✅ | ✅ | 是否显示筛选按钮 |
| showExport | ❌ | ✅ | ✅ | 是否显示导出按钮 |
| showSelection | ❌ | ✅ | ✅ | 是否显示选择框 |
| showCreate | ❌ | ❌ | ✅ | 是否显示新建按钮 |
| createLabel | ❌ | ❌ | ✅ | 新建按钮标签 |
| onCreate | ❌ | ❌ | ✅ | 新建按钮点击回调 |
| exportFileName | ✅ | ❌ | ✅ | 导出文件名 |
| enablePagination | ✅ | ✅ | ✅ | 是否启用分页 |
| totalPages | ❌ | ❌ | ✅ | 总页数 |
| totalItems | ✅ | ✅ | ✅ | 总记录数 |
| pageSize | ✅ | ✅ | ✅ | 每页条数 |
| currentPage | ✅ | ✅ | ✅ | 当前页码 |
| onPageChange | ✅ | ❌ | ✅ | 页码变化回调 |
| onPageSizeChange | ✅ | ❌ | ✅ | 每页条数变化回调 |
| onRowClick | ✅ | ✅ | ✅ | 行点击回调 |
| onSelectionChange | ❌ | ✅ | ✅ | 选择变化回调 |
| showRefresh | ❌ | ❌ | ✅ | 是否显示刷新按钮 |
| onRefresh | ❌ | ❌ | ✅ | 刷新回调 |
| loading | ✅ | ❌ | ✅ | 是否加载中 |
| responsive | ✅ | ❌ | ✅ | 是否响应式 |
| emptyMessage | ❌ | ✅ | ✅ | 空数据提示 |
| getRowKey | ❌ | ✅ | ✅ | 获取行key的函数 |
| extraActions | ❌ | ✅ | ✅ | 额外操作按钮 |
| sx | ❌ | ❌ | ✅ | 自定义样式 |
| persistColumnConfig | ❌ | ❌ | ✅ | 是否启用列配置持久化 |
| columnConfigKey | ❌ | ❌ | ✅ | 列配置存储的key前缀 |
| enableRowExpansion | ❌ | ❌ | ✅ | 是否启用行展开功能 |
| expandedRowRender | ❌ | ❌ | ✅ | 行展开内容渲染函数 |
| enableVirtualization | ❌ | ❌ | ✅ | 是否启用虚拟滚动 |
| rowHeight | ❌ | ❌ | ✅ | 虚拟滚动的行高 |
| enableStickyHeader | ❌ | ❌ | ✅ | 是否启用列固定 |
| showRowNumber | ❌ | ❌ | ✅ | 是否显示行号 |

### 4.2 列定义对比

**旧版(根目录)**:
```tsx
const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
];
```

**旧版(common)**:
```tsx
const columns = [
  { key: "name", label: "名称", sortable: true },
];
```

**新版**:
```tsx
const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
];
```

## 五、最佳实践

### 5.1 基础使用

```tsx
import { DataTable } from '@/components/common/DataTable';

const columns = [
  {
    header: "名称",
    accessorKey: "name",
  },
  {
    header: "状态",
    accessorKey: "status",
  },
];

<DataTable
  columns={columns}
  data={data}
  searchKey="name"
  loading={loading}
/>
```

### 5.2 带选择功能

```tsx
<DataTable
  columns={columns}
  data={data}
  showSelection={true}
  onSelectionChange={handleSelectionChange}
/>
```

### 5.3 带新建按钮

```tsx
<DataTable
  columns={columns}
  data={data}
  showCreate={true}
  onCreate={handleCreate}
  createLabel="新建用户"
/>
```

### 5.4 带刷新功能

```tsx
<DataTable
  columns={columns}
  data={data}
  showRefresh={true}
  onRefresh={handleRefresh}
/>
```

### 5.5 自定义样式

```tsx
<DataTable
  columns={columns}
  data={data}
  sx={{
    maxWidth: 1200,
    mx: "auto",
  }}
/>
```

### 5.6 列配置持久化

```tsx
<DataTable
  columns={columns}
  data={data}
  persistColumnConfig
  columnConfigKey="user-list"
/>
```

### 5.7 行展开功能

```tsx
const renderExpandedRow = (row) => (
  <Box sx={{ p: 2 }}>
    <Typography variant="subtitle2" fontWeight="bold">详情信息</Typography>
    <Typography variant="body2">邮箱: {row.email}</Typography>
    <Typography variant="body2">创建时间: {row.createdAt}</Typography>
  </Box>
);

<DataTable
  columns={columns}
  data={data}
  enableRowExpansion
  expandedRowRender={renderExpandedRow}
/>
```

### 5.8 列固定和行号

```tsx
<DataTable
  columns={columns}
  data={data}
  enableStickyHeader
  showRowNumber
  showSelection
/>
```

## 六、迁移注意事项

### 6.1 导入路径变更

所有DataTable组件统一从`@/components/common/DataTable`导入：

```tsx
// 正确的导入方式
import { DataTable } from '@/components/common/DataTable';

// 错误的导入方式（已废弃）
import { DataTable } from '@/components/DataTable'; // ❌
import DataTable from '@/components/common/DataTable'; // ❌
```

### 6.2 列定义变更

旧版common/DataTable使用`key`和`label`，新版使用`accessorKey`和`header`：

```tsx
// 旧版
{ key: "name", label: "名称" }

// 新版
{ accessorKey: "name", header: "名称" }
```

### 6.3 样式迁移

旧版使用Tailwind CSS，新版使用MUI sx属性：

```tsx
// 旧版
<div className="w-full">

// 新版
<DataTable sx={{ width: "100%" }} />
```

### 6.4 属性名称变更

| 旧属性 | 新属性 | 说明 |
|--------|--------|------|
| onCreateNew | onCreate | 新建按钮点击回调 |
| showPagination | enablePagination | 是否启用分页 |
| pageCount | totalPages | 总页数 |

## 七、迁移时间表

| 阶段 | 任务 | 时间 |
|------|------|------|
| **阶段1** | 创建统一组件 | 已完成 |
| **阶段2** | 更新导入路径 | 1周内 |
| **阶段3** | 删除旧组件 | 2周内 |

## 八、迁移检查清单

- [ ] 更新导入路径为`@/components/common/DataTable`
- [ ] 修改列定义为TanStack格式
- [ ] 更新属性名称（onCreateNew → onCreate）
- [ ] 替换Tailwind CSS样式为MUI sx属性
- [ ] 测试组件功能正常
- [ ] 检查搜索功能是否正常
- [ ] 检查选择功能是否正常
- [ ] 检查分页功能是否正常
- [ ] 检查导出功能是否正常

## 九、常见问题

### Q1: 为什么要合并组件？

**A**: 消除重复定义、统一组件规范、增强组件能力、降低维护成本。

### Q2: 旧组件还能使用吗？

**A**: 可以，但建议尽快迁移。旧组件将在2周后删除。

### Q3: 如何实现列自定义渲染？

**A**: 使用cell属性自定义渲染：

```tsx
const columns = [
  {
    header: "状态",
    accessorKey: "status",
    cell: ({ row }) => (
      <StatusBadge status={row.getValue("status")} />
    ),
  },
];
```

### Q4: 如何实现排序？

**A**: TanStack Table默认支持排序，点击表头即可排序。

### Q5: 如何实现筛选？

**A**: 使用searchKey属性指定搜索字段：

```tsx
<DataTable
  columns={columns}
  data={data}
  searchKey="name"
/>
```

## 十、技术支持

如有迁移问题，请联系前端团队。

---

**更新时间**: 2026-06-21
**版本**: v1.0.0