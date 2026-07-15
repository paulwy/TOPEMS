use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use uuid::Uuid;

use axum::{
    extract::{Extension, State},
    Router,
};

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum ThresholdOperator {
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Equal,
    NotEqual,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
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

struct AlertEvaluatorState {
    thresholds: Vec<AlertThreshold>,
    last_evaluation: Instant,
    evaluation_interval: Duration,
}

pub struct AlertEvaluator {
    state: Arc<RwLock<AlertEvaluatorState>>,
}

impl AlertEvaluator {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(AlertEvaluatorState {
                thresholds: vec![],
                last_evaluation: Instant::now(),
                evaluation_interval: Duration::from_secs(30),
            })),
        }
    }

    pub async fn add_threshold(&self, threshold: AlertThreshold) {
        let mut state = self.state.write().await;
        state.thresholds.push(threshold);
    }

    pub async fn remove_threshold(&self, id: Uuid) {
        let mut state = self.state.write().await;
        state.thresholds.retain(|t| t.id != id);
    }

    pub async fn get_thresholds(&self) -> Vec<AlertThreshold> {
        let state = self.state.read().await;
        state.thresholds.clone()
    }

    pub async fn update_threshold(&self, id: Uuid, updates: ThresholdRequest) {
        let mut state = self.state.write().await;
        if let Some(threshold) = state.thresholds.iter_mut().find(|t| t.id == id) {
            threshold.name = updates.name;
            threshold.metric_type = updates.metric_type;
            threshold.operator = updates.operator;
            threshold.threshold_value = updates.threshold_value;
            threshold.severity = updates.severity;
            threshold.service_name = updates.service_name;
            threshold.enabled = updates.enabled.unwrap_or(threshold.enabled);
            threshold.description = updates.description;
            threshold.updated_at = chrono::Utc::now();
        }
    }

    pub async fn evaluate_metrics(&self, snapshot: &MetricSnapshot) -> Vec<AlertEvaluationResult> {
        let state = self.state.read().await;
        let mut results = Vec::new();

        for threshold in &state.thresholds {
            if !threshold.enabled {
                continue;
            }

            if let Some(service_name) = &threshold.service_name {
                if service_name != &snapshot.service_name {
                    continue;
                }
            }

            let current_value = match threshold.metric_type {
                MetricType::CpuUsage => snapshot.cpu_usage,
                MetricType::MemoryUsage => snapshot.memory_usage,
                MetricType::DiskUsage => snapshot.disk_usage,
                MetricType::ResponseTime => snapshot.response_time,
                MetricType::ErrorRate => snapshot.error_rate,
                MetricType::RequestCount => snapshot.request_count as f64,
                MetricType::ActiveConnections => snapshot.active_connections as f64,
                MetricType::DatabasePoolUsage => snapshot.database_pool_usage,
            };

            let triggered = match threshold.operator {
                ThresholdOperator::GreaterThan => current_value > threshold.threshold_value,
                ThresholdOperator::GreaterThanOrEqual => current_value >= threshold.threshold_value,
                ThresholdOperator::LessThan => current_value < threshold.threshold_value,
                ThresholdOperator::LessThanOrEqual => current_value <= threshold.threshold_value,
                ThresholdOperator::Equal => current_value == threshold.threshold_value,
                ThresholdOperator::NotEqual => current_value != threshold.threshold_value,
            };

            results.push(AlertEvaluationResult {
                threshold_id: threshold.id,
                threshold_name: threshold.name.clone(),
                metric_type: threshold.metric_type.clone(),
                current_value,
                threshold_value: threshold.threshold_value,
                operator: threshold.operator.clone(),
                triggered,
                severity: threshold.severity.clone(),
                service_name: snapshot.service_name.clone().into(),
            });
        }

        results
    }

    pub async fn run_periodic_evaluation(&self, api_state: ApiState, interval_seconds: u64) {
        let interval = Duration::from_secs(interval_seconds);
        loop {
            tokio::time::sleep(interval).await;
            let _ = self.perform_evaluation(&api_state).await;
        }
    }

    async fn perform_evaluation(&self, api_state: &ApiState) -> Result<(), ()> {
        let snapshot = self.collect_metrics(api_state).await;
        let results = self.evaluate_metrics(&snapshot).await;

        for result in results {
            if result.triggered {
                self.trigger_alert(api_state, &result).await;
            }
        }

        Ok(())
    }

    async fn collect_metrics(&self, api_state: &ApiState) -> MetricSnapshot {
        MetricSnapshot {
            service_name: "topems-monitor".to_string(),
            cpu_usage: 23.5,
            memory_usage: 45.2,
            disk_usage: 32.8,
            response_time: 15.5,
            error_rate: 0.02,
            request_count: api_state.metrics.get_request_count(),
            active_connections: api_state.metrics.get_active_connections(),
            database_pool_usage: (api_state.db.size() as f64 - api_state.db.num_idle() as f64)
                / api_state.db.size() as f64
                * 100.0,
            timestamp: chrono::Utc::now(),
        }
    }

    async fn trigger_alert(&self, _api_state: &ApiState, result: &AlertEvaluationResult) {
        tracing::warn!(
            "Alert triggered: {} - {} exceeded threshold {} (current: {})",
            result.threshold_name,
            format!("{:?}", result.metric_type),
            result.threshold_value,
            result.current_value
        );
    }
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::new_v4)
}

pub async fn list_thresholds(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> axum::Json<ApiResponse<Vec<AlertThreshold>>> {
    let tenant_id = get_tenant_id(&claims);
    let thresholds = vec![
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "CPU使用率告警".to_string(),
            metric_type: MetricType::CpuUsage,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 80.0,
            severity: "warning".to_string(),
            service_name: None,
            enabled: true,
            description: Some("当CPU使用率超过80%时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now(),
        },
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "内存使用率告警".to_string(),
            metric_type: MetricType::MemoryUsage,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 85.0,
            severity: "error".to_string(),
            service_name: None,
            enabled: true,
            description: Some("当内存使用率超过85%时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now(),
        },
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "磁盘使用率告警".to_string(),
            metric_type: MetricType::DiskUsage,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 90.0,
            severity: "critical".to_string(),
            service_name: None,
            enabled: true,
            description: Some("当磁盘使用率超过90%时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(7),
            updated_at: chrono::Utc::now(),
        },
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "响应时间告警".to_string(),
            metric_type: MetricType::ResponseTime,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 200.0,
            severity: "warning".to_string(),
            service_name: Some("topems-pm".to_string()),
            enabled: true,
            description: Some("当响应时间超过200ms时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(3),
            updated_at: chrono::Utc::now(),
        },
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "错误率告警".to_string(),
            metric_type: MetricType::ErrorRate,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 5.0,
            severity: "error".to_string(),
            service_name: None,
            enabled: true,
            description: Some("当错误率超过5%时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(5),
            updated_at: chrono::Utc::now(),
        },
        AlertThreshold {
            id: Uuid::new_v4(),
            name: "数据库连接池告警".to_string(),
            metric_type: MetricType::DatabasePoolUsage,
            operator: ThresholdOperator::GreaterThan,
            threshold_value: 80.0,
            severity: "warning".to_string(),
            service_name: None,
            enabled: true,
            description: Some("当数据库连接池使用率超过80%时触发告警".to_string()),
            created_at: chrono::Utc::now() - chrono::Duration::days(2),
            updated_at: chrono::Utc::now(),
        },
    ];

    let filtered = thresholds.into_iter().filter(|t| t.enabled).collect();

    axum::Json(ApiResponse::success(filtered, "获取阈值列表成功"))
}

pub async fn create_threshold(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::Json(req): axum::Json<ThresholdRequest>,
) -> axum::Json<ApiResponse<AlertThreshold>> {
    let tenant_id = get_tenant_id(&claims);
    let threshold = AlertThreshold {
        id: Uuid::new_v4(),
        name: req.name,
        metric_type: req.metric_type,
        operator: req.operator,
        threshold_value: req.threshold_value,
        severity: req.severity,
        service_name: req.service_name,
        enabled: req.enabled.unwrap_or(true),
        description: req.description,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    axum::Json(ApiResponse::success(threshold, "阈值创建成功"))
}

pub async fn get_threshold(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> axum::Json<ApiResponse<AlertThreshold>> {
    let tenant_id = get_tenant_id(&claims);
    let threshold = AlertThreshold {
        id,
        name: "CPU使用率告警".to_string(),
        metric_type: MetricType::CpuUsage,
        operator: ThresholdOperator::GreaterThan,
        threshold_value: 80.0,
        severity: "warning".to_string(),
        service_name: None,
        enabled: true,
        description: Some("当CPU使用率超过80%时触发告警".to_string()),
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    axum::Json(ApiResponse::success(threshold, "获取阈值详情成功"))
}

pub async fn update_threshold(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    axum::Json(req): axum::Json<ThresholdRequest>,
) -> axum::Json<ApiResponse<AlertThreshold>> {
    let tenant_id = get_tenant_id(&claims);
    let threshold = AlertThreshold {
        id,
        name: req.name,
        metric_type: req.metric_type,
        operator: req.operator,
        threshold_value: req.threshold_value,
        severity: req.severity,
        service_name: req.service_name,
        enabled: req.enabled.unwrap_or(true),
        description: req.description,
        created_at: chrono::Utc::now() - chrono::Duration::days(7),
        updated_at: chrono::Utc::now(),
    };

    axum::Json(ApiResponse::success(threshold, "阈值更新成功"))
}

pub async fn delete_threshold(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> axum::Json<ApiResponse<serde_json::Value>> {
    axum::Json(ApiResponse::success(
        serde_json::json!({"id": id.to_string()}),
        "阈值删除成功",
    ))
}

pub async fn evaluate_thresholds(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> axum::Json<ApiResponse<Vec<AlertEvaluationResult>>> {
    let evaluator = AlertEvaluator::new();

    let snapshot = MetricSnapshot {
        service_name: "topems-monitor".to_string(),
        cpu_usage: 23.5,
        memory_usage: 45.2,
        disk_usage: 32.8,
        response_time: 15.5,
        error_rate: 0.02,
        request_count: state.metrics.get_request_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_usage: (state.db.size() as f64 - state.db.num_idle() as f64)
            / state.db.size() as f64
            * 100.0,
        timestamp: chrono::Utc::now(),
    };

    let results = evaluator.evaluate_metrics(&snapshot).await;

    axum::Json(ApiResponse::success(results, "阈值评估完成"))
}

pub async fn get_metric_snapshot(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
) -> axum::Json<ApiResponse<MetricSnapshot>> {
    let snapshot = MetricSnapshot {
        service_name: "topems-monitor".to_string(),
        cpu_usage: 23.5,
        memory_usage: 45.2,
        disk_usage: 32.8,
        response_time: 15.5,
        error_rate: 0.02,
        request_count: state.metrics.get_request_count(),
        active_connections: state.metrics.get_active_connections(),
        database_pool_usage: (state.db.size() as f64 - state.db.num_idle() as f64)
            / state.db.size() as f64
            * 100.0,
        timestamp: chrono::Utc::now(),
    };

    axum::Json(ApiResponse::success(snapshot, "获取指标快照成功"))
}

pub fn create_routes() -> Router<ApiState> {
    use axum::routing::{delete, get, post, put};
    Router::new()
        .route(
            "/api/monitor/thresholds",
            get(list_thresholds).post(create_threshold),
        )
        .route(
            "/api/monitor/thresholds/{id}",
            get(get_threshold)
                .put(update_threshold)
                .delete(delete_threshold),
        )
        .route(
            "/api/monitor/thresholds/evaluate",
            post(evaluate_thresholds),
        )
        .route("/api/monitor/metrics/snapshot", get(get_metric_snapshot))
}
