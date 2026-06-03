use axum::{
    routing::{get, post},
    Router,
    extract::State,
    Json,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use dotenv::dotenv;
use sqlx::PgPool;
use std::net::SocketAddr;
use chrono::Utc;
use serde::Serialize;
use topems_shared::auth::{auth_middleware, AuthState};
use topems_shared::cors::create_cors_layer;

mod api;
mod db;
mod models;
mod services;
mod state;
mod middleware;

use api::handlers::*;
use state::AppState;
use topems_shared::ApiResponse;

#[derive(Serialize)]
pub struct HealthInfo {
    pub service: String,
    pub version: String,
    pub status: String,
    pub database: String,
    pub timestamp: String,
}

async fn health(State(state): State<AppState>) -> Json<ApiResponse<HealthInfo>> {
    let db_status = match sqlx::query("SELECT 1")
        .fetch_one(state.repo.get_pool())
        .await {
            Ok(_) => "connected".to_string(),
            Err(e) => format!("error: {}", e),
        };
    
    let health_info = HealthInfo {
        service: "topems-flow".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        status: "running".to_string(),
        database: db_status,
        timestamp: Utc::now().to_rfc3339(),
    };
    
    Json(ApiResponse::success(health_info, "Health check"))
}

async fn home() -> &'static str {
    "TOPEMS-FLOW Workflow Engine API\n\nHealth Check: GET /health\n\nAPI Endpoints:\n- Workflows: GET/POST /api/v1/workflows, GET/PUT/DELETE /api/v1/workflows/{id}\n- Instances: GET/POST /api/v1/instances, GET /api/v1/instances/{id}, GET /api/v1/instances/{id}/details\n- Approvals: GET/POST /api/v1/approvals, GET /api/v1/approvals/{id}, POST /api/v1/approvals/{id}/process\n- Records: GET /api/v1/records, GET /api/v1/records/{approval_id}"
}

async fn connect_db() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    tracing::info!("🔌 正在连接数据库: {}", database_url);
    
    match PgPool::connect(&database_url).await {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            if let Err(e) = init_database_tables(&pool).await {
                tracing::warn!("⚠️ 数据库表初始化警告: {}", e);
            }
            pool
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            tracing::error!("💡 请确保 PostgreSQL 服务已启动并配置正确的 DATABASE_URL");
            panic!("无法连接到数据库: {}", e);
        }
    }
}

async fn init_database_tables(pool: &PgPool) -> anyhow::Result<()> {
    let migrations = vec![
        include_str!("../migrations/001_create_workflow_tables.sql"),
        include_str!("../migrations/003_add_notifications.sql"),
        include_str!("../migrations/004_migrate_existing_tables.sql"),
        include_str!("../migrations/005_workflow_version_control.sql"),
    ];
    
    for migration in migrations {
        sqlx::raw_sql(migration).execute(pool).await?;
    }
    
    tracing::info!("🗄️ 数据库表初始化完成");
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_flow=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting TOPEMS-FLOW Workflow Engine...");
    dotenv::dotenv().ok();

    let pool = connect_db().await;
    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let repo = db::WorkflowRepository::new(pool.clone());
    let engine = services::WorkflowEngine::new(repo.clone());
    let app_state = AppState { 
        repo: repo.clone(), 
        engine,
        pool: pool.clone(),
        auth_state: auth_state.clone(),
    };

    let engine_clone = app_state.engine.clone();

    // 公共路由（不需要认证）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health));

    // 受保护的 API 路由（需要认证）
    let protected_routes = Router::new()
        .route("/api/v1/workflows", get(list_workflows).post(create_workflow))
        .route(
            "/api/v1/workflows/{id}",
            get(get_workflow)
                .put(update_workflow)
                .delete(delete_workflow),
        )
        .route("/api/v1/instances", get(list_instances).post(start_instance))
        .route("/api/v1/instances/{id}", get(get_instance))
        .route("/api/v1/instances/{id}/details", get(get_instance_details))
        .route("/api/v1/approvals", get(list_approvals).post(create_approval))
        .route("/api/v1/approvals/{id}", get(get_approval))
        .route("/api/v1/approvals/{id}/process", post(process_approval))
        .route("/api/v1/records", get(get_approval_records))
        .route("/api/v1/records/{approval_id}", get(get_records_by_approval))
        .route("/api/v1/notifications/{user_id}", get(get_notifications))
        .route("/api/v1/notifications/{user_id}/count", get(get_unread_count))
        .route("/api/v1/notifications/{user_id}/read", post(mark_as_read))
        .route("/api/v1/notifications", post(create_notification))
        .route("/api/v1/statistics", get(get_statistics))
        .route("/api/v1/workflows/{id}/versions", get(list_versions).post(create_version))
        .route("/api/v1/workflows/{id}/versions/{version_id}", get(get_version).delete(delete_version))
        .route("/api/v1/workflows/{id}/versions/{version_id}/activate", post(activate_version))
        .route("/api/v1/workflows/{id}/rollback", post(rollback_version))
        .route("/api/v1/workflows/{id}/compare/{version1}/{version2}", get(compare_versions))
        .route("/api/v1/performance", get(get_performance))
        .route("/api/v1/performance/reset", post(reset_performance))
        .route("/api/v1/performance/threshold", post(set_threshold))
        .route("/api/v1/audit-logs", get(list_audit_logs))
        .route("/api/v1/audit-logs/get", get(get_audit_log))
        .route("/api/v1/audit-logs", post(create_audit_log))
        .route("/api/v1/integration/trigger", post(trigger_workflow))
        .route("/api/v1/integration/pending-approvals", post(get_pending_approvals))
        .route("/api/v1/integration/submit-approval", post(submit_approval))
        .route("/api/v1/integration/instances/{instance_id}", get(get_instance_details))
        .route("/api/v1/integration/query-instances", post(query_instances))
        .route("/api/v1/integration/workflows", get(list_workflows))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(axum::middleware::from_fn(middleware::performance_middleware))
        .with_state(app_state);

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8004".to_string())
        .parse()
        .unwrap_or(8004);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_mins(5));
        loop {
            interval.tick().await;
            match engine_clone.process_expired_approvals().await {
                Ok(count) => {
                    if count > 0 {
                        tracing::info!("Processed {} expired approvals", count);
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to process expired approvals: {}", e);
                }
            }
        }
    });

    tracing::info!("TOPEMS-FLOW Workflow Engine listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}
