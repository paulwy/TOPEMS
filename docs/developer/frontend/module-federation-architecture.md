# TOPEMS Module Federation 架构方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.1.0 |
| 日期 | 2026-06-17 |
| 状态 | 已实施 |

---

## 一、总体架构

### 1.1 架构愿景

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOPEMS 产品家族                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Host (主应用 Shell)                           │   │
│   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│   │  │ 导航   │ │ 认证   │ │ 通知   │ │ 搜索   │ │ 主题   │        │   │
│   │  │ Layout │ │ Auth  │ │ Toast  │ │ Finder │ │ Theme  │        │   │
│   │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                    ┌────────────────┼────────────────┐                  │
│                    │                │                │                  │
│   ┌───────────────▼───┐  ┌────────▼────────┐  ┌──▼──────────────┐  │
│   │   Core Remote     │  │  HRM Remote      │  │  CRM Remote      │  │
│   │   (核心系统)       │  │  (人力资源)       │  │  (客户关系)       │  │
│   │  ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │
│   │  │ 用户/角色    │ │  │ │ 员工管理     │ │  │ │ 客户管理     │ │  │
│   │  │ 组织架构     │ │  │ │ 考勤薪酬     │ │  │ │ 销售机会     │ │  │
│   │  │ 权限        │ │  │ │ 招聘培训     │ │  │ │ 商机跟进     │ │  │
│   │  │ 工作流      │ │  │ └─────────────┘ │  │ └─────────────┘ │  │
│   │  │ 报表        │ │  └─────────────────┘  └─────────────────┘  │
│   │  │ 文件        │ │                                                │
│   │  │ 通知        │ │  ┌───────────────┐  ┌───────────────────┐    │
│   │  └─────────────┘ │  │ PM Remote      │  │  FIN Remote        │    │
│   └──────────────────┘  │ (项目管理)      │  │  (财务)             │    │
│                         └───────────────┘  └───────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
优先级说明：
[P0] 必须 - 无此模块其他模块无法运行
[P1] 核心 - 业务模块强烈依赖
[P2] 可选 - 可独立使用或按需集成
```

| 模块 | 优先级 | 依赖模块 | 说明 |
|------|--------|----------|------|
| Core Auth | P0 | - | 认证、授权、JWT |
| Core Org | P0 | Auth | 组织架构、用户 |
| Core Workflow | P1 | Auth, Org | 工作流引擎 |
| Core Report | P1 | Auth | 报表引擎 |
| Core File | P1 | Auth | 文件管理 |
| Core Notify | P1 | Auth | 通知系统 |
| HRM | P1 | Core全部 | 人力资源 |
| CRM | P1 | Core全部 | 客户关系 |
| PM | P1 | Core全部 | 项目管理 |
| SC | P1 | Core全部 | 供应链 |
| FIN | P1 | Core全部 | 财务管理 |
| QMS | P2 | Core全部 | 质量管理 |
| LIMS | P2 | Core全部 | 实验管理 |
| EHS | P2 | Core全部 | 环境健康 |
| BI | P2 | Core全部 | 商业智能 |
| WMS | P2 | Core全部 | 仓储管理 |
| MES | P2 | Core全部 | 制造执行 |

### 1.3 部署拓扑

```
                          ┌─────────────────┐
                          │   Nginx/Gateway  │
                          │   (路由分发)     │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         │    ┌──────────────────▼──┐               ┌──────▼──────┐
         │    │   Host App          │               │  Core API   │
         │    │   (主应用)           │               │  :3001      │
         │    │   :3000             │               └─────────────┘
         │    └──────────┬─────────┘
         │               │ Federation
         │    ┌──────────┴──────────┐
         │    │                     │
         │ ┌──▼────┐  ┌──────┐  ┌──▼────┐  ┌──────┐
         │ │ HRM   │  │ CRM  │  │  PM   │  │ FIN  │
         │ │ Remote│  │Remote│  │Remote │  │Remote│
         │ │ :3002 │  │:3003 │  │ :3004 │  │:3005 │
         │ └───────┘  └──────┘  └───────┘  └──────┘
         │
         │    ┌──────────────────────────────────────┐
         │    │           各模块 API (微服务)         │
         │    │  :4001    :4002    :4003    :4004    │
         │    │  HRM-API  CRM-API  PM-API  FIN-API  │
         │    └──────────────────────────────────────┘
         │
         │    ┌──────────────────────────────────────┐
         │    │           Core API (微服务)           │
         │    │  :4101    :4102    :4103    :4104    │
         │    │  Auth-API Org-API  WF-API  Report-API │
         │    └──────────────────────────────────────┘
         │
         └─────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
               ┌────▼────┐              ┌───────▼──────┐
               │ PostgreSQL │              │   Redis     │
               │  (分库)   │              │  (共享缓存)  │
               └───────────┘              └─────────────┘
```

---

## 二、Module Federation 配置方案

### 2.1 Host 配置 (主应用 - Vite)

> 项目实际使用 Vite + @module-federation/vite 插件进行 Module Federation 配置

```typescript
// apps/web/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'static';

const REMOTE_MODULES = [
  { name: 'topems_core', port: 3001, description: 'Core Module' },
  { name: 'topems_hrm', port: 3002, description: 'HRM Module' },
  { name: 'topems_crm', port: 3003, description: 'CRM Module' },
  { name: 'topems_pm', port: 3004, description: 'Project Management' },
  { name: 'topems_fin', port: 3005, description: 'Finance Module' },
  { name: 'topems_sc', port: 3006, description: 'Supply Chain' },
  { name: 'topems_qms', port: 3007, description: 'Quality Management' },
  { name: 'topems_bi', port: 3008, description: 'Business Intelligence' },
  { name: 'topems_mes', port: 3009, description: 'Manufacturing Execution' },
  { name: 'topems_wms', port: 3010, description: 'Warehouse Management' },
];

const sharedDependencies = {
  'react': { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
  'react-dom': { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
  'react-router-dom': { singleton: true, requiredVersion: '^7.0.0', strictVersion: true },
  '@mui/material': { singleton: true, requiredVersion: '^6.0.0', strictVersion: true },
  '@mui/icons-material': { singleton: true, requiredVersion: '^6.0.0', strictVersion: true },
  '@emotion/react': { singleton: true, requiredVersion: '^11.0.0', strictVersion: true },
  '@emotion/styled': { singleton: true, requiredVersion: '^11.0.0', strictVersion: true },
  'zustand': { singleton: true, strictVersion: true },
  'i18next': { singleton: true, strictVersion: true },
  'react-i18next': { singleton: true, strictVersion: true },
  'axios': { singleton: true, requiredVersion: '^1.0.0', strictVersion: true },
  'dayjs': { singleton: true, requiredVersion: '^1.11.0', strictVersion: true },
  'clsx': { singleton: true, requiredVersion: '^2.0.0', strictVersion: true },
  'lucide-react': { singleton: true, requiredVersion: '^1.0.0', strictVersion: true },
  'zod': { singleton: true, requiredVersion: '^4.0.0', strictVersion: true },
};

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_portal',
      filename: 'remoteEntry.js',
      exposes: {
        './PluginLoader': './src/lib/plugin-loader.ts',
        './PluginRuntime': './src/lib/plugin-runtime.ts',
        './hooks/usePluginStore': './src/store/pluginStore.ts',
        './api/plugin': './src/api/plugin.ts',
        './routes/plugin': './src/routes/plugin.ts',
        './config/plugins': './src/config/plugins.config.ts',
      },
      remotes: buildRemotesConfig(),
      shared: sharedDependencies,
      extraOptions: {
        automaticAsyncBoundary: true,
        experimental: { optimizeDeps: true },
      },
    }),
  ],
  // ... 其他配置
});
```

### 2.2 远程模块配置文件

```typescript
// apps/web/src/config/plugins.config.ts
export interface RemoteModuleConfig {
  name: string;
  code: string;
  description: string;
  port: number;
  url: string;
  category: 'system' | 'business' | 'analytics' | 'infrastructure' | 'quality' | 'rd' | 'supply';
  icon: string;
  required: boolean;
  defaultEnabled: boolean;
  pluginType: 'core' | 'business';
  dependencies?: string[];
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: 'Core',
    code: 'topems_core',
    description: '核心模块 - 认证、权限、工作流等基础服务',
    port: 3001,
    url: 'http://localhost:3001',
    category: 'system',
    icon: 'Settings',
    required: true,
    defaultEnabled: true,
    pluginType: 'core',
  },
  {
    name: 'HRM',
    code: 'topems_hrm',
    description: '人力资源管理 - 员工、考勤、薪酬、招聘',
    port: 3002,
    url: 'http://localhost:3002',
    category: 'business',
    icon: 'Users',
    required: false,
    defaultEnabled: true,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  // ... 其他模块
];
```

### 2.3 共享策略

| 依赖类型 | 策略 | 说明 |
|----------|------|------|
| React/ReactDOM | singleton + requiredVersion | 全局唯一，版本锁定 |
| React Router | singleton + requiredVersion | 统一路由管理 |
| MUI 组件库 | singleton + requiredVersion | 主题一致性 |
| Zustand | singleton | 共享状态管理 |
| i18next | singleton | 国际化共享 |
| Axios | singleton + requiredVersion | HTTP 客户端共享 |
| Dayjs | singleton + requiredVersion | 日期工具共享 |
| Zod | singleton + requiredVersion | 表单验证共享 |
| Lucide React | singleton + requiredVersion | 图标库共享 |

---

## 三、插件系统架构

### 3.1 插件状态管理 (Zustand Store)

```typescript
// apps/web/src/store/pluginStore.ts
export interface PluginState {
  installedPlugins: TenantPlugin[];
  marketplacePlugins: Plugin[];
  healthStatus: Record<string, { healthy: boolean; status?: string; latency?: number }>;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeCategory: string;
  
  // 操作方法
  installPlugin: (code: string) => Promise<boolean>;
  uninstallPlugin: (code: string) => Promise<boolean>;
  enablePlugin: (code: string) => Promise<boolean>;
  disablePlugin: (code: string) => Promise<boolean>;
  upgradePlugin: (code: string, version?: string) => Promise<boolean>;
  
  // 批量操作
  batchInstallPlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchUninstallPlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;
  
  // 查询方法
  isPluginInstalled: (code: string) => boolean;
  isPluginActive: (code: string) => boolean;
  getPluginHealth: (code: string) => { healthy: boolean; status?: string; latency?: number };
}
```

### 3.2 插件运行时管理器

```typescript
// apps/web/src/lib/plugin-runtime.ts
class PluginRuntimeManager {
  private healthStatus: Map<string, PluginHealthStatus> = new Map();
  private loadedModules: Map<string, LoadedPluginModule> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  
  // 启动定时健康检查
  startHealthMonitoring(intervalMs: number = 30000): void;
  
  // 检查单个插件健康状态
  async checkPluginHealth(code: string): Promise<PluginHealthStatus>;
  
  // 动态加载插件模块
  async loadPlugin(code: string, config?: PluginRuntimeConfig): Promise<LoadedPluginModule | null>;
  
  // 卸载插件模块
  unloadPlugin(code: string): boolean;
  
  // 获取健康状态摘要
  getHealthSummary(): { total: number; healthy: number; unhealthy: number };
}
```

### 3.3 插件加载器

```typescript
// apps/web/src/lib/plugin-loader.ts
class PluginLoader {
  // 加载单个插件
  async loadPlugin(pluginCode: string, manifestUrl: string): Promise<LoadedPlugin>;
  
  // 批量加载插件
  async loadPlugins(plugins: Array<{ code: string; manifestUrl: string }>): Promise<LoadedPlugin[]>;
  
  // 卸载插件
  unloadPlugin(pluginCode: string): boolean;
  
  // 获取所有路由
  getAllRoutes(): RouteConfig[];
  
  // 获取所有菜单
  getAllMenus(): MenuConfig[];
}
```

---

## 四、Core 模块抽取方案

### 4.1 抽取范围

```
┌─────────────────────────────────────────────────────────┐
│                    Core 模块 (必须抽取)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. Auth (认证授权)                              │    │
│  │     - JWT Token 管理                             │    │
│  │     - 登录/登出                                  │    │
│  │     - 密码重置                                   │    │
│  │     - OAuth 集成 (可选)                          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  2. IAM (身份与访问管理)                          │    │
│  │     - 用户 CRUD                                  │    │
│  │     - 角色管理                                   │    │
│  │     - 权限管理                                   │    │
│  │     - 部门管理                                   │    │
│  │     - 岗位管理                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  3. Workflow (工作流引擎)                         │    │
│  │     - 流程定义                                   │    │
│  │     - 流程实例                                   │    │
│  │     - 任务分配                                   │    │
│  │     - 审批处理                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  4. File (文件管理)                              │    │
│  │     - 上传下载                                   │    │
│  │     - 文件预览                                   │    │
│  │     - 文件夹管理                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  5. Notify (通知中心)                           │    │
│  │     - 站内通知                                  │    │
│  │     - 邮件通知                                  │    │
│  │     - WebSocket 推送                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  6. Report (报表引擎)                           │    │
│  │     - 报表设计                                   │    │
│  │     - 数据查询                                   │    │
│  │     - 图表渲染                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 目录结构设计

```
topems/
├── apps/
│   ├── web/                      # 主应用 (Host)
│   │   ├── vite.config.ts        # Vite 配置 + Module Federation
│   │   ├── public/
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── plugin-loader.ts    # 插件加载器
│   │       │   └── plugin-runtime.ts   # 插件运行时管理
│   │       ├── store/
│   │       │   └── pluginStore.ts      # 插件状态管理
│   │       ├── config/
│   │       │   └── plugins.config.ts   # 远程模块配置
│   │       ├── api/
│   │       │   └── plugin.ts           # 插件 API
│   │       ├── pages/
│   │       │   ├── admin/
│   │       │   │   └── PluginManagementPage.tsx
│   │       │   └── plugin/
│   │       │       └── PluginMarketplacePage.tsx
│   │       └── routes/
│   │           └── plugin.ts
│   │
│   ├── core/                     # Core 远程模块 (预留)
│   ├── hrm/                      # HRM 远程模块 (预留)
│   ├── crm/                      # CRM 远程模块 (预留)
│   └── ...
│
├── packages/
│   ├── shared-types/             # 共享类型定义
│   ├── shared-utils/             # 共享工具函数
│   └── shared-components/        # 共享 UI 组件
│
├── docs/                         # 文档
├── package.json                  # 根 package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 五、实施步骤

### 5.1 当前已完成

| 阶段 | 状态 | 说明 |
|------|------|------|
| Monorepo 重构 | ✅ | 已完成 pnpm workspace 配置 |
| Module Federation 配置 | ✅ | Vite 配置已完成 |
| 插件状态管理 | ✅ | Zustand store 已实现 |
| 插件运行时管理 | ✅ | 健康检查、动态加载已实现 |
| 插件加载器 | ✅ | PluginLoader 已实现 |
| 插件市场页面 | ✅ | 支持安装、搜索、筛选 |
| 插件管理页面 | ✅ | 支持启用、禁用、卸载 |

### 5.2 下一步计划

| 阶段 | 任务 | 说明 |
|------|------|------|
| 远程模块抽取 | 待实施 | 抽取 Core、HRM、CRM 等模块 |
| API 网关集成 | 待实施 | 完善微服务 API 集成 |
| CI/CD 流程 | 待实施 | 自动化部署流水线 |

---

## 六、关键技术决策

### 6.1 版本策略

```
主版本对齐：
- React: 19.x (所有模块)
- MUI: 6.x (所有模块)
- TypeScript: 5.x (所有模块)
- Node: 20.x (所有服务)

共享包版本：
- @topems/shared-types: ^1.0.0
- @topems/shared-utils: ^1.0.0
- @topems/shared-components: ^1.0.0
```

### 6.2 部署策略

```
开发环境：
- Host: localhost:3000
- Core: localhost:3001
- HRM: localhost:3002
- CRM: localhost:3003
- ...

测试环境：
- 独立 K8s Pod
- 共享 ConfigMap
- 独立 Service

生产环境：
- Nginx Ingress 路由
- CDN 加速 RemoteEntry
- 独立扩缩容
```

---

## 七、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 模块间版本冲突 | 运行失败 | 使用 singleton + requiredVersion |
| 加载性能差 | 用户体验差 | 预加载关键模块 + 懒加载 |
| 调试困难 | 开发效率低 | 完善 DevTools 插件 |
| 类型不一致 | 运行时错误 | 严格使用 shared-types |
| 部署复杂 | 运维成本高 | 完善部署脚本 + 文档 |

---

## 八、验收标准

```
✅ 1. Host 可动态加载所有 Remote
✅ 2. 插件市场支持安装、搜索、筛选
✅ 3. 插件管理支持启用、禁用、卸载
✅ 4. 插件运行时健康检查
✅ 5. 共享依赖无版本冲突
✅ 6. 类型定义完全共享
⬜ 7. CI/CD 流程完善
⬜ 8. 各模块可独立开发、独立部署
```

---

## 九、参考资料

- [Vite Module Federation Plugin](https://github.com/module-federation/vite)
- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Zustand State Management](https://zustand-demo.pmnd.rs/)
- [React 19 Documentation](https://react.dev/)

---

## 十、相关文档

| 文档 | 说明 |
|------|------|
| backend-service-integration-plan.md | 后端服务整合实施方案（已归档） |
| improvement-plan.md | 项目整体改进计划（已归档） |