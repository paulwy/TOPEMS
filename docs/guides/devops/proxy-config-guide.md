# Vite 代理配置规范

## 1. 概述

本文档定义 TOPEMS 前端项目中 Vite 代理配置的规范和最佳实践，确保代理规则的一致性、可维护性和正确性。

**核心变更（2026-07-09）**: 代理配置已从手动维护升级为程序化生成。新增服务只需在 `services` 数组中添加一行配置，`generateServiceProxies` 函数会自动生成所有标准代理规则（API、健康检查、页面路由、WebSocket、plugin-health）。

## 2. 代理规则顺序原则

### 2.1 精确匹配优先

Vite 代理按照配置顺序匹配，**先匹配的规则优先**。必须遵循以下顺序：

1. **精确路径**（如 `/lims/health`）
2. **带通配符的具体路径**（如 `/lims/api/`）
3. **通用路径**（如 `/lims/`）

```typescript
// ❌ 错误：通用路径先匹配
'/lims/': { ... },
'/lims/health': { ... },

// ✅ 正确：精确路径优先
'/lims/health': { ... },
'/lims/': { ... },
```

### 2.2 优先级排序

| 优先级 | 规则类型 | 示例 |
|--------|---------|------|
| 1 | 精确路径匹配 | `/lims/health` |
| 2 | 带末尾斜杠的路径 | `/lims/api/` |
| 3 | 通用路径 | `/lims/` |
| 4 | 插件健康检查 | `/plugin-health/lims` |

## 3. 服务端口管理

### 3.1 端口定义来源

所有服务端口必须与以下文件保持一致：

- `scripts/topems.sh` - 服务启动脚本
- `apps/web/src/config/runtime.ts` - 前端服务配置
- `vite.config.ts` - Vite 代理配置

### 3.2 标准端口列表

| 服务 | 端口 | 后端目录 |
|------|------|---------|
| unified-core | 8000 | svc/unified-core |
| ERP | 8010 | svc/erp |
| AI | 8013 | svc/ai |
| Comm | 8000 | svc/core (useCoreService) |
| File | 8000 | svc/core (useCoreService) |
| Mail | 8000 | svc/core (useCoreService) |
| Notification | 8000 | svc/core (useCoreService) |
| IM | 8000 | svc/core (useCoreService) |
| Master | 8000 | svc/core (useCoreService) |
| Migration | 8000 | svc/core (useCoreService) |
| Flow | 8000 | svc/core (useCoreService) |
| Doc | 8012 | svc/doc |
| HRM | 8020 | svc/hrm |
| PM | 8023 | svc/pm |
| CRM | 8029 | svc/crm |
| MES | 8030 | svc/mes |
| Manufacturing | 8030 | svc/mes (skipPluginHealth) |
| PDM | 8031 | svc/pdm |
| SCM | 8040 | svc/scm |
| WMS | 8041 | svc/wms |
| SRM | 8042 | svc/srm |
| QMS | 8050 | svc/qms |
| LIMS | 8051 | svc/lims |
| EHS | 8052 | svc/ehs |
| RS | 8053 | svc/rs |
| BI | 8060 | svc/analytics (bi) |
| Report | 8060 | svc/analytics (report, skipPluginHealth) |
| Monitor | 8062 | svc/monitor |
| Portal | 8063 | svc/portal |
| Mobile | 8070 | svc/mobile |
| GIS | 8071 | svc/gis |
| Integration | 8072 | svc/integration |

### 3.3 端口验证

添加新服务或修改端口时，必须执行以下验证：

```bash
# 检查服务状态
./scripts/topems.sh status

# 验证端口监听
lsof -i :<端口号>

# 运行代理测试
./scripts/test-proxy.sh
```

## 4. 程序化代理配置（推荐方式）

### 4.1 服务配置数组

所有服务的代理配置集中定义在 `services` 数组中，`generateServiceProxies` 函数会自动生成标准代理规则：

```typescript
interface ServiceConfig {
  name: string;                          // 服务名称
  port: number;                          // 服务端口
  target?: string;                       // 自定义目标地址
  basePath?: string;                     // 自定义基础路径
  apiRewrite?: (path: string) => string; // 自定义API重写规则
  healthRewrite?: (path: string) => string; // 自定义健康检查重写规则
  pageRewrite?: (path: string) => string;   // 自定义页面路由重写规则
  hasWs?: boolean;                       // 是否支持WebSocket
  wsPath?: string;                       // WebSocket路径
  wsRewrite?: (path: string) => string;  // WebSocket重写规则
  useCoreService?: boolean;              // 是否使用核心服务端口(8000)
  skipPluginHealth?: boolean;            // 是否跳过plugin-health生成
}

const services: ServiceConfig[] = [
  { name: 'core', port: 8000, hasWs: true, wsPath: '/ws/core' },
  { name: 'comm', port: 8000, useCoreService: true },
  { name: 'erp', port: 8010, apiRewrite: (path) => path.replace(/^\/erp\/system/, '/api/erp') },
  { name: 'hrm', port: 8020 },
  // ... 其他服务
];
```

### 4.2 自动生成的代理规则

`generateServiceProxies` 函数为每个服务自动生成以下代理规则：

| 规则类型 | 前端路径 | 后端路径 | 说明 |
|---------|---------|---------|------|
| API代理 | `/service/api/*` | `/api/service/*` | 标准API路由 |
| 健康检查 | `/service/health` | `/health` | 服务健康检查 |
| 页面路由 | `/service/*` | `/api/service/*` | 页面路由（使用PageSafeProxy） |
| WebSocket | `/ws/service` 或自定义 | 自定义 | WebSocket连接 |
| Plugin健康 | `/plugin-health/service/*` | `/*` | 插件健康检查 |

### 4.3 新增服务流程

```bash
# 1. 在 vite.config.ts 的 services 数组中添加服务配置
{ name: 'new-service', port: 80XX }

# 2. 运行 typecheck 验证配置
pnpm run typecheck

# 3. 启动开发服务器验证
pnpm run dev:web

# 4. 测试代理
curl http://localhost:3000/new-service/health
```

### 4.4 特殊配置示例

#### 自定义重写规则
```typescript
{ 
  name: 'erp', 
  port: 8010, 
  apiRewrite: (path) => path.replace(/^\/erp\/system/, '/api/erp') 
}
```

#### WebSocket支持
```typescript
{ 
  name: 'mes', 
  port: 8030, 
  hasWs: true, 
  wsPath: '/mes/ws' 
}
```

#### 使用核心服务端口
```typescript
{ 
  name: 'comm', 
  port: 8000, 
  useCoreService: true 
}
```

### 4.5 createPageSafeProxy 页面安全代理

`createPageSafeProxy` 是一个辅助函数，用于创建智能代理规则，能够区分页面请求和API请求：

```typescript
const isPageRequest = (req: IncomingMessage): boolean => {
  const url = req.url || '';
  const accept = req.headers.accept || '';
  if (url.includes('.') && !url.includes('?')) return false;
  if (url.startsWith('/api/') || url.startsWith('/ws/')) return false;
  if (url.startsWith('/notification/v1/')) return false;
  if (url.startsWith('/notification/api/v1/')) return false;
  if (url.endsWith('/health')) return false;
  if (url.includes('/api/')) return false;
  if (accept.includes('text/html') && req.method === 'GET') return true;
  return false;
};

const createPageSafeProxy = (config: any) => ({
  ...config,
  bypass: (req: IncomingMessage) => {
    if (isPageRequest(req)) {
      return req.url;
    }
    return undefined;
  },
});
```

**工作原理：**

| 判断条件 | 结果 | 说明 |
|---------|------|------|
| URL包含文件扩展名（如 `.js`, `.css`） | API请求 | 静态资源不视为页面 |
| URL以 `/api/` 或 `/ws/` 开头 | API请求 | 明确的API/WebSocket路径 |
| URL包含 `/api/` | API请求 | 中间包含API路径 |
| URL以 `/notification/v1/` 开头 | API请求 | 通知服务API |
| URL以 `/notification/api/v1/` 开头 | API请求 | 通知服务API |
| URL以 `/health` 结尾 | API请求 | 健康检查路径 |
| Accept头包含 `text/html` 且GET方法 | 页面请求 | 浏览器页面导航 |

**使用场景：**

页面安全代理主要用于 `useCoreService` 服务，防止页面路由被错误转发到后端：

```typescript
// 页面路由（由前端处理，不转发到后端）
'/iam/': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\//, '/api/core/iam/'),
}),

// API请求（转发到后端）
'/iam/api': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\//, '/api/core/iam/'),
},
```

### 4.6 useCoreService 服务的手动代理规则

标记为 `useCoreService: true` 的服务不参与自动代理生成，需要手动配置。以下是 `useCoreService` 服务的完整代理规则示例：

**Comm 服务：**
```typescript
'/comm/api': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/comm/, '/api/core/comm'),
},
'/comm/health': {
  target: 'http://localhost:8000',
  changeOrigin: true,
},
```

**IAM 服务（含认证路径）：**
```typescript
'/iam/api/iam/auth/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\/auth\//, '/api/v1/auth/'),
},
'/iam/api': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/api\/iam\//, '/api/core/iam/'),
},
'/iam/auth/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/auth\//, '/api/v1/auth/'),
},
'/iam/': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\//, '/api/core/iam/'),
}),
```

**File 服务：**
```typescript
'/file': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/file(\/.*)$/, '/api/core/file$1'),
}),
```

**Mail 服务：**
```typescript
'/mail': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/mail(\/.*)$/, '/api/core/comm/mail$1'),
}),
```

**Notification 服务（含特殊API路径）：**
```typescript
'/notification/api/v1': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/notification\/api\/v1/, '/api/v1'),
},
'/notification/v1': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/notification\/v1/, '/api/v1'),
},
'/notification': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/notification(\/.*)$/, '/api$1'),
}),
```

**IM 服务：**
```typescript
'/im': createPageSafeProxy({
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/im(\/.*)$/, '/api/core/comm/im$1'),
}),
```

## 5. 代理规则配置规范

### 5.1 标准规则模板（保留用于特殊情况）

使用 `createServiceProxyConfig`、`createCoreServiceProxyConfig` 和 `createHealthProxyConfig` 辅助函数：

```typescript
// 1. 业务服务API路径（带rewrite，转为 /api/service/xxx）
'/service/api': createServiceProxyConfig('service', 'http://localhost:<端口>'),

// 2. 核心服务API路径（带rewrite，转为 /api/xxx，无服务名前缀）
'/master/api': createCoreServiceProxyConfig('master', 'http://localhost:8000'),

// 3. 健康检查（精确路径，转为 /health）
'/service/health': createHealthProxyConfig('service', 'http://localhost:<端口>'),

// 4. 通用路径（带rewrite）
'/service/': {
  target: 'http://localhost:<端口>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/service/, '/api/service'),
  configure: createProxyLogger('service', 'http://localhost:<端口>'),
},
```

### 5.2 Rewrite 规则规范

| 前端路径 | 使用函数 | Rewrite 规则 | 后端路径 |
|---------|---------|-------------|---------|
| `/erp/api/xxx` | `createServiceProxyConfig` | `/erp` → `/api/erp` | `/api/erp/xxx` |
| `/erp/health` | `createHealthProxyConfig` | `/erp` → `` | `/health` |
| `/hrm/api/xxx` | `createServiceProxyConfig` | `/hrm` → `/api/hrm` | `/api/hrm/xxx` |
| `/hrm/health` | `createHealthProxyConfig` | `/hrm` → `` | `/health` |
| `/lims/api/xxx` | `createServiceProxyConfig` | `/lims` → `/api/lims` | `/api/lims/xxx` |
| `/lims/health` | `createHealthProxyConfig` | `/lims` → `` | `/health` |
| `/master/api/xxx` | `createCoreServiceProxyConfig` | `/master` → `` | `/api/xxx` |
| `/master/health` | `createHealthProxyConfig` | `/master` → `` | `/health` |
| `/plugin-health/erp/xxx` | 手动配置 | `/plugin-health/erp` → `` | `/xxx` |

### 5.3 特殊路径处理

#### IAM 认证路径

```typescript
// 登录认证 - 重写为 /api/v1/auth/
'/iam/auth/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\/auth\//, '/api/v1/auth/'),
},

// IAM API - 重写为 /api/core/iam/
'/iam/': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/iam\//, '/api/core/iam/'),
},
```

#### 文档服务路径

```typescript
'/doc': {
  target: 'http://localhost:8012',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/doc(\/.*)$/, '/api/doc$1'),
},
```

## 6. WebSocket 代理配置规范

### 6.1 WebSocket 路径命名规范

所有服务的 WebSocket 路由必须遵循统一的命名约定：

```
/ws/{module}/{feature}
```

| 服务 | 模块 | 功能 | 前端路径 | 后端路径 |
|------|------|------|----------|----------|
| unified-core | core | 通知 | `/ws/core/notifications` | `/ws/core/notifications` |
| unified-core | core | IM | `/ws/core/im` | `/ws/core/im` |
| MES | mes | 仪表盘 | `/mes/ws/dashboard` | `/mes/ws/dashboard` |
| GIS | gis | 通用 | `/gis/ws` | `/ws/gis` |

### 6.2 WebSocket 代理配置模板

```typescript
// Core WebSocket（无重写，直接转发）
'/ws/core': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
  configure: (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
      if (req.headers['upgrade'] && req.headers['upgrade'].toLowerCase() === 'websocket') {
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
      }
    });
  },
},

// 业务服务 WebSocket（无重写，直接转发）
'/mes/ws': {
  target: 'http://localhost:8030',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
  configure: (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
      if (req.headers['upgrade'] && req.headers['upgrade'].toLowerCase() === 'websocket') {
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
      }
    });
  },
},

// GIS WebSocket（带重写）
'/gis/ws': {
  target: 'http://localhost:8071',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
  rewrite: (path: string) => path.replace(/^\/gis\/ws/, '/api/gis/ws'),
  configure: (proxy: any) => {
    proxy.on('proxyReq', (proxyReq: any, req: IncomingMessage) => {
      if (req.headers['upgrade'] && req.headers['upgrade'].toLowerCase() === 'websocket') {
        proxyReq.setHeader('Connection', 'Upgrade');
        proxyReq.setHeader('Upgrade', 'websocket');
      }
    });
  },
},
```

### 5.3 WebSocket 配置注意事项

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `ws` | `true` | 必须启用 WebSocket 支持 |
| `proxyTimeout` | `60000` | 代理超时时间（毫秒） |
| `timeout` | `60000` | 连接超时时间（毫秒） |
| `changeOrigin` | `true` | 必须设置为 true |
| `Upgrade` Header | `websocket` | 必须设置 WebSocket Upgrade 头 |
| `Connection` Header | `Upgrade` | 必须设置 Connection Upgrade 头 |

### 6.3 前端 WebSocket 连接方式

```typescript
// 通知服务
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/core/notifications`;

// IM 服务（通过配置动态生成）
const servicePath = config.services.im; // '/im'
const wsPath = `/ws/core${servicePath}`; // '/ws/core/im'
const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${wsPath}`;

// MES 仪表盘
const wsUrl = `${protocol}//${host}/mes/ws/dashboard${tokenParam}`;
```

## 7. 日志配置规范

### 7.1 必须配置日志

所有代理规则必须包含 `configure: createProxyLogger()` 配置，确保请求转发过程可追踪。

```typescript
'/service/': {
  target: 'http://localhost:8010',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/service/, '/api/service'),
  configure: createProxyLogger('service', 'http://localhost:8010'),
},
```

### 7.2 日志格式

```
[Vite Proxy] SERVICE_NAME METHOD original_path -> target_url
[Vite Proxy] SERVICE_NAME METHOD original_path <- status_code
```

### 7.3 颜色编码

| 状态码 | 颜色 | 含义 |
|--------|------|------|
| 2xx | 绿色 | 成功 |
| 4xx | 黄色 | 客户端错误 |
| 5xx | 红色 | 服务端错误 |

## 8. 三段映射表维护

### 8.1 映射表结构

每个代理规则必须维护三段映射关系：

| 阶段 | 路径 | 示例 |
|------|------|------|
| 前端请求 | `/erp/assets` | 用户实际请求路径 |
| Rewrite 后 | `/api/erp/assets` | Vite 重写后的路径 |
| 后端目标 | `http://localhost:8010/api/erp/assets` | 最终转发地址 |

### 8.2 映射表示例

```
ERP 服务映射:
┌─────────────────────────┬─────────────────────────┬─────────────────────────────────────┐
│ 前端请求路径            │ Rewrite 后路径          │ 后端目标地址                        │
├─────────────────────────┼─────────────────────────┼─────────────────────────────────────┤
│ /erp/health            │ /health                 │ http://localhost:8010/health       │
│ /erp/assets            │ /api/erp/assets         │ http://localhost:8010/api/erp/assets│
│ /erp/system/dict-types │ /api/erp/dict-types     │ http://localhost:8010/api/erp/dict-types │
└─────────────────────────┴─────────────────────────┴─────────────────────────────────────┘
```

## 9. 测试验证流程

### 9.1 自动化测试

使用 `scripts/test-proxy.sh` 进行全面测试：

```bash
# 运行所有模块测试
./scripts/test-proxy.sh

# 测试结果判断标准：
# - 200 OK: 代理配置正确，后端正常响应
# - 401/403: 代理配置正确，需要认证（通过）
# - 404: 代理配置或后端路由有问题（失败）
# - 502: 后端服务未运行或不可用（失败）
```

### 9.2 手动验证

```bash
# 1. 检查服务是否运行
./scripts/topems.sh status

# 2. 测试健康检查
curl http://localhost:3000/<service>/health

# 3. 测试API路径
curl http://localhost:3000/<service>/api/xxx

# 4. 查看代理日志（Vite终端输出）
# 观察格式: [Vite Proxy] SERVICE GET /path -> http://localhost:port/path
```

## 10. 常见问题排查

### 10.1 404 错误

**原因分析：**
1. 代理规则顺序错误（通用路径先匹配）
2. Rewrite 规则不正确
3. 后端路由不存在

**排查步骤：**
```bash
# 1. 检查Vite代理日志，确认转发路径
# 2. 直接访问后端验证路径是否存在
curl http://localhost:<port>/expected/path
# 3. 检查代理规则顺序
```

### 10.2 502 错误

**原因分析：**
1. 后端服务未运行
2. 端口配置错误
3. 网络连接问题

**排查步骤：**
```bash
# 1. 检查服务状态
./scripts/topems.sh status

# 2. 检查端口监听
lsof -i :<port>

# 3. 验证端口配置是否一致
# - vite.config.ts vs scripts/topems.sh
```

### 10.3 503 错误

**原因分析：**
1. 代理目标端口错误（服务运行在其他端口）
2. 服务启动失败

**排查步骤：**
```bash
# 1. 查找服务实际监听端口
lsof -i | grep <service-name>

# 2. 更新vite.config.ts中的端口配置
```

### 10.4 特殊服务路由格式

部分服务使用不同的路由前缀格式：

| 服务 | 路由前缀 | 示例 |
|------|---------|------|
| Monitor | `/api/v1/monitor` | `/api/v1/monitor/alerts` |
| 其他服务 | `/api/{service}` | `/api/pm/projects` |

**Monitor 代理配置示例：**
```typescript
'/monitor/api': {
  target: 'http://localhost:8062',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/monitor\/api/, '/api/v1/monitor'),
  configure: createProxyLogger('monitor', 'http://localhost:8062'),
},
```

### 10.5 常见错误修复案例

| 错误现象 | 根因 | 修复方案 |
|---------|------|---------|
| `/pm/api/projects` 返回 404 | rewrite 规则错误，重写为 `/api/pm/api/projects` | 修改 `createServiceProxyConfig` 规则为 `/service/api` → `/api/service` |
| `/pm/health` 返回 404 | 健康检查也使用了 API 重写规则 | 创建 `createHealthProxyConfig`，重写为 `/health` |
| `/hrm/api/employees` 返回 404 | 缺少 `/hrm/api` 规则，被 `/hrm/` 规则匹配 | 添加 `/hrm/api` 规则在通用规则之前 |
| `/monitor/api/alerts` 返回 404 | Monitor 路由前缀为 `/api/v1/monitor` | 单独配置 Monitor 的 rewrite 规则 |
| 重复代理规则 | 同一服务的代理规则定义多次 | 删除重复定义，保留包含日志配置的规则 |

## 11. 变更流程

### 11.1 添加新服务代理

```bash
# 1. 在 vite.config.ts 的 services 数组中添加服务配置
{ name: 'new-service', port: 80XX }

# 2. 运行 typecheck 验证配置
pnpm run typecheck

# 3. 启动开发服务器验证
pnpm run dev:web

# 4. 测试代理
curl http://localhost:3000/new-service/health

# 5. 更新相关文档（如需）
```

### 11.2 修改现有代理

```bash
# 1. 修改 vite.config.ts 中 services 数组的对应服务配置
# 2. 运行 typecheck 验证配置
pnpm run typecheck

# 3. 运行代理测试
./scripts/verify-vite-proxy.sh

# 4. 确认所有相关服务正常运行
./scripts/topems.sh status
```

## 12. 代码审查检查清单

- [ ] 服务是否已在 `services` 数组中正确配置（推荐方式）
- [ ] 端口配置是否与 `scripts/topems.sh` 一致
- [ ] 特殊重写规则（apiRewrite、pageRewrite）是否正确配置
- [ ] WebSocket 配置（hasWs、wsPath）是否正确
- [ ] 是否正确设置 `useCoreService` 标记
- [ ] 是否需要跳过 plugin-health（`skipPluginHealth`）
- [ ] 是否存在重复的手动代理规则定义
- [ ] 是否通过了 `scripts/verify-vite-proxy.sh` 测试
- [ ] 是否通过了 `pnpm run typecheck` 类型检查
- [ ] 是否更新了相关文档

## 附录：代理规则模板

```typescript
// 标准服务代理模板（推荐使用辅助函数）
'/<service>/api': createServiceProxyConfig('<service>', 'http://localhost:<port>'),
'/<service>/health': createHealthProxyConfig('<service>', 'http://localhost:<port>'),

// 通用路径（按需添加）
'/<service>/': {
  target: 'http://localhost:<port>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/<service>/, '/api/<service>'),
  configure: createProxyLogger('<service>', 'http://localhost:<port>'),
},

// Plugin Health 代理模板
'/plugin-health/<service>': {
  target: 'http://localhost:<port>',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/plugin-health\/<service>/, ''),
  configure: createProxyLogger('plugin-health-<service>', 'http://localhost:<port>'),
},
```

### 辅助函数说明

```typescript
// createServiceProxyConfig - API路径代理
// 输入: /service/api/xxx → 输出: http://localhost:port/api/service/xxx
// 重写规则: /service/api → /api/service
const createServiceProxyConfig = (serviceName, target) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(new RegExp(`^/${serviceName}/api`), `/api/${serviceName}`),
  configure: createProxyLogger(serviceName, target),
});

// createHealthProxyConfig - 健康检查代理
// 输入: /service/health → 输出: http://localhost:port/health
// 重写规则: /service → 空字符串
const createHealthProxyConfig = (serviceName, target) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(new RegExp(`^/${serviceName}`), ''),
  configure: createProxyLogger(serviceName, target),
});
```

### 路径重写映射表

| 前端请求 | 重写规则 | 后端目标 |
|---------|---------|---------|
| `/pm/api/projects` | `/pm/api` → `/api/pm` | `http://localhost:8023/api/pm/projects` |
| `/pm/health` | `/pm` → `` | `http://localhost:8023/health` |
| `/erp/api/assets` | `/erp/api` → `/api/erp` | `http://localhost:8010/api/erp/assets` |
| `/erp/health` | `/erp` → `` | `http://localhost:8010/health` |