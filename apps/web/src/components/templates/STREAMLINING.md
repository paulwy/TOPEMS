# 页面模板体系精简（V23.0）

将原 15 个模板类型重组为 **5 个核心模板 + 10 个扩展模板** 的分层架构，降低认知成本、提升默认体验、按需加载扩展能力。

---

## 一、精简前的模板清单（15 个）

> 旧版（V22）按使用频率分三层，共 15 个模板类型。

### 高频（4 个）
| 类型 | 组件 | 用途 |
| --- | --- | --- |
| `list` | `ListPageTemplate` | 数据列表 / CRUD 管理 / 查询结果 |
| `detail` | `DetailPageTemplate` | 详情查看 / 信息展示 |
| `form` | `FormPageTemplate` | 新增 / 编辑 / 数据录入 |
| `dashboard` | `DashboardTemplate` | 模块首页 / 数据概览 |

### 中频（5 个）
| 类型 | 组件 | 用途 |
| --- | --- | --- |
| `tree` | `TreePageTemplate` | 组织架构 / 分类管理 / 层级数据 |
| `stats` | `StatsPageTemplate` | 数据报表 / 统计分析 |
| `settings` | `SettingsPageTemplate` | 系统设置 / 参数配置 |
| `kanban` | `KanbanPageTemplate` | 任务看板 / 状态流转 |
| `card-list` | `CardListTemplate` | 产品展示 / 卡片列表 |

### 低频（6 个）
| 类型 | 组件 | 用途 |
| --- | --- | --- |
| `wizard` | `WizardPageTemplate` | 分步表单 / 引导流程 |
| `timeline` | `TimelinePageTemplate` | 操作日志 / 历史记录 |
| `master-detail` | `MasterDetailPageTemplate` | 主从表 / 关联数据 |
| `markdown-editor` | `MarkdownEditorTemplate` | 文档编辑 / 知识库 |
| `report-designer` | `ReportDesignerTemplate` | 自定义报表 / 数据透视 |
| `gis-map` | `GisMapTemplate` | 地理信息 / 设备定位 |

---

## 二、精简后的分层架构

```
templates/
├── core/                       # 5 个核心模板（覆盖 80% 场景，默认导入）
│   └── index.ts                # re-export: List/Form/Detail/Dashboard/Kanban
│
├── extensions/                 # 10 个扩展模板（按需导入，建议 lazy import）
│   └── index.ts                # re-export: Tree/Stats/Settings/Wizard/...
│
├── *.tsx                       # 原 .tsx 文件原地保留，未移动
│
└── index.ts                    # 顶层聚合：core + extensions + 兼容别名 + 分类
```

### 分层导出关系

```
@/components/templates
  ├── @/components/templates/core         (5 个核心)
  ├── @/components/templates/extensions   (10 个扩展)
  ├── PageHeader                          (通用组件)
  ├── classification.ts                   (分类与推荐)
  └── TemplateDemoPage                    (辅助工具)
```

---

## 三、5 个核心模板说明

### 1. `ListPageTemplate` — 列表页

- **场景**：数据列表、CRUD 管理、查询结果、审批列表
- **扩展能力**：通过 `ExpandedRowRenderProps` 支持树形扩展，覆盖原 `TreePageTemplate` 场景
- **关键类型**：`ListPageTemplateProps`、`ColumnDef`、`FilterConfig`、`RowAction`、`BatchAction`
- **推荐使用场景**：替代 `tree`、`card-list`（通过自定义渲染）

### 2. `FormPageTemplate` — 表单页

- **场景**：新增数据、编辑数据、表单填写
- **扩展能力**：通过 `FormSection` 分段 + `FieldDependency` 联动，可承载复杂表单
- **关键类型**：`FormPageTemplateProps`、`FormField`、`FormSection`、`FieldDependency`
- **推荐使用场景**：可承担简单向导场景；复杂多步流程仍推荐使用 `WizardPageTemplate`

### 3. `DetailPageTemplate` — 详情页

- **场景**：详情查看、信息展示
- **扩展能力**：通过 `TabConfig` 多 Tab + `SectionConfig` 分区，可承载主从详情场景
- **关键类型**：`DetailPageTemplateProps`、`TabConfig`、`SectionConfig`、`DetailField`
- **推荐使用场景**：替代 `master-detail`（主表使用 List，从表使用 Detail 多 Tab）

### 4. `DashboardTemplate` — 仪表盘

- **场景**：模块首页、数据概览、管理驾驶舱、统计看板
- **扩展能力**：通过 `StatCard` + `ChartCard` 组合，可承载轻量统计分析场景
- **关键类型**：`DashboardTemplateProps`、`StatCard`、`ChartCard`、`RecentItem`、`QuickAction`
- **推荐使用场景**：替代 `stats`（重分析场景仍推荐 `StatsPageTemplate`）

### 5. `KanbanPageTemplate` — 看板页

- **场景**：任务看板、状态流转、进度跟踪
- **关键类型**：`KanbanPageTemplateProps`、`KanbanCard`、`KanbanColumn`、`KanbanAction`、`KanbanStats`

---

## 四、10 个扩展模板说明

| 类型 | 组件 | 推荐触发条件 | 替代方案（核心模板） |
| --- | --- | --- | --- |
| `tree` | `TreePageTemplate` | 强层级交互（拖拽、批量操作） | `ListPageTemplate` + 树形扩展 |
| `stats` | `StatsPageTemplate` | 多图表 + 数据表格的报表页 | `DashboardTemplate` |
| `settings` | `SettingsPageTemplate` | 系统设置 / 偏好配置 | 无（独占场景） |
| `wizard` | `WizardPageTemplate` | 多步表单 + 步骤校验 | `FormPageTemplate`（简单分步） |
| `timeline` | `TimelinePageTemplate` | 时间线 / 历史记录 | `DetailPageTemplate`（自定义渲染） |
| `card-list` | `CardListTemplate` | 纯卡片网格 + 指标卡 | `ListPageTemplate`（卡片视图） |
| `master-detail` | `MasterDetailPageTemplate` | 主从表联动 | `ListPageTemplate` + `DetailPageTemplate` |
| `markdown-editor` | `MarkdownEditorTemplate` | 文档编辑 / 知识库 | 无（独占场景） |
| `report-designer` | `ReportDesignerTemplate` | 可视化报表设计器 | 无（独占场景） |
| `gis-map` | `GisMapTemplate` | 地理信息 / 轨迹追踪 | 无（独占场景） |

---

## 五、迁移指南

### 5.1 导入路径完全兼容

所有 `from '@/components/templates'` 的现有导入**无需修改**，继续有效。

```typescript
// ✅ 旧代码无需改动
import {
  ListPageTemplate,
  TreePageTemplate,
  type TreeStatCard,
  type StatsStatCard,
} from '@/components/templates';
```

### 5.2 新代码推荐分层导入

```typescript
// ✅ 推荐：从核心层导入（默认场景）
import {
  ListPageTemplate,
  FormPageTemplate,
  type ListPageTemplateProps,
} from '@/components/templates/core';

// ✅ 推荐：从扩展层导入（按需场景）
import { TreePageTemplate } from '@/components/templates/extensions';

// ✅ 推荐：扩展模板的动态导入（减少首屏 bundle）
const StatsPageTemplate = React.lazy(
  () => import('@/components/templates/extensions').then(m => ({ default: m.StatsPageTemplate }))
);
```

### 5.3 类型导入迁移

| 旧写法 | 新写法（推荐） |
| --- | --- |
| `import type { ListPageTemplateProps } from '@/components/templates'` | `import type { ListPageTemplateProps } from '@/components/templates/core'` |
| `import type { TreePageTemplateProps } from '@/components/templates'` | `import type { TreePageTemplateProps } from '@/components/templates/extensions'` |
| `import type { StatCard } from '@/components/templates'` | `import type { StatCard } from '@/components/templates/core'`（明确来自 Dashboard） |

### 5.4 别名类型（向后兼容）

以下别名继续从顶层 `@/components/templates` 导出，业务代码无需修改：

- `TreeStatCard`（来自 `TreePageTemplate`）
- `StatsStatCard`（来自 `StatsPageTemplate`）
- `CardFilterConfig`（来自 `CardListTemplate`）
- `MasterSortConfig`、`MasterPaginationConfig`（来自 `MasterDetailPageTemplate`）

### 5.5 分类常量迁移

| 旧写法 | 新写法 |
| --- | --- |
| `CORE_8_TEMPLATES`（8 个） | `CORE_TEMPLATES`（5 个核心）+ `EXTENSION_TEMPLATES`（10 个扩展） |
| `getHighFrequencyTemplates()` | 仍可用；或按 `isCore` 字段筛选 |

> `CORE_8_TEMPLATES` 作为兼容别名保留，等价于 `CORE_TEMPLATES + tree + stats + settings`。

### 5.6 `recommendTemplate` 行为变更

| dataType | 旧推荐 | 新推荐 | 说明 |
| --- | --- | --- | --- |
| `list` | `list` | `list` | 核心 |
| `detail` | `detail` | `detail` | 核心 |
| `form` | `form` | `form` | 核心 |
| `dashboard` | `dashboard` | `dashboard` | 核心 |
| `tree` | `tree` | `list` ⚠️ | 优先核心（ListPageTemplate 含树形扩展） |
| `chart` | `stats` | `dashboard` ⚠️ | 优先核心（DashboardTemplate 含 ChartCard） |
| `settings` | `settings` | `settings` | 扩展（无核心替代） |

---

## 六、最佳实践

### 6.1 选型原则

1. **优先核心**：默认从 5 个核心模板中选型
2. **核心 + 配置**：通过 props 配置组合，先用核心模板满足需求
3. **再选扩展**：核心模板确实无法满足时，再引入对应扩展
4. **独占场景**：`settings`、`markdown-editor`、`report-designer`、`gis-map` 无核心替代，直接使用扩展

### 6.2 性能优化

```typescript
// ✅ 扩展模板使用 React.lazy 动态导入
const ReportDesignerTemplate = React.lazy(
  () => import('@/components/templates/ReportDesignerTemplate')
);

// ✅ 仅在路由级别按需加载
const routes = [
  {
    path: '/report/designer',
    element: (
      <React.Suspense fallback={<Spin />}>
        <ReportDesignerTemplate {...} />
      </React.Suspense>
    ),
  },
];
```

### 6.3 类型导入规范

- 业务页面优先从 `core` 或 `extensions` 子路径导入类型，便于依赖分析
- 跨模块共享的类型仍可从顶层 `@/components/templates` 导入

### 6.4 TemplateSelector 自动推荐

`recommendTemplate` 已更新为优先返回核心模板：

```typescript
import { recommendTemplate } from '@/components/templates';

recommendTemplate('tree');    // → 'list'      (核心，含树形扩展)
recommendTemplate('chart');   // → 'dashboard' (核心，含 ChartCard)
recommendTemplate('settings');// → 'settings'  (扩展，无核心替代)
```

---

## 七、文件清单

### 新增文件
- `templates/core/index.ts` — 5 个核心模板聚合导出
- `templates/extensions/index.ts` — 10 个扩展模板聚合导出
- `templates/STREAMLINING.md` — 本文档

### 修改文件
- `templates/index.ts` — 重写为分层导出 + 向后兼容别名
- `templates/classification.ts` — 新增 `CORE_TEMPLATES`、`EXTENSION_TEMPLATES`、`isCore` 字段，更新 `recommendTemplate`

### 未变动文件
- 所有 `*.tsx` 模板实现文件**原地保留**，未移动、未重命名
- `PageHeader.tsx`、`TemplateDemoPage.tsx` 等辅助文件未变动

---

## 八、验证

```bash
cd /Users/xingzhai/TOPEMS/apps/web && npx tsc --noEmit
```

预期输出：**0 errors**（已通过验证）。
