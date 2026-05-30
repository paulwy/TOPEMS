
# TOPEMS 服务优化指南

本文档提供了如何使用共享库优化现有 TOPEMS 服务的详细指南。

---

## 目录

1. [整体架构](#整体架构)
2. [服务初始化优化](#服务初始化优化)
3. [数据库连接优化](#数据库连接优化)
4. [错误处理优化](#错误处理优化)
5. [API 响应优化](#api-响应优化)
6. [完整示例](#完整示例)

---

## 整体架构

TOPEMS 使用共享库 (`shared/lib`) 提供统一的基础架构：

```
shared/lib/
├── config.rs      # 配置管理
├── error.rs       # 统一错误类型
├── auth.rs        # 认证和权限
├── response.rs    # API 响应
├── cors.rs        # CORS 配置
├── health.rs      # 健康检查
├── logging.rs     # 日志初始化 (新添加)
└── database.rs    # 数据库连接池 (新添加)
```

---

## 服务初始化优化

### 1. 导入依赖

确保服务的 `Cargo.toml` 包含：

```toml
[dependencies]
topems-shared = { path = "../../shared/lib" }
tokio = { version = "1", features = ["full"] }
axum = "0.7"
tracing = "0.1"
dotenv = "0.15"
```

### 2. 主函数优化

优化前的主函数（以 LIMS 为例）：

```rust
#[tokio::main]
async fn main() -&gt; anyhow::Result&lt;()&gt; {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 手动配置数据库...
}
```

优化后的主函数：

```rust
use topems_shared::{
    Config,
    init_logging,
    create_database_pool,
    test_database_connection,
    create_cors_layer,
    auth_middleware,
    AuthState,
};

#[tokio::main]
async fn main() -&gt; topems_shared::Result&lt;()&gt; {
    dotenv::dotenv().ok();

    // 1. 初始化统一日志
    init_logging("topems-lims");

    // 2. 加载配置
    let config = Config::load().await?;
    tracing::info!("Config loaded, environment: {}", config.env());

    // 3. 创建数据库连接池
    let pool = create_database_pool(&amp;config.get_database().await).await?;
    test_database_connection(&amp;pool).await?;

    // 4. 设置认证状态
    let auth_state = AuthState::from_env();

    // 5. 配置 CORS
    let cors = create_cors_layer();

    // 6. 构建应用
    let app = Router::new()
        .route("/health", get(health_check))
        .merge(sample_routes())
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .layer(cors);

    // 7. 启动服务
    let port = config.get_server().await.port;
    tracing::info!("Starting service on port: {}", port);

    let listener = tokio::net::TcpListener::bind(&amp;format!("0.0.0.0:{}", port)).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
```

---

## 数据库连接优化

### 使用共享库的数据库模块

```rust
use topems_shared::database;

// 创建连接池（自动使用配置）
let pool = database::create_database_pool(&amp;config.get_database().await).await?;

// 测试连接
database::test_database_connection(&amp;pool).await?;

// 在处理器中使用
async fn list_samples(State(pool): State&lt;PgPool&gt;) -&gt; Result&lt;...&gt; {
    // ...
}
```

### 数据库配置

在 `.env` 中配置：

```env
# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
DB_POOL_MAX_SIZE=20
DB_POOL_MIN_SIZE=5
DB_CONNECT_TIMEOUT=10
DB_IDLE_TIMEOUT=300
```

---

## 错误处理优化

### 统一错误类型

```rust
use topems_shared::{TopemsError, Result};

// 在函数中返回统一的错误
async fn get_sample(id: &amp;str) -&gt; Result&lt;Sample&gt; {
    let sample = query_one_sample(id).await
        .map_err(|e| TopemsError::Database(format!("Query failed: {}", e)))?;

    if sample.is_none() {
        return Err(TopemsError::NotFound(format!("Sample {} not found", id)));
    }

    Ok(sample.unwrap())
}
```

### 将错误转换为 HTTP 响应

```rust
use axum::{response::IntoResponse, Json};
use topems_shared::{TopemsError, ApiResponse};

impl IntoResponse for TopemsError {
    fn into_response(self) -&gt; axum::response::Response {
        let status = axum::http::StatusCode::from_u16(self.status_code())
            .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
        
        (
            status,
            Json(ApiResponse::&lt;()&gt;::error(self.error_code(), &amp;self.to_string()))
        ).into_response()
    }
}
```

---

## API 响应优化

### 使用标准化响应

```rust
use topems_shared::ApiResponse;

// 成功响应
async fn create_sample() -&gt; impl IntoResponse {
    let sample = create_new_sample().await?;
    Json(ApiResponse::success(sample, "Sample created"))
}

// 分页响应
async fn list_samples() -&gt; impl IntoResponse {
    let (items, total) = fetch_samples().await?;
    Json(ApiResponse::paginated(items, total, page, per_page))
}

// 错误响应
async fn handle_error(e: TopemsError) -&gt; impl IntoResponse {
    Json(ApiResponse::&lt;()&gt;::error(e.error_code(), &amp;e.to_string()))
}
```

---

## 完整示例

### 优化后的 LIMS 服务示例

```rust
//! 优化后的 LIMS 服务主文件

use axum::{
    extract::{Path, State},
    routing::{get, post, put, delete},
    Json,
    Router,
};
use topems_shared::{
    Config,
    init_logging,
    create_database_pool,
    test_database_connection,
    create_cors_layer,
    auth_middleware,
    AuthState,
    TopemsError,
    Result,
    ApiResponse,
};

#[derive(Clone)]
struct AppState {
    pool: sqlx::PgPool,
    config: Config,
}

#[tokio::main]
async fn main() -&gt; Result&lt;()&gt; {
    dotenv::dotenv().ok();

    // 1. 初始化日志
    init_logging("topems-lims");

    // 2. 加载配置
    let config = Config::load().await?;

    // 3. 数据库连接
    let pool = create_database_pool(&amp;config.get_database().await).await?;
    test_database_connection(&amp;pool).await?;

    // 4. 应用状态
    let state = AppState { pool, config };

    // 5. 认证和 CORS
    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

    // 6. 路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/samples", get(list_samples).post(create_sample))
        .route("/api/samples/:id", get(get_sample).put(update_sample).delete(delete_sample))
        .with_state(state)
        .layer(axum::middleware::from_fn_with_state(auth_state, auth_middleware))
        .layer(cors);

    // 7. 启动服务
    let port = state.config.get_server().await.port;
    tracing::info!("LIMS service starting on port: {}", port);

    let listener = tokio::net::TcpListener::bind(&amp;format!("0.0.0.0:{}", port)).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -&gt; Json&lt;ApiResponse&lt;&amp;'static str&gt;&gt; {
    Json(ApiResponse::success("healthy", "LIMS service is running"))
}

// 其余路由处理器...
```

---

## 环境配置参考

### 完整的 .env 示例

```env
# 应用环境
APP_ENV=development

# 数据库配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
DB_HOST=localhost
DB_PORT=5432
DB_NAME=topems
DB_USER=topems
DB_PASSWORD=topems_secret
DB_POOL_MAX_SIZE=10
DB_POOL_MIN_SIZE=2
DB_CONNECT_TIMEOUT=10
DB_IDLE_TIMEOUT=300

# JWT 认证配置
JWT_SECRET=topems-jwt-secret
JWT_REFRESH_SECRET=topems-refresh-secret
JWT_EXPIRY_HOURS=24
JWT_REFRESH_EXPIRY_DAYS=7

# 服务配置
SERVER_HOST=localhost
SERVER_PORT=8006
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_CREDENTIALS=true

# Redis 配置（可选）
REDIS_URL=redis://localhost:6379

# 日志配置
RUST_LOG=info
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_FILE_ENABLED=false
LOG_FILE_PATH=./logs/lims.log

# 文件上传配置
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE=104857600
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip,rar,txt,md
```

---

## 下一步

1. 逐个服务进行重构，使用共享库模块
2. 添加完整的单元测试
3. 集成 OpenAPI 文档
4. 添加性能监控

