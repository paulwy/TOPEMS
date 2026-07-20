# TOPEMS 微前端独立部署指南

本文档描述 TOPEMS 前端基于 `@module-federation/vite` 的多模块独立部署方案。
核心目标：将单一 `topems_core` remote 升级为按业务域拆分的多 remote，支持独立构建、
部署、版本协商与降级。

---

## 1. 架构概览

```
┌──────────────────────────────────────────────────────────────────────┐
│                          浏览器 (用户终端)                            │
│                                                                       │
│   ┌───────────────────────────────────────────────────────────────┐  │
│   │  Host App (apps/web, topems_portal)                          │  │
│   │  ┌─────────────────┐  ┌─────────────────┐                     │  │
│   │  │ MicroAppRouter  │  │ RemoteLoader    │                     │  │
│   │  │ (按权限生成路由) │→ │ (lazy + 边界)   │                     │  │
│   │  └─────────────────┘  └────────┬────────┘                     │  │
│   │                                ↓                               │  │
│   │  ┌──────────────────────────────────────────────────────────┐ │  │
│   │  │ Shared Scope (react/react-dom/@mui/* /@tanstack/...)    │ │  │
│   │  │ singleton + strictVersion + requiredVersion             │ │  │
│   │  └──────────────────────────────────────────────────────────┘ │  │
│   └──────────┬────────────────────────────────────────────────────┘  │
└──────────────┼───────────────────────────────────────────────────────┘
               │ HTTPS (remoteEntry.js + chunks)
               │
   ┌───────────┼─────────────────────────────────────────────────────┐
   │           ↓                                                     │
   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐  │
   │  │ topems_core   │  │ topems_erp   │  │ topems_hrm   │  │ ...  │  │
   │  │ (核心平台)    │  │ (ERP 业务域) │  │ (HRM 业务域) │  │      │  │
   │  │ :3001        │  │ :3002        │  │ :3003        │  │      │  │
   │  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘  │
   │                                                                  │
   │  CDN / 独立部署环境 (每个 remote 独立流水线)                      │
   └──────────────────────────────────────────────────────────────────┘
```

### 关键文件位置

| 路径 | 作用 |
|------|------|
| `apps/web/vite.config.ts` | federation 编译期配置（name/remotes/shared） |
| `apps/web/src/microfrontend/config.ts` | 运行时模块清单（REMOTE_MODULES） |
| `apps/web/src/microfrontend/RemoteLoader.tsx` | 动态加载器（lazy + ErrorBoundary） |
| `apps/web/src/microfrontend/MicroAppRouter.tsx` | 按权限生成路由 |
| `apps/web/src/microfrontend/registry.ts` | 运行时模块注册表 |

---

## 2. 模块拆分原则

### 2.1 拆分维度

- **按业务域**：每个 remote 对应一个完整的业务域（ERP / HRM / CRM / SCM / WMS / MES / PM / Finance）
- **核心域始终加载**：`topems_core` 提供 IAM、工作流、文件、通讯等基础能力
- **业务域按需加载**：根据用户权限和路由激活情况延迟加载

### 2.2 当前模块清单

| 模块名 | 业务域 | 路由前缀 | 默认端口 | 核心 | 预加载 | 权限 |
|--------|--------|---------|---------|------|--------|------|
| topems_core | 核心平台 | /core | 3001 | ✓ | eager | - |
| topems_erp | ERP | /erp | 3002 | - | lazy | erp:view |
| topems_hrm | HRM | /hrm | 3003 | - | lazy | hrm:view |
| topems_crm | CRM | /crm | 3004 | - | lazy | crm:view |
| topems_scm | SCM | /scm | 3005 | - | lazy | scm:view |
| topems_wms | WMS | /wms | 3006 | - | lazy | wms:view |
| topems_mes | MES | /mes | 3007 | - | lazy | mes:view |
| topems_pm | 项目管理 | /pm | 3008 | - | lazy | pm:view |
| topems_finance | 财务 | /finance | 3009 | - | lazy | finance:view |

### 2.3 新增业务域步骤

1. 在 `apps/web/src/microfrontend/config.ts` 的 `REMOTE_MODULES` 数组追加配置项
2. 创建独立 app（如 `apps/erp/`），配置自己的 `vite.config.ts` federation（name 与模块名一致）
3. 在 CI 中追加独立构建与部署流水线
4. 通过环境变量 `VITE_REMOTE_TOPEMS_<NAME>` 注入生产入口 URL

---

## 3. 独立部署流程

### 3.1 单 remote 构建产物

每个 remote 独立构建后产出：

```
dist/
├── remoteEntry.js         # Module Federation 入口（必须）
├── assets/
│   ├── [name].[hash].js   # 各 chunk
│   └── [name].[hash].css
└── index.html             # 可选（独立预览）
```

### 3.2 构建命令

```bash
# 单个 remote 构建（在 remote 自身目录下）
cd apps/erp && pnpm build

# 全量构建（Host + 所有 remote）
pnpm build         # 仓库根
# 等价于
pnpm build:shared-types && pnpm build:shared-utils && pnpm build:core && pnpm build:host
```

### 3.3 部署模式

通过 `VITE_DEPLOYMENT_MODE` 环境变量切换：

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| `module-federation` (默认) | 全部 remote 动态加载 | SaaS / 多租户 |
| `static` | 所有 remote 关闭，本地打包 | 私有部署 / 离线安装 |
| `hybrid` | 核心静态 + 业务远程 | 混合云 |

### 3.4 生产环境注入 remote URL

构建 / 启动 Host 前注入环境变量：

```bash
# .env.production
VITE_DEPLOYMENT_MODE=module-federation
VITE_REMOTE_TOPEMS_CORE=https://core.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_HRM=https://hrm.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_CRM=https://crm.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_SCM=https://scm.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_WMS=https://wms.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_MES=https://mes.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_PM=https://pm.topems.com/remoteEntry.js
VITE_REMOTE_TOPEMS_FINANCE=https://finance.topems.com/remoteEntry.js
```

未配置环境变量的 remote 将回退到 `config.ts` 中声明的默认值（开发用 `localhost:30xx`）。

### 3.5 CI/CD 流水线示例

```yaml
# .github/workflows/deploy-erp.yml（节选）
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter topems-erp build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.CDN_KEY }}
          aws-secret-access-key: ${{ secrets.CDN_SECRET }}
      - run: aws s3 sync apps/erp/dist s3://topems-erp/ --delete
      - run: aws cloudfront create-invalidation --distribution-id $CDN_ID --paths "/*"
```

---

## 4. 版本协商机制

### 4.1 共享依赖声明

在 `apps/web/vite.config.ts` 的 `shared` 字段中声明所有需要在 host 与 remote 之间
共享的依赖。每项支持以下选项：

| 选项 | 作用 |
|------|------|
| `singleton` | 全局唯一实例（host 已加载则 remote 复用） |
| `requiredVersion` | 期望的 semver 范围 |
| `strictVersion` | 严格匹配 requiredVersion（不允许超出范围） |

### 4.2 当前共享依赖

- **核心 UI 栈**：react / react-dom / react-router-dom / @mui/material /
  @mui/icons-material / @emotion/react / @emotion/styled
- **状态/数据**：zustand / @tanstack/react-query / @tanstack/react-query-devtools
- **表单/校验**：react-hook-form / zod
- **国际化**：i18next / react-i18next
- **网络/时间**：axios / dayjs

### 4.3 协商规则

1. Host 启动时初始化 shared scope
2. Remote 加载 `remoteEntry.js` 后调用 `init(sharedScope)` 注入自己的 shared
3. Module Federation 运行时按以下顺序选择版本：
   - host 已加载且 singleton=true → 复用 host 版本
   - 否则取满足 requiredVersion 的最高版本
   - strictVersion=true 时严格匹配，否则允许超出范围（仅警告）

### 4.4 版本不兼容告警

启用 `strictVersion: true` 后，版本不兼容会在控制台抛出警告：

```
[federation] Unsatisfied version 5.0.0 of shared singleton module react
(expected ^19.0.0)
```

生产环境应通过日志收集捕获此类告警。

---

## 5. 降级策略

### 5.1 多层错误恢复

```
RemoteLoader
  ├─ Suspense (加载中 → LoadingFallback)
  ├─ RemoteErrorBoundary (加载失败 → 重试按钮)
  └─ loadRemoteModule
      ├─ 主入口（远程 entry）
      └─ 失败时 console.warn，由 ErrorBoundary 接管
```

### 5.2 降级入口

在 `RemoteModuleConfig` 中声明 `fallbackEntry` 字段，可在主入口不可用时切换：

```typescript
{
  name: 'topems_erp',
  entry: 'https://erp.topems.com/remoteEntry.js',
  fallbackEntry: 'https://erp-fallback.topems.com/remoteEntry.js',
  // ...
}
```

> 注：当前 `loadRemoteModule` 仅加载主入口，fallbackEntry 由运维通过反向代理
> （如 nginx backup upstream）实现，避免运行时双重 entry 协商复杂度。

### 5.3 静态部署降级

将 `VITE_DEPLOYMENT_MODE=static` 时所有 remote 关闭，业务模块通过本地打包
（manualChunks）提供，适用于：

- 私有部署 / 离线安装
- 网络不稳定的边缘节点
- 客户端单机部署

### 5.4 预加载失败容错

`preloadRemoteModules` 使用 `Promise.allSettled`，单个模块预加载失败不阻塞
主流程，仅记录 `console.warn`。

---

## 6. 开发与调试指南

### 6.1 本地开发启动

```bash
# 启动 Host（apps/web，端口 3000）
pnpm dev:web

# 启动核心 remote（apps/core，端口 3001）
pnpm dev:core

# 启动其他 remote（需先创建对应 app，见 §2.3）
cd apps/erp && pnpm dev    # 端口 3002
cd apps/hrm && pnpm dev    # 端口 3003
```

### 6.2 开发环境变量

在 `apps/web/.env.development` 中：

```bash
VITE_DEPLOYMENT_MODE=module-federation
# 不配置 VITE_REMOTE_TOPEMS_* 则使用 config.ts 中的默认值（localhost:30xx）
```

### 6.3 调试远程模块加载

```typescript
import { microFrontendRegistry } from '@/microfrontend/registry';

// 订阅模块状态变更
const unsubscribe = microFrontendRegistry.subscribe((modules) => {
  console.table(modules);
});

// 手动注册一个测试模块
microFrontendRegistry.register({
  name: 'topems_test',
  entry: 'http://localhost:3099/remoteEntry.js',
  displayName: '测试模块',
  icon: 'BugReport',
  routePrefix: '/test',
  isCore: false,
  preload: 'lazy',
});

unsubscribe();
```

### 6.4 检查 shared scope

在浏览器控制台执行：

```javascript
// 查看 federation 运行时
console.log(window.__federation_shared__);
// 查看已加载的 remote container
console.log(window.__federation_hooks__);
```

### 6.5 常见问题

#### Q1: Remote 加载报错 "Cannot find module topems_erp/App"

- 检查 `vite.config.ts` 的 `remotes` 中是否声明了 `topems_erp`
- 或确认 `RemoteLoader` 的 `moduleName` 与 remote federation name 一致
- 检查 remote 的 `remoteEntry.js` 是否可访问

#### Q2: shared 依赖版本冲突警告

- 确认 host 与 remote 的 `package.json` 中相关依赖版本一致
- 临时降级：将 `strictVersion` 改为 `false`
- 长期方案：升级到统一版本

#### Q3: 静态模式下业务模块不可用

- 这是预期行为。静态模式下 `buildRemotes()` 返回空对象
- 若需启用核心模块，将 `VITE_DEPLOYMENT_MODE` 改为 `module-federation` 或 `hybrid`

#### Q4: 预加载失败但不影响功能

- `preloadRemoteModules` 使用 `Promise.allSettled`，失败不阻塞
- 检查远程 entry 是否可访问（CORS / 网络）
- 检查 remote 是否导出了 `./preload` 模块（可选）

---

## 7. 参考

- [Module Federation Vite 插件文档](https://github.com/module-federation/vite)
- [TOPEMS 模块清单](../../apps/web/src/microfrontend/config.ts)
- [RemoteLoader 实现](../../apps/web/src/microfrontend/RemoteLoader.tsx)
- [vite.config.ts federation 配置](../../apps/web/vite.config.ts)
- [部署主指南](../deployment-guide.md)
