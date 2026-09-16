# 组件重复分析报告

> 生成时间：2026-09-14
> 目的：识别 `components/common/` 与 `components/redesign/` 中功能重复的组件，为后续清理和迁移提供依据。

## 一、名称完全相同的组件（3个）

| 组件名 | redesign 位置 | common 位置 | 建议 |
|--------|---------------|-------------|------|
| `DataTable` | `redesign/data/DataTable.tsx` | `common/DataTable.tsx` | 新页面使用 redesign 版本，旧页面迁移后删除 common 版本 |
| `Drawer` | `redesign/overlay/Drawer.tsx` | `common/Drawer.tsx` | 同上 |
| `EmptyState` | `redesign/feedback/EmptyState.tsx` | `common/EmptyState.tsx` | 同上 |

## 二、功能相似的组件（12组）

### 2.1 基础组件

| redesign 组件 | common 对应组件 | 功能说明 |
|---------------|-----------------|----------|
| `Button` | `ActionButton` | 按钮组件 |
| `Alert` | `AlertCard`, `AlertPanel` | 警告/提示组件 |
| `Badge` | `PriorityBadge`, `StatusBadge`, `StatusChip` | 徽标/状态标签 |
| `Tag` | `StatusChip` | 标签组件 |
| `Card` | `StatCard`, `MuiStatCard`, `RelatedModuleCard` | 卡片组件 |
| `Toggle` | （无直接对应） | 开关组件 |
| `Input` | `FormField`, `NumberFields` | 输入框组件 |
| `Select` | `FormSelect`, `DepartmentSelect`, `MasterDataSelector`, `UserSelect` | 选择器组件 |
| `Tabs` | `ExtendedTab`, `TabPanel` | 标签页组件 |

### 2.2 反馈组件

| redesign 组件 | common 对应组件 | 功能说明 |
|---------------|-----------------|----------|
| `Toast` | （无直接对应，使用 MUI Snackbar） | 全局通知 |
| `LoadingOverlay` | `LoadingSpinner`, `SkeletonScreen` | 加载状态 |
| `ErrorState` | （无直接对应） | 错误状态 |

### 2.3 浮层组件

| redesign 组件 | common 对应组件 | 功能说明 |
|---------------|-----------------|----------|
| `Modal` | `Dialog`, `ConfirmDialog`, `FormDialog` | 模态框 |
| `Tooltip` | `HelpButton` | 提示气泡 |

### 2.4 数据展示

| redesign 组件 | common 对应组件 | 功能说明 |
|---------------|-----------------|----------|
| `StatTile` | `StatCard`, `MuiStatCard` | 统计卡片 |
| `StatusLight` | `StatusBadge`, `StatusChip` | 状态指示 |
| `TrendLine` | （无直接对应） | 迷你趋势图 |
| `FilterChip` | `AdvancedFilter` | 筛选标签 |

## 三、redesign 独有组件（common 中无对应）

| 组件 | 分类 | 说明 |
|------|------|------|
| `AppShell` | layout | 应用外壳（新布局核心） |
| `TopBar` | layout | 顶部栏 |
| `SideRail` | layout | 侧边导航 |
| `PageHeader` | layout | 页面标题 |
| `ListPageTemplate` | templates | 列表页模板 |
| `FormPageTemplate` | templates | 表单页模板 |
| `DetailPageTemplate` | templates | 详情页模板 |

## 四、common 独有组件（redesign 中无对应）

这些组件在新设计系统中暂未实现，迁移相关页面时需要补充或保留：

| 组件 | 功能 | 迁移优先级 |
|------|------|------------|
| `Avatar`, `UserAvatar` | 用户头像 | 高 |
| `DateRangePicker`, `DateRangeQuickSelect` | 日期范围选择 | 高 |
| `FileUpload`, `ImageUpload` | 文件上传 | 高 |
| `FormBuilder`, `FormFields`, `FormFieldGroup` | 表单构建器 | 中 |
| `TreeView` | 树形视图 | 中 |
| `Stepper` | 步骤条 | 中 |
| `Timeline`, `StatusTimeline` | 时间线 | 中 |
| `DataExport` | 数据导出 | 中 |
| `Pagination`（如有） | 分页 | 高 |
| `RichTextEditor`（如有） | 富文本编辑器 | 低 |

## 五、清理策略

### 阶段 1：标记与记录（当前）
- ✅ 完成重复组件识别
- ⏳ 记录每个 common 组件的使用页面

### 阶段 2：逐步替换（页面迁移时）
- 迁移页面时，优先使用 redesign 组件
- 对于 redesign 中没有的组件，先在 redesign 中补充，再替换
- 每迁移一个页面，检查是否减少了对 common 组件的依赖

### 阶段 3：删除清理（所有页面迁移完成后）
- 删除名称完全相同的 common 组件（DataTable/Drawer/EmptyState）
- 删除功能已被 redesign 替代的 common 组件
- 保留 common 中独有的、redesign 未实现的组件

## 六、使用统计（2026-09-14）

### 整体使用情况

| 指标 | 数值 |
|------|------|
| 通过 `@/components/common` 统一导入的页面 | 272 个 |
| 通过具体路径导入的页面 | 11 个 |
| common/index.ts 导出组件数 | 58 个 |
| 已迁移页面使用 common 组件 | 0 个（完全使用 redesign） |

### 重复组件使用统计

| 组件 | 使用页面数 | 说明 |
|------|-----------|------|
| `DataTable` | 8 个 | 仍被未迁移页面使用 |
| `Drawer` | 0 个 | 可能通过统一导入 |
| `EmptyState` | 0 个 | 可能通过统一导入 |

### 使用 common 组件最多的页面（前5）

| 页面 | common 导入数 |
|------|--------------|
| `wms/WmsInboundDetailPage.tsx` | 3 |
| `lims/LimsTaskDetailPage.tsx` | 2 |
| `lims/LimsSampleDetailPage.tsx` | 2 |
| `hrm/HrmEmployeeDetailPage.tsx` | 2 |
| `ehs/EhsHazardDetailPage.tsx` | 2 |

### 关键发现

1. **已迁移的 10 个页面完全不依赖 common 组件** — 新页面已全面使用 redesign 组件库
2. **common 组件被 272 个未迁移页面广泛使用** — 不能直接删除，需等页面迁移完成
3. **详情页是 common 组件的重度使用者** — 后续迁移详情页时需重点关注组件替换

## 七、下一步行动

1. **统计 common 组件使用情况** — 搜索每个组件在 `src/pages/` 中的引用
2. **补充 redesign 缺失组件** — 优先补充高优先级组件（Avatar、DateRangePicker、FileUpload、Pagination）
3. **制定组件迁移指南** — 说明如何从 common 组件迁移到 redesign 组件
4. **逐步清理** — 随页面迁移逐步删除重复组件
