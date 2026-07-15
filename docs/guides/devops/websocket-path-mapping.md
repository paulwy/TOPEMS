# WebSocket 连接路径映射规范

## 1. 概述

本文档定义 TOPEMS 系统中 WebSocket 连接路径的统一规范，确保前后端 WebSocket 路由的一致性和可维护性。

## 2. 路径命名规范

### 2.1 统一路径格式

所有服务的 WebSocket 路由必须遵循统一的命名约定：

```
/ws/{module}/{feature}
```

| 组成部分 | 说明 | 示例 |
|---------|------|------|
| `{module}` | 服务模块名称 | `core`, `mes`, `bi`, `gis` |
| `{feature}` | 功能标识 | `notifications`, `im`, `dashboard` |

### 2.2 路径规范原则

- **统一前缀**：所有 WebSocket 路径必须以 `/ws/` 开头
- **模块隔离**：通过模块名区分不同服务的 WebSocket 连接
- **功能明确**：功能标识清晰表达 WebSocket 的用途

## 3. 完整路径映射表

### 3.1 核心服务 (Unified Core)

| 功能 | 前端路径 | Vite 代理 | 后端路由 | 服务端口 |
|------|----------|----------|----------|----------|
| 通知服务 | `/ws/core/notifications` | `/ws/core` → 8000 | `/ws/core/notifications` | 8000 |
| IM 即时通讯 | `/ws/core/im` | `/ws/core` → 8000 | `/ws/core/im` | 8000 |

### 3.2 业务服务

| 服务 | 功能 | 前端路径 | Vite 代理 | 后端路由 | 服务端口 |
|------|------|----------|----------|----------|----------|
| MES | 生产仪表盘 | `/ws/mes/dashboard` | `/ws/mes` → 8030 | `/ws/mes/dashboard` | 8030 |
| BI | 数据分析仪表盘 | `/ws/bi/dashboard/{id}` | `/ws/bi` → 8060 | `/ws/bi/dashboard/{id}` | 8060 |
| GIS | 地图实时数据 | `/ws/gis` | `/ws/gis` → 8071 | `/ws/gis` | 8071 |

### 3.3 完整映射流程图

```
前端请求                    Vite代理配置              后端服务路由
───────────────────────────────────────────────────────────────────
/ws/core/notifications    ──► /ws/core → 8000       ──► /ws/core/notifications (Core)
/ws/core/im               ──► /ws/core → 8000       ──► /ws/core/im (Core)
/ws/mes/dashboard         ──► /ws/mes → 8030        ──► /ws/mes/dashboard (MES)
/ws/bi/dashboard/{uuid}   ──► /ws/bi → 8060         ──► /ws/bi/dashboard/{uuid} (BI)
/ws/gis                   ──► /ws/gis → 8071        ──► /ws/gis (GIS)
```

## 4. 前端代码实现

### 4.1 通知服务 WebSocket

**文件**: `apps/web/src/hooks/useNotificationWebSocket.ts`

```typescript
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsUrl = `${wsProtocol}://${window.location.host}/ws/core/notifications`;
const ws = new WebSocket(wsUrl);
```

**使用组件**: `components/notifications/NotificationBell.tsx`

### 4.2 IM 服务 WebSocket

**文件**: `apps/web/src/hooks/useWebSocket.ts`

```typescript
export interface UseWebSocketOptions {
  onMessage?: (message: string | WsMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  maxReconnectDelay?: number;
  minReconnectDelay?: number;
  connectionTimeout?: number;
  wsPath?: string;
  queryParams?: Record<string, string>;
  authMessage?: string | (() => string);
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { wsPath, queryParams, ...rest } = options;
  
  const buildWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = wsPath || '/ws/core/im';
    
    let url = `${protocol}//${window.location.host}${path}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }
    
    return url;
  }, [wsPath, queryParams]);

  const connect = useCallback(() => {
    const wsUrl = buildWsUrl();
    const ws = new WebSocket(wsUrl);
    // ...
  }, [buildWsUrl]);
}
```

**使用组件**: `components/im/ChatInterface.tsx`

```typescript
const { isConnected, connect, disconnect, send } = useWebSocket({
  onMessage: handleWsMessage,
  onOpen: handleWsOpen,
  onClose: handleWsClose,
  wsPath: '/ws/core/im',
});
```

### 4.3 MES / BI / GIS 仪表盘 WebSocket

**文件**: `apps/web/src/hooks/useDashboardWebSocket.ts`

```typescript
const MODULE_WS_PATHS: Record<string, string> = {
  mes: '/ws/mes/dashboard',
  bi: '/ws/bi/dashboard',
  gis: '/ws/gis',
};

export function useDashboardWebSocket(options: UseDashboardWebSocketOptions = {}) {
  const {
    dashboardId,
    module = 'mes',
    onMessage,
    // ...
    enabled = true,
  } = options;

  const { token } = useAuthStore();

  const wsPath = useMemo(() => {
    const basePath = MODULE_WS_PATHS[module] || MODULE_WS_PATHS.mes;
    if (dashboardId && module === 'bi') {
      return `${basePath}/${dashboardId}`;
    }
    return basePath;
  }, [module, dashboardId]);

  const queryParams = useMemo(() => {
    if (token) {
      return { token };
    }
    return undefined;
  }, [token]);

  const { isConnected, connectionStatus, reconnectCount, error, connect, disconnect, send } = useWebSocket({
    wsPath,
    queryParams,
    // ...
    enabled,
  });

  return { isConnected, connectionStatus, reconnectCount, error, connect, disconnect, send };
}
```

**MES 使用页面**: `pages/mes/ProductionDashboardPage.tsx`

```typescript
const {
  isConnected: wsConnected,
  connectionStatus: wsStatus,
  reconnectCount: wsReconnectCount,
} = useDashboardWebSocket({
  module: 'mes',
  reconnectAttempts: 10,
  maxReconnectDelay: 30000,
  minReconnectDelay: 1000,
  connectionTimeout: 15000,
  enabled: autoRefresh && wsSupported && !!token,
  onMessage: (message) => {
    if (message?.type === 'alarms' && message.data?.alarms) {
      setAlarms(message.data.alarms);
    }
  },
});
```

### 4.4 前端路径使用规范

| 使用场景 | 推荐方式 | 说明 |
|---------|---------|------|
| 通用 WebSocket | `useWebSocket({ wsPath: '/ws/core/im' })` | 通过 `wsPath` 显式指定路径 |
| 通知服务 | `useNotificationWebSocket()` | 专用 hook，内部已配置路径 |
| 仪表盘类（MES/BI/GIS） | `useDashboardWebSocket({ module: 'mes' })` | 专用 dashboard hook，支持 token 查询参数 |

## 5. 后端路由配置

### 5.1 Core 服务路由

**文件**: `svc/unified-core/src/main.rs`

```rust
// 统一 WebSocket 路由
.route("/ws/core/notifications", get(modules::communication::ws::notifications_websocket))
.route("/ws/core/im", get(modules::communication::ws::im_websocket))
```

### 5.2 MES 服务路由

**文件**: `svc/mes/src/main.rs`

```rust
.route("/ws/mes/dashboard", axum::routing::get(modules::dashboard_ws::dashboard_websocket))
```

### 5.3 BI 服务路由

**文件**: `svc/analytics/src/main.rs`

```rust
.route("/ws/bi/dashboard/{dashboard_id}", get(modules::bi::websocket::dashboard_websocket))
```

### 5.4 GIS 服务路由

**文件**: `svc/gis/src/main.rs`

```rust
.route("/ws/gis", get(modules::gis_ws::gis_websocket))
```

## 6. Vite 代理配置

### 6.1 统一配置方式 (services 列表)

**文件**: `apps/web/vite.config.ts`

```typescript
// WebSocket 路径规范: /ws/{module}/{feature}
const services: ServiceConfig[] = [
  // Core services
  { name: 'core', port: 8000, hasWs: true, wsPath: '/ws/core' },
  // Business services
  { name: 'mes', port: 8030, hasWs: true, wsPath: '/ws/mes' },
  { name: 'bi', port: 8060, hasWs: true, wsPath: '/ws/bi' },
  { name: 'gis', port: 8071, hasWs: true, wsPath: '/ws/gis' },
  // ...
];

// 代理生成逻辑:
// 1. API 代理: 路径前缀匹配到对应服务端口
// 2. WebSocket 代理: hasWs + wsPath 自动生成带 ws:true 的代理配置
```

### 6.2 代理配置检查清单

- [ ] 启用 `ws: true` 支持 WebSocket
- [ ] 设置 `proxyTimeout: 60000` 和 `timeout: 60000`
- [ ] 添加 Upgrade 头配置（Connection: Upgrade, Upgrade: websocket）
- [ ] 配置 `changeOrigin: true`
- [ ] wsPath 与后端路由前缀一致

## 7. 新旧路径对比

### 7.1 Core 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 通知服务 | `/ws/notifications` | `/ws/core/notifications` | ✅ 已更新 |
| IM 服务 | `/ws/im` | `/ws/core/im` | ✅ 已更新 |

### 7.2 MES 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 仪表盘 | `/mes/ws/dashboard` | `/ws/mes/dashboard` | ✅ 已更新 |
| Vite 代理 | `/mes/ws` | `/ws/mes` | ✅ 已更新 |

### 7.3 BI 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 仪表盘 | `/ws/dashboard/{id}` | `/ws/bi/dashboard/{id}` | ✅ 已更新 |
| Vite 代理 | `/ws/dashboard` | `/ws/bi` | ✅ 已更新 |

### 7.4 GIS 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 地图数据 | `/gis/ws` | `/ws/gis` | ✅ 已更新 |
| Vite 代理 | `/gis/ws` | `/ws/gis` | ✅ 已更新 |

## 8. 配置清理

### 8.1 已移除的配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| `config.ws.url` | `apps/web/src/config/runtime.ts` | 不再使用，已删除 |
| `url` 字段 | `apps/web/src/config/types.ts` | WebSocketConfig 接口中已移除 |

### 8.2 保留的配置

| 配置项 | 文件 | 说明 |
|--------|------|------|
| `config.ws.reconnectInterval` | `apps/web/src/config/runtime.ts` | 重连间隔 |
| `config.ws.maxReconnectAttempts` | `apps/web/src/config/runtime.ts` | 最大重连次数 |

## 9. 新增服务 WebSocket 添加流程

### 9.1 步骤说明

1. **定义后端路由**：在服务的 `main.rs` 中添加 WebSocket 路由，格式 `/ws/{module}/{feature}`
2. **配置 Vite 代理**：在 `vite.config.ts` 的 services 列表中添加 `hasWs: true, wsPath: '/ws/{module}'`
3. **实现前端 hook**：创建或更新 WebSocket hook（推荐复用 useWebSocket 或 useDashboardWebSocket）
4. **更新文档**：更新本文档的路径映射表

### 9.2 新增服务模板

```typescript
// vite.config.ts 添加服务
{ name: 'module', port: PORT, hasWs: true, wsPath: '/ws/module' },
```

```rust
// main.rs 添加路由
.route("/ws/module/feature", get(api::websocket::handler))
```

```typescript
// 前端使用
const { isConnected } = useWebSocket({
  wsPath: '/ws/module/feature',
});
```

## 10. 最佳实践

### 10.1 路径命名最佳实践

#### 模块命名规范

| 规则 | 说明 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 使用服务简称 | 与服务目录名保持一致 | `mes`, `bi`, `gis` | `messa`, `business-intel` |
| 全小写 | 统一使用小写字母 | `core` | `Core`, `CORE` |
| 短横线分隔 | 多词模块使用短横线 | `order-service` | `orderService`, `order_service` |
| 避免缩写歧义 | 缩写必须团队共识 | `ims` (已约定) | `svc1`, `modA` |

#### 功能命名规范

| 规则 | 说明 | 正确示例 | 错误示例 |
|------|------|---------|---------|
| 名词或名词短语 | 清晰表达用途 | `notifications`, `dashboard` | `notify`, `dash` |
| 全小写 + 短横线 | 多词功能用短横线分隔 | `order-updates` | `orderUpdates`, `order_updates` |
| 避免动词前缀 | 路径是资源定位，不是动作 | `data-stream` | `get-data`, `stream-data` |
| 后缀明确类型 | WebSocket 通常是持续流 | `-stream`, `-events` 可选后缀 | 无意义后缀 |

#### 动态参数使用规范

```
✅ 正确：/ws/bi/dashboard/{dashboard_id}    （资源ID放末尾）
✅ 正确：/ws/device/{device_id}/telemetry   （层级清晰）
❌ 错误：/ws/dashboard/{id}/bi              （模块位置不对）
❌ 错误：/ws/bi/{dashboard_id}              （缺少功能标识）
```

动态参数设计原则：
- 参数必须放在路径末尾，其后不应再有静态片段
- 参数名使用 `snake_case`，与 Rust 后端变量命名一致
- 一个路径中动态参数不超过 2 个，超过时考虑使用查询参数

### 10.2 前后端一致性最佳实践

#### 同步变更流程

新增或修改 WebSocket 路径时，必须按以下顺序同步变更：

```
1. 更新后端路由 (svc/*/src/main.rs)
        │
        ▼
2. 更新 Vite 代理 (apps/web/vite.config.ts services 列表)
        │
        ▼
3. 更新前端 Hook 路径映射 (useDashboardWebSocket.ts)
        │
        ▼
4. 更新本文档路径映射表
        │
        ▼
5. 运行验证脚本：./scripts/topems.sh ws check
```

**禁止**只更新前端或只更新后端。任何路径变更必须经过完整流程，否则会导致 404 或连接失败。

#### 文档同步检查清单

每次路径变更提交前，确认以下文档已同步：

- [ ] `websocket-path-mapping.md` — 路径映射表、新旧对比表
- [ ] `developers-guide.md` — 路由示例、Vite 配置示例
- [ ] `proxy-config-guide.md` — 代理模板、services 配置示例
- [ ] `vite-proxy-verification-report.md` — 验证报告（如适用）

### 10.3 Hook 封装最佳实践

#### 何时创建专用 Hook

| 场景 | 推荐方案 | 示例 |
|------|---------|------|
| 通用一次性连接 | 直接使用 `useWebSocket` + `wsPath` | 临时调试页面 |
| 某功能被 2+ 页面复用 | 创建专用 Hook | `useNotificationWebSocket()` |
| 需要组合业务逻辑 | 创建专用 Hook | `useDashboardWebSocket()` (含 token 处理) |
| 特定模块有多个 WebSocket | 按模块创建 Hook 族 | `useMesRealtime*()` |

#### 避免硬编码：路径集中管理

**✅ 推荐：路径集中在 Hook 常量中**

```typescript
// apps/web/src/hooks/useDashboardWebSocket.ts
const MODULE_WS_PATHS: Record<string, string> = {
  mes: '/ws/mes/dashboard',
  bi:  '/ws/bi/dashboard',
  gis: '/ws/gis',
};

export function useDashboardWebSocket({ module, ... }: Options) {
  const basePath = MODULE_WS_PATHS[module];
  // ...
}
```

**❌ 禁止：路径散落在各页面组件中**

```typescript
// ProductionDashboardPage.tsx — 不要这样写
const { ... } = useWebSocket({ wsPath: '/ws/mes/dashboard' });

// BIDashboardPage.tsx — 不要这样写
const { ... } = useWebSocket({ wsPath: `/ws/bi/dashboard/${id}` });
```

好处：路径变更时只需修改一处常量，而非全项目搜索替换。

#### 认证参数传递

**✅ 推荐：在 Hook 内部封装 token 查询参数**

```typescript
export function useDashboardWebSocket({ module, ... }: Options) {
  const { token } = useAuthStore();
  const queryParams = token ? { token } : undefined;
  return useWebSocket({ wsPath, queryParams, ... });
}
```

**❌ 禁止：调用方在每个页面手动拼接 token**

```typescript
// 不要这样写
const { token } = useAuthStore();
const { ... } = useWebSocket({
  wsPath: `/ws/mes/dashboard?token=${token}`,
});
```

### 10.4 代理配置最佳实践

#### wsPath 前缀匹配原则

`wsPath` 应为后端路由的**最短公共前缀**，且以 `/` 结尾时支持前缀匹配：

| 后端路由 | wsPath | 说明 |
|---------|--------|------|
| `/ws/mes/dashboard` | `/ws/mes` | ✅ 正确，前缀匹配所有 mes WebSocket |
| `/ws/bi/dashboard/{id}` | `/ws/bi` | ✅ 正确，匹配所有带 ID 的路径 |
| `/ws/core/notifications`, `/ws/core/im` | `/ws/core` | ✅ 正确，一条代理覆盖两个功能 |
| `/ws/mes/dashboard` | `/ws/mes/dashboard` | ⚠️ 功能可行，但扩展性差，无法新增功能 |

#### 避免使用路径重写

**✅ 推荐：前后端路径完全一致，无需 rewrite**

```typescript
{
  name: 'mes',
  port: 8030,
  hasWs: true,
  wsPath: '/ws/mes',   // 前端 = 后端，不重写
}
```

**❌ 避免：使用 rewrite 掩盖路径不一致**

```typescript
// 不要这样做，路径不一致会增加维护成本
{
  name: 'gis',
  port: 8071,
  hasWs: true,
  wsPath: '/gis/ws',
  rewrite: (path) => path.replace(/^\/gis\/ws/, '/api/gis/ws'),
}
```

理由：rewrite 规则在生产环境（Nginx/Ingress）中需要重复配置，容易漏配导致生产故障。

#### 超时配置标准值

所有 WebSocket 代理必须使用统一的超时配置：

```typescript
ws: true,
changeOrigin: true,
proxyTimeout: 60000,  // 60 秒代理超时
timeout: 60000,       // 60 秒连接超时
```

如果确有特殊需求（如长连接 > 60s），需在代码注释中说明理由。

### 10.5 认证与安全最佳实践

#### Token 传递方式

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| 查询参数 `?token=xxx` | ✅ **推荐** | WebSocket 浏览器 API 不支持自定义 Header，这是标准做法 |
| 子协议 Header | 可行但不推荐 | 需要后端额外解析，跨端兼容性较差 |
| Cookie | 仅同源可⽤ | 跨服务部署时不可靠 |

Hook 实现应自动注入 token，调用方无需关心。

#### 路径白名单

后端认证中间件中，必须放行 WebSocket 路径前缀：

```rust
// svc/unified-core/src/middleware/auth_middleware.rs
let exempt_paths = [
    "/ws/",          // 放行所有 WebSocket（在 WS Handler 内部再校验 token）
    "/api/auth",
];
```

注意：中间件放行不代表不需要认证。WebSocket Handler 内部必须自行校验查询参数中的 token，防止未授权连接。

### 10.6 调试与排查最佳实践

#### 快速定位问题的三步法

**第 1 步：跑自动化检查**

```bash
./scripts/topems.sh ws check
# 输出每个端点的握手状态码 (101 = 成功, 其他 = 失败)
```

**第 2 步：定位故障层**

```
返回 404 → 问题在 Vite 代理或后端路由
  ├─ 直接访问后端 ws://localhost:PORT/ws/xxx 可行
  │   → Vite 代理配置错误 (wsPath 不匹配)
  └─ 直接访问后端也 404
      → 后端路由未注册或服务未启动

返回 401 → 认证问题 (token 未传递或过期)
返回 502 → 后端服务未启动或端口错误
返回 超时 → 防火墙/网络或端口未监听
```

**第 3 步：浏览器控制台验证**

在浏览器 DevTools Console 中执行：

```javascript
// 测试 MES WebSocket
ws = new WebSocket('ws://localhost:3000/ws/mes/dashboard?token=YOUR_TOKEN')
ws.onopen  = () => console.log('✅ 连接成功')
ws.onmessage = (e) => console.log('📨 收到消息:', e.data)
ws.onerror = (e) => console.log('❌ 连接错误:', e)
```

在 Network → WS 标签页中观察 Frame 数据。

#### 查看 Vite 代理日志

启动前端后，Vite 会输出代理转发日志。如果请求未出现，说明 wsPath 前缀不匹配。如果请求出现但后端报 404，对比日志中的转发路径与后端路由。

### 10.7 代码审查检查清单

PR 涉及 WebSocket 变更时，审查者必须确认以下项：

**路径规范**
- [ ] 路径格式符合 `/ws/{module}/{feature}` 规范
- [ ] 模块名、功能名遵循命名规则（小写、短横线、无歧义）
- [ ] 动态参数在路径末尾且命名使用 `snake_case`

**前后端一致性**
- [ ] 后端路由已同步更新
- [ ] `vite.config.ts` services 列表的 `wsPath` 与后端前缀一致
- [ ] Hook 常量 `MODULE_WS_PATHS` 已同步
- [ ] 未使用 `rewrite` 掩盖路径不一致

**代码质量**
- [ ] 使用专用 Hook，未在页面组件中硬编码 wsPath
- [ ] Hook 内部自动注入 token 查询参数
- [ ] 代理超时使用标准值 60000，特殊值有注释说明

**文档与验证**
- [ ] 本文档路径映射表已更新
- [ ] 新旧路径对比表已添加（如有变更）
- [ ] 本地运行 `./scripts/topems.sh ws check` 全部通过
- [ ] 相关开发文档 (developers-guide.md, proxy-config-guide.md) 已同步

---

## 11. 验证测试

### 11.1 自动化测试

```bash
# 运行 WebSocket 检查脚本
./scripts/topems.sh ws check

# 运行 TypeScript 类型检查
cd apps/web && npx tsc --noEmit
```

### 11.2 手动验证

```bash
# 检查服务状态
./scripts/topems.sh status

# 检查端口监听
lsof -i :8000  # Core
lsof -i :8030  # MES
lsof -i :8060  # BI
lsof -i :8071  # GIS

# 直接测试 WebSocket 握手
curl -s -o /dev/null -w "%{http_code}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  http://localhost:3000/ws/mes/dashboard
```

## 12. 常见问题

### 12.1 WebSocket 连接失败

**可能原因**:
- 后端服务未运行
- Vite 代理配置错误
- 前后端路径不匹配
- 认证 token 未传递

**排查步骤**:
1. 检查服务状态：`./scripts/topems.sh status`
2. 运行 WebSocket 检查：`./scripts/topems.sh ws check`
3. 查看 Vite 代理日志，确认转发路径
4. 直接访问后端验证路由是否存在

### 12.2 代理配置了但 WebSocket 不工作

**检查项**:
- services 列表中是否设置了 `hasWs: true`
- `wsPath` 是否与后端路由前缀匹配
- 路径是否在后端路由中存在

### 12.3 BI 服务路径需要动态 ID

BI 仪表盘 WebSocket 需要在路径中携带 dashboard_id：

```typescript
const { isConnected } = useDashboardWebSocket({
  module: 'bi',
  dashboardId: 'your-dashboard-uuid',
});
```

## 附录：路径常量定义

建议在前端代码中通过 hook 模块自动管理路径，避免硬编码：

```typescript
// apps/web/src/hooks/useDashboardWebSocket.ts
const MODULE_WS_PATHS: Record<string, string> = {
  core: '/ws/core',
  mes: '/ws/mes/dashboard',
  bi: '/ws/bi/dashboard',
  gis: '/ws/gis',
};
```

使用方式：

```typescript
// 优先使用专用 hook
const { isConnected, connectionStatus } = useDashboardWebSocket({
  module: 'mes',
});
```
