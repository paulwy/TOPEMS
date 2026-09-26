# 代码规范

本文档定义 TOPEMS 项目的**代码编写规范**，确保代码质量和一致性，聚焦语言级写法：Rust 模块组织/错误处理/异步、TypeScript 类型与组件、数据库表结构、缓存选型。

> **文档分工**：项目架构、目录结构、命名规范、API 路径、Git 提交规范、CI/CD 标准见 [architecture-standards.md](../standards/architecture-standards.md)（项目级权威版本）。本文件不再重复这些内容，仅保留代码级编写约定。

## 目录

- [通用规范](#通用规范)
- [Rust 代码规范](#rust-代码规范)
- [TypeScript 代码规范](#typescript-代码规范)
- [数据库规范](#数据库规范)
- [缓存规范](#缓存规范)
- [代码审查清单](#代码审查清单)

---

## 通用规范

> 命名规范（目录/文件/API/数据库/前端组件命名、禁用词汇）已统一收敛到
> [architecture-standards.md 第 2 节](../standards/architecture-standards.md#2-命名规范)，此处不再重复。

### 1. 代码格式化

```bash
# Rust 格式化
cargo fmt

# TypeScript 格式化
cd apps/web && pnpm format
```

### 2. 代码检查

```bash
# Rust 代码检查
cargo clippy

# TypeScript 代码检查
cd apps/web && pnpm lint
```

---

## Rust 代码规范

### 1. 模块组织

```rust
// src/
├── main.rs           // 入口文件
├── lib.rs            // 库入口
├── api/              // API 层
│   ├── mod.rs
│   ├── routes.rs
│   └── handlers.rs
├── model/            // 数据模型
│   ├── mod.rs
│   └── entity.rs
├── service/          // 业务逻辑
│   ├── mod.rs
│   └── business.rs
├── repository/        // 数据访问
│   ├── mod.rs
│   └── db_ops.rs
├── config/           // 配置管理
│   ├── mod.rs
│   └── settings.rs
└── middleware/        // 中间件
    ├── mod.rs
    └── auth.rs
```

### 2. 错误处理

```rust
// 使用 thiserror 定义错误类型
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServiceError {
    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("未找到资源: {0}")]
    NotFound(String),
    
    #[error("权限不足")]
    Forbidden,
    
    #[error("认证失败")]
    Unauthorized,
}

// 统一错误响应
impl ServiceError {
    pub fn to_response(&self) -> (StatusCode, JsonValue) {
        match self {
            ServiceError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                json!({ "code": 404, "message": msg }),
            ),
            ServiceError::Forbidden => (
                StatusCode::FORBIDDEN,
                json!({ "code": 403, "message": "权限不足" }),
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({ "code": 500, "message": self.to_string() }),
            ),
        }
    }
}
```

### 3. 异步编程

```rust
// 使用 async/await
async fn get_user(id: Uuid, pool: &PgPool) -> Result<User, ServiceError> {
    sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_optional(pool)
        .await
        .map_err(|e| ServiceError::DatabaseError(e))?
        .ok_or_else(|| ServiceError::NotFound("用户不存在".to_string()))
}

// 避免阻塞操作
// 错误示例
fn bad_example() {
    let result = some_async_function().wait(); // 阻塞
}

// 正确示例
async fn good_example() {
    let result = some_async_function().await;
}
```

### 4. 权限控制

```rust
use topems_core::auth::require_permission;

async fn protected_handler(
    req: HttpRequest,
    pool: web::Data<PgPool>
) -> HttpResponse {
    // 检查权限
    match require_permission(&req, "users:read").await {
        Ok(true) => { /* 继续处理 */ }
        Ok(false) => return HttpResponse::Forbidden().json(/* ... */),
        Err(_) => return HttpResponse::Unauthorized().json(/* ... */),
    }
}
```

---

## TypeScript 代码规范

### 1. 类型定义

```typescript
// 使用 interface 定义对象类型
interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

// 使用 type 定义联合类型或别名
type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  timestamp: number;
};

type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}>;

// 避免使用 any，使用 unknown 代替
// 错误
function processData(data: any) {
  return data.value;
}

// 正确
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data format');
}
```

### 2. 组件规范

```typescript
// 组件文件命名：PascalCase.tsx
// 组件名称：PascalCase
// 组件必须使用函数式组件 + Hooks

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="user-card">
      <h3>{user.full_name}</h3>
      <p>{user.email}</p>
      {onEdit && <button onClick={() => onEdit(user)}>编辑</button>}
      {onDelete && <button onClick={() => onDelete(user)}>删除</button>}
    </div>
  );
}
```

### 3. Hooks 规范

```typescript
// 自定义 Hook 必须以 use 开头
// 放在 hooks/ 目录下
// 返回类型要明确

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 实现逻辑...
  
  return { user, loading, login, logout };
}
```

### 4. 导入顺序

```typescript
// 1. React 相关
import React, { useState, useEffect } from 'react';

// 2. 第三方库
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// 3. 内部模块 - @/ 开头的别名导入
import { apiClient } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { UserCard } from '@/components/UserCard';

// 4. 相对导入
import { formatDate } from '../utils/date';

// 5. 类型导入（单独一行）
import type { User } from '@/types';
```

### 5. 路径别名

```typescript
// tsconfig.json 配置
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/api/*": ["src/api/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

### 6. 路径规范

> 详细方案见 路径重构实施方案（已归档）

#### 6.1 统一配置文件

每个模块的路径常量、路由配置、导航配置必须合并到 `modules/{module}/config.ts`，禁止在 `routes/v2/*.ts` 和 `lib/navigation/modules/*.nav.ts` 中分散定义。

#### 6.2 路径常量（唯一真相源）

```typescript
// modules/hrm/config.ts
export const HRM_PATHS = {
  root: '/hrm',
  employees: '/hrm/employees',
  employeeCreate: '/hrm/employees/create',
  employeeDetail: '/hrm/employees/:id',
  employeeEdit: '/hrm/employees/:id/edit',
} as const;
```

- 常量名格式：`{MODULE}_PATHS`（如 `HRM_PATHS`）
- 必须以 `as const` 断言
- 列表页用复数名词（`employees`）
- 详情/创建/编辑用单数 + 后缀（`employeeDetail`）

#### 6.3 路径命名规范

| 场景 | 规则 | 示例 |
|------|------|------|
| 模块根 | `/{module}` | `/hrm` |
| 列表页 | `/{module}/{plural}` | `/hrm/employees` |
| 详情页 | `/{module}/{plural}/:id` | `/hrm/employees/:id` |
| 创建页 | `/{module}/{plural}/create` | `/hrm/employees/create` |
| 编辑页 | `/{module}/{plural}/:id/edit` | `/hrm/employees/:id/edit` |

- 路径全小写，多词用连字符（`salary-adjustment`）
- 列表页资源名用复数
- 创建页用 `create`（不是 `new`）

#### 6.4 组件引用规范

```typescript
// ✅ 正确：引用路径常量
import { HRM_PATHS } from '@/modules/hrm/config';
navigate(HRM_PATHS.employees);
navigate(HRM_PATHS.employeeDetail.replace(':id', id));

// ❌ 禁止：硬编码路径
navigate('/hrm/employees');
navigate(`/hrm/employees/${id}`);
```

#### 6.5 路径校验

CI 中运行路径校验脚本，检测死链、硬编码路径、命名规范：

```bash
python scripts/check-route-paths.py --ci
```

---

## 数据库规范

### 1. 表命名

- 使用小写下划线分隔
- 统一使用复数形式
- 模块前缀：`hrm_`, `crm_`, `pm_` 等

```sql
-- 正确
CREATE TABLE hrm_employees (...);
CREATE TABLE crm_customers (...);

-- 错误
CREATE TABLE hrm_Employee (...);
CREATE TABLE EmployeeDetail (...);
```

### 2. 字段命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 主键 | `id` UUID | `id UUID PRIMARY KEY` |
| 外键 | `{table}_id` | `department_id` |
| 时间戳 | `{action}_at` | `created_at`, `updated_at` |
| 布尔值 | `is_{noun}` 或 `has_{noun}` | `is_active`, `has_permission` |
| 枚举 | `{status}_status` | `order_status` |

### 3. 索引规范

```sql
-- 必须为外键创建索引
CREATE INDEX idx_employees_department_id ON hrm_employees(department_id);

-- 为频繁查询的字段创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 复合索引
CREATE INDEX idx_orders_company_status ON crm_orders(company_id, order_status);
```

### 4. 迁移文件命名

```bash
# 创建迁移
sqlx migrate add create_employees_table

# 迁移文件命名格式
# {timestamp}_{migration_name}.up.sql
# {timestamp}_{migration_name}.down.sql
```

---

## 缓存规范

### 1. 缓存架构总览

TOPEMS 采用**两级缓存（L1 + L2）**架构，所有实现统一在 `lib/shared-core/src/cache.rs` 和 `lib/shared-core/src/l2_cache.rs`：

| 层级 | 实现 | 作用域 | 适用场景 |
|------|------|--------|----------|
| **L1** | `moka::sync::Cache` | 进程内 | 高频热点数据，超低延迟（纳秒级） |
| **L2** | Redis | 跨实例共享 | 多副本部署需要数据一致性时 |

**核心 API**：

| 类型 | 路径 | 适用场景 |
|------|------|----------|
| `LocalInMemoryCache<T>` | `topems_shared::LocalInMemoryCache` | 同步、纯进程内、高频短 TTL |
| `AsyncL2Cache<T>` | `topems_shared::AsyncL2Cache` | 异步、L1+L2、跨实例共享 |
| `CacheService` trait | `topems_shared::redis::CacheService` | 完整特性（Bloom Filter、Mutex 防击穿、预热） |

### 2. 选型决策

```
是否需要跨实例共享数据？
├─ 否 → LocalInMemoryCache<T>（同步，简单）
└─ 是 → 是否需要 Bloom Filter / Mutex 防击穿 / 预热？
       ├─ 是 → shared-event::MultiLevelCacheManager（参考 hrm/scm init_cache）
       └─ 否 → AsyncL2Cache<T>（轻量，自动降级）
```

### 3. 使用规范

#### 3.1 LocalInMemoryCache（同步，推荐默认）

```rust
use topems_shared::LocalInMemoryCache;
use std::time::Duration;

// ✅ 推荐：服务局部缓存
let customer_cache: LocalInMemoryCache<Customer> = LocalInMemoryCache::new(Duration::from_secs(300));

// 读取（同步，立即返回）
if let Some(c) = customer_cache.get(&id.to_string()) { ... }

// 写入
customer_cache.set(id.to_string(), customer);
```

#### 3.2 AsyncL2Cache（异步，L1+L2 分布式）

```rust
use topems_shared::{AsyncL2Cache, L2CacheConfig};
use std::time::Duration;

let config = L2CacheConfig {
    instance_prefix: "crm".to_string(),    // Redis key 前缀，区分服务
    l1_ttl: Duration::from_secs(60),        // L1 短 TTL，避免 staleness
    l2_ttl: Duration::from_secs(3600),      // L2 长 TTL，跨实例共享
    l1_capacity: 5_000,                     // L1 容量上限
};

// 启动时初始化（Redis 不可用自动降级为纯 L1）
let cache = match AsyncL2Cache::<Customer>::try_new(
    config,
    std::env::var("REDIS_URL").ok().as_deref(),
).await {
    Ok(c) => c,
    Err((c, warn)) => {
        tracing::warn!("⚠️ {warn}");
        c
    }
};

// 使用（异步）
if let Some(c) = cache.get(&id.to_string()).await { ... }
cache.set(id.to_string(), customer).await;
```

### 4. 缓存键命名规范

强制格式：`{tenant}:{module}:{entity}:{id}`

```rust
// ✅ 正确
"tenant123:erp:dict:currency"
"tenant123:hrm:employee:550e8400-e29b-41d4-a716-446655440000"

// ❌ 错误（无租户隔离）
"dict:currency"
```

使用 `CacheKeyGenerator` 统一生成：

```rust
use topems_shared::CacheKeyGenerator;
let gen = CacheKeyGenerator::new("tenant123", "hrm");
let key = gen.entity_key("employee", &id.to_string());
```

### 5. 缓存失效策略

| 场景 | 策略 |
|------|------|
| 单条数据更新 | `cache.remove(key)` 同步删除 L1 + L2 |
| 批量数据更新 | `cache.clear_l1()` + 让 L2 TTL 自然过期 |
| 跨实例失效 | 通过事件总线发布 `CacheInvalidatedPayload`（见 `shared-event::cache`） |

### 6. 禁止事项

- ❌ 禁止各服务自实现 InMemoryCache（统一使用 `topems_shared::LocalInMemoryCache`）
- ❌ 禁止使用 `DashMap` 作为缓存后端（已统一迁移到 moka）
- ❌ 禁止将非 `Serialize` 的类型用于 `AsyncL2Cache<T>`（L2 Redis 需 JSON 序列化）
- ❌ 禁止缓存大对象（> 1MB）到 Redis，应考虑分片或直接查询 DB

---

## Git 提交规范

> 提交信息格式、Type 类型、提交示例、分支命名已统一收敛到项目级权威版本：
> 见 [architecture-standards.md 第 9 节 Git 提交规范](../standards/architecture-standards.md#9-git-提交规范)。
> 详细分支流程与 PR 规范另见 [git-workflow.md](../git-workflow.md)。

---

## 代码审查清单

提交代码前检查：

- [ ] 代码通过格式化 (`cargo fmt` / `pnpm format`)
- [ ] 代码通过检查 (`cargo clippy` / `pnpm lint`)
- [ ] 新功能包含单元测试
- [ ] 公共 API 有文档注释
- [ ] 数据库迁移可逆
- [ ] 敏感信息不硬编码
- [ ] 错误处理完整
- [ ] 日志记录适当
- [ ] 缓存实现统一使用 `topems_shared::LocalInMemoryCache` 或 `AsyncL2Cache`（不自实现）

---

**文档版本**: v1.1
**最后更新**: 2026-09-26
**变更说明**: 与 architecture-standards 去重——命名规范与 Git 提交规范收敛到 architecture-standards.md，本文件仅保留代码级编写约定（Rust/TS/数据库/缓存）。
