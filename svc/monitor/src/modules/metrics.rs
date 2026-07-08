use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize)]
pub struct SystemMetricsResponse {
    pub service_name: String,
    pub uptime: String,
    pub uptime_seconds: u64,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub memory_total: u64,
    pub memory_used: u64,
    pub disk_usage: f64,
    pub disk_total: u64,
    pub disk_used: u64,
    pub network_in: u64,
    pub network_out: u64,
    pub request_count: u64,
    pub error_count: u64,
    pub active_connections: u64,
}

#[derive(Debug, Serialize)]
pub struct DatabaseMetricsResponse {
    pub service_name: String,
    pub pool_size: u32,
    pub pool_idle: usize,
    pub active_transactions: i64,
    pub query_count: i64,
    pub slow_query_count: i64,
    pub connection_duration: f64,
}

#[derive(Debug, Serialize)]
pub struct ApiPerformance {
    pub id: Uuid,
    pub endpoint: String,
    pub method: String,
    pub avg_response_time: f64,
    pub max_response_time: f64,
    pub min_response_time: f64,
    pub request_count: i64,
    pub error_count: i64,
    pub p95_response_time: f64,
    pub p99_response_time: f64,
    pub service_name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/monitor/metrics/system", get(get_system_metrics))
        .route(
            "/api/v1/monitor/metrics/database",
            get(get_database_metrics),
        )
        .route("/api/v1/monitor/performance/api", get(get_api_performance))
}

async fn get_system_metrics(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<SystemMetricsResponse>> {
    let metrics = SystemMetricsResponse {
        service_name: "topems-monitor".to_string(),
        uptime: state.metrics.get_uptime(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        cpu_usage: 23.5,
        memory_usage: 45.2,
        memory_total: 16_000_000_000,
        memory_used: 7_232_000_000,
        disk_usage: 32.8,
        disk_total: 500_000_000_000,
        disk_used: 164_000_000_000,
        network_in: 1_234_567_890,
        network_out: 987_654_321,
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
    };

    Json(ApiResponse::success(metrics, "获取系统指标成功"))
}

async fn get_database_metrics(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<DatabaseMetricsResponse>> {
    let metrics = DatabaseMetricsResponse {
        service_name: "topems-monitor".to_string(),
        pool_size: state.db.size() as u32,
        pool_idle: state.db.num_idle(),
        active_transactions: 5,
        query_count: 12345,
        slow_query_count: 3,
        connection_duration: 120.5,
    };

    Json(ApiResponse::success(metrics, "获取数据库指标成功"))
}

async fn get_api_performance(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ApiPerformance>>> {
    let performances = vec![
        ApiPerformance {
            id: Uuid::new_v4(),
            endpoint: "/api/v1/customers".to_string(),
            method: "GET".to_string(),
            avg_response_time: 125.5,
            max_response_time: 500.2,
            min_response_time: 50.1,
            request_count: 12345,
            error_count: 12,
            p95_response_time: 200.3,
            p99_response_time: 400.5,
            service_name: "topems-crm".to_string(),
            created_at: chrono::Utc::now(),
        },
        ApiPerformance {
            id: Uuid::new_v4(),
            endpoint: "/api/v1/employees".to_string(),
            method: "GET".to_string(),
            avg_response_time: 98.2,
            max_response_time: 350.8,
            min_response_time: 45.2,
            request_count: 8765,
            error_count: 8,
            p95_response_time: 150.2,
            p99_response_time: 300.1,
            service_name: "topems-hrm".to_string(),
            created_at: chrono::Utc::now(),
        },
        ApiPerformance {
            id: Uuid::new_v4(),
            endpoint: "/api/v1/projects".to_string(),
            method: "POST".to_string(),
            avg_response_time: 256.8,
            max_response_time: 800.5,
            min_response_time: 120.3,
            request_count: 4567,
            error_count: 25,
            p95_response_time: 400.8,
            p99_response_time: 600.2,
            service_name: "topems-pm".to_string(),
            created_at: chrono::Utc::now(),
        },
    ];

    Json(ApiResponse::success(performances, "获取API性能指标成功"))
}
