use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ServiceDto {
    pub id: String,
    pub name: String,
    pub description: String,
    pub url: String,
    pub icon: String,
    pub status: String,
    pub category: String,
}

#[derive(Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub service: String,
    pub service_name: String,
    pub due_date: String,
    pub priority: String,
    pub completed: bool,
    pub todo_type: String,
    pub link_url: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct NewTodo {
    pub title: String,
    pub service: String,
    pub due_date: String,
    pub priority: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub department: String,
    pub role: String,
    pub last_login: String,
}

#[derive(Serialize, Deserialize)]
pub struct MonitoringService {
    pub service_name: String,
    pub status: String,
    pub response_time_ms: u64,
    pub last_check: String,
    pub message: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MonitoringMetrics {
    pub requests_total: u64,
    pub requests_success: u64,
    pub requests_failed: u64,
    pub avg_response_time_ms: u64,
    pub active_connections: u64,
    pub memory_usage_mb: u64,
    pub cpu_usage_percent: u64,
}

#[derive(Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub rule_name: String,
    pub severity: String,
    pub message: String,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub triggered_at: chrono::DateTime<chrono::Utc>,
    pub acknowledged: bool,
}

#[derive(Serialize, Deserialize)]
pub struct LogEntry {
    #[serde(with = "chrono::serde::ts_seconds")]
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub level: String,
    pub service: String,
    pub message: String,
}

#[derive(Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub title: String,
    pub content: String,
    pub service: String,
    pub service_name: String,
    pub notification_type: String,
    pub read: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub link_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[allow(dead_code)]
pub enum HealthStatus {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unhealthy")]
    Unhealthy,
}

#[derive(Debug, Clone, Serialize)]
pub struct DependencyHealth {
    pub name: String,
    pub status: HealthStatus,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DetailedHealth {
    pub service_name: String,
    pub status: HealthStatus,
    pub message: String,
    pub timestamp: String,
    pub uptime: Option<u64>,
    pub dependencies: Option<Vec<DependencyHealth>>,
    pub response_time_ms: Option<u64>,
    pub last_check: Option<String>,
}
