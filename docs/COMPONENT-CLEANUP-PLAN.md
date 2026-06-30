# 组件去重迁移计划

> 目标：消除 `apps/web/src/components/common/` 与 `packages/shared-components/src/components/` 之间的重复组件，
> 统一从 `@topems/shared-components` 导入。

---

## 1. 重复组件清单与对比

| # | 组件名 | 分类 | 差异说明 | 迁移策略 |
|---|--------|------|----------|----------|
| 1 | **FormField** | IDENTICAL | 两份代码完全相同（接口定义、组件实现、导入均一致） | 删除 web 版本，barrel 直接 re-export from shared |
| 2 | **FormSelect** | IDENTICAL | 两份代码完全相同（接口、导入、实现一致） | 删除 web 版本，barrel 直接 re-export from shared |
| 3 | **ActionButton** | IDENTICAL | 两份代码完全相同（类型定义、props 接口、导入一致） | 删除 web 版本，barrel 直接 re-export from shared |
| 4 | **Pagination** | IDENTICAL | 接口与实现几乎完全一致；web 版仅多了 `sx` 和 `disabled` 两个可选属性 | 删除 web 版本，将 `sx`/`disabled` 补充到 shared 版后统一导入 |
| 5 | **Stepper** | IDENTICAL | 脉冲动画、导入、接口结构完全一致；web 版用 `styled` 引入而 shared 用 `useTheme`，但功能等价 | 删除 web 版本，barrel 直接 re-export from shared |
| 6 | **EmptyState** | IDENTICAL | 接口定义完全一致（含 `@deprecated` 兼容属性）；web 版多了 `useTheme` 导入（实际未在前 30 行使用） | 删除 web 版本，barrel 直接 re-export from shared |
| 7 | **FilterBar** | IDENTICAL | 类型定义与导入完全一致；web 版多了 `FilterValue` 类型导出 | 删除 web 版本，将 `FilterValue` 类型补充到 shared 版后统一导入 |
| 8 | **StatusBadge** | WEB EXTENDED | 共享版移除部分图标（`TrendingUp`, `Target`, `Award`, `Phone`, `Mail`, `Shield`, `Unlock`, `EyeOff` 等），图标映射更精简 | web 版保留为扩展包装器，基于 shared 版增加缺失图标映射 |
| 9 | **ProgressBar** | WEB EXTENDED | 共享版尺寸用 `small/medium/large`，web 版用 `sm/md/lg`；web 版额外导出 `styled` 和 `CircularProgress` | web 版保留为适配层，将 `sm/md/lg` 映射到 shared 的尺寸名 |
| 10 | **RelativeTime** | WEB EXTENDED | 共享版使用 `@topems/shared-utils` 的 `formatRelativeTime`，props 更精简（去掉 `format`/`absoluteFormat`）；web 版依赖 `@/utils/format` 且 props 更多 | web 版保留为扩展包装器，在 shared 基础上添加 `format`/`absoluteFormat` 等 props |
| 11 | **ConfirmDialog** | WEB EXTENDED | 共享版移除了 `import { useAppStore } from '@/store'` 依赖，改为回调模式（`onSuccess`/`onError`）；其余结构和图标一致 | web 版保留为薄包装器，注入 `useAppStore` 后传递给 shared 版的回调 props |
| 12 | **LoadingSpinner** | WEB EXTENDED | 共享版用原生 `div` + `style`，不依赖 MUI `Box`/`sx`，更通用；web 版使用 MUI `Box` + `sx` 且额外导出 `LoadingOverlay` 组件 | web 版保留为扩展包装器，基于 shared 版的 `LoadingSpinner` 包装 MUI 适配，保留 `LoadingOverlay` |
| 13 | **UserSelect** | DIFFERENT | 共享版基于 MUI `Autocomplete`，使用 `@topems/shared-types` 的 `User` 类型，接口更简单（单选）；web 版自建搜索菜单，支持多选、搜索、自定义渲染 | 需手动合并：shared 版作为基础，web 版多选等功能提取为扩展 props |
| 14 | **BackButton** | DIFFERENT | 共享版自行通过 `dynamic import` 处理 react-router-dom 依赖，支持多种降级；web 版直接 `import { useNavigate }` + `import { useBackNavigation } from '@/hooks'`，有 app 专属 hook | 需手动合并：web 版保留为应用层组件，直接导入 shared 版并传入 `onBack` 回调 |
| 15 | **CommandPalette** | DIFFERENT | 共享版用 `onNavigate` 回调替代 `useNavigate`；web 版直接导入 `react-router-dom` 并硬编码路由图标。接口与分组逻辑可能有差异 | 需手动合并：web 版保留为应用层组件，传入 `onNavigate` 桥接到 react-router |
| 16 | **PageContainer** | DIFFERENT | 共享版用 `header` slot 替代内部 `PageHeader`，移除了 react-router-dom 和 `@/hooks` 依赖；web 版直接导入 `PageHeader` 模板组件 | 需手动合并：web 版保留为应用层组件，用 shared `PageContainer` + 自定义 `header` slot |
| 17 | **DataTable** | DIFFERENT | 共享版解耦了 `@/store`（`useAppStore`）、`@/hooks/useDataTable`、`@/utils`，用 props 回调替代；web 版保留了完整应用集成（Excel 导出、列持久化、虚拟滚动等） | 需手动合并：shared 版作为基础，web 版通过 props 注入应用逻辑，逐步收敛差异 |

---

## 2. 分类汇总

| 分类 | 数量 | 组件 |
|------|------|------|
| **IDENTICAL** | 7 | FormField, FormSelect, ActionButton, Pagination, Stepper, EmptyState, FilterBar |
| **WEB EXTENDED** | 5 | StatusBadge, ProgressBar, RelativeTime, ConfirmDialog, LoadingSpinner |
| **DIFFERENT** | 5 | UserSelect, BackButton, CommandPalette, PageContainer, DataTable |

---

## 3. 迁移策略

### 阶段一：零风险直接替换（IDENTICAL，约 0.5 天）

对 7 个完全相同的组件，直接删除 `apps/web` 副本，修改 barrel file 中的 re-export 路径。

**步骤：**
1. 对 `Pagination`、`FilterBar`：先将 web 版中多出的 props（`sx`/`disabled`、`FilterValue` 类型）补充到 shared 版本
2. 删除 web 版源文件
3. 修改 `index.ts` 中的导出路径为 `export { X } from '@topems/shared-components'`
4. 运行测试确认无回归

### 阶段二：包装器模式（WEB EXTENDED，约 1 天）

对 5 个 web 版有额外功能的组件，将 web 版改造为 shared 版的薄包装器。

**步骤：**
1. `StatusBadge`：在 shared 版中补全被移除的图标映射，或 web 版用 `extendTheme` 传入自定义图标
2. `ProgressBar`：web 版做尺寸名称映射（`sm->small`, `md->medium`, `lg->large`），保留 `styled`/`CircularProgress` 导出
3. `RelativeTime`：web 版包装 shared 版，补充 `format`/`absoluteFormat` props 传递
4. `ConfirmDialog`：web 版包装 shared 版，将 `useAppStore` 的通知逻辑通过 `onSuccess`/`onError` 注入
5. `LoadingSpinner`：web 版保留 `LoadingOverlay`，基础 spinner 改用 shared 版

### 阶段三：手动合并（DIFFERENT，约 2-3 天）

对 5 个差异较大的组件，需要仔细评估和逐步合并。

**步骤：**
1. **UserSelect**：shared 版扩展 `multiple` 和自定义渲染 props，web 版删除自建搜索菜单逻辑
2. **BackButton**：web 版改为使用 shared 版的 `BackButton`，通过 `onBack` prop 传入 `useBackNavigation` hook 逻辑
3. **CommandPalette**：web 版传入 `onNavigate` 回调桥接到 `useNavigate`，删除直接 `import { useNavigate }`
4. **PageContainer**：web 版改为使用 shared 版 + 自定义 `header` slot 渲染 `PageHeader`
5. **DataTable**（最复杂）：保持 web 版作为应用层组件，shared 版提供核心表格能力，web 版通过 props 注入导出、持久化、虚拟滚动等特性；长期目标是将这些特性也提升到 shared 包

---

## 4. 注意事项

- **测试覆盖**：每个阶段完成后，运行 `apps/web` 的完整测试套件和 Storybook 视觉回归
- **Barrel file 兼容**：所有修改通过 `index.ts` re-export 保持对外 API 不变，避免下游消费方大量修改 import 路径
- **TypeScript 严格模式**：合并过程中确保 `tsconfig` 的 `strict` 检查通过，特别注意 shared 版移除的类型
- **Breaking change 管理**：shared 版的 props 变更（如 `RelativeTime` 移除 `format` prop）需在 web 包装器中处理，不暴露给业务组件
- **NumberFields 已完成迁移**：`NumberField`、`CurrencyField`、`PercentField` 已通过 re-export 方式完成迁移，无需额外操作

---

## 5. 预估工时

| 阶段 | 工时 | 风险等级 |
|------|------|----------|
| 阶段一：IDENTICAL 替换 | 0.5 天 | 低 |
| 阶段二：包装器模式 | 1 天 | 低-中 |
| 阶段三：手动合并 | 2-3 天 | 中-高 |
| **合计** | **3.5-4.5 天** | — |

---

生成时间：2026-06-29
