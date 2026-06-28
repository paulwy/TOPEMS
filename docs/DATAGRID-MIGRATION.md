# DataTable 迁移至 MUI X DataGrid Pro 评估文档

> **文档版本:** 1.0
> **创建日期:** 2026-06-28
> **影响范围:** `packages/shared-components`、`apps/web` 全部使用 DataTable 的页面（约 20 个）
> **前置依赖:** 需安装 `@mui/x-data-grid-pro`

---

## 目录

1. [概述](#1-概述)
2. [Feature Comparison Matrix — 功能对比矩阵](#2-feature-comparison-matrix--功能对比矩阵)
3. [Migration Strategy — 迁移策略](#3-migration-strategy--迁移策略)
4. [API Mapping — 接口映射](#4-api-mapping--接口映射)
5. [Risk Assessment — 风险评估](#5-risk-assessment--风险评估)
6. [Recommendation — 建议](#6-recommendation--建议)
7. [附录](#7-附录)

---

## 1. 概述

### 1.1 现状

TOPEMS 项目当前使用自定义 `DataTable` 组件（约 1370 行），基于 `@tanstack/react-table` 构建，位于 `packages/shared-components/src/components/DataTable.tsx`。该组件经过持续迭代，已支持搜索、排序、过滤、分页、行选择、导出（CSV/Excel/PDF）、列配置持久化、行展开、虚拟滚动、粘性表头、高级筛选和斑马纹等功能。

### 1.2 迁移动机

| 驱动因素 | 说明 |
|---------|------|
| **性能瓶颈** | 自定义虚拟滚动为基本实现，大数据量场景（>10,000 行）存在性能问题，缺少行高自适应、按需渲染等高级优化 |
| **功能缺失** | 缺少列分组、列固定、行固定、树形数据、聚合统计、剪贴板操作等高级功能，多个业务场景已提出需求 |
| **维护成本** | 组件已膨胀至 ~1370 行，功能持续增加导致代码复杂度上升，修复与测试成本递增 |
| **生态优势** | MUI X DataGrid Pro 提供内置的服务端数据模式、Excel 式过滤、列自动调整大小等开箱即用功能 |
| **国际化** | 自定义表格手动处理中文翻译，DataGrid Pro 内置 `zh-CN` 语言包 |

### 1.3 使用现状

当前共有 **38 个文件**引用了 DataTable（含类型导出、测试和 Storybook），实际页面组件约 **20 个**。高数据量页面包括：

- `MonitorMetricsPage` — 监控指标，数据量可达数万条
- `ConsolidationReportsPage` — 合并报表，复杂多级数据
- `FinanceReportsPage` — 财务报表，大数据集 + 复杂筛选
- `FlowWorkflowPage` — 工作流实例列表
- `CRMSalesForecastPage` — CRM 销售预测
- `ExternalErpMappingPage` — ERP 映射表
- `SrmFinancePage` — SRM 财务数据

---

## 2. Feature Comparison Matrix — 功能对比矩阵

### 2.1 核心功能对比

| 功能特性 | 自定义 DataTable | MUI X DataGrid Pro | 差异说明 |
|---------|:---:|:---:|---------|
| **虚拟滚动** | 基础实现（固定行高） | 高级实现（支持可变行高、`rowHeight`、`getRowHeight`） | Pro 的虚拟滚动引擎更成熟，支持动态行高，DOM 复用更高效 |
| **列分组 (Column Grouping)** | 不支持 | 支持（`columnGroupingModel`） | 多级表头、嵌套列分组，适用于财务报表等多维度数据展示 |
| **列固定 (Column Pinning)** | 不支持 | 支持（`pinnedColumns`） | 左右固定列，适用于 ID 列、操作列固定场景 |
| **行固定 (Row Pinning)** | 不支持 | 支持（`pinnedRows`） | 固定关键行（如合计行），始终可见 |
| **过滤** | 基础文本过滤 + 高级筛选对话框 | Excel 式过滤面板（`filterModel`、`GridFilterForm`） | Pro 内置操作符：contains、equals、startsWith、>、<、between 等 |
| **列宽调整 (Column Resizing)** | 不支持 | 支持（`resizable` + `autosizeOptions`） | 拖拽调整列宽 + 自动适配内容宽度 |
| **导出** | CSV、Excel (xls)、PDF（通过 `exportData` 自定义） | CSV（内置）+ 可扩展 | Pro 内置仅 CSV 导出，Excel/PDF 需借助 `@mui/x-data-grid-export` 或自定义 |
| **行展开 (Row Expansion)** | 支持（`expandedRowRender`） | 支持（`detailPanel` Slot） | API 不同，均可实现自定义展开内容 |
| **树形数据 (Tree Data)** | 不支持 | 支持（`treeData` + `getTreeDataPath`） | 层级结构数据展示，适用于组织架构、BOM 等场景 |
| **聚合/分组 (Aggregation/Grouping)** | 不支持 | 支持（`aggregationModel`、`groupingColDef`） | 列级聚合函数：sum、avg、min、max、count |
| **服务端数据 (Server-side)** | 手动实现（`onPageChange` + `onPageSizeChange`） | 内置模式（`sortingMode="server"` 等） | Pro 提供 `onFetchData` 统一接口，自动管理加载状态 |
| **剪贴板 (Clipboard)** | 不支持 | 支持（`clipboardCopy` / `clipboardPaste`） | Excel 风格的复制粘贴操作 |
| **国际化 (Localization)** | 手动中文硬编码 | 内置 `zh-CN` 语言包 | Pro 提供完整的中文界面翻译，包括分页、过滤提示等 |
| **搜索** | 单字段搜索（`searchKey`） | 全局 Quick Filter（`quickFilterValues`） | Pro 支持多字段快速过滤，可通过 `quickFilterParser` 自定义 |
| **排序** | 单列/多列排序 | 单列/多列排序（`sortModel`） | 功能等价 |
| **分页** | 客户端/服务端 | 客户端/服务端（`paginationModel`） | 功能等价，Pro 支持更灵活的分页控制 |
| **行选择** | 单选/多选（Checkbox） | 单选/多选（Checkbox + 点击选择） | 功能等价，Pro 支持 `disableMultipleRowSelection` |
| **列配置持久化** | 手动 localStorage 存储 | 需自定义实现 | 自定义 DataTable 的持久化方案可保留至 Adapter 层 |
| **粘性表头 (Sticky Header)** | 通过 `enableStickyHeader` prop | 默认行为（DataGrid 内部滚动） | Pro 的滚动容器天然包含粘性表头 |
| **斑马纹 (Striped Rows)** | 支持（`striped` prop） | 需通过 `sx` 或 CSS 实现 | 可在主题层统一样式处理 |
| **紧凑模式** | 支持（`compact` prop） | 支持（`density="compact"`） | 功能等价 |
| **加载状态** | Skeleton 占位 | 内置 `loading` overlay | Pro 内置更优雅的加载指示器 |
| **空状态** | 自定义 `emptyMessage` | 自定义 `noRowsOverlay` Slot | 均可自定义 |

### 2.2 DataGrid Pro 独有功能（增量价值）

| 功能 | 业务价值 | 适用页面 |
|------|---------|---------|
| **列分组** | 财务报表多级维度表头 | ConsolidationReportsPage, FinanceReportsPage |
| **列固定** | 锁定 ID/操作列 | 所有含操作列的页面 |
| **行固定** | 锁定汇总行/关键记录 | SrmFinancePage, ConsolidationReportsPage |
| **聚合统计** | 底部自动汇总 sum/avg | FinanceReportsPage, MonitorMetricsPage |
| **树形数据** | 层级结构展示 | CompanyStructurePage, EhsHazardDetailPage |
| **剪贴板** | Excel 风格复制粘贴 | ExternalErpMappingPage, 所有表格页面 |
| **Excel 式过滤** | 多操作符组合筛选 | MonitorMetricsPage, CRMSalesForecastPage |
| **列自动调整宽度** | 自适应内容宽度 | 所有页面 |

---

## 3. Migration Strategy — 迁移策略

### 3.1 总体原则

- **渐进式迁移**：不做一次性全量替换，通过 Adapter 层平滑过渡
- **API 兼容**：ProDataTable 封装层保持与 DataTable 一致的对外接口，消费端零改动
- **风险可控**：从低风险、高收益页面开始，逐步扩大范围
- **向后兼容**：迁移期间新旧组件并存，不做破坏性变更

### 3.2 分阶段计划

#### Phase A：基础设施准备（预计 1 周）

**目标**：安装依赖、建立主题集成、创建基础类型定义

| 任务 | 说明 | 产出 |
|------|------|------|
| 安装 `@mui/x-data-grid-pro` | 在 `packages/shared-components` 中安装 Pro 包 | `package.json` 更新 |
| 创建 DataGrid 主题集成 | 在 `apps/web/src/theme/dataGridTheme.ts` 中定义主题覆盖 | `dataGridTheme.ts` |
| 集成至主主题 | 在 `createCustomTheme()` 中合并 DataGrid 主题 | `theme.ts` 更新 |
| 定义 Adapter 类型 | 创建 `ProDataTable.types.ts` 类型定义文件 | `ProDataTable.types.ts` |
| 添加 zh-CN 语言包 | 配置 `localeText` 为中文 | 语言配置文件 |

**验证标准**：
- DataGrid Pro 能在项目中正常渲染
- 主题与现有设计系统一致（颜色、边框、字体）
- 中文界面正常显示

#### Phase B：ProDataTable 封装层（预计 2 周）

**目标**：创建 ProDataTable 适配器组件，对外暴露与 DataTable 一致的 API

| 任务 | 说明 | 产出 |
|------|------|------|
| 创建 `ProDataTable.tsx` 组件 | 包装 DataGrid Pro，实现 DataTable 全部 props | `ProDataTable.tsx` |
| 实现列定义转换 | `migrateColumn()` 函数将 `ColumnDef` 转为 `GridColDef` | 类型转换逻辑 |
| 实现导出兼容 | 保留 CSV/Excel/PDF 导出能力 | 导出工具函数 |
| 实现列配置持久化 | 适配 localStorage 存储到 DataGrid 的 `columnVisibilityModel` | 持久化逻辑 |
| 实现行展开适配 | 将 `expandedRowRender` 转为 `detailPanel` | 展开面板适配 |
| 实现搜索适配 | 将 `searchKey` 搜索转为 Quick Filter | 搜索桥接逻辑 |
| 创建 Storybook | 为 ProDataTable 创建交互式 Story | Storybook stories |

**验证标准**：
- ProDataTable 接受与 DataTable 完全相同的 props
- 所有现有 DataTable 功能在 ProDataTable 中可用
- 导出功能（CSV/Excel/PDF）正常工作

#### Phase C：高优先级页面迁移（预计 2 周）

**目标**：迁移大数据量、功能需求迫切的页面

优先迁移页面及理由：

| 页面 | 迁移理由 | 预期收益 |
|------|---------|---------|
| `MonitorMetricsPage` | 数据量大（>10,000 行），需要虚拟滚动优化 + Excel 式过滤 | 性能提升 50%+，过滤效率大幅提高 |
| `ConsolidationReportsPage` | 合并报表需要列分组、聚合统计 | 新增列分组和底部汇总功能 |
| `FinanceReportsPage` | 财务报表需要列固定、聚合、高级筛选 | 新增列固定和聚合功能 |
| `MonitorAlertsPage` | 告警数据量大，需要快速筛选 | 性能提升，筛选体验优化 |
| `CRMSalesForecastPage` | 销售预测需要多维度过滤和聚合 | 新增聚合和高级过滤 |

**迁移方式**：
```tsx
// 迁移前
import { DataTable } from '@topems/shared-components';

// 迁移后
import { ProDataTable } from '@topems/shared-components';
// 其余代码无需改动
```

**验证标准**：
- 所有迁移页面功能验证通过
- 性能指标达标（首屏渲染、滚动流畅度）
- 视觉一致性检查

#### Phase D：剩余页面迁移（预计 3 周）

**目标**：迁移全部剩余使用 DataTable 的页面

剩余页面清单：

| 页面 | 备注 |
|------|------|
| `TenantManagementPage` | 租户管理 |
| `TenantBillingPage` | 租户计费 |
| `TenantDetailPage` | 租户详情 |
| `CompanyStructurePage` | 可利用树形数据功能 |
| `FlowWorkflowPage` | 工作流实例 |
| `FlowStatisticsPage` | 工作流统计 |
| `ExternalErpMappingPage` | 可利用剪贴板功能 |
| `SrmFinancePage` | 可利用行固定和聚合功能 |
| `EhsHazardDetailPage` | 可利用树形数据功能 |
| `LimsTaskDetailPage` | LIMS 任务详情 |
| `LimsSampleDetailPage` | LIMS 样品详情 |
| `ConsolidationScopePage` | 合并范围 |
| 其他辅助页面 | 模板、示例等 |

**验证标准**：
- 全部页面迁移完成
- 无 DataTable 引用残留（除 ProDataTable 内部兼容层外）
- 回归测试通过

#### Phase E：废弃旧组件（预计 1 周）

| 任务 | 说明 |
|------|------|
| 标记 DataTable 为 `@deprecated` | 添加 JSDoc 标记和控制台警告 |
| 清理无用的 TanStack Table 依赖 | 确认无其他组件依赖后移除 `@tanstack/react-table` |
| 更新文档 | 更新组件文档和 Storybook |
| 删除旧代码 | Phase D 完成后 2 个版本周期删除 DataTable |

---

## 4. API Mapping — 接口映射

### 4.1 Props 映射表

| 自定义 DataTable Prop | MUI X DataGrid Pro 等效 | 适配说明 |
|----------------------|----------------------|---------|
| `columns: ColumnDef[]` | `columns: GridColDef[]` | 需通过 `migrateColumn()` 转换 |
| `data: TData[]` | `rows: GridRowModel[]` | 直接映射 |
| `searchKey` | `quickFilterKeys` + `quickFilterValues` | 适配为 Quick Filter |
| `searchPlaceholder` | 自定义 Toolbar Slot | 在 ProDataTable 封装层实现 |
| `showSearch` | 自定义 Toolbar Slot | 条件渲染搜索框 |
| `showFilters` | 自定义 Toolbar Slot | 条件渲染过滤按钮 |
| `showExport` | 自定义 Toolbar Slot | 条件渲染导出按钮 |
| `showSelection` | `checkboxSelection` | 直接映射 |
| `showCreate` | 自定义 Toolbar Slot | 在 ProDataTable 封装层实现 |
| `createLabel` | 自定义 Toolbar Slot | 同上 |
| `onCreate` | 自定义 Toolbar Slot | 同上 |
| `exportFileName` | 自定义导出逻辑 | 保留自定义导出函数 |
| `exportData` | 自定义导出逻辑 | 保留自定义导出函数 |
| `enablePagination` | `pagination` | 直接映射 |
| `totalPages` | `rowCount` + 计算 | Pro 使用 `rowCount` |
| `totalItems` | `rowCount` | 直接映射 |
| `pageSize` | `paginationModel.pageSize` | 结构变化 |
| `currentPage` | `paginationModel.page` | 0-indexed 一致 |
| `onPageChange` | `onPaginationModelChange` | 回调签名变化 |
| `onPageSizeChange` | `onPaginationModelChange` | 合并到同一回调 |
| `onRowClick` | `onRowClick` | 回调签名略有差异 |
| `onSelectionChange` | `onRowSelectionModelChange` | 回调签名变化（Set -> Array） |
| `showRefresh` | 自定义 Toolbar Slot | 在 ProDataTable 封装层实现 |
| `onRefresh` | 自定义 Toolbar Slot | 同上 |
| `loading` | `loading` | 直接映射 |
| `responsive` | CSS/容器自适应 | 使用 MUI 的 `sx` 和断点 |
| `emptyMessage` | 自定义 `noRowsOverlay` Slot | 需封装 |
| `getRowKey` | `getRowId` | 函数签名一致 |
| `extraActions` | 自定义 Toolbar Slot | 在 ProDataTable 封装层实现 |
| `sx` | `sx` | 直接映射 |
| `persistColumnConfig` | 自定义 Hook | 在 ProDataTable 层实现 |
| `columnConfigKey` | 自定义 Hook | 同上 |
| `enableRowExpansion` | `detailPanel` Slot | 需适配 |
| `expandedRowRender` | `detailPanel` Slot | 签名不同，需转换 |
| `enableVirtualization` | 默认行为 | DataGrid Pro 天然支持虚拟滚动 |
| `rowHeight` | `rowHeight` / `getRowHeight` | 直接映射 |
| `enableStickyHeader` | 默认行为 | DataGrid Pro 内部滚动容器自带 |
| `showRowNumber` | 自定义列 | 需添加序号列 |
| `enableAdvancedFilter` | `filterModel` + `filterMode` | 使用 Pro 的过滤面板 |
| `advancedFilters` | `filterModel` + 自定义面板 | 需适配 |
| `striped` | CSS 样式 | 在主题层或 `sx` 中实现 |
| `compact` | `density="compact"` | 直接映射 |
| `selectionKey` | `getRowId` | 转换思路 |
| `selectedIds` | `rowSelectionModel` | 类型差异（Set -> Array） |

### 4.2 回调签名差异

```typescript
// === 选择回调 ===

// 自定义 DataTable
onSelectionChange?: (keys: Set<string> | string[]) => void;

// DataGrid Pro
onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;
// GridRowSelectionModel = (number | string)[]

// === 分页回调 ===

// 自定义 DataTable
onPageChange?: (page: number) => void;
onPageSizeChange?: (size: number) => void;

// DataGrid Pro
onPaginationModelChange?: (model: GridPaginationModel) => void;
// GridPaginationModel = { page: number; pageSize: number; }

// === 行点击 ===

// 自定义 DataTable
onRowClick?: (row: TData) => void;

// DataGrid Pro
onRowClick?: (params: GridRowClickParams) => void;
// GridRowClickParams = { row; id; ... }
```

### 4.3 列定义转换

```typescript
// 自定义 DataTable 列定义
interface ColumnDef<TData, TValue> {
  id: string;
  header: string;
  accessorKey?: string;
  size?: number;
  minSize?: number;
  cell?: (value: TValue, row: TData, index: number) => ReactNode;
  enableSorting?: boolean;
}

// DataGrid Pro 列定义
interface GridColDef {
  field: string;
  headerName?: string;
  width?: number;
  minWidth?: number;
  renderCell?: (params: GridRenderCellParams) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
}
```

---

## 5. Risk Assessment — 风险评估

### 5.1 破坏性变更风险

| 风险项 | 风险等级 | 影响 | 缓解措施 |
|--------|:------:|------|---------|
| **Props API 不兼容** | 中 | 20 个页面需适配 | ProDataTable 适配层完全兼容旧 API，消费端零改动 |
| **回调签名变化** | 中 | 选择、分页回调参数不同 | 适配层内部转换，对外保持旧签名 |
| **导出功能降级** | 中 | DataGrid Pro 内置仅支持 CSV | 在 ProDataTable 适配层保留自定义导出逻辑 |
| **列配置持久化** | 低 | Pro 不内置持久化 | 适配层复用现有 localStorage 逻辑 |
| **行展开 API 差异** | 低 | `expandedRowRender` vs `detailPanel` | 适配层转换 |
| **打包体积增加** | 中 | DataGrid Pro 增加约 100-200KB (gzip) | Tree-shaking 优化；仅 ProDataTable 页面引入 |
| **暗色模式兼容** | 低 | 需确保 DataGrid 主题适配暗色模式 | 主题集成文件中处理 |

### 5.2 学习曲线

| 角色 | 学习内容 | 预估时间 |
|------|---------|---------|
| **前端开发者** | DataGrid Pro API、GridColDef 定义、Slot 自定义 | 2-3 天 |
| **QA 测试** | 新组件的交互测试、回归测试 | 1-2 天 |
| **设计师** | DataGrid Pro 的视觉调整、主题定制 | 1 天 |

### 5.3 打包体积影响

| 包 | 未压缩 | Gzip | 备注 |
|----|-------|------|------|
| `@tanstack/react-table` | ~45KB | ~15KB | 迁移后可移除 |
| `@mui/x-data-grid-pro` | ~500KB | ~150KB | 新增依赖 |
| **净增加** | ~455KB | ~135KB | - |

> 注意：实际体积取决于 Tree-shaking 效果和使用的功能模块。DataGrid Pro 支持模块化导入，可进一步优化体积。

### 5.4 依赖版本兼容

| 依赖 | 要求版本 | 当前项目版本 | 兼容性 |
|------|---------|-------------|--------|
| `@mui/material` | >= 5.15.0 | 已安装 | 需确认版本 >= 5.15.0 |
| `@mui/x-data-grid-pro` | >= 7.0.0 | 未安装 | 需新安装 |
| `React` | >= 18.0.0 | 已安装 | 兼容 |

---

## 6. Recommendation — 建议

### 6.1 迁移优先级排序

基于 **技术收益** 和 **业务影响** 两个维度评估：

| 优先级 | 页面 | 理由 |
|:------:|------|------|
| **P0** | MonitorMetricsPage | 大数据量，性能瓶颈明显，虚拟滚动收益最大 |
| **P0** | ConsolidationReportsPage | 新增列分组和聚合功能，业务需求迫切 |
| **P1** | FinanceReportsPage | 财务数据需要列固定和聚合 |
| **P1** | MonitorAlertsPage | 告警数据量大，需要高级过滤 |
| **P1** | CRMSalesForecastPage | 多维度过滤和聚合 |
| **P2** | FlowWorkflowPage | 工作流实例管理 |
| **P2** | SrmFinancePage | 财务数据，可利用行固定和聚合 |
| **P2** | ExternalErpMappingPage | 可利用剪贴板功能 |
| **P3** | CompanyStructurePage | 可利用树形数据 |
| **P3** | EhsHazardDetailPage | 可利用树形数据 |
| **P3** | 其余页面 | 功能需求不迫切，标准迁移 |

### 6.2 时间线预估

```
Week 1  : Phase A — 基础设施准备
Week 2-3 : Phase B — ProDataTable 适配层开发
Week 4-5 : Phase C — P0/P1 页面迁移
Week 6-8 : Phase D — P2/P3 页面迁移
Week 9   : Phase E — 废弃旧组件、清理依赖
```

**总计：约 9 周（含测试和缓冲时间）**

### 6.3 不迁移的场景

以下情况建议保留自定义 DataTable 或采用替代方案：

- **移动端列表**：`MobileDataTable` 组件适用于移动端，DataGrid Pro 不适合小屏幕，保持现有实现
- **极简表格**：若表格只有 2-3 列、数据量 <100 行，使用 DataGrid Pro 可能过度工程化
- **高度定制交互**：若表格需要特殊的拖拽排序、行内编辑联动等 DataGrid Pro 不原生支持的交互

### 6.4 长期架构建议

1. **统一数据层**：迁移完成后，考虑引入 `useDataGrid` 自定义 Hook 统一管理服务端数据获取逻辑
2. **设计系统整合**：将 DataGrid 主题配置纳入 `@topems/tokens` 设计令牌体系
3. **组件库导出**：在 `packages/shared-components/src/index.ts` 中导出 ProDataTable
4. **文档更新**：更新 `docs/guides/ui/component-migration-guide.md` 和 Storybook

---

## 7. 附录

### 7.1 相关文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 自定义 DataTable | `packages/shared-components/src/components/DataTable.tsx` | 当前组件实现 |
| DataGrid 主题集成 | `apps/web/src/theme/dataGridTheme.ts` | 新建 — 主题覆盖 |
| ProDataTable 类型定义 | `packages/shared-components/src/components/ProDataTable.types.ts` | 新建 — 类型映射 |
| 现有主题 | `apps/web/src/theme/theme.ts` | 需集成 DataGrid 主题 |
| 设计令牌 | `packages/tokens/src/tokens.ts` | 设计系统基础 |

### 7.2 参考链接

- [MUI X DataGrid Pro 官方文档](https://mui.com/x/react-data-grid/)
- [MUI X DataGrid Pro API Reference](https://mui.com/x/api/data-grid/data-grid-pro/)
- [DataGrid Pro vs DataGrid 功能对比](https://mui.com/x/react-data-grid/#commercial-features)
- [DataGrid Pro 主题定制](https://mui.com/x/react-data-grid/style/)
- [DataGrid Pro 迁移指南](https://mui.com/x/react-data-grid/migration/)

### 7.3 术语表

| 术语 | 说明 |
|------|------|
| **DataGrid Pro** | MUI X 提供的高级数据网格组件（商业许可） |
| **ProDataTable** | 本项目中基于 DataGrid Pro 封装的适配器组件 |
| **DataTable** | 本项目现有的自定义表格组件 |
| **Quick Filter** | DataGrid Pro 的快速过滤功能，可跨多列搜索 |
| **detailPanel** | DataGrid Pro 的行展开面板机制 |
| **GridColDef** | DataGrid Pro 的列定义类型 |
| **pinnedColumns** | DataGrid Pro 的列固定配置 |
| **aggregationModel** | DataGrid Pro 的聚合模型 |
