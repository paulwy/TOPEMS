//! TOPEMS QMS Service
//!
//! Unified service for QMS (Quality Management), LIMS (Laboratory), and EHS (Environment Health Safety)

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
pub mod plugin;

use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_logging, simple_health_check,
    ApiResponse, AuthState, ServiceHealth, SimpleHealthConfig,
};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-qms");

    tracing::info!("🚀 TOPEMS QMS Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
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

    // Initialize database for QMS module
    if let Err(e) = modules::qms::init_database(&pool).await {
        tracing::warn!("QMS module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-qms").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .route("/api", get(|| get_api_info_handler("qms-service")))
        .route("/api/info", get(|| get_api_info_handler("qms-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== QMS routes (prefix: /api/qms) =====
        // Quality Standards
        .route("/api/qms/standards", get(modules::qms::quality_standard::list_standards))
        .route("/api/qms/standards", post(modules::qms::quality_standard::create_standard))
        .route("/api/qms/standards/{id}", get(modules::qms::quality_standard::get_standard))
        .route("/api/qms/standards/{id}", put(modules::qms::quality_standard::update_standard))
        .route("/api/qms/standards/{id}", delete(modules::qms::quality_standard::delete_standard))
        .route("/api/qms/standards/{id}/revisions", get(modules::qms::quality_standard::list_revisions))
        .route("/api/qms/standards/{id}/revisions", post(modules::qms::quality_standard::create_revision))
        // Quality Inspections/Checks
        .route("/api/qms/checks", get(modules::qms::quality_inspection::list_inspections))
        .route("/api/qms/checks", post(modules::qms::quality_inspection::create_inspection))
        .route("/api/qms/checks/{id}", get(modules::qms::quality_inspection::get_inspection))
        .route("/api/qms/checks/{id}", put(modules::qms::quality_inspection::update_inspection))
        .route("/api/qms/checks/{id}", delete(modules::qms::quality_inspection::delete_inspection))
        .route("/api/qms/checks/{id}/assign", post(modules::qms::quality_inspection::assign_inspection))
        .route("/api/qms/checks/{id}/submit", post(modules::qms::quality_inspection::submit_result))
        .route("/api/qms/checks/{id}/audit", post(modules::qms::quality_inspection::audit_inspection))
        .route("/api/qms/checks/{id}/rework", post(modules::qms::quality_inspection::rework_inspection))
        .route("/api/qms/checks/{id}/results", get(modules::qms::quality_inspection::get_inspection_results))
        .route("/api/qms/checks/{id}/audits", get(modules::qms::quality_inspection::get_inspection_audits))
        // Quality Issues
        .route("/api/qms/issues", get(modules::qms::quality_issue::list_issues))
        .route("/api/qms/issues", post(modules::qms::quality_issue::create_issue))
        .route("/api/qms/issues/{id}", get(modules::qms::quality_issue::get_issue))
        .route("/api/qms/issues/{id}", put(modules::qms::quality_issue::update_issue))
        .route("/api/qms/issues/{id}", delete(modules::qms::quality_issue::delete_issue))
        .route("/api/qms/issues/{id}/resolve", post(modules::qms::quality_issue::resolve_issue))
        // Dashboard
        .route("/api/qms/dashboard", get(modules::qms::dashboard::get_dashboard_stats))
        // Corrective Actions
        .route("/api/qms/actions", get(modules::qms::corrective_action::list_actions))
        .route("/api/qms/actions", post(modules::qms::corrective_action::create_action))
        .route("/api/qms/actions/{id}", get(modules::qms::corrective_action::get_action))
        .route("/api/qms/actions/{id}", put(modules::qms::corrective_action::update_action))
        .route("/api/qms/actions/{id}", delete(modules::qms::corrective_action::delete_action))
        .route("/api/qms/actions/{id}/complete", post(modules::qms::corrective_action::complete_action))
        .route("/api/qms/actions/{id}/items", get(modules::qms::corrective_action::get_action_items))
        // Audit Plans
        .route("/api/qms/audit-plans", get(modules::qms::audit::list_audit_plans))
        .route("/api/qms/audit-plans", post(modules::qms::audit::create_audit_plan))
        .route("/api/qms/audit-plans/{id}", get(modules::qms::audit::get_audit_plan))
        .route("/api/qms/audit-plans/{id}/start", post(modules::qms::audit::start_audit_plan))
        .route("/api/qms/audit-plans/{id}/complete", post(modules::qms::audit::complete_audit_plan))
        // Audit Tasks
        .route("/api/qms/audit-tasks", get(modules::qms::audit::list_audit_tasks))
        .route("/api/qms/audit-plans/{plan_id}/tasks", post(modules::qms::audit::create_audit_task))
        .route("/api/qms/audit-tasks/{id}/complete", put(modules::qms::audit::complete_audit_task))
        // Audit Findings
        .route("/api/qms/audit-findings", get(modules::qms::audit::list_audit_findings))
        .route("/api/qms/audit-tasks/{task_id}/findings", post(modules::qms::audit::create_audit_finding))
        .route("/api/qms/audit-findings/{id}/verify", post(modules::qms::audit::verify_audit_finding))
        // Data Sync
        .route("/api/qms/sync-records", get(modules::qms::data_sync::list_sync_records))
        .route("/api/qms/sync-records/{id}", get(modules::qms::data_sync::get_sync_record))
        .route("/api/qms/sync-records/{id}", delete(modules::qms::data_sync::delete_sync_record))
        .route("/api/qms/sync-records/{id}/retry", post(modules::qms::data_sync::retry_sync))
        .route("/api/qms/sync/inspection-to-lims", post(modules::qms::data_sync::sync_inspection_to_lims))
        .route("/api/qms/sync/issue-to-ehs", post(modules::qms::data_sync::sync_issue_to_ehs))

        // Health & Metrics
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(modules::qms::permission::check_permission));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("QMS_PORT")
        .unwrap_or_else(|_| "8050".to_string())
        .parse()
        .unwrap_or(8050);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ QMS Service is running at http://{}", addr);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS QMS Service API\n\n\
     Unified service for QMS, LIMS and EHS\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "qms-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "qms": "active",
            "lims": "active",
            "ehs": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
