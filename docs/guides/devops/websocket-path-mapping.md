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
| `{module}` | 服务模块名称 | `core`, `mes`, `gis` |
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
| MES | 生产仪表盘 | `/mes/ws/dashboard` | `/mes/ws` → 8030 | `/mes/ws/dashboard` | 8030 |
| GIS | 地图实时数据 | `/gis/ws` | `/gis/ws` → 8071 (重写) | `/api/gis/ws` | 8071 |
| GIS | 设备实时数据 | `/gis/ws/device/{device_code}` | `/gis/ws` → 8071 (重写) | `/api/gis/ws/device/{device_code}` | 8071 |

### 3.3 完整映射流程图

```
前端请求                    Vite代理配置              后端服务路由
───────────────────────────────────────────────────────────────────
/ws/core/notifications    ──► /ws/core → 8000       ──► /ws/core/notifications (Core)
/ws/core/im               ──► /ws/core → 8000       ──► /ws/core/im (Core)
/mes/ws/dashboard         ──► /mes/ws → 8030        ──► /mes/ws/dashboard (MES)
/gis/ws                   ──► /gis/ws → 8071        ──► /api/gis/ws (GIS)
/gis/ws/device/abc123     ──► /gis/ws → 8071        ──► /api/gis/ws/device/abc123 (GIS)
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
  onMessage?: (message: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  wsPath?: string;  // 新增：支持显式指定路径
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { wsPath, ...rest } = options;
  
  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsUrl = '';
    if (wsPath) {
      // 优先使用显式路径
      wsUrl = `${protocol}//${window.location.host}${wsPath}`;
    } else {
      // 回退到配置的服务路径
      const imServiceUrl = config.services.im;
      const servicePath = imServiceUrl.replace(/\/$/, '');
      const path = `/ws/core${servicePath}`;
      wsUrl = `${protocol}//${window.location.host}${path}`;
    }
    
    const ws = new WebSocket(wsUrl);
    // ...
  }, [wsPath]);
}
```

**使用组件**: `components/im/ChatInterface.tsx`

```typescript
const { isConnected, connect, disconnect, send } = useWebSocket({
  onMessage: handleWsMessage,
  onOpen: handleWsOpen,
  onClose: handleWsClose,
  wsPath: '/ws/core/im',  // 显式指定路径
});
```

### 4.3 MES 仪表盘 WebSocket

**文件**: `apps/web/src/pages/mes/ProductionDashboardPage.tsx`

```typescript
const setupWebSocket = useCallback(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:8080';
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const wsUrl = `${protocol}//${host}/mes/ws/dashboard${tokenParam}`;
  const ws = new WebSocket(wsUrl);
  // ...
}, [wsSupported, autoRefresh, token]);
```

### 4.4 前端路径使用规范

| 使用场景 | 推荐方式 | 说明 |
|---------|---------|------|
| 通用 WebSocket hook | `useWebSocket({ wsPath: '/ws/core/im' })` | 通过 `wsPath` 显式指定 |
| 通知服务 | `useNotificationWebSocket()` | 专用 hook，内部已配置路径 |
| 页面内直连 | `new WebSocket(url)` | 复杂场景直接创建 |

## 5. 后端路由配置

### 5.1 Core 服务路由

**文件**: `svc/unified-core/src/main.rs`

```rust
// 统一 WebSocket 路由（推荐使用）
.route("/ws/core/notifications", get(modules::communication::ws::websocket_handler))
.route("/ws/core/im", get(modules::communication::ws::websocket_handler))

// 兼容旧路径（保持向后兼容）
.route("/api/core/comm/ws/connect", get(modules::communication::ws::websocket_handler))
.route("/ws/notifications", get(modules::communication::ws::websocket_handler))
.route("/ws/im", get(modules::communication::ws::websocket_handler))
```

### 5.2 MES 服务路由

**文件**: `svc/mes/src/main.rs`

```rust
.route("/api/mes/ws/dashboard", axum::routing::get(api::dashboard_ws::dashboard_websocket))
.route("/mes/ws/dashboard", axum::routing::get(api::dashboard_ws::dashboard_websocket))
```

### 5.3 GIS 服务路由

**文件**: `svc/gis/src/main.rs`

```rust
.route("/api/gis/ws", get(api::websocket::websocket_handler))
.route("/api/gis/ws/device/{device_code}", get(api::websocket::websocket_device_handler))
```

## 6. Vite 代理配置

### 6.1 核心服务代理

**文件**: `apps/web/vite.config.ts`

```typescript
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
```

### 6.2 MES 服务代理

```typescript
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
```

### 6.3 GIS 服务代理（带路径重写）

```typescript
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

### 6.4 代理配置检查清单

- [ ] 启用 `ws: true` 支持 WebSocket
- [ ] 设置 `proxyTimeout: 60000` 和 `timeout: 60000`
- [ ] 添加 Upgrade 头配置（Connection: Upgrade, Upgrade: websocket）
- [ ] 配置 `changeOrigin: true`
- [ ] 添加代理日志（可选但推荐）

## 7. 新旧路径对比

### 7.1 Core 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 通知服务 | `/ws/notifications` | `/ws/core/notifications` | ✅ 已更新 |
| 通知服务 | `/api/core/comm/ws/connect` | `/ws/core/notifications` | ✅ 已更新 |
| IM 服务 | `/ws/im` | `/ws/core/im` | ✅ 已更新 |
| IM 服务 | `/api/core/comm/ws/connect` | `/ws/core/im` | ✅ 已更新 |

### 7.2 MES 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 仪表盘 | `/api/mes/ws/dashboard` | `/mes/ws/dashboard` | ⚠️ 两种路径均支持 |

### 7.3 GIS 服务变更

| 功能 | 旧路径 | 新路径 | 状态 |
|------|--------|--------|------|
| 地图数据 | 无 | `/gis/ws` | ✅ 新增 |
| 设备数据 | 无 | `/gis/ws/device/{device_code}` | ✅ 新增 |

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

1. **定义后端路由**：在服务的 `main.rs` 中添加 WebSocket 路由
2. **配置 Vite 代理**：在 `vite.config.ts` 中添加代理规则
3. **实现前端 hook**：创建或更新 WebSocket hook（推荐）
4. **更新文档**：更新本文档的路径映射表

### 9.2 新增服务模板

```typescript
// vite.config.ts 添加代理
'/module/ws': {
  target: 'http://localhost:PORT',
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
```

```rust
// main.rs 添加路由
.route("/ws/module/feature", get(api::websocket::handler))
```

## 10. 验证测试

### 10.1 自动化测试

```bash
# 运行代理测试脚本
./scripts/verify-vite-proxy.sh

# 运行 TypeScript 类型检查
cd apps/web && npx tsc --noEmit
```

### 10.2 手动验证

```bash
# 检查服务状态
./scripts/topems.sh status

# 检查端口监听
lsof -i :8000  # Core
lsof -i :8030  # MES
lsof -i :8071  # GIS

# 查看 Vite 代理日志
# 启动开发服务器后观察终端输出
# 格式: [Vite Proxy] CORE-WS GET /ws/core/im -> http://localhost:8000/ws/core/im
```

## 11. 常见问题

### 11.1 WebSocket 连接失败

**可能原因**:
- 后端服务未运行
- 代理配置错误
- 路径不匹配

**排查步骤**:
1. 检查服务状态：`./scripts/topems.sh status`
2. 查看 Vite 代理日志，确认转发路径
3. 直接访问后端验证：`curl http://localhost:8000/ws/core/notifications`

### 11.2 代理配置了但 WebSocket 不工作

**检查项**:
- 是否设置了 `ws: true`
- 是否配置了 Upgrade 头
- 路径是否在后端路由中存在

### 11.3 路径重写问题

**注意事项**:
- GIS 服务的 `/gis/ws` 需要重写为 `/api/gis/ws`
- Core 和 MES 服务不需要重写，路径直接转发

## 附录：路径常量定义

建议在前端代码中定义路径常量，避免硬编码：

```typescript
// apps/web/src/constants/ws-paths.ts
export const WS_PATHS = {
  NOTIFICATIONS: '/ws/core/notifications',
  IM: '/ws/core/im',
  MES_DASHBOARD: '/mes/ws/dashboard',
  GIS: '/gis/ws',
  GIS_DEVICE: (deviceCode: string) => `/gis/ws/device/${deviceCode}`,
};
```

使用方式：

```typescript
import { WS_PATHS } from '@/constants/ws-paths';

const { isConnected, connect } = useWebSocket({
  wsPath: WS_PATHS.IM,
});
```