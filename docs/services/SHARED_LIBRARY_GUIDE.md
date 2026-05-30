
# TOPEMS 共享库使用指南

## 概述

TOPEMS 共享库 (`shared/lib`) 提供了一组统一的工具和模块，用于所有 TOPEMS 后端服务。本文档介绍了如何使用这些模块。

---

## 目录

1. [快速开始](#快速开始)
2. [配置管理](#配置管理)
3. [日志系统](#日志系统)
4. [数据库连接](#数据库连接)
5. [错误处理](#错误处理)
6. [认证授权](#认证授权)
7. [API 响应](#api-响应)
8. [健康检查](#健康检查)

---

## 快速开始

### 添加依赖

在服务的 `Cargo.toml` 中添加：

```toml
[dependencies]
topems-shared = { path = "../../../shared/lib" }
```

### 导入模块

```rust
use topems_shared::{
    Config,
    init_logging,
    create_database_pool,
    test_database_connection,
    Result,
    TopemsError,
    ApiResponse,
    create_cors_layer,
    auth_middleware,
};
```

### 基本使用

```rust
#[tokio::main]
async fn main() -> Result<()> {
    // 1. 初始化日志
    init_logging("my-service");

    // 2. 加载配置
    let config = Config::load().await?;
    tracing::info!("Environment: {}", config.env());

    // 3. 创建数据库连接池
    let pool = create_database_pool(&config.get_database().await).await?;
    test_database_connection(&pool).await?;

    // 4. 配置 CORS
    let cors = create_cors_layer();

    // 5. 构建应用...
    
    Ok(())
}
```

---

## 配置管理

### Config 模块

`Config` 提供统一的配置管理，支持多环境配置。

```rust
use topems_shared::Config;

// 加载配置（自动检测环境）
let config = Config::load().await?;

// 获取配置值
let db_config = config.get_database().await;
let auth_config = config.get_auth().await;
let server_config = config.get_server().await;
```

### 配置结构

```rust
// 数据库配置
struct DatabaseConfig {
    pub url: String,
    pub host: String,
    pub port: u16,
    pub name: String,
    pub user: String,
    pub password: String,
    pub pool_max_size: u32,
    pub pool_min_size: u32,
    pub connect_timeout: u64,
    pub idle_timeout: u64,
}

// 认证配置
struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub jwt_refresh_secret: String,
    pub jwt_refresh_expiry_days: u64,
}

// 服务配置
struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
    pub cors_methods: Vec<String>,
    pub cors_credentials: bool,
    pub rate_limit_enabled: bool,
}
```

### 环境变量

支持的环境变量：

```env
# 应用环境
APP_ENV=development

# 数据库
DATABASE_URL=postgres://user:pass@localhost:5432/db
DB_POOL_MAX_SIZE=10
DB_POOL_MIN_SIZE=2

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY_HOURS=24

# 服务
SERVER_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 日志系统

### 初始化日志

```rust
use topems_shared::init_logging;

// 简单的日志初始化
init_logging("my-service");
```

### 结构化日志

```rust
use topems_shared::init_structured_logging;

// JSON 格式的结构化日志
init_structured_logging("my-service");

// 日志会自动包含：
// - service: 服务名称
// - timestamp: 时间戳
// - level: 日志级别
// - target: 目标模块
// - thread_id: 线程 ID
```

### 自定义过滤器

```rust
use topems_shared::init_logging_with_filter;
use tracing_subscriber::EnvFilter;

let filter = EnvFilter::new("info,my_module=debug,warnings=warn");
init_logging_with_filter("my-service", Some(filter));
```

### 使用日志

```rust
tracing::info!("Service started");
tracing::debug!("Processing request: {:?}", request);
tracing::warn!("Retrying operation");
tracing::error!("Operation failed: {}", error);
```

---

## 数据库连接

### 创建连接池

```rust
use topems_shared::{Config, create_database_pool};

let config = Config::load().await?;
let pool = create_database_pool(&config.get_database().await).await?;
```

### 测试连接

```rust
use topems_shared::{test_database_connection, check_database_health};

// 测试连接（失败会返回错误）
test_database_connection(&pool).await?;

// 检查健康状态（返回布尔值）
let is_healthy = check_database_health(&pool).await;
if !is_healthy {
    tracing::error!("Database connection unhealthy!");
}
```

### 在处理器中使用

```rust
use axum::{extract::State, Json};
use sqlx::PgPool;

async fn list_items(State(pool): State<PgPool>) -> Result<Json<Vec<Item>>, TopemsError> {
    let items = sqlx::query_as::<_, Item>("SELECT * FROM items")
        .fetch_all(&pool)
        .await
        .map_err(|e| TopemsError::Database(format!("Query failed: {}", e)))?;
    
    Ok(Json(items))
}
```

---

## 错误处理

### TopemsError 类型

```rust
use topems_shared::{TopemsError, Result};

pub enum TopemsError {
    Config(String),      // 500 - 配置错误
    Database(String),    // 500 - 数据库错误
    Auth(String),        // 401 - 认证错误
    Validation(String),  // 400 - 验证错误
    NotFound(String),    // 404 - 资源未找到
    Unauthorized(String), // 401 - 未授权
    Forbidden(String),   // 403 - 禁止访问
    Internal(String),    // 500 - 内部错误
}
```

### 使用 Result 类型

```rust
use topems_shared::{Result, TopemsError};

async fn get_user(id: &str) -> Result<User> {
    // 成功返回
    Ok(user)
    
    // 错误返回
    Err(TopemsError::NotFound(format!("User {} not found", id)))
    Err(TopemsError::Database(format!("Query failed: {}", e)))
}
```

### 转换为 HTTP 响应

```rust
use axum::{response::IntoResponse, Json};
use topems_shared::{TopemsError, ApiResponse};

impl IntoResponse for TopemsError {
    fn into_response(self) -> axum::response::Response {
        let status = axum::http::StatusCode::from_u16(self.status_code())
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        
        (
            status,
            Json(ApiResponse::<()>::error(self.error_code(), &self.to_string()))
        ).into_response()
    }
}
```

---

## 认证授权

### 认证中间件

```rust
use topems_shared::{auth_middleware, AuthState};

let auth_state = AuthState::from_env();

let app = Router::new()
    .route("/protected", get(protected_handler))
    .layer(axum::middleware::from_fn_with_state(
        auth_state.clone(),
        auth_middleware,
    ));
```

### 可选认证（不强制登录）

```rust
use topems_shared::optional_auth_middleware;

let app = Router::new()
    .route("/optional", get(optional_handler))
    .layer(axum::middleware::from_fn_with_state(
        auth_state.clone(),
        optional_auth_middleware,
    ));
```

### Claims 结构

```rust
use topems_shared::auth::Claims;

async fn handler(claims: Claims) -> String {
    format!("Hello, {}!", claims.username)
}
```

---

## API 响应

### ApiResponse 结构

```rust
use topems_shared::ApiResponse;

// 成功响应
Json(ApiResponse::success(data, "Operation successful"))

// 错误响应
Json(ApiResponse::error("ERROR_CODE", "Error message"))

// OK 响应（无数据）
Json(ApiResponse::ok("Operation completed"))
```

### 分页响应

```rust
use topems_shared::PaginatedResponse;

Json(PaginatedResponse::new(
    items,
    total,
    page,
    per_page,
))
```

---

## 健康检查

### Health 模块

```rust
use topems_shared::{ServiceHealth, HealthStatus};

let health = ServiceHealth {
    service_name: "my-service".to_string(),
    status: HealthStatus::Healthy,
    version: env!("CARGO_PKG_VERSION").to_string(),
    timestamp: Utc::now(),
};
```

### HTTP 健康检查

```rust
use topems_shared::check_http_health;

async fn health_check() -> impl IntoResponse {
    check_http_health("my-service", "1.0.0", vec![])
}
```

---

## 示例：完整的服务模板

```rust
//! TOPEMS 服务模板

use axum::{
    routing::get,
    Json, Router,
};
use topems_shared::{
    Config,
    init_logging,
    create_database_pool,
    test_database_connection,
    create_cors_layer,
    auth_middleware,
    AuthState,
    ApiResponse,
    Result,
    TopemsError,
};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
}

#[tokio::main]
async fn main() -> Result<()> {
    // 1. 初始化
    dotenv::dotenv().ok();
    init_logging("my-service");

    // 2. 配置
    let config = Config::load().await?;
    tracing::info!("Starting in {} mode", config.env());

    // 3. 数据库
    let pool = create_database_pool(&config.get_database().await).await?;
    test_database_connection(&pool).await?;

    // 4. 应用状态
    let state = AppState { pool };

    // 5. 认证和 CORS
    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

    // 6. 路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/items", get(list_items).post(create_item))
        .with_state(state)
        .layer(axum::middleware::from_fn_with_state(auth_state, auth_middleware))
        .layer(cors);

    // 7. 启动
    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("healthy", "Service is running"))
}

async fn list_items(State(pool): State<sqlx::PgPool>) -> Result<Json<Vec<Item>>> {
    let items = sqlx::query_as::<_, Item>("SELECT * FROM items")
        .fetch_all(&pool)
        .await
        .map_err(|e| TopemsError::Database(e.to_string()))?;
    
    Ok(Json(items))
}
```

---

## 更多资源

- [优化计划](./PHASE1_OPTIMIZATION_PLAN.md)
- [优化总结](./PHASE1_OPTIMIZATION_SUMMARY.md)
- [第二阶段工作总结](./PHASE2_WORK_SUMMARY.md)
- [服务优化指南](./SERVICE_OPTIMIZATION_GUIDE.md)

