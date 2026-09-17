//! Unified Core 模块化单体嵌入入口
//!
//! 将 `main.rs` 的启动组装链提取为可复用 `build_router`：
//! - 独立部署：`main.rs` 调用本函数
//! - 模块化单体：`topems-server` 的 `unified_core_real_module`（feature `module-core`）
//!   以同一入口嵌入
//!
//! 与独立部署共享同一份组装逻辑，避免双轨漂移。

use axum::Router;
use std::sync::Arc;
use topems_shared_bootstrap::ServiceConfig;
use topems_shared_event::event::EventPublisher;

use crate::shared::AppState;

/// 构建 Unified Core 业务路由
///
/// - `db`：public schema 连接池
/// - `event_publisher`：事件发布器
/// - `public_routes`：调用方提供的健康/指标等入口路由
pub async fn build_router(
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
) -> anyhow::Result<Router> {
    build_router_inner(db, event_publisher, public_routes, false).await
}

/// 嵌入模式构建：core 业务路由挂根（由 server nest /api/core），跳过 public 冲突路由
pub async fn build_router_embedded(
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
) -> anyhow::Result<Router> {
    build_router_inner(db, event_publisher, public_routes, true).await
}

async fn build_router_inner(
    db: sqlx::PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    public_routes: Router<AppState>,
    embed_mode: bool,
) -> anyhow::Result<Router> {
    // 嵌入模式 search_path：flow 业务表（approvals/approval_records/core_workflow_*）为权威。
    // 模块内固化（不读外部 SEARCH_PATH）：server 各模块 build() 会互相覆盖全局 SEARCH_PATH
    // （如 ticket/master_data set "public"、portal set "public, portal"），若 flow 在它们之后
    // 建池会读到被污染的值，导致无前缀查询误命中 public 影子表（历史 500 根因）。
    std::env::set_var("SEARCH_PATH", "flow, public");

    // 预注册服务间调用/降级指标：避免懒注册导致无流量时 /metrics 缺失指标族
    topems_shared_auth::service::pre_register_service_metrics();

    let config = ServiceConfig {
        name: "topems-unified-core",
        port: 8000,
        port_env_var: Some("CORE_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: false,
        enable_request_context: false,
        api_prefix: "/api/core",
        legacy_prefixes: &[],
        init_telemetry: false, // 嵌入模式不初始化 telemetry（由 server 统一初始化）
    };

    let ctx = topems_shared_bootstrap::bootstrap_service(&config).await?;

    tracing::info!(
        "📦 Contains: IAM + Flow + File + Communication + Tenant + Billing + Plugin + Sync"
    );

    // Initialize databases for all modules
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

    try_init("iam", || crate::modules::iam::init_database(&ctx.db)).await;
    try_init("flow", || crate::modules::flow::init_database(&ctx.db)).await;
    try_init("file", || crate::modules::file::init_database(&ctx.db)).await;
    try_init("tenant", || crate::modules::tenant::init_database(&ctx.db)).await;
    try_init("migration", || crate::modules::migration::init_database(&ctx.db)).await;
    try_init("master", || {
        crate::modules::master::handlers::init_mdm_tables(&ctx.db)
    })
    .await;
    try_init("menu", || crate::modules::menu::init_database(&ctx.db)).await;
    try_init("audit", || crate::modules::audit::init_database(&ctx.db)).await;
    try_init("doc", || crate::modules::doc::services::init_database(&ctx.db)).await;

    // Schema 防御：增量迁移 + 一致性自检
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(&ctx.db).await {
        tracing::error!("[unified-core] Schema 防御检查失败: {:?}", e);
    }

    let health_config = topems_shared_core::health::SimpleHealthConfig::new("topems-unified-core")
        .with_db(ctx.db.clone());
    let ws_state = std::sync::Arc::new(crate::modules::communication::ws::WsState::new(
        std::sync::Arc::new(ctx.auth_state.clone()),
    ));
    let http_client = reqwest::Client::new();

    let rate_limit_config = crate::middleware::rate_limit::RateLimitConfig::default()
        .add_path_rule("/api/core/iam/auth/", 30, 60)
        .add_path_rule("/api/v1/core/iam/auth/", 30, 60);
    let rate_limit_middleware = std::sync::Arc::new(
        crate::middleware::rate_limit::RateLimitMiddleware::new(rate_limit_config),
    );

    let version_config = crate::middleware::versioning::VersionConfig::default();
    let versioning_middleware =
        std::sync::Arc::new(crate::middleware::versioning::VersionMiddleware::new(version_config));

    let security_headers_config =
        topems_shared_auth::security::SecurityHeadersConfig::default();
    let security_headers_layer =
        std::sync::Arc::new(topems_shared_auth::security::SecurityHeadersLayer::new(
            security_headers_config,
        ));

    let compression_config = topems_shared_core::compression::CompressionConfig::default();
    let compression_middleware =
        std::sync::Arc::new(topems_shared_core::compression::CompressionMiddleware::new(
            compression_config,
        ));

    let body_limit_config = topems_shared_auth::security::BodyLimitConfig::default();
    let body_limit_mw =
        std::sync::Arc::new(topems_shared_auth::security::BodyLimitMiddleware::new(
            body_limit_config,
        ));

    let audit_logger_config =
        topems_shared_auth::security::AuditLoggerConfig::default().add_skip_path("/api/core/health");
    let audit_logger_mw = std::sync::Arc::new(
        topems_shared_auth::security::AuditLoggerMiddleware::new(
            audit_logger_config,
            ctx.db.clone(),
        ),
    );

    let input_validation_config =
        crate::middleware::input_validation::InputValidationConfig::default()
            .add_skip_path("/health")
            .add_skip_path("/api")
            .add_skip_path("/api/info")
            .add_skip_path("/api/core/health");

    let pool_for_heartbeat = ctx.db.clone();
    let metrics = std::sync::Arc::new(topems_shared_core::health::SystemMetrics::new());

    // 字段加密服务
    let encryption = init_field_encryption();

    // SSE session manager
    let sse_sessions = std::sync::Arc::new(crate::shared::SseSessionManager::new());

    // Business tool registry
    let service_registry = std::sync::Arc::new(crate::shared::service_client::ServiceRegistry::new());
    let business_tool_registry =
        crate::modules::business_tools::create_default_registry(service_registry.clone())
            .unwrap_or_else(|_| crate::modules::business_tools::BusinessToolRegistry::new());

    // Permission store
    let permission_store = crate::routes::business_tools::permission_store_factory::PermissionStoreFactory::from_env(
        Some(ctx.db.clone()),
    );

    // Audit log store
    let audit_logger: std::sync::Arc<
        dyn crate::routes::business_tools::permission_audit_log::AuditLogStore + Send + Sync,
    > = {
        let store_type =
            std::env::var("AUDIT_LOG_STORE_TYPE").unwrap_or_else(|_| "memory".to_string());
        match store_type.as_str() {
            "database" => {
                tracing::info!("Using database-backed audit log store");
                std::sync::Arc::new(crate::routes::business_tools::database_audit_log_store::DatabaseAuditLogStore::new(ctx.db.clone()))
            }
            _ => {
                tracing::info!("Using in-memory audit log store");
                std::sync::Arc::new(
                    crate::routes::business_tools::permission_audit_log::InMemoryAuditLogStore::new(),
                )
            }
        }
    };

    // Config store
    let config_store = {
        let store = crate::shared::config_store_simple::ConfigStoreService::new(ctx.db.clone());
        if let Err(e) = store.init().await {
            tracing::warn!("Failed to initialize config store: {}", e);
        }
        store
    };

    // Audit log retention policy
    let (audit_retention_policy, retention_manager) = {
        let policy = match config_store.store().get_audit_retention_policy().await {
            Ok(Some(policy)) => policy,
            Ok(None) => {
                let retention_days = std::env::var("AUDIT_RETENTION_DAYS")
                    .ok()
                    .and_then(|v| v.parse::<u32>().ok())
                    .unwrap_or(90);
                crate::routes::business_tools::audit_retention::RetentionPolicy::new(retention_days)
            }
            Err(_) => crate::routes::business_tools::audit_retention::RetentionPolicy::default(),
        };

        let policy_mutex = std::sync::Arc::new(tokio::sync::Mutex::new(policy.clone()));
        let retention_manager = std::sync::Arc::new(
            crate::routes::business_tools::audit_retention::RetentionManager::new(
                policy.clone(),
                audit_logger.clone(),
            ),
        );

        (policy_mutex, retention_manager)
    };

    let state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
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
        feature_flag_service: std::sync::Arc::new(topems_shared_core::FeatureFlagService::new()),
        sse_sessions,
        business_tool_registry,
        permission_store,
        audit_logger,
        audit_retention_policy,
        retention_manager,
        config_store,
        permission_notifier: std::sync::Arc::new(
            crate::routes::business_tools::permission_store::PermissionChangeNotifier::new(),
        ),
    };

    // Spawn background tasks
    spawn_background_tasks(&state, pool_for_heartbeat).await;

    // Build the full application router
    let cors = topems_shared::create_cors_layer();

    let app = crate::routes::create_routes(&state, move || String::new(), embed_mode)
        .layer(axum::middleware::from_fn(topems_shared_core::logging::request_context_middleware))
        .layer(cors)
        .with_state(state);

    Ok(app)
}

/// 启动后台任务
async fn spawn_background_tasks(state: &AppState, pool: sqlx::PgPool) {
    // WebSocket cleanup
    let ws_state_cleanup = state.ws_state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state_cleanup.cleanup_timeout_connections(90).await;
            if !removed.is_empty() {
                tracing::info!("WebSocket cleanup: removed {} timeout connections", removed.len());
            }
        }
    });

    // Audit log retention cleanup
    let retention_manager = state.retention_manager.clone();
    tokio::spawn(async move {
        use crate::routes::business_tools::audit_retention_task::RetentionCleanupTask;
        let mut task = RetentionCleanupTask::from_retention_manager(retention_manager);
        task.start();
        std::future::pending::<()>().await;
    });

    // Plugin heartbeat detection
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            // 简化：跳过 plugin heartbeat 检测（plugin-registry 已迁移）
        }
    });

    // SSE cleanup
    let sse_sessions_cleanup = state.sse_sessions.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = sse_sessions_cleanup
                .cleanup_expired(tokio::time::Duration::from_secs(1800))
                .await;
            if removed > 0 {
                tracing::info!("SSE cleanup: removed {} expired sessions", removed);
            }
        }
    });
}

/// 初始化字段加密服务
fn init_field_encryption() -> Option<std::sync::Arc<topems_shared_auth::security::FieldEncryptionService>> {
    // 简化：跳过字段加密初始化
    None
}
