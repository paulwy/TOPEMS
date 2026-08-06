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

use topems_shared::init_telemetry;
use topems_shared::{
    create_cors_layer, AuditLoggerConfig, AuditLoggerMiddleware, AuthState, BodyLimitConfig,
    BodyLimitMiddleware, CompressionConfig, CompressionMiddleware, FieldEncryptionService,
    KeyManager, SecurityHeadersConfig, SecurityHeadersLayer, SimpleHealthConfig, SystemMetrics,
    TelemetryExt,
};
use utoipa::{Modify, OpenApi};

pub use shared::*;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "IAM", description = "身份与访问管理 - 用户、角色、权限管理"),
        (name = "IAM-Auth", description = "认证接口 - 登录、注册、Token刷新"),
        (name = "IAM-Role", description = "角色管理 - 角色CRUD"),
        (name = "IAM-Permission", description = "权限管理 - 权限验证、权限查询"),
        (name = "IAM-Position", description = "岗位管理 - 岗位CRUD、用户岗位关联"),
        (name = "Flow", description = "工作流 - 流程定义、实例、任务管理"),
        (name = "Flow-Task", description = "任务管理 - 任务查询、认领、审批"),
        (name = "Flow-Workflow", description = "流程管理 - 流程定义CRUD"),
        (name = "Flow-Instance", description = "实例管理 - 流程实例CRUD"),
        (name = "Flow-Approval", description = "审批管理 - 审批任务处理"),
        (name = "Flow-Template", description = "模板管理 - 流程模板CRUD"),
        (name = "Flow-History", description = "历史记录 - 流程历史查询"),
        (name = "Flow-Monitor", description = "流程监控 - 运行监控、统计分析"),
        (name = "File", description = "文件管理 - 文件上传、下载、共享"),
        (name = "File-Folder", description = "文件夹管理 - 文件夹CRUD"),
        (name = "Communication", description = "通讯服务 - 邮件、通知"),
        (name = "IM", description = "即时消息 - WebSocket实时消息"),
        (name = "Notification", description = "通知服务 - 通知管理"),
        (name = "Master", description = "主数据 - 基础数据管理"),
        (name = "Migration", description = "数据迁移 - 数据同步"),
        (name = "Plugin", description = "插件管理 - 插件注册、运行时管理"),
        (name = "Search", description = "搜索服务 - 全文搜索"),
        (name = "Health", description = "健康检查 - 服务健康状态"),
        (name = "Monitor", description = "监控服务 - 指标、告警"),
        (name = "Tenant", description = "租户管理 - 租户CRUD"),
    ),
    info(
        title = "TOPEMS-unified-core API",
        version = "1.0.0",
        description = "TOPEMS 统一核心服务 API 文档\n\n包含以下核心模块:\n- **IAM**: 用户管理、角色管理、权限验证、认证授权、岗位管理\n- **Flow**: 工作流引擎、任务管理、审批流程、流程监控\n- **File**: 文件上传下载、文件夹管理、权限控制\n- **Doc**: 文档管理、文档模板、文件夹服务\n- **Communication**: 邮件发送、通知服务（已外迁独立服务 8084，此处保留兼容模块）\n- **IM**: 即时消息、WebSocket实时通信（已外迁独立服务 8084，此处保留兼容模块）\n- **Notification**: 通知管理（已外迁独立服务 8084，此处保留兼容模块）\n- **Master**: 主数据管理\n- **Migration**: 数据迁移、数据同步\n- **Plugin**: 插件系统管理\n- **Search**: 全文搜索（已外迁独立服务 8082，此处保留兼容模块）\n- **Monitor**: 监控指标、健康检查、告警\n- **Tenant**: 多租户管理\n\n所有接口路径前缀: `/api/core`\n认证方式: Bearer Token (JWT)",
    ),
    servers(
        (url = "http://localhost:8000", description = "本地开发环境"),
        (url = "https://api.topems.local", description = "测试环境"),
    ),
    security(
        ("BearerAuth" = [])
    )
)]
struct ApiDoc;

impl Modify for ApiDoc {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_with(Default::default);
        components.security_schemes.insert(
            "BearerAuth".to_string(),
            utoipa::openapi::security::SecurityScheme::Http(
                utoipa::openapi::security::HttpBuilder::new()
                    .scheme(utoipa::openapi::security::HttpAuthScheme::Bearer)
                    .bearer_format("JWT")
                    .build(),
            ),
        );
    }
}

// ==================== 主入口 ====================

/// Initialize the optional field-encryption service for sensitive settings.
///
/// The encryption key is read from the first available of these environment
/// variables (in priority order):
/// - `TOPEMS_FIELD_ENCRYPTION_KEY` (documented by the settings module)
/// - `SETTINGS_ENCRYPTION_KEY`
/// - `ENCRYPTION_KEY` (shared with other services such as `hrm`)
///
/// The value may be either a base64-encoded 32-byte key (optionally prefixed
/// with `base64:`) or an arbitrary passphrase that is run through SHA-256 to
/// derive a 32-byte key. When no key is configured the service returns `None`
/// and secrets are stored as plain text for backwards compatibility.
fn init_field_encryption() -> Option<std::sync::Arc<FieldEncryptionService>> {
    let raw_key = [
        "TOPEMS_FIELD_ENCRYPTION_KEY",
        "SETTINGS_ENCRYPTION_KEY",
        "ENCRYPTION_KEY",
    ]
    .iter()
    .map(|name| std::env::var(name).ok())
    .find_map(|v| v.filter(|s| !s.is_empty()));

    let raw_key = match raw_key {
        Some(k) => k,
        None => {
            tracing::warn!(
                "未配置字段加密密钥（TOPEMS_FIELD_ENCRYPTION_KEY / SETTINGS_ENCRYPTION_KEY / ENCRYPTION_KEY），settings 模块敏感字段将以明文存储"
            );
            return None;
        }
    };

    let key_b64 = if let Some(stripped) = raw_key.strip_prefix("base64:") {
        stripped.to_string()
    } else {
        // Treat as a passphrase and derive a 32-byte key via SHA-256.
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(raw_key.as_bytes());
        base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            hasher.finalize(),
        )
    };

    match KeyManager::from_base64_key(&key_b64) {
        Ok(km) => {
            tracing::info!("🔐 字段加密服务已启用（AES-256-GCM），settings 模块敏感字段将加密存储");
            Some(std::sync::Arc::new(FieldEncryptionService::new(km)))
        }
        Err(e) => {
            tracing::warn!("字段加密密钥无效，敏感字段将以明文存储: {}", e);
            None
        }
    }
}

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-unified-core");

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
    // 所有 init_database 均应设计为幂等（CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING）。
    // 现有数据库已有历史数据时，某模块 init 失败不应阻断服务启动，降级为 warn + 继续。
    async fn try_init<F, Fut>(name: &str, f: F)
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<(), sqlx::Error>>,
    {
        match f().await {
            Ok(()) => tracing::info!("init_database {}: ok", name),
            Err(e) => tracing::warn!(
                "init_database {}: skipped due to error (database may already be initialized): {}",
                name,
                e
            ),
        }
    }

    try_init("iam", || modules::iam::init_database(&pool)).await;
    try_init("flow", || modules::flow::init_database(&pool)).await;
    try_init("file", || modules::file::init_database(&pool)).await;
    try_init("tenant", || modules::tenant::init_database(&pool)).await;
    try_init("plugin", || modules::plugin::init_database(&pool)).await;
    try_init("migration", || modules::migration::init_database(&pool)).await;
    try_init("dict", || modules::dict::init_database(&pool)).await;
    try_init("master", || {
        modules::master::handlers::init_mdm_tables(&pool)
    })
    .await;
    try_init("menu", || modules::menu::init_database(&pool)).await;
    try_init("help", || modules::help::init_database(&pool)).await;
    try_init("login_log", || modules::login_log::init_database(&pool)).await;
    try_init("doc", || modules::doc::services::init_database(&pool)).await;

    // 初始化系统基础字典数据（同样降级为 warn，阻断仅当关键依赖缺失）
    if let Err(e) = modules::dict::seed::seed_dict_data(&pool).await {
        tracing::warn!("seed_dict_data skipped: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-unified-core").with_db(pool.clone());
    let ws_state = std::sync::Arc::new(modules::communication::ws::WsState::new(
        std::sync::Arc::new(auth_state.clone()),
    ));
    let http_client = Client::new();

    let rate_limit_config = middleware::rate_limit::RateLimitConfig::default();
    let rate_limit_middleware = std::sync::Arc::new(
        middleware::rate_limit::RateLimitMiddleware::new(rate_limit_config),
    );

    let version_config = middleware::versioning::VersionConfig::default();
    let versioning_middleware = std::sync::Arc::new(
        middleware::versioning::VersionMiddleware::new(version_config),
    );

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

    // Clone pool for background tasks before it is moved into AppState
    let pool_for_heartbeat = pool.clone();

    let metrics = std::sync::Arc::new(SystemMetrics::new());

    let encryption = init_field_encryption();

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
        metrics,
        encryption,
    };

    // Spawn background task to cleanup timeout WebSocket connections
    let ws_state_cleanup = state.ws_state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state_cleanup.cleanup_timeout_connections(90).await;
            if !removed.is_empty() {
                tracing::info!(
                    "WebSocket cleanup: removed {} timeout connections",
                    removed.len()
                );
            }
        }
    });

    // Spawn WebSocket event bridge (Redis -> WebSocket)
    let ws_state_bridge = state.ws_state.clone();
    tokio::spawn(async move {
        let bridge_config = modules::communication::ws_event_bridge::WsEventBridgeConfig::default();
        modules::communication::ws_event_bridge::spawn_event_bridge(ws_state_bridge, bridge_config);
    });

    // Spawn background task to detect stale plugin heartbeats
    {
        let pool_clone = pool_for_heartbeat.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;

                // Mark plugins with stale heartbeats (>90s) as offline
                let result = sqlx::query(
                    r#"
                    UPDATE core.core_plugin_instances
                    SET runtime_status = 'offline'
                    WHERE runtime_status = 'running'
                      AND last_heartbeat IS NOT NULL
                      AND last_heartbeat < NOW() - INTERVAL '90 seconds'
                    "#,
                )
                .execute(&pool_clone)
                .await;

                if let Ok(result) = result {
                    if result.rows_affected() > 0 {
                        tracing::warn!(
                            "[Plugin-Heartbeat] Marked {} plugin(s) as offline due to stale heartbeat",
                            result.rows_affected()
                        );
                    }
                }

                // Also mark plugins that never sent a heartbeat but were registered >2 min ago
                let result = sqlx::query(
                    r#"
                    UPDATE core.core_plugin_instances
                    SET runtime_status = 'offline'
                    WHERE runtime_status = 'running'
                      AND last_heartbeat IS NULL
                      AND created_at < NOW() - INTERVAL '2 minutes'
                    "#,
                )
                .execute(&pool_clone)
                .await;

                if let Ok(result) = result {
                    if result.rows_affected() > 0 {
                        tracing::warn!(
                            "[Plugin-Heartbeat] Marked {} plugin(s) as offline (no heartbeat received)",
                            result.rows_affected()
                        );
                    }
                }
            }
        });
    }

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Build the full application router (public + protected routes with all
    // permission middleware layers). The returned router still needs the
    // outermost layers (telemetry, CORS, prometheus) and the final state.
    let app = routes::create_routes(&state, move || metric_handle.render())
        .with_telemetry()
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(|| async {
                serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                    tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                    "{}".to_string()
                })
            }),
        )
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

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
