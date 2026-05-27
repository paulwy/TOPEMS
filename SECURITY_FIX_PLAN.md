# TOPEMS 系统安全修复方案

## 🚨 发现的问题

### 1. 严重问题：大多数服务无认证保护

以下服务完全没有任何认证机制，任何人都可以访问和修改数据：

- ✅ topems-erp (已修复)
- ✅ topems-scm (已修复)
- ✅ topems-lims (已修复)
- ✅ topems-wms (已修复)
- ✅ topems-qms (已修复)
- ✅ topems-hrm (已修复)
- ✅ topems-crm (已修复)
- ✅ services/backend (已修复)
- ✅ topems-mes (已修复)
- ✅ topems-pdm (已修复)
- ✅ topems-ehs (已修复)
- ✅ topems-srm (已修复)
- ✅ topems-gis (已修复)
- ✅ topems-portal (已修复)
- ✅ topems-bi (已修复)
- ✅ topems-mobile (已修复)
- ✅ topems-integration (已修复)
- ✅ topems-ai (已修复)
- ✅ topems-im (已修复)

### 2. 中等问题：CORS 配置过于宽松

所有服务都使用 `AllowOrigin::any()` 允许任意来源的跨域请求。

### 3. 中等问题：services/backend 使用内存存储

这个服务没有连接真实数据库，所有数据都是临时的。

### 4. 配置问题：默认密码和密钥

- JWT_SECRET 有不安全的默认值
- 数据库密码有不安全的默认值

## ✅ 已完成的工作

### 1. 创建统一认证中间件库

**位置**: `/Users/xingzhai/TOPEMS/shared/lib`

**新增模块**:
- `auth.rs` - JWT 认证中间件和权限检查
- `response.rs` - 统一的 API 响应结构
- `cors.rs` - 安全的 CORS 配置

**功能特性**:
- JWT token 验证
- Claims 提取和扩展
- 权限检查辅助函数
- 角色检查辅助函数
- 统一的分页响应
- 安全的 CORS 配置

### 2. 修复 topems-erp 服务

**变更内容**:
- 添加了 JWT 认证中间件保护所有 API
- 使用共享库的统一响应结构
- 使用安全的 CORS 配置
- 从环境变量读取 JWT_SECRET

### 3. 大规模修复所有服务（19个服务）

**已修复的服务**:
- ✅ topems-scm - 供应链管理
- ✅ topems-lims - 实验室信息管理
- ✅ topems-wms - 仓库管理
- ✅ topems-qms - 质量管理
- ✅ topems-hrm - 人力资源
- ✅ topems-crm - 客户关系管理
- ✅ topems-mes - 制造执行
- ✅ topems-pdm - 产品数据管理
- ✅ topems-ehs - 环境健康安全
- ✅ topems-srm - 供应商关系管理
- ✅ topems-gis - 地理信息
- ✅ topems-portal - 门户
- ✅ topems-bi - 商业智能
- ✅ topems-mobile - 移动端
- ✅ topems-integration - 集成服务
- ✅ topems-ai - AI 服务
- ✅ topems-im - 即时通讯
- ✅ services/backend - 主后端服务

**统一修复内容**:
- 添加了 JWT 认证中间件保护所有 API
- 使用共享库的统一响应结构
- 使用安全的 CORS 配置（不再使用 AllowOrigin::any()）
- 从环境变量读取 JWT_SECRET
- 添加了完整的错误处理和日志
- 统一了代码库结构和依赖版本

**修复完成时间**: 2026-05-26
**总修复服务数**: 19个

## 📋 修复步骤

### ✅ 阶段 1：核心服务（优先级：高）- 已完成

1. ✅ topems-erp - 企业资源计划
2. ✅ topems-scm - 供应链管理
3. ✅ topems-lims - 实验室信息管理
4. ✅ topems-wms - 仓库管理

### ✅ 阶段 2：业务服务（优先级：高）- 已完成

5. ✅ topems-qms - 质量管理
6. ✅ topems-hrm - 人力资源
7. ✅ topems-crm - 客户关系管理
8. ✅ topems-mes - 制造执行

### ✅ 阶段 3：平台服务（优先级：中）- 已完成

9. ✅ topems-pdm - 产品数据管理
10. ✅ topems-ehs - 环境健康安全
11. ✅ topems-srm - 供应商关系管理
12. ✅ topems-gis - 地理信息
13. ✅ topems-portal - 门户
14. ✅ topems-bi - 商业智能
15. ✅ topems-mobile - 移动端
16. ✅ topems-integration - 集成服务
17. ✅ topems-ai - AI 服务
18. ✅ topems-im - 即时通讯
19. ✅ services/backend - 主后端服务

## 🔧 标准修复模板

### 1. 更新 Cargo.toml

```toml
[dependencies]
# ... 现有依赖 ...
topems-shared = { path = "../../shared/lib" }
```

### 2. 更新 main.rs

```rust
use axum::{
    extract::FromRef,
    routing::get,
    Router,
};
use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ... 现有代码 ...
    
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });
    
    let app_state = AppState {
        pool: pool.clone(),
        auth_state: AuthState::new(jwt_secret),
    };
    
    let cors = create_cors_layer();
    
    let app = Router::new()
        .route("/health", get(health_check))
        // ... 其他路由 ...
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state)
        .layer(cors);
    
    // ... 剩余代码 ...
}
```

### 3. 更新 API 文件

将重复的 `ApiResponse` 和 `PaginationParams` 替换为共享库的版本：

```rust
use topems_shared::{ApiResponse, PaginationParams, PaginatedResponse};
```

## 📝 环境配置

### .env 文件示例

```env
# 数据库配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=topems
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=topems
DATABASE_URL=postgres://topems:your-secure-password-here@localhost:5432/topems

# JWT 配置（生产环境必须修改！）
JWT_SECRET=your-very-secure-jwt-secret-key-at-least-32-characters
JWT_EXPIRATION=86400

# CORS 配置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# 其他配置
RUST_LOG=info
```

## 🛡️ 安全最佳实践

### 1. JWT_SECRET 要求

- 长度至少 32 个字符
- 使用强随机生成的密钥
- 生产环境必须使用环境变量
- 定期轮换密钥

### 2. CORS 配置

- 明确列出允许的源
- 生产环境禁用 `AllowOrigin::any()`
- 配置适当的允许方法和头部

### 3. 数据库安全

- 使用强密码
- 限制数据库用户权限
- 启用 SSL/TLS 连接
- 定期备份

### 4. 认证和授权

- 所有 API 都需要认证（除了 /health 和 /api/v1/auth/*）
- 实现基于角色的访问控制（RBAC）
- 记录所有敏感操作
- 实现 token 过期和刷新机制

## 🧪 测试验证

### 认证测试

```bash
# 测试未认证访问应该返回 401
curl http://localhost:8009/api/v1/companies

# 使用有效 token 访问
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8009/api/v1/companies
```

### CORS 测试

检查响应头中的 `Access-Control-Allow-Origin` 是否只包含配置的源。

## 📊 修复进度跟踪

| 服务 | 状态 | 优先级 |
|------|------|--------|
| topems-erp | ✅ 已完成 | 高 |
| topems-scm | ✅ 已完成 | 高 |
| topems-lims | ✅ 已完成 | 高 |
| topems-wms | ✅ 已完成 | 高 |
| topems-qms | ✅ 已完成 | 高 |
| topems-hrm | ✅ 已完成 | 高 |
| topems-crm | ✅ 已完成 | 高 |
| topems-mes | ✅ 已完成 | 中 |
| topems-pdm | ✅ 已完成 | 中 |
| topems-ehs | ✅ 已完成 | 中 |
| topems-srm | ✅ 已完成 | 中 |
| topems-gis | ✅ 已完成 | 中 |
| topems-portal | ✅ 已完成 | 中 |
| topems-bi | ✅ 已完成 | 中 |
| topems-mobile | ✅ 已完成 | 中 |
| topems-integration | ✅ 已完成 | 中 |
| topems-ai | ✅ 已完成 | 中 |
| topems-im | ✅ 已完成 | 中 |
| services/backend | ✅ 已完成 | 高 |
| topems-flow | ✅ 已有认证 | 高 |
| topems-doc | ✅ 已有认证 | 高 |
| topems-iam | ✅ 已有认证 | 高 |

## 📞 支持和联系

如有问题，请联系开发团队。
