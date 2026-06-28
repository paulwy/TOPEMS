# TOPEMS 组件 API 参考

本文档涵盖 TOPEMS 核心通用组件的属性定义、使用示例和注意事项。

---

## StatusBadge

统一的状态徽章组件，支持预设状态映射、动态颜色、图标集成、多种尺寸和变体。内置覆盖通用、HRM、CRM、项目、工作流、财务等多场景预设。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | `string` | - | **必填**。状态值，对应 `statusMap` 中的 key |
| `statusMap` | `StatusMapConfig` | `DEFAULT_STATUS_MAP` | 状态映射配置，默认内置 40+ 预设 |
| `label` | `string` | - | 自定义显示标签，覆盖 statusMap 中的 label |
| `color` | `StatusColor` | - | 自定义颜色：`default` / `primary` / `secondary` / `success` / `warning` / `error` / `info` |
| `icon` | `ReactNode` | - | 自定义图标，覆盖 statusMap 中的 icon |
| `showIcon` | `boolean` | `false` | 是否在徽章中显示图标 |
| `size` | `StatusSize` | `'sm'` | 尺寸：`sm`（24px） / `md`（32px） / `lg`（40px） |
| `variant` | `StatusVariant` | `'filled'` | 变体：`filled` / `outlined` / `soft` |
| `clickable` | `boolean` | `false` | 是否可点击（显示手型光标） |
| `onClick` | `() => void` | - | 点击事件回调 |
| `disabled` | `boolean` | `false` | 是否禁用（降低透明度） |
| `sx` | `object` | - | 自定义 MUI sx 样式 |
| `useChip` | `boolean` | `true` | 是否使用 Chip 组件渲染 |
| `render` | `(config: StatusConfig) => ReactNode` | - | 自定义渲染函数 |

### 使用示例

```tsx
import { StatusBadge } from '@/components/common/StatusBadge';

// 使用预设状态
<StatusBadge status="active" />
<StatusBadge status="pending" showIcon />
<StatusBadge status="active" size="lg" variant="soft" />

// 自定义状态映射
<StatusBadge
  status="custom"
  statusMap={{
    custom: { label: '自定义状态', color: 'info', icon: <Star size={14} /> }
  }}
/>

// 可点击
<StatusBadge status="pending" clickable onClick={() => handleStatusClick('pending')} />
```

### 便捷子组件

`StatusBadge` 提供了带类型约束的便捷子组件：

- `EmployeeStatusBadge` - 员工状态
- `AttendanceStatusBadge` - 考勤状态
- `LeaveStatusBadge` - 请假状态
- `PayrollStatusBadge` - 薪酬状态
- `PerformanceStatusBadge` - 绩效状态
- `CustomerStatusBadge` - 客户状态
- `OpportunityStatusBadge` - 商机状态
- `ProjectStatusBadge` - 项目状态
- `WorkflowStatusBadge` - 工作流状态
- `FinanceStatusBadge` - 财务状态
- `ModuleStatusBadge` - 模块状态

### 注意事项

- `statusMap` 可与 `DEFAULT_STATUS_MAP` 合并使用，通过展开运算符覆盖特定状态
- `variant="soft"` 使用浅色背景 + 深色文字，适合信息密度较高的列表场景
- `variant="outlined"` 仅有边框，视觉最轻量

---

## DataTable

通用数据表格组件，基于 TanStack React Table 构建，支持搜索、排序、筛选、分页、行选择、导出、列持久化、行展开、虚拟滚动等功能。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `columns` | `ColumnDef<TData, TValue>[]` | - | **必填**。TanStack 列定义 |
| `data` | `TData[]` | - | **必填**。表格数据数组 |
| `searchKey` | `string` | - | 搜索字段名 |
| `searchPlaceholder` | `string` | - | 搜索框占位文字 |
| `showSearch` | `boolean` | - | 是否显示搜索框 |
| `showFilters` | `boolean` | - | 是否显示筛选按钮 |
| `showExport` | `boolean` | - | 是否显示导出按钮 |
| `showSelection` | `boolean` | - | 是否显示行选择框 |
| `showCreate` | `boolean` | - | 是否显示新建按钮 |
| `createLabel` | `string` | - | 新建按钮标签 |
| `onCreate` | `() => void` | - | 新建按钮回调 |
| `exportFileName` | `string` | - | 导出文件名 |
| `enablePagination` | `boolean` | - | 是否启用分页 |
| `totalPages` | `number` | - | 总页数 |
| `totalItems` | `number` | - | 总记录数 |
| `pageSize` | `number` | - | 每页条数 |
| `currentPage` | `number` | - | 当前页码（受控） |
| `onPageChange` | `(page: number) => void` | - | 页码变化回调 |
| `onPageSizeChange` | `(size: number) => void` | - | 每页条数变化回调 |
| `onRowClick` | `(row: TData) => void` | - | 行点击回调 |
| `onSelectionChange` | `(keys: Set<string> \| string[]) => void` | - | 选择变化回调 |
| `showRefresh` | `boolean` | - | 是否显示刷新按钮 |
| `onRefresh` | `() => void` | - | 刷新回调 |
| `loading` | `boolean` | - | 是否加载中（显示骨架屏） |
| `responsive` | `boolean` | - | 是否响应式布局 |
| `emptyMessage` | `string` | - | 空数据提示 |
| `getRowKey` | `(row: TData) => string` | - | 获取行 key 的函数 |
| `extraActions` | `ReactNode` | - | 额外操作按钮 |
| `sx` | `object` | - | 自定义样式 |
| `persistColumnConfig` | `boolean` | - | 是否启用列配置持久化（localStorage） |
| `columnConfigKey` | `string` | - | 列配置存储 key 前缀 |
| `enableRowExpansion` | `boolean` | - | 是否启用行展开 |
| `expandedRowRender` | `(row: TData) => ReactNode` | - | 行展开内容渲染 |
| `enableVirtualization` | `boolean` | - | 是否启用虚拟滚动 |
| `rowHeight` | `number` | - | 虚拟滚动行高（px） |
| `enableStickyHeader` | `boolean` | - | 是否固定表头 |
| `showRowNumber` | `boolean` | - | 是否显示行号 |
| `enableAdvancedFilter` | `boolean` | - | 是否启用高级筛选 |
| `advancedFilters` | `AdvancedFilter[]` | - | 高级筛选配置 |
| `striped` | `boolean` | - | 是否显示行条纹 |
| `compact` | `boolean` | - | 是否紧凑模式 |
| `emptyState` | `ReactNode` | - | 空状态自定义内容 |
| `selectionKey` | `keyof TData` | - | 选择 key |
| `selectedIds` | `string[]` | - | 已选中的 id 列表（受控） |

### 使用示例

```tsx
import { DataTable } from '@/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<User>[] = [
  { accessorKey: 'name', header: '姓名' },
  { accessorKey: 'email', header: '邮箱' },
  { accessorKey: 'department', header: '部门' },
];

<DataTable
  columns={columns}
  data={users}
  showSearch
  searchKey="name"
  searchPlaceholder="搜索姓名..."
  showSelection
  onSelectionChange={(keys) => console.log(keys)}
  enablePagination
  totalItems={100}
  pageSize={10}
  onPageChange={(page) => fetchUsers(page)}
  onRowClick={(row) => navigate(`/users/${row.id}`)}
  loading={isLoading}
/>
```

### 注意事项

- `columns` 使用 TanStack React Table 的 `ColumnDef` 类型，支持 accessorKey、accessorFn、cell 渲染等
- 服务端分页时需配合 `totalItems`、`pageSize`、`currentPage` 和 `onPageChange` 使用
- `persistColumnConfig` 会将列可见性和排序状态存入 localStorage，需设置唯一的 `columnConfigKey`
- 大数据量（>1000行）场景建议启用 `enableVirtualization` 并设置合理的 `rowHeight`

---

## EmptyState

空状态展示组件，用于列表无数据、搜索无结果、权限不足等场景。提供 4 个预设子组件。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `ReactNode` | - | 自定义图标 |
| `emoji` | `string` | - | emoji 图标（与 icon 二选一） |
| `title` | `string` | - | **必填**。标题文字 |
| `description` | `string` | - | 描述文字 |
| `action` | `{ label: string; onClick?: () => void; href?: string }` | - | 操作按钮配置 |
| `align` | `'center' \| 'left'` | `'center'` | 对齐方式 |
| `compact` | `boolean` | `false` | 紧凑模式（减小间距和图标尺寸） |
| `children` | `ReactNode` | - | 自定义内容 |

> `actionLabel` 和 `onAction` 已废弃，请使用 `action` 对象替代。

### 使用示例

```tsx
import { EmptyState, ListEmptyState, SearchEmptyState } from '@/components/common/EmptyState';

// 自定义空状态
<EmptyState
  icon={<Package size={40} />}
  title="暂无订单"
  description="您还没有创建任何订单，点击下方按钮开始创建"
  action={{ label: '创建订单', onClick: handleCreate }}
/>

// 预设空状态
<ListEmptyState title="暂无数据" actionLabel="添加" onAction={handleAdd} />
<SearchEmptyState keyword="测试" onClear={handleClearSearch} />
<PermissionEmptyState onRequest={handleRequestPermission} />
<ErrorEmptyState error="网络超时" onRetry={handleRetry} />
```

### 注意事项

- 内置预设：`ListEmptyState`（列表）、`SearchEmptyState`（搜索）、`PermissionEmptyState`（权限）、`ErrorEmptyState`（错误）
- 预设组件自动包裹 `Paper` 容器，自定义使用时需自行布局
- 组件设置了 `role="status"` 和 `aria-live="polite"`，具备无障碍支持

---

## DescriptionList

描述列表组件，用于展示键值对信息（如详情页、摘要面板）。支持网格/垂直布局、复制功能、响应式列数。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `items` | `DescriptionItem[]` | - | **必填**。描述项数组 |
| `columns` | `number \| { xs?; sm?; md?; lg? }` | `2` | 列数，支持响应式对象 |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | 布局方向 |
| `labelWidth` | `number \| string` | `80` (横向) / `120` (纵向) | 标签宽度 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `divider` | `boolean` | `false` | 是否显示分割线 |
| `sx` | `object` | - | 自定义样式 |
| `gap` | `number` | `3` | 网格间距（MUI spacing 单位） |

### DescriptionItem

| 属性 | 类型 | 说明 |
|------|------|------|
| `label` | `string` | 标签文字 |
| `value` | `ReactNode` | 值内容 |
| `span` | `number \| 'full'` | 跨列数（`'full'` 占满整行） |
| `copyable` | `boolean` | 是否显示复制按钮 |
| `tooltip` | `string` | 悬停提示 |
| `loading` | `boolean` | 是否显示加载骨架屏 |

### 使用示例

```tsx
import { DescriptionList } from '@/components/common/DescriptionList';

<DescriptionList
  items={[
    { label: '订单编号', value: 'ORD-2024-001', copyable: true },
    { label: '客户名称', value: '某某科技有限公司' },
    { label: '金额', value: '¥12,500.00', span: 'full' },
    { label: '状态', value: <StatusBadge status="processing" /> },
    { label: '创建时间', value: '2024-01-15 10:30', loading: isLoading },
  ]}
  columns={2}
  divider
/>
```

### 注意事项

- 移动端（`< sm` 断点）自动切换为单列布局
- `copyable` 仅在 `value` 为 `string` 类型时生效，点击后复制到剪贴板并显示成功图标 2 秒
- `span="full"` 让该项占满整行宽度

---

## Avatar

头像组件，支持图片、首字母、状态指示器、徽标数字、头像组。支持多种尺寸和形状变体。

### Avatar Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | - | 头像图片 URL |
| `name` | `string` | - | 姓名（用于生成首字母） |
| `label` | `string` | - | 自定义显示文字（优先于 name 生成） |
| `size` | `AvatarSize` | `'md'` | 尺寸：`xs`(24px) / `sm`(32px) / `md`(40px) / `lg`(56px) / `xl`(72px) |
| `variant` | `'circular' \| 'rounded' \| 'square'` | `'circular'` | 形状变体 |
| `color` | `string` | `'primary'` | 主题色（无 src 时用于背景） |
| `bgColor` | `string` | - | 自定义背景色 |
| `status` | `AvatarStatus` | - | 在线状态：`online` / `offline` / `busy` / `away` |
| `statusColor` | `string` | - | 自定义状态指示色 |
| `badge` | `number \| string` | - | 徽标数字 |
| `badgeColor` | `'primary' \| 'secondary' \| 'error' \| 'warning' \| 'success' \| 'info'` | `'error'` | 徽标颜色 |
| `onClick` | `() => void` | - | 点击回调（出现悬停动效） |
| `sx` | `SxProps<Theme>` | - | 自定义 MUI sx 样式 |
| `children` | `ReactNode` | - | 自定义内容 |

### AvatarGroup Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `avatars` | `Array<Omit<CustomAvatarProps, 'size'>>` | - | **必填**。头像配置数组 |
| `max` | `number` | `5` | 最大显示数量 |
| `size` | `AvatarSize` | `'md'` | 统一尺寸 |
| `spacing` | `number` | - | 头像重叠间距 |
| `sx` | `SxProps<Theme>` | - | 自定义样式 |

### 使用示例

```tsx
import { Avatar, AvatarGroup } from '@/components/common/Avatar';

// 基础用法
<Avatar src="/avatar.jpg" name="张三" />
<Avatar name="张三" size="lg" status="online" />
<Avatar name="ABC Corp" size="sm" badge={3} badgeColor="error" />

// 头像组
<AvatarGroup
  avatars={[
    { src: '/user1.jpg', name: '张三' },
    { src: '/user2.jpg', name: '李四' },
    { name: '王五' },
  ]}
  max={3}
  size="md"
/>
```

### 注意事项

- `name` 为英文名时取首尾字母大写（如 `John Doe` -> `JD`），中文时取前两个字符
- `status` 指示器位于右下角，大小为头像尺寸的 28%，带白色边框
- 无 `src` 时自动使用 `color` 对应的 `light` 背景色和 `dark` 文字色

---

## Timeline

时间线组件，支持垂直/水平方向、多种状态图标、尺寸和变体。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `items` | `TimelineItem[]` | - | **必填**。时间线条目数组 |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | 排列方向 |
| `variant` | `'outlined' \| 'filled' \| 'soft'` | `'filled'` | 样式变体 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `sx` | `object` | - | 自定义样式 |
| `onItemClick` | `(item: TimelineItem) => void` | - | 条目点击回调 |

### TimelineItem

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识 |
| `title` | `string` | 标题 |
| `description` | `string` | 描述文字 |
| `time` | `string` | 时间文字 |
| `status` | `'completed' \| 'pending' \| 'active' \| 'error' \| 'warning' \| 'info'` | 状态 |
| `icon` | `ReactNode` | 自定义图标 |
| `color` | `string` | 自定义颜色 |
| `content` | `ReactNode` | 自定义内容（渲染在描述和时间下方） |
| `loading` | `boolean` | 是否显示加载态 |

### 使用示例

```tsx
import { Timeline } from '@/components/common/Timeline';

<Timeline
  items={[
    { id: '1', title: '订单创建', time: '2024-01-10 09:00', status: 'completed' },
    { id: '2', title: '支付确认', time: '2024-01-10 09:15', status: 'completed' },
    { id: '3', title: '仓库拣货', time: '2024-01-10 14:00', status: 'active' },
    { id: '4', title: '物流运输', status: 'pending' },
    { id: '5', title: '签收确认', status: 'pending' },
  ]}
  orientation="vertical"
  size="medium"
  variant="filled"
/>
```

### 注意事项

- `variant="outlined"` 仅显示图标边框，背景透明
- `variant="soft"` 使用浅色背景 + 深色图标，视觉柔和
- 垂直模式下自动绘制连接线，水平模式自动绘制连接横线
- `onItemClick` 提供时，图标悬停有 `scale(1.1)` 动效

---

## TabPanel

标签页内容面板组件，配合 MUI Tabs 使用。内置加载态和空态处理。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `children` | `ReactNode` | - | 面板内容 |
| `index` | `number` | - | **必填**。面板索引 |
| `value` | `number` | - | **必填**。当前激活的 Tab 索引 |
| `loading` | `boolean` | - | 是否加载中（显示骨架屏） |
| `emptyMessage` | `string` | - | 空数据提示文字 |

### 使用示例

```tsx
import { Tabs, Tab } from '@mui/material';
import { TabPanel } from '@/components/common/TabPanel';

function MyTabs() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="基本信息" />
        <Tab label="操作记录" />
      </Tabs>
      <TabPanel value={tab} index={0} loading={loading}>
        基本信息内容
      </TabPanel>
      <TabPanel value={tab} index={1} emptyMessage="暂无操作记录">
        操作记录内容
      </TabPanel>
    </>
  );
}
```

### 注意事项

- 当 `value !== index` 时组件返回 `null`，不渲染 DOM
- 自动设置 `role="tabpanel"` 和 `aria-labelledby` 属性
- 加载态显示 4 个矩形骨架屏块

---

## FormFieldGroup

表单字段分组组件，支持可折叠、多列布局、提示信息和必填标识。使用 `fieldset`/`legend` 语义标签。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | - | **必填**。分组标题 |
| `description` | `string` | - | 描述文字（sm 以上断点显示） |
| `tooltip` | `string` | - | 标题旁提示信息 |
| `children` | `ReactNode` | - | **必填**。表单子元素 |
| `collapsible` | `boolean` | `false` | 是否可折叠 |
| `defaultExpanded` | `boolean` | `true` | 默认展开状态 |
| `columns` | `number` | - | 网格列数（设置后使用 Grid 布局） |
| `gap` | `number` | `2` | 子元素间距（MUI spacing 单位） |
| `required` | `boolean` | - | 是否显示红色必填星号 |
| `sx` | `object` | - | 自定义样式 |

### 使用示例

```tsx
import { FormFieldGroup } from '@/components/common/FormFieldGroup';

<FormFieldGroup
  title="基本信息"
  description="填写员工的基本个人信息"
  tooltip="所有带 * 的字段为必填项"
  required
  columns={2}
  collapsible
>
  <TextField label="姓名" fullWidth required />
  <TextField label="工号" fullWidth required />
  <TextField label="部门" fullWidth />
  <TextField label="职位" fullWidth />
</FormFieldGroup>
```

### 注意事项

- 使用 `<Box component="fieldset">` 和 `<Box component="legend">` 语义标签
- 标题栏背景色为 `grey.50`，与内容区有分割线
- 折叠时箭头图标旋转 -90 度，过渡 200ms
- `description` 在 `xs` 断点下隐藏，仅在 `sm` 及以上显示

---

## ConfirmDialog

增强版确认对话框，支持多种类型（alert/confirm/info/success/warning/error）、自定义按钮、拖拽、加载态等功能。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `isOpen` | `boolean` | - | **必填**。是否打开 |
| `onClose` | `() => void` | - | **必填**。关闭回调 |
| `onConfirm` | `() => Promise<void> \| void` | - | 确认回调（支持异步） |
| `title` | `string` | - | **必填**。标题 |
| `message` | `ReactNode` | - | 消息内容 |
| `type` | `DialogType` | `'confirm'` | 类型：`alert` / `confirm` / `prompt` / `info` / `success` / `warning` / `error` |
| `confirmLabel` | `string` | `'确认'` | 确认按钮文字 |
| `cancelLabel` | `string` | `'取消'` | 取消按钮文字 |
| `confirmColor` | `DialogButtonType` | `'primary'` | 确认按钮颜色：`primary` / `secondary` / `success` / `warning` / `error` |
| `danger` | `boolean` | `false` | 是否为危险操作（确认按钮变为红色） |
| `size` | `DialogSize` | `'md'` | 尺寸：`xs`(280px) / `sm`(360px) / `md`(480px) / `lg`(640px) / `xl`(800px) |
| `confirmDisabled` | `boolean` | `false` | 确认按钮是否禁用 |
| `closable` | `boolean` | `true` | 是否可通过关闭按钮或 ESC 关闭 |
| `showCloseButton` | `boolean` | `false` | 是否显示右上角关闭按钮 |
| `draggable` | `boolean` | `false` | 是否支持拖拽移动 |
| `icon` | `ReactNode` | - | 自定义图标（覆盖类型默认图标） |
| `buttons` | `DialogButton[]` | - | 自定义按钮列表（设置后覆盖默认按钮） |
| `children` | `ReactNode` | - | 自定义内容 |
| `showTitle` | `boolean` | `true` | 是否显示标题 |
| `showMessage` | `boolean` | `true` | 是否显示消息 |
| `centered` | `boolean` | `true` | 是否居中显示 |
| `closeOnBackdropClick` | `boolean` | `true` | 点击遮罩是否关闭 |
| `showSuccessIcon` | `boolean` | `false` | 是否显示居中大成功图标 |
| `sx` | `object` | - | 自定义样式 |

### DialogButton

| 属性 | 类型 | 说明 |
|------|------|------|
| `label` | `string` | 按钮文字 |
| `onClick` | `() => void` | 点击回调 |
| `type` | `DialogButtonType` | 颜色类型 |
| `primary` | `boolean` | 是否为主要按钮（contained 样式） |
| `loading` | `boolean` | 是否显示加载态 |
| `disabled` | `boolean` | 是否禁用 |

### 使用示例

```tsx
import ConfirmDialog from '@/components/common/ConfirmDialog';

// 基础确认对话框
<ConfirmDialog
  isOpen={open}
  onClose={() => setOpen(false)}
  onConfirm={handleDelete}
  title="确认删除"
  message="确定要删除这条记录吗？此操作不可撤销。"
  danger
/>

// 成功提示
<ConfirmDialog
  isOpen={open}
  onClose={handleClose}
  title="操作成功"
  message="数据已成功保存"
  type="success"
  showSuccessIcon
/>

// 自定义按钮
<ConfirmDialog
  isOpen={open}
  onClose={handleClose}
  title="请选择操作"
  buttons={[
    { label: '导出 Excel', onClick: handleExport, primary: true },
    { label: '导出 PDF', onClick: handleExportPdf },
    { label: '取消', onClick: handleClose },
  ]}
/>
```

### 便捷子组件

- `AlertDialog` - 警告对话框（`type="alert"`，无取消按钮）
- `InfoDialog` - 信息对话框
- `SuccessDialog` - 成功对话框（自动启用 `showSuccessIcon`）
- `WarningDialog` - 警告对话框
- `ErrorDialog` - 错误对话框
- `ConfirmationDialog` - 标准确认对话框

### 注意事项

- `onConfirm` 支持 `Promise`，组件自动管理加载状态
- 异步 `onConfirm` 完成后会自动关闭对话框并触发通知（仅 `type="success"` 时发送成功通知）
- `danger` 会将确认按钮颜色设为 `error.dark`
- `type="alert"` 和 `type="success"` 只显示确认按钮，不显示取消按钮

---

## FilterBar

筛选栏组件，支持多种筛选控件类型（文本/下拉/多选/日期/日期范围/数字）、可折叠、重置、搜索等功能。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `filters` | `FilterConfig[]` | - | **必填**。筛选配置数组 |
| `onFilterChange` | `(filters: Record<string, any>) => void` | - | 筛选变化回调（返回所有筛选值） |
| `onReset` | `() => void` | - | 重置回调 |
| `onSearch` | `() => void` | - | 搜索按钮回调 |
| `collapsible` | `boolean` | `true` | 是否可折叠 |
| `defaultExpanded` | `boolean` | `true` | 默认展开 |
| `dense` | `boolean` | `false` | 紧凑模式（减小内边距） |
| `variant` | `'standard' \| 'outlined' \| 'filled'` | `'outlined'` | 输入框变体 |

### FilterConfig

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 筛选项唯一标识 |
| `label` | `string` | 标签文字 |
| `type` | `'select' \| 'multiselect' \| 'date' \| 'dateRange' \| 'text' \| 'number' \| 'search'` | 控件类型，默认 `text` |
| `placeholder` | `string` | 占位文字 |
| `options` | `{ value: string \| number; label: string }[]` | 选项列表（select/multiselect） |
| `value` | `any` | 受控值 |
| `defaultValue` | `any` | 默认值（用于重置） |
| `onChange` | `(value: any, filter: FilterConfig) => void` | 单个筛选项变化回调 |
| `width` | `number \| string` | 控件宽度 |
| `searchable` | `boolean` | 是否可搜索（multiselect） |

### 使用示例

```tsx
import { FilterBar } from '@/components/common/FilterBar';

<FilterBar
  filters={[
    { id: 'keyword', label: '关键词', type: 'text', placeholder: '输入关键词...' },
    { id: 'status', label: '状态', type: 'select', options: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '禁用' },
    ]},
    { id: 'department', label: '部门', type: 'multiselect', options: deptOptions },
    { id: 'dateRange', label: '日期范围', type: 'dateRange' },
  ]}
  onFilterChange={(filters) => fetchData(filters)}
  onReset={() => fetchData({})}
  onSearch={() => triggerSearch()}
  collapsible
/>
```

### 注意事项

- 组件使用 `Paper` 容器包裹，自带 `mb: 2` 下边距
- 折叠后显示已激活筛选条件数量（Chip 标记）
- 移动端折叠时额外显示"已应用 N 个筛选条件"提示
- `dateRange` 类型渲染为两个日期输入框中间用"至"连接
- `multiselect` 使用 MUI Select 的 `multiple` 属性，`renderValue` 逗号分隔显示
