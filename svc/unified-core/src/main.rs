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

mod shared;

pub mod middleware;
pub mod modules;

use std::env;
use std::net::SocketAddr;

use axum::http::{Request, StatusCode};
use axum::response::Response;
use axum::{
    body::Body,
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use reqwest::Client;
use sqlx::PgPool;

use topems_shared::init_service_telemetry;
use topems_shared::{
    audit_logger_middleware, auth_middleware, body_limit_middleware, create_cors_layer,
    get_api_info_handler, security_headers_middleware, simple_health_check, ApiResponse,
    AuditLoggerConfig, AuditLoggerMiddleware, AuthState, BodyLimitConfig, BodyLimitMiddleware,
    CompressionConfig, CompressionMiddleware, SecurityHeadersConfig, SecurityHeadersLayer,
    ServiceHealth, SimpleHealthConfig, TelemetryExt,
};

use crate::middleware::permission::require_permission;
use crate::middleware::rate_limit::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use crate::middleware::tenant_rls::tenant_rls_middleware;

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub ws_state: std::sync::Arc<modules::communication::ws::WsState>,
    pub http_client: Client,
    pub rate_limit_middleware: std::sync::Arc<RateLimitMiddleware>,
    pub security_headers_layer: std::sync::Arc<SecurityHeadersLayer>,
    pub compression_middleware: std::sync::Arc<CompressionMiddleware>,
    pub body_limit_middleware: std::sync::Arc<BodyLimitMiddleware>,
    pub audit_logger_middleware: std::sync::Arc<AuditLoggerMiddleware>,
    pub versioning_middleware: std::sync::Arc<middleware::versioning::VersionMiddleware>,
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

impl axum::extract::FromRef<AppState> for std::sync::Arc<RateLimitMiddleware> {
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
        env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string()
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
    modules::backup::init_database(&pool)
        .await
        .expect("Failed to init backup database");
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
    modules::feedback::init_database(&pool)
        .await
        .expect("Failed to init feedback database");
    modules::sync::init_database(&pool)
        .await
        .expect("Failed to init sync database");
    modules::login_log::init_database(&pool)
        .await
        .expect("Failed to init login_log database");
    modules::search::init_database(&pool)
        .await
        .expect("Failed to init search database");

    middleware::audit_log::init_audit_logs_table(&pool)
        .await
        .expect("Failed to init audit logs table");

    middleware::versioning::init_version_config_table(&pool)
        .await
        .expect("Failed to init version config table");

    // 初始化系统基础字典数据
    modules::dict::seed::seed_dict_data(&pool)
        .await
        .expect("Failed to seed dict data");

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-unified-core").with_db(pool.clone());
    let ws_state = std::sync::Arc::new(modules::communication::ws::WsState::new());
    let http_client = Client::new();

    let rate_limit_config = RateLimitConfig::default()
        .with_default_rule(500, 60)
        .add_path_rule("/api/core/iam/auth", 100, 60)
        .add_path_rule("/api/core/flow", 300, 60)
        .add_path_rule("/api/core/file/upload", 50, 60);
    let rate_limit_middleware = std::sync::Arc::new(RateLimitMiddleware::new(rate_limit_config));

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
        .add_skip_path("/api/core/info")
        .add_skip_path("/api/core/health")
        .add_skip_path("/api/core/plugin/health");

    let versioning_middleware =
        std::sync::Arc::new(middleware::versioning::VersionMiddleware::new(
            middleware::versioning::VersionConfig::default(),
        ));

    let state = AppState {
        auth_state,
        pool,
        health_config,
        ws_state: ws_state.clone(),
        http_client,
        rate_limit_middleware,
        security_headers_layer,
        compression_middleware,
        body_limit_middleware: body_limit_mw,
        audit_logger_middleware: audit_logger_mw,
        versioning_middleware,
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

    // ===== Public routes (no auth required) =====
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("unified-core-service")))
        .route(
            "/api/core/info",
            get(|| get_api_info_handler("unified-core-service")),
        )
        .route(
            "/api/plugins/info",
            get(modules::plugin::handlers::list_plugins_with_status),
        )
        .route("/api/core/plugin/health", get(plugin_health_check))
        .route(
            "/api/core/comm/notify/notifications/health/detailed",
            get(modules::communication::notification::get_notification_health_detailed),
        )
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        // Auth endpoints (no auth required for login)
        .route("/api/core/iam/auth/login", post(modules::iam::auth::login))
        .route(
            "/api/core/iam/auth/register",
            post(modules::iam::auth::register),
        )
        .route(
            "/api/core/iam/auth/refresh",
            post(modules::iam::auth::refresh_token),
        )
        .route(
            "/api/core/iam/auth/forgot-password",
            post(modules::iam::auth::forgot_password),
        )
        .route(
            "/api/core/iam/auth/reset-password",
            post(modules::iam::auth::reset_password),
        )
        // WebSocket endpoints (auth handled via token query param or subscribe message)
        // Unified WebSocket routes with module prefix
        .route(
            "/ws/core/notifications",
            get(modules::communication::ws::websocket_handler),
        )
        .route(
            "/ws/core/im",
            get(modules::communication::ws::websocket_handler),
        )
        // Plugin proxy route (no auth required - plugins handle their own auth)
        .route("/api/plugins/{plugin_code}/{*path}", get(plugin_proxy))
        // Plugin registration routes (no auth required - for service startup auto-registration)
        .route(
            "/api/core/plugin/dev/plugins/{code}/register",
            post(modules::plugin::handlers::register_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/status",
            put(modules::plugin::handlers::update_plugin_status),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/unregister",
            post(modules::plugin::handlers::unregister_plugin),
        );

    // ----- Migration Routes (requires system:migration permission) -----
    let migration_routes = Router::new()
        .route(
            "/api/migrations/services",
            get(modules::migration::handlers::list_services),
        )
        .route(
            "/api/migrations/services/{name}/status",
            get(modules::migration::handlers::get_status),
        )
        .route(
            "/api/migrations/services/{name}/apply",
            post(modules::migration::handlers::apply_migration),
        )
        .route(
            "/api/migrations/services/{name}/rollback",
            post(modules::migration::handlers::rollback_migration),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:migration"),
        ));

    // ----- Backup Routes (requires system:backup permission) -----
    let backup_routes = Router::new()
        .route(
            "/api/core/backup",
            post(modules::backup::handlers::create_backup),
        )
        .route(
            "/api/core/backup/list",
            get(modules::backup::handlers::list_backups),
        )
        .route(
            "/api/core/backup/{id}",
            get(modules::backup::handlers::get_backup),
        )
        .route(
            "/api/core/backup/{id}",
            delete(modules::backup::handlers::delete_backup),
        )
        .route(
            "/api/core/backup/restore",
            post(modules::backup::handlers::restore_backup),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:backup"),
        ));

    // ===== Protected routes (auth required) =====

    // ----- Auth Operations (requires auth but no specific permission) -----
    let auth_operations_routes = Router::new()
        .route(
            "/api/core/iam/auth/logout",
            post(modules::iam::auth::logout),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ----- IAM Routes with iam:read permission -----
    let iam_read_routes = Router::new()
        .route("/api/core/iam/users", get(modules::iam::user::list_users))
        .route(
            "/api/core/iam/users/{id}",
            get(modules::iam::user::get_user),
        )
        .route(
            "/api/core/iam/users/me",
            get(modules::iam::user::get_current_user),
        )
        .route(
            "/api/core/iam/users/me/preferences",
            get(modules::iam::user::get_preferences),
        )
        .route("/api/core/iam/roles", get(modules::iam::role::list_roles))
        .route(
            "/api/core/iam/roles/{id}",
            get(modules::iam::role::get_role),
        )
        .route(
            "/api/core/iam/permissions",
            get(modules::iam::permission::list_permissions),
        )
        .route(
            "/api/core/iam/user-permissions/{user_id}",
            get(modules::iam::user_permission::get_user_permissions),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:read"),
        ));

    // ----- IAM Routes with iam:write permission -----
    let iam_write_routes = Router::new()
        .route("/api/core/iam/users", post(modules::iam::user::create_user))
        .route(
            "/api/core/iam/users/{id}",
            put(modules::iam::user::update_user),
        )
        .route(
            "/api/core/iam/users/{id}/disable",
            post(modules::iam::user::disable_user),
        )
        .route(
            "/api/core/iam/users/{id}/enable",
            post(modules::iam::user::enable_user),
        )
        .route(
            "/api/core/iam/users/{id}/password",
            put(modules::iam::user::change_password),
        )
        .route(
            "/api/core/iam/users/me/preferences",
            put(modules::iam::user::update_preferences),
        )
        .route("/api/core/iam/roles", post(modules::iam::role::create_role))
        .route(
            "/api/core/iam/roles/{id}",
            put(modules::iam::role::update_role),
        )
        .route(
            "/api/core/iam/user-permissions/{user_id}",
            put(modules::iam::user_permission::update_user_permissions),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:write"),
        ));

    // ----- IAM Routes with iam:delete permission -----
    let iam_delete_routes = Router::new()
        .route(
            "/api/core/iam/users/{id}",
            delete(modules::iam::user::delete_user),
        )
        .route(
            "/api/core/iam/roles/{id}",
            delete(modules::iam::role::delete_role),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("iam:delete"),
        ));

    // ----- Flow Routes with workflow:read permission -----
    let flow_read_routes = Router::new()
        .route("/api/core/flow/tasks", get(modules::flow::task::list_tasks))
        .route(
            "/api/core/flow/tasks/my",
            get(modules::flow::task::my_tasks),
        )
        .route(
            "/api/core/flow/tasks/my/pending",
            get(modules::flow::task::my_pending_tasks),
        )
        .route(
            "/api/core/flow/tasks/my/completed",
            get(modules::flow::task::my_completed_tasks),
        )
        .route(
            "/api/core/flow/tasks/my/involved",
            get(modules::flow::task::my_tasks),
        )
        .route(
            "/api/core/flow/tasks/my/created",
            get(modules::flow::task::my_tasks),
        )
        .route(
            "/api/core/flow/tasks/my/count",
            get(modules::flow::task::get_task_count),
        )
        .route(
            "/api/core/flow/tasks/my/stats",
            get(modules::flow::task::get_task_stats),
        )
        .route(
            "/api/core/flow/tasks/my/cc",
            get(modules::flow::task::my_tasks),
        )
        .route(
            "/api/core/flow/tasks/candidate",
            get(modules::flow::task::candidate_tasks),
        )
        .route(
            "/api/core/flow/tasks/count",
            get(modules::flow::task::get_task_count),
        )
        .route(
            "/api/core/flow/tasks/high-priority",
            get(modules::flow::task::high_priority_tasks),
        )
        .route(
            "/api/core/flow/tasks/overdue",
            get(modules::flow::task::overdue_tasks),
        )
        .route(
            "/api/core/flow/tasks/{id}",
            get(modules::flow::task::get_task),
        )
        .route(
            "/api/core/flow/workflows",
            get(modules::flow::workflow::list_workflows),
        )
        .route(
            "/api/core/flow/workflows/{id}",
            get(modules::flow::workflow::get_workflow),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/versions",
            get(modules::flow::version::list_versions),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/versions/{version_id}",
            get(modules::flow::version::get_version),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/compare/{version1}/{version2}",
            get(modules::flow::version::compare_versions),
        )
        .route(
            "/api/core/flow/instances",
            get(modules::flow::instance::list_instances),
        )
        .route(
            "/api/core/flow/instances/{id}",
            get(modules::flow::instance::get_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/details",
            get(modules::flow::instance::get_instance_details),
        )
        .route(
            "/api/core/flow/approvals/pending",
            get(modules::flow::approval::list_pending_approvals),
        )
        .route(
            "/api/core/flow/approvals",
            get(modules::flow::approval::list_approvals),
        )
        .route(
            "/api/core/flow/approvals/{id}",
            get(modules::flow::approval::get_approval),
        )
        .route(
            "/api/core/flow/approval-tasks",
            get(modules::flow::approval::list_approval_tasks),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}",
            get(modules::flow::approval::get_approval_task),
        )
        .route(
            "/api/core/flow/templates",
            get(modules::flow::template::list_templates),
        )
        .route(
            "/api/core/flow/templates/{id}",
            get(modules::flow::template::get_template),
        )
        .route(
            "/api/core/flow/templates/{id}/export",
            get(modules::flow::template::export_template),
        )
        .route(
            "/api/core/flow/history",
            get(modules::flow::history::list_history),
        )
        .route(
            "/api/core/flow/history/{id}",
            get(modules::flow::history::get_history),
        )
        .route(
            "/api/core/flow/history/instance/{instance_id}",
            get(modules::flow::history::get_instance_history),
        )
        .route(
            "/api/core/flow/history/workflow/{workflow_id}",
            get(modules::flow::history::get_workflow_history),
        )
        .route(
            "/api/core/flow/records",
            get(modules::flow::record::list_records),
        )
        .route(
            "/api/core/flow/records/{approval_id}",
            get(modules::flow::record::get_record),
        )
        .route(
            "/api/core/flow/settings",
            get(modules::flow::setting::list_settings),
        )
        .route(
            "/api/core/flow/settings/{id}",
            get(modules::flow::setting::get_setting),
        )
        .route(
            "/api/core/flow/settings/key/{key}",
            get(modules::flow::setting::get_setting_by_key),
        )
        .route(
            "/api/core/flow/statistics",
            get(modules::flow::statistics::get_statistics),
        )
        .route(
            "/api/core/flow/performance",
            get(modules::flow::performance::get_performance),
        )
        // Frontend aligned routes (Workflow)
        .route("/workflows", get(modules::flow::workflow::list_workflows))
        .route(
            "/workflows/{id}",
            get(modules::flow::workflow::get_workflow),
        )
        .route(
            "/workflows/{workflow_id}/versions",
            get(modules::flow::version::list_versions),
        )
        .route(
            "/workflows/{workflow_id}/versions/{version_id}",
            get(modules::flow::version::get_version),
        )
        .route(
            "/workflows/{workflow_id}/compare/{version1}/{version2}",
            get(modules::flow::version::compare_versions),
        )
        .route("/instances", get(modules::flow::instance::list_instances))
        .route(
            "/instances/{id}",
            get(modules::flow::instance::get_instance),
        )
        .route(
            "/instances/{id}/details",
            get(modules::flow::instance::get_instance_details),
        )
        .route("/tasks", get(modules::flow::task::list_tasks))
        .route("/tasks/my", get(modules::flow::task::my_tasks))
        .route(
            "/tasks/my/pending",
            get(modules::flow::task::my_pending_tasks),
        )
        .route(
            "/tasks/my/completed",
            get(modules::flow::task::my_completed_tasks),
        )
        .route("/tasks/my/involved", get(modules::flow::task::my_tasks))
        .route("/tasks/my/created", get(modules::flow::task::my_tasks))
        .route("/tasks/my/count", get(modules::flow::task::get_task_count))
        .route("/tasks/my/stats", get(modules::flow::task::get_task_stats))
        .route(
            "/tasks/candidate",
            get(modules::flow::task::candidate_tasks),
        )
        .route("/tasks/{id}", get(modules::flow::task::get_task))
        .route("/approvals", get(modules::flow::approval::list_approvals))
        .route(
            "/approvals/pending",
            get(modules::flow::approval::list_pending_approvals),
        )
        .route(
            "/approvals/{id}",
            get(modules::flow::approval::get_approval),
        )
        .route(
            "/approval-tasks",
            get(modules::flow::approval::list_approval_tasks),
        )
        .route(
            "/approval-tasks/{id}",
            get(modules::flow::approval::get_approval_task),
        )
        .route("/templates", get(modules::flow::template::list_templates))
        .route(
            "/templates/{id}",
            get(modules::flow::template::get_template),
        )
        .route(
            "/templates/{id}/export",
            get(modules::flow::template::export_template),
        )
        .route("/history", get(modules::flow::history::list_history))
        .route("/history/{id}", get(modules::flow::history::get_history))
        .route(
            "/history/instance/{instance_id}",
            get(modules::flow::history::get_instance_history),
        )
        .route("/records", get(modules::flow::record::list_records))
        .route(
            "/records/{approval_id}",
            get(modules::flow::record::get_record),
        )
        .route("/settings", get(modules::flow::setting::list_settings))
        .route("/settings/{id}", get(modules::flow::setting::get_setting))
        .route(
            "/statistics",
            get(modules::flow::statistics::get_statistics),
        )
        .route(
            "/performance",
            get(modules::flow::performance::get_performance),
        )
        // Monitor routes
        .route(
            "/monitor/instances",
            get(modules::flow::monitor::list_instances),
        )
        .route(
            "/monitor/instances/{id}",
            get(modules::flow::monitor::get_instance_detail),
        )
        .route(
            "/monitor/instances/{id}/history",
            get(modules::flow::monitor::get_instance_history),
        )
        .route(
            "/monitor/instances/{id}/tasks",
            get(modules::flow::monitor::get_instance_tasks),
        )
        .route(
            "/monitor/instances/{id}/variables",
            get(modules::flow::monitor::get_instance_variables),
        )
        .route(
            "/monitor/instances/{id}/diagram",
            get(modules::flow::monitor::get_instance_diagram),
        )
        .route(
            "/monitor/instances/running",
            get(modules::flow::monitor::get_running_instances),
        )
        .route(
            "/monitor/instances/completed",
            get(modules::flow::monitor::get_completed_instances),
        )
        .route(
            "/monitor/instances/rejected",
            get(modules::flow::monitor::get_rejected_instances),
        )
        .route(
            "/monitor/instances/suspended",
            get(modules::flow::monitor::get_suspended_instances),
        )
        .route(
            "/monitor/instances/overdue",
            get(modules::flow::monitor::get_overdue_instances),
        )
        .route(
            "/monitor/statistics",
            get(modules::flow::monitor::get_statistics),
        )
        .route(
            "/monitor/analysis/{workflowId}",
            get(modules::flow::monitor::get_workflow_analysis),
        )
        .route(
            "/monitor/analysis/{workflowId}/nodes",
            get(modules::flow::monitor::get_node_statistics),
        )
        .route(
            "/monitor/analysis/{workflowId}/bottlenecks",
            get(modules::flow::monitor::get_bottleneck_analysis),
        )
        .route(
            "/monitor/analysis/efficiency",
            get(modules::flow::monitor::get_efficiency_analysis),
        )
        .route(
            "/monitor/analysis/trend",
            get(modules::flow::monitor::get_trend_data),
        )
        .route(
            "/monitor/analysis/users",
            get(modules::flow::monitor::get_user_stats),
        )
        .route(
            "/monitor/analysis/departments",
            get(modules::flow::monitor::get_department_stats),
        )
        .route("/monitor/logs", get(modules::flow::monitor::list_logs))
        .route("/monitor/logs/{id}", get(modules::flow::monitor::get_log))
        .route(
            "/monitor/logs/instance/{instanceId}",
            get(modules::flow::monitor::get_logs_by_instance),
        )
        .route(
            "/monitor/logs/workflow/{workflowId}",
            get(modules::flow::monitor::get_logs_by_workflow),
        )
        .route(
            "/monitor/logs/node/{workflowId}/{nodeId}",
            get(modules::flow::monitor::get_logs_by_node),
        )
        .route(
            "/monitor/logs/user/{userId}",
            get(modules::flow::monitor::get_logs_by_user),
        )
        .route(
            "/monitor/realtime",
            get(modules::flow::monitor::get_realtime_stats),
        )
        .route(
            "/monitor/dashboard",
            get(modules::flow::monitor::get_dashboard_data),
        )
        .route(
            "/monitor/performance",
            get(modules::flow::monitor::get_performance_metrics),
        )
        .route(
            "/monitor/sla-compliance",
            get(modules::flow::monitor::get_sla_compliance),
        )
        .route(
            "/monitor/instances/error",
            get(modules::flow::monitor::get_error_instances),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:read"),
        ));

    // ----- Flow Routes with workflow:write permission -----
    let flow_write_routes = Router::new()
        .route(
            "/api/core/flow/tasks/{id}/claim",
            post(modules::flow::task::claim_task),
        )
        .route(
            "/api/core/flow/tasks/{id}/unclaim",
            post(modules::flow::task::unclaim_task),
        )
        .route(
            "/api/core/flow/tasks/{id}/complete",
            post(modules::flow::task::complete_task),
        )
        .route(
            "/api/core/flow/tasks/{id}/approve",
            post(modules::flow::task::approve_task),
        )
        .route(
            "/api/core/flow/tasks/{id}/reject",
            post(modules::flow::task::reject_task),
        )
        .route(
            "/api/core/flow/tasks/{id}/delegate",
            post(modules::flow::task::delegate_task),
        )
        .route(
            "/api/core/flow/tasks/batch/approve",
            post(modules::flow::task::batch_approve),
        )
        .route(
            "/api/core/flow/tasks/batch/complete",
            post(modules::flow::task::batch_complete),
        )
        .route(
            "/api/core/flow/tasks/batch/delegate",
            post(modules::flow::task::batch_delegate),
        )
        .route(
            "/api/core/flow/workflows",
            post(modules::flow::workflow::create_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}",
            put(modules::flow::workflow::update_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}/publish",
            post(modules::flow::workflow::publish_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}/unpublish",
            post(modules::flow::workflow::unpublish_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}/activate",
            post(modules::flow::workflow::activate_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}/deactivate",
            post(modules::flow::workflow::deactivate_workflow),
        )
        .route(
            "/api/core/flow/workflows/{id}/deploy",
            post(modules::flow::workflow::deploy_workflow),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/rollback",
            post(modules::flow::workflow::rollback_workflow),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/versions",
            post(modules::flow::version::create_version),
        )
        .route(
            "/api/core/flow/workflows/{workflow_id}/versions/{version_id}/activate",
            post(modules::flow::version::activate_version),
        )
        .route(
            "/api/core/flow/instances",
            post(modules::flow::instance::create_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/start",
            post(modules::flow::instance::start_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/approve",
            post(modules::flow::instance::approve_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/reject",
            post(modules::flow::instance::reject_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/cancel",
            post(modules::flow::instance::cancel_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/resume",
            post(modules::flow::instance::resume_instance),
        )
        .route(
            "/api/core/flow/instances/{id}/suspend",
            post(modules::flow::instance::suspend_instance),
        )
        .route(
            "/api/core/flow/approvals/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/api/core/flow/approvals/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route(
            "/api/core/flow/approvals",
            post(modules::flow::approval::create_approval),
        )
        .route(
            "/api/core/flow/approvals/{id}/process",
            post(modules::flow::approval::process_approval),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/claim",
            post(modules::flow::approval::claim_task),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/unclaim",
            post(modules::flow::approval::unclaim_task),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/delegate",
            post(modules::flow::approval::delegate_task),
        )
        .route(
            "/api/core/flow/approval-tasks/{id}/reassign",
            post(modules::flow::approval::reassign_task),
        )
        .route(
            "/api/core/flow/templates",
            post(modules::flow::template::create_template),
        )
        .route(
            "/api/core/flow/templates/{id}",
            put(modules::flow::template::update_template),
        )
        .route(
            "/api/core/flow/templates/{id}/copy",
            post(modules::flow::template::copy_template),
        )
        .route(
            "/api/core/flow/templates/import",
            post(modules::flow::template::import_template),
        )
        .route(
            "/api/core/flow/settings/{id}",
            put(modules::flow::setting::update_setting),
        )
        .route(
            "/api/core/flow/settings/{id}/reset",
            post(modules::flow::setting::reset_setting),
        )
        .route(
            "/api/core/flow/settings/batch",
            post(modules::flow::setting::batch_update_settings),
        )
        .route(
            "/api/core/flow/performance/reset",
            post(modules::flow::performance::reset_performance),
        )
        // Frontend aligned routes (Workflow)
        .route("/workflows", post(modules::flow::workflow::create_workflow))
        .route(
            "/workflows/{id}",
            put(modules::flow::workflow::update_workflow)
                .delete(modules::flow::workflow::delete_workflow),
        )
        .route(
            "/workflows/{id}/deploy",
            post(modules::flow::workflow::deploy_workflow),
        )
        .route(
            "/workflows/{id}/activate",
            post(modules::flow::workflow::activate_workflow),
        )
        .route(
            "/workflows/{id}/deactivate",
            post(modules::flow::workflow::deactivate_workflow),
        )
        .route(
            "/workflows/{id}/publish",
            post(modules::flow::workflow::publish_workflow),
        )
        .route(
            "/workflows/{id}/unpublish",
            post(modules::flow::workflow::unpublish_workflow),
        )
        .route(
            "/workflows/{workflow_id}/rollback",
            post(modules::flow::workflow::rollback_workflow),
        )
        .route(
            "/workflows/{workflow_id}/versions",
            post(modules::flow::version::create_version),
        )
        .route(
            "/workflows/{workflow_id}/versions/{version_id}/activate",
            post(modules::flow::version::activate_version),
        )
        .route(
            "/workflows/import",
            post(modules::flow::template::import_template),
        )
        .route("/instances", post(modules::flow::instance::create_instance))
        .route(
            "/instances/{id}/start",
            post(modules::flow::instance::start_instance),
        )
        .route(
            "/instances/{id}/cancel",
            post(modules::flow::instance::cancel_instance),
        )
        .route(
            "/instances/{id}/suspend",
            post(modules::flow::instance::suspend_instance),
        )
        .route(
            "/instances/{id}/resume",
            post(modules::flow::instance::resume_instance),
        )
        .route(
            "/instances/{id}/approve",
            post(modules::flow::instance::approve_instance),
        )
        .route(
            "/instances/{id}/reject",
            post(modules::flow::instance::reject_instance),
        )
        .route("/tasks/{id}/claim", post(modules::flow::task::claim_task))
        .route(
            "/tasks/{id}/unclaim",
            post(modules::flow::task::unclaim_task),
        )
        .route(
            "/tasks/{id}/complete",
            post(modules::flow::task::complete_task),
        )
        .route(
            "/tasks/{id}/approve",
            post(modules::flow::task::approve_task),
        )
        .route("/tasks/{id}/reject", post(modules::flow::task::reject_task))
        .route(
            "/tasks/{id}/delegate",
            post(modules::flow::task::delegate_task),
        )
        .route(
            "/tasks/batch/approve",
            post(modules::flow::task::batch_approve),
        )
        .route(
            "/tasks/batch/complete",
            post(modules::flow::task::batch_complete),
        )
        .route(
            "/tasks/batch/delegate",
            post(modules::flow::task::batch_delegate),
        )
        .route("/approvals", post(modules::flow::approval::create_approval))
        .route(
            "/approvals/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/approvals/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route(
            "/approvals/{id}/process",
            post(modules::flow::approval::process_approval),
        )
        .route(
            "/approval-tasks/{id}/approve",
            post(modules::flow::approval::approve_task),
        )
        .route(
            "/approval-tasks/{id}/reject",
            post(modules::flow::approval::reject_task),
        )
        .route(
            "/approval-tasks/{id}/claim",
            post(modules::flow::approval::claim_task),
        )
        .route(
            "/approval-tasks/{id}/unclaim",
            post(modules::flow::approval::unclaim_task),
        )
        .route(
            "/approval-tasks/{id}/delegate",
            post(modules::flow::approval::delegate_task),
        )
        .route(
            "/approval-tasks/{id}/reassign",
            post(modules::flow::approval::reassign_task),
        )
        .route("/templates", post(modules::flow::template::create_template))
        .route(
            "/templates/{id}",
            put(modules::flow::template::update_template)
                .delete(modules::flow::template::delete_template),
        )
        .route(
            "/templates/{id}/copy",
            post(modules::flow::template::copy_template),
        )
        .route(
            "/templates/import",
            post(modules::flow::template::import_template),
        )
        .route(
            "/settings/{id}",
            put(modules::flow::setting::update_setting),
        )
        .route(
            "/settings/{id}/reset",
            post(modules::flow::setting::reset_setting),
        )
        .route(
            "/settings/batch",
            post(modules::flow::setting::batch_update_settings),
        )
        .route(
            "/performance/reset",
            post(modules::flow::performance::reset_performance),
        )
        // Monitor write routes
        .route(
            "/monitor/instances/{id}/retry",
            post(modules::flow::monitor::retry_instance),
        )
        .route(
            "/monitor/instances/{id}/skip",
            post(modules::flow::monitor::skip_node),
        )
        .route(
            "/monitor/instances/{id}/force-complete",
            post(modules::flow::monitor::force_complete),
        )
        .route(
            "/monitor/instances/{id}/force-terminate",
            post(modules::flow::monitor::force_terminate),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("workflow:write"),
        ));

    // ----- File Routes with file:read permission -----
    let file_read_routes = Router::new()
        .route(
            "/api/core/file/download/{id}",
            get(modules::file::download::download_file),
        )
        .route(
            "/api/core/file/preview/{id}",
            get(modules::file::download::preview_file),
        )
        .route(
            "/api/core/file/thumbnail/{id}",
            get(modules::file::download::get_thumbnail),
        )
        .route(
            "/api/core/file/files",
            get(modules::file::manage::list_files),
        )
        .route(
            "/api/core/file/files/{id}",
            get(modules::file::manage::get_file),
        )
        .route(
            "/api/core/file/files/{id}/shares",
            get(modules::file::manage::get_file_shares),
        )
        .route(
            "/api/core/file/files/{id}/permissions",
            get(modules::file::manage::get_file_permissions),
        )
        .route(
            "/api/core/file/files/shared",
            get(modules::file::manage::get_shared_files),
        )
        .route(
            "/api/core/file/files/received",
            get(modules::file::manage::get_received_files),
        )
        .route(
            "/api/core/file/files/starred",
            get(modules::file::manage::list_starred_files),
        )
        .route(
            "/api/core/file/files/search",
            get(modules::file::manage::search_files),
        )
        .route(
            "/api/core/file/stats",
            get(modules::file::manage::get_file_stats),
        )
        .route(
            "/api/core/file/folders",
            get(modules::file::folder::list_folders),
        )
        .route(
            "/api/core/file/folders/{id}",
            get(modules::file::folder::get_folder),
        )
        .route(
            "/api/core/file/folders/tree",
            get(modules::file::folder::get_folder_tree),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:read"),
        ));

    // ----- File Routes with file:write permission -----
    let file_write_routes = Router::new()
        .route(
            "/api/core/file/upload",
            post(modules::file::upload::upload_file),
        )
        .route(
            "/api/core/file/upload/multiple",
            post(modules::file::upload::upload_multiple),
        )
        .route(
            "/api/core/file/files/{id}",
            put(modules::file::manage::update_file),
        )
        .route(
            "/api/core/file/files/{id}/move",
            post(modules::file::manage::move_file),
        )
        .route(
            "/api/core/file/files/{id}/copy",
            post(modules::file::manage::copy_file),
        )
        .route(
            "/api/core/file/files/{id}/share",
            post(modules::file::manage::share_file),
        )
        .route(
            "/api/core/file/files/{id}/star",
            post(modules::file::manage::star_file),
        )
        .route(
            "/api/core/file/files/{id}/unstar",
            post(modules::file::manage::unstar_file),
        )
        .route(
            "/api/core/file/files/{id}/permissions",
            post(modules::file::manage::set_file_permissions),
        )
        .route(
            "/api/core/file/files/export",
            post(modules::file::manage::export_files),
        )
        .route(
            "/api/core/file/shares/{id}",
            delete(modules::file::manage::delete_share),
        )
        .route(
            "/api/core/file/folders",
            post(modules::file::folder::create_folder),
        )
        .route(
            "/api/core/file/folders/{id}",
            put(modules::file::folder::update_folder),
        )
        .route(
            "/api/core/file/folders/{id}/move",
            post(modules::file::folder::move_folder),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:write"),
        ));

    // ----- File Routes with file:delete permission -----
    let file_delete_routes = Router::new()
        .route(
            "/api/core/file/files/{id}",
            delete(modules::file::manage::delete_file),
        )
        .route(
            "/api/core/file/folders/{id}",
            delete(modules::file::folder::delete_folder),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:delete"),
        ));

    // ----- File Routes with file:admin permission -----
    let file_admin_routes = Router::new()
        .route(
            "/api/core/file/files/{id}/permission",
            post(modules::file::manage::set_file_permission),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:admin"),
        ));

    // ----- Communication Routes (Notification) -----
    let comm_read_routes = Router::new()
        .route(
            "/api/core/comm/notify/list",
            get(modules::communication::notification::list_notifications),
        )
        .route(
            "/api/core/comm/notify/notifications",
            get(modules::communication::notification::get_notifications),
        )
        .route(
            "/api/core/comm/notify/notifications/unread-count",
            get(modules::communication::notification::get_unread_count),
        )
        .route(
            "/api/core/comm/notify/notifications/unread",
            get(modules::communication::notification::get_unread_notifications),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}",
            get(modules::communication::notification::get_notification),
        )
        .route(
            "/api/core/comm/notify/notifications/stats/me",
            get(modules::communication::notification::get_notification_stats),
        )
        .route(
            "/api/core/comm/notify/notifications/archived",
            get(modules::communication::notification::list_archived_notifications),
        )
        .route(
            "/api/core/comm/notify/notifications/archive/config",
            get(modules::communication::notification::get_archive_config),
        )
        .route(
            "/api/core/comm/notify/notification-templates",
            get(modules::communication::notification::list_templates),
        )
        .route(
            "/api/core/comm/notify/notification-templates/{id}",
            get(modules::communication::notification::get_template),
        )
        .route(
            "/api/core/comm/im/rooms",
            get(modules::communication::im::list_rooms),
        )
        .route(
            "/api/core/comm/im/rooms/{id}",
            get(modules::communication::im::get_room),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/messages",
            get(modules::communication::im::get_messages),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/members",
            get(modules::communication::im::list_members),
        )
        .route(
            "/api/core/comm/im/rooms/search",
            get(modules::communication::im::search_rooms),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/messages/search",
            get(modules::communication::im::search_messages),
        )
        .route(
            "/api/core/comm/im/contacts",
            get(modules::communication::im::list_contacts),
        )
        .route(
            "/api/core/comm/im/contacts/{id}",
            get(modules::communication::im::get_contact),
        )
        .route(
            "/api/core/comm/im/contact-groups",
            get(modules::communication::im::list_contact_groups),
        )
        .route(
            "/api/core/comm/im/online-status/{user_id}",
            get(modules::communication::im::get_online_status),
        )
        .route(
            "/api/core/comm/im/notifications/{user_id}",
            get(modules::communication::im::list_im_notifications),
        )
        .route(
            "/api/core/comm/im/project-groups",
            get(modules::communication::im::list_project_groups),
        )
        .route(
            "/api/core/comm/mail/emails",
            get(modules::communication::mail::list_emails),
        )
        .route(
            "/api/core/comm/mail/emails/{id}",
            get(modules::communication::mail::get_email),
        )
        .route(
            "/api/core/comm/mail/templates",
            get(modules::communication::mail::list_templates),
        )
        .route(
            "/api/core/comm/mail/templates/{id}",
            get(modules::communication::mail::get_template),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("notification:read"),
        ));

    let comm_write_routes = Router::new()
        .route(
            "/api/core/comm/notify/send",
            post(modules::communication::notification::send_notification),
        )
        .route(
            "/api/core/comm/notify/broadcast",
            post(modules::communication::notification::broadcast_notification),
        )
        .route(
            "/api/core/comm/notify/{id}/read",
            post(modules::communication::notification::mark_as_read),
        )
        .route(
            "/api/core/comm/notify/read-all",
            post(modules::communication::notification::mark_all_as_read),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}",
            put(modules::communication::notification::mark_as_read),
        )
        .route(
            "/api/core/comm/notify/notifications/read-all",
            put(modules::communication::notification::mark_all_as_read),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}/unread",
            put(modules::communication::notification::mark_as_unread),
        )
        .route(
            "/api/core/comm/notify/notifications/bulk-read",
            post(modules::communication::notification::bulk_mark_read),
        )
        .route(
            "/api/core/comm/notify/notifications/bulk-delete",
            delete(modules::communication::notification::bulk_delete),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}/archive",
            post(modules::communication::notification::archive_notification),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}/unarchive",
            post(modules::communication::notification::unarchive_notification),
        )
        .route(
            "/api/core/comm/notify/notifications/{id}",
            delete(modules::communication::notification::delete_notification),
        )
        .route(
            "/api/core/comm/notify/notifications",
            delete(modules::communication::notification::delete_all_notifications),
        )
        .route(
            "/api/core/comm/notify/notifications/archive/config",
            put(modules::communication::notification::update_archive_config),
        )
        .route(
            "/api/core/comm/notify/notifications/archive/run",
            post(modules::communication::notification::run_auto_archive),
        )
        .route(
            "/api/core/comm/notify/notification-templates",
            post(modules::communication::notification::create_template),
        )
        .route(
            "/api/core/comm/notify/notification-templates/{id}",
            put(modules::communication::notification::update_template),
        )
        .route(
            "/api/core/comm/notify/notification-templates/{id}",
            delete(modules::communication::notification::delete_template),
        )
        .route(
            "/api/core/comm/im/rooms",
            post(modules::communication::im::create_room),
        )
        .route(
            "/api/core/comm/im/rooms/{id}",
            put(modules::communication::im::update_room),
        )
        .route(
            "/api/core/comm/im/rooms/{id}",
            delete(modules::communication::im::delete_room),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/messages",
            post(modules::communication::im::send_message),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/members",
            post(modules::communication::im::add_member),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/members",
            delete(modules::communication::im::remove_member),
        )
        .route(
            "/api/core/comm/im/messages/{id}",
            put(modules::communication::im::update_message),
        )
        .route(
            "/api/core/comm/im/messages/{id}",
            delete(modules::communication::im::delete_message),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/read",
            post(modules::communication::im::mark_messages_read),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/mute",
            post(modules::communication::im::mute_room),
        )
        .route(
            "/api/core/comm/im/rooms/{id}/pin",
            post(modules::communication::im::pin_message),
        )
        .route(
            "/api/core/comm/im/contacts",
            post(modules::communication::im::add_contact),
        )
        .route(
            "/api/core/comm/im/contacts/{id}",
            put(modules::communication::im::update_contact),
        )
        .route(
            "/api/core/comm/im/contacts/{id}",
            delete(modules::communication::im::remove_contact),
        )
        .route(
            "/api/core/comm/im/contact-groups",
            post(modules::communication::im::create_contact_group),
        )
        .route(
            "/api/core/comm/im/contact-groups/{id}",
            put(modules::communication::im::update_contact_group),
        )
        .route(
            "/api/core/comm/im/contact-groups/{id}",
            delete(modules::communication::im::delete_contact_group),
        )
        .route(
            "/api/core/comm/im/project-groups",
            post(modules::communication::im::create_project_group),
        )
        .route(
            "/api/core/comm/mail/emails",
            post(modules::communication::mail::send_email),
        )
        .route(
            "/api/core/comm/mail/emails/{id}/read",
            post(modules::communication::mail::mark_as_read),
        )
        .route(
            "/api/core/comm/mail/templates",
            post(modules::communication::mail::create_template),
        )
        .route(
            "/api/core/comm/mail/templates/{id}",
            put(modules::communication::mail::update_template),
        )
        .route(
            "/api/core/comm/mail/templates/{id}/send",
            post(modules::communication::mail::send_with_template),
        )
        .route(
            "/api/core/comm/mail/emails/{id}",
            delete(modules::communication::mail::delete_email),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("notification:write"),
        ));

    // ----- Tenant Routes -----
    let tenant_read_routes = Router::new()
        .route(
            "/api/core/tenant/tenants",
            get(modules::tenant::handlers::list_tenants),
        )
        .route(
            "/api/core/tenant/tenants/{id}",
            get(modules::tenant::handlers::get_tenant),
        )
        .route(
            "/api/core/tenant/tenants/{id}/quota",
            get(modules::tenant::handlers::get_tenant_quota),
        )
        .route(
            "/api/core/tenant/tenants/{id}/modules",
            get(modules::tenant::handlers::list_tenant_modules),
        )
        .route(
            "/api/core/tenant/by-code/{code}",
            get(modules::tenant::handlers::get_tenant_by_code),
        )
        .route(
            "/api/core/tenant/list",
            get(modules::tenant::handlers::list_tenants),
        )
        .route(
            "/api/core/tenant/{id}",
            get(modules::tenant::handlers::get_tenant),
        )
        .route(
            "/api/core/tenant/slug/{slug}",
            get(modules::tenant::handlers::get_tenant_by_slug),
        )
        .route(
            "/api/core/tenant/{id}/users",
            get(modules::tenant::handlers::get_tenant_users),
        )
        .route(
            "/api/core/tenant/{id}/stats",
            get(modules::tenant::handlers::get_tenant_stats),
        )
        .route(
            "/api/core/tenant/{id}/metrics",
            get(modules::tenant::handlers::get_usage_metrics),
        )
        .route(
            "/api/core/tenant/{id}/billing",
            get(modules::tenant::handlers::get_billing_info),
        )
        .route(
            "/api/core/tenant/{id}/invoices",
            get(modules::tenant::handlers::get_invoices),
        )
        .route(
            "/api/core/tenant/context",
            get(modules::tenant::handlers::get_current_tenant_context),
        )
        .route(
            "/api/core/tenant/my",
            get(modules::tenant::handlers::get_my_tenants),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("tenant:read"),
        ));

    let tenant_write_routes = Router::new()
        .route(
            "/api/core/tenant/tenants",
            post(modules::tenant::handlers::create_tenant),
        )
        .route(
            "/api/core/tenant/tenants/{id}",
            put(modules::tenant::handlers::update_tenant),
        )
        .route(
            "/api/core/tenant/tenants/{id}/activate",
            post(modules::tenant::handlers::activate_tenant),
        )
        .route(
            "/api/core/tenant/tenants/{id}/suspend",
            post(modules::tenant::handlers::suspend_tenant),
        )
        .route(
            "/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/activate",
            post(modules::tenant::handlers::activate_module),
        )
        .route(
            "/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate",
            post(modules::tenant::handlers::deactivate_module),
        )
        .route(
            "/api/core/tenant/create",
            post(modules::tenant::handlers::create_tenant),
        )
        .route(
            "/api/core/tenant/{id}",
            put(modules::tenant::handlers::update_tenant),
        )
        .route(
            "/api/core/tenant/{id}",
            delete(modules::tenant::handlers::delete_tenant),
        )
        .route(
            "/api/core/tenant/{id}/activate",
            post(modules::tenant::handlers::activate_tenant),
        )
        .route(
            "/api/core/tenant/{id}/suspend",
            post(modules::tenant::handlers::suspend_tenant),
        )
        .route(
            "/api/core/tenant/{id}/users/invite",
            post(modules::tenant::handlers::invite_member),
        )
        .route(
            "/api/core/tenant/{id}/users/{user_id}",
            delete(modules::tenant::handlers::remove_member),
        )
        .route(
            "/api/core/tenant/{id}/users/{user_id}/role",
            put(modules::tenant::handlers::update_member_role),
        )
        .route(
            "/api/core/tenant/switch",
            post(modules::tenant::handlers::switch_tenant),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("tenant:write"),
        ));

    // ----- Billing Routes -----
    let billing_read_routes = Router::new()
        .route(
            "/api/core/billing/plans",
            get(modules::billing::handlers::list_plans),
        )
        .route(
            "/api/core/billing/plans/{id}",
            get(modules::billing::handlers::get_plan),
        )
        .route(
            "/api/core/billing/subscriptions/{tenant_id}",
            get(modules::billing::handlers::get_subscription),
        )
        .route(
            "/api/core/billing/invoices/{tenant_id}",
            get(modules::billing::handlers::list_invoices),
        )
        .route(
            "/api/core/billing/usage/{tenant_id}",
            get(modules::billing::handlers::get_usage_summary),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("billing:read"),
        ));

    let billing_write_routes = Router::new()
        .route(
            "/api/core/billing/subscriptions",
            post(modules::billing::handlers::create_subscription),
        )
        .route(
            "/api/core/billing/subscriptions/{tenant_id}/cancel",
            post(modules::billing::handlers::cancel_subscription),
        )
        .route(
            "/api/core/billing/usage/{tenant_id}/{metric_type}",
            post(modules::billing::handlers::record_usage),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("billing:write"),
        ));

    // ----- Plugin Routes -----
    let plugin_read_routes = Router::new()
        .route(
            "/api/core/plugin/marketplace",
            get(modules::plugin::handlers::get_marketplace_summary),
        )
        .route(
            "/api/core/plugin/marketplace/list",
            get(modules::plugin::handlers::list_plugins),
        )
        .route(
            "/api/core/plugin/marketplace/categories",
            get(modules::plugin::handlers::list_categories),
        )
        .route(
            "/api/core/plugin/plugins/{code}",
            get(modules::plugin::handlers::get_plugin),
        )
        .route(
            "/api/core/plugin/plugins/{plugin_id}/versions",
            get(modules::plugin::handlers::get_plugin_versions),
        )
        .route(
            "/api/core/plugin/plugins/{plugin_id}/reviews",
            get(modules::plugin::handlers::get_plugin_reviews),
        )
        .route(
            "/api/core/plugin/runtime/list",
            get(modules::plugin::handlers::list_plugins_with_status),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins",
            get(modules::plugin::handlers::list_tenant_plugins),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/available",
            get(modules::plugin::handlers::get_available_plugins),
        )
        .route(
            "/api/core/plugins/my",
            get(modules::plugin::handlers::list_my_plugins),
        )
        .route(
            "/api/core/plugin/plugins/{code}/status",
            get(modules::plugin::handlers::get_plugin_status),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("plugin:read"),
        ));

    let plugin_write_routes = Router::new()
        .route(
            "/api/core/plugin/plugins/{plugin_id}/reviews",
            post(modules::plugin::handlers::create_review),
        )
        .route(
            "/api/core/plugin/dev/plugins",
            post(modules::plugin::handlers::upload_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}",
            put(modules::plugin::handlers::update_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/publish",
            post(modules::plugin::handlers::publish_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{code}/unpublish",
            post(modules::plugin::handlers::unpublish_plugin),
        )
        .route(
            "/api/core/plugin/dev/plugins/{plugin_code}/versions",
            post(modules::plugin::handlers::upload_plugin_version),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install",
            post(modules::plugin::handlers::install_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/uninstall",
            post(modules::plugin::handlers::uninstall_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/activate",
            post(modules::plugin::handlers::activate_plugin),
        )
        .route(
            "/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/deactivate",
            post(modules::plugin::handlers::deactivate_plugin),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("plugin:write"),
        ));

    // ----- Sync Routes -----
    let sync_read_routes = Router::new()
        .route(
            "/api/core/sync/task/{task_id}",
            get(modules::sync::handlers::get_task),
        )
        .route(
            "/api/core/sync/pending",
            get(modules::sync::handlers::get_pending),
        )
        .route(
            "/api/core/sync/statistics",
            get(modules::sync::handlers::get_statistics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:read"),
        ));

    let sync_write_routes = Router::new()
        .route(
            "/api/core/sync/task",
            post(modules::sync::handlers::create_task),
        )
        .route(
            "/api/core/sync/task/{task_id}/status",
            post(modules::sync::handlers::update_status),
        )
        .route(
            "/api/core/sync/retry-failed",
            post(modules::sync::handlers::retry_failed),
        )
        .route(
            "/api/core/sync/trigger/scm-to-wms",
            post(modules::sync::handlers::trigger_scm_wms),
        )
        .route(
            "/api/core/sync/trigger/wms-to-crm",
            post(modules::sync::handlers::trigger_wms_crm),
        )
        .route(
            "/api/core/sync/trigger/srm-to-scm",
            post(modules::sync::handlers::trigger_srm_scm),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    let mobile_offline_routes = Router::new()
        .route(
            "/api/core/sync/mobile/sync",
            post(modules::sync::handlers::mobile_sync_records),
        )
        .route(
            "/api/core/sync/mobile/pending",
            get(modules::sync::handlers::mobile_get_pending_records),
        )
        .route(
            "/api/core/sync/mobile/records/{record_id}/synced",
            post(modules::sync::handlers::mobile_mark_synced),
        )
        .route(
            "/api/core/sync/mobile/records/synced/clear",
            delete(modules::sync::handlers::mobile_clear_synced),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("sync:write"),
        ));

    let mobile_api_routes = modules::mobile::create_mobile_routes(&state);

    // ----- Help Center Routes (public access) -----
    let help_routes = Router::new()
        .route("/api/core/help/faqs", get(modules::help::faq::list_faqs))
        .route(
            "/api/core/help/faqs/categories",
            get(modules::help::faq::get_faq_categories),
        )
        .route("/api/core/help/faqs/{id}", get(modules::help::faq::get_faq))
        .route(
            "/api/core/help/guides",
            get(modules::help::guide::list_guides),
        )
        .route(
            "/api/core/help/guides/categories",
            get(modules::help::guide::get_guide_categories),
        )
        .route(
            "/api/core/help/guides/{id}",
            get(modules::help::guide::get_guide),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ----- Feedback Routes (requires auth) -----
    let feedback_routes = Router::new()
        .route(
            "/feedbacks",
            post(modules::feedback::feedback::create_feedback),
        )
        .route(
            "/feedbacks",
            get(modules::feedback::feedback::list_feedbacks),
        )
        .route(
            "/feedbacks/{id}",
            get(modules::feedback::feedback::get_feedback),
        )
        .route(
            "/feedbacks/{id}/response",
            post(modules::feedback::feedback::response_feedback),
        )
        .route(
            "/feedbacks/{id}",
            delete(modules::feedback::feedback::delete_feedback),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ----- Help Center Admin Routes (requires help:write permission) -----
    let help_admin_routes = Router::new()
        .route("/api/core/help/faqs", post(modules::help::faq::create_faq))
        .route(
            "/api/core/help/faqs/{id}",
            put(modules::help::faq::update_faq).delete(modules::help::faq::delete_faq),
        )
        .route(
            "/api/core/help/guides",
            post(modules::help::guide::create_guide),
        )
        .route(
            "/api/core/help/guides/{guide_id}/lessons",
            post(modules::help::guide::add_lesson),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("help:write"),
        ));

    // ----- Health & Metrics (with auth) -----
    let health_routes = Router::new()
        .route("/api/core/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ----- Dict Routes (system:read permission) -----
    let dict_read_routes = Router::new()
        .route(
            "/api/core/dict/dict-types",
            get(modules::dict::handlers::list_dict_types),
        )
        .route(
            "/api/core/dict/dict-types/{id}",
            get(modules::dict::handlers::get_dict_type),
        )
        .route(
            "/api/core/dict/dict-types/{dict_type_id}/items",
            get(modules::dict::handlers::list_dict_items),
        )
        .route(
            "/api/core/dict/dict-types/{dict_type_id}/items/export",
            get(modules::dict::handlers::export_dict_items),
        )
        .route(
            "/api/core/dict/dict-items/{id}",
            get(modules::dict::handlers::get_dict_item),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let dict_write_routes = Router::new()
        .route(
            "/api/core/dict/dict-types",
            post(modules::dict::handlers::create_dict_type),
        )
        .route(
            "/api/core/dict/dict-types/{id}",
            put(modules::dict::handlers::update_dict_type),
        )
        .route(
            "/api/core/dict/dict-types/{id}",
            delete(modules::dict::handlers::delete_dict_type),
        )
        .route(
            "/api/core/dict/dict-items",
            post(modules::dict::handlers::create_dict_item),
        )
        .route(
            "/api/core/dict/dict-items/batch",
            post(modules::dict::handlers::batch_create_dict_items),
        )
        .route(
            "/api/core/dict/dict-items/{id}",
            put(modules::dict::handlers::update_dict_item),
        )
        .route(
            "/api/core/dict/dict-items/{id}",
            delete(modules::dict::handlers::delete_dict_item),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    // ----- Menu Routes (system:read / system:write permission) -----
    let menu_read_routes = Router::new()
        .route(
            "/api/core/menu/groups",
            get(modules::menu::handlers::list_groups),
        )
        .route(
            "/api/core/menu/groups/{id}",
            get(modules::menu::handlers::get_group),
        )
        .route(
            "/api/core/menu/menus",
            get(modules::menu::handlers::list_menus),
        )
        .route(
            "/api/core/menu/menus/{id}",
            get(modules::menu::handlers::get_menu),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let menu_write_routes = Router::new()
        .route(
            "/api/core/menu/groups",
            post(modules::menu::handlers::create_group),
        )
        .route(
            "/api/core/menu/groups/{id}",
            put(modules::menu::handlers::update_group),
        )
        .route(
            "/api/core/menu/groups/{id}",
            delete(modules::menu::handlers::delete_group),
        )
        .route(
            "/api/core/menu/menus",
            post(modules::menu::handlers::create_menu),
        )
        .route(
            "/api/core/menu/menus/{id}",
            put(modules::menu::handlers::update_menu),
        )
        .route(
            "/api/core/menu/menus/{id}",
            delete(modules::menu::handlers::delete_menu),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    // ----- Versioning Routes (system:read / system:write permission) -----
    let versioning_read_routes = Router::new()
        .route(
            "/api/core/versioning/versions",
            get(middleware::versioning::list_versions),
        )
        .route(
            "/api/core/versioning/versions/{version}",
            get(middleware::versioning::get_version),
        )
        .route(
            "/api/core/versioning/statistics",
            get(middleware::versioning::get_version_statistics),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let versioning_write_routes = Router::new()
        .route(
            "/api/core/versioning/versions",
            post(middleware::versioning::create_version),
        )
        .route(
            "/api/core/versioning/versions/{version}/status",
            put(middleware::versioning::update_version_status),
        )
        .route(
            "/api/core/versioning/versions/{version}",
            delete(middleware::versioning::delete_version),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    // [V6.0] 业务模块路由已迁移到独立服务，此处注释掉以消除双重实现
    /*
    // ----- Finance Routes (finance:read / finance:write permission) -----
    let finance_read_routes = Router::new()
        .route(
            "/api/core/finance/payments",
            get(modules::finance::handlers::list_payments),
        )
        .route(
            "/api/core/finance/payments/{id}",
            get(modules::finance::handlers::get_payment),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("finance:read"),
        ));

    let finance_write_routes = Router::new()
        .route(
            "/api/core/finance/payments",
            post(modules::finance::handlers::create_payment),
        )
        .route(
            "/api/core/finance/payments/{id}",
            put(modules::finance::handlers::update_payment),
        )
        .route(
            "/api/core/finance/payments/{id}",
            delete(modules::finance::handlers::delete_payment),
        )
        .route(
            "/api/core/finance/payments/{id}/submit",
            post(modules::finance::handlers::submit_payment),
        )
        .route(
            "/api/core/finance/payments/{id}/approve",
            post(modules::finance::handlers::approve_payment),
        )
        .route(
            "/api/core/finance/payments/{id}/reject",
            post(modules::finance::handlers::reject_payment),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("finance:write"),
        ));
    */

    // [V6.0] 业务模块路由已迁移到独立服务，此处注释掉以消除双重实现
    /*
    // ----- ERP Routes (erp:read / erp:write permission) -----
    let erp_read_routes = Router::new()
        .route(
            "/api/core/erp/purchase-orders",
            get(modules::erp::purchase::handlers::list_purchase_orders),
        )
        .route(
            "/api/core/erp/purchase-orders/{id}",
            get(modules::erp::purchase::handlers::get_purchase_order),
        )
        .route(
            "/api/core/erp/sales-orders",
            get(modules::erp::sales::handlers::list_sales_orders),
        )
        .route(
            "/api/core/erp/sales-orders/{id}",
            get(modules::erp::sales::handlers::get_sales_order),
        )
        .route(
            "/api/core/erp/inventory",
            get(modules::erp::inventory::handlers::list_inventory),
        )
        .route(
            "/api/core/erp/inventory/{id}",
            get(modules::erp::inventory::handlers::get_inventory),
        )
        .route(
            "/api/core/erp/materials",
            get(modules::erp::material::handlers::list_materials),
        )
        .route(
            "/api/core/erp/materials/{id}",
            get(modules::erp::material::handlers::get_material),
        )
        .route(
            "/api/core/erp/suppliers",
            get(modules::erp::supplier::handlers::list_suppliers),
        )
        .route(
            "/api/core/erp/suppliers/{id}",
            get(modules::erp::supplier::handlers::get_supplier),
        )
        .route(
            "/api/core/erp/customers",
            get(modules::erp::customer::handlers::list_customers),
        )
        .route(
            "/api/core/erp/customers/{id}",
            get(modules::erp::customer::handlers::get_customer),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("erp:read"),
        ));

    let erp_write_routes = Router::new()
        .route(
            "/api/core/erp/purchase-orders",
            post(modules::erp::purchase::handlers::create_purchase_order),
        )
        .route(
            "/api/core/erp/purchase-orders/{id}",
            put(modules::erp::purchase::handlers::update_purchase_order),
        )
        .route(
            "/api/core/erp/purchase-orders/{id}",
            delete(modules::erp::purchase::handlers::delete_purchase_order),
        )
        .route(
            "/api/core/erp/purchase-orders/{id}/approve",
            post(modules::erp::purchase::handlers::approve_purchase_order),
        )
        .route(
            "/api/core/erp/sales-orders",
            post(modules::erp::sales::handlers::create_sales_order),
        )
        .route(
            "/api/core/erp/sales-orders/{id}",
            put(modules::erp::sales::handlers::update_sales_order),
        )
        .route(
            "/api/core/erp/sales-orders/{id}",
            delete(modules::erp::sales::handlers::delete_sales_order),
        )
        .route(
            "/api/core/erp/sales-orders/{id}/approve",
            post(modules::erp::sales::handlers::approve_sales_order),
        )
        .route(
            "/api/core/erp/inventory/{id}/adjust",
            post(modules::erp::inventory::handlers::update_inventory_quantity),
        )
        .route(
            "/api/core/erp/materials",
            post(modules::erp::material::handlers::create_material),
        )
        .route(
            "/api/core/erp/materials/{id}",
            put(modules::erp::material::handlers::update_material),
        )
        .route(
            "/api/core/erp/materials/{id}",
            delete(modules::erp::material::handlers::delete_material),
        )
        .route(
            "/api/core/erp/suppliers",
            post(modules::erp::supplier::handlers::create_supplier),
        )
        .route(
            "/api/core/erp/suppliers/{id}",
            put(modules::erp::supplier::handlers::update_supplier),
        )
        .route(
            "/api/core/erp/suppliers/{id}",
            delete(modules::erp::supplier::handlers::delete_supplier),
        )
        .route(
            "/api/core/erp/customers",
            post(modules::erp::customer::handlers::create_customer),
        )
        .route(
            "/api/core/erp/customers/{id}",
            put(modules::erp::customer::handlers::update_customer),
        )
        .route(
            "/api/core/erp/customers/{id}",
            delete(modules::erp::customer::handlers::delete_customer),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("erp:write"),
        ));
    */

    // [V6.0] 业务模块路由已迁移到独立服务，此处注释掉以消除双重实现
    /*
    // ----- HRM Routes (hrm:read / hrm:write permission) -----
    let hrm_read_routes = Router::new()
        .route(
            "/api/core/hrm/employees",
            get(modules::hrm::employee::handlers::list_employees),
        )
        .route(
            "/api/core/hrm/employees/{id}",
            get(modules::hrm::employee::handlers::get_employee),
        )
        .route(
            "/api/core/hrm/departments",
            get(modules::hrm::department::handlers::list_departments),
        )
        .route(
            "/api/core/hrm/departments/{id}",
            get(modules::hrm::department::handlers::get_department),
        )
        .route(
            "/api/core/hrm/attendance",
            get(modules::hrm::attendance::handlers::list_attendance),
        )
        .route(
            "/api/core/hrm/attendance/{id}",
            get(modules::hrm::attendance::handlers::get_attendance),
        )
        .route(
            "/api/core/hrm/leaves",
            get(modules::hrm::leave::handlers::list_leaves),
        )
        .route(
            "/api/core/hrm/leaves/{id}",
            get(modules::hrm::leave::handlers::get_leave),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("hrm:read"),
        ));

    let hrm_write_routes = Router::new()
        .route(
            "/api/core/hrm/employees",
            post(modules::hrm::employee::handlers::create_employee),
        )
        .route(
            "/api/core/hrm/employees/{id}",
            put(modules::hrm::employee::handlers::update_employee),
        )
        .route(
            "/api/core/hrm/employees/{id}",
            delete(modules::hrm::employee::handlers::delete_employee),
        )
        .route(
            "/api/core/hrm/departments",
            post(modules::hrm::department::handlers::create_department),
        )
        .route(
            "/api/core/hrm/departments/{id}",
            put(modules::hrm::department::handlers::update_department),
        )
        .route(
            "/api/core/hrm/departments/{id}",
            delete(modules::hrm::department::handlers::delete_department),
        )
        .route(
            "/api/core/hrm/attendance",
            post(modules::hrm::attendance::handlers::create_attendance),
        )
        .route(
            "/api/core/hrm/leaves",
            post(modules::hrm::leave::handlers::create_leave),
        )
        .route(
            "/api/core/hrm/leaves/{id}",
            put(modules::hrm::leave::handlers::update_leave),
        )
        .route(
            "/api/core/hrm/leaves/{id}",
            delete(modules::hrm::leave::handlers::delete_leave),
        )
        .route(
            "/api/core/hrm/leaves/{id}/approve",
            post(modules::hrm::leave::handlers::approve_leave),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("hrm:write"),
        ));
    */

    // [V6.0] 业务模块路由已迁移到独立服务，此处注释掉以消除双重实现
    /*
    // ----- CRM Routes (crm:read / crm:write permission) -----
    let crm_read_routes = Router::new()
        .route(
            "/api/core/crm/customers",
            get(modules::crm::customer::handlers::list_customers),
        )
        .route(
            "/api/core/crm/customers/{id}",
            get(modules::crm::customer::handlers::get_customer),
        )
        .route(
            "/api/core/crm/contacts",
            get(modules::crm::contact::handlers::list_contacts),
        )
        .route(
            "/api/core/crm/contacts/{id}",
            get(modules::crm::contact::handlers::get_contact),
        )
        .route(
            "/api/core/crm/opportunities",
            get(modules::crm::opportunity::handlers::list_opportunities),
        )
        .route(
            "/api/core/crm/opportunities/{id}",
            get(modules::crm::opportunity::handlers::get_opportunity),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("crm:read"),
        ));

    let crm_write_routes = Router::new()
        .route(
            "/api/core/crm/customers",
            post(modules::crm::customer::handlers::create_customer),
        )
        .route(
            "/api/core/crm/customers/{id}",
            put(modules::crm::customer::handlers::update_customer),
        )
        .route(
            "/api/core/crm/customers/{id}",
            delete(modules::crm::customer::handlers::delete_customer),
        )
        .route(
            "/api/core/crm/contacts",
            post(modules::crm::contact::handlers::create_contact),
        )
        .route(
            "/api/core/crm/contacts/{id}",
            put(modules::crm::contact::handlers::update_contact),
        )
        .route(
            "/api/core/crm/contacts/{id}",
            delete(modules::crm::contact::handlers::delete_contact),
        )
        .route(
            "/api/core/crm/opportunities",
            post(modules::crm::opportunity::handlers::create_opportunity),
        )
        .route(
            "/api/core/crm/opportunities/{id}",
            put(modules::crm::opportunity::handlers::update_opportunity),
        )
        .route(
            "/api/core/crm/opportunities/{id}",
            delete(modules::crm::opportunity::handlers::delete_opportunity),
        )
        .route(
            "/api/core/crm/opportunities/{id}/stage",
            post(modules::crm::opportunity::handlers::update_opportunity_stage),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("crm:write"),
        ));
    */

    // [V6.0] 业务模块路由已迁移到独立服务，此处注释掉以消除双重实现
    /*
    // ----- WMS Routes (wms:read / wms:write permission) -----
    let wms_read_routes = Router::new()
        .route(
            "/api/core/wms/warehouses",
            get(modules::wms::warehouse::handlers::list_warehouses),
        )
        .route(
            "/api/core/wms/warehouses/{id}",
            get(modules::wms::warehouse::handlers::get_warehouse),
        )
        .route(
            "/api/core/wms/inventory",
            get(modules::wms::inventory::handlers::list_inventory),
        )
        .route(
            "/api/core/wms/inventory/{id}",
            get(modules::wms::inventory::handlers::get_inventory),
        )
        .route(
            "/api/core/wms/inbound-orders",
            get(modules::wms::inbound::handlers::list_inbound_orders),
        )
        .route(
            "/api/core/wms/inbound-orders/{id}",
            get(modules::wms::inbound::handlers::get_inbound_order),
        )
        .route(
            "/api/core/wms/outbound-orders",
            get(modules::wms::outbound::handlers::list_outbound_orders),
        )
        .route(
            "/api/core/wms/outbound-orders/{id}",
            get(modules::wms::outbound::handlers::get_outbound_order),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("wms:read"),
        ));

    let wms_write_routes = Router::new()
        .route(
            "/api/core/wms/warehouses",
            post(modules::wms::warehouse::handlers::create_warehouse),
        )
        .route(
            "/api/core/wms/warehouses/{id}",
            put(modules::wms::warehouse::handlers::update_warehouse),
        )
        .route(
            "/api/core/wms/warehouses/{id}",
            delete(modules::wms::warehouse::handlers::delete_warehouse),
        )
        .route(
            "/api/core/wms/inventory/{id}/adjust",
            post(modules::wms::inventory::handlers::adjust_inventory),
        )
        .route(
            "/api/core/wms/inbound-orders",
            post(modules::wms::inbound::handlers::create_inbound_order),
        )
        .route(
            "/api/core/wms/inbound-orders/{id}",
            put(modules::wms::inbound::handlers::update_inbound_order),
        )
        .route(
            "/api/core/wms/inbound-orders/{id}",
            delete(modules::wms::inbound::handlers::delete_inbound_order),
        )
        .route(
            "/api/core/wms/inbound-orders/{id}/confirm",
            post(modules::wms::inbound::handlers::confirm_inbound_order),
        )
        .route(
            "/api/core/wms/outbound-orders",
            post(modules::wms::outbound::handlers::create_outbound_order),
        )
        .route(
            "/api/core/wms/outbound-orders/{id}",
            put(modules::wms::outbound::handlers::update_outbound_order),
        )
        .route(
            "/api/core/wms/outbound-orders/{id}",
            delete(modules::wms::outbound::handlers::delete_outbound_order),
        )
        .route(
            "/api/core/wms/outbound-orders/{id}/confirm",
            post(modules::wms::outbound::handlers::confirm_outbound_order),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("wms:write"),
        ));
    */

    // ===== Merge all protected routes with their respective permission middleware =====
    let protected_routes = auth_operations_routes
        .merge(iam_read_routes)
        .merge(iam_write_routes)
        .merge(iam_delete_routes)
        .merge(flow_read_routes)
        .merge(flow_write_routes)
        .merge(file_read_routes)
        .merge(file_write_routes)
        .merge(file_delete_routes)
        .merge(file_admin_routes)
        .merge(comm_read_routes)
        .merge(comm_write_routes)
        .merge(tenant_read_routes)
        .merge(tenant_write_routes)
        .merge(billing_read_routes)
        .merge(billing_write_routes)
        .merge(plugin_read_routes)
        .merge(plugin_write_routes)
        .merge(sync_read_routes)
        .merge(sync_write_routes)
        .merge(mobile_offline_routes)
        .merge(mobile_api_routes)
        .merge(help_routes)
        .merge(help_admin_routes)
        .merge(feedback_routes)
        .merge(dict_read_routes)
        .merge(dict_write_routes)
        .merge(menu_read_routes)
        .merge(menu_write_routes)
        .merge(versioning_read_routes)
        .merge(versioning_write_routes)
        .merge(modules::login_log::create_routes(state.clone()))
        //.merge(finance_read_routes)
        //.merge(finance_write_routes)
        //.merge(erp_read_routes)
        //.merge(erp_write_routes)
        //.merge(hrm_read_routes)
        //.merge(hrm_write_routes)
        //.merge(crm_read_routes)
        //.merge(crm_write_routes)
        //.merge(wms_read_routes)
        //.merge(wms_write_routes)
        .merge(migration_routes)
        .merge(backup_routes)
        .merge(health_routes)
        .merge(modules::search::create_routes(state.clone()))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::input_validation::input_validation_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            audit_logger_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::audit_log::audit_log_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::versioning::versioning_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            body_limit_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            tenant_rls_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            security_headers_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            compression_middleware_fn,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            rate_limit_middleware_fn,
        ))
        .with_telemetry()
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

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 插件代理处理函数 ====================

/// 插件代理处理器
async fn plugin_proxy(
    Path((plugin_code, remaining)): Path<(String, String)>,
    State(state): State<AppState>,
    request: Request<Body>,
) -> Result<Response, (StatusCode, String)> {
    // 1. 查询插件 runtime_url
    let plugin_info: Option<(String, String)> = sqlx::query_as(
        r#"
        SELECT pi.runtime_url, pi.base_path
        FROM core_plugin_instances pi
        JOIN core_plugins p ON pi.plugin_id = p.id
        WHERE p.code = $1 AND pi.runtime_status = 'running'
        "#,
    )
    .bind(&plugin_code)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or(None);

    let (runtime_url, base_path) = match plugin_info {
        Some((url, path)) => (url, path),
        None => {
            return Err((
                StatusCode::NOT_FOUND,
                "Plugin not found or not running".to_string(),
            ))
        }
    };

    // 2. 构造目标 URL
    // base_path 格式如 "/api/plugins/erp"，remaining 格式如 "api/plugins/erp/xxx"
    // 需要去掉 base_path 前缀得到 "/xxx"
    let base_path_str = base_path.trim_start_matches('/');
    let path_suffix: String = if remaining.starts_with(&base_path) {
        remaining
            .strip_prefix(&base_path)
            .unwrap_or(&remaining)
            .to_string()
    } else if remaining.starts_with(base_path_str) {
        remaining
            .strip_prefix(base_path_str)
            .unwrap_or(&remaining)
            .to_string()
    } else {
        // 如果都不匹配，直接使用剩余路径（加上前导斜杠）
        format!("/{}", remaining)
    };
    let target_url = format!("{}{}", runtime_url.trim_end_matches('/'), path_suffix);

    tracing::info!(
        "[Plugin Proxy] Forwarding {} -> {}",
        request.uri(),
        target_url
    );

    // 3. 构造代理请求
    let method = request.method().clone();

    // 4. 构建 reqwest 请求，逐步添加头部
    let mut req_builder = state.http_client.request(method.clone(), &target_url);

    // 复制原始请求的头部，但跳过 host 和 content-length
    for (key, value) in request.headers().iter() {
        if key != axum::http::header::HOST && key != axum::http::header::CONTENT_LENGTH {
            if let Ok(value_str) = value.to_str() {
                req_builder = req_builder.header(key.as_str(), value_str);
            }
        }
    }

    // 5. 发送请求到目标插件
    let response = req_builder.send().await.map_err(|e| {
        tracing::info!("[Plugin Proxy] Failed to forward request: {}", e);
        (StatusCode::BAD_GATEWAY, e.to_string())
    })?;

    // 6. 转换响应
    let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
    let mut builder = Response::builder().status(status);

    for (key, value) in response.headers().iter() {
        builder = builder.header(key.as_str(), value.as_bytes());
    }

    let body = response
        .bytes()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(builder.body(Body::from(body)).unwrap())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Unified Core Platform API\n\n\
     Contains: IAM + Flow + File + Communication\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response(
        "topems-workflow",
        true,
    ))
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "unified-core-service",
        "version": "1.0.0",
        "description": "TOPEMS Unified Core Platform",
        "modules": {
            "iam": "active",
            "flow": "active",
            "file": "active",
            "communication": "active",
            "tenant": "active",
            "billing": "active",
            "plugin": "active",
            "sync": "active"
        },
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ]
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}

async fn rate_limit_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    rate_limit_middleware(State(state), req, next).await
}

async fn security_headers_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    security_headers_middleware(state.security_headers_layer.clone(), req, next).await
}

async fn compression_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    state
        .compression_middleware
        .clone()
        .middleware(req, next)
        .await
}

async fn body_limit_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    body_limit_middleware(state.body_limit_middleware.clone(), req, next).await
}

async fn audit_logger_middleware_fn(
    State(state): State<AppState>,
    req: Request<Body>,
    next: axum::middleware::Next,
) -> Response {
    audit_logger_middleware(state.audit_logger_middleware.clone(), req, next).await
}
