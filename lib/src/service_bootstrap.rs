// 服务启动框架 - 消除各服务 main.rs 中的重复代码
// =============================================================================

use anyhow::Result;
use axum::{extract::State, routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use std::time::Instant;

use crate::{
    auth_middleware, config::enhanced::DatabaseConfig, create_api_info_router, create_cors_layer,
    init_logging, ApiResponse, AuthState, DependencyHealth, HealthStatus, ServiceHealth,
    SystemMetrics,
};

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
    pub auth_state: Arc<AuthState>,

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
        auth_state: Arc<AuthState>,
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
        // 加载环境变量
        dotenv::dotenv().ok();

        // 初始化日志
        init_logging(self.config.service_name);

        tracing::info!("🚀 {} 服务启动中...", self.config.service_name);
        tracing::info!("📦 版本: {}", self.config.service_version);

        // 创建数据库连接池
        let db = self.create_database_pool().await?;
        tracing::info!("✅ 数据库连接成功");

        // V21.0: 初始化权限中心客户端
        if self.config.enable_permission_center {
            let permission_client =
                crate::permission_center::PermissionCenterClient::new(self.config.service_name);
            if let Err(e) = permission_client.initialize().await {
                tracing::warn!("⚠️  权限元数据缓存初始化失败（不影响启动）: {:?}", e);
            } else {
                tracing::info!("✅ 权限元数据缓存已初始化");

                // 启动权限变更事件订阅（非阻塞，失败不影响启动）
                if self.config.enable_event_subscription {
                    match crate::event::RabbitMqSubscriber::new(self.config.service_name).await {
                        Ok(subscriber) => {
                            if let Err(e) = permission_client
                                .start_event_subscription(&subscriber)
                                .await
                            {
                                tracing::warn!("⚠️  权限变更事件订阅启动失败: {:?}", e);
                            } else {
                                tracing::info!("✅ 权限变更事件订阅已启动");

                                // 同时订阅缓存失效广播
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

        // 创建应用状态
        let start_time = Instant::now();
        let metrics = Arc::new(SystemMetrics::new());
        let auth_state = Arc::new(AuthState::from_env());

        let app_state = AppState::new(
            db.clone(),
            auth_state,
            metrics.clone(),
            start_time,
            self.config.clone(),
        );

        // 创建路由
        let app = self.build_router(app_state.clone());

        // 获取端口
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

        // 启动服务器
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

        // 添加健康检查路由
        if self.config.enable_health_check {
            let health_router = self.create_health_router(state.clone());
            router = router.merge(health_router);
        }

        // 添加 API 信息路由
        router = router.merge(create_api_info_router(self.config.service_name));

        // 添加自定义路由
        if let Some(custom_routes) = self.custom_routes.clone() {
            // 创建一个带有状态的新路由，然后合并自定义路由
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

        // 添加 CORS 层
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
async fn health_check(
    axum::extract::State(state): axum::extract::State<AppState>,
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
    axum::extract::State(state): axum::extract::State<AppState>,
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
async fn check_database_health(pool: &sqlx::PgPool) -> DependencyHealth {
    let result = sqlx::query("SELECT 1").fetch_one(pool).await;

    DependencyHealth {
        name: "database".to_string(),
        status: if result.is_ok() {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unhealthy
        },
        message: if result.is_ok() {
            "数据库连接正常".to_string()
        } else {
            "数据库连接失败".to_string()
        },
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
            max_connections: 20,
            min_connections: Some(5),
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
