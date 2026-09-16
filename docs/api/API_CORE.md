# TOPEMS Core 组模块 API 文档

> 文档版本：v1.0
> 更新日期：2026-09-16
> 模块数量：7 个

---

## 概述

Core 组是 TOPEMS 模块化单体的核心模块组，包含 7 个核心模块：

| 模块 | 说明 | 路由前缀 |
|------|------|----------|
| unified-core | 统一核心服务（IAM, Doc, Flow, File, Monitor 等虚拟服务） | `/api/core` |
| monitor | 监控模块（7 个子模块） | `/api/monitor` |
| plugin-registry | 插件注册表（52 个 handler） | `/api/plugin-registry` |
| search | 搜索模块（3 个 handler） | `/api/search` |
| communication | 通信模块（notification 25 个 + im/mail 16 个，总计 44 个 handler） | `/api/communication` |
| integration | 集成模块（完整路由接入） | `/api/integration` |
| mobile | 移动端模块（3 个 handler） | `/api/mobile` |

---

## 基础规范

### 基础 URL

```
http://localhost:8000/api/{module}/...
```

### 认证方式

所有需要认证的 API 请求必须携带 JWT Token：

```http
Authorization: Bearer {token}
```

### 响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

**列表响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": 1717056000
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "Bad Request",
  "errors": [],
  "timestamp": 1717056000
}
```

---

## 1. unified-core 模块

### 概述

unified-core 是 TOPEMS 的统一核心服务，承载多个虚拟服务：
- IAM（身份认证与权限管理）
- Doc（文档管理）
- Flow（工作流）
- File（文件管理）
- Monitor（监控）

### 路由前缀

```
/api/core
```

### 主要 API

#### 1.1 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/core/auth/login` | 用户登录 |
| POST | `/api/core/auth/logout` | 用户登出 |
| POST | `/api/core/auth/refresh` | 刷新 Token |
| GET | `/api/core/auth/me` | 获取当前用户信息 |

#### 1.2 用户管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/core/users` | 获取用户列表 |
| GET | `/api/core/users/:id` | 获取用户详情 |
| POST | `/api/core/users` | 创建用户 |
| PUT | `/api/core/users/:id` | 更新用户 |
| DELETE | `/api/core/users/:id` | 删除用户 |

#### 1.3 角色管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/core/roles` | 获取角色列表 |
| GET | `/api/core/roles/:id` | 获取角色详情 |
| POST | `/api/core/roles` | 创建角色 |
| PUT | `/api/core/roles/:id` | 更新角色 |
| DELETE | `/api/core/roles/:id` | 删除角色 |

---

## 2. monitor 模块

### 概述

monitor 模块提供系统监控功能，包含 7 个子模块：
- 系统状态监控
- 性能指标监控
- 错误日志监控
- 数据库监控
- 缓存监控
- 服务健康检查
- 告警管理

### 路由前缀

```
/api/monitor
```

### 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/monitor/health` | 健康检查 |
| GET | `/api/monitor/metrics` | 获取性能指标 |
| GET | `/api/monitor/logs` | 获取错误日志 |
| GET | `/api/monitor/alerts` | 获取告警列表 |

---

## 3. plugin-registry 模块

### 概述

plugin-registry 模块提供插件注册表功能，包含 52 个 handler：
- 插件注册
- 插件发现
- 插件生命周期管理
- 插件市场

### 路由前缀

```
/api/plugin-registry
```

### 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/plugin-registry/plugins` | 获取插件列表 |
| GET | `/api/plugin-registry/plugins/:id` | 获取插件详情 |
| POST | `/api/plugin-registry/plugins` | 注册插件 |
| PUT | `/api/plugin-registry/plugins/:id` | 更新插件 |
| DELETE | `/api/plugin-registry/plugins/:id` | 删除插件 |

---

## 4. search 模块

### 概述

search 模块提供全局搜索功能，包含 3 个 handler：
- 全局搜索
- 搜索建议
- 搜索历史

### 路由前缀

```
/api/search
```

### 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search` | 全局搜索 |
| GET | `/api/search/suggest` | 搜索建议 |
| GET | `/api/search/history` | 搜索历史 |

---

## 5. communication 模块

### 概述

communication 模块提供通信功能，包含 44 个 handler：
- notification（25 个）- 通知服务
- im（16 个）- 即时通讯
- mail（核心路由）- 邮件服务

### 路由前缀

```
/api/communication
```

### 主要 API

#### 5.1 通知 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/communication/notifications` | 获取通知列表 |
| POST | `/api/communication/notifications` | 创建通知 |
| PUT | `/api/communication/notifications/:id/read` | 标记通知为已读 |
| DELETE | `/api/communication/notifications/:id` | 删除通知 |

#### 5.2 即时通讯 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/communication/im/messages` | 获取消息列表 |
| POST | `/api/communication/im/messages` | 发送消息 |
| GET | `/api/communication/im/conversations` | 获取会话列表 |

---

## 6. integration 模块

### 概述

integration 模块提供集成功能，通过 `create_routes()` 构建完整 AppState（含 mes_erp_sync_service）。

### 路由前缀

```
/api/integration
```

### 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/integration/sync` | 获取同步状态 |
| POST | `/api/integration/sync` | 触发同步 |
| GET | `/api/integration/logs` | 获取同步日志 |

---

## 7. mobile 模块

### 概述

mobile 模块提供移动端核心功能，包含 3 个 handler（简化版，因 AppState 复杂需 6 个服务客户端）。

### 路由前缀

```
/api/mobile
```

### 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/mobile/home` | 获取移动端首页数据 |
| GET | `/api/mobile/tasks` | 获取移动端任务列表 |
| GET | `/api/mobile/announcements` | 获取移动端公告列表 |

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-09-16 | 初始版本，创建 core 组 7 个模块的 API 文档 |
