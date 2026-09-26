# TOPEMS 开发指南

## 概述

本文档是 TOPEMS 项目的开发指南，包含项目结构、开发环境搭建、代码规范、调试技巧、常见问题等内容，帮助开发人员快速上手项目开发和维护。

## 1. 项目概览

### 1.1 项目简介

TOPEMS（TOP Enterprise Management System）是一个企业级智能管理系统，集成了 ERP、Finance、CRM、WMS、HR、OA、QMS、SCM、APS、EHS、BI 等多个业务模块，并通过 AI 智能助手提升业务效率。

### 1.2 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 后端语言 | Rust | 1.75+ | 高性能系统编程语言 |
| 后端框架 | Axum | 0.7+ | 异步 Web 框架 |
| 前端框架 | React | 18+ | 组件化 UI 库 |
| 前端语言 | TypeScript | 5.0+ | 类型安全的 JavaScript |
| 构建工具 | Vite | 5.0+ | 快速构建工具 |
| 包管理 | pnpm | 8.0+ | 高效的包管理器 |
| 数据库 | MySQL / PostgreSQL | 8.0+ / 14+ | 关系型数据库 |
| 缓存 | Redis | 7.0+ | 高性能缓存 |
| 容器化 | Docker | 24.0+ | 容器化部署 |
| CI/CD | GitHub Actions | - | 自动化构建部署 |
| 测试 | Playwright + k6 | - | E2E 测试和性能测试 |

### 1.3 项目架构（v5.15.0+ 模块化单体）

> **架构变化**：从 32 个独立微服务迁移到模块化单体架构，统一入口为 `svc/server/`。

```
TOPEMS/
├── apps/
│   └── web/              # 前端应用（React + TypeScript + Vite）
│       ├── src/
│       │   ├── components/    # 公共组件
│       │   │   ├── common/     # 通用组件（DataTable, Dialog, FormBuilder 等）
│       │   │   ├── templates/  # 页面模板（ListPageTemplate, DetailPageTemplate 等）
│       │   │   └── layout/     # 布局组件（AppShell, SideRail, TopBar 等）
│       │   ├── pages/         # 页面（按模块组织）
│       │   │   ├── erp/       # ERP 模块页面
│       │   │   ├── crm/       # CRM 模块页面
│       │   │   ├── hrm/       # HRM 模块页面
│       │   │   ├── mes/       # MES 模块页面
│       │   │   ├── wms/       # WMS 模块页面
│       │   │   ├── qms/       # QMS 模块页面
│       │   │   └── ...        # 其他模块页面
│       │   ├── api/           # API 客户端
│       │   ├── hooks/         # React Hooks
│       │   ├── stores/        # 状态管理（Zustand）
│       │   ├── utils/         # 工具函数
│       │   └── types/         # TypeScript 类型
│       ├── public/
│       └── package.json
├── svc/                  # 后端服务（Rust）
│   ├── server/           # **统一入口（模块化单体）**
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── config/
│   │   │   ├── modules/       # **模块适配器（27 个模块）**
│   │   │   │   ├── mod.rs
│   │   │   │   ├── unified_core_real_module.rs
│   │   │   │   ├── monitor_real_module.rs
│   │   │   │   ├── plugin_registry_real_module.rs
│   │   │   │   ├── search_real_module.rs
│   │   │   │   ├── communication_real_module.rs
│   │   │   │   ├── integration_real_module.rs
│   │   │   │   ├── mobile_real_module.rs
│   │   │   │   └── ...        # 其他模块适配器
│   │   │   └── ...
│   │   └── Cargo.toml         # **Feature Flags（可选模块启用）**
│   ├── unified-core/    # 核心服务（IAM, Doc, Flow, File, Monitor 等虚拟服务）
│   ├── erp/              # ERP 服务
│   ├── crm/              # CRM 服务
│   ├── hrm/              # HRM 服务
│   ├── mes/              # MES 服务
│   ├── wms/              # WMS 服务
│   ├── qms/              # QMS 服务
│   └── ...               # 其他服务
├── packages/              # 共享包
│   ├── shared/            # 共享类型和工具
│   └── ui/                # 共享 UI 组件
├── config/                # 配置文件
│   ├── ports.env          # 端口单一信源
│   └── env/               # 环境配置模板
├── deploy/                # 部署配置
│   ├── docker/            # Docker Compose
│   └── ...
├── scripts/               # 脚本
├── docs/                  # 文档
└── migrations/            # 数据库迁移
├── .github/               # GitHub 配置
│   └── workflows/         # CI/CD 工作流
├── Cargo.toml             # Rust 工作空间配置
├── package.json           # Node.js 工作空间配置
├── pnpm-workspace.yaml    # pnpm 工作空间配置
├── docker-compose.yml     # Docker Compose 配置
└── README.md              # 项目说明
```

## 2. 开发环境搭建

### 2.1 前置要求

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node.js | 18.0+ | `brew install node` 或从官网下载 |
| pnpm | 8.0+ | `npm install -g pnpm` |
| Docker | 24.0+ | `brew install --cask docker` |
| Docker Compose | 2.0+ | 随 Docker 一起安装 |
| MySQL | 8.0+ | `brew install mysql` 或使用 Docker |
| Redis | 7.0+ | `brew install redis` 或使用 Docker |
| Git | 2.30+ | `brew install git` |

### 2.2 克隆项目

```bash
# 克隆仓库
git clone https://github.com/your-org/topems.git
cd topems

# 安装 Git hooks（如果有）
git config core.hooksPath .githooks
```

### 2.3 后端环境搭建

```bash
# 安装 Rust 工具链
rustup install stable
rustup default stable

# 添加常用组件
rustup component add rustfmt clippy rust-analyzer

# 安装系统依赖（macOS）
brew install pkg-config openssl

# 安装系统依赖（Ubuntu/Debian）
sudo apt-get install -y pkg-config libssl-dev build-essential

# 构建后端
cd apps/backend
cargo build

# 运行后端开发服务器
cargo run
```

### 2.4 前端环境搭建

```bash
# 安装依赖
pnpm install

# 运行前端开发服务器
cd apps/web
pnpm dev

# 构建前端
pnpm build

# 预览构建结果
pnpm preview
```

### 2.5 使用 Docker 启动依赖服务

```bash
# 启动 MySQL 和 Redis
docker-compose up -d mysql redis

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f mysql

# 停止服务
docker-compose down
```

### 2.6 数据库初始化

```bash
# 创建数据库
psql "$DATABASE_URL" -c "CREATE DATABASE topems;"  # 或由 scripts/topems.sh db start 自动初始化

# 运行数据库迁移（主迁移链 database/migrations，278 个，含应用自建表固化迁移）
./scripts/topems.sh db migrate

# 或者使用 sqlx 直接执行
sqlx migrate run --source database/migrations
```

### 2.7 环境变量配置

```bash
# 复制环境变量模板
cp config/development.env .env

# 编辑环境变量
vim .env
```

**关键环境变量说明：**

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接地址 | `mysql://root:password@localhost/topems` |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `SERVER_HOST` | 服务监听地址 | `0.0.0.0` |
| `SERVER_PORT` | 服务监听端口 | `8013` |
| `JWT_SECRET` | JWT 签名密钥 | （需要设置） |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `3600` |
| `AI_PROVIDER` | AI 服务提供商 | `openai` |
| `AI_API_KEY` | AI 服务 API Key | （需要设置） |
| `AI_MODEL` | AI 模型名称 | `gpt-4` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `LOG_FILE` | 日志文件路径 | `logs/topems.log` |

## 3. 开发规范

### 3.1 代码风格

#### Rust 代码规范

- 使用 `rustfmt` 格式化代码
- 使用 `clippy` 进行代码检查
- 遵循 Rust API Guidelines
- 模块名使用小写蛇形命名（snake_case）
- 结构体和枚举使用大驼峰命名（PascalCase）
- 函数和变量使用小写蛇形命名（snake_case）
- 常量使用大写蛇形命名（SCREAMING_SNAKE_CASE）

```bash
# 格式化代码
cargo fmt

# 代码检查
cargo clippy --all-targets --all-features -- -D warnings
```

#### TypeScript/React 代码规范

- 使用 ESLint 进行代码检查
- 使用 Prettier 格式化代码
- 组件名使用大驼峰命名（PascalCase）
- 函数和变量使用小驼峰命名（camelCase）
- 常量使用大写蛇形命名（SCREAMING_SNAKE_CASE）
- 类型定义使用大驼峰命名（PascalCase）

```bash
# 代码检查
pnpm lint

# 格式化代码
pnpm format

# 类型检查
pnpm type-check
```

### 3.2 Git 提交规范

遵循 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建相关 |
| `ci` | CI/CD 相关 |
| `chore` | 其他杂项 |
| `revert` | 回滚提交 |

**示例：**

```
feat(ai): add multi-turn conversation support

- Add session management for multi-turn conversations
- Implement context window management
- Add session persistence to database

Closes #123
```

### 3.3 分支管理

| 分支名 | 说明 |
|--------|------|
| `main` | 主分支，生产环境代码 |
| `develop` | 开发分支，集成测试 |
| `feature/xxx` | 功能分支 |
| `bugfix/xxx` | Bug 修复分支 |
| `hotfix/xxx` | 紧急修复分支 |
| `release/xxx` | 发布分支 |

**分支流程：**

1. 从 `develop` 分支创建功能分支
2. 开发完成后提交 PR 到 `develop`
3. 代码审查通过后合并到 `develop`
4. 发布时从 `develop` 创建 `release` 分支
5. 测试通过后合并到 `main` 并打标签

## 4. 后端开发指南

### 4.1 项目结构

```
apps/backend/src/
├── main.rs                 # 入口文件
├── config/                 # 配置模块
│   ├── mod.rs
│   ├── database.rs
│   ├── server.rs
│   └── ai.rs
├── handlers/               # 请求处理
│   ├── mod.rs
│   ├── auth.rs
│   ├── users.rs
│   ├── ai_chat.rs
│   └── copilot.rs
├── models/                 # 数据模型
│   ├── mod.rs
│   ├── user.rs
│   ├── session.rs
│   └── message.rs
├── services/               # 业务逻辑
│   ├── mod.rs
│   ├── auth_service.rs
│   ├── user_service.rs
│   ├── ai_service.rs
│   └── copilot_service.rs
├── repositories/           # 数据访问
│   ├── mod.rs
│   ├── user_repository.rs
│   └── session_repository.rs
├── middleware/             # 中间件
│   ├── mod.rs
│   ├── auth.rs
│   ├── logging.rs
│   └── error_handling.rs
├── routes/                 # 路由定义
│   ├── mod.rs
│   ├── auth_routes.rs
│   ├── user_routes.rs
│   └── ai_routes.rs
└── utils/                  # 工具函数
    ├── mod.rs
    ├── jwt.rs
    ├── password.rs
    └── errors.rs
```

### 4.2 创建新 API 端点

**步骤：**

1. 在 `models/` 中定义请求和响应结构体
2. 在 `repositories/` 中实现数据访问逻辑
3. 在 `services/` 中实现业务逻辑
4. 在 `handlers/` 中实现请求处理
5. 在 `routes/` 中注册路由
6. 在 `tests/` 中编写测试

**示例：创建用户查询 API**

```rust
// models/user.rs
#[derive(Serialize, Deserialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
pub struct UserListResponse {
    pub items: Vec<UserResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

// handlers/users.rs
pub async fn list_users(
    Query(params): Query<ListUsersParams>,
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<UserListResponse>>, AppError> {
    let result = state.user_service.list_users(params).await?;
    Ok(Json(ApiResponse::success(result)))
}

// routes/user_routes.rs
pub fn user_routes() -> Router {
    Router::new()
        .route("/users", get(list_users))
        .route("/users", post(create_user))
        .route("/users/{id}", get(get_user))
        .route("/users/{id}", put(update_user))
        .route("/users/{id}", delete(delete_user))
}
```

### 4.3 数据库操作

使用 SQLx 进行数据库操作：

```rust
// 查询用户列表
pub async fn find_all(
    pool: &MySqlPool,
    page: i64,
    page_size: i64,
) -> Result<(Vec<User>, i64), sqlx::Error> {
    let offset = (page - 1) * page_size;
    
    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;
    
    Ok((users, total))
}

// 创建用户
pub async fn create(pool: &MySqlPool, user: &User) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&user.id)
    .bind(&user.username)
    .bind(&user.email)
    .bind(&user.password_hash)
    .bind(user.created_at)
    .execute(pool)
    .await?;
    
    Ok(())
}
```

### 4.4 错误处理

```rust
// utils/errors.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Authentication error: {0}")]
    Authentication(String),
    
    #[error("Authorization error: {0}")]
    Authorization(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Internal server error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Authentication(msg) => (StatusCode::UNAUTHORIZED, msg.clone()),
            AppError::Authorization(msg) => (StatusCode::FORBIDDEN, msg.clone()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
        };
        
        let body = Json(ApiResponse {
            code: status.as_u16(),
            success: false,
            message,
            data: (),
            timestamp: Utc::now().timestamp_millis(),
        });
        
        (status, body).into_response()
    }
}
```

### 4.5 编写测试

```rust
// tests/user_tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_create_user() {
        let pool = setup_test_database().await;
        
        let user = User {
            id: "test-user-001".to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password_hash: hash_password("password123").unwrap(),
            created_at: Utc::now(),
        };
        
        let result = UserRepository::create(&pool, &user).await;
        assert!(result.is_ok());
        
        let found = UserRepository::find_by_id(&pool, "test-user-001").await.unwrap();
        assert_eq!(found.username, "testuser");
    }
    
    #[tokio::test]
    async fn test_list_users() {
        let pool = setup_test_database().await;
        
        let (users, total) = UserRepository::find_all(&pool, 1, 20).await.unwrap();
        assert!(total >= 0);
    }
}
```

## 5. 前端开发指南

### 5.1 项目结构

```
apps/web/src/
├── main.tsx                # 入口文件
├── App.tsx                 # 根组件
├── components/             # 通用组件
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   └── ai/
│       ├── ChatWindow.tsx
│       ├── MessageList.tsx
│       └── MessageInput.tsx
├── pages/                  # 页面组件
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Users.tsx
│   └── AIChat.tsx
├── hooks/                  # 自定义 Hooks
│   ├── useAuth.ts
│   ├── useChat.ts
│   └── useApi.ts
├── services/               # API 服务
│   ├── api.ts
│   ├── authService.ts
│   ├── userService.ts
│   └── aiService.ts
├── stores/                 # 状态管理
│   ├── authStore.ts
│   ├── chatStore.ts
│   └── uiStore.ts
├── utils/                  # 工具函数
│   ├── request.ts
│   ├── format.ts
│   └── storage.ts
├── types/                  # 类型定义
│   ├── api.ts
│   ├── user.ts
│   └── chat.ts
├── styles/                 # 样式
│   ├── global.css
│   └── variables.css
└── assets/                 # 静态资源
    ├── images/
    └── icons/
```

### 5.2 创建新页面

**步骤：**

1. 在 `types/` 中定义类型
2. 在 `services/` 中定义 API 服务
3. 在 `hooks/` 中定义自定义 Hook（可选）
4. 在 `pages/` 中创建页面组件
5. 在路由配置中注册路由

**示例：用户管理页面**

```tsx
// types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface UserListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  status?: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
}

// services/userService.ts
import { api } from './api';
import type { User, UserListParams, UserListResponse } from '../types/user';

export const userService = {
  list: (params: UserListParams) => 
    api.get<UserListResponse>('/users', { params }),
  
  get: (id: string) => 
    api.get<User>(`/users/${id}`),
  
  create: (data: Partial<User>) => 
    api.post<User>('/users', data),
  
  update: (id: string, data: Partial<User>) => 
    api.put<User>(`/users/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/users/${id}`),
};

// pages/Users.tsx
import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, message } from 'antd';
import { userService } from '../services/userService';
import type { User, UserListParams } from '../types/user';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async (params: UserListParams = {}) => {
    setLoading(true);
    try {
      const response = await userService.list({
        page: pagination.current,
        page_size: pagination.pageSize,
        keyword: searchText,
        ...params,
      });
      setUsers(response.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
      }));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize]);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchUsers({ page: 1 });
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await userService.delete(id);
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await userService.update(editingUser.id, values);
        message.success('更新成功');
      } else {
        await userService.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '姓名', dataIndex: 'full_name', key: 'full_name' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => status === 'active' ? '启用' : '禁用',
    },
    { 
      title: '操作', 
      key: 'actions',
      render: (_: any, record: User) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </>
      ),
    },
  ];

  return (
    <div className="users-page">
      <div className="page-header">
        <h2>用户管理</h2>
        <div className="actions">
          <Input
            placeholder="搜索用户名/邮箱"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200, marginRight: 10 }}
          />
          <Button type="primary" onClick={handleAdd}>添加用户</Button>
        </div>
      </div>
      
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={pag => setPagination(pag)}
      />
      
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="full_name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

### 5.3 API 请求封装

```ts
// utils/request.ts
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    if (data.code === 200 || data.success) {
      return data;
    }
    message.error(data.message || '请求失败');
    return Promise.reject(new Error(data.message));
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    message.error(error.message || '网络错误');
    return Promise.reject(error);
  }
);

export default request;

// services/api.ts
import request from '../utils/request';

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => 
    request.get<any, T>(url, config),
  
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request.post<any, T>(url, data, config),
  
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => 
    request.put<any, T>(url, data, config),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) => 
    request.delete<any, T>(url, config),
};
```

### 5.4 状态管理（Zustand）

```ts
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import type { User } from '../types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      login: async (username: string, password: string) => {
        const response = await authService.login(username, password);
        set({
          user: response.data.user,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      
      refreshToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;
        
        const response = await authService.refreshToken(refreshToken);
        set({
          accessToken: response.data.access_token,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

## 6. 调试技巧

### 6.1 后端调试

```bash
# 启用调试日志
RUST_LOG=debug cargo run

# 使用 rust-gdb 调试
rust-gdb target/debug/topems-backend

# 使用 lldb 调试（macOS）
lldb target/debug/topems-backend

# 性能分析
cargo flamegraph

# 检查内存泄漏
valgrind target/debug/topems-backend
```

### 6.2 前端调试

- 使用 React DevTools 调试组件
- 使用 Redux DevTools 调试状态（如果使用 Redux）
- 使用浏览器开发者工具调试网络请求
- 使用 `console.log` 和 `debugger` 语句
- 使用 Vite 的 HMR（热模块替换）快速预览

### 6.3 数据库调试

```bash
# 连接数据库
mysql -u root -p topems

# 查看慢查询
SHOW VARIABLES LIKE 'slow_query%';
SHOW STATUS LIKE 'Slow_queries';

# 查看当前连接
SHOW PROCESSLIST;

# 分析查询执行计划
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

# 查看表状态
SHOW TABLE STATUS LIKE 'users';
```

### 6.4 API 调试

使用 Postman、curl 或浏览器插件调试 API：

```bash
# 登录获取 Token
curl -X POST http://localhost:8013/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 使用 Token 访问受保护接口
curl -X GET http://localhost:8013/api/v1/users \
  -H "Authorization: Bearer <token>"

# 发送 AI 对话
curl -X POST http://localhost:8013/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"你好","module":"general"}'
```

## 7. 常见问题

### 7.1 后端常见问题

**Q: cargo build 失败，提示缺少 openssl**
A: 安装系统依赖：
```bash
# macOS
brew install openssl pkg-config

# Ubuntu
sudo apt-get install libssl-dev pkg-config
```

**Q: 数据库连接失败**
A: 检查以下几点：
1. 数据库服务是否启动：`systemctl status mysql`
2. 连接地址和端口是否正确
3. 用户名和密码是否正确
4. 数据库是否已创建：`CREATE DATABASE topems;`
5. 防火墙是否允许连接

**Q: Redis 连接失败**
A: 检查以下几点：
1. Redis 服务是否启动：`systemctl status redis`
2. 连接地址和端口是否正确
3. 密码是否正确（如果设置了密码）
4. 防火墙是否允许连接

### 7.2 前端常见问题

**Q: pnpm install 失败**
A: 尝试以下方法：
```bash
# 清除缓存
pnpm store prune

# 删除 node_modules 重新安装
rm -rf node_modules
pnpm install

# 使用国内镜像
pnpm config set registry https://registry.npmmirror.com
```

**Q: 前端开发服务器启动失败，端口被占用**
A: 修改端口或释放端口：
```bash
# 查看占用端口的进程
lsof -i :5173

# 杀死进程
kill -9 <PID>

# 或者修改 vite.config.ts 中的端口
```

**Q: API 请求返回 401**
A: 检查以下几点：
1. 是否已登录并获取 Token
2. Token 是否过期
3. 请求头是否正确携带 Authorization
4. 后端服务是否正常运行

### 7.3 Docker 常见问题

**Q: Docker 容器启动失败**
A: 查看容器日志：
```bash
# 查看所有容器状态
docker-compose ps

# 查看容器日志
docker-compose logs <service-name>

# 进入容器调试
docker-compose exec <service-name> bash
```

**Q: 数据库容器数据丢失**
A: 确保使用了数据卷持久化：
```yaml
# docker-compose.yml
services:
  mysql:
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## 8. 性能优化

### 8.1 后端性能优化

- 使用数据库连接池
- 添加合适的数据库索引
- 使用 Redis 缓存热点数据
- 使用异步处理耗时操作
- 启用 Gzip 压缩
- 使用 CDN 加速静态资源

### 8.2 前端性能优化

- 使用代码分割和懒加载
- 优化图片大小和格式
- 使用虚拟列表处理大数据
- 避免不必要的重渲染
- 使用 memo 和 useMemo 优化
- 启用生产环境构建优化

## 9. 安全最佳实践

- 密码使用 bcrypt 加密存储
- 使用 HTTPS 加密传输
- 实现 JWT Token 认证和刷新机制
- 实施权限控制和数据权限
- 对用户输入进行验证和转义
- 实施 API 限流
- 定期更新依赖和安全补丁
- 记录安全审计日志

## 10. 参考资源

### 10.1 官方文档

- [Rust 官方文档](https://doc.rust-lang.org/)
- [Axum 框架文档](https://docs.rs/axum)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Vite 官方文档](https://vitejs.dev/)
- [SQLx 文档](https://docs.rs/sqlx)
- [Docker 官方文档](https://docs.docker.com/)

### 10.2 项目文档

- [API 快速参考手册](./api-quick-reference.md)
- [系统功能清单](../system-feature-checklist.md)
- [运维手册](../operations/operations-manual.md)
- [故障排查速查表](../operations/troubleshooting-cheatsheet.md)
- [部署指南](../deployment/deployment-guide.md)

---

*本文档由 TOPEMS 团队维护，最后更新：2026-08-28*
