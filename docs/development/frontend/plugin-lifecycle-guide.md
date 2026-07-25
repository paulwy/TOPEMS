# PluginLifecycleManager 使用指南

> 本文档详细说明 TOPEMS 平台的插件生命周期管理器，帮助开发者快速集成插件动态加载功能。

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-06-24 |
| **适用范围** | apps/web/src/lib/PluginLifecycleManager.ts |
| **状态** | 实施中 |

---

## 一、概述

`PluginLifecycleManager` 是 TOPEMS 平台的核心组件之一，负责管理所有插件的生命周期，包括加载、卸载、状态管理和事件通知。

### 1.1 核心职责

| 职责 | 说明 |
|------|------|
| **插件加载** | 自动调用 `NavigationRegistry.register()` 注册导航 |
| **插件卸载** | 自动调用 `NavigationRegistry.unregister()` 清理导航 |
| **状态管理** | 维护插件加载状态（loading/loaded/error/unloaded） |
| **事件通知** | 通过 `EventEmitter` 通知状态变更 |
| **并发保护** | 避免同一插件重复加载 |

### 1.2 架构图

```
                    ┌──────────────────────────┐
                    │  PluginLifecycleManager   │
                    │  (Singleton)              │
                    └──────────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
    ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
    │ NavigationRegistry│  │ EventEmitter │  │ Plugin Status  │
    │ (导航注册中心)     │  │ (事件通知)    │  │ (状态管理)      │
    └──────────────────┘  └──────────────┘  └────────────────┘
```

---

## 二、API 参考

### 2.1 加载插件

```typescript
async loadPlugin(pluginCode: string, config: PluginInfo): Promise<void>
```

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `pluginCode` | `string` | 插件唯一标识 |
| `config` | `PluginInfo` | 插件配置信息 |

**PluginInfo 类型**：

```typescript
interface PluginInfo {
  code: string;
  name: string;
  version: string;
  status?: 'loaded' | 'unloaded' | 'loading' | 'error';
  navConfig?: PluginNavConfig;
  error?: string;
}
```

**返回**：`Promise<void>`，加载完成时 resolve，加载失败时 reject。

**示例**：

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

await pluginLifecycleManager.loadPlugin('erp', {
  code: 'erp',
  name: '企业资源管理',
  version: '1.0.0',
  navConfig: {
    top_nav: [
      {
        code: 'erp',
        label: '企业资源',
        icon: 'Building',
        path: '/erp',
        order: 1,
        permission: 'erp:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'erp-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/erp/dashboard',
        order: 0,
      },
    ],
    module_tabs: [
      {
        code: 'erp-dashboard',
        label: '仪表盘',
        path: '/erp/dashboard',
      },
    ],
    module_card: {
      code: 'erp',
      name: '企业资源管理',
      icon: 'Building',
      path: '/erp',
      status: 'online',
      order: 1,
    },
  },
});
```

### 2.2 卸载插件

```typescript
async unloadPlugin(pluginCode: string): Promise<void>
```

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `pluginCode` | `string` | 插件唯一标识 |

**示例**：

```typescript
await pluginLifecycleManager.unloadPlugin('erp');
```

### 2.3 批量加载

```typescript
async loadAllPlugins(plugins: PluginInfo[]): Promise<void>
```

**示例**：

```typescript
const plugins: PluginInfo[] = [
  { code: 'erp', name: 'ERP', version: '1.0.0', navConfig: {...} },
  { code: 'crm', name: 'CRM', version: '1.0.0', navConfig: {...} },
  { code: 'hrm', name: 'HRM', version: '1.0.0', navConfig: {...} },
];

await pluginLifecycleManager.loadAllPlugins(plugins);
```

### 2.4 批量卸载

```typescript
async unloadAllPlugins(): Promise<void>
```

**示例**：

```typescript
await pluginLifecycleManager.unloadAllPlugins();
```

### 2.5 更新导航配置

```typescript
updatePluginNavConfig(pluginCode: string, navConfig: PluginNavConfig): void
```

**示例**：

```typescript
pluginLifecycleManager.updatePluginNavConfig('erp', {
  top_nav: [...],
  // 其他配置
});
```

### 2.6 查询插件

```typescript
getPlugin(pluginCode: string): PluginInfo | undefined
getAllPlugins(): PluginInfo[]
getLoadedPlugins(): PluginInfo[]
```

**示例**：

```typescript
const erpPlugin = pluginLifecycleManager.getPlugin('erp');
const allPlugins = pluginLifecycleManager.getAllPlugins();
const loadedPlugins = pluginLifecycleManager.getLoadedPlugins();
```

---

## 三、事件系统

### 3.1 事件列表

| 事件名 | 触发时机 | 参数 |
|--------|----------|------|
| `pluginLoaded` | 插件加载完成 | `(pluginCode: string, info: PluginInfo)` |
| `pluginUnloaded` | 插件卸载完成 | `(pluginCode: string)` |
| `pluginError` | 加载/卸载错误 | `(pluginCode: string, info: PluginInfo)` |
| `pluginNavUpdated` | 导航配置更新 | `(pluginCode: string, navConfig: PluginNavConfig)` |

### 3.2 监听事件

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

// 监听加载完成
pluginLifecycleManager.emitter.on('pluginLoaded', (code, info) => {
  console.log(`Plugin ${code} loaded:`, info);
});

// 监听卸载
pluginLifecycleManager.emitter.on('pluginUnloaded', (code) => {
  console.log(`Plugin ${code} unloaded`);
});

// 监听错误
pluginLifecycleManager.emitter.on('pluginError', (code, info) => {
  console.error(`Plugin ${code} error:`, info.error);
});

// 监听导航更新
pluginLifecycleManager.emitter.on('pluginNavUpdated', (code, navConfig) => {
  console.log(`Plugin ${code} nav updated:`, navConfig);
});
```

### 3.3 移除监听

```typescript
const handler = (code: string) => console.log(code);

// 添加监听
pluginLifecycleManager.emitter.on('pluginUnloaded', handler);

// 移除监听
pluginLifecycleManager.emitter.off('pluginUnloaded', handler);
```

---

## 四、完整示例

### 4.1 插件启动时注册

```typescript
// plugins/my-plugin/index.ts
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';

export async function setupMyPlugin() {
  try {
    await pluginLifecycleManager.loadPlugin('my-plugin', {
      code: 'my-plugin',
      name: '我的插件',
      version: '1.0.0',
      navConfig: {
        top_nav: [
          {
            code: 'my-plugin',
            label: '我的插件',
            icon: 'Box',
            path: '/my-plugin',
            order: 10,
          },
        ],
        sidebar_nav: [
          {
            code: 'my-plugin-home',
            label: '首页',
            icon: 'Home',
            path: '/my-plugin',
            order: 0,
          },
          {
            code: 'my-plugin-settings',
            label: '设置',
            icon: 'Settings',
            path: '/my-plugin/settings',
            order: 1,
          },
        ],
        module_tabs: [
          { code: 'my-plugin-home', label: '首页', path: '/my-plugin' },
          { code: 'my-plugin-settings', label: '设置', path: '/my-plugin/settings' },
        ],
        module_card: {
          code: 'my-plugin',
          name: '我的插件',
          icon: 'Box',
          path: '/my-plugin',
          status: 'online',
          order: 100,
        },
      },
    });

    console.log('My plugin loaded successfully');
  } catch (error) {
    console.error('Failed to load my plugin:', error);
  }
}
```

### 4.2 React 组件中集成

```tsx
import { useEffect, useState } from 'react';
import { pluginLifecycleManager, PluginInfo } from '@/lib/PluginLifecycleManager';

export const PluginStatus: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);

  useEffect(() => {
    const updatePlugins = () => {
      setPlugins(pluginLifecycleManager.getAllPlugins());
    };

    updatePlugins();

    pluginLifecycleManager.emitter.on('pluginLoaded', updatePlugins);
    pluginLifecycleManager.emitter.on('pluginUnloaded', updatePlugins);
    pluginLifecycleManager.emitter.on('pluginError', updatePlugins);

    return function cleanup() {
      pluginLifecycleManager.emitter.off('pluginLoaded', updatePlugins);
      pluginLifecycleManager.emitter.off('pluginUnloaded', updatePlugins);
      pluginLifecycleManager.emitter.off('pluginError', updatePlugins);
    };
  }, []);

  return (
    <div>
      <h3>已加载插件</h3>
      {plugins.map(plugin => (
        <div key={plugin.code}>
          {plugin.name} - {plugin.status}
        </div>
      ))}
    </div>
  );
};
```

### 4.3 应用启动时批量加载

```typescript
// app/bootstrap.ts
import { pluginLifecycleManager, PluginInfo } from '@/lib/PluginLifecycleManager';

const defaultPlugins: PluginInfo[] = [
  {
    code: 'erp',
    name: '企业资源管理',
    version: '1.0.0',
    navConfig: { ... }
  },
  {
    code: 'crm',
    name: '客户关系管理',
    version: '1.0.0',
    navConfig: { ... }
  },
  // ...其他插件
];

export async function bootstrapPlugins() {
  console.log('Loading default plugins...');
  await pluginLifecycleManager.loadAllPlugins(defaultPlugins);
  console.log('All default plugins loaded');
}
```

---

## 五、注意事项

### 5.1 单例模式

`PluginLifecycleManager` 是单例，整个应用中只有一个实例。请始终通过以下方式获取：

```typescript
import { pluginLifecycleManager } from '@/lib/PluginLifecycleManager';
```

### 5.2 错误处理

加载/卸载插件可能会失败，建议使用 try-catch 处理：

```typescript
try {
  await pluginLifecycleManager.loadPlugin('erp', config);
} catch (error) {
  console.error('Failed to load plugin:', error);
  // 降级处理
}
```

### 5.3 并发保护

如果同一插件正在加载中，重复调用 `loadPlugin` 不会重复加载，会返回相同的 Promise：

```typescript
const promise1 = pluginLifecycleManager.loadPlugin('erp', config);
const promise2 = pluginLifecycleManager.loadPlugin('erp', config);
// promise1 === promise2
```

### 5.4 事件监听器清理

在 React 组件中监听事件时，务必在 cleanup 函数中移除监听器，避免内存泄漏：

```tsx
useEffect(() => {
  const handler = (code: string) => { /* ... */ };
  pluginLifecycleManager.emitter.on('pluginLoaded', handler);
  return function cleanup() {
    pluginLifecycleManager.emitter.off('pluginLoaded', handler);
  };
}, []);
```

### 5.5 监听器数量限制

`EventEmitter` 默认最大监听器数量为 100（已通过 `setMaxListeners(100)` 设置）。如果需要更多监听器，可以调用：

```typescript
pluginLifecycleManager.emitter.setMaxListeners(200);
```

---

## 六、与 NavigationRegistry 的关系

`PluginLifecycleManager` 内部使用 `NavigationRegistry` 来管理导航：

```
loadPlugin
  ↓
navigationRegistry.register(pluginCode, navConfig)
  ↓
emitter.emit('navigationUpdated', pluginCode)
```

```
unloadPlugin
  ↓
navigationRegistry.unregister(pluginCode)
  ↓
emitter.emit('navigationUpdated', pluginCode)
```

因此，当插件加载/卸载时，TopNav、Sidebar、ModuleTabs 等组件会自动响应 `navigationUpdated` 事件并更新。

---

## 七、相关文件

| 文件 | 说明 |
|------|------|
| `apps/web/src/lib/PluginLifecycleManager.ts` | 插件生命周期管理器 |
| `apps/web/src/lib/NavigationRegistry.ts` | 导航注册中心 |
| `apps/web/src/components/layout/TopNav.tsx` | 顶部导航（监听 navigationUpdated） |
| `apps/web/src/components/layout/Sidebar.tsx` | 侧边栏（监听 navigationUpdated） |
| `apps/web/src/components/layout/ModuleTabs.tsx` | 模块 Tab（监听 navigationUpdated） |
| `docs/guides/ui/ui-navigation-design.md` | 导航设计文档 |
| `docs/guides/ui/ui-design-spec.md` | UI 设计规范 |
