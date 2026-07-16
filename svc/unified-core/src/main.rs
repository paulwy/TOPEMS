//! TOPEMS Unified Core Platform
//!
//! Unified service for: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync
//!
//! This is the core platform that must be included in any TOPEMS product.

#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::redundant_closure)]
#![allow(dead_code)]

mod handlers;
mod routes;
mod shared;

pub mod middleware;
pub mod modules;

use std::net::SocketAddr;

use axum_prometheus::PrometheusMetricLayer;
use reqwest::Client;
use sqlx::PgPool;

use topems_shared::init_service_telemetry;
use topems_shared::{
    create_cors_layer, wrap_group1_router, AuditLoggerConfig, AuditLoggerMiddleware, AuthState,
    BodyLimitConfig, BodyLimitMiddleware, CompressionConfig, CompressionMiddleware,
    Group1CompatConfig, SecurityHeadersConfig, SecurityHeadersLayer, SimpleHealthConfig,
    TelemetryExt,
};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub ws_state: std::sync::Arc<modules::communication::ws::WsState>,
    pub http_client: Client,
    pub rate_limit_middleware: std::sync::Arc<middleware::rate_limit::RateLimitMiddleware>,
    pub versioning_middleware: std::sync::Arc<middleware::versioning::VersionMiddleware>,
    pub security_headers_layer: std::sync::Arc<SecurityHeadersLayer>,
    pub compression_middleware: std::sync::Arc<CompressionMiddleware>,
    pub body_limit_middleware: std::sync::Arc<BodyLimitMiddleware>,
    pub audit_logger_middleware: std::sync::Arc<AuditLoggerMiddleware>,
    pub input_validation_config: middleware::input_validation::InputValidationConfig,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<modules::communication::ws::WsState> {
    fn from_ref(state: &AppState) -> Self {
        state.ws_state.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<middleware::rate_limit::RateLimitMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.rate_limit_middleware.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<SecurityHeadersLayer> {
    fn from_ref(state: &AppState) -> Self {
        state.security_headers_layer.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<CompressionMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.compression_middleware.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<BodyLimitMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.body_limit_middleware.clone()
    }
}

impl axum::extract::FromRef<AppState> for middleware::input_validation::InputValidationConfig {
    fn from_ref(state: &AppState) -> Self {
        state.input_validation_config.clone()
    }
}

impl axum::extract::FromRef<AppState> for std::sync::Arc<AuditLoggerMiddleware> {
    fn from_ref(state: &AppState) -> Self {
        state.audit_logger_middleware.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_service_telemetry!("topems-unified-core");

    tracing::info!("🚀 TOPEMS Unified Core Platform starting...");
    tracing::info!(
        "📦 Contains: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync"
    );

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    // Initialize databases for all modules
    modules::iam::init_database(&pool)
        .await
        .expect("Failed to init iam database");
    modules::flow::init_database(&pool)
        .await
        .expect("Failed to init flow database");
    modules::file::init_database(&pool)
        .await
        .expect("Failed to init file database");
    modules::communication::init_database(&pool)
        .await
        .expect("Failed to init communication database");
    modules::tenant::init_database(&pool)
        .await
        .expect("Failed to init tenant database");
    modules::billing::init_database(&pool)
        .await
        .expect("Failed to init billing database");
    modules::plugin::init_database(&pool)
        .await
        .expect("Failed to init plugin database");
    modules::migration::init_database(&pool)
        .await
        .expect("Failed to init migration database");
    modules::dict::init_database(&pool)
        .await
        .expect("Failed to init dict database");
    modules::menu::init_database(&pool)
        .await
        .expect("Failed to init menu database");
    modules::erp::init_database(&pool)
        .await
        .expect("Failed to init erp database");
    modules::hrm::init_database(&pool)
        .await
        .expect("Failed to init hrm database");
    modules::crm::init_database(&pool)
        .await
        .expect("Failed to init crm database");
    modules::wms::init_database(&pool)
        .await
        .expect("Failed to init wms database");

    modules::finance::init_database(&pool)
        .await
        .expect("Failed to init finance database");

    modules::help::init_database(&pool)
        .await
        .expect("Failed to init help database");
    modules::sync::init_database(&pool)
        .await
        .expect("Failed to init sync database");
    modules::login_log::init_database(&pool)
        .await
        .expect("Failed to init login_log database");
    modules::search::init_database(&pool)
        .await
        .expect("Failed to init search database");

    // 初始化系统基础字典数据
    modules::dict::seed::seed_dict_data(&pool)
        .await
        .expect("Failed to seed dict data");

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-unified-core").with_db(pool.clone());
    let ws_state = std::sync::Arc::new(modules::communication::ws::WsState::new());
    let http_client = Client::new();

    let rate_limit_config = middleware::rate_limit::RateLimitConfig::default();
    let rate_limit_middleware = std::sync::Arc::new(middleware::rate_limit::RateLimitMiddleware::new(rate_limit_config));

    let version_config = middleware::versioning::VersionConfig::default();
    let versioning_middleware = std::sync::Arc::new(middleware::versioning::VersionMiddleware::new(version_config));

    let security_headers_config = SecurityHeadersConfig::default();
    let security_headers_layer =
        std::sync::Arc::new(SecurityHeadersLayer::new(security_headers_config));

    let compression_config = CompressionConfig::default();
    let compression_middleware =
        std::sync::Arc::new(CompressionMiddleware::new(compression_config));

    let body_limit_config = BodyLimitConfig::default();
    let body_limit_mw = std::sync::Arc::new(BodyLimitMiddleware::new(body_limit_config));

    let audit_logger_config = AuditLoggerConfig::default()
        .add_skip_path("/api/core/health")
        .add_skip_path("/api/core/help");
    let audit_logger_mw = std::sync::Arc::new(AuditLoggerMiddleware::new(
        audit_logger_config,
        pool.clone(),
    ));

    let input_validation_config = middleware::input_validation::InputValidationConfig::default()
        .add_skip_path("/health")
        .add_skip_path("/api")
        .add_skip_path("/api/info")
        .add_skip_path("/api/core/health");

    let state = AppState {
        auth_state,
        pool,
        health_config,
        ws_state: ws_state.clone(),
        http_client,
        rate_limit_middleware,
        versioning_middleware,
        security_headers_layer,
        compression_middleware,
        body_limit_middleware: body_limit_mw,
        audit_logger_middleware: audit_logger_mw,
        input_validation_config,
    };

    // Spawn background task to cleanup timeout WebSocket connections
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state.cleanup_timeout_connections(90).await;
            if !removed.is_empty() {
                tracing::info!(
                    "WebSocket cleanup: removed {} timeout connections",
                    removed.len()
                );
            }
        }
    });

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Build the full application router (public + protected routes with all
    // permission middleware layers). The returned router still needs the
    // outermost layers (telemetry, CORS, prometheus) and the final state.
    let app = routes::create_routes(&state, move || metric_handle.render())
        .with_telemetry()
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let group1_cfg = Group1CompatConfig {
        modules: &[
            "iam",
            "flow",
            "file",
            "mail",
            "im",
            "notification",
            "master",
            "migration",
            "comm",
            "plugin",
            "dict",
            "tenant",
            "billing",
            "sync",
            "help",
            "menu",
            "login_log",
            "erp",
            "hrm",
            "crm",
            "wms",
            "finance",
        ],
        shortcuts: &[
            ("auth", "iam", "auth"),
            ("users", "iam", "users"),
            ("roles", "iam", "roles"),
            ("permissions", "iam", "permissions"),
            ("logout", "iam", "auth/logout"),
            ("sessions", "iam", "auth/sessions"),
            ("security-settings", "iam", "security-settings"),
            ("password-policy", "iam", "password-policy"),
            ("reset-password", "iam", "auth/reset-password"),
            ("forgot-password", "iam", "auth/forgot-password"),
            ("set-new-password", "iam", "auth/set-new-password"),
            ("health", "iam", "health"),
        ],
    };
    let app = wrap_group1_router(app, group1_cfg);

    let port = std::env::var("CORE_PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .unwrap_or(8000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Unified Core Platform is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/core/*");

    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app.into_make_service()).await {
        tracing::error!("Server error: {}", e);
    }
}
