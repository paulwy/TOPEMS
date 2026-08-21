# TOPEMS 页面模板选型规范

> 版本：V1.0  
> 状态：草案 / 待评审  
> 制定时间：2026-08-21  
> 关联文档：[`design-system-implementation-plan.md`](./design-system-implementation-plan.md)、[`shared-component-guidelines.md`](./shared-component-guidelines.md)

---

## 1. 目的

统一 TOPEMS 全站页面模板选型标准，确保新增页面使用合适的标准模板与共享子组件，降低重复开发，提升页面一致性。

## 2. 适用范围

- 所有 `apps/web/src/pages/**/*.tsx` 新增/重构页面
- 所有涉及页面模板、共享组件、布局组件的 PR

## 3. 模板选型速查表

| 模板 | 适用页面 | 必须使用的子组件 | 禁用场景 |
|------|----------|------------------|----------|
| `crud` | Schema 驱动的完整增删改查页 | `CrudPage` | 需要高度自定义交互或复杂工作流的页面 |
| `list` | 数据列表、查询表格 | `ListPageTemplate`、`PageHeader`、`DataTable`、`Pagination` | 纯可视化大屏、无表格数据 |
| `detail` | 详情页、审批记录、只读信息展示 | `DetailPageTemplate`、`PageContainer`、`StatusBadge`、`Card` | 表单编辑页、大量可编辑字段 |
| `form` | 新建/编辑表单页 | `FormPageTemplate`、`FormField` 系列 | 只读详情页、无表单提交 |
| `dashboard` | 首页、统计看板、驾驶舱 | `DashboardTemplate`、`StatCard`、`ChartCard` | 单一表格页、纯列表页 |
| `kanban` | 任务/工单/状态看板 | `KanbanPageTemplate`、`KanbanBoard` | 复杂表单、纯表格数据 |
| `tree` | 树形数据、组织架构、分类管理 | `TreePageTemplate`、`TreeBuilder` | 平级列表、无层级关系 |
| `stats` | 统计分析页、报表汇总 | `StatsPageTemplate`、`ChartCard`、`StatCardGroup` | 普通列表、纯表格 |
| `settings` | 系统设置、个人设置、模块配置 | `SettingsPageTemplate`、`SettingsLayout` | 数据展示、复杂审批流程 |
| `wizard` | 分步表单、引导式配置 | `WizardPageTemplate`、`Stepper` | 单步表单、无步骤依赖 |
| `timeline` | 时间轴、历史记录、流程轨迹 | `TimelinePageTemplate`、`Timeline` | 非时间序列数据 |
| `card-list` | 卡片列表、媒体库、资源网格 | `CardListTemplate`、`Card` | 数据密集型表格 |
| `master-detail` | 主从布局、左侧列表右侧详情 | `MasterDetailPageTemplate`、`MasterDetailLayout` | 无关联数据、单详情页 |
| `markdown-editor` | 文档编辑、知识库条目 | `MarkdownEditorTemplate`、`MarkdownEditor` | 富文本需求复杂、需要 WYSIWYG |
| `report-designer` | 报表设计器、打印模板配置 | `ReportDesignerTemplate` | 普通表格页、非设计场景 |
| `gis-map` | GIS 地图、设备轨迹、空间数据 | `GisMapTemplate`、`MapView` | 非地图场景 |

## 4. 模板详细规范

### 4.1 CRUD 模板

**适用场景**

- 80% 以上的标准数据管理页：列表 + 新建 + 编辑 + 详情 + 删除
- 字段可通过 JSON Schema 描述
- 业务逻辑以配置为主，无需重度自定义 UI

**必须使用的子组件**

- `CrudPage`（顶层模板）
- 由 `CrudPage` 内部封装：`ListPageTemplate`、`FormBuilder`、`DetailView`、`DataTable`、`Pagination`

**不推荐场景**

- 需要复杂自定义列渲染、嵌入表单、流程审批
- 页面内包含多个独立数据实体

**正例**

```tsx
// ✅ 标准 CRUD 页
import { CrudPage } from '@/components/templates';

const CustomerCrudPage = () => (
  <CrudPage
    resource="customer"
    title="客户管理"
    schema={customerSchema}
    columns={customerColumns}
  />
);
```

**反例**

```tsx
// ❌ 在 CrudPage 内再包一层自定义表格和表单
import { CrudPage } from '@/components/templates';
import { CustomTable } from './CustomTable'; // 自研表格

const CustomerPage = () => (
  <CrudPage resource="customer">
    <CustomTable /> {/* 破坏模板一致性 */}
  </CrudPage>
);
```

---

### 4.2 List 模板

**适用场景**

- 以表格为核心的数据浏览、查询、导出页面
- 需要搜索栏、筛选器、分页
- 行操作：查看、编辑、删除

**必须使用的子组件**

- `ListPageTemplate`
- `PageHeader`
- `DataTable`
- `Pagination`
- `FilterBar`（当存在筛选条件时）
- `EmptyState`（空状态）

**不推荐场景**

- 纯可视化大屏（应使用 `dashboard`）
- 数据以卡片为主（应使用 `card-list`）
- 无分页的少量固定数据

**正例**

```tsx
// ✅ 列表页
import {
  ListPageTemplate,
  type ColumnDef,
} from '@/components/templates';
import { DataTable, Pagination, PageHeader, FilterBar } from '@/components/common';

const OrderListPage = () => (
  <ListPageTemplate
    header={<PageHeader title="订单管理" actions={<Button>新建订单</Button>} />}
    filters={<FilterBar configs={orderFilters} />}
    table={<DataTable columns={orderColumns} data={orders} />}
    pagination={<Pagination page={page} pageSize={pageSize} total={total} />}
  />
);
```

**反例**

```tsx
// ❌ 自研表格 + 无分页
import { Box, Table, TableBody, TableCell } from '@mui/material';

const OrderListPage = () => (
  <Box>
    <Table>{/* 手写表格 */}</Table>
  </Box>
);
```

---

### 4.3 Detail 模板

**适用场景**

- 单条记录只读详情展示
- 审批记录、日志详情、订单详情
- 需要状态标签、关联信息、操作按钮

**必须使用的子组件**

- `DetailPageTemplate`
- `PageContainer`
- `StatusBadge`
- `Card`
- `RelativeTime`（时间字段）

**不推荐场景**

- 表单编辑页（应使用 `form`）
- 需要大量实时交互

**正例**

```tsx
// ✅ 详情页
import { DetailPageTemplate } from '@/components/templates';
import { StatusBadge, RelativeTime } from '@/components/common';

const OrderDetailPage = () => (
  <DetailPageTemplate
    title="订单详情"
    status={<StatusBadge status={order.status} />}
    info={[
      { label: '订单号', value: order.code },
      { label: '创建时间', value: <RelativeTime date={order.createdAt} /> },
    ]}
  />
);
```

**反例**

```tsx
// ❌ 用表单组件做只读详情
import { TextField } from '@mui/material';

const OrderDetailPage = () => (
  <TextField label="订单号" value={order.code} disabled /> // 只读不应使用表单
);
```

---

### 4.4 Form 模板

**适用场景**

- 新建、编辑、配置类页面
- 包含表单校验与提交
- 分字段分组展示

**必须使用的子组件**

- `FormPageTemplate`
- `FormField` 系列：`FormInput`、`FormSelect`、`FormDatePicker`、`FormRadioGroup`
- `ActionButton`（提交/取消）

**不推荐场景**

- 只读详情页（应使用 `detail`）
- 无表单提交逻辑

**正例**

```tsx
// ✅ 表单页
import { FormPageTemplate } from '@/components/templates';
import { FormInput, FormSelect, FormDatePicker } from '@/components/form';

const CustomerFormPage = () => (
  <FormPageTemplate title="新建客户" onSubmit={handleSubmit}>
    <FormInput name="name" label="客户名称" required />
    <FormSelect name="industry" label="行业" options={industries} />
    <FormDatePicker name="signDate" label="签约日期" />
  </FormPageTemplate>
);
```

**反例**

```tsx
// ❌ 使用原生 MUI 控件零散拼装
import { TextField, Select, MenuItem } from '@mui/material';

const CustomerFormPage = () => (
  <>
    <TextField label="名称" />
    <Select>
      <MenuItem>行业 1</MenuItem>
    </Select>
  </>
);
```

---

### 4.5 Dashboard 模板

**适用场景**

- 系统首页、模块入口
- 统计看板、驾驶舱
- 需要 KPI 卡片、图表、快捷入口

**必须使用的子组件**

- `DashboardTemplate`
- `StatCard` / `StatCardGroup`
- `ChartCard`
- 可选：`QuickActions`、`RecentList`

**不推荐场景**

- 单一表格页（应使用 `list`）
- 纯表单配置页（应使用 `form`）

**正例**

```tsx
// ✅ Dashboard
import { DashboardTemplate } from '@/components/templates';
import { StatCardGroup, ChartCard } from '@/components/dashboard';

const HomeDashboard = () => (
  <DashboardTemplate>
    <StatCardGroup stats={kpiStats} />
    <ChartCard title="月度产量" chart={<LineChart data={productionData} />} />
  </DashboardTemplate>
);
```

**反例**

```tsx
// ❌ 在 Dashboard 内直接放完整 DataTable
import { DashboardTemplate } from '@/components/templates';
import { DataTable } from '@/components/common';

const HomeDashboard = () => (
  <DashboardTemplate>
    <DataTable columns={columns} data={data} /> {/* 应拆分到列表页 */}
  </DashboardTemplate>
);
```

---

### 4.6 Kanban 模板

**适用场景**

- 任务/工单/订单按状态拖拽看板
- 需要状态流转可视化

**必须使用的子组件**

- `KanbanPageTemplate`
- `KanbanBoard`
- `KanbanColumn`
- `KanbanCard`

**不推荐场景**

- 复杂表单页（应使用 `form`）
- 纯表格数据（应使用 `list`）

---

### 4.7 Tree 模板

**适用场景**

- 树形层级数据：组织架构、产品分类、BOM
- 左侧树 + 右侧详情/列表

**必须使用的子组件**

- `TreePageTemplate`
- `TreeBuilder`
- `TreeNode`

**不推荐场景**

- 平级列表数据（应使用 `list`）

---

### 4.8 Stats 模板

**适用场景**

- 统计汇总页、BI 轻量报表
- 多图表组合

**必须使用的子组件**

- `StatsPageTemplate`
- `ChartCard`
- `StatCardGroup`

**不推荐场景**

- 普通列表页（应使用 `list`）

---

### 4.9 Settings 模板

**适用场景**

- 系统设置、个人设置
- 左侧菜单 + 右侧内容

**必须使用的子组件**

- `SettingsPageTemplate`
- `SettingsLayout`
- `SettingsMenu`

**不推荐场景**

- 数据展示页（应使用 `detail`/`list`）

---

### 4.10 Wizard 模板

**适用场景**

- 分步表单、引导式配置
- 步骤之间有依赖关系

**必须使用的子组件**

- `WizardPageTemplate`
- `Stepper`
- `StepContent`

**不推荐场景**

- 单步表单（应使用 `form`）

---

### 4.11 Timeline 模板

**适用场景**

- 时间轴展示：操作日志、审批历史、订单轨迹

**必须使用的子组件**

- `TimelinePageTemplate`
- `Timeline`
- `TimelineItem`

**不推荐场景**

- 非时间序列数据

---

### 4.12 Card-List 模板

**适用场景**

- 卡片网格：媒体库、资源管理、项目卡片

**必须使用的子组件**

- `CardListTemplate`
- `Card`
- `Pagination`

**不推荐场景**

- 数据密集型表格（应使用 `list`）

---

### 4.13 Master-Detail 模板

**适用场景**

- 主从布局：左侧列表、右侧详情
- 需要频繁切换主记录查看详情

**必须使用的子组件**

- `MasterDetailPageTemplate`
- `MasterDetailLayout`
- `DataTable` / `List`（左侧）
- `DetailPanel`（右侧）

**不推荐场景**

- 无关联数据

---

### 4.14 Markdown-Editor 模板

**适用场景**

- 文档编辑、知识库条目
- Markdown 内容管理

**必须使用的子组件**

- `MarkdownEditorTemplate`
- `MarkdownEditor`

**不推荐场景**

- 复杂富文本（应使用专业编辑器）

---

### 4.15 Report-Designer 模板

**适用场景**

- 报表设计器、打印模板配置

**必须使用的子组件**

- `ReportDesignerTemplate`

**不推荐场景**

- 普通表格页（应使用 `list`）

---

### 4.16 GIS-Map 模板

**适用场景**

- GIS 地图、设备轨迹、空间数据

**必须使用的子组件**

- `GisMapTemplate`
- `MapView`

**不推荐场景**

- 非地图场景

---

## 5. 选型决策流程

```
页面需求
  │
  ├─ 是否以数据表格为主？
  │     ├─ 是 → 是否需要完整 CRUD？
  │     │     ├─ 是  → crud
  │     │     └─ 否  → list
  │     └─ 否
  │
  ├─ 是否只读单条信息？
  │     └─ 是 → detail
  │
  ├─ 是否新建/编辑表单？
  │     ├─ 分步？ wizard
  │     └─ 单步？ form
  │
  ├─ 是否统计看板/首页？
  │     └─ 是 → dashboard / stats
  │
  ├─ 是否看板拖拽？
  │     └─ 是 → kanban
  │
  ├─ 是否树形层级？
  │     └─ 是 → tree
  │
  ├─ 是否左侧列表右侧详情？
  │     └─ 是 → master-detail
  │
  ├─ 是否设置页？
  │     └─ 是 → settings
  │
  ├─ 是否时间轴？
  │     └─ 是 → timeline
  │
  ├─ 是否卡片网格？
  │     └─ 是 → card-list
  │
  ├─ 是否 Markdown/报表/GIS？
  │     └─ 是 → markdown-editor / report-designer / gis-map
  │
  └─ 以上皆否 → 与设计师/前端架构评审
```

## 6. 验收检查清单

新增/重构页面前，PR 作者必须确认：

- [ ] 已根据本规范选择合适的页面模板
- [ ] 已使用 `PageContainer` 包裹页面内容
- [ ] 已使用模板要求的必选子组件
- [ ] 未使用禁用场景下的错误模板
- [ ] 未自研表格、自定义按钮变体
- [ ] 已通过 `node scripts/design-system-audit/scan.mjs` 扫描并复核结果

## 7. 更新记录

| 版本 | 时间 | 变更内容 |
|------|------|----------|
| V1.0 | 2026-08-21 | 初稿，覆盖 15 种页面模板选型规范 |
