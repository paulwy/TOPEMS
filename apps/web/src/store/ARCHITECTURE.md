# Store 分层架构

> 本文档描述 `apps/web/src/store/` 目录下的状态管理分层架构、依赖规则与迁移路线图。

## 1. 设计目标

- **职责清晰**：每个 store 只承担一类职责（UI / 领域 / 服务端缓存），避免职责模糊带来的耦合。
- **Server State 与 Client State 分离**：将"实际是服务端数据缓存"的 store 标记并隔离，为后续迁移到 React Query 做准备。
- **依赖单向**：上层可依赖下层，下层不感知上层，杜绝循环依赖。
- **零业务侵入**：本次重组通过分层 `index.ts` re-export 现有 store 文件，不改变任何业务调用路径，所有 `from '@/store'` 的导入继续可用。

## 2. 三层架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       App / Pages                           │
└─────────────────────────────────────────────────────────────┘
        │                                       │
        │ import from '@/store'                 │ import from '@/store/ui' etc.
        ▼                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      store/index.ts                         │
│                (聚合导出 + errorHandler 工具)                │
└─────────────────────────────────────────────────────────────┘
        │
        ├───────────────────┬───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
│   ui/         │  │   domain/     │  │   server/             │
│   UI Store    │  │   Domain Store│  │   Server State        │
│               │  │               │  │   (待迁移到 React Query)│
├───────────────┤  ├───────────────┤  ├───────────────────────┤
│ themeStore    │  │ authStore     │  │ biStore               │
│ uiStore       │  │ workflowStore │  │ moduleLoadingStore    │
│ notification- │  │               │  │ pluginStore           │
│   Store       │  │               │  │                       │
│ notification- │  │               │  │                       │
│   Settings-   │  │               │  │                       │
│   Store       │  │               │  │                       │
│ shortcuts-    │  │               │  │                       │
│   Store       │  │               │  │                       │
└───────────────┘  └───────────────┘  └───────────────────────┘
        │                   │                   ▲
        │                   │                   │
        └───────►-----------┘                   │
                │                                │
                └────────────►-------------------┘
                       (Domain 可依赖 Server State)
```

## 3. 各层职责

### 3.1 UI Store (`ui/`)

**职责**：与视图表现强相关、与具体业务无关的前端状态。

**特征**：
- 仅在前端存在，无服务端持久化语义
- 可被重置而不影响业务数据
- 可由用户交互直接驱动

**包含**：
| Store | 作用 |
|-------|------|
| `themeStore` | 主题切换（light / dark / cyberpunk / system） |
| `uiStore` | UI 状态（侧边栏开合、折叠） |
| `notificationStore` | 前端 Toast 通知管理 |
| `notificationSettingsStore` | 通知开关设置 |
| `shortcutsStore` | 用户自定义快捷方式 |

**依赖规则**：`UI → Domain`（不允许直接导入 Server State）

### 3.2 Domain Store (`domain/`)

**职责**：业务领域状态，承载业务实体、业务规则与领域操作。

**特征**：
- 包含业务实体（如 `User`）与领域行为（如鉴权、权限校验）
- 可被 UI Store 调用
- 可依赖 Server State 层获取服务端数据

**包含**：
| Store | 作用 |
|-------|------|
| `authStore` | 用户认证、权限管理（含 `persist`） |
| `workflowStore` | 工作流当前选中态 |

**依赖规则**：`Domain → Server`（允许）

### 3.3 Server State (`server/`)

**职责**：实际管理服务端数据的"伪 Store"，本质上是带缓存的 fetch 层。

**特征**：
- 状态来源是后端 API
- 含 `loading` / `error` / `lastUpdated` 等服务端缓存语义
- 操作多为 `fetchXxx` / `refresh` 类

**包含**：
| Store | 作用 | 迁移目标 |
|-------|------|---------|
| `biStore` | BI 看板数据聚合 | React Query（`useQuery` + 并行 fetch） |
| `moduleLoadingStore` | 远程模块加载状态 | React Query（结合 `queryCache` / Suspense） |
| `pluginStore` | 插件市场 + 已装插件 + 健康检查 | React Query（`useQuery` + `useMutation` 管理安装/卸载） |

**依赖规则**：`Server` 不允许导入 Domain 或 UI Store

## 4. 依赖方向与禁止项

```
允许：UI ──► Domain ──► Server
禁止：Server ──► Domain
禁止：Server ──► UI
禁止：UI ──► Server（绕过 Domain 直连）
```

- `server/index.ts` 不得 `import` 任何 `domain/` 或 `ui/` 模块
- `ui/index.ts` 不得 `import` 任何 `server/` 模块
- `domain/index.ts` 可 `import` `server/` 模块（因领域逻辑可能需要服务端数据）

## 5. 迁移路线图

### 阶段 0：本次重组（已完成）
- ✅ 建立 `domain/`、`ui/`、`server/` 三层目录
- ✅ 通过 `index.ts` re-export 现有 store，业务代码零改动
- ✅ 在 `server/` 顶层注释中标记 "待迁移到 React Query"

### 阶段 1：biStore → React Query
- 用 `useQuery(['bi', 'summary'], fetchSummaryDashboard)` 等替换 `useBISummary` 等 selector
- 并行获取可用 `useQueries`
- 加载/错误状态由 RQ 内置 `isLoading` / `isError` 提供
- 完成后从 `server/index.ts` 移除 `biStore` re-export

### 阶段 2：moduleLoadingStore → React Query
- 利用 `queryCache.getQueryData` / `Suspense` 替代手写 loading 状态机
- `preload` 由 `queryClient.prefetchQuery` 实现
- 完成后从 `server/index.ts` 移除 `moduleLoadingStore` re-export

### 阶段 3：pluginStore → React Query
- 列表查询：`useQuery(['plugins', 'installed'])` / `useQuery(['plugins', 'marketplace'])`
- 健康检查：`useQuery(['plugins', 'health'])`，配合 `refetchInterval` 轮询
- 安装/卸载/启用/禁用：`useMutation` + `queryClient.invalidateQueries`
- 派生选择器（`useFilteredPlugins` 等）保留为普通 hook，内部消费 RQ 数据
- 完成后从 `server/index.ts` 移除 `pluginStore` re-export

### 阶段 4：清理
- 当 `server/` 为空时，删除该目录
- 在 `ARCHITECTURE.md` 中将三层架构收敛为两层（UI + Domain）
- 保留 `errorHandler` 工具导出

## 6. 添加新 Store 的决策流程

```
                  ┌─────────────────────────┐
                  │  需要新增一个状态切片    │
                  └────────────┬────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │ 数据来源是后端 API 吗？       │
                │ (含 loading/error/refresh)   │
                └────────────┬─────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ 是                          │ 否
              ▼                             ▼
   ┌──────────────────────┐    ┌────────────────────────────┐
   │ 是否可用 React Query │    │ 状态是否绑定具体业务实体？ │
   │ 直接建模？           │    │ (如 User / Workflow)       │
   └──────────┬───────────┘    └────────────┬───────────────┘
              │                              │
   ┌──────────┴──────────┐         ┌────────┴────────┐
   │ 是                  │ 否      │ 是              │ 否
   ▼                     ▼         ▼                 ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
│ 直接用 RQ   │  │ 暂放 server/ │  │ 放入 domain/│  │ 放入 ui/     │
│ 不创建 Store│  │ 并标记待迁移 │  │              │  │              │
└─────────────┘  └──────────────┘  └─────────────┘  └──────────────┘
```

**简明判断要点**：
1. 后端数据 + 纯查询 → 直接用 React Query，**不**新增 store
2. 后端数据 + 复杂本地态（暂无法立刻 RQ 化） → `server/`，加 `@deprecated 待迁移` 注释
3. 业务实体 + 领域行为 → `domain/`
4. 纯前端 UI 表现 → `ui/`

## 7. 当前文件清单

```
store/
├── domain/
│   └── index.ts              # re-export: authStore, workflowStore
├── ui/
│   └── index.ts              # re-export: themeStore, uiStore,
│                             #           notificationStore,
│                             #           notificationSettingsStore,
│                             #           shortcutsStore
├── server/
│   └── index.ts              # re-export: biStore, moduleLoadingStore,
│                             #           pluginStore (待迁移)
├── authStore.ts              # 实际实现（未移动）
├── workflowStore.ts          # 实际实现（未移动）
├── themeStore.ts             # 实际实现（未移动）
├── uiStore.ts                # 实际实现（未移动）
├── notificationStore.ts      # 实际实现（未移动）
├── notificationSettingsStore.ts  # 实际实现（未移动）
├── shortcutsStore.ts         # 实际实现（未移动）
├── biStore.ts                # 实际实现（未移动）
├── moduleLoadingStore.ts     # 实际实现（未移动）
├── pluginStore.ts            # 实际实现（未移动）
├── index.ts                  # 分层聚合导出
└── ARCHITECTURE.md           # 本文档
```

> **重要**：本次重组**不移动**任何 `.ts` 实现文件，仅在 `domain/`、`ui/`、`server/` 三个子目录下新增 `index.ts` 通过 re-export 暴露现有 store。这样既建立了分层结构，又保证了零业务侵入，便于回滚。
