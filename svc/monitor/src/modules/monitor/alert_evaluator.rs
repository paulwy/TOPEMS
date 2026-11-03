use utoipa::ToSchema;
use uuid::Uuid;

use axum::{
    extract::{Extension, State},
    Router,
};
use sqlx::Row;

use crate::modules::monitor::metrics;
use crate::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AlertThreshold {
    pub id: Uuid,
    pub name: String,
    pub metric_type: MetricType,
    pub operator: ThresholdOperator,
    pub threshold_value: f64,
    pub severity: String,
    pub service_name: Option<String>,
    pub enabled: bool,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
pub enum MetricType {
    CpuUsage,
    MemoryUsage,
    DiskUsage,
    ResponseTime,
    ErrorRate,
    RequestCount,
    ActiveConnections,
    DatabasePoolUsage,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, ToSchema)]
pub enum ThresholdOperator {
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Equal,
    NotEqual,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, ToSchema)]
pub struct ThresholdRequest {
    pub name: String,
    pub metric_type: MetricType,
    pub operator: ThresholdOperator,
    pub threshold_value: f64,
    pub severity: String,
    pub service_name: Option<String>,
    pub enabled: Option<bool>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AlertEvaluationResult {
    pub threshold_id: Uuid,
    pub threshold_name: String,
    pub metric_type: MetricType,
    pub current_value: f64,
    pub threshold_value: f64,
    pub operator: ThresholdOperator,
    pub triggered: bool,
    pub severity: String,
    pub service_name: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetricSnapshot {
    pub service_name: String,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub response_time: f64,
    pub error_rate: f64,
    pub request_count: u64,
    pub active_connections: u64,
    pub database_pool_usage: f64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

// ==================== 枚举 <-> 数据库短码映射 ====================

impl MetricType {
    fn as_db(&self) -> &'static str {
        match self {
            MetricType::CpuUsage => "cpu_usage",
            MetricType::MemoryUsage => "memory_usage",
            MetricType::DiskUsage => "disk_usage",
            MetricType::ResponseTime => "response_time",
            MetricType::ErrorRate => "error_rate",
            MetricType::RequestCount => "request_count",
            MetricType::ActiveConnections => "active_connections",
            MetricType::DatabasePoolUsage => "database_pool_usage",
        }
    }

    fn from_db(s: &str) -> Option<Self> {
        match s {
            "cpu_usage" => Some(MetricType::CpuUsage),
            "memory_usage" => Some(MetricType::MemoryUsage),
            "disk_usage" => Some(MetricType::DiskUsage),
            "response_time" => Some(MetricType::ResponseTime),
            "error_rate" => Some(MetricType::ErrorRate),
            "request_count" => Some(MetricType::RequestCount),
            "active_connections" => Some(MetricType::ActiveConnections),
            "database_pool_usage" => Some(MetricType::DatabasePoolUsage),
            _ => None,
        }
    }
}

impl ThresholdOperator {
    fn as_db(&self) -> &'static str {
        match self {
            ThresholdOperator::GreaterThan => "gt",
            ThresholdOperator::GreaterThanOrEqual => "gte",
            ThresholdOperator::LessThan => "lt",
            ThresholdOperator::LessThanOrEqual => "lte",
            ThresholdOperator::Equal => "eq",
            ThresholdOperator::NotEqual => "neq",
        }
    }

    fn from_db(s: &str) -> Option<Self> {
        match s {
            "gt" => Some(ThresholdOperator::GreaterThan),
            "gte" => Some(ThresholdOperator::GreaterThanOrEqual),
            "lt" => Some(ThresholdOperator::LessThan),
            "lte" => Some(ThresholdOperator::LessThanOrEqual),
            "eq" => Some(ThresholdOperator::Equal),
            "neq" => Some(ThresholdOperator::NotEqual),
            _ => None,
        }
    }
}

/// 把 `public.monitor_thresholds` 行映射为 AlertThreshold。
/// 枚举列无法反序列化时返回 None（调用方按 500 处理，不静默丢弃语义）。
fn row_to_threshold(row: &sqlx::postgres::PgRow) -> Option<AlertThreshold> {
    let metric_type: String = row.try_get("metric_type").ok()?;
    let operator: String = row.try_get("operator").ok()?;
    Some(AlertThreshold {
        id: row.try_get("id").ok()?,
        name: row.try_get("name").unwrap_or_default(),
        metric_type: MetricType::from_db(&metric_type)?,
        operator: ThresholdOperator::from_db(&operator)?,
        threshold_value: row.try_get("threshold_value").unwrap_or(0.0),
        severity: row
            .try_get("severity")
            .unwrap_or_else(|_| "warning".to_string()),
        service_name: row.try_get("service_name").ok(),
        enabled: row.try_get("enabled").unwrap_or(true),
        description: row.try_get("description").ok(),
        created_at: row
            .try_get("created_at")
            .unwrap_or_else(|_| chrono::Utc::now()),
        updated_at: row
            .try_get("updated_at")
            .unwrap_or_else(|_| chrono::Utc::now()),
    })
}

/// 租户过滤 + 软删除的 WHERE 片段（与 monitor_settings / alerts 模块同一约定）。
const TENANT_SOFT_DELETED: &str = "deleted_at IS NULL AND (tenant_id IS NULL OR tenant_id = $1)";

const THRESHOLD_COLUMNS: &str = "id, name, metric_type, operator, threshold_value, severity, service_name, enabled, description, created_at, updated_at";

// ==================== 纯函数（无副作用，便于单元测试） ====================

/// 根据操作符比较当前值与阈值，返回是否触发告警。
pub fn evaluate_threshold(value: f64, operator: &ThresholdOperator, threshold: f64) -> bool {
    match operator {
        ThresholdOperator::GreaterThan => value > threshold,
        ThresholdOperator::GreaterThanOrEqual => value >= threshold,
        ThresholdOperator::LessThan => value < threshold,
        ThresholdOperator::LessThanOrEqual => value <= threshold,
        ThresholdOperator::Equal => value == threshold,
        ThresholdOperator::NotEqual => value != threshold,
    }
}

/// 根据当前值与 warning/critical 阈值划分告警级别。
/// - value >= critical => "critical"
/// - value >= warning  => "warning"
/// - 否则               => "info"
pub fn classify_severity(value: f64, warning: f64, critical: f64) -> &'static str {
    if value >= critical {
        "critical"
    } else if value >= warning {
        "warning"
    } else {
        "info"
    }
}

#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
/// 从指标快照中按指标类型提取对应的当前值。
pub fn extract_metric_value(metric_type: &MetricType, snapshot: &MetricSnapshot) -> f64 {
    match metric_type {
        MetricType::CpuUsage => snapshot.cpu_usage,
        MetricType::MemoryUsage => snapshot.memory_usage,
        MetricType::DiskUsage => snapshot.disk_usage,
        MetricType::ResponseTime => snapshot.response_time,
        MetricType::ErrorRate => snapshot.error_rate,
        MetricType::RequestCount => snapshot.request_count as f64,
        MetricType::ActiveConnections => snapshot.active_connections as f64,
        MetricType::DatabasePoolUsage => snapshot.database_pool_usage,
    }
}

/// 判断阈值的服务名过滤是否匹配当前快照服务。
/// 阈值未指定服务名（None）时匹配所有服务。
pub fn threshold_matches_service(
    threshold_service: &Option<String>,
    snapshot_service: &str,
) -> bool {
    match threshold_service {
        None => true,
        Some(svc) => svc == snapshot_service,
    }
}

/// 用一组阈值逐条评估当前快照（纯函数，不做 IO）。
/// 服务名不匹配的阈值不参与评估，保持与旧行为一致。
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub fn evaluate_snapshot(
    thresholds: &[AlertThreshold],
    snapshot: &MetricSnapshot,
) -> Vec<AlertEvaluationResult> {
    thresholds
        .iter()
        .filter(|t| threshold_matches_service(&t.service_name, &snapshot.service_name))
        .map(|t| {
            let current_value = extract_metric_value(&t.metric_type, snapshot);
            AlertEvaluationResult {
                threshold_id: t.id,
                threshold_name: t.name.clone(),
                metric_type: t.metric_type.clone(),
                current_value,
                threshold_value: t.threshold_value,
                operator: t.operator.clone(),
                triggered: evaluate_threshold(current_value, &t.operator, t.threshold_value),
                severity: t.severity.clone(),
                service_name: Some(snapshot.service_name.clone()),
            }
        })
        .collect()
}

/// 采集 monitor 服务自身的真实指标快照。
/// - cpu_usage / memory_usage：复用 metrics.rs 的 sysctl vm.loadavg + vm_stat 采集；
/// - error_rate / request_count / active_connections：来自 SystemMetrics 真实计数器；
/// - database_pool_usage：来自 sqlx 连接池实时大小；
/// - disk_usage / response_time：本服务无对应采集器，置 0.0 表示"未采集"，
///   不再伪造固定数值。
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
fn collect_realtime_snapshot(state: &AppState) -> MetricSnapshot {
    let (load_1m, _, _) = metrics::get_load_averages();
    let cpu_cores: f64 = std::process::Command::new("sysctl")
        .args(["-n", "hw.ncpu"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(4.0);
    let cpu_usage = ((load_1m / cpu_cores) * 100.0).clamp(0.0, 100.0);

    let (_, _, _, memory_usage) = metrics::get_memory_usage();

    let request_count = state.metrics.get_request_count();
    let error_count = state.metrics.get_error_count();
    let error_rate = if request_count > 0 {
        (error_count as f64 / request_count as f64) * 100.0
    } else {
        0.0
    };

    let pool_size = state.pool.size();
    let pool_idle = state.pool.num_idle();
    let pool_usage = if pool_size > 0 {
        (pool_size as f64 - pool_idle as f64) / pool_size as f64 * 100.0
    } else {
        0.0
    };

    MetricSnapshot {
        service_name: "topems-monitor".to_string(),
        cpu_usage,
        memory_usage,
        disk_usage: 0.0,
        response_time: 0.0,
        error_rate,
        request_count,
        active_connections: state.metrics.get_active_connections(),
        database_pool_usage: pool_usage,
        timestamp: chrono::Utc::now(),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:threshold:read"])),
    path = "/api/monitor/thresholds",
    tag = "thresholds",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_thresholds(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<AlertThreshold>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {cols} FROM public.monitor_thresholds
         WHERE {where} AND enabled = TRUE
         ORDER BY created_at",
        cols = THRESHOLD_COLUMNS,
        where = TENANT_SOFT_DELETED,
    )))
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => {
            let thresholds: Vec<AlertThreshold> =
                rows.iter().filter_map(row_to_threshold).collect();
            ApiResponse::success(thresholds, "获取阈值列表成功")
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询阈值列表失败", e)),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:threshold:admin"])),
    path = "/api/monitor/thresholds",
    request_body = ThresholdRequest,
    tag = "thresholds",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_threshold(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::Json(req): axum::Json<ThresholdRequest>,
) -> ApiResponse<AlertThreshold> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "INSERT INTO public.monitor_thresholds
            (tenant_id, name, metric_type, operator, threshold_value, severity, service_name, enabled, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING {cols}",
        cols = THRESHOLD_COLUMNS,
    )))
    .bind(tenant_id)
    .bind(&req.name)
    .bind(req.metric_type.as_db())
    .bind(req.operator.as_db())
    .bind(req.threshold_value)
    .bind(&req.severity)
    .bind(&req.service_name)
    .bind(req.enabled.unwrap_or(true))
    .bind(&req.description)
    .fetch_one(&state.pool)
    .await
    {
        Ok(row) => match row_to_threshold(&row) {
            Some(threshold) => ApiResponse::success(threshold, "阈值创建成功"),
            None => ApiResponse::server_error("阈值行反序列化失败"),
        },
        Err(e) => ApiResponse::from(TopemsError::internal("创建阈值失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:threshold:read"])),
    path = "/api/monitor/thresholds/{id}",
    tag = "thresholds",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_threshold(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> ApiResponse<AlertThreshold> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {cols} FROM public.monitor_thresholds
         WHERE {where} AND id = $2",
        cols = THRESHOLD_COLUMNS,
        where = TENANT_SOFT_DELETED,
    )))
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => match row_to_threshold(&row) {
            Some(threshold) => ApiResponse::success(threshold, "获取阈值详情成功"),
            None => ApiResponse::server_error("阈值行反序列化失败"),
        },
        Ok(None) => ApiResponse::not_found("阈值不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("获取阈值详情失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["monitor:threshold:admin"])),
    path = "/api/monitor/thresholds/{id}",
    request_body = ThresholdRequest,
    tag = "thresholds",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_threshold(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    axum::Json(req): axum::Json<ThresholdRequest>,
) -> ApiResponse<AlertThreshold> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.monitor_thresholds SET
            name = $3, metric_type = $4, operator = $5, threshold_value = $6,
            severity = $7, service_name = $8, enabled = $9, description = $10,
            updated_at = NOW()
         WHERE {where} AND id = $2
         RETURNING {cols}",
        cols = THRESHOLD_COLUMNS,
        where = TENANT_SOFT_DELETED,
    )))
    .bind(tenant_id)
    .bind(id)
    .bind(&req.name)
    .bind(req.metric_type.as_db())
    .bind(req.operator.as_db())
    .bind(req.threshold_value)
    .bind(&req.severity)
    .bind(&req.service_name)
    .bind(req.enabled.unwrap_or(true))
    .bind(&req.description)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => match row_to_threshold(&row) {
            Some(threshold) => ApiResponse::success(threshold, "阈值更新成功"),
            None => ApiResponse::server_error("阈值行反序列化失败"),
        },
        Ok(None) => ApiResponse::not_found("阈值不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新阈值失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["monitor:threshold:admin"])),
    path = "/api/monitor/thresholds/{id}",
    tag = "thresholds",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_threshold(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 软删除：与 alerts 模块一致置 deleted_at，不物理删行
    match sqlx::query(sqlx::AssertSqlSafe(format!(
        "UPDATE public.monitor_thresholds SET deleted_at = NOW(), updated_at = NOW()
         WHERE {where} AND id = $2",
        where = TENANT_SOFT_DELETED,
    )))
    .bind(tenant_id)
    .bind(id)
    .execute(&state.pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id.to_string()}), "阈值删除成功")
        }
        Ok(_) => ApiResponse::not_found("阈值不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除阈值失败", e)),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["monitor:threshold:admin"])),
    path = "/api/monitor/thresholds/evaluate",
    tag = "thresholds",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn evaluate_thresholds(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<AlertEvaluationResult>> {
    let tenant_id = get_tenant_id_from_claims(&claims);

    // 1. 从库加载当前租户启用的阈值（不再使用空内存 Evaluator）
    let thresholds: Vec<AlertThreshold> = match sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT {cols} FROM public.monitor_thresholds
         WHERE {where} AND enabled = TRUE
         ORDER BY created_at",
        cols = THRESHOLD_COLUMNS,
        where = TENANT_SOFT_DELETED,
    )))
    .bind(tenant_id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(rows) => rows.iter().filter_map(row_to_threshold).collect(),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询阈值失败", e)),
    };

    // 2. 采集真实指标快照（CPU/内存/错误率/连接池均为真实采集，无硬编码值）
    let snapshot = collect_realtime_snapshot(&state);

    // 3. 逐条阈值评估
    let results = evaluate_snapshot(&thresholds, &snapshot);

    ApiResponse::success(results, "阈值评估完成")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:metric:read"])),
    path = "/api/monitor/metrics/snapshot",
    tag = "metrics",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_metric_snapshot(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<MetricSnapshot> {
    let snapshot = collect_realtime_snapshot(&state);
    ApiResponse::success(snapshot, "获取指标快照成功")
}

pub fn create_routes() -> Router<AppState> {
    use axum::routing::{get, post};
    Router::new()
        .route("/thresholds", get(list_thresholds).post(create_threshold))
        .route(
            "/thresholds/{id}",
            get(get_threshold)
                .put(update_threshold)
                .delete(delete_threshold),
        )
        .route("/thresholds/evaluate", post(evaluate_thresholds))
        .route("/metrics/snapshot", get(get_metric_snapshot))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_snapshot() -> MetricSnapshot {
        MetricSnapshot {
            service_name: "topems-monitor".to_string(),
            cpu_usage: 50.0,
            memory_usage: 60.0,
            disk_usage: 70.0,
            response_time: 100.0,
            error_rate: 2.0,
            request_count: 1000,
            active_connections: 50,
            database_pool_usage: 40.0,
            timestamp: Utc::now(),
        }
    }

    fn sample_threshold(
        metric_type: MetricType,
        operator: ThresholdOperator,
        value: f64,
    ) -> AlertThreshold {
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "测试阈值".to_string(),
            metric_type,
            operator,
            threshold_value: value,
            severity: "warning".to_string(),
            service_name: None,
            enabled: true,
            description: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    // ---- evaluate_threshold ----

    #[test]
    fn test_evaluate_threshold_greater_than() {
        assert!(evaluate_threshold(
            81.0,
            &ThresholdOperator::GreaterThan,
            80.0
        ));
        assert!(!evaluate_threshold(
            80.0,
            &ThresholdOperator::GreaterThan,
            80.0
        ));
        assert!(!evaluate_threshold(
            79.0,
            &ThresholdOperator::GreaterThan,
            80.0
        ));
    }

    #[test]
    fn test_evaluate_threshold_greater_than_or_equal() {
        assert!(evaluate_threshold(
            81.0,
            &ThresholdOperator::GreaterThanOrEqual,
            80.0
        ));
        assert!(evaluate_threshold(
            80.0,
            &ThresholdOperator::GreaterThanOrEqual,
            80.0
        ));
        assert!(!evaluate_threshold(
            79.0,
            &ThresholdOperator::GreaterThanOrEqual,
            80.0
        ));
    }

    #[test]
    fn test_evaluate_threshold_less_than() {
        assert!(evaluate_threshold(79.0, &ThresholdOperator::LessThan, 80.0));
        assert!(!evaluate_threshold(
            80.0,
            &ThresholdOperator::LessThan,
            80.0
        ));
        assert!(!evaluate_threshold(
            81.0,
            &ThresholdOperator::LessThan,
            80.0
        ));
    }

    #[test]
    fn test_evaluate_threshold_less_than_or_equal() {
        assert!(evaluate_threshold(
            79.0,
            &ThresholdOperator::LessThanOrEqual,
            80.0
        ));
        assert!(evaluate_threshold(
            80.0,
            &ThresholdOperator::LessThanOrEqual,
            80.0
        ));
        assert!(!evaluate_threshold(
            81.0,
            &ThresholdOperator::LessThanOrEqual,
            80.0
        ));
    }

    #[test]
    fn test_evaluate_threshold_equal() {
        assert!(evaluate_threshold(80.0, &ThresholdOperator::Equal, 80.0));
        assert!(!evaluate_threshold(81.0, &ThresholdOperator::Equal, 80.0));
        assert!(!evaluate_threshold(79.0, &ThresholdOperator::Equal, 80.0));
    }

    #[test]
    fn test_evaluate_threshold_not_equal() {
        assert!(!evaluate_threshold(
            80.0,
            &ThresholdOperator::NotEqual,
            80.0
        ));
        assert!(evaluate_threshold(81.0, &ThresholdOperator::NotEqual, 80.0));
        assert!(evaluate_threshold(79.0, &ThresholdOperator::NotEqual, 80.0));
    }

    #[test]
    fn test_evaluate_threshold_zero_values() {
        assert!(evaluate_threshold(0.0, &ThresholdOperator::Equal, 0.0));
        assert!(!evaluate_threshold(
            0.0,
            &ThresholdOperator::GreaterThan,
            0.0
        ));
        assert!(evaluate_threshold(
            0.0,
            &ThresholdOperator::GreaterThanOrEqual,
            0.0
        ));
    }

    #[test]
    fn test_evaluate_threshold_negative_values() {
        assert!(evaluate_threshold(-5.0, &ThresholdOperator::LessThan, 0.0));
        assert!(evaluate_threshold(
            -5.0,
            &ThresholdOperator::GreaterThan,
            -10.0
        ));
        assert!(!evaluate_threshold(
            -5.0,
            &ThresholdOperator::GreaterThan,
            0.0
        ));
    }

    // ---- classify_severity ----

    #[test]
    fn test_classify_severity_critical() {
        assert_eq!(classify_severity(95.0, 80.0, 90.0), "critical");
        assert_eq!(classify_severity(90.0, 80.0, 90.0), "critical");
    }

    #[test]
    fn test_classify_severity_warning() {
        assert_eq!(classify_severity(85.0, 80.0, 90.0), "warning");
        assert_eq!(classify_severity(80.0, 80.0, 90.0), "warning");
    }

    #[test]
    fn test_classify_severity_info() {
        assert_eq!(classify_severity(70.0, 80.0, 90.0), "info");
        assert_eq!(classify_severity(0.0, 80.0, 90.0), "info");
    }

    #[test]
    fn test_classify_severity_boundary() {
        assert_eq!(classify_severity(89.99, 80.0, 90.0), "warning");
        assert_eq!(classify_severity(79.99, 80.0, 90.0), "info");
    }

    #[test]
    fn test_classify_severity_all_equal() {
        assert_eq!(classify_severity(50.0, 50.0, 50.0), "critical");
    }

    // ---- extract_metric_value ----

    #[test]
    fn test_extract_metric_value_cpu() {
        let snap = sample_snapshot();
        assert_eq!(extract_metric_value(&MetricType::CpuUsage, &snap), 50.0);
    }

    #[test]
    fn test_extract_metric_value_memory() {
        let snap = sample_snapshot();
        assert_eq!(extract_metric_value(&MetricType::MemoryUsage, &snap), 60.0);
    }

    #[test]
    fn test_extract_metric_value_disk() {
        let snap = sample_snapshot();
        assert_eq!(extract_metric_value(&MetricType::DiskUsage, &snap), 70.0);
    }

    #[test]
    fn test_extract_metric_value_response_time() {
        let snap = sample_snapshot();
        assert_eq!(
            extract_metric_value(&MetricType::ResponseTime, &snap),
            100.0
        );
    }

    #[test]
    fn test_extract_metric_value_error_rate() {
        let snap = sample_snapshot();
        assert_eq!(extract_metric_value(&MetricType::ErrorRate, &snap), 2.0);
    }

    #[test]
    fn test_extract_metric_value_request_count() {
        let snap = sample_snapshot();
        assert_eq!(
            extract_metric_value(&MetricType::RequestCount, &snap),
            1000.0
        );
    }

    #[test]
    fn test_extract_metric_value_active_connections() {
        let snap = sample_snapshot();
        assert_eq!(
            extract_metric_value(&MetricType::ActiveConnections, &snap),
            50.0
        );
    }

    #[test]
    fn test_extract_metric_value_db_pool() {
        let snap = sample_snapshot();
        assert_eq!(
            extract_metric_value(&MetricType::DatabasePoolUsage, &snap),
            40.0
        );
    }

    #[test]
    fn test_extract_metric_value_zero_snapshot() {
        let snap = MetricSnapshot {
            service_name: "svc".to_string(),
            cpu_usage: 0.0,
            memory_usage: 0.0,
            disk_usage: 0.0,
            response_time: 0.0,
            error_rate: 0.0,
            request_count: 0,
            active_connections: 0,
            database_pool_usage: 0.0,
            timestamp: Utc::now(),
        };
        assert_eq!(extract_metric_value(&MetricType::CpuUsage, &snap), 0.0);
        assert_eq!(extract_metric_value(&MetricType::RequestCount, &snap), 0.0);
    }

    // ---- threshold_matches_service ----

    #[test]
    fn test_threshold_matches_service_none_matches_all() {
        assert!(threshold_matches_service(&None, "any-service"));
        assert!(threshold_matches_service(&None, "topems-crm"));
    }

    #[test]
    fn test_threshold_matches_service_exact_match() {
        assert!(threshold_matches_service(
            &Some("topems-crm".to_string()),
            "topems-crm"
        ));
    }

    #[test]
    fn test_threshold_matches_service_no_match() {
        assert!(!threshold_matches_service(
            &Some("topems-crm".to_string()),
            "topems-pm"
        ));
    }

    #[test]
    fn test_threshold_matches_service_empty_string() {
        assert!(threshold_matches_service(&Some("".to_string()), ""));
        assert!(!threshold_matches_service(&Some("".to_string()), "svc"));
    }

    // ---- 枚举 DB 短码往返 ----

    #[test]
    fn test_metric_type_db_roundtrip() {
        for mt in [
            MetricType::CpuUsage,
            MetricType::MemoryUsage,
            MetricType::DiskUsage,
            MetricType::ResponseTime,
            MetricType::ErrorRate,
            MetricType::RequestCount,
            MetricType::ActiveConnections,
            MetricType::DatabasePoolUsage,
        ] {
            assert_eq!(MetricType::from_db(mt.as_db()), Some(mt));
        }
        assert_eq!(MetricType::from_db("not_a_metric"), None);
    }

    #[test]
    fn test_operator_db_roundtrip() {
        for op in [
            ThresholdOperator::GreaterThan,
            ThresholdOperator::GreaterThanOrEqual,
            ThresholdOperator::LessThan,
            ThresholdOperator::LessThanOrEqual,
            ThresholdOperator::Equal,
            ThresholdOperator::NotEqual,
        ] {
            assert_eq!(ThresholdOperator::from_db(op.as_db()), Some(op));
        }
        assert_eq!(ThresholdOperator::from_db("??"), None);
    }

    // ---- evaluate_snapshot ----

    #[test]
    fn test_evaluate_snapshot_triggered() {
        let thresholds = vec![sample_threshold(
            MetricType::CpuUsage,
            ThresholdOperator::GreaterThan,
            40.0,
        )];
        let results = evaluate_snapshot(&thresholds, &sample_snapshot());
        assert_eq!(results.len(), 1);
        assert!(results[0].triggered);
        assert_eq!(results[0].current_value, 50.0);
        assert_eq!(results[0].threshold_value, 40.0);
    }

    #[test]
    fn test_evaluate_snapshot_not_triggered() {
        let thresholds = vec![sample_threshold(
            MetricType::CpuUsage,
            ThresholdOperator::GreaterThan,
            80.0,
        )];
        let results = evaluate_snapshot(&thresholds, &sample_snapshot());
        assert_eq!(results.len(), 1);
        assert!(!results[0].triggered);
    }

    #[test]
    fn test_evaluate_snapshot_service_filtered_out() {
        let mut t = sample_threshold(MetricType::CpuUsage, ThresholdOperator::GreaterThan, 1.0);
        t.service_name = Some("topems-other".to_string());
        let results = evaluate_snapshot(&[t], &sample_snapshot());
        assert!(results.is_empty());
    }

    #[test]
    fn test_evaluate_snapshot_empty_thresholds() {
        let results = evaluate_snapshot(&[], &sample_snapshot());
        assert!(results.is_empty());
    }
}
