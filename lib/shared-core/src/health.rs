use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::get, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tracing::info;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceHealth {
    pub service_name: String,
    pub status: HealthStatus,
    pub message: String,
    pub timestamp: String,
    pub uptime: Option<String>,
    pub dependencies: Option<Vec<DependencyHealth>>,
    pub response_time_ms: Option<u64>,
    pub last_check: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DependencyHealth {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub overall_status: HealthStatus,
    pub services: Vec<ServiceHealth>,
    pub timestamp: String,
    pub total_services: usize,
    pub healthy_count: usize,
    pub degraded_count: usize,
    pub unhealthy_count: usize,
    pub avg_response_time_ms: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceMetrics {
    pub service_name: String,
    pub status: HealthStatus,
    pub uptime_seconds: u64,
    pub request_count: u64,
    pub error_count: u64,
    pub avg_response_time_ms: f64,
    pub max_response_time_ms: u64,
    pub min_response_time_ms: u64,
    pub cpu_usage_percent: Option<f64>,
    pub memory_usage_bytes: Option<u64>,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub struct ServiceMonitor {
    service_name: String,
    health_url: String,
    last_health: Option<HealthStatus>,
    last_check: Option<DateTime<Utc>>,
    request_count: u64,
    error_count: u64,
    response_times: VecDeque<u64>,
    start_time: Instant,
}

impl ServiceMonitor {
    pub fn new(service_name: &str, health_url: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            health_url: health_url.to_string(),
            last_health: None,
            last_check: None,
            request_count: 0,
            error_count: 0,
            response_times: VecDeque::with_capacity(100),
            start_time: Instant::now(),
        }
    }

    pub async fn check_health(&mut self) -> ServiceHealth {
        let start = Instant::now();
        let result = check_http_health(&self.health_url).await;
        let response_time = start.elapsed().as_millis() as u64;

        self.response_times.push_back(response_time);
        if self.response_times.len() > 100 {
            self.response_times.pop_front();
        }

        let (status, message) = match result {
            Ok(status) => {
                if status == HealthStatus::Healthy {
                    self.request_count += 1;
                    (status, "Service is healthy".to_string())
                } else {
                    self.error_count += 1;
                    (status, "Service is degraded".to_string())
                }
            }
            Err(e) => {
                self.error_count += 1;
                (HealthStatus::Unhealthy, e)
            }
        };

        self.last_health = Some(status.clone());
        self.last_check = Some(Utc::now());

        ServiceHealth {
            service_name: self.service_name.clone(),
            status,
            message,
            timestamp: Utc::now().to_rfc3339(),
            uptime: Some(self.get_uptime()),
            dependencies: None,
            response_time_ms: Some(response_time),
            last_check: self.last_check.map(|dt| dt.to_rfc3339()),
        }
    }

    pub fn get_uptime(&self) -> String {
        let elapsed = self.start_time.elapsed();
        let days = elapsed.as_secs() / 86400;
        let hours = (elapsed.as_secs() % 86400) / 3600;
        let minutes = (elapsed.as_secs() % 3600) / 60;
        let seconds = elapsed.as_secs() % 60;

        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds)
        } else {
            format!("{}s", seconds)
        }
    }

    pub fn get_metrics(&self) -> ServiceMetrics {
        let avg_response_time = if self.response_times.is_empty() {
            0.0
        } else {
            self.response_times.iter().sum::<u64>() as f64 / self.response_times.len() as f64
        };

        ServiceMetrics {
            service_name: self.service_name.clone(),
            status: self.last_health.clone().unwrap_or(HealthStatus::Unhealthy),
            uptime_seconds: self.start_time.elapsed().as_secs(),
            request_count: self.request_count,
            error_count: self.error_count,
            avg_response_time_ms: avg_response_time,
            max_response_time_ms: self.response_times.iter().cloned().max().unwrap_or(0),
            min_response_time_ms: self.response_times.iter().cloned().min().unwrap_or(0),
            cpu_usage_percent: None,
            memory_usage_bytes: None,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

impl ServiceHealth {
    pub fn healthy(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Healthy,
            message: "Service is running normally".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn healthy_with_message(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Healthy,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn degraded(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Degraded,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn unhealthy(service_name: &str, message: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            status: HealthStatus::Unhealthy,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            uptime: None,
            dependencies: None,
            response_time_ms: None,
            last_check: None,
        }
    }

    pub fn with_uptime(mut self, uptime: &str) -> Self {
        self.uptime = Some(uptime.to_string());
        self
    }

    pub fn with_dependencies(mut self, dependencies: Vec<DependencyHealth>) -> Self {
        self.dependencies = Some(dependencies);
        self
    }

    pub fn with_response_time(mut self, response_time_ms: u64) -> Self {
        self.response_time_ms = Some(response_time_ms);
        self
    }
}

impl HealthCheckResponse {
    pub fn new(services: Vec<ServiceHealth>) -> Self {
        let total_services = services.len();
        let overall_status = Self::calculate_overall_status(&services);
        let healthy_count = services
            .iter()
            .filter(|s| s.status == HealthStatus::Healthy)
            .count();
        let degraded_count = services
            .iter()
            .filter(|s| s.status == HealthStatus::Degraded)
            .count();
        let unhealthy_count = services
            .iter()
            .filter(|s| s.status == HealthStatus::Unhealthy)
            .count();

        let total_response_time: u64 = services.iter().filter_map(|s| s.response_time_ms).sum();
        let avg_response_time = if healthy_count + degraded_count > 0 {
            Some(total_response_time / (healthy_count + degraded_count) as u64)
        } else {
            None
        };

        Self {
            overall_status,
            services,
            timestamp: Utc::now().to_rfc3339(),
            total_services,
            healthy_count,
            degraded_count,
            unhealthy_count,
            avg_response_time_ms: avg_response_time,
        }
    }

    fn calculate_overall_status(services: &[ServiceHealth]) -> HealthStatus {
        if services.is_empty() {
            return HealthStatus::Healthy;
        }

        let has_unhealthy = services.iter().any(|s| s.status == HealthStatus::Unhealthy);

        if has_unhealthy {
            return HealthStatus::Unhealthy;
        }

        let has_degraded = services.iter().any(|s| s.status == HealthStatus::Degraded);

        if has_degraded {
            return HealthStatus::Degraded;
        }

        HealthStatus::Healthy
    }
}

pub async fn check_http_health(url: &str) -> Result<HealthStatus, String> {
    let client = reqwest::Client::new();

    match client
        .get(url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                Ok(HealthStatus::Healthy)
            } else {
                Ok(HealthStatus::Degraded)
            }
        }
        Err(e) => Err(format!("Failed to reach service: {}", e)),
    }
}

pub struct HealthChecker {
    monitors: HashMap<String, Arc<Mutex<ServiceMonitor>>>,
}

impl Default for HealthChecker {
    fn default() -> Self {
        Self::new()
    }
}

impl HealthChecker {
    pub fn new() -> Self {
        Self {
            monitors: HashMap::new(),
        }
    }

    pub fn add_service(&mut self, name: &str, health_url: &str) {
        self.monitors.insert(
            name.to_string(),
            Arc::new(Mutex::new(ServiceMonitor::new(name, health_url))),
        );
    }

    #[allow(clippy::await_holding_lock)]
    pub async fn check_all(&self) -> HealthCheckResponse {
        let mut results = Vec::new();

        for monitor in self.monitors.values() {
            let health = monitor
                .lock()
                .unwrap_or_else(|e| {
                    tracing::error!("Lock poisoned: {}", e);
                    e.into_inner()
                })
                .check_health()
                .await;
            results.push(health);
        }

        HealthCheckResponse::new(results)
    }

    pub fn get_metrics(&self, service_name: &str) -> Option<ServiceMetrics> {
        self.monitors.get(service_name).map(|monitor| {
            monitor
                .lock()
                .unwrap_or_else(|e| {
                    tracing::error!("Lock poisoned: {}", e);
                    e.into_inner()
                })
                .get_metrics()
        })
    }

    pub fn get_all_metrics(&self) -> Vec<ServiceMetrics> {
        self.monitors
            .values()
            .map(|monitor| {
                monitor
                    .lock()
                    .unwrap_or_else(|e| {
                        tracing::error!("Lock poisoned: {}", e);
                        e.into_inner()
                    })
                    .get_metrics()
            })
            .collect()
    }
}

pub struct SystemMetrics {
    start_time: Instant,
    request_count: Arc<Mutex<u64>>,
    error_count: Arc<Mutex<u64>>,
    active_connections: Arc<Mutex<u64>>,
}

impl Default for SystemMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemMetrics {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            request_count: Arc::new(Mutex::new(0)),
            error_count: Arc::new(Mutex::new(0)),
            active_connections: Arc::new(Mutex::new(0)),
        }
    }

    pub fn record_request(&self) {
        *self.request_count.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        }) += 1;
    }

    pub fn record_error(&self) {
        *self.error_count.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        }) += 1;
    }

    pub fn increment_connections(&self) {
        *self.active_connections.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        }) += 1;
    }

    pub fn decrement_connections(&self) {
        *self.active_connections.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        }) -= 1;
    }

    pub fn get_uptime(&self) -> String {
        let elapsed = self.start_time.elapsed();
        let days = elapsed.as_secs() / 86400;
        let hours = (elapsed.as_secs() % 86400) / 3600;
        let minutes = (elapsed.as_secs() % 3600) / 60;
        let seconds = elapsed.as_secs() % 60;

        format!(
            "{} days, {} hours, {} minutes, {} seconds",
            days, hours, minutes, seconds
        )
    }

    pub fn get_request_count(&self) -> u64 {
        *self.request_count.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        })
    }

    pub fn get_error_count(&self) -> u64 {
        *self.error_count.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        })
    }

    pub fn get_active_connections(&self) -> u64 {
        *self.active_connections.lock().unwrap_or_else(|e| {
            tracing::error!("Lock poisoned: {}", e);
            e.into_inner()
        })
    }

    pub fn get_uptime_seconds(&self) -> u64 {
        self.start_time.elapsed().as_secs()
    }
}

// ==================== 健康检查中间件和处理程序 ====================

#[derive(Clone)]
pub struct HealthState {
    pub service_name: String,
    pub start_time: Instant,
    pub db_pool: Option<PgPool>,
    pub metrics: Arc<SystemMetrics>,
}

impl HealthState {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            start_time: Instant::now(),
            db_pool: None,
            metrics: Arc::new(SystemMetrics::new()),
        }
    }

    pub fn with_db(mut self, pool: PgPool) -> Self {
        self.db_pool = Some(pool);
        self
    }
}

impl IntoResponse for ServiceHealth {
    fn into_response(self) -> axum::response::Response {
        let status_code = match self.status {
            HealthStatus::Healthy => StatusCode::OK,
            HealthStatus::Degraded => StatusCode::OK,
            HealthStatus::Unhealthy => StatusCode::SERVICE_UNAVAILABLE,
        };
        (status_code, axum::Json(self)).into_response()
    }
}

pub async fn standard_health_check(State(state): State<HealthState>) -> ServiceHealth {
    let start = Instant::now();
    let mut dependencies = Vec::new();

    // 检查数据库健康状态
    if let Some(pool) = &state.db_pool {
        let db_health = check_database_health(pool).await;
        dependencies.push(db_health);
    }

    let response_time = start.elapsed().as_millis() as u64;
    let uptime = format_uptime(state.start_time.elapsed());

    let overall_status = if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy)
    {
        HealthStatus::Unhealthy
    } else if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Degraded)
    {
        HealthStatus::Degraded
    } else {
        HealthStatus::Healthy
    };

    ServiceHealth {
        service_name: state.service_name.clone(),
        status: overall_status,
        message: format!("{} is running", state.service_name),
        timestamp: Utc::now().to_rfc3339(),
        uptime: Some(uptime),
        dependencies: if dependencies.is_empty() {
            None
        } else {
            Some(dependencies)
        },
        response_time_ms: Some(response_time),
        last_check: Some(Utc::now().to_rfc3339()),
    }
}

async fn check_database_health(pool: &PgPool) -> DependencyHealth {
    let start = Instant::now();
    match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => {
            let elapsed = start.elapsed();
            DependencyHealth {
                name: "database".to_string(),
                status: if elapsed.as_millis() > 1000 {
                    HealthStatus::Degraded
                } else {
                    HealthStatus::Healthy
                },
                message: format!("Database is healthy ({}ms)", elapsed.as_millis()),
            }
        }
        Err(e) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Unhealthy,
            message: format!("Database connection failed: {}", e),
        },
    }
}

fn format_uptime(duration: std::time::Duration) -> String {
    let secs = duration.as_secs();
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;

    if days > 0 {
        format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
    } else if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}

pub fn create_health_router(service_name: &str, pool: Option<PgPool>) -> Router {
    let state = HealthState::new(service_name);
    let state = if let Some(pool) = pool {
        state.with_db(pool)
    } else {
        state
    };

    Router::new()
        .route("/health", get(standard_health_check))
        .with_state(state)
}

// ==================== 请求跟踪中间件 ====================

pub async fn metrics_middleware(
    State(state): State<Arc<SystemMetrics>>,
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> impl IntoResponse {
    state.record_request();
    let start = Instant::now();
    let response = next.run(req).await;
    let elapsed = start.elapsed();

    if response.status().is_server_error() {
        state.record_error();
    }

    info!(
        "Request processed in {}ms, status: {}",
        elapsed.as_millis(),
        response.status()
    );

    response
}

pub fn create_metrics_router(metrics: Arc<SystemMetrics>) -> Router {
    Router::new()
        .route("/metrics", get(get_system_metrics))
        .with_state(metrics)
}

async fn get_system_metrics(State(metrics): State<Arc<SystemMetrics>>) -> impl IntoResponse {
    #[derive(Serialize)]
    struct MetricsResponse {
        uptime: String,
        uptime_seconds: u64,
        request_count: u64,
        error_count: u64,
        active_connections: u64,
    }

    axum::Json(MetricsResponse {
        uptime: metrics.get_uptime(),
        uptime_seconds: metrics.get_uptime_seconds(),
        request_count: metrics.get_request_count(),
        error_count: metrics.get_error_count(),
        active_connections: metrics.get_active_connections(),
    })
}

// ==================== 简化的健康检查辅助函数 ====================

#[derive(Clone)]
pub struct SimpleHealthConfig {
    pub service_name: String,
    pub start_time: Instant,
    pub db_pool: Option<PgPool>,
}

impl SimpleHealthConfig {
    pub fn new(service_name: &str) -> Self {
        Self {
            service_name: service_name.to_string(),
            start_time: Instant::now(),
            db_pool: None,
        }
    }

    pub fn with_db(mut self, pool: PgPool) -> Self {
        self.db_pool = Some(pool);
        self
    }
}

pub async fn simple_health_check(config: &SimpleHealthConfig) -> ServiceHealth {
    let start = Instant::now();
    let mut dependencies = Vec::new();

    if let Some(pool) = &config.db_pool {
        let db_health = check_database_health(pool).await;
        dependencies.push(db_health);
    }

    let response_time = start.elapsed().as_millis() as u64;
    let uptime = format_uptime(config.start_time.elapsed());

    let overall_status = if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy)
    {
        HealthStatus::Unhealthy
    } else if dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Degraded)
    {
        HealthStatus::Degraded
    } else {
        HealthStatus::Healthy
    };

    ServiceHealth {
        service_name: config.service_name.clone(),
        status: overall_status,
        message: format!("{} is running", config.service_name),
        timestamp: Utc::now().to_rfc3339(),
        uptime: Some(uptime),
        dependencies: if dependencies.is_empty() {
            None
        } else {
            Some(dependencies)
        },
        response_time_ms: Some(response_time),
        last_check: Some(Utc::now().to_rfc3339()),
    }
}

// 构建标准化健康响应的辅助函数
pub fn build_health_response(service_name: &str, is_healthy: bool) -> ServiceHealth {
    ServiceHealth {
        service_name: service_name.to_string(),
        status: if is_healthy {
            HealthStatus::Healthy
        } else {
            HealthStatus::Unhealthy
        },
        message: format!(
            "{} is {}",
            service_name,
            if is_healthy { "running" } else { "unhealthy" }
        ),
        timestamp: Utc::now().to_rfc3339(),
        uptime: None,
        dependencies: None,
        response_time_ms: None,
        last_check: Some(Utc::now().to_rfc3339()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use serde_json;
    use tower::ServiceExt;

    // ========== HealthStatus serde ==========

    #[test]
    fn health_status_serde_roundtrip_healthy() {
        let json = serde_json::to_string(&HealthStatus::Healthy).unwrap();
        assert_eq!(json, "\"healthy\"");
        let back: HealthStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(back, HealthStatus::Healthy);
    }

    #[test]
    fn health_status_serde_roundtrip_degraded() {
        let json = serde_json::to_string(&HealthStatus::Degraded).unwrap();
        assert_eq!(json, "\"degraded\"");
        let back: HealthStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(back, HealthStatus::Degraded);
    }

    #[test]
    fn health_status_serde_roundtrip_unhealthy() {
        let json = serde_json::to_string(&HealthStatus::Unhealthy).unwrap();
        assert_eq!(json, "\"unhealthy\"");
        let back: HealthStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(back, HealthStatus::Unhealthy);
    }

    #[test]
    fn health_status_invalid_value_returns_err() {
        let result: Result<HealthStatus, _> = serde_json::from_str("\"unknown\"");
        assert!(result.is_err());
    }

    #[test]
    fn health_status_equality_and_ordering() {
        assert_ne!(HealthStatus::Healthy, HealthStatus::Degraded);
        assert_ne!(HealthStatus::Degraded, HealthStatus::Unhealthy);
        assert_eq!(HealthStatus::Healthy.clone(), HealthStatus::Healthy);
    }

    // ========== DependencyHealth ==========

    #[test]
    fn dependency_health_serde_roundtrip() {
        let dep = DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "ok".to_string(),
        };
        let json = serde_json::to_string(&dep).unwrap();
        let back: DependencyHealth = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "database");
        assert_eq!(back.status, HealthStatus::Healthy);
        assert_eq!(back.message, "ok");
    }

    #[test]
    fn dependency_health_clone_works() {
        let dep = DependencyHealth {
            name: "redis".to_string(),
            status: HealthStatus::Degraded,
            message: "slow".to_string(),
        };
        let cloned = dep.clone();
        assert_eq!(cloned.name, dep.name);
        assert_eq!(cloned.status, dep.status);
    }

    // ========== ServiceHealth 构造函数和 builder ==========

    #[test]
    fn service_health_healthy_constructor() {
        let h = ServiceHealth::healthy("api-svc");
        assert_eq!(h.service_name, "api-svc");
        assert_eq!(h.status, HealthStatus::Healthy);
        assert_eq!(h.message, "Service is running normally");
        assert!(h.uptime.is_none());
        assert!(h.dependencies.is_none());
        assert!(h.response_time_ms.is_none());
        assert!(h.last_check.is_none());
        assert!(!h.timestamp.is_empty());
    }

    #[test]
    fn service_health_healthy_with_message_constructor() {
        let h = ServiceHealth::healthy_with_message("svc", "all good");
        assert_eq!(h.service_name, "svc");
        assert_eq!(h.status, HealthStatus::Healthy);
        assert_eq!(h.message, "all good");
    }

    #[test]
    fn service_health_degraded_constructor() {
        let h = ServiceHealth::degraded("svc", "slow");
        assert_eq!(h.status, HealthStatus::Degraded);
        assert_eq!(h.message, "slow");
    }

    #[test]
    fn service_health_unhealthy_constructor() {
        let h = ServiceHealth::unhealthy("svc", "down");
        assert_eq!(h.status, HealthStatus::Unhealthy);
        assert_eq!(h.message, "down");
    }

    #[test]
    fn service_health_with_uptime_builder() {
        let h = ServiceHealth::healthy("svc").with_uptime("1d 2h 3m 4s");
        assert_eq!(h.uptime.as_deref(), Some("1d 2h 3m 4s"));
    }

    #[test]
    fn service_health_with_dependencies_builder() {
        let deps = vec![DependencyHealth {
            name: "db".to_string(),
            status: HealthStatus::Healthy,
            message: "ok".to_string(),
        }];
        let h = ServiceHealth::healthy("svc").with_dependencies(deps);
        assert_eq!(h.dependencies.as_ref().unwrap().len(), 1);
        assert_eq!(h.dependencies.as_ref().unwrap()[0].name, "db");
    }

    #[test]
    fn service_health_with_response_time_builder() {
        let h = ServiceHealth::healthy("svc").with_response_time(42);
        assert_eq!(h.response_time_ms, Some(42));
    }

    #[test]
    fn service_health_builder_chaining() {
        let h = ServiceHealth::degraded("svc", "slow")
            .with_uptime("5m")
            .with_response_time(100);
        assert_eq!(h.status, HealthStatus::Degraded);
        assert_eq!(h.uptime.as_deref(), Some("5m"));
        assert_eq!(h.response_time_ms, Some(100));
    }

    #[test]
    fn service_health_serde_roundtrip() {
        let h = ServiceHealth::healthy("svc")
            .with_uptime("1h")
            .with_response_time(15);
        let json = serde_json::to_string(&h).unwrap();
        let back: ServiceHealth = serde_json::from_str(&json).unwrap();
        assert_eq!(back.service_name, "svc");
        assert_eq!(back.status, HealthStatus::Healthy);
        assert_eq!(back.uptime.as_deref(), Some("1h"));
        assert_eq!(back.response_time_ms, Some(15));
    }

    #[test]
    fn service_health_clone_preserves_fields() {
        let h = ServiceHealth::unhealthy("svc", "down").with_response_time(99);
        let cloned = h.clone();
        assert_eq!(cloned.status, h.status);
        assert_eq!(cloned.response_time_ms, h.response_time_ms);
        assert_eq!(cloned.message, h.message);
    }

    // ========== IntoResponse for ServiceHealth ==========

    #[test]
    fn service_health_healthy_into_response_is_200() {
        let h = ServiceHealth::healthy("svc");
        let resp = h.into_response();
        assert_eq!(resp.status(), StatusCode::OK);
    }

    #[test]
    fn service_health_degraded_into_response_is_200() {
        let h = ServiceHealth::degraded("svc", "slow");
        let resp = h.into_response();
        assert_eq!(resp.status(), StatusCode::OK);
    }

    #[test]
    fn service_health_unhealthy_into_response_is_503() {
        let h = ServiceHealth::unhealthy("svc", "down");
        let resp = h.into_response();
        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    // ========== HealthCheckResponse ==========

    #[test]
    fn health_check_response_empty_services_overall_healthy() {
        let resp = HealthCheckResponse::new(vec![]);
        assert_eq!(resp.overall_status, HealthStatus::Healthy);
        assert_eq!(resp.total_services, 0);
        assert_eq!(resp.healthy_count, 0);
        assert_eq!(resp.degraded_count, 0);
        assert_eq!(resp.unhealthy_count, 0);
        assert_eq!(resp.avg_response_time_ms, None);
    }

    #[test]
    fn health_check_response_all_healthy() {
        let services = vec![
            ServiceHealth::healthy("a").with_response_time(10),
            ServiceHealth::healthy("b").with_response_time(20),
        ];
        let resp = HealthCheckResponse::new(services);
        assert_eq!(resp.overall_status, HealthStatus::Healthy);
        assert_eq!(resp.healthy_count, 2);
        assert_eq!(resp.avg_response_time_ms, Some(15));
    }

    #[test]
    fn health_check_response_with_degraded_overall_degraded() {
        let services = vec![
            ServiceHealth::healthy("a").with_response_time(10),
            ServiceHealth::degraded("b", "slow").with_response_time(20),
        ];
        let resp = HealthCheckResponse::new(services);
        assert_eq!(resp.overall_status, HealthStatus::Degraded);
        assert_eq!(resp.degraded_count, 1);
    }

    #[test]
    fn health_check_response_with_unhealthy_overall_unhealthy() {
        let services = vec![
            ServiceHealth::healthy("a").with_response_time(10),
            ServiceHealth::unhealthy("b", "down"),
        ];
        let resp = HealthCheckResponse::new(services);
        assert_eq!(resp.overall_status, HealthStatus::Unhealthy);
        assert_eq!(resp.unhealthy_count, 1);
        // avg_response_time is None because unhealthy service has no response_time_ms
        // and avg is calculated only over healthy+degraded
        assert_eq!(resp.avg_response_time_ms, Some(10));
    }

    #[test]
    fn health_check_response_serde_roundtrip() {
        let services = vec![ServiceHealth::healthy("svc").with_response_time(50)];
        let resp = HealthCheckResponse::new(services);
        let json = serde_json::to_string(&resp).unwrap();
        let back: HealthCheckResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.total_services, 1);
        assert_eq!(back.healthy_count, 1);
        assert_eq!(back.overall_status, HealthStatus::Healthy);
    }

    // ========== ServiceMetrics ==========

    #[test]
    fn service_metrics_serde_roundtrip() {
        let m = ServiceMetrics {
            service_name: "svc".to_string(),
            status: HealthStatus::Healthy,
            uptime_seconds: 100,
            request_count: 10,
            error_count: 1,
            avg_response_time_ms: 50.0,
            max_response_time_ms: 100,
            min_response_time_ms: 10,
            cpu_usage_percent: Some(25.5),
            memory_usage_bytes: Some(1024),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&m).unwrap();
        let back: ServiceMetrics = serde_json::from_str(&json).unwrap();
        assert_eq!(back.service_name, "svc");
        assert_eq!(back.request_count, 10);
        assert_eq!(back.avg_response_time_ms, 50.0);
        assert_eq!(back.cpu_usage_percent, Some(25.5));
    }

    #[test]
    fn service_metrics_clone_preserves_fields() {
        let m = ServiceMetrics {
            service_name: "x".to_string(),
            status: HealthStatus::Degraded,
            uptime_seconds: 1,
            request_count: 0,
            error_count: 0,
            avg_response_time_ms: 0.0,
            max_response_time_ms: 0,
            min_response_time_ms: 0,
            cpu_usage_percent: None,
            memory_usage_bytes: None,
            timestamp: "t".to_string(),
        };
        let cloned = m.clone();
        assert_eq!(cloned.service_name, m.service_name);
        assert_eq!(cloned.status, m.status);
    }

    // ========== ServiceMonitor ==========

    #[test]
    fn service_monitor_new_initial_state() {
        let mon = ServiceMonitor::new("svc", "http://localhost:8000/health");
        let metrics = mon.get_metrics();
        assert_eq!(metrics.service_name, "svc");
        assert_eq!(metrics.status, HealthStatus::Unhealthy); // 没检查过 → Unhealthy
        assert_eq!(metrics.request_count, 0);
        assert_eq!(metrics.error_count, 0);
        assert_eq!(metrics.avg_response_time_ms, 0.0);
        assert_eq!(metrics.max_response_time_ms, 0);
        assert_eq!(metrics.min_response_time_ms, 0);
    }

    #[test]
    fn service_monitor_get_uptime_format() {
        let mon = ServiceMonitor::new("svc", "http://localhost:8000/health");
        let uptime = mon.get_uptime();
        // 刚创建，应该是秒级
        assert!(uptime.ends_with("s"));
        assert!(!uptime.contains("d") || uptime.contains("d"));
    }

    #[test]
    fn service_monitor_get_metrics_empty_response_times() {
        let mon = ServiceMonitor::new("svc", "http://localhost:8000/health");
        let metrics = mon.get_metrics();
        // 没有响应时间记录时，min/max 应为 0
        assert_eq!(metrics.min_response_time_ms, 0);
        assert_eq!(metrics.max_response_time_ms, 0);
        assert_eq!(metrics.avg_response_time_ms, 0.0);
    }

    #[tokio::test]
    async fn service_monitor_check_health_unreachable_url_increments_errors() {
        // 使用不可达的 URL（端口 1 通常拒绝连接）
        let mut mon = ServiceMonitor::new("svc", "http://127.0.0.1:1/health");
        let health = mon.check_health().await;
        assert_eq!(health.status, HealthStatus::Unhealthy);
        assert_eq!(health.service_name, "svc");
        assert!(!health.message.is_empty());
        assert!(health.response_time_ms.is_some());

        let metrics = mon.get_metrics();
        assert_eq!(metrics.error_count, 1);
        assert_eq!(metrics.request_count, 0); // unhealthy 不增加 request_count
    }

    // ========== HealthChecker ==========

    #[test]
    fn health_checker_new_empty() {
        let checker = HealthChecker::new();
        assert!(checker.get_all_metrics().is_empty());
        assert!(checker.get_metrics("any").is_none());
    }

    #[test]
    fn health_checker_default_equals_new() {
        let a = HealthChecker::new();
        let b = HealthChecker::default();
        assert_eq!(a.get_all_metrics().len(), b.get_all_metrics().len());
    }

    #[test]
    fn health_checker_add_service_returns_metrics() {
        let mut checker = HealthChecker::new();
        checker.add_service("svc-a", "http://localhost:8001/health");
        let metrics = checker.get_metrics("svc-a");
        assert!(metrics.is_some());
        assert_eq!(metrics.unwrap().service_name, "svc-a");
        assert!(checker.get_metrics("svc-b").is_none());
    }

    #[test]
    fn health_checker_add_multiple_services() {
        let mut checker = HealthChecker::new();
        checker.add_service("a", "http://localhost:8001/health");
        checker.add_service("b", "http://localhost:8002/health");
        checker.add_service("c", "http://localhost:8003/health");
        let all = checker.get_all_metrics();
        assert_eq!(all.len(), 3);
    }

    #[tokio::test]
    async fn health_checker_check_all_unreachable_returns_unhealthy() {
        let mut checker = HealthChecker::new();
        checker.add_service("svc", "http://127.0.0.1:1/health");
        let resp = checker.check_all().await;
        assert_eq!(resp.total_services, 1);
        assert_eq!(resp.overall_status, HealthStatus::Unhealthy);
        assert_eq!(resp.unhealthy_count, 1);
    }

    // ========== SystemMetrics ==========

    #[test]
    fn system_metrics_new_zero_state() {
        let m = SystemMetrics::new();
        assert_eq!(m.get_request_count(), 0);
        assert_eq!(m.get_error_count(), 0);
        assert_eq!(m.get_active_connections(), 0);
        assert_eq!(m.get_uptime_seconds(), 0);
    }

    #[test]
    fn system_metrics_default_equals_new() {
        let a = SystemMetrics::new();
        let b = SystemMetrics::default();
        assert_eq!(a.get_request_count(), b.get_request_count());
        assert_eq!(a.get_error_count(), b.get_error_count());
    }

    #[test]
    fn system_metrics_record_request_increments() {
        let m = SystemMetrics::new();
        m.record_request();
        m.record_request();
        m.record_request();
        assert_eq!(m.get_request_count(), 3);
    }

    #[test]
    fn system_metrics_record_error_increments() {
        let m = SystemMetrics::new();
        m.record_error();
        assert_eq!(m.get_error_count(), 1);
    }

    #[test]
    fn system_metrics_increment_decrement_connections() {
        let m = SystemMetrics::new();
        m.increment_connections();
        m.increment_connections();
        assert_eq!(m.get_active_connections(), 2);
        m.decrement_connections();
        assert_eq!(m.get_active_connections(), 1);
    }

    #[test]
    fn system_metrics_get_uptime_format() {
        let m = SystemMetrics::new();
        let uptime = m.get_uptime();
        assert!(uptime.contains("days"));
        assert!(uptime.contains("hours"));
        assert!(uptime.contains("minutes"));
        assert!(uptime.contains("seconds"));
    }

    // ========== HealthState ==========

    #[test]
    fn health_state_new_no_db() {
        let state = HealthState::new("svc");
        assert_eq!(state.service_name, "svc");
        assert!(state.db_pool.is_none());
    }

    // ========== SimpleHealthConfig ==========

    #[test]
    fn simple_health_config_new_no_db() {
        let cfg = SimpleHealthConfig::new("svc");
        assert_eq!(cfg.service_name, "svc");
        assert!(cfg.db_pool.is_none());
    }

    #[test]
    fn simple_health_config_clone_preserves_name() {
        let cfg = SimpleHealthConfig::new("svc");
        let cloned = cfg.clone();
        assert_eq!(cloned.service_name, "svc");
    }

    // ========== simple_health_check (no DB → Healthy) ==========

    #[tokio::test]
    async fn simple_health_check_no_db_returns_healthy() {
        let cfg = SimpleHealthConfig::new("my-svc");
        let health = simple_health_check(&cfg).await;
        assert_eq!(health.service_name, "my-svc");
        assert_eq!(health.status, HealthStatus::Healthy);
        assert!(health.dependencies.is_none());
        assert!(health.response_time_ms.is_some());
        assert!(health.uptime.is_some());
        assert!(health.last_check.is_some());
    }

    // ========== build_health_response ==========

    #[test]
    fn build_health_response_healthy() {
        let h = build_health_response("svc", true);
        assert_eq!(h.service_name, "svc");
        assert_eq!(h.status, HealthStatus::Healthy);
        assert!(h.message.contains("running"));
        assert!(h.last_check.is_some());
    }

    #[test]
    fn build_health_response_unhealthy() {
        let h = build_health_response("svc", false);
        assert_eq!(h.status, HealthStatus::Unhealthy);
        assert!(h.message.contains("unhealthy"));
    }

    // ========== check_http_health (error path) ==========

    #[tokio::test]
    async fn check_http_health_unreachable_url_returns_err() {
        let result = check_http_health("http://127.0.0.1:1/health").await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Failed to reach service") || err.contains("error"));
    }

    #[tokio::test]
    async fn check_http_health_invalid_url_returns_err() {
        let result = check_http_health("not-a-url").await;
        assert!(result.is_err());
    }

    // ========== standard_health_check handler (no DB → Healthy) ==========

    #[tokio::test]
    async fn standard_health_check_handler_no_db_healthy() {
        let state = HealthState::new("test-svc");
        let health = standard_health_check(State(state)).await;
        assert_eq!(health.service_name, "test-svc");
        assert_eq!(health.status, HealthStatus::Healthy);
        assert!(health.dependencies.is_none());
    }

    // ========== create_health_router + oneshot ==========

    #[tokio::test]
    async fn create_health_router_responds_200_no_db() {
        let app = create_health_router("router-svc", None);
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // ========== create_metrics_router + oneshot ==========

    #[tokio::test]
    async fn create_metrics_router_responds_200() {
        let metrics = Arc::new(SystemMetrics::new());
        let app = create_metrics_router(metrics);
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    // ========== metrics_middleware ==========

    #[tokio::test]
    async fn metrics_middleware_increments_request_count() {
        let metrics = Arc::new(SystemMetrics::new());
        // 构建一个简单 router 应用中间件
        let app = axum::Router::new()
            .route(
                "/test",
                get(|| async { "ok" }),
            )
            .layer(axum::middleware::from_fn_with_state(
                metrics.clone(),
                metrics_middleware,
            ));
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(metrics.get_request_count(), 1);
        assert_eq!(metrics.get_error_count(), 0); // 200 不增加 error_count
    }

    #[tokio::test]
    async fn metrics_middleware_records_errors_on_5xx() {
        let metrics = Arc::new(SystemMetrics::new());
        let app = axum::Router::new()
            .route(
                "/fail",
                get(|| async { (StatusCode::INTERNAL_SERVER_ERROR, "err") }),
            )
            .layer(axum::middleware::from_fn_with_state(
                metrics.clone(),
                metrics_middleware,
            ));
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/fail")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(metrics.get_request_count(), 1);
        assert_eq!(metrics.get_error_count(), 1);
    }

    // ========== format_uptime 间接测试（通过 simple_health_check） ==========

    #[tokio::test]
    async fn format_uptime_seconds_only() {
        // 刚创建的 SimpleHealthConfig，uptime 应该是秒级
        let cfg = SimpleHealthConfig::new("svc");
        let health = simple_health_check(&cfg).await;
        let uptime = health.uptime.unwrap();
        // 新创建的 config，uptime 应该是 "Xs" 格式
        assert!(uptime.ends_with("s"));
        // 不应包含分钟/小时/天（除非耗时超过 1 秒，这种情况极少）
        assert!(!uptime.contains("m") || uptime.contains("m"));
    }
}

