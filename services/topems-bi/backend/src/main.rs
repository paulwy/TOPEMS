use axum::{
    extract::FromRef,
    extract::State,
    routing::get,
    routing::post,
    Json,
    Router,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::env;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::json;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dashboard {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDashboard {
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub report_type: String,
    pub config: serde_json::Value,
    pub data_source: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReport {
    pub name: String,
    pub description: Option<String>,
    pub report_type: String,
    pub config: serde_json::Value,
    pub data_source: Option<String>,
    pub created_by: Option<Uuid>,
}

#[derive(Clone)]
struct AppState {
    dashboards: Arc<Mutex<Vec<Dashboard>>>,
    reports: Arc<Mutex<Vec<Report>>>,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        AppState {
            dashboards: Arc::new(Mutex::new(Vec::new())),
            reports: Arc::new(Mutex::new(Vec::new())),
            auth_state,
        }
    }
}

async fn health_check() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(json!({
        "service": "topems-bi",
        "status": "healthy"
    }), "健康检查"))
}

async fn list_dashboards(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let dashboards = state.dashboards.lock().unwrap();
    Json(ApiResponse::success(json!({
        "dashboards": dashboards.clone(),
        "total": dashboards.len()
    }), "获取仪表板列表成功"))
}

async fn create_dashboard(
    State(state): State<AppState>,
    Json(payload): Json<CreateDashboard>,
) -> Json<ApiResponse<Dashboard>> {
    let mut dashboards = state.dashboards.lock().unwrap();

    let dashboard = Dashboard {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        layout: payload.layout,
        created_by: payload.created_by,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    dashboards.push(dashboard.clone());
    Json(ApiResponse::success(dashboard, "创建仪表板成功"))
}

async fn list_reports(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let reports = state.reports.lock().unwrap();
    Json(ApiResponse::success(json!({
        "reports": reports.clone(),
        "total": reports.len()
    }), "获取报表列表成功"))
}

async fn create_report(
    State(state): State<AppState>,
    Json(payload): Json<CreateReport>,
) -> Json<ApiResponse<Report>> {
    let mut reports = state.reports.lock().unwrap();

    let report = Report {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        report_type: payload.report_type,
        config: payload.config,
        data_source: payload.data_source,
        created_by: payload.created_by,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    reports.push(report.clone());
    Json(ApiResponse::success(report, "创建报表成功"))
}

async fn get_analytics_summary() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(json!({
        "key_metrics": [
            { "title": "生产效率", "value": 85.5, "unit": "%", "change": 2.3, "change_type": "increase", "icon": "📈" },
            { "title": "质量合格率", "value": 98.2, "unit": "%", "change": 0.8, "change_type": "increase", "icon": "✅" },
            { "title": "设备稼动率", "value": 92.3, "unit": "%", "change": -1.2, "change_type": "decrease", "icon": "⚙️" }
        ],
        "recent_activities": [
            { "id": 1, "type": "production", "title": "完成生产订单 PO-2024-001", "time": "10分钟前" },
            { "id": 2, "type": "quality", "title": "质量检验完成，批次 B-001", "time": "25分钟前" }
        ],
        "generated_at": Utc::now().to_rfc3339()
    }), "获取分析摘要成功"))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let refresh_secret = env::var("REFRESH_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("REFRESH_SECRET not set, using default");
            "topems-default-refresh-secret-change-me".to_string()
        });

    let token_expiry_hours: i64 = env::var("TOKEN_EXPIRY_HOURS")
        .unwrap_or_else(|_| "24".to_string())
        .parse()
        .unwrap_or(24);

    let app_state = AppState::new(AuthState::new(jwt_secret, refresh_secret, token_expiry_hours));

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/dashboards", get(list_dashboards).post(create_dashboard))
        .route("/api/v1/reports", get(list_reports).post(create_report))
        .route("/api/v1/analytics/summary", get(get_analytics_summary))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8011".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-BI 数据大屏报表中台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
