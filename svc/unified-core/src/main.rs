//! TOPEMS Unified Core Platform
//!
//! Unified service for: IAM + Doc + Flow + File + Communication + AI
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

pub mod modules;
pub mod middleware;

use std::net::SocketAddr;

use axum::{
    body::Body,
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use axum::http::{StatusCode, Request};
use axum::response::Response;
use axum_prometheus::PrometheusMetricLayer;
use reqwest::Client;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_logging,
    simple_health_check, ApiResponse, AuthState, ServiceHealth, SimpleHealthConfig,
};

use crate::middleware::permission::{require_permission, require_superuser};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
    pub ws_state: std::sync::Arc<modules::communication::ws::WsState>,
    pub http_client: Client,
    pub ai_service: modules::ai::AIService,
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

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    // Initialize OpenTelemetry tracing
    tracing::info!("🚀 TOPEMS Unified Core Platform starting...");
    tracing::info!("📦 Contains: IAM + Doc + Flow + File + Communication + AI");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

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
    modules::iam::init_database(&pool).await.expect("Failed to init iam database");
    modules::doc::init_database(&pool).await.expect("Failed to init doc database");
    modules::flow::init_database(&pool).await.expect("Failed to init flow database");
    modules::file::init_database(&pool).await.expect("Failed to init file database");
    modules::communication::init_database(&pool).await.expect("Failed to init communication database");
    modules::tenant::init_database(&pool).await.expect("Failed to init tenant database");
    modules::billing::init_database(&pool).await.expect("Failed to init billing database");
    modules::plugin::init_database(&pool).await.expect("Failed to init plugin database");
    modules::finance::service::FinanceService::new(std::sync::Arc::new(pool.clone())).init().await.expect("Failed to init finance database");
    if let Err(e) = modules::ai::init_database(&pool).await {
        tracing::warn!("⚠️ AI module database init failed: {}. AI features may be limited.", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-unified-core").with_db(pool.clone());
    let ws_state = std::sync::Arc::new(modules::communication::ws::WsState::new());
    let http_client = Client::new();
    let ai_config = modules::ai::AIConfig::default();
    let ai_service = modules::ai::AIService::new(pool.clone(), ai_config);

    let state = AppState {
        auth_state,
        pool,
        health_config,
        ws_state: ws_state.clone(),
        http_client,
        ai_service,
    };

    // Spawn background task to cleanup timeout WebSocket connections
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let removed = ws_state.cleanup_timeout_connections(90).await;
            if !removed.is_empty() {
                tracing::info!("WebSocket cleanup: removed {} timeout connections", removed.len());
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
        .route("/api/info", get(|| get_api_info_handler("unified-core-service")))
        .route("/api/plugins/info", get(modules::plugin::handlers::list_plugins_with_status))
        .route("/api/plugins/health", get(plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        // Auth endpoints (no auth required for login)
        .route("/api/v1/auth/login", post(modules::iam::auth::login))
        .route("/api/v1/auth/register", post(modules::iam::auth::register))
        .route("/api/v1/auth/refresh", post(modules::iam::auth::refresh_token))
        .route("/api/v1/auth/forgot-password", post(modules::iam::auth::forgot_password))
        .route("/api/v1/auth/reset-password", post(modules::iam::auth::reset_password))
        // IAM API v1 compatibility routes (for frontend)
        .route("/api/iam/auth/login", post(modules::iam::auth::login))
        .route("/api/iam/auth/register", post(modules::iam::auth::register))
        .route("/api/iam/auth/refresh", post(modules::iam::auth::refresh_token))
        .route("/api/iam/auth/forgot-password", post(modules::iam::auth::forgot_password))
        .route("/api/iam/auth/reset-password", post(modules::iam::auth::reset_password))
        // WebSocket endpoints (auth handled via token query param or subscribe message)
        .route("/api/core/comm/ws/connect", get(modules::communication::ws::websocket_handler))
        .route("/ws/notifications", get(modules::communication::ws::websocket_handler))
        // Plugin proxy route (no auth required - plugins handle their own auth)
        .route("/api/plugins/{plugin_code}/{*path}", get(plugin_proxy));

// ===== Protected routes (auth required) =====

    // ----- Auth Operations (requires auth but no specific permission) -----
    let auth_operations_routes = Router::new()
        .route("/api/v1/auth/logout", post(modules::iam::auth::logout))
        .route("/api/iam/auth/logout", post(modules::iam::auth::logout))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ----- IAM Routes with iam:read permission -----
    let iam_read_routes = Router::new()
        .route("/api/core/iam/users", get(modules::iam::user::list_users))
        .route("/api/core/iam/users/{id}", get(modules::iam::user::get_user))
        .route("/api/core/iam/users/me", get(modules::iam::user::get_current_user))
        .route("/api/core/iam/users/me/preferences", get(modules::iam::user::get_preferences))
        // IAM API v1 compatibility
        .route("/api/iam/users", get(modules::iam::user::list_users))
        .route("/api/iam/users/{id}", get(modules::iam::user::get_user))
        .route("/api/iam/users/me", get(modules::iam::user::get_current_user))
        .route("/api/iam/users/me/preferences", get(modules::iam::user::get_preferences))
        .route("/api/core/iam/roles", get(modules::iam::role::list_roles))
        .route("/api/core/iam/roles/{id}", get(modules::iam::role::get_role))
        // IAM API v1 compatibility
        .route("/api/iam/roles", get(modules::iam::role::list_roles))
        .route("/api/iam/roles/{id}", get(modules::iam::role::get_role))
        .route("/api/core/iam/permissions", get(modules::iam::permission::list_permissions))
        .route("/api/iam/permissions", get(modules::iam::permission::list_permissions))
        .route("/api/core/iam/user-permissions/{user_id}", get(modules::iam::user_permission::get_user_permissions))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("iam:read")));

    // ----- IAM Routes with iam:write permission -----
    let iam_write_routes = Router::new()
        .route("/api/core/iam/users", post(modules::iam::user::create_user))
        .route("/api/core/iam/users/{id}", put(modules::iam::user::update_user))
        .route("/api/core/iam/users/{id}/disable", post(modules::iam::user::disable_user))
        .route("/api/core/iam/users/{id}/enable", post(modules::iam::user::enable_user))
        .route("/api/core/iam/users/{id}/password", put(modules::iam::user::change_password))
        .route("/api/core/iam/users/me/preferences", put(modules::iam::user::update_preferences))
        // IAM API v1 compatibility
        .route("/api/iam/users", post(modules::iam::user::create_user))
        .route("/api/iam/users/{id}", put(modules::iam::user::update_user))
        .route("/api/iam/users/me/preferences", put(modules::iam::user::update_preferences))
        .route("/api/core/iam/roles", post(modules::iam::role::create_role))
        .route("/api/core/iam/roles/{id}", put(modules::iam::role::update_role))
        .route("/api/core/iam/user-permissions/{user_id}", put(modules::iam::user_permission::update_user_permissions))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("iam:write")));

    // ----- IAM Routes with iam:delete permission -----
    let iam_delete_routes = Router::new()
        .route("/api/core/iam/users/{id}", delete(modules::iam::user::delete_user))
        .route("/api/core/iam/roles/{id}", delete(modules::iam::role::delete_role))
        // IAM API v1 compatibility
        .route("/api/iam/users/{id}", delete(modules::iam::user::delete_user))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("iam:delete")));

    // ----- Doc Routes with doc:read permission -----
    let doc_read_routes = Router::new()
        .route("/api/core/doc/documents", get(modules::doc::document::list_documents))
        .route("/api/core/doc/documents/{id}", get(modules::doc::document::get_document))
        .route("/api/core/doc/templates", get(modules::doc::template::list_templates))
        .route("/api/core/doc/templates/{id}", get(modules::doc::template::get_template))
        .route("/api/core/doc/folders", get(modules::doc::folder::list_folders))
        .route("/api/core/doc/folders/{id}", get(modules::doc::folder::get_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("doc:read")));

    // ----- Doc Routes with doc:write permission -----
    let doc_write_routes = Router::new()
        .route("/api/core/doc/documents", post(modules::doc::document::create_document))
        .route("/api/core/doc/documents/{id}", put(modules::doc::document::update_document))
        .route("/api/core/doc/documents/{id}/publish", post(modules::doc::document::publish_document))
        .route("/api/core/doc/documents/{id}/archive", post(modules::doc::document::archive_document))
        .route("/api/core/doc/templates", post(modules::doc::template::create_template))
        .route("/api/core/doc/templates/{id}", put(modules::doc::template::update_template))
        .route("/api/core/doc/templates/{id}/generate", post(modules::doc::template::generate_from_template))
        .route("/api/core/doc/folders", post(modules::doc::folder::create_folder))
        .route("/api/core/doc/folders/{id}", put(modules::doc::folder::update_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("doc:write")));

    // ----- Doc Routes with doc:delete permission -----
    let doc_delete_routes = Router::new()
        .route("/api/core/doc/documents/{id}", delete(modules::doc::document::delete_document))
        .route("/api/core/doc/folders/{id}", delete(modules::doc::folder::delete_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("doc:delete")));

    // ----- Flow Routes with workflow:read permission -----
    let flow_read_routes = Router::new()
        .route("/api/flow/workflows", get(modules::flow::workflow::list_workflows))
        .route("/api/flow/workflows/{id}", get(modules::flow::workflow::get_workflow))
        .route("/api/flow/instances", get(modules::flow::instance::list_instances))
        .route("/api/flow/instances/{id}", get(modules::flow::instance::get_instance))
        .route("/api/flow/approvals/pending", get(modules::flow::approval::list_pending_approvals))
        .route("/api/flow/statistics", get(modules::flow::statistics::get_statistics))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("workflow:read")));

    // ----- Flow Routes with workflow:write permission -----
    let flow_write_routes = Router::new()
        .route("/api/flow/workflows", post(modules::flow::workflow::create_workflow))
        .route("/api/flow/workflows/{id}", put(modules::flow::workflow::update_workflow))
        .route("/api/flow/workflows/{id}/publish", post(modules::flow::workflow::publish_workflow))
        .route("/api/flow/workflows/{id}/unpublish", post(modules::flow::workflow::unpublish_workflow))
        .route("/api/flow/instances", post(modules::flow::instance::create_instance))
        .route("/api/flow/instances/{id}/start", post(modules::flow::instance::start_instance))
        .route("/api/flow/instances/{id}/approve", post(modules::flow::instance::approve_instance))
        .route("/api/flow/instances/{id}/reject", post(modules::flow::instance::reject_instance))
        .route("/api/flow/instances/{id}/cancel", post(modules::flow::instance::cancel_instance))
        .route("/api/flow/approvals/{id}/approve", post(modules::flow::approval::approve_task))
        .route("/api/flow/approvals/{id}/reject", post(modules::flow::approval::reject_task))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("workflow:write")));

    // ----- File Routes with file:read permission -----
    let file_read_routes = Router::new()
        .route("/api/core/file/download/{id}", get(modules::file::download::download_file))
        .route("/api/core/file/preview/{id}", get(modules::file::download::preview_file))
        .route("/api/core/file/thumbnail/{id}", get(modules::file::download::get_thumbnail))
        .route("/api/core/file/files", get(modules::file::manage::list_files))
        .route("/api/core/file/files/{id}", get(modules::file::manage::get_file))
        .route("/api/core/file/folders", get(modules::file::folder::list_folders))
        .route("/api/core/file/folders/{id}", get(modules::file::folder::get_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("file:read")));

    // ----- File Routes with file:write permission -----
    let file_write_routes = Router::new()
        .route("/api/core/file/upload", post(modules::file::upload::upload_file))
        .route("/api/core/file/upload/multiple", post(modules::file::upload::upload_multiple))
        .route("/api/core/file/files/{id}", put(modules::file::manage::update_file))
        .route("/api/core/file/files/{id}/move", post(modules::file::manage::move_file))
        .route("/api/core/file/files/{id}/copy", post(modules::file::manage::copy_file))
        .route("/api/core/file/folders", post(modules::file::folder::create_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("file:write")));

    // ----- File Routes with file:delete permission -----
    let file_delete_routes = Router::new()
        .route("/api/core/file/files/{id}", delete(modules::file::manage::delete_file))
        .route("/api/core/file/folders/{id}", delete(modules::file::folder::delete_folder))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("file:delete")));

    // ----- File Routes with file:admin permission -----
    let file_admin_routes = Router::new()
        .route("/api/core/file/files/{id}/permission", post(modules::file::manage::set_file_permission))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("file:admin")));

    // ----- Communication Routes (Notification) -----
    let comm_read_routes = Router::new()
        .route("/api/core/comm/notify/list", get(modules::communication::notification::list_notifications))
        .route("/api/v1/notifications", get(modules::communication::notification::get_notifications))
        .route("/api/v1/notifications/unread-count", get(modules::communication::notification::get_unread_count))
        .route("/api/v1/notifications/unread", get(modules::communication::notification::get_unread_notifications))
        .route("/api/core/comm/im/rooms", get(modules::communication::im::list_rooms))
        .route("/api/core/comm/im/rooms/{id}", get(modules::communication::im::get_room))
        .route("/api/core/comm/im/rooms/{id}/messages", get(modules::communication::im::get_messages))
        .route("/api/core/comm/im/contacts", get(modules::communication::im::list_contacts))
        .route("/api/core/comm/im/online-status/{user_id}", get(modules::communication::im::get_online_status))
        .route("/api/core/comm/mail/emails", get(modules::communication::mail::list_emails))
        .route("/api/core/comm/mail/emails/{id}", get(modules::communication::mail::get_email))
        .route("/api/core/comm/mail/templates", get(modules::communication::mail::list_templates))
        .route("/api/core/comm/mail/templates/{id}", get(modules::communication::mail::get_template))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("notification:read")));

    let comm_write_routes = Router::new()
        .route("/api/core/comm/notify/send", post(modules::communication::notification::send_notification))
        .route("/api/core/comm/notify/broadcast", post(modules::communication::notification::broadcast_notification))
        .route("/api/core/comm/notify/{id}/read", post(modules::communication::notification::mark_as_read))
        .route("/api/core/comm/notify/read-all", post(modules::communication::notification::mark_all_as_read))
        .route("/api/v1/notifications/{id}", put(modules::communication::notification::mark_as_read))
        .route("/api/v1/notifications/read-all", put(modules::communication::notification::mark_all_as_read))
        .route("/api/core/comm/im/rooms", post(modules::communication::im::create_room))
        .route("/api/core/comm/im/rooms/{id}/messages", post(modules::communication::im::send_message))
        .route("/api/core/comm/im/contacts", post(modules::communication::im::add_contact))
        .route("/api/core/comm/mail/emails", post(modules::communication::mail::send_email))
        .route("/api/core/comm/mail/emails/{id}/read", post(modules::communication::mail::mark_as_read))
        .route("/api/core/comm/mail/templates", post(modules::communication::mail::create_template))
        .route("/api/core/comm/mail/templates/{id}", put(modules::communication::mail::update_template))
        .route("/api/core/comm/mail/templates/{id}/send", post(modules::communication::mail::send_with_template))
        .route("/api/core/comm/mail/emails/{id}", delete(modules::communication::mail::delete_email))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("notification:write")));

    // ----- Tenant Routes -----
    let tenant_read_routes = Router::new()
        .route("/api/core/tenant/tenants", get(modules::tenant::handlers::list_tenants))
        .route("/api/core/tenant/tenants/{id}", get(modules::tenant::handlers::get_tenant))
        .route("/api/core/tenant/tenants/{id}/quota", get(modules::tenant::handlers::get_tenant_quota))
        .route("/api/core/tenant/tenants/{id}/modules", get(modules::tenant::handlers::list_tenant_modules))
        .route("/api/core/tenant/by-code/{code}", get(modules::tenant::handlers::get_tenant_by_code))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("tenant:read")));

    let tenant_write_routes = Router::new()
        .route("/api/core/tenant/tenants", post(modules::tenant::handlers::create_tenant))
        .route("/api/core/tenant/tenants/{id}", put(modules::tenant::handlers::update_tenant))
        .route("/api/core/tenant/tenants/{id}/activate", post(modules::tenant::handlers::activate_tenant))
        .route("/api/core/tenant/tenants/{id}/suspend", post(modules::tenant::handlers::suspend_tenant))
        .route("/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/activate", post(modules::tenant::handlers::activate_module))
        .route("/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate", post(modules::tenant::handlers::deactivate_module))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("tenant:write")));

    // ----- Billing Routes -----
    let billing_read_routes = Router::new()
        .route("/api/core/billing/plans", get(modules::billing::handlers::list_plans))
        .route("/api/core/billing/plans/{id}", get(modules::billing::handlers::get_plan))
        .route("/api/core/billing/subscriptions/{tenant_id}", get(modules::billing::handlers::get_subscription))
        .route("/api/core/billing/invoices/{tenant_id}", get(modules::billing::handlers::list_invoices))
        .route("/api/core/billing/usage/{tenant_id}", get(modules::billing::handlers::get_usage_summary))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("billing:read")));

    let billing_write_routes = Router::new()
        .route("/api/core/billing/subscriptions", post(modules::billing::handlers::create_subscription))
        .route("/api/core/billing/subscriptions/{tenant_id}/cancel", post(modules::billing::handlers::cancel_subscription))
        .route("/api/core/billing/usage/{tenant_id}/{metric_type}", post(modules::billing::handlers::record_usage))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("billing:write")));

    // ----- Plugin Routes -----
    let plugin_read_routes = Router::new()
        .route("/api/core/plugin/marketplace", get(modules::plugin::handlers::get_marketplace_summary))
        .route("/api/core/plugin/marketplace/list", get(modules::plugin::handlers::list_plugins))
        .route("/api/core/plugin/marketplace/categories", get(modules::plugin::handlers::list_categories))
        .route("/api/core/plugin/plugins/{code}", get(modules::plugin::handlers::get_plugin))
        .route("/api/core/plugin/plugins/{plugin_id}/versions", get(modules::plugin::handlers::get_plugin_versions))
        .route("/api/core/plugin/plugins/{plugin_id}/reviews", get(modules::plugin::handlers::get_plugin_reviews))
        .route("/api/core/plugin/runtime/list", get(modules::plugin::handlers::list_plugins_with_status))
        .route("/api/core/plugin/tenant/{tenant_id}/plugins", get(modules::plugin::handlers::list_tenant_plugins))
        .route("/api/core/plugin/tenant/{tenant_id}/available", get(modules::plugin::handlers::get_available_plugins))
        .route("/api/core/plugins/my", get(modules::plugin::handlers::list_my_plugins))
        .route("/api/core/plugin/plugins/{code}/status", get(modules::plugin::handlers::get_plugin_status))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("plugin:read")));

    let plugin_write_routes = Router::new()
        .route("/api/core/plugin/plugins/{plugin_id}/reviews", post(modules::plugin::handlers::create_review))
        .route("/api/core/plugin/dev/plugins", post(modules::plugin::handlers::upload_plugin))
        .route("/api/core/plugin/dev/plugins/{code}", put(modules::plugin::handlers::update_plugin))
        .route("/api/core/plugin/dev/plugins/{code}/publish", post(modules::plugin::handlers::publish_plugin))
        .route("/api/core/plugin/dev/plugins/{code}/unpublish", post(modules::plugin::handlers::unpublish_plugin))
        .route("/api/core/plugin/dev/plugins/{plugin_code}/versions", post(modules::plugin::handlers::upload_plugin_version))
        .route("/api/core/plugin/dev/plugins/{code}/register", post(modules::plugin::handlers::register_plugin))
        .route("/api/core/plugin/dev/plugins/{code}/status", put(modules::plugin::handlers::update_plugin_status))
        .route("/api/core/plugin/dev/plugins/{code}/unregister", post(modules::plugin::handlers::unregister_plugin))
        .route("/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/install", post(modules::plugin::handlers::install_plugin))
        .route("/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/uninstall", post(modules::plugin::handlers::uninstall_plugin))
        .route("/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/activate", post(modules::plugin::handlers::activate_plugin))
        .route("/api/core/plugin/tenant/{tenant_id}/plugins/{plugin_code}/deactivate", post(modules::plugin::handlers::deactivate_plugin))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("plugin:write")));

    // ----- Finance Routes -----
    let finance_read_routes = Router::new()
        .route("/api/core/finance/accounts", get(modules::finance::handlers::list_accounts))
        .route("/api/core/finance/accounts/{id}", get(modules::finance::handlers::get_account))
        .route("/api/core/finance/vouchers", get(modules::finance::handlers::list_vouchers))
        .route("/api/core/finance/vouchers/{id}", get(modules::finance::handlers::get_voucher))
        .route("/api/core/finance/ledger", get(modules::finance::handlers::get_ledger))
        .route("/api/core/finance/trial-balance/{period}", get(modules::finance::handlers::get_trial_balance))
        .route("/api/core/finance/balance-sheet/{period}", get(modules::finance::handlers::get_balance_sheet))
        .route("/api/core/finance/income-statement/{period}", get(modules::finance::handlers::get_income_statement))
        .route("/api/core/finance/aux-accounts", get(modules::finance::handlers::list_aux_accounts))
        .route("/api/core/finance/aux-ledger", get(modules::finance::handlers::get_aux_ledger))
        .route("/api/core/finance/aux-balance", get(modules::finance::handlers::get_aux_balance))
        .route("/api/core/finance/cash-flow/{period}", get(modules::finance::handlers::get_cash_flow))
        .route("/api/core/finance/periods/{year}/{month}/open", get(modules::finance::handlers::open_period))
        .route("/api/core/finance/periods/{year}/{month}/close", get(modules::finance::handlers::close_period))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("finance:read")));

    let finance_write_routes = Router::new()
        .route("/api/core/finance/accounts", post(modules::finance::handlers::create_account))
        .route("/api/core/finance/vouchers", post(modules::finance::handlers::create_voucher))
        .route("/api/core/finance/vouchers/{id}/submit", post(modules::finance::handlers::submit_voucher))
        .route("/api/core/finance/vouchers/{id}/approve", post(modules::finance::handlers::approve_voucher))
        .route("/api/core/finance/vouchers/{id}/post", post(modules::finance::handlers::post_voucher))
        .route("/api/core/finance/aux-accounts", post(modules::finance::handlers::create_aux_account))
        .route("/api/core/finance/vouchers/batch/submit", post(modules::finance::handlers::batch_submit_vouchers))
        .route("/api/core/finance/vouchers/batch/approve", post(modules::finance::handlers::batch_approve_vouchers))
        .route("/api/core/finance/vouchers/batch/post", post(modules::finance::handlers::batch_post_vouchers))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("finance:write")));

    // ----- AI Routes -----
    let ai_read_routes = Router::new()
        .route("/api/core/ai/templates", get(modules::ai::list_templates))
        .route("/api/core/ai/vectors/stats", get(modules::ai::vector_stats))
        .route("/api/core/ai/health", get(modules::ai::ai_health))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("ai:read")));

    let ai_write_routes = Router::new()
        .route("/api/core/ai/chat", post(modules::ai::chat))
        .route("/api/core/ai/generate", post(modules::ai::generate))
        .route("/api/core/ai/summarize", post(modules::ai::summarize))
        .route("/api/core/ai/vectors/search", post(modules::ai::vector_search))
        .route("/api/core/ai/vectors/clear", post(modules::ai::clear_vectors))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("ai:write")));

    // ----- Sync Routes -----
    let sync_read_routes = Router::new()
        .route("/api/core/sync/task/{task_id}", get(modules::sync::handlers::get_task))
        .route("/api/core/sync/pending", get(modules::sync::handlers::get_pending))
        .route("/api/core/sync/statistics", get(modules::sync::handlers::get_statistics))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("sync:read")));

    let sync_write_routes = Router::new()
        .route("/api/core/sync/task", post(modules::sync::handlers::create_task))
        .route("/api/core/sync/task/{task_id}/status", post(modules::sync::handlers::update_status))
        .route("/api/core/sync/retry-failed", post(modules::sync::handlers::retry_failed))
        .route("/api/core/sync/trigger/scm-to-wms", post(modules::sync::handlers::trigger_scm_wms))
        .route("/api/core/sync/trigger/wms-to-crm", post(modules::sync::handlers::trigger_wms_crm))
        .route("/api/core/sync/trigger/srm-to-scm", post(modules::sync::handlers::trigger_srm_scm))
        .layer(axum::middleware::from_fn_with_state(state.clone(), require_permission("sync:write")));

    // ----- Health & Metrics (with auth) -----
    let health_routes = Router::new()
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    // ===== Merge all protected routes with their respective permission middleware =====
    let protected_routes = auth_operations_routes
        .merge(iam_read_routes)
        .merge(iam_write_routes)
        .merge(iam_delete_routes)
        .merge(doc_read_routes)
        .merge(doc_write_routes)
        .merge(doc_delete_routes)
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
        .merge(finance_read_routes)
        .merge(finance_write_routes)
        .merge(ai_read_routes)
        .merge(ai_write_routes)
        .merge(sync_read_routes)
        .merge(sync_write_routes)
        .merge(health_routes)
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
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
        None => return Err((StatusCode::NOT_FOUND, "Plugin not found or not running".to_string())),
    };

    // 2. 构造目标 URL
    // base_path 格式如 "/api/plugins/erp"，remaining 格式如 "api/plugins/erp/xxx"
    // 需要去掉 base_path 前缀得到 "/xxx"
    let base_path_str = base_path.trim_start_matches('/');
    let path_suffix: String = if remaining.starts_with(&base_path) {
        remaining.strip_prefix(&base_path).unwrap_or(&remaining).to_string()
    } else if remaining.starts_with(base_path_str) {
        remaining.strip_prefix(base_path_str).unwrap_or(&remaining).to_string()
    } else {
        // 如果都不匹配，直接使用剩余路径（加上前导斜杠）
        format!("/{}", remaining)
    };
    let target_url = format!("{}{}", runtime_url.trim_end_matches('/'), path_suffix);

    tracing::info!("[Plugin Proxy] Forwarding {} -> {}", request.uri(), target_url);

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
    let response = req_builder.send()
        .await
        .map_err(|e| {
            tracing::info!("[Plugin Proxy] Failed to forward request: {}", e);
            (StatusCode::BAD_GATEWAY, e.to_string())
        })?;

    // 6. 转换响应
    let status = StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::OK);
    let mut builder = Response::builder().status(status);

    for (key, value) in response.headers().iter() {
        builder = builder.header(key.as_str(), value.as_bytes());
    }

    let body = response.bytes().await.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(builder.body(Body::from(body)).unwrap())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Unified Core Platform API\n\n\
     Contains: IAM + Doc + Flow + File + Communication\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response("topems-workflow", true))
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
            "doc": "active",
            "flow": "active",
            "file": "active",
            "communication": "active",
            "finance": "active"
        },
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ]
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
