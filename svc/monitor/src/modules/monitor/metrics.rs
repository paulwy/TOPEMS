use axum::{
    extract::{Extension, Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
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

// ==================== 纯函数（无副作用，便于单元测试） ====================

/// 指标聚合类型。
#[derive(Debug, Clone, PartialEq)]
pub enum AggregationType {
    Average,
    Sum,
    Min,
    Max,
    Count,
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 按指定聚合类型对一组数值进行聚合，空切片返回 0.0。
pub fn aggregate_metrics(values: &[f64], aggregation_type: &AggregationType) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    match aggregation_type {
        AggregationType::Average => {
            let sum: f64 = values.iter().sum();
            sum / values.len() as f64
        }
        AggregationType::Sum => values.iter().sum(),
        AggregationType::Min => values.iter().cloned().fold(f64::INFINITY, f64::min),
        AggregationType::Max => values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
        AggregationType::Count => values.len() as f64,
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    clippy::cast_sign_loss
)]
/// 计算百分位数（线性插值法）。
/// - p: 百分比，范围 0.0 ~ 100.0
/// - 空切片返回 0.0
pub fn percentile(values: &[f64], p: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted: Vec<f64> = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let n = sorted.len();
    if n == 1 {
        return sorted[0];
    }
    let rank = (p / 100.0) * (n - 1) as f64;
    let lower = rank.floor() as usize;
    let upper = rank.ceil() as usize;
    if lower == upper {
        return sorted[lower];
    }
    let fraction = rank - lower as f64;
    sorted[lower] * (1.0 - fraction) + sorted[upper] * fraction
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算错误率（百分比）：error_count / total_requests * 100
/// 总请求为 0 时返回 0.0。
pub fn calculate_error_rate(total_requests: u64, error_count: u64) -> f64 {
    if total_requests == 0 {
        return 0.0;
    }
    (error_count as f64 / total_requests as f64) * 100.0
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 计算可用性（百分比）：(total - errors) / total * 100
/// 总请求为 0 时返回 100.0（视为完全可用）。
pub fn calculate_availability(total_requests: u64, error_count: u64) -> f64 {
    if total_requests == 0 {
        return 100.0;
    }
    let success = total_requests.saturating_sub(error_count);
    (success as f64 / total_requests as f64) * 100.0
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/metrics", get(list_metrics))
        .route("/metrics/system", get(get_system_metrics))
        .route("/metrics/history", get(get_system_metrics_history))
        .route("/metrics/database", get(get_database_metrics))
        // 前端监控页 /metrics/realtime 与 /metrics/test-retry（withRetry 探活）复用系统指标
        .route("/metrics/realtime", get(get_system_metrics))
        .route("/metrics/test-retry", get(get_system_metrics))
        .route("/performance/api", get(get_api_performance))
        .route("/performance/trend", get(get_performance_trend))
        .route("/performance/services", get(get_service_performance))
        .route("/performance/summary", get(get_performance_summary))
        .route("/performance/slow-queries", get(get_slow_queries))
        .route("/performance/export", post(export_performance_data))
}

#[derive(Debug, Deserialize)]
pub struct ListMetricsQuery {
    pub category: Option<String>,
    pub limit: Option<i64>,
}

/// 前端监控页「指标列表」GET /metrics?category=&limit= 的轻量元数据兜底。
/// 返回系统已知指标的静态清单（无 DB 依赖），按 category 过滤。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:metric:read"])),
    path = "/api/monitor/metrics",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_metrics(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(q): Query<ListMetricsQuery>,
) -> ApiResponse<Vec<serde_json::Value>> {
    // 指标定义 + 实时值：CPU/内存/磁盘/网络取 sys_sampler 最近一次快照，
    // 请求量/错误数/活跃连接取服务自身计数器；status 按阈值实时判定。
    let sys = super::sys_sampler::latest_snapshot();
    let now = chrono::Utc::now().to_rfc3339();
    let cpu = f64::from(sys.cpu_usage);
    let memory = f64::from(sys.memory_usage);
    let disk = f64::from(sys.disk_usage);
    let request_count = state.metrics.get_request_count();
    let error_count = state.metrics.get_error_count();
    let active_connections = state.metrics.get_active_connections();

    let status = |v: f64, warn: f64, crit: f64| -> &'static str {
        if v >= crit {
            "critical"
        } else if v >= warn {
            "warning"
        } else {
            "normal"
        }
    };

    let all: Vec<serde_json::Value> = vec![
        serde_json::json!({"id":"cpu_usage","name":"CPU 使用率","category":"system","value":cpu,"unit":"%","status":status(cpu,70.0,90.0),"threshold_warning":70.0,"threshold_critical":90.0,"timestamp":now,"ready":sys.ready}),
        serde_json::json!({"id":"memory_usage","name":"内存使用率","category":"system","value":memory,"unit":"%","status":status(memory,75.0,90.0),"threshold_warning":75.0,"threshold_critical":90.0,"timestamp":now,"ready":sys.ready}),
        serde_json::json!({"id":"disk_usage","name":"磁盘使用率","category":"system","value":disk,"unit":"%","status":status(disk,80.0,95.0),"threshold_warning":80.0,"threshold_critical":95.0,"timestamp":now,"ready":sys.ready}),
        serde_json::json!({"id":"network_in","name":"网络入流量（累计字节）","category":"network","value":sys.net_in,"unit":"B","status":"normal","timestamp":now,"ready":sys.ready}),
        serde_json::json!({"id":"network_out","name":"网络出流量（累计字节）","category":"network","value":sys.net_out,"unit":"B","status":"normal","timestamp":now,"ready":sys.ready}),
        serde_json::json!({"id":"request_count","name":"请求总数","category":"performance","value":request_count,"unit":"req","status":"normal","timestamp":now}),
        serde_json::json!({"id":"error_count","name":"错误总数","category":"performance","value":error_count,"unit":"err","status":status(f64::from(u32::try_from(error_count).unwrap_or(u32::MAX)),100.0,500.0),"threshold_warning":100,"threshold_critical":500,"timestamp":now}),
        serde_json::json!({"id":"active_connections","name":"活跃连接","category":"network","value":active_connections,"unit":"conn","status":"normal","timestamp":now}),
    ];
    let mut items: Vec<serde_json::Value> = match &q.category {
        Some(cat) => all
            .into_iter()
            .filter(|m| m.get("category").and_then(|v| v.as_str()) == Some(cat.as_str()))
            .collect(),
        None => all,
    };
    if let Some(limit) = q.limit {
        items.truncate(usize::try_from(limit.max(0)).unwrap_or(usize::MAX));
    }
    ApiResponse::success(items, "获取指标列表成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:metric:read"])),
    path = "/api/monitor/metrics/system",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_system_metrics(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<SystemMetricsResponse> {
    // 硬件指标来自 sys_sampler 的 sysinfo 采集（后台每 5s 刷新一次，读取最近快照，
    // 未就绪时返回 0 而不是编造数值）。
    let sys = super::sys_sampler::latest_snapshot();
    let metrics = SystemMetricsResponse {
        service_name: "topems-monitor".to_string(),
        uptime: state.metrics.get_uptime(),
        uptime_seconds: state.metrics.get_uptime_seconds(),
        cpu_usage: f64::from(sys.cpu_usage),
        memory_usage: f64::from(sys.memory_usage),
        memory_total: sys.memory_total,
        memory_used: sys.memory_used,
        disk_usage: f64::from(sys.disk_usage),
        disk_total: sys.disk_total,
        disk_used: sys.disk_used,
        network_in: sys.net_in,
        network_out: sys.net_out,
        request_count: state.metrics.get_request_count(),
        error_count: state.metrics.get_error_count(),
        active_connections: state.metrics.get_active_connections(),
    };

    ApiResponse::success(metrics, "获取系统指标成功")
}

#[derive(Debug, Deserialize)]
pub struct SystemHistoryQuery {
    /// 回溯窗口（分钟），默认 60，上限 1440（采样缓冲保留 24h）
    pub minutes: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct SystemHistoryResponse {
    /// 采样间隔（秒）
    pub interval_seconds: u64,
    pub samples: Vec<super::sys_sampler::SysSample>,
}

/// 真实 CPU/内存/磁盘趋势样本。前端监控页用它替换原来 `createFlatTrend` 伪造的直线。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:metric:read"])),
    path = "/api/monitor/metrics/history",
    tag = "metrics",
    params(("minutes" = Option<i64>, Query, description = "回溯分钟数，默认 60，最大 1440")),
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_system_metrics_history(
    Extension(_claims): Extension<Claims>,
    Query(q): Query<SystemHistoryQuery>,
) -> ApiResponse<SystemHistoryResponse> {
    let minutes = q.minutes.unwrap_or(60).clamp(1, 1440);
    let samples = super::sys_sampler::history_minutes(minutes);
    ApiResponse::success(
        SystemHistoryResponse {
            interval_seconds: 5,
            samples,
        },
        "获取系统指标历史成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:metric:read"])),
    path = "/api/monitor/metrics/database",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_database_metrics(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<DatabaseMetricsResponse> {
    let pool_stats = state.db.stats();
    let metrics = DatabaseMetricsResponse {
        service_name: "topems-monitor".to_string(),
        pool_size: pool_stats.size,
        pool_idle: pool_stats.idle,
        active_transactions: 5,
        query_count: 12345,
        slow_query_count: 3,
        connection_duration: 120.5,
    };

    ApiResponse::success(metrics, "获取数据库指标成功")
}

// ==================== /metrics/realtime ====================

#[derive(Debug, Serialize)]
pub struct CpuRealtime {
    pub usage_percent: f64,
    pub load_1m: f64,
    pub load_5m: f64,
    pub load_15m: f64,
}
#[derive(Debug, Serialize)]
pub struct MemoryRealtime {
    pub total_mb: f64,
    pub used_mb: f64,
    pub free_mb: f64,
    pub usage_percent: f64,
}
#[derive(Debug, Serialize)]
pub struct NetworkRealtime {
    pub inbound_bps: u64,
    pub outbound_bps: u64,
    pub connections: u64,
}
#[derive(Debug, Serialize)]
pub struct DatabaseRealtime {
    pub active_connections: u32,
    pub idle_connections: usize,
    pub queries_per_second: f64,
    pub slow_queries_per_minute: f64,
}
#[derive(Debug, Serialize)]
pub struct RequestsRealtime {
    pub per_second: f64,
    pub error_rate: f64,
    pub avg_response_time: f64,
}
#[derive(Debug, Serialize)]
pub struct AlertsRealtime {
    pub active: i64,
    pub critical: i64,
    pub warning: i64,
}
#[derive(Debug, Serialize)]
pub struct RealtimeMetricsResponse {
    pub timestamp: String,
    pub cpu: CpuRealtime,
    pub memory: MemoryRealtime,
    pub network: NetworkRealtime,
    pub database: DatabaseRealtime,
    pub requests: RequestsRealtime,
    pub alerts: AlertsRealtime,
}

// pub(crate)：alert_evaluator.rs 的真实指标快照复用同一套 sysctl/vm_stat 采集
pub(crate) fn get_load_averages() -> (f64, f64, f64) {
    if let Ok(out) = std::process::Command::new("sysctl")
        .args(["-n", "vm.loadavg"])
        .output()
    {
        if let Ok(s) = String::from_utf8(out.stdout) {
            let p: Vec<&str> = s.split_whitespace().collect();
            if p.len() >= 3 {
                return (
                    p[0].parse().unwrap_or(0.0),
                    p[1].parse().unwrap_or(0.0),
                    p[2].parse().unwrap_or(0.0),
                );
            }
        }
    }
    (0.0, 0.0, 0.0)
}

// pub(crate)：alert_evaluator.rs 的真实指标快照复用同一套 vm_stat 采集
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub(crate) fn get_memory_usage() -> (f64, f64, f64, f64) {
    let total_bytes: u64 = std::process::Command::new("sysctl")
        .args(["-n", "hw.memsize"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(16_000_000_000);
    let total_mb = total_bytes as f64 / (1024.0 * 1024.0);
    let (mut free_pages, mut active_pages, mut wired_pages) = (0u64, 0u64, 0u64);
    if let Ok(out) = std::process::Command::new("vm_stat").output() {
        if let Ok(s) = String::from_utf8(out.stdout) {
            for line in s.lines() {
                let l = line.trim();
                let parse = |v: &str| v.trim().trim_end_matches('.').parse::<u64>().ok();
                if l.starts_with("Pages free:") {
                    free_pages = l.split(':').nth(1).and_then(parse).unwrap_or(0);
                } else if l.starts_with("Pages active:") {
                    active_pages = l.split(':').nth(1).and_then(parse).unwrap_or(0);
                } else if l.starts_with("Pages wired down:") {
                    wired_pages = l.split(':').nth(1).and_then(parse).unwrap_or(0);
                }
            }
        }
    }
    let used_mb = ((active_pages + wired_pages) * 4096) as f64 / (1024.0 * 1024.0);
    let free_mb = (free_pages * 4096) as f64 / (1024.0 * 1024.0);
    let usage_percent = if total_mb > 0.0 {
        (used_mb / total_mb) * 100.0
    } else {
        0.0
    };
    (total_mb, used_mb, free_mb, usage_percent)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/performance/api",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_api_performance(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<ApiPerformance>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    // 原先这里是 3 条写死的 demo 记录（/api/customers 125.5ms 等），会把「演示值」当成
    // 真实性能展示。真实来源应为网关 Prometheus 直方图聚合，接入前先返回空集，
    // 前端按空态渲染，不再展示编造数字。
    let _ = tenant_id;
    let performances: Vec<ApiPerformance> = Vec::new();

    ApiResponse::success(performances, "获取API性能指标成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/performance/trend",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn get_performance_trend(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PerformanceQueryParams>,
) -> ApiResponse<Vec<PerformanceTrend>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let period = params.period.unwrap_or("24h".to_string());

    // 原实现按 sin(i) 造点（avg=100+sin*30、request_count=500+…），是纯编造曲线。
    // 真实趋势需从网关 Prometheus 按时间桶聚合，接入前返回空集。
    let _ = (tenant_id, period);
    let trends: Vec<PerformanceTrend> = Vec::new();

    ApiResponse::success(trends, "获取性能趋势成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/performance/services",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_service_performance(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<ServicePerformance>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 原实现为 16 条写死的服务指标（crm 125.5ms/99.95% 等）。真实数据需按服务
    // 从 Prometheus 指标聚合，接入前返回空集。
    let _ = tenant_id;
    let services: Vec<ServicePerformance> = Vec::new();

    ApiResponse::success(services, "获取服务性能成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/performance/summary",
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
#[allow(clippy::as_conversions)]
pub async fn get_performance_summary(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<PerformanceSummary> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 原先 trends/慢查询/汇总值全是 sin 曲线与 public.demo_* 演示行，见 /performance/trend 说明。
    // 接入 Prometheus 聚合前一律空态，只保留真实可算的部分（此处无可算字段）。
    let _ = tenant_id;
    let trends: Vec<PerformanceTrend> = Vec::new();
    let slow_queries: Vec<SlowQuery> = Vec::new();
    let summary = PerformanceSummary {
        total_requests: 0,
        total_errors: 0,
        overall_avg_response_time: 0.0,
        overall_p95_response_time: 0.0,
        overall_p99_response_time: 0.0,
        error_rate: 0.0,
        services: Vec::new(),
        slow_queries,
        trends,
    };

    ApiResponse::success(summary, "获取性能摘要成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
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
) -> ApiResponse<Vec<SlowQuery>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let now = chrono::Utc::now();

    // 原为若干条 public.demo_* 编造慢查询；真实数据需 pg_stat_statements / 慢日志采集。
    let _ = (tenant_id, params.period, now);
    let queries: Vec<SlowQuery> = Vec::new();

    let filtered: Vec<SlowQuery> = queries
        .into_iter()
        .filter(|q| {
            if let Some(sn) = &params.service_name {
                return q.service_name == *sn;
            }
            true
        })
        .collect();

    ApiResponse::success(filtered, "获取慢查询列表成功")
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ExportRequest {
    pub format: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:write"])),
    path = "/api/monitor/performance/export",
    request_body = ExportRequest,
    tag = "performance",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn export_performance_data(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<ExportRequest>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);
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

    ApiResponse::success(export_data, "性能数据导出成功")
}

#[cfg(test)]
#[allow(clippy::as_conversions)]
mod tests {
    use super::*;

    // ---- aggregate_metrics ----

    #[test]
    fn test_aggregate_metrics_average() {
        let vals = vec![10.0, 20.0, 30.0, 40.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Average) - 25.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_sum() {
        let vals = vec![10.0, 20.0, 30.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Sum) - 60.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_min() {
        let vals = vec![30.0, 10.0, 20.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Min) - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_max() {
        let vals = vec![30.0, 10.0, 20.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Max) - 30.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_count() {
        let vals = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Count) - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_empty() {
        let vals: Vec<f64> = vec![];
        assert_eq!(aggregate_metrics(&vals, &AggregationType::Average), 0.0);
        assert_eq!(aggregate_metrics(&vals, &AggregationType::Sum), 0.0);
        assert_eq!(aggregate_metrics(&vals, &AggregationType::Count), 0.0);
    }

    #[test]
    fn test_aggregate_metrics_single() {
        let vals = vec![42.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Average) - 42.0).abs() < 0.001);
        assert!((aggregate_metrics(&vals, &AggregationType::Min) - 42.0).abs() < 0.001);
        assert!((aggregate_metrics(&vals, &AggregationType::Max) - 42.0).abs() < 0.001);
    }

    #[test]
    fn test_aggregate_metrics_negative() {
        let vals = vec![-5.0, -10.0, -3.0];
        assert!((aggregate_metrics(&vals, &AggregationType::Min) - (-10.0)).abs() < 0.001);
        assert!((aggregate_metrics(&vals, &AggregationType::Max) - (-3.0)).abs() < 0.001);
        assert!((aggregate_metrics(&vals, &AggregationType::Sum) - (-18.0)).abs() < 0.001);
    }

    // ---- percentile ----

    #[test]
    fn test_percentile_p50() {
        let vals = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert!((percentile(&vals, 50.0) - 3.0).abs() < 0.001);
    }

    #[test]
    fn test_percentile_p0() {
        let vals = vec![10.0, 20.0, 30.0];
        assert!((percentile(&vals, 0.0) - 10.0).abs() < 0.001);
    }

    #[test]
    fn test_percentile_p100() {
        let vals = vec![10.0, 20.0, 30.0];
        assert!((percentile(&vals, 100.0) - 30.0).abs() < 0.001);
    }

    #[test]
    fn test_percentile_p95() {
        // 100 values 0..99, p95 should be ~94.05
        let vals: Vec<f64> = (0..100).map(|i| i as f64).collect();
        let p95 = percentile(&vals, 95.0);
        assert!((94.0..=95.0).contains(&p95));
    }

    #[test]
    fn test_percentile_p99() {
        let vals: Vec<f64> = (0..100).map(|i| i as f64).collect();
        let p99 = percentile(&vals, 99.0);
        assert!((98.0..=99.0).contains(&p99));
    }

    #[test]
    fn test_percentile_empty() {
        let vals: Vec<f64> = vec![];
        assert_eq!(percentile(&vals, 50.0), 0.0);
    }

    #[test]
    fn test_percentile_single() {
        let vals = vec![42.0];
        assert_eq!(percentile(&vals, 50.0), 42.0);
        assert_eq!(percentile(&vals, 99.0), 42.0);
    }

    #[test]
    fn test_percentile_unsorted_input() {
        let vals = vec![30.0, 10.0, 20.0];
        assert!((percentile(&vals, 50.0) - 20.0).abs() < 0.001);
    }

    // ---- calculate_error_rate ----

    #[test]
    fn test_calculate_error_rate_normal() {
        assert!((calculate_error_rate(1000, 10) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_error_rate_zero_requests() {
        assert_eq!(calculate_error_rate(0, 0), 0.0);
    }

    #[test]
    fn test_calculate_error_rate_no_errors() {
        assert_eq!(calculate_error_rate(1000, 0), 0.0);
    }

    #[test]
    fn test_calculate_error_rate_all_errors() {
        assert!((calculate_error_rate(100, 100) - 100.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_error_rate_more_errors_than_requests() {
        // errors > requests (edge case): still computes ratio
        assert!((calculate_error_rate(50, 100) - 200.0).abs() < 0.001);
    }

    // ---- calculate_availability ----

    #[test]
    fn test_calculate_availability_normal() {
        assert!((calculate_availability(1000, 10) - 99.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_availability_zero_requests() {
        assert_eq!(calculate_availability(0, 0), 100.0);
    }

    #[test]
    fn test_calculate_availability_no_errors() {
        assert!((calculate_availability(1000, 0) - 100.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_availability_all_errors() {
        assert!((calculate_availability(100, 100) - 0.0).abs() < 0.001);
    }

    #[test]
    fn test_calculate_availability_more_errors_than_requests() {
        // saturating_sub prevents underflow
        assert_eq!(calculate_availability(50, 100), 0.0);
    }
}
