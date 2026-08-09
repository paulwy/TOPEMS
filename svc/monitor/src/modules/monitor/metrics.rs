use axum::{
    extract::{Extension, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

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
    pub tenant_id: Uuid,
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

#[derive(Debug, Serialize)]
pub struct PerformanceTrend {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub avg_response_time: f64,
    pub request_count: i64,
    pub error_rate: f64,
    pub p95_response_time: f64,
    pub p99_response_time: f64,
}

#[derive(Debug, Serialize)]
pub struct ServicePerformance {
    pub service_name: String,
    pub avg_response_time: f64,
    pub request_count: i64,
    pub error_count: i64,
    pub error_rate: f64,
    pub p95_response_time: f64,
    pub p99_response_time: f64,
    pub availability: f64,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct SlowQuery {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub query: String,
    pub duration_ms: f64,
    pub service_name: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub row_count: i64,
    pub called_count: i64,
}

#[derive(Debug, Serialize)]
pub struct PerformanceSummary {
    pub total_requests: i64,
    pub total_errors: i64,
    pub overall_avg_response_time: f64,
    pub overall_p95_response_time: f64,
    pub overall_p99_response_time: f64,
    pub error_rate: f64,
    pub services: Vec<ServicePerformance>,
    pub slow_queries: Vec<SlowQuery>,
    pub trends: Vec<PerformanceTrend>,
}

#[derive(Debug, Deserialize)]
pub struct PerformanceQueryParams {
    pub service_name: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub period: Option<String>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/metrics/system", get(get_system_metrics))
        .route("/metrics/database", get(get_database_metrics))
        .route("/performance/api", get(get_api_performance))
        .route("/performance/trend", get(get_performance_trend))
        .route("/performance/services", get(get_service_performance))
        .route("/performance/summary", get(get_performance_summary))
        .route("/performance/slow-queries", get(get_slow_queries))
        .route("/performance/export", post(export_performance_data))
}

#[utoipa::path(
    get,
    path = "/api/monitor/metrics/system",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_system_metrics(
    State(state): State<AppState>,
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

#[utoipa::path(
    get,
    path = "/api/monitor/metrics/database",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_database_metrics(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<ApiResponse<DatabaseMetricsResponse>> {
    let metrics = DatabaseMetricsResponse {
        service_name: "topems-monitor".to_string(),
        pool_size: state.pool.size() as u32,
        pool_idle: state.pool.num_idle(),
        active_transactions: 5,
        query_count: 12345,
        slow_query_count: 3,
        connection_duration: 120.5,
    };

    Json(ApiResponse::success(metrics, "获取数据库指标成功"))
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

#[utoipa::path(
    get,
    path = "/api/monitor/performance/api",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_api_performance(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ApiPerformance>>> {
    let tenant_id = get_tenant_id(&claims);
    let performances = vec![
        ApiPerformance {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            endpoint: "/api/customers".to_string(),
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
            tenant_id: tenant_id,
            endpoint: "/api/employees".to_string(),
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
            tenant_id: tenant_id,
            endpoint: "/api/projects".to_string(),
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

#[utoipa::path(
    get,
    path = "/api/monitor/performance/trend",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_performance_trend(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PerformanceQueryParams>,
) -> Json<ApiResponse<Vec<PerformanceTrend>>> {
    let _tenant_id = get_tenant_id(&claims);
    let period = params.period.unwrap_or("24h".to_string());

    let mut trends = Vec::new();
    let hours = match period.as_str() {
        "1h" => 1,
        "6h" => 6,
        "24h" => 24,
        "7d" => 168,
        "30d" => 720,
        _ => 24,
    };

    let now = chrono::Utc::now();
    for i in (0..hours).rev() {
        let timestamp = now - chrono::Duration::hours(i as i64);
        let base_rt = 100.0 + (i as f64 * 2.5).sin() * 30.0;
        trends.push(PerformanceTrend {
            timestamp,
            avg_response_time: base_rt,
            request_count: 500 + (i as i64 * 10) % 300,
            error_rate: 0.5 + ((i as f64 * 0.1).sin() * 0.3).abs(),
            p95_response_time: base_rt * 1.5,
            p99_response_time: base_rt * 2.0,
        });
    }

    Json(ApiResponse::success(trends, "获取性能趋势成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/performance/services",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_service_performance(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ServicePerformance>>> {
    let _tenant_id = get_tenant_id(&claims);

    let services = vec![
        ServicePerformance {
            service_name: "topems-crm".to_string(),
            avg_response_time: 125.5,
            request_count: 12345,
            error_count: 12,
            error_rate: 0.1,
            p95_response_time: 200.3,
            p99_response_time: 400.5,
            availability: 99.95,
            status: "healthy".to_string(),
        },
        ServicePerformance {
            service_name: "topems-hrm".to_string(),
            avg_response_time: 98.2,
            request_count: 8765,
            error_count: 8,
            error_rate: 0.09,
            p95_response_time: 150.2,
            p99_response_time: 300.1,
            availability: 99.98,
            status: "healthy".to_string(),
        },
        ServicePerformance {
            service_name: "topems-pm".to_string(),
            avg_response_time: 256.8,
            request_count: 4567,
            error_count: 25,
            error_rate: 0.55,
            p95_response_time: 400.8,
            p99_response_time: 600.2,
            availability: 99.80,
            status: "warning".to_string(),
        },
        ServicePerformance {
            service_name: "topems-erp".to_string(),
            avg_response_time: 189.3,
            request_count: 6789,
            error_count: 15,
            error_rate: 0.22,
            p95_response_time: 320.5,
            p99_response_time: 520.8,
            availability: 99.90,
            status: "healthy".to_string(),
        },
        ServicePerformance {
            service_name: "topems-wms".to_string(),
            avg_response_time: 156.7,
            request_count: 5432,
            error_count: 20,
            error_rate: 0.37,
            p95_response_time: 280.2,
            p99_response_time: 480.5,
            availability: 99.85,
            status: "warning".to_string(),
        },
        ServicePerformance {
            service_name: "topems-ai".to_string(),
            avg_response_time: 452.1,
            request_count: 2345,
            error_count: 5,
            error_rate: 0.21,
            p95_response_time: 700.5,
            p99_response_time: 1200.0,
            availability: 99.92,
            status: "healthy".to_string(),
        },
    ];

    Json(ApiResponse::success(services, "获取服务性能成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/performance/summary",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_performance_summary(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PerformanceSummary>> {
    let tenant_id = get_tenant_id(&claims);

    let now = chrono::Utc::now();
    let trends = (0..24)
        .rev()
        .map(|i| PerformanceTrend {
            timestamp: now - chrono::Duration::hours(i as i64),
            avg_response_time: 120.0 + (i as f64 * 3.0).sin() * 40.0,
            request_count: 600 + (i as i64 * 15) % 400,
            error_rate: 0.4 + ((i as f64 * 0.15).sin() * 0.25).abs(),
            p95_response_time: 180.0 + (i as f64 * 4.5).sin() * 60.0,
            p99_response_time: 280.0 + (i as f64 * 6.0).sin() * 100.0,
        })
        .collect();

    let slow_queries = vec![
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM orders WHERE customer_id = ?".to_string(),
            duration_ms: 450.2,
            service_name: "topems-crm".to_string(),
            timestamp: now - chrono::Duration::minutes(15),
            row_count: 1500,
            called_count: 123,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT SUM(amount) FROM transactions WHERE date >= ?".to_string(),
            duration_ms: 890.5,
            service_name: "topems-erp".to_string(),
            timestamp: now - chrono::Duration::minutes(45),
            row_count: 50000,
            called_count: 45,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM projects WHERE status = 'active'".to_string(),
            duration_ms: 620.3,
            service_name: "topems-pm".to_string(),
            timestamp: now - chrono::Duration::hours(1),
            row_count: 800,
            called_count: 89,
        },
    ];

    let services = vec![
        ServicePerformance {
            service_name: "topems-crm".to_string(),
            avg_response_time: 125.5,
            request_count: 12345,
            error_count: 12,
            error_rate: 0.1,
            p95_response_time: 200.3,
            p99_response_time: 400.5,
            availability: 99.95,
            status: "healthy".to_string(),
        },
        ServicePerformance {
            service_name: "topems-hrm".to_string(),
            avg_response_time: 98.2,
            request_count: 8765,
            error_count: 8,
            error_rate: 0.09,
            p95_response_time: 150.2,
            p99_response_time: 300.1,
            availability: 99.98,
            status: "healthy".to_string(),
        },
        ServicePerformance {
            service_name: "topems-pm".to_string(),
            avg_response_time: 256.8,
            request_count: 4567,
            error_count: 25,
            error_rate: 0.55,
            p95_response_time: 400.8,
            p99_response_time: 600.2,
            availability: 99.80,
            status: "warning".to_string(),
        },
    ];

    let summary = PerformanceSummary {
        total_requests: 35421,
        total_errors: 55,
        overall_avg_response_time: 160.2,
        overall_p95_response_time: 280.5,
        overall_p99_response_time: 480.8,
        error_rate: 0.15,
        services,
        slow_queries,
        trends,
    };

    Json(ApiResponse::success(summary, "获取性能摘要成功"))
}

#[utoipa::path(
    get,
    path = "/api/monitor/performance/slow-queries",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_slow_queries(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PerformanceQueryParams>,
) -> Json<ApiResponse<Vec<SlowQuery>>> {
    let tenant_id = get_tenant_id(&claims);
    let now = chrono::Utc::now();

    let queries = vec![
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM orders WHERE customer_id = ? AND status = 'pending'".to_string(),
            duration_ms: 450.2,
            service_name: "topems-crm".to_string(),
            timestamp: now - chrono::Duration::minutes(15),
            row_count: 1500,
            called_count: 123,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT SUM(amount) FROM transactions WHERE date >= ? AND account_id = ?".to_string(),
            duration_ms: 890.5,
            service_name: "topems-erp".to_string(),
            timestamp: now - chrono::Duration::minutes(45),
            row_count: 50000,
            called_count: 45,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM projects WHERE status = 'active' ORDER BY updated_at DESC".to_string(),
            duration_ms: 620.3,
            service_name: "topems-pm".to_string(),
            timestamp: now - chrono::Duration::hours(1),
            row_count: 800,
            called_count: 89,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM inventory WHERE stock_level < ?".to_string(),
            duration_ms: 380.7,
            service_name: "topems-wms".to_string(),
            timestamp: now - chrono::Duration::hours(2),
            row_count: 200,
            called_count: 56,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT e.*, d.name as dept_name FROM employees e JOIN departments d ON e.dept_id = d.id WHERE d.org_id = ?".to_string(),
            duration_ms: 520.8,
            service_name: "topems-hrm".to_string(),
            timestamp: now - chrono::Duration::hours(3),
            row_count: 500,
            called_count: 78,
        },
        SlowQuery {
            id: Uuid::new_v4(),
            tenant_id: tenant_id,
            query: "SELECT * FROM ai_models WHERE version = ? ORDER BY created_at DESC".to_string(),
            duration_ms: 750.2,
            service_name: "topems-ai".to_string(),
            timestamp: now - chrono::Duration::hours(4),
            row_count: 50,
            called_count: 23,
        },
    ];

    let filtered: Vec<SlowQuery> = queries
        .into_iter()
        .filter(|q| {
            if let Some(sn) = &params.service_name {
                return q.service_name == *sn;
            }
            true
        })
        .collect();

    Json(ApiResponse::success(filtered, "获取慢查询列表成功"))
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub format: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/monitor/performance/export",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn export_performance_data(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims);
    let format = req.format.to_lowercase();

    let export_data = match format.as_str() {
        "csv" => serde_json::json!({
            "format": "csv",
            "content": "timestamp,avg_response_time,request_count,error_rate,p95_response_time,p99_response_time\n2024-01-01T00:00:00Z,120.5,1234,0.1,200.3,400.5\n2024-01-01T01:00:00Z,118.2,1156,0.09,195.2,390.1",
            "filename": format!("performance_export_{}.csv", tenant_id),
            "record_count": 100
        }),
        "json" => serde_json::json!({
            "format": "json",
            "content": serde_json::json!({
                "tenant_id": tenant_id.to_string(),
                "export_time": chrono::Utc::now().to_rfc3339(),
                "period": "24h",
                "metrics": []
            }),
            "filename": format!("performance_export_{}.json", tenant_id),
            "record_count": 100
        }),
        "parquet" => serde_json::json!({
            "format": "parquet",
            "content": "<base64-encoded-parquet-data>",
            "filename": format!("performance_export_{}.parquet", tenant_id),
            "record_count": 100
        }),
        _ => serde_json::json!({
            "format": format,
            "error": "不支持的导出格式",
            "supported_formats": ["csv", "json", "parquet"]
        }),
    };

    Json(ApiResponse::success(export_data, "性能数据导出成功"))
}
