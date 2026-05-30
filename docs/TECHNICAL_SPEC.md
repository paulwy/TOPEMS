# TOPEMS 技术规范文档

**版本**: v1.0  
**日期**: 2026-05-30  
**状态**: 正式发布  

---

## 目录

1. [后端技术规范](#1-后端技术规范-rust)
2. [前端技术规范](#2-前端技术规范-react)
3. [数据库规范](#3-数据库规范)
4. [API设计规范](#4-api设计规范)
5. [安全规范](#5-安全规范)
6. [测试规范](#6-测试规范)
7. [Git工作流](#7-git工作流)
8. [文档规范](#8-文档规范)

---

## 1. 后端技术规范 (Rust)

### 1.1 项目结构

```
backend/
├── src/
│   ├── api/              # API 层
│   │   ├── mod.rs
│   │   ├── handlers/     # 请求处理
│   │   └── response.rs   # 响应封装
│   ├── models/           # 数据模型
│   ├── services/         # 业务逻辑层
│   ├── repositories/     # 数据访问层
│   ├── db/              # 数据库配置
│   │   ├── mod.rs
│   │   ├── repository.rs # 通用仓储
│   │   └── schema.rs    # 数据库Schema
│   ├── middleware/       # 中间件
│   ├── errors/           # 错误定义
│   └── main.rs           # 入口文件
├── migrations/           # 数据库迁移
├── tests/               # 集成测试
├── Cargo.toml
└── Dockerfile
```

### 1.2 代码组织

#### 模块划分

```rust
// src/api/mod.rs
pub mod handlers;
pub mod response;

// src/models/mod.rs
pub mod user;
pub mod project;

// src/services/mod.rs
pub mod user_service;
pub mod project_service;

// src/repositories/mod.rs
pub mod user_repository;
pub mod project_repository;
```

#### 命名规范

```rust
// 模块名：snake_case
pub mod user_service;
pub mod project_repository;

// 结构体：PascalCase
pub struct UserService;
pub struct ProjectRepository;

// 函数：snake_case
pub async fn get_user_by_id() {}
pub async fn create_project() {}

// 枚举：PascalCase
pub enum UserRole {
    Admin,
    User,
    Guest,
}

// 常量：SCREAMING_SNAKE_CASE
const MAX_PAGE_SIZE: i64 = 100;
const DEFAULT_PAGE_SIZE: i64 = 20;
```

### 1.3 错误处理

#### 错误类型定义

```rust
// src/errors/mod.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("认证失败: {0}")]
    AuthError(String),

    #[error("权限不足")]
    ForbiddenError,

    #[error("资源不存在: {0}")]
    NotFoundError(String),

    #[error("参数错误: {0}")]
    ValidationError(String),

    #[error("服务器错误: {0}")]
    InternalError(String),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
```

#### 错误响应

```rust
use topems_shared::Result;
use topems_shared::response::ApiResponse;

pub type AppResult<T> = Result<T, AppError>;

pub async fn get_user(id: Uuid) -> AppResult<User> {
    repository.find_by_id(id)
        .await?
        .ok_or(AppError::NotFoundError("用户不存在".to_string()))
}
```

### 1.4 数据库访问

#### 使用 SQLx

```rust
// Cargo.toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }

// 查询构建
let users = sqlx::query_as::<_, User>(
    "SELECT id, name, email, created_at FROM users WHERE status = $1"
)
.bind("active")
.fetch_all(&pool)
.await?;
```

#### 事务处理

```rust
pub async fn create_project_with_team(
    pool: &PgPool,
    project: &CreateProjectRequest,
) -> AppResult<Project> {
    let mut tx = pool.begin().await?;

    let project = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO projects (name, description, status)
        VALUES ($1, $2, $3)
        RETURNING *
        "#,
    )
    .bind(&project.name)
    .bind(&project.description)
    .bind("active")
    .fetch_one(&mut *tx)
    .await?;

    // 创建团队
    for member in &project.team_members {
        sqlx::query(
            "INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)"
        )
        .bind(project.id)
        .bind(member.user_id)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(project)
}
```

### 1.5 API 响应

#### 统一响应格式

```rust
use topems_shared::response::ApiResponse;

// 成功响应
ApiResponse::<User>::success(user, "用户创建成功")

// 错误响应
ApiResponse::<()>::error(401, "认证失败")

// 分页响应
ApiResponse::<Vec<User>>::success(users, "查询成功")
```

#### 状态码规范

```rust
#[derive(Debug, Clone, Copy)]
pub enum StatusCode {
    Success = 200,
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    InternalError = 500,
}

impl StatusCode {
    pub fn as_u16(&self) -> u16 {
        *self as u16
    }
}
```

### 1.6 中间件

#### 认证中间件

```rust
use axum::{
    extract::FromRequestParts,
    http::request::Parts,
    async_trait,
};

pub struct AuthUser {
    pub user_id: Uuid,
    pub roles: Vec<String>,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // 从 Authorization header 提取 token
        // 验证 token 并返回用户信息
    }
}
```

---

## 2. 前端技术规范 (React)

### 2.1 项目结构

```
frontend/
├── src/
│   ├── api/              # API 调用
│   │   ├── client.ts     # Axios 实例
│   │   ├── user.ts      # 用户 API
│   │   └── project.ts   # 项目 API
│   ├── components/       # 通用组件
│   │   ├── Button/
│   │   ├── Input/
│   │   └── Table/
│   ├── pages/            # 页面组件
│   │   ├── Dashboard/
│   │   ├── Projects/
│   │   └── Settings/
│   ├── hooks/            # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   └── useFetch.ts
│   ├── stores/           # 状态管理
│   │   ├── authStore.ts
│   │   └── appStore.ts
│   ├── types/            # 类型定义
│   │   ├── user.types.ts
│   │   └── api.types.ts
│   ├── utils/            # 工具函数
│   │   ├── format.ts
│   │   └── validation.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 2.2 组件规范

#### 组件命名

```tsx
// 文件名：PascalCase.tsx
// 组件名：PascalCase

// Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

#### Props 类型定义

```tsx
// 推荐使用 interface
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// 避免使用 type alias（复杂类型除外）
type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};
```

### 2.3 状态管理

#### Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

#### React Query

```typescript
// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/user';

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getUser(userId),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

### 2.4 API 调用

#### Axios 实例

```typescript
// api/client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default client;
```

#### API 函数

```typescript
// api/user.ts
import client from './client';
import type { User, CreateUserRequest } from '@/types';

export const userApi = {
  getUsers: (params?: ListParams) =>
    client.get<ApiResponse<User[]>>('/api/v1/users', { params }),

  getUser: (id: string) =>
    client.get<ApiResponse<User>>(`/api/v1/users/${id}`),

  createUser: (data: CreateUserRequest) =>
    client.post<ApiResponse<User>>('/api/v1/users', data),

  updateUser: (id: string, data: UpdateUserRequest) =>
    client.put<ApiResponse<User>>(`/api/v1/users/${id}`, data),

  deleteUser: (id: string) =>
    client.delete<ApiResponse<void>>(`/api/v1/users/${id}`),
};
```

### 2.5 路由管理

#### React Router v6

```typescript
// router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ProjectList } from '@/pages/ProjectList';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: '/projects',
        element: (
          <ProtectedRoute>
            <ProjectList />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
```

---

## 3. 数据库规范

### 3.1 命名规范

```sql
-- 表名：snake_case，复数形式
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 列名：snake_case
user_id          -- 用户ID（外键）
created_at       -- 创建时间
updated_at       -- 更新时间
is_active        -- 是否激活（布尔型前缀 is_）

-- 索引：idx_<table>_<column>
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_status ON projects(status);

-- 外键：<referenced_table>_id
project_id INTEGER REFERENCES projects(id);
```

### 3.2 Schema 设计

#### 用户表 (users)

```sql
CREATE TABLE iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT users_status CHECK (status IN ('active', 'inactive', 'banned'))
);

CREATE INDEX idx_users_username ON iam.users(username);
CREATE INDEX idx_users_email ON iam.users(email);
CREATE INDEX idx_users_status ON iam.users(status);
```

#### 项目表 (projects)

```sql
CREATE TABLE rs.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    project_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    leader VARCHAR(255) NOT NULL,
    team_members JSONB DEFAULT '[]',
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    budget NUMERIC(15, 2),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON rs.projects(status);
CREATE INDEX idx_projects_leader ON rs.projects(leader);
CREATE INDEX idx_projects_start_date ON rs.projects(start_date);
```

### 3.3 审计字段

```sql
-- 所有表必须包含审计字段
CREATE TABLE example (
    -- 主键
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 业务字段
    name VARCHAR(255) NOT NULL,

    -- 审计字段
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255)
);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_example_updated_at
    BEFORE UPDATE ON example
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### 3.4 数据类型

| 业务场景 | PostgreSQL类型 | 说明 |
|---------|---------------|------|
| 主键 | UUID | 全局唯一标识 |
| 用户名/名称 | VARCHAR(255) | 可变长度字符串 |
| 代码/编号 | VARCHAR(100) | 固定格式代码 |
| 长文本 | TEXT | 无长度限制 |
| 金额 | NUMERIC(15,2) | 精确小数 |
| 百分比 | INTEGER | 0-100 |
| 时间戳 | TIMESTAMPTZ | 带时区 |
| 布尔值 | BOOLEAN | true/false |
| JSON数据 | JSONB | 结构化数据 |

---

## 4. API设计规范

### 4.1 URL 规范

```
# 资源命名
GET    /api/v1/users           # 用户列表
GET    /api/v1/users/:id       # 用户详情
POST   /api/v1/users           # 创建用户
PUT    /api/v1/users/:id       # 更新用户
DELETE /api/v1/users/:id       # 删除用户

# 关联资源
GET    /api/v1/projects/:id/members           # 项目成员
POST   /api/v1/projects/:id/members           # 添加成员
DELETE /api/v1/projects/:id/members/:userId   # 移除成员

# 批量操作
POST   /api/v1/users/batch        # 批量创建
DELETE /api/v1/users/batch        # 批量删除

# 特殊操作
POST   /api/v1/users/:id/activate    # 激活用户
POST   /api/v1/users/:id/deactivate  # 停用用户
```

### 4.2 请求格式

```json
// 创建请求
POST /api/v1/projects
Content-Type: application/json

{
  "name": "新型催化剂研发",
  "code": "RS-2026-001",
  "description": "研发高效、低成本的工业催化剂",
  "project_type": "research",
  "leader": "张三",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "budget": 1000000.00
}

// 更新请求
PUT /api/v1/projects/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "新型催化剂研发（优化版）",
  "status": "in_progress",
  "progress": 25
}

// 查询参数
GET /api/v1/projects?status=active&page=1&page_size=20&sort=created_at&order=desc
```

### 4.3 响应格式

```json
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新型催化剂研发",
    "status": "active"
  },
  "timestamp": 1717056000
}

// 分页响应
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "timestamp": 1717056000
}

// 错误响应
{
  "code": 404,
  "message": "项目不存在",
  "data": null,
  "timestamp": 1717056000
}
```

### 4.4 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功获取/更新资源 |
| 201 | Created | 成功创建资源 |
| 204 | No Content | 成功删除资源 |
| 400 | Bad Request | 参数错误、验证失败 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 500 | Internal Server Error | 服务器错误 |

### 4.5 认证方式

```bash
# JWT Token
curl -X GET "http://localhost:8005/api/v1/projects" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# API Key（用于服务间调用）
curl -X GET "http://localhost:8005/api/v1/projects" \
  -H "X-API-Key: your-api-key-here"
```

---

## 5. 安全规范

### 5.1 认证授权

```rust
// JWT Token 验证
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|_| AppError::AuthError("无效的token".to_string()))?;

    Ok(token_data.claims)
}
```

### 5.2 输入验证

```rust
use serde::Deserialize;
use validator::Validate;

#[derive(Deserialize, Validate)]
pub struct CreateProjectRequest {
    #[validate(length(min = 1, max = 255, message = "项目名称长度必须在1-255之间"))]
    pub name: String,

    #[validate(regex(path = "PROJECT_CODE_REGEX", message = "项目代码格式不正确"))]
    pub code: String,

    #[validate(range(min = 0, message = "预算不能为负数"))]
    pub budget: Option<f64>,

    #[validate(length(min = 1, message = "负责人不能为空"))]
    pub leader: String,
}
```

### 5.3 SQL 注入防护

```rust
// ✅ 使用参数化查询
let user = sqlx::query_as::<_, User>(
    "SELECT * FROM users WHERE id = $1"
)
.bind(user_id)
.fetch_one(&pool)
.await?;

// ❌ 避免字符串拼接
let query = format!("SELECT * FROM users WHERE name = '{}'", name);
```

### 5.4 敏感数据处理

```rust
// 密码加密
use bcrypt::{hash, verify, DEFAULT_COST};

pub fn hash_password(password: &str) -> Result<String, AppError> {
    hash(password, DEFAULT_COST)
        .map_err(|_| AppError::InternalError("密码加密失败".to_string()))
}

// 日志脱敏
pub fn sanitize_log_data(data: &str) -> String {
    // 移除敏感信息
    let sensitive_patterns = ["password", "token", "secret", "key"];
    let mut result = data.to_string();
    for pattern in sensitive_patterns {
        let regex = Regex::new(&format!(r#"("{}"\s*:\s*")[^"]*"#, pattern)).unwrap();
        result = regex.replace_all(&result, format!(r#"$1****"#, pattern)).to_string();
    }
    result
}
```

---

## 6. 测试规范

### 6.1 后端测试

```rust
// tests/unit/user_service_test.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_user_success() {
        let pool = create_test_pool().await;
        let service = UserService::new(pool);

        let req = CreateUserRequest {
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            password: "Test123456".to_string(),
        };

        let result = service.create(&req).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_create_user_duplicate_email() {
        // 测试重复邮箱错误
    }
}
```

### 6.2 前端测试

```typescript
// __tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

### 6.3 覆盖率要求

| 测试类型 | 覆盖率目标 | 说明 |
|---------|-----------|------|
| 单元测试 | 80%+ | 核心业务逻辑 |
| 集成测试 | 70%+ | API 接口 |
| 端到端测试 | 50%+ | 关键用户流程 |

---

## 7. Git工作流

### 7.1 分支命名

```
feature/user-authentication      # 新功能
feature/project-management
bugfix/login-validation          # Bug 修复
bugfix/database-connection
hotfix/security-patch           # 紧急修复
hotfix/production-error
release/v1.0.0                  # 发布分支
release/v1.1.0
```

### 7.2 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 示例

```
feat(auth): add JWT token validation

Implement JWT token validation middleware
- Add token parsing logic
- Add token expiration check
- Add role-based access control

Closes #123
```

### 7.3 Pull Request 流程

1. Fork 或创建功能分支
2. 开发并提交代码
3. 推送分支到远程
4. 创建 Pull Request
5. 代码审查（至少 1 人 approval）
6. 合并到主分支
7. 删除功能分支

---

## 8. 文档规范

### 8.1 代码注释

```rust
/// 创建新用户
///
/// # Arguments
///
/// * `req` - 用户创建请求
///
/// # Returns
///
/// 返回创建的用户信息
///
/// # Errors
///
/// * `ValidationError` - 参数验证失败
/// * `DatabaseError` - 数据库操作失败
pub async fn create_user(&self, req: &CreateUserRequest) -> AppResult<User> {
    // 验证邮箱格式
    self.validate_email(&req.email)?;

    // 创建用户
    self.repository.create(req).await
}
```

### 8.2 README 规范

```markdown
# 项目名称

简短描述

## 快速开始

```bash
# 安装依赖
cargo install

# 运行
cargo run
```

## 功能特性

- 功能1
- 功能2
- 功能3

## 文档

详细文档请查看 [docs/](docs/)

## 许可证

MIT
```

### 8.3 API 文档格式

```markdown
# 服务名称

**服务地址**: http://localhost:PORT

## 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/... | ... |

## 接口详情

### 接口名称

**端点**: `METHOD /api/v1/...`

**认证**: 需要/不需要

**参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|

**响应**: ...

**示例**:
```bash
curl -X GET "..."
```
```

---

**文档版本**: v1.0  
**最后更新**: 2026-05-30  
**文档状态**: 正式发布  
**存档位置**: `docs/TECHNICAL_SPEC.md`
