
# TOPEMS 共享库使用指南

## 概述

TOPEMS 共享库 (`shared/lib`) 提供了一组统一的工具和模块，用于所有 TOPEMS 后端服务。本文档介绍了如何使用这些模块。

> **注意**: 项目已采用 Cargo Workspace 架构，所有服务共享统一的依赖版本管理。

---

## 目录

1. [快速开始](#快速开始)
2. [Workspace 架构](#workspace-架构)
3. [配置管理](#配置管理)
4. [日志系统](#日志系统)
5. [数据库连接](#数据库连接)
6. [错误处理](#错误处理)
7. [认证授权](#认证授权)
8. [API 响应](#api-响应)
9. [缓存模块](#缓存模块)
10. [验证模块](#验证模块)
11. [监控模块](#监控模块)

---

## 快速开始

### 添加依赖

在服务的 `Cargo.toml` 中添加（使用 workspace 依赖）：

```toml
[dependencies]
topems-shared.workspace = true
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

## Workspace 架构

### Cargo Workspace 配置

项目根目录的 `Cargo.toml` 定义了 workspace：

```toml
[workspace]
members = [
    "shared/lib",
    "services/topems-iam/backend",
    "services/topems-hrm/backend",
    "services/topems-erp/backend",
    # ... 其他服务
]

[workspace.dependencies]
# 统一的依赖版本
axum = "0.8"
sqlx = { version = "0.8", features = ["runtime-tokio-native-tls", "postgres", "chrono", "uuid"] }
# ...
```

### 增量编译

修改 `topems-shared` 后，只会影响依赖它的服务，实现增量编译。

---

## 错误处理

### TopemsError 类型

`TopemsError` 是统一的错误类型，支持 `IntoResponse`：

```rust
use topems_shared::{TopemsError, Result, error::TopemsError as Error};

pub enum TopemsError {
    // 数据库错误
    DatabaseConnection(String),
    DatabaseQuery(String),
    DatabaseTransaction(String),

    // 认证错误
    AuthenticationFailed(String),
    InvalidToken,
    PermissionDenied { required: String },
    Unauthorized,

    // 业务错误
    ValidationFailed(String),
    ResourceNotFound(String),
    ResourceAlreadyExists(String),
    OperationNotAllowed(String),

    // 其他
    Internal(String),
    // ... 更多变体
}
```

### 服务错误转换

各服务可以定义自己的错误类型，并通过 `From` 实现转换：

```rust
use topems_shared::error::TopemsError;

impl From<MyServiceError> for TopemsError {
    fn from(err: MyServiceError) -> Self {
        match err {
            MyServiceError::NotFound(msg) => TopemsError::ResourceNotFound(msg),
            MyServiceError::Validation(msg) => TopemsError::ValidationFailed(msg),
            // ...
        }
    }
}
```

---

## 缓存模块

### InMemoryCache

```rust
use topems_shared::cache::InMemoryCache;

let cache = InMemoryCache::<String>::new(Duration::from_secs(300));
cache.set("key".to_string(), "value".to_string());
let value = cache.get("key");
```

### CacheManager

```rust
use topems_shared::cache::CacheManager;

let manager = CacheManager::new(cache);
manager.get_or_insert("key", || async { "computed".to_string() }).await?;
```

---

## 验证模块

### Validator

```rust
use topems_shared::validation::{Validator, ValidationResult};

let validator = Validator::new();
let result = validator.validate_field("email", "test@example.com", |v| {
    if v.contains('@') { Ok(()) } else { Err("Invalid email") }
});
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

## 监控模块

### MonitoringState

`MonitoringState` 提供请求监控和服务健康状态管理：

```rust
use topems_shared::monitoring::{MonitoringState, ServiceHealth, ServiceStatus};

// 创建监控状态
let state = MonitoringState::new();

// 记录请求
state.record_request(true, 50).await;  // 成功请求，响应时间 50ms
state.record_request(false, 100).await; // 失败请求，响应时间 100ms

// 获取监控指标
let metrics = state.get_metrics().await;
println!("Total: {}, Success: {}, Failed: {}",
    metrics.requests_total,
    metrics.requests_success,
    metrics.requests_failed
);

// 更新服务健康状态
state.update_service_health(
    "my-service".to_string(),
    ServiceHealth {
        service_name: "my-service".to_string(),
        status: ServiceStatus::Healthy,
        response_time_ms: 45,
        last_check: Utc::now(),
        message: Some("All systems operational".to_string()),
        details: Default::default(),
    }
).await;
```

### 告警管理

```rust
use topems_shared::monitoring::{AlertRule, AlertCondition, AlertSeverity};

// 创建告警规则
let rule = AlertRule {
    name: "high_error_rate".to_string(),
    condition: AlertCondition {
        metric: "error_rate".to_string(),
        operator: ">".to_string(),
        threshold: 5.0,
    },
    severity: AlertSeverity::Critical,
    cooldown_seconds: 300,
    enabled: true,
};

// 创建告警
let alert = state.create_alert(&rule, "Error rate exceeded threshold".to_string()).await;

// 获取活跃告警
let active_alerts = state.get_active_alerts().await;

// 确认告警
state.acknowledge_alert(&alert.id).await;

// 解决告警
state.resolve_alert(&alert.id).await;
```

---

## 更多资源

- [服务优化指南](./SERVICE_OPTIMIZATION_GUIDE.md)
- [健康检查使用指南](../健康检查组件使用指南.md)
- [架构改进计划](../ARCHITECTURE_IMPROVEMENT_PLAN.md)
