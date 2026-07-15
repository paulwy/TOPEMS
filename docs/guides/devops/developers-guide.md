# TOPEMS 开发者指南

## 概述

本指南为开发者提供TOPEMS平台的API使用方法和插件开发规范。

## 目录

1. [API使用指南](#api使用指南)
2. [WebSocket开发指南](#websocket开发指南)
3. [插件开发规范](#插件开发规范)
4. [后端服务开发](#后端服务开发)
5. [前端开发指南](#前端开发指南)

---

## API使用指南

### 认证机制

TOPEMS使用JWT（JSON Web Token）进行身份认证。

#### 获取Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-06-24T10:00:00Z",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@topems.com",
      "full_name": "管理员",
      "is_superuser": true
    }
  },
  "timestamp": 1717056000
}
```

#### 使用Token

```bash
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 统一响应格式

#### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

#### 分页响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "timestamp": 1717056000
}
```

#### 错误响应

```json
{
  "code": 401,
  "message": "未认证",
  "data": null,
  "timestamp": 1717056000
}
```

### 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 1001 | 用户不存在 |
| 1002 | 密码错误 |
| 1003 | 用户已锁定 |
| 2001 | 公司不存在 |
| 2002 | 部门不存在 |
| 3001 | 项目不存在 |

### API调用示例

#### 用户管理

```bash
# 获取用户列表
curl -X GET "http://localhost:8000/api/v1/users?page=1&page_size=20" \
  -H "Authorization: Bearer <token>"

# 获取用户详情
curl -X GET http://localhost:8000/api/v1/users/<user_id> \
  -H "Authorization: Bearer <token>"

# 创建用户
curl -X POST http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@topems.com",
    "full_name": "新用户",
    "password": "password123"
  }'

# 更新用户
curl -X PUT http://localhost:8000/api/v1/users/<user_id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "更新后的姓名",
    "email": "updated@topems.com"
  }'

# 删除用户
curl -X DELETE http://localhost:8000/api/v1/users/<user_id> \
  -H "Authorization: Bearer <token>"
```

#### 角色管理

```bash
# 获取角色列表
curl -X GET http://localhost:8000/api/v1/roles \
  -H "Authorization: Bearer <token>"

# 创建角色
curl -X POST http://localhost:8000/api/v1/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "部门经理",
    "code": "department_manager",
    "description": "部门经理角色",
    "permissions": ["users:read", "departments:write", "employees:manage"]
  }'
```

#### HRM模块

```bash
# 获取员工列表
curl -X GET "http://localhost:8011/api/hrm/employees?page=1&page_size=20" \
  -H "Authorization: Bearer <token>"

# 创建员工
curl -X POST http://localhost:8011/api/hrm/employees \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "<company_uuid>",
    "department_id": "<department_uuid>",
    "position_id": "<position_uuid>",
    "employee_number": "EMP001",
    "name": "张三",
    "gender": "male",
    "birth_date": "1990-01-01",
    "hire_date": "2026-01-01",
    "email": "zhangsan@topems.com",
    "phone": "13800138000"
  }'

# 获取即将到期的合同
curl -X GET "http://localhost:8011/api/hrm/contracts/expiring?days=30" \
  -H "Authorization: Bearer <token>"
```

#### AI服务

```bash
# AI对话
curl -X POST http://localhost:8050/api/ai/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "请帮我分析一下本月的销售数据",
    "session_id": "abc123"
  }'

# 文档摘要
curl -X POST http://localhost:8050/api/ai/summarize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "文档内容...",
    "max_length": 500
  }'

# 向量检索
curl -X POST http://localhost:8050/api/ai/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "催化剂配方",
    "top_k": 5
  }'
```

#### 项目管理

```bash
# 获取项目列表
curl -X GET "http://localhost:8046/api/pm/projects?page=1&page_size=20" \
  -H "Authorization: Bearer <token>"

# 创建项目
curl -X POST http://localhost:8046/api/pm/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新型催化剂研发",
    "code": "PRJ-2026-001",
    "description": "研发高效催化剂",
    "project_type": "研发项目",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "manager_id": "<user_uuid>"
  }'
```

### Python SDK示例

```python
import requests

class TOPEMSClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None

    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"username": username, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["data"]["token"]
            return data
        return None

    def get_users(self, page=1, page_size=20):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(
            f"{self.base_url}/api/v1/users",
            params={"page": page, "page_size": page_size},
            headers=headers
        )
        return response.json()

    def create_user(self, user_data):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            f"{self.base_url}/api/v1/users",
            json=user_data,
            headers=headers
        )
        return response.json()

# 使用示例
client = TOPEMSClient()
client.login("admin", "admin123")

users = client.get_users()
print(f"用户总数: {users['data']['total']}")

new_user = client.create_user({
    "username": "python_user",
    "email": "python@topems.com",
    "full_name": "Python用户",
    "password": "password123"
})
print(f"创建用户成功: {new_user['data']['username']}")
```

### JavaScript/TypeScript示例

```javascript
class TOPEMSClient {
  constructor(baseUrl = "http://localhost:8000") {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (data.code === 200) {
      this.token = data.data.token;
    }
    return data;
  }

  async getUsers(page = 1, pageSize = 20) {
    const response = await fetch(
      `${this.baseUrl}/api/v1/users?page=${page}&page_size=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );
    return response.json();
  }

  async createUser(userData) {
    const response = await fetch(`${this.baseUrl}/api/v1/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  }
}

// 使用示例
const client = new TOPEMSClient();
await client.login("admin", "admin123");

const users = await client.getUsers();
console.log(`用户总数: ${users.data.total}`);

const newUser = await client.createUser({
  username: "js_user",
  email: "js@topems.com",
  full_name: "JS用户",
  password: "password123",
});
console.log(`创建用户成功: ${newUser.data.username}`);
```

---

## WebSocket开发指南

### 路径规范

TOPEMS 使用统一的 WebSocket 路径命名规范：

```
/ws/{module}/{feature}
```

| 组成部分 | 说明 | 示例 |
|---------|------|------|
| `{module}` | 服务模块名称 | `core`, `mes`, `gis` |
| `{feature}` | 功能标识 | `notifications`, `im`, `dashboard` |

### 路径映射表

| 服务 | 前端路径 | Vite代理 | 后端路由 | 服务端口 |
|------|----------|----------|----------|----------|
| Core | `/ws/core/notifications` | `/ws/core` → 8000 | `/ws/core/notifications` | 8000 |
| Core | `/ws/core/im` | `/ws/core` → 8000 | `/ws/core/im` | 8000 |
| MES | `/ws/mes/dashboard` | `/ws/mes` → 8030 | `/ws/mes/dashboard` | 8030 |
| BI | `/ws/bi/dashboard/{id}` | `/ws/bi` → 8060 | `/ws/bi/dashboard/{id}` | 8060 |
| GIS | `/ws/gis` | `/ws/gis` → 8071 | `/ws/gis` | 8071 |

### 前端连接方式

#### 使用 useWebSocket Hook

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

const { isConnected, connect, disconnect, send } = useWebSocket({
  wsPath: '/ws/core/im',
  onMessage: (message) => {
    console.log('收到消息:', message);
  },
  onOpen: () => {
    console.log('连接成功');
  },
  onClose: () => {
    console.log('连接关闭');
  },
});
```

#### 使用专用 Hook

```typescript
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';

const { connect, disconnect, send } = useNotificationWebSocket({
  onMessage: (message) => {
    console.log('收到通知:', message);
  },
});
```

#### 直接创建 WebSocket

```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws/mes/dashboard`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('WebSocket连接成功');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket连接关闭');
};
```

### 后端路由配置

#### Core 服务 (Axum)

```rust
.route("/ws/core/notifications", get(modules::communication::ws::websocket_handler))
.route("/ws/core/im", get(modules::communication::ws::websocket_handler))
```

#### MES 服务

```rust
.route("/ws/mes/dashboard", axum::routing::get(modules::dashboard_ws::dashboard_websocket))
```

#### BI 服务

```rust
.route("/ws/bi/dashboard/{dashboard_id}", get(modules::bi::websocket::dashboard_websocket))
```

#### GIS 服务

```rust
.route("/ws/gis", get(modules::gis_ws::gis_websocket))
```

### Vite 代理配置

```typescript
'/ws/core': {
  target: 'http://localhost:8000',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
},

'/ws/mes': {
  target: 'http://localhost:8030',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
},

'/ws/bi': {
  target: 'http://localhost:8060',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
},

'/ws/gis': {
  target: 'http://localhost:8071',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  timeout: 60000,
},
```

### 消息格式

#### 发送消息

```json
{
  "type": "message",
  "data": {
    "topic": "chat",
    "content": "Hello World"
  }
}
```

#### 接收消息

```json
{
  "type": "notification",
  "data": {
    "id": "abc123",
    "title": "新消息",
    "content": "您有一条新消息",
    "created_at": "2026-07-06T10:00:00Z"
  }
}
```

### 新增 WebSocket 服务流程

1. 在后端服务的 `main.rs` 中添加路由
2. 在 `apps/web/vite.config.ts` 中配置代理规则
3. 创建或更新前端 Hook（推荐）
4. 更新 [WebSocket 路径映射规范](../guides/devops/websocket-path-mapping.md)

详细说明请参考完整的 [WebSocket 路径映射规范](../guides/devops/websocket-path-mapping.md)。

---

## 插件开发规范

### 插件架构

TOPEMS采用插件化架构，支持动态扩展功能模块。

```
topems/
├── svc/
│   └── unified-core/        # 统一核心服务
│       └── src/
│           └── plugins/     # 插件目录
│               ├── mod.rs
│               └── plugin_trait.rs
└── plugins/                 # 独立插件目录
    ├── erp/                 # ERP插件
    └── custom-plugin/       # 自定义插件
```

### 插件类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **业务插件** | 完整的业务模块 | ERP、CRM、MES |
| **功能插件** | 单一功能扩展 | 报表导出、消息推送 |
| **集成插件** | 第三方系统集成 | 钉钉、企业微信 |
| **AI插件** | AI能力扩展 | RAG检索、智能分析 |

### 插件开发步骤

#### 1. 创建插件目录结构

```bash
mkdir -p plugins/my-plugin/src
touch plugins/my-plugin/Cargo.toml
touch plugins/my-plugin/src/lib.rs
touch plugins/my-plugin/src/handler.rs
touch plugins/my-plugin/src/router.rs
```

#### 2. 配置Cargo.toml

```toml
[package]
name = "my-plugin"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
topems-core = { path = "../../lib/core" }
```

#### 3. 实现插件特质

```rust
// src/lib.rs
use actix_web::{web, App, HttpResponse, HttpServer};
use serde::{Deserialize, Serialize};
use topems_core::plugin::{Plugin, PluginInfo};

pub struct MyPlugin;

impl Plugin for MyPlugin {
    fn info(&self) -> PluginInfo {
        PluginInfo {
            name: "my-plugin".to_string(),
            version: "0.1.0".to_string(),
            description: "自定义插件示例".to_string(),
            author: "TOPEMS Team".to_string(),
            routes: vec!["/api/my-plugin/*".to_string()],
        }
    }

    fn mount(&self, app: &mut App) -> &mut App {
        app.service(
            web::scope("/api/my-plugin")
                .service(web::resource("/hello").route(web::get().to(hello_handler)))
                .service(web::resource("/data").route(web::get().to(data_handler)))
        )
    }
}

async fn hello_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": "Hello from my-plugin!"
    }))
}

async fn data_handler() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": {
            "items": [],
            "total": 0
        }
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().configure(|app| MyPlugin.mount(app))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

#### 4. 注册插件

在统一核心服务中注册插件：

```rust
// svc/unified-core/src/main.rs
use my_plugin::MyPlugin;
use topems_core::plugin::PluginRegistry;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let mut registry = PluginRegistry::new();
    registry.register(Box::new(MyPlugin));

    HttpServer::new(move || {
        let mut app = App::new();
        app = registry.mount_all(app);
        app
    })
    .bind(("127.0.0.1", 8000))?
    .run()
    .await
}
```

### 插件API规范

#### 路由规范

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/v1/auth` | 登录、登出、Token刷新 |
| 用户 | `/api/v1/users` | 用户管理 |
| 角色 | `/api/v1/roles` | 角色管理 |
| HRM | `/api/hrm/*` | 人力资源管理 |
| 插件 | `/api/{plugin-name}/*` | 自定义插件路由 |

#### 请求规范

```json
{
  "param1": "value",
  "param2": 123,
  "param3": ["item1", "item2"]
}
```

#### 响应规范

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

### 数据库访问

插件可以访问共享Schema：

```rust
use topems_core::database::DbPool;
use sqlx::PgPool;

async fn get_employees(pool: web::Data<PgPool>) -> HttpResponse {
    let employees = sqlx::query!(
        "SELECT id, name, email FROM shared.employees WHERE status = $1",
        "active"
    )
    .fetch_all(pool.get_ref())
    .await
    .unwrap();

    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": employees
    }))
}
```

### 权限控制

插件应遵循统一的权限控制机制：

```rust
use topems_core::auth::require_permission;

async fn protected_handler(
    req: web::HttpRequest,
    pool: web::Data<PgPool>
) -> HttpResponse {
    // 检查权限
    if !require_permission(&req, "my_plugin:read").await {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "code": 403,
            "message": "无权限"
        }));
    }

    // 业务逻辑
    HttpResponse::Ok().json(serde_json::json!({
        "code": 200,
        "message": "success",
        "data": {}
    }))
}
```

---

## 后端服务开发

### 项目结构

```
svc/my-service/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── api/
│   │   ├── mod.rs
│   │   ├── routes.rs
│   │   └── handlers.rs
│   ├── model/
│   │   ├── mod.rs
│   │   └── entity.rs
│   ├── service/
│   │   ├── mod.rs
│   │   └── business_logic.rs
│   ├── repository/
│   │   ├── mod.rs
│   │   └── db_ops.rs
│   ├── config/
│   │   ├── mod.rs
│   │   └── settings.rs
│   └── middleware/
│       ├── mod.rs
│       └── auth.rs
```

### 服务开发流程

#### 1. 定义数据模型

```rust
// src/model/entity.rs
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MyEntity {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMyEntityRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMyEntityRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}
```

#### 2. 实现数据访问层

```rust
// src/repository/db_ops.rs
use crate::model::entity::MyEntity;
use sqlx::PgPool;
use uuid::Uuid;

pub struct MyRepository {
    pool: PgPool,
}

impl MyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self) -> Result<Vec<MyEntity>, sqlx::Error> {
        sqlx::query_as!(MyEntity, "SELECT * FROM my_schema.my_entity")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<MyEntity>, sqlx::Error> {
        sqlx::query_as!(MyEntity, "SELECT * FROM my_schema.my_entity WHERE id = $1", id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn create(&self, entity: &MyEntity) -> Result<MyEntity, sqlx::Error> {
        sqlx::query_as!(
            MyEntity,
            "INSERT INTO my_schema.my_entity (id, name, description, status) VALUES ($1, $2, $3, $4) RETURNING *",
            entity.id,
            entity.name,
            entity.description,
            entity.status
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, id: Uuid, entity: &MyEntity) -> Result<Option<MyEntity>, sqlx::Error> {
        sqlx::query_as!(
            MyEntity,
            "UPDATE my_schema.my_entity SET name = $1, description = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
            entity.name,
            entity.description,
            entity.status,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM my_schema.my_entity WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
```

#### 3. 实现业务逻辑层

```rust
// src/service/business_logic.rs
use crate::model::entity::{CreateMyEntityRequest, MyEntity, UpdateMyEntityRequest};
use crate::repository::db_ops::MyRepository;
use uuid::Uuid;

pub struct MyService {
    repository: MyRepository,
}

impl MyService {
    pub fn new(repository: MyRepository) -> Self {
        Self { repository }
    }

    pub async fn get_all(&self) -> Result<Vec<MyEntity>, String> {
        self.repository.find_all().await.map_err(|e| e.to_string())
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<MyEntity>, String> {
        self.repository.find_by_id(id).await.map_err(|e| e.to_string())
    }

    pub async fn create(&self, request: CreateMyEntityRequest) -> Result<MyEntity, String> {
        let entity = MyEntity {
            id: Uuid::new_v4(),
            name: request.name,
            description: request.description,
            status: "active".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        self.repository.create(&entity).await.map_err(|e| e.to_string())
    }

    pub async fn update(&self, id: Uuid, request: UpdateMyEntityRequest) -> Result<Option<MyEntity>, String> {
        let existing = match self.repository.find_by_id(id).await.map_err(|e| e.to_string())? {
            Some(e) => e,
            None => return Err("实体不存在".to_string()),
        };

        let entity = MyEntity {
            name: request.name.unwrap_or(existing.name),
            description: request.description.or(existing.description),
            status: request.status.unwrap_or(existing.status),
            ..existing
        };

        self.repository.update(id, &entity).await.map_err(|e| e.to_string())
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, String> {
        self.repository.delete(id).await.map_err(|e| e.to_string())
    }
}
```

#### 4. 实现API路由

```rust
// src/api/handlers.rs
use crate::model::entity::{CreateMyEntityRequest, UpdateMyEntityRequest};
use crate::service::business_logic::MyService;
use actix_web::{web, HttpResponse};
use serde_json::json;
use uuid::Uuid;

pub async fn get_all(service: web::Data<MyService>) -> HttpResponse {
    match service.get_all().await {
        Ok(items) => HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "success",
            "data": items
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "code": 500,
            "message": e
        }))
    }
}

pub async fn get_by_id(path: web::Path<Uuid>, service: web::Data<MyService>) -> HttpResponse {
    let id = path.into_inner();
    match service.get_by_id(id).await {
        Ok(Some(item)) => HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "success",
            "data": item
        })),
        Ok(None) => HttpResponse::NotFound().json(json!({
            "code": 404,
            "message": "实体不存在"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "code": 500,
            "message": e
        }))
    }
}

pub async fn create(
    request: web::Json<CreateMyEntityRequest>,
    service: web::Data<MyService>
) -> HttpResponse {
    match service.create(request.into_inner()).await {
        Ok(item) => HttpResponse::Created().json(json!({
            "code": 201,
            "message": "创建成功",
            "data": item
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "code": 500,
            "message": e
        }))
    }
}

pub async fn update(
    path: web::Path<Uuid>,
    request: web::Json<UpdateMyEntityRequest>,
    service: web::Data<MyService>
) -> HttpResponse {
    let id = path.into_inner();
    match service.update(id, request.into_inner()).await {
        Ok(Some(item)) => HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "更新成功",
            "data": item
        })),
        Ok(None) => HttpResponse::NotFound().json(json!({
            "code": 404,
            "message": "实体不存在"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "code": 500,
            "message": e
        }))
    }
}

pub async fn delete(path: web::Path<Uuid>, service: web::Data<MyService>) -> HttpResponse {
    let id = path.into_inner();
    match service.delete(id).await {
        Ok(true) => HttpResponse::Ok().json(json!({
            "code": 200,
            "message": "删除成功"
        })),
        Ok(false) => HttpResponse::NotFound().json(json!({
            "code": 404,
            "message": "实体不存在"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "code": 500,
            "message": e
        }))
    }
}
```

#### 5. 注册路由

```rust
// src/api/routes.rs
use crate::api::handlers::{create, delete, get_all, get_by_id, update};
use actix_web::web;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/my-service")
            .route("/items", web::get().to(get_all))
            .route("/items", web::post().to(create))
            .route("/items/{id}", web::get().to(get_by_id))
            .route("/items/{id}", web::put().to(update))
            .route("/items/{id}", web::delete().to(delete))
    );
}
```

#### 6. 启动服务

```rust
// src/main.rs
use actix_web::{App, HttpServer};
use sqlx::PgPool;

mod api;
mod config;
mod model;
mod repository;
mod service;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 加载配置
    let config = config::Settings::new().unwrap();

    // 连接数据库
    let pool = PgPool::connect(&config.database.url)
        .await
        .expect("无法连接数据库");

    // 启动服务
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(service::MyService::new(
                repository::MyRepository::new(pool.clone())
            )))
            .configure(api::routes::configure_routes)
    })
    .bind((config.server.host, config.server.port))?
    .run()
    .await
}
```

---

## 前端开发指南

### 项目结构

```
apps/web/
├── src/
│   ├── components/          # 通用组件
│   ├── pages/              # 页面组件
│   ├── api/                # API客户端
│   ├── store/              # 状态管理
│   ├── hooks/              # 自定义Hooks
│   ├── utils/              # 工具函数
│   ├── styles/             # 全局样式
│   ├── routes/             # 路由配置
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### API客户端开发

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

interface PaginatedResponse<T = any> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.instance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse, PaginatedResponse };
```

### 自定义Hook示例

```typescript
// src/hooks/useAuth.ts
import { useState, useCallback, useEffect } from 'react';
import { apiClient, type ApiResponse } from '../api/client';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  roles: string[];
}

interface LoginResponse {
  token: string;
  expires_at: string;
  user: User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token并获取用户信息
      apiClient.get<User>('/v1/users/me').then((response) => {
        if (response.code === 200) {
          setUser(response.data);
        } else {
          localStorage.removeItem('token');
        }
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await apiClient.post<LoginResponse>('/v1/auth/login', {
        username,
        password,
      });
      if (response.code === 200) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
```

### 组件开发规范

```typescript
// src/components/DataTable.tsx
import React from 'react';
import type { PaginatedResponse } from '../api/client';

interface ColumnDef<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: PaginatedResponse<T>;
  columns: ColumnDef<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)}>{col.label}</th>
            ))}
            {onEdit || onDelete ? <th>操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.items.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {onEdit || onDelete ? (
                <td>
                  {onEdit && (
                    <button onClick={() => onEdit(row)}>编辑</button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)}>删除</button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <span>
          第 {data.page} / {data.total_pages} 页，共 {data.total} 条
        </span>
        <button
          disabled={data.page === 1}
          onClick={() => onPageChange?.(data.page - 1)}
        >
          上一页
        </button>
        <button
          disabled={data.page === data.total_pages}
          onClick={() => onPageChange?.(data.page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
```

### 页面开发示例

```typescript
// src/pages/UserList.tsx
import React, { useState, useEffect } from 'react';
import { apiClient, type PaginatedResponse } from '../api/client';
import { DataTable } from '../components/DataTable';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export function UserList() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<User>>({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get<PaginatedResponse<User>>(
        `/v1/users?page=${page}&page_size=20`
      );
      if (response.code === 200) {
        setData(response.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`确定要删除用户 ${user.username} 吗？`)) {
      try {
        const response = await apiClient.delete(`/v1/users/${user.id}`);
        if (response.code === 200) {
          fetchUsers(data.page);
        }
      } catch (error) {
        console.error('删除用户失败:', error);
      }
    }
  };

  const columns = [
    { key: 'username', label: '用户名' },
    { key: 'email', label: '邮箱' },
    { key: 'full_name', label: '姓名' },
    {
      key: 'is_active',
      label: '状态',
      render: (value) => (value ? '活跃' : '禁用'),
    },
    {
      key: 'created_at',
      label: '创建时间',
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  return (
    <div className="page">
      <h1>用户管理</h1>
      {user?.is_superuser && (
        <button onClick={() => window.location.href = '/users/create'}>
          新建用户
        </button>
      )}
      {loading ? (
        <div>加载中...</div>
      ) : (
        <DataTable<User>
          data={data}
          columns={columns}
          onEdit={(row) => window.location.href = `/users/edit/${row.id}`}
          onDelete={handleDelete}
          onPageChange={fetchUsers}
        />
      )}
    </div>
  );
}
```

---

## 开发工具

### 代码生成

```bash
# 生成API客户端
npx openapi-typescript http://localhost:8000/api/v1/openapi.yaml --output src/api/types.ts

# 生成数据库模型
sqlx migrate generate init
```

### 测试工具

```bash
# 运行后端测试
cargo test --workspace

# 运行前端测试
cd apps/web && pnpm test

# API测试
curl http://localhost:8000/api/v1/health
```

### 代码格式化

```bash
# Rust代码格式化
cargo fmt

# TypeScript代码格式化
cd apps/web && pnpm format

# 代码检查
cargo clippy
cd apps/web && pnpm lint
```

---

## 版本控制规范

### Git分支策略

| 分支 | 用途 |
|------|------|
| main | 主分支，稳定版本 |
| develop | 开发分支，集成开发 |
| feature/* | 功能开发分支 |
| bugfix/* | Bug修复分支 |
| release/* | 发布准备分支 |

### Commit规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type类型**:
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- perf: 性能优化
- test: 测试相关
- chore: 构建过程或辅助工具变动

**示例**:
```
feat(iam): add social login support

Add OAuth 2.0 flow for Google and WeChat
- Implement authentication middleware
- Add user profile sync
- Update UI components

Closes #123
```

---

## 常见问题

### Q: 如何调试后端服务？

A: 使用Rust的调试工具：

```bash
# 使用cargo-watch自动重启
cargo install cargo-watch
cargo watch -x run

# 使用lldb调试
lldb -- target/debug/topems-iam
```

### Q: 前端如何代理API请求？

A: 在vite.config.ts中配置代理：

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### Q: 如何添加新的数据库表？

A: 使用sqlx迁移：

```bash
# 创建迁移文件
sqlx migrate add create_new_table

# 编辑迁移文件
# 运行迁移
sqlx migrate run

# 生成类型
sqlx prepare
```

### Q: 如何构建生产版本？

A:

```bash
# 后端
cargo build --release --workspace

# 前端
cd apps/web && pnpm build

# Docker构建
docker build -t topems .
```

---

**文档版本**: v1.0  
**最后更新**: 2026-06-24  
**适用版本**: TOPEMS v2.5.0