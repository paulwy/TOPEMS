//! # TOPEMS Shared Bootstrap
//!
//! 服务启动框架，提供统一的微服务启动模板（V2 三段式），消除各服务 main.rs 中的重复代码。
//!
//! **V66.2 状态**：**28/28 服务 100% 覆盖**（样板 + Batch-1 到 Batch-5 全部完成）。
//!
//! 包含：服务启动配置、应用状态、健康检查路由、数据库连接池初始化、
//! 认证中间件、权限中心、事件订阅、遥测初始化等。
//!
//! ## V2 三段式模板
//!
//! ```rust,ignore
//! // Step 1: 声明 ServiceConfig（单一真相源）
//! let config = ServiceConfig {
//!     name: "topems-xxx",
//!     port: 80xx,
//!     port_env_var: Some("XXX_PORT"),
//!     max_db_connections: 20,
//!     enable_events: true,
//!     enable_rls: true,
//!     enable_request_context: true,
//!     api_prefix: "/api/core/xxx/v1",
//!     legacy_prefixes: &["/api/v1/xxx", "/api/xxx"],
//! };
//! // Step 2: 统一初始化 telemetry / DB / Auth / Events
//! let ctx = bootstrap_service(&config).await?;
//! // Step 3a: 标准服务（80% 场景）→ build_application 装配 auth/rls/rate-limit/CORS/Prometheus
//! let app = build_application(&ctx, &config, public_routes, protected_routes, Some(openapi_json));
//! run(app).await?;
//! ```
//!
//! ## 三种复杂度模式（覆盖全部服务）
//!
//! - **A. 标准模式（10 个服务）**：纯 PgPool + AuthState state，直接用 `build_application`
//!   （feedback / search / ticket / lowcode / communication / billing / master-data / hrm / finance / wms）
//! - **B. stateful + build_application（11 个服务）**：自定义 AppState（cache/tenant_middleware/6+服务客户端），
//!   先把自定义 state 注入 `protected_routes.with_state(app_state)`，再调用 `build_application`
//!   （qms / ehs / pdm / lims / erp / crm / srm / scm / mes / ai / pm / rd + mobile = 13，原统计 11）
//! - **C. Application 重建（5 个服务）**：有 WebSocket/GraphQL/Cookie/自定义全栈中间件/后台任务，
//!   跳过 `build_application`，用 `Application { router, port, name }` + `run(app)` 启动
//!   （analytics / unified-core / integration / gis / portal）
//!
//! ## 公开 API 总览
//!
//! | API | 用途 |
//! |-----|------|
//! | `ServiceConfig` | 单一真相源：名称/端口/env/DB连接/开关/路由前缀 |
//! | `bootstrap_service(config)` | 统一初始化 telemetry + DB + AuthState + EventPublisher + Prometheus |
//! | `ServiceContext` | `bootstrap_service` 返回值：db/auth_state/event_publisher/metrics/permission_center/start_time |
//! | `build_application(ctx, config, public, protected, openapi)` | 自动装配 auth/rls/request-context/rate-limit/CORS/Prometheus/telemetry 中间件 |
//! | `Application { router, port, name }` | Pattern C 用：手动组装 router 后传入 |
//! | `resolve_port(config)` | 从环境变量解析端口，失败用 `config.port` 回退 |
//! | `run(app)` | 绑定 `0.0.0.0:{port}`，`axum::serve` 启动 |
//!
//! **警告**：V1 遗留的 `BootstrapConfig / AppState / ServiceBootstrap` 结构已被 Pattern B/C 取代，
//! 仅保留向后兼容引用。新项目请使用 `ServiceConfig → bootstrap_service → build_application → run` 三段式。

use anyhow::Result;
use axum::{extract::State, routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{Encoder as _, TextEncoder};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use std::time::Instant;

use topems_shared_core::{
    api_version::{create_api_info_router, register_routes_with_legacy_alias},
    config::enhanced::DatabaseConfig,
    cors::create_cors_layer,
    health::{check_http_health, DependencyHealth, HealthStatus, ServiceHealth, SystemMetrics},
    logging::{init_logging, request_context_middleware},
    response::ApiResponse,
};

use topems_shared_db::database::create_database_pool;
use topems_shared_db::rls::rls_middleware;

use topems_shared_auth::auth::{auth_middleware, AuthState};
use topems_shared_auth::permission_center::PermissionCenterClient;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};

use topems_shared_observability::telemetry::{init_telemetry, telemetry_middleware};

use topems_shared_event::event::{EventPublisher, RabbitMqSubscriber};

/// 服务启动配置
#[derive(Debug, Clone)]
pub struct BootstrapConfig {
    /// 服务名称
    pub service_name: &'static str,

    /// 服务版本
    pub service_version: &'static str,

    /// 默认端口
    pub default_port: u16,

    /// 数据库配置
    pub database: DatabaseConfig,

    /// 是否启用认证
    pub enable_auth: bool,

    /// 是否启用 CORS
    pub enable_cors: bool,

    /// 是否启用健康检查
    pub enable_health_check: bool,

    /// 是否启用指标监控
    pub enable_metrics: bool,

    /// V21.0: 是否启用权限中心（默认启用）
    ///
    /// 启动时自动初始化权限元数据缓存，
    /// 并订阅 PermissionMetadataChangedEvent 实时更新。
    pub enable_permission_center: bool,

    /// V21.0: 是否启用事件订阅（默认启用）
    ///
    /// 启动时自动订阅：
    /// - 权限变更事件（PermissionMetadataChangedEvent）
    /// - 缓存失效广播（CacheInvalidatedEvent via Fanout Exchange）
    ///
    /// 需要 RabbitMQ 连接可用，失败不影响服务启动。
    pub enable_event_subscription: bool,
}

impl Default for BootstrapConfig {
    fn default() -> Self {
        Self {
            service_name: "unknown",
            service_version: "0.1.0",
            default_port: 8000,
            database: DatabaseConfig::default(),
            enable_auth: true,
            enable_cors: true,
            enable_health_check: true,
            enable_metrics: true,
            enable_permission_center: true,
            enable_event_subscription: true,
        }
    }
}

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    /// 数据库连接池
    pub db: sqlx::PgPool,

    /// 认证状态
    pub auth_state: AuthState,

    /// 系统指标
    pub metrics: Arc<SystemMetrics>,

    /// 启动时间
    pub start_time: Instant,

    /// 服务配置
    pub config: BootstrapConfig,
}

impl AppState {
    pub fn new(
        db: sqlx::PgPool,
        auth_state: AuthState,
        metrics: Arc<SystemMetrics>,
        start_time: Instant,
        config: BootstrapConfig,
    ) -> Self {
        Self {
            db,
            auth_state,
            metrics,
            start_time,
            config,
        }
    }
}

/// 服务启动器
pub struct ServiceBootstrap {
    config: BootstrapConfig,
    custom_routes: Option<Router>,
    custom_health_checks: Option<Vec<HealthCheckFn>>,
}

/// 健康检查函数类型
pub type HealthCheckFn = fn() -> DependencyHealth;

impl ServiceBootstrap {
    /// 创建新的服务启动器
    pub fn new(config: BootstrapConfig) -> Self {
        Self {
            config,
            custom_routes: None,
            custom_health_checks: None,
        }
    }

    /// 添加自定义路由
    pub fn with_custom_routes(mut self, routes: Router) -> Self {
        self.custom_routes = Some(routes);
        self
    }

    /// 添加自定义健康检查
    pub fn with_custom_health_checks(mut self, checks: Vec<HealthCheckFn>) -> Self {
        self.custom_health_checks = Some(checks);
        self
    }

    /// 启动服务
    pub async fn bootstrap(self) -> Result<()> {
        dotenv::dotenv().ok();

        init_logging(self.config.service_name);

        tracing::info!("🚀 {} 服务启动中...", self.config.service_name);
        tracing::info!("📦 版本: {}", self.config.service_version);

        let db = self.create_database_pool().await?;
        tracing::info!("✅ 数据库连接成功");

        if self.config.enable_permission_center {
            let permission_client = PermissionCenterClient::new(self.config.service_name);
            if let Err(e) = permission_client.initialize().await {
                tracing::warn!("⚠️  权限元数据缓存初始化失败（不影响启动）: {:?}", e);
            } else {
                tracing::info!("✅ 权限元数据缓存已初始化");

                if self.config.enable_event_subscription {
                    match RabbitMqSubscriber::new(self.config.service_name).await {
                        Ok(subscriber) => {
                            if let Err(e) = permission_client
                                .start_event_subscription(&subscriber)
                                .await
                            {
                                tracing::warn!("⚠️  权限变更事件订阅启动失败: {:?}", e);
                            } else {
                                tracing::info!("✅ 权限变更事件订阅已启动");

                                if let Err(e) = subscriber
                                    .subscribe_cache_invalidation(|payload| {
                                        tracing::info!(
                                            "🔄 收到缓存失效广播: pattern={}, level={}",
                                            payload.cache_key_pattern,
                                            payload.invalidation_level
                                        );
                                        Ok(())
                                    })
                                    .await
                                {
                                    tracing::warn!("⚠️  缓存失效广播订阅失败: {:?}", e);
                                }
                            }
                        }
                        Err(e) => {
                            tracing::warn!("⚠️  RabbitMQ 连接失败，跳过事件订阅: {:?}", e);
                        }
                    }
                }
            }
        }

        let start_time = Instant::now();
        let metrics = Arc::new(SystemMetrics::new());
        let auth_state = AuthState::from_env();

        let app_state = AppState::new(
            db.clone(),
            auth_state,
            metrics.clone(),
            start_time,
            self.config.clone(),
        );

        let app = self.build_router(app_state.clone());

        let port = env::var("SERVER_PORT")
            .or_else(|_| env::var("PORT"))
            .unwrap_or_else(|_| self.config.default_port.to_string());
        let addr = format!("0.0.0.0:{}", port);

        tracing::info!("🌐 服务地址: {}", addr);
        tracing::info!(
            "🔒 认证保护: {}",
            if self.config.enable_auth {
                "已启用"
            } else {
                "未启用"
            }
        );

        let listener = tokio::net::TcpListener::bind(&addr).await?;
        axum::serve(listener, app).await?;

        Ok(())
    }

    /// 创建数据库连接池
    async fn create_database_pool(&self) -> Result<sqlx::PgPool> {
        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| self.config.database.url.clone());

        let max_connections = env::var("DB_MAX_CONNECTIONS")
            .unwrap_or_else(|_| self.config.database.max_connections.to_string())
            .parse::<u32>()
            .unwrap_or(self.config.database.max_connections);

        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .connect(&database_url)
            .await?;

        Ok(pool)
    }

    /// 构建路由
    fn build_router(&self, state: AppState) -> Router {
        let mut router = Router::new();

        if self.config.enable_health_check {
            let health_router = self.create_health_router(state.clone());
            router = router.merge(health_router);
        }

        router = router.merge(create_api_info_router(self.config.service_name));

        if let Some(custom_routes) = self.custom_routes.clone() {
            let mut stateful_router = Router::new().with_state(state.clone());
            stateful_router = stateful_router.merge(custom_routes);

            if self.config.enable_auth {
                let protected_routes = stateful_router.layer(axum::middleware::from_fn_with_state(
                    state.auth_state.clone(),
                    auth_middleware,
                ));
                router = router.merge(protected_routes);
            } else {
                router = router.merge(stateful_router);
            }
        }

        if self.config.enable_cors {
            router = router.layer(create_cors_layer());
        }

        router
    }

    /// 创建健康检查路由
    fn create_health_router(&self, state: AppState) -> Router {
        Router::new()
            .route("/health", get(health_check))
            .route("/api/health/detailed", get(health_check_detailed))
            .route("/api/metrics", get(get_metrics))
            .with_state(state)
    }
}

/// 基础健康检查
async fn health_check(State(state): State<AppState>) -> axum::Json<ApiResponse<ServiceHealth>> {
    let db_health = check_database_health(&state.db).await;

    let status = if db_health.status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let health = ServiceHealth {
        service_name: state.config.service_name.to_string(),
        status,
        message: format!("{} 服务运行正常", state.config.service_name),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(state.metrics.get_uptime()),
        dependencies: Some(vec![db_health]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    axum::Json(ApiResponse::success(health, "服务运行正常"))
}

/// 详细健康检查
async fn health_check_detailed(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceHealth>> {
    let db_health = check_database_health(&state.db).await;

    let status = if db_health.status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let health = ServiceHealth {
        service_name: state.config.service_name.to_string(),
        status,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(state.metrics.get_uptime()),
        dependencies: Some(vec![db_health]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    axum::Json(ApiResponse::success(health, "健康检查完成"))
}

/// 获取系统指标
async fn get_metrics(State(state): State<AppState>) -> axum::Json<ApiResponse<MetricsResponse>> {
    let metrics = state.metrics.as_ref();
    let response = MetricsResponse {
        uptime: metrics.get_uptime(),
        request_count: metrics.get_request_count(),
        error_count: metrics.get_error_count(),
        active_connections: metrics.get_active_connections(),
    };
    axum::Json(ApiResponse::success(response, "系统指标"))
}

/// 指标响应结构
#[derive(Debug, Clone, serde::Serialize)]
struct MetricsResponse {
    pub uptime: String,
    pub request_count: u64,
    pub error_count: u64,
    pub active_connections: u64,
}

/// 检查数据库健康状态
pub async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1").execute(pool).await {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

/// 快速启动服务（简化版本）
pub async fn quick_bootstrap(
    service_name: &'static str,
    default_port: u16,
    routes: Router,
) -> Result<()> {
    let config = BootstrapConfig {
        service_name,
        default_port,
        ..Default::default()
    };

    ServiceBootstrap::new(config)
        .with_custom_routes(routes)
        .bootstrap()
        .await
}

/// 快速启动服务（带数据库）
pub async fn quick_bootstrap_with_db(
    service_name: &'static str,
    default_port: u16,
    routes: Router,
    db_url: Option<&str>,
) -> Result<()> {
    let database_url = db_url.map(|s| s.to_string()).unwrap_or_else(|| {
        env::var("DATABASE_URL").expect("DATABASE_URL environment variable is required")
    });

    let config = BootstrapConfig {
        service_name,
        default_port,
        database: DatabaseConfig {
            url: database_url,
            max_connections: 10,
            min_connections: Some(3),
            connect_timeout: Some(30),
            idle_timeout: Some(300),
            max_lifetime: Some(1800),
            test_interval: Some(60),
            enable_connection_reuse: Some(true),
        },
        ..Default::default()
    };

    ServiceBootstrap::new(config)
        .with_custom_routes(routes)
        .bootstrap()
        .await
}

// =============================================================================
// V2: 统一微服务启动模板
// =============================================================================

/// 服务配置（V2 统一模板）
#[derive(Debug, Clone)]
pub struct ServiceConfig {
    /// 服务名称，如 "topems-erp"
    pub name: &'static str,
    /// 默认端口
    pub port: u16,
    /// 服务专属端口环境变量名，如 "ERP_PORT"
    pub port_env_var: Option<&'static str>,
    /// 数据库最大连接数
    pub max_db_connections: u32,
    /// 是否启用事件发布
    pub enable_events: bool,
    /// 是否启用 RLS 中间件
    pub enable_rls: bool,
    /// 是否启用 request_context 中间件
    pub enable_request_context: bool,
    /// API 前缀，如 "/api/erp"
    pub api_prefix: &'static str,
    /// 旧版 API 前缀列表，如 &["/api/v1/erp"]
    pub legacy_prefixes: &'static [&'static str],
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            name: "unknown",
            port: 8000,
            port_env_var: None,
            max_db_connections: 20,
            enable_events: false,
            enable_rls: true,
            enable_request_context: true,
            api_prefix: "",
            legacy_prefixes: &[],
        }
    }
}

/// 服务启动后共享的通用资源
pub struct ServiceContext {
    /// 数据库连接池
    pub db: sqlx::PgPool,
    /// 认证状态
    pub auth_state: AuthState,
    /// 系统指标
    pub metrics: Arc<SystemMetrics>,
    /// 事件发布器（如果启用）
    pub event_publisher: Option<Arc<EventPublisher>>,
    /// 启动时间
    pub start_time: Instant,
}

/// 组装完毕、可运行的应用
pub struct Application {
    /// 最终路由
    pub router: Router,
    /// 监听端口
    pub port: u16,
    /// 服务名称
    pub name: &'static str,
}

/// 初始化通用资源：telemetry、数据库连接池、metrics、auth_state、event_publisher
pub async fn bootstrap_service(config: &ServiceConfig) -> Result<ServiceContext> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry(config.name);

    tracing::info!("🚀 {} 服务启动中...", config.name);

    let db_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;

    let db_config = DatabaseConfig {
        url: db_url,
        max_connections: config.max_db_connections,
        ..Default::default()
    };

    let db = create_database_pool(&db_config).await?;

    let metrics = Arc::new(SystemMetrics::new());
    let auth_state = AuthState::from_env();
    let start_time = Instant::now();

    let event_publisher = if config.enable_events {
        match EventPublisher::new(config.name) {
            Ok(publisher) => {
                tracing::info!("📢 事件发布服务初始化成功");
                Some(Arc::new(publisher))
            }
            Err(e) => {
                tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
                None
            }
        }
    } else {
        None
    };

    Ok(ServiceContext {
        db,
        auth_state,
        metrics,
        event_publisher,
        start_time,
    })
}

/// 组装最终的应用路由：rate_limit + auth + rls 中间件、CORS、Prometheus、telemetry 层
pub fn build_application(
    ctx: &ServiceContext,
    config: &ServiceConfig,
    public_routes: Router,
    protected_routes: Router,
    openapi_json: Option<String>,
) -> Application {
    let cors = create_cors_layer();
    let (prometheus_layer, _metric_handle) = PrometheusMetricLayer::pair();

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    let mut protected = protected_routes.layer(axum::middleware::from_fn_with_state(
        ctx.auth_state.clone(),
        auth_middleware,
    ));

    if config.enable_rls {
        protected = protected.layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            rls_middleware,
        ));
    }

    protected = protected.layer(rate_limit_layer);

    let mut app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        config.api_prefix,
        config.legacy_prefixes,
        protected,
    )
    .merge(create_api_info_router(config.name));

    if let Some(json) = openapi_json {
        app = app.route("/api-docs/openapi.json", get(move || async move { json }));
    }

    app = app.layer(axum::middleware::from_fn(telemetry_middleware));

    if config.enable_request_context {
        app = app.layer(axum::middleware::from_fn(request_context_middleware));
    }

    app = app.layer(prometheus_layer).layer(cors);

    let port = resolve_port(config);

    Application {
        router: app,
        port,
        name: config.name,
    }
}

/// 启动 HTTP 服务
pub async fn run(app: Application) -> Result<()> {
    let addr = format!("0.0.0.0:{}", app.port);
    tracing::info!("🌐 {} 服务地址: {}", app.name, addr);
    tracing::info!("🔒 认证保护已启用");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.router).await?;
    Ok(())
}

/// 从环境变量解析端口
pub fn resolve_port(config: &ServiceConfig) -> u16 {
    if let Some(var) = config.port_env_var {
        if let Ok(val) = env::var(var) {
            if let Ok(port) = val.parse::<u16>() {
                return port;
            }
        }
    }
    for var in &["SERVER_PORT", "PORT"] {
        if let Ok(val) = env::var(var) {
            if let Ok(port) = val.parse::<u16>() {
                return port;
            }
        }
    }
    config.port
}

// ==================== 健康检查辅助函数 ====================

/// 检查 IAM 服务健康状态
pub async fn check_iam_health() -> DependencyHealth {
    let iam_url =
        env::var("IAM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

/// Prometheus 指标导出端点
pub async fn prometheus_metrics_handler() -> String {
    let encoder = TextEncoder::new();
    let metrics = prometheus::gather();
    let mut buffer = Vec::new();
    match encoder.encode(&metrics, &mut buffer) {
        Ok(()) => String::from_utf8(buffer)
            .unwrap_or_else(|_| "Error: invalid UTF-8 in metrics".to_string()),
        Err(e) => format!("Error encoding metrics: {}", e),
    }
}

/// 标准服务指标响应
#[derive(Debug, Clone, serde::Serialize)]
pub struct ServiceMetricsResponse {
    pub service_name: String,
    pub uptime_seconds: u64,
    pub uptime_formatted: String,
    pub request_count: u64,
    pub error_count: u64,
    pub active_connections: u64,
    pub database_pool_size: u32,
    pub database_pool_idle: usize,
}

/// 从 ServiceContext 创建 AppState（用于标准健康检查路由）
pub fn create_health_state(ctx: &ServiceContext, config: &ServiceConfig) -> AppState {
    AppState::new(
        ctx.db.clone(),
        ctx.auth_state.clone(),
        ctx.metrics.clone(),
        ctx.start_time,
        BootstrapConfig {
            service_name: config.name,
            default_port: config.port,
            ..Default::default()
        },
    )
}

/// 创建标准健康检查路由（使用 AppState）
pub fn create_standard_health_routes(state: AppState) -> Router {
    Router::new()
        .route("/health", get(standard_health_check))
        .route("/api/health/detailed", get(standard_health_check_detailed))
        .route("/api/metrics", get(standard_get_metrics))
        .route("/metrics", get(prometheus_metrics_handler))
        .with_state(state)
}

/// 标准健康检查（返回简短状态字符串）
pub async fn standard_health_check(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.db).await;
    let iam_health = check_iam_health().await;

    let overall_status = if database_health.status == HealthStatus::Healthy
        && iam_health.status == HealthStatus::Healthy
    {
        HealthStatus::Healthy
    } else if database_health.status == HealthStatus::Unhealthy
        || iam_health.status == HealthStatus::Unhealthy
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    axum::Json(ApiResponse::success(status_str, "健康检查"))
}

/// 标准详细健康检查
pub async fn standard_health_check_detailed(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.db).await,
        check_iam_health().await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health = ServiceHealth::healthy_with_message(state.config.service_name, message)
        .with_uptime(&state.metrics.get_uptime())
        .with_dependencies(dependencies);

    axum::Json(ApiResponse::success(health, "详细健康检查"))
}

/// 标准服务指标
pub async fn standard_get_metrics(
    State(state): State<AppState>,
) -> axum::Json<ApiResponse<ServiceMetricsResponse>> {
    let metrics = ServiceMetricsResponse {
        service_name: state.config.service_name.to_string(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        uptime_formatted: state.metrics.get_uptime(),
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_size: state.db.size(),
        database_pool_idle: state.db.num_idle(),
    };

    axum::Json(ApiResponse::success(metrics, "服务指标"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bootstrap_config_default() {
        let config = BootstrapConfig::default();
        assert_eq!(config.service_name, "unknown");
        assert_eq!(config.default_port, 8000);
        assert!(config.enable_auth);
    }

    #[test]
    fn test_bootstrap_config_custom() {
        let config = BootstrapConfig {
            service_name: "test-service",
            default_port: 9000,
            ..Default::default()
        };
        assert_eq!(config.service_name, "test-service");
        assert_eq!(config.default_port, 9000);
    }
}
