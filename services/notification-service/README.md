# TOPEMS 通知系统

基于 Rust + Axum 的实时通知服务，提供 WebSocket 实时推送和 REST API 接口。

## 功能特性

- ✅ 多种通知类型（系统、审批、提醒、告警、消息）
- ✅ WebSocket 实时推送
- ✅ 通知持久化
- ✅ 通知去重
- ✅ 未读数量管理
- ✅ 通知归档（超过30天自动归档）
- ✅ 桌面通知支持
- ✅ 通知声音提示
- ✅ 用户订阅机制
- ✅ 优先级管理

## 技术栈

### 后端
- Rust
- Axum (Web 框架)
- Tokio (异步运行时)
- Serde (序列化)
- Chrono (时间处理)
- UUID (唯一ID生成)
- Tracing (日志)

### 前端
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

## API 端点

### REST API

```
GET  /api/v1/notifications          - 获取通知列表
GET  /api/v1/notifications/unread   - 获取未读通知
GET  /api/v1/notifications/unread-count - 获取未读数量
PUT  /api/v1/notifications/:id/read - 标记已读
PUT  /api/v1/notifications/read-all - 全部已读
DELETE /api/v1/notifications/:id    - 删除通知
POST /api/v1/notifications          - 创建通知
```

### WebSocket

```
WS /ws/notifications                - WebSocket 连接
```

## 数据结构

### Notification

```typescript
interface Notification {
  id: string;                    // 唯一标识
  userId: string;                // 用户ID
  notificationType: 'system' | 'workflow' | 'reminder' | 'alert' | 'message';
  title: string;                 // 通知标题
  content: string;               // 通知内容
  data?: JsonValue;              // 附加数据
  isRead: boolean;               // 是否已读
  priority: number;               // 优先级 (1-5)
  createdAt: DateTime;           // 创建时间
  readAt?: DateTime;             // 阅读时间
}
```

## 启动服务

### 1. 启动后端服务

```bash
cd /Users/xingzhai/TOPEMS/services/notification-service
cargo run
```

服务将在 http://localhost:8003 启动

### 2. 启动前端开发服务器

```bash
cd /Users/xingzhai/TOPEMS/frontend
npm run dev
```

## 配置说明

### 环境变量 (.env)

```
SERVER_PORT=8003              # 服务端口
CURRENT_USER_ID=user_001      # 当前用户ID（用于演示）
RUST_LOG=notification_service=debug  # 日志级别
```

### 前端配置

前端通知 API 地址通过 Vite 代理配置在 `/frontend/vite.config.ts`:

```typescript
'/notification': createServiceProxyConfig('notification', 'http://localhost:8003'),
```

## 使用示例

### 创建通知

```typescript
import { createNotification } from '@/api/notification';

await createNotification({
  userId: 'user_001',
  notificationType: 'workflow',
  title: '审批结果通知',
  content: '您的采购申请已通过审批',
  priority: 2,
  data: {
    workflowId: 'WF001',
    step: 2
  }
});
```

### 订阅实时通知

```typescript
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';

const { isConnected, reconnect } = useNotificationWebSocket({
  userId: 'user_001',
  onNotification: (notification) => {
    console.log('New notification:', notification);
  },
  onUnreadCountChange: (count) => {
    console.log('Unread count:', count);
  }
});
```

## 通知触发场景

1. **审批结果通知** - 流程审批完成时
2. **审批超时提醒** - 审批任务超时时
3. **任务分配通知** - 新任务分配给用户时
4. **系统维护通知** - 系统维护公告
5. **质量告警通知** - 质量指标异常时
6. **库存预警通知** - 库存低于安全库存时

## 通知类型说明

| 类型 | 描述 | 典型场景 |
|------|------|----------|
| System | 系统通知 | 维护公告、系统更新 |
| Workflow | 审批通知 | 审批结果、待审批任务 |
| Reminder | 提醒通知 | 任务到期、定时提醒 |
| Alert | 告警通知 | 异常告警、安全警告 |
| Message | 消息通知 | 用户消息、评论通知 |

## 通知优先级

| 优先级 | 说明 | 显示颜色 |
|--------|------|----------|
| 1 | 一般 | 灰色 |
| 2 | 重要 | 橙色 |
| 3 | 紧急 | 红色 |

## 文件结构

```
services/notification-service/
├── Cargo.toml
├── .env.example
├── start.sh
└── src/
    └── main.rs              # 主程序

frontend/src/
├── api/
│   └── notification.ts       # 通知 API
├── components/
│   └── notifications/
│       ├── index.ts
│       ├── NotificationBell.tsx
│       ├── NotificationPanel.tsx
│       ├── NotificationItem.tsx
│       └── NotificationSettings.tsx
├── hooks/
│   ├── useNotificationWebSocket.ts
│   └── useNotificationState.ts
└── pages/
    └── NotificationCenter.tsx
```

## WebSocket 消息格式

### 发送消息

```json
{
  "type": "subscribe",
  "payload": { "user_id": "user_001" }
}
```

### 接收消息

```json
{
  "type": "notification",
  "payload": {
    "id": "uuid",
    "userId": "user_001",
    "notificationType": "workflow",
    "title": "审批结果",
    "content": "您的申请已通过",
    "isRead": false,
    "priority": 2,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## 注意事项

1. 确保后端服务在 http://localhost:8003 运行
2. 前端会自动重连 WebSocket 连接
3. 桌面通知需要用户授权
4. 通知声音可以在设置中关闭
5. 免打扰时段可以配置通知静默

## 未来优化

- [ ] 添加数据库持久化支持
- [ ] 实现通知模板系统
- [ ] 添加通知分组功能
- [ ] 支持移动端推送
- [ ] 实现通知统计报表
- [ ] 添加通知审批流程
