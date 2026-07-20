# Hooks 分层治理

`apps/web/src/hooks/` 目录下原有 64 个扁平 hook 文件，职责边界模糊、查找困难。
本次重构将其重组为 **4 层体系**，通过 barrel `index.ts` 收敛导出，使依赖关系一目了然。

> ⚠️ 本目录**没有移动任何 .ts 文件**。原 hook 文件仍在 `hooks/` 根目录下，
> 仅通过新增的 4 个子目录中的 `index.ts` 完成分层 re-export。

## 分层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      features/  业务特征层                       │
│   auth/  notification/  ai/  websocket/  offline/  finance/  system/   │
│   按业务领域组织；可调用任意下层                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 依赖
┌──────────────────────────────▼──────────────────────────────────┐
│                        domain/  领域能力层                       │
│   useCrud / useCrudMutations / useCrudQueries / useCrudForm      │
│   useListPageState / useModuleData / useResourceCRUD             │
│   通用业务抽象；可调用 ui / foundation                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 依赖
┌──────────────────────────────▼──────────────────────────────────┐
│                          ui/  UI 交互层                          │
│   useConfirmDialog / useDialogForm / useDataTable                │
│   useWindowManager / useBackNavigation / useAutoBreadcrumbs      │
│   useBatchSelection / useImportExport / usePerformanceMonitor    │
│   shortcuts (useKeyboardShortcuts 等)                            │
│   通用 UI 交互逻辑；可调用 foundation                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ 依赖
┌──────────────────────────────▼──────────────────────────────────┐
│                       foundation/  基础原语层                    │
│   useDebounce / useThrottle / useIntersectionObserver            │
│   useCountUp / useResponsive / useIsMobile / useTouchFeedback    │
│   useVirtualScroll / useUrlState / useUrlListState               │
│   useColumnConfig / useColumnWidth                               │
│   纯工具型 hooks，无业务依赖                                      │
└─────────────────────────────────────────────────────────────────┘
```

## 每层职责说明

### 1. `foundation/` — 基础原语层

纯工具型 hooks，与业务完全解耦，可在任意项目/场景下复用。

| Hook | 用途 |
| ---- | ---- |
| `useDebounce` / `useDebouncedValue` / `useDebouncedCallback` | 防抖（来自 `@topems/shared-hooks`） |
| `useThrottle` / `useThrottledValue` / `useThrottledCallback` | 节流 |
| `useIntersectionObserver` / `useInView` | 视口交叉观察 |
| `useCountUp` | 数字滚动动画 |
| `useResponsive` / `useIsMobile` | 响应式断点 |
| `useTouchFeedback` / `useSwipeGesture` / `useDoubleTap` | 触摸反馈 |
| `useVirtualScroll` | 虚拟滚动 |
| `useUrlState` / `useUrlListState` | URL 状态同步 |
| `useColumnConfig` / `useColumnWidth` | 列配置 / 列宽管理 |

### 2. `ui/` — UI 交互层

通用 UI 交互逻辑，与具体业务无关，但依赖 React 视图框架。

| Hook | 用途 |
| ---- | ---- |
| `useConfirmDialog` | 确认弹窗 |
| `useDialogForm` | 表单弹窗（create/edit/view） |
| `useDataTable` / `useExportData` | 数据表格 |
| `useWindowManager` | 多窗口管理 |
| `useBackNavigation` | 返回导航 |
| `useAutoBreadcrumbs` | 自动面包屑 |
| `useBatchSelection` | 批量选择 |
| `useImportExport` | 导入导出 |
| `usePerformanceMonitor` | 性能监控 |
| `useKeyboardShortcuts` / `useShortcutsHelp` / `matchShortcut` / ... | 快捷键 |

### 3. `domain/` — 领域能力层

通用业务抽象，封装"增删改查 / 列表页 / 模块数据"等横切模式。

| Hook | 用途 |
| ---- | ---- |
| `useCrud`（来自 `@topems/shared-hooks`） | 标准 CRUD |
| `useCrudMutations` | CRUD Mutation 封装 |
| `useCrudQueries` / `useModuleQueries` / `useCrudOperations` | CRUD Query 封装 |
| `useCrudForm` | CRUD 表单 |
| `useListPageState` | 列表页状态 |
| `useModuleData` | 模块数据加载 |
| `useResourceCRUD` | 资源型 CRUD |

### 4. `features/` — 业务特征层

按业务领域组织的特征 hooks。**禁止被下层调用**。

| 子模块 | 包含 Hooks |
| ------ | ---------- |
| `auth/` | `useAuth` / `usePermission` / `usePermissionCheck` / `useRole` / `useOrganization` |
| `notification/` | `useNotification` / `useNotificationState` / `useNotificationWebSocket` / `useNotificationSettings` |
| `ai/` | `useAIHelper` / `useAIContext` |
| `websocket/` | `useWebSocket` / `useDashboardWebSocket` / `useImWebSocket` |
| `offline/` | `useNetworkStatus` / `useOfflineQuery` / `useOfflineMutation` / `useOfflineSync` |
| `finance/` | `useErp*` / `useFinance*` / `useCrmFinance*` / `useHrmFinance*` / `usePmFinance*` / `useExternalErp*` / `useVoucherTemplate*` / `useConsolidation*` |
| `system/` | `useServiceStatus` / `useCode*` / `useUiState`（含 `useModal` / `useDrawer` / `useTabs` 等） |

## 依赖规则

**强制单向依赖**：上层可以调用下层，**禁止反向调用**。

```
features  ──►  domain  ──►  ui  ──►  foundation
   │            │          │          │
   └────────────┴──────────┴──────────┴──► @topems/shared-hooks / @topems/shared-types
```

| 调用方 ↓ \ 被调用方 → | foundation | ui | domain | features |
| --------------------- | ---------- | -- | ------ | -------- |
| foundation            | ✓          | ✗  | ✗      | ✗        |
| ui                    | ✓          | ✓  | ✗      | ✗        |
| domain                | ✓          | ✓  | ✓      | ✗        |
| features              | ✓          | ✓  | ✓      | ✓（仅同层互调） |

违反方向的典型反例：
- ❌ `foundation/useUrlState` 内部调用 `domain/useCrud`
- ❌ `ui/useDataTable` 内部调用 `features/useAuth`
- ❌ `domain/useCrudForm` 内部调用 `features/useNotification`

如确需跨层通信，请通过 props / context / 事件总线等解耦方式，而不是直接 import。

## 使用方式

### 1. 从顶层 barrel 导入（推荐用于业务代码）

```typescript
import { useCrudMutations, useUrlListState, useAuth } from '@/hooks';
```

### 2. 从分层 barrel 导入（推荐用于工具/通用组件，明确表达层级依赖）

```typescript
// 只依赖基础原语
import { useDebounce, useThrottle } from '@/hooks/foundation';

// 只依赖 UI 交互层
import { useDataTable, useDialogForm } from '@/hooks/ui';

// 只依赖领域能力层
import { useCrudMutations, useListPageState } from '@/hooks/domain';

// 业务特征层
import { useAuth, usePermission } from '@/hooks/features';
import { useNotification } from '@/hooks/features/notification';
```

## 迁移指南：如何添加新 hook

### 决策树

```
新增 hook
   │
   ├─ 是否与业务完全无关、可在任意项目复用？
   │     ├─ 是 → foundation/
   │     └─ 否 → 继续
   │
   ├─ 是否为通用 UI 交互（弹窗/表格/快捷键等）？
   │     ├─ 是 → ui/
   │     └─ 否 → 继续
   │
   ├─ 是否为通用业务抽象（CRUD/列表页/模块数据等）？
   │     ├─ 是 → domain/
   │     └─ 否 → 继续
   │
   └─ 否则归入 features/<领域>/
         ├─ auth/        认证授权
         ├─ notification/ 通知
         ├─ ai/          AI
         ├─ websocket/   WebSocket
         ├─ offline/     离线
         ├─ finance/     财务
         └─ system/      系统
```

### 步骤

1. **创建 hook 文件**：在 `hooks/` 根目录下创建 `useXxx.ts`（与现有 64 个文件保持同一层级，便于渐进迁移）。
2. **在对应层的 `index.ts` 中导出**：
   - foundation/ui/domain：直接在 `hooks/<层>/index.ts` 中加 `export { useXxx } from '../useXxx';`
   - features：在 `hooks/features/<领域>/index.ts` 中加 `export { useXxx } from '../../useXxx';`
3. **如需新建 features 子领域**：
   - 新建 `hooks/features/<领域>/index.ts`
   - 在 `hooks/features/index.ts` 中加 `export * from './<领域>';`
4. **运行类型检查**：
   ```bash
   cd apps/web && npx tsc --noEmit
   ```

### 反例

- ❌ 直接把新 hook 文件放进 `foundation/` 等子目录（破坏扁平文件 + 分层 barrel 的设计）
- ❌ 在 `hooks/index.ts` 顶层直接 export 单个 hook（应通过分层 barrel 收敛）
- ❌ 在下层 hook 中 import 上层 hook（违反依赖方向）

## 现有文件清单

为便于审计，下列原 hook 文件**仍位于** `hooks/` 根目录，未发生移动：

- 基础原语：`useThrottle.ts` `useIntersectionObserver.ts` `useCountUp.ts` `useResponsive.ts` `useIsMobile.ts` `useTouchFeedback.ts` `useVirtualScroll.ts` `useUrlState.ts` `useUrlListState.ts` `useColumnConfig.ts` `useColumnWidth.ts`
- UI 交互：`useConfirmDialog.ts` `useDialogForm.ts` `useDataTable.ts` `useWindowManager.ts` `useBackNavigation.ts` `useAutoBreadcrumbs.ts` `useBatchSelection.ts` `useImportExport.ts` `usePerformanceMonitor.tsx` `shortcuts.ts`
- 领域能力：`useCrudMutations.ts` `useCrudQueries.ts` `useCrudForm.ts` `useListPageState.ts` `useModuleData.ts` `useResourceCRUD.ts`
- 业务特征：`useAuth.tsx` `usePermission.ts` `usePermissionCheck.ts` `useRole.ts` `useOrganization.ts` `useNotification.ts` `useNotificationState.ts` `useNotificationWebSocket.ts` `useNotificationSettings.ts` `useAIHelper.ts` `useAIContext.ts` `useWebSocket.ts` `useDashboardWebSocket.ts` `useImWebSocket.ts` `useNetworkStatus.ts` `useOfflineQuery.ts` `useOfflineSync.ts` `useServiceStatus.ts` `useCode.ts` `useUiState.ts` `useErp.ts` `useExternalErp.ts` `useFinance.ts` `useCrmFinance.ts` `useHrmFinance.ts` `usePmFinance.ts` `useVoucherTemplate.ts` `useConsolidation.ts`
- 其他：`useGlobalSearch.ts`（暂未纳入分层 barrel，沿用直接路径 `@/hooks/useGlobalSearch` 导入）

> 后续如需彻底扁平化目录结构（将文件也移入对应子目录），可在本分层稳定后再统一执行，
> 届时只需调整各 `index.ts` 中的相对路径（`../useXxx` → `./useXxx`）。
