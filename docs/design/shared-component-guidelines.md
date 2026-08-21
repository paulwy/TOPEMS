# TOPEMS 共享组件使用规范

> 版本：V1.0  
> 状态：草案 / 待评审  
> 制定时间：2026-08-21  
> 关联文档：[`design-system-implementation-plan.md`](./design-system-implementation-plan.md)、[`page-template-selection-guide.md`](./page-template-selection-guide.md)

---

## 1. 目的

规范 TOPEMS 共享组件的使用方式，统一核心组件的 API、样式与交互行为，减少业务自研组件，提升可维护性。

## 2. 适用范围

- 所有 `apps/web/src/pages/**/*.tsx` 新增/重构页面
- 所有 `packages/shared-components/src/**/*.tsx` 共享组件维护
- 所有涉及共享组件的 PR

## 3. 核心原则

1. **优先使用共享组件**：业务页面禁止自研表格、按钮变体、表单控件、状态标签等基础组件。
2. **禁止硬编码样式**：颜色、间距、字号、阴影必须使用 `theme` 或 `@topems/shared-components` 提供的设计 Token。
3. **统一 API 风格**：共享组件必须支持 `size`、`disabled`、`sx` 等通用 props。
4. **状态完整**：组件必须处理 `loading`、`empty`、`error`、`disabled` 状态。

## 4. 核心组件 DO / DON'T

### 4.1 DataTable

**DO**

- 所有列表页必须使用 `DataTable`，配置 `columns`、`data`、`pagination`。
- 列定义使用 `ColumnDef<T>`，明确类型。
- 使用 `rowActions` 配置行操作。
- 空数据使用 `EmptyState`。

```tsx
// ✅ 推荐
import { DataTable } from '@topems/shared-components';

const columns: ColumnDef<Order>[] = [
  { id: 'code', header: '订单号', accessor: 'code' },
  { id: 'status', header: '状态', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
];

<DataTable columns={columns} data={orders} loading={loading} pagination={pagination} />;
```

**DON'T**

```tsx
// ❌ 禁止自研表格
import { Table, TableBody, TableCell } from '@mui/material';

<Table>
  <TableBody>
    {orders.map((o) => (
      <TableCell key={o.id}>{o.code}</TableCell>
    ))}
  </TableBody>
</Table>;
```

---

### 4.2 PageContainer

**DO**

- 每个页面内容必须包裹在 `PageContainer` 中。
- 使用 `PageContainer` 提供的面包屑、标题、操作区插槽。

```tsx
// ✅ 推荐
import { PageContainer } from '@topems/shared-components';

<PageContainer title="客户管理" breadcrumbs={breadcrumbs} actions={<Button>新建</Button>}>
  <DataTable ... />
</PageContainer>;
```

**DON'T**

```tsx
// ❌ 禁止页面直接使用裸 Box 作为根容器
import { Box } from '@mui/material';

<Box sx={{ p: 3 }}>
  <DataTable ... />
</Box>;
```

---

### 4.3 ActionButton

**DO**

- 页面级操作按钮使用 `ActionButton`。
- 主操作使用 `variant="primary"`，次操作使用 `variant="secondary"`，危险操作使用 `variant="danger"`。
- 图标按钮使用 `ActionButton` 的 `icon` 属性。

```tsx
// ✅ 推荐
import { ActionButton } from '@topems/shared-components';

<ActionButton variant="primary" onClick={handleCreate} icon={<Plus />}>新建</ActionButton>
<ActionButton variant="danger" onClick={handleDelete} icon={<Trash />}>删除</ActionButton>
```

**DON'T**

```tsx
// ❌ 禁止自定义按钮变体颜色
import { Button } from '@mui/material';

<Button sx={{ backgroundColor: '#1976d2', color: '#fff' }}>新建</Button>
```

---

### 4.4 StatusBadge

**DO**

- 状态展示统一使用 `StatusBadge`。
- 状态值必须映射为语义化类型：`success`、`warning`、`error`、`info`、`default`。

```tsx
// ✅ 推荐
import { StatusBadge } from '@topems/shared-components';

<StatusBadge status={record.status} />;
```

**DON'T**

```tsx
// ❌ 禁止手写 Chip 颜色
import { Chip } from '@mui/material';

<Chip label={record.status} sx={{ bgcolor: record.status === 'active' ? 'green' : 'red' }} />;
```

---

### 4.5 FormField / FormInput / FormSelect / FormDatePicker

**DO**

- 表单控件必须优先使用 `FormField` 系列。
- 每个字段必须配置 `name`、`label`、校验规则。
- 错误提示由 `FormField` 统一渲染。

```tsx
// ✅ 推荐
import { FormInput, FormSelect, FormDatePicker } from '@topems/shared-components';

<FormInput name="name" label="客户名称" required />
<FormSelect name="industry" label="行业" options={industries} />
<FormDatePicker name="signDate" label="签约日期" />
```

**DON'T**

```tsx
// ❌ 禁止直接使用 MUI 基础控件零散拼装
import { TextField, Select, MenuItem } from '@mui/material';

<TextField label="名称" />
<Select>
  <MenuItem value="a">A</MenuItem>
</Select>
```

---

### 4.6 Pagination

**DO**

- 所有分页列表必须使用 `Pagination`。
- 分页参数使用 `page`、`pageSize`、`total`、`onChange`。

```tsx
// ✅ 推荐
import { Pagination } from '@topems/shared-components';

<Pagination
  page={page}
  pageSize={pageSize}
  total={total}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>;
```

**DON'T**

```tsx
// ❌ 禁止手写分页控件
import { Button } from '@mui/material';

<Button onClick={() => setPage(p => p - 1)}>上一页</Button>
<Button onClick={() => setPage(p => p + 1)}>下一页</Button>
```

---

### 4.7 EmptyState

**DO**

- 列表、表格、卡片列表空数据时使用 `EmptyState`。
- 提供明确的文案和可选操作。

```tsx
// ✅ 推荐
import { EmptyState } from '@topems/shared-components';

<EmptyState
  title="暂无数据"
  description="当前筛选条件下没有匹配的记录"
  action={<Button onClick={handleReset}>重置筛选</Button>}
/>;
```

**DON'T**

```tsx
// ❌ 禁止空数据时什么都不显示或手写提示
{data.length === 0 && <Typography>没有数据</Typography>}
```

---

### 4.8 ConfirmDialog

**DO**

- 删除、批量操作等二次确认使用 `ConfirmDialog`。
- 明确标题、内容、确认/取消按钮文案。

```tsx
// ✅ 推荐
import { ConfirmDialog } from '@topems/shared-components';

<ConfirmDialog
  open={open}
  title="确认删除"
  content="删除后不可恢复，是否继续？"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>;
```

**DON'T**

```tsx
// ❌ 禁止直接使用 window.confirm
if (window.confirm('确定删除？')) {
  handleDelete();
}
```

---

### 4.9 LoadingSpinner

**DO**

- 页面级、区块级加载使用 `LoadingSpinner`。
- 表格加载使用 `DataTable` 内置 `loading` 属性。

```tsx
// ✅ 推荐
import { LoadingSpinner } from '@topems/shared-components';

if (isLoading) return <LoadingSpinner />;
```

**DON'T**

```tsx
// ❌ 禁止手写加载动画
<CircularProgress sx={{ color: '#1976d2' }} />
```

---

### 4.10 PageHeader

**DO**

- 页面标题区使用 `PageHeader`。
- 标题、面包屑、操作按钮统一通过 `PageHeader` 管理。

```tsx
// ✅ 推荐
import { PageHeader } from '@topems/shared-components';

<PageHeader
  title="订单管理"
  breadcrumbs={[{ label: '首页', path: '/' }, { label: '订单' }]}
  actions={<Button>新建订单</Button>}
/>;
```

**DON'T**

```tsx
// ❌ 禁止每个页面手写标题区
<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
  <Typography variant="h5">订单管理</Typography>
  <Button>新建订单</Button>
</Box>
```

---

### 4.11 FilterBar

**DO**

- 列表页筛选条件使用 `FilterBar`。
- 筛选配置使用 `FilterConfig[]` 声明。

```tsx
// ✅ 推荐
import { FilterBar } from '@topems/shared-components';

const filters: FilterConfig[] = [
  { id: 'status', label: '状态', type: 'select', options: statusOptions },
  { id: 'keyword', label: '关键词', type: 'input' },
];

<FilterBar configs={filters} onChange={handleFilterChange} />;
```

**DON'T**

```tsx
// ❌ 禁止手写筛选表单
<TextField label="关键词" />
<Select>
  <MenuItem value="active">活跃</MenuItem>
</Select>
```

---

### 4.12 RelativeTime

**DO**

- 时间字段展示使用 `RelativeTime`。
- 鼠标悬停显示完整时间。

```tsx
// ✅ 推荐
import { RelativeTime } from '@topems/shared-components';

<RelativeTime date={record.createdAt} />;
```

**DON'T**

```tsx
// ❌ 禁止手写时间格式化
<Typography>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
```

---

## 5. 组件 API 通用规范

### 5.1 所有共享组件必须支持的 Props

| Prop | 类型 | 说明 |
|------|------|------|
| `size` | `'small' \| 'medium' \| 'large'` | 尺寸 |
| `disabled` | `boolean` | 禁用态 |
| `sx` | `SxProps<Theme>` | MUI sx 样式覆盖 |
| `className` | `string` | 自定义类名 |

### 5.2 TypeScript 类型规范

```tsx
export interface SharedComponentProps {
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
}
```

## 6. 禁止清单

| 禁止项 | 原因 | 替代方案 |
|--------|------|----------|
| 自研表格组件 | 维护成本高、功能重复 | `DataTable` |
| 自定义按钮变体颜色 | 破坏主题一致性 | `ActionButton` |
| 直接使用 MUI `TextField`/`Select` 做表单 | 缺少统一校验/错误提示 | `FormField` 系列 |
| 手写 Chip 做状态展示 | 颜色语义不统一 | `StatusBadge` |
| 手写分页 | 交互不一致 | `Pagination` |
| 使用 `window.confirm` | 体验差、不可定制 | `ConfirmDialog` |
| 手写加载动画 | 样式不一致 | `LoadingSpinner` |
| 手写标题区 | 布局不统一 | `PageHeader` / `PageContainer` |
| 手写时间格式化 | 时区/格式不一致 | `RelativeTime` |
| 手写空状态 | 风格不一致 | `EmptyState` |

## 7. 验收检查清单

新增/重构页面涉及共享组件时，PR 作者必须确认：

- [ ] 使用了共享组件而非自研基础组件
- [ ] 未自定义按钮/状态/Chip 颜色
- [ ] 表单控件优先使用 `FormField` 系列
- [ ] 分页使用 `Pagination`
- [ ] 二次确认使用 `ConfirmDialog`
- [ ] 加载/空状态/错误状态处理完整
- [ ] 已通过 `node scripts/check-design-tokens.mjs` 扫描无新增硬编码样式

## 8. 更新记录

| 版本 | 时间 | 变更内容 |
|------|------|----------|
| V1.0 | 2026-08-21 | 初稿，覆盖 12+ 核心组件 DO/DON'T 与禁止清单 |
