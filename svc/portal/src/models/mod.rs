pub mod audit_log;
pub mod schema_defense;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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

#[derive(Serialize, Deserialize, ToSchema)]
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

#[derive(Serialize, Deserialize, Default)]
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

#[derive(Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_users: u64,
    pub active_users: u64,
    pub total_services: u64,
    pub healthy_services: u64,
    pub pending_tasks: u64,
    pub pending_approvals: u64,
    pub new_notifications: u64,
    pub production_orders: u64,
    pub wip_count: u64,
    pub system_uptime: u64,
}

#[derive(Serialize, Deserialize)]
pub struct QuickAccess {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub url: String,
    pub service: String,
    pub category: String,
}

#[derive(Serialize, Deserialize)]
pub struct Announcement {
    pub id: String,
    pub title: String,
    pub content: String,
    pub announcement_type: String,
    pub priority: String,
    pub is_pinned: bool,
    pub is_active: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub author: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct NewAnnouncement {
    pub title: String,
    pub content: String,
    pub announcement_type: String,
    pub priority: String,
    pub expires_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct UserSettings {
    pub id: String,
    pub user_id: String,
    pub theme: String,
    pub language: String,
    pub timezone: String,
    pub notification_enabled: bool,
    pub notification_sound: bool,
    pub auto_refresh: bool,
    pub refresh_interval: u32,
    pub default_dashboard: String,
}

#[derive(Serialize, Deserialize)]
pub struct UpdateUserSettings {
    pub theme: Option<String>,
    pub language: Option<String>,
    pub timezone: Option<String>,
    pub notification_enabled: Option<bool>,
    pub notification_sound: Option<bool>,
    pub auto_refresh: Option<bool>,
    pub refresh_interval: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QuickAction {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub action_type: String,
    pub target_url: String,
    pub service: String,
    pub is_favorite: bool,
    pub usage_count: u64,
}

#[derive(Serialize, Deserialize)]
pub struct NavigationMenu {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub url: String,
    pub service: String,
    pub parent_id: Option<String>,
    pub order: u32,
    pub is_visible: bool,
    pub badge_count: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct PinnedApp {
    pub id: String,
    pub app_id: String,
    pub app_name: String,
    pub icon: String,
    pub url: String,
    pub order: u32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test] fn roundtrip_service_dto() { roundtrip(&ServiceDto { id: "x".into(), name: "x".into(), description: "x".into(), url: "x".into(), icon: "x".into(), status: "x".into(), category: "x".into() }); }
    #[test] fn roundtrip_todo() { roundtrip(&Todo { id: "x".into(), title: "x".into(), service: "x".into(), service_name: "x".into(), due_date: "x".into(), priority: "x".into(), completed: true, todo_type: "x".into(), link_url: None }); }
    #[test] fn roundtrip_new_todo() { roundtrip(&NewTodo { title: "x".into(), service: "x".into(), due_date: "x".into(), priority: "x".into() }); }
    #[test] fn roundtrip_user_info() { roundtrip(&UserInfo { id: "x".into(), name: "x".into(), email: "x".into(), avatar: "x".into(), department: "x".into(), role: "x".into(), last_login: "x".into() }); }
    #[test] fn roundtrip_monitoring_service() { roundtrip(&MonitoringService { service_name: "x".into(), status: "x".into(), response_time_ms: 0, last_check: "x".into(), message: None }); }
    #[test] fn roundtrip_monitoring_metrics() { roundtrip(&MonitoringMetrics::default()); }
    #[test] fn roundtrip_alert() { roundtrip(&Alert { id: "x".into(), rule_name: "x".into(), severity: "x".into(), message: "x".into(), triggered_at: chrono::Utc::now(), acknowledged: true }); }
    #[test] fn roundtrip_log_entry() { roundtrip(&LogEntry { timestamp: chrono::Utc::now(), level: "x".into(), service: "x".into(), message: "x".into() }); }
    #[test] fn roundtrip_notification() { roundtrip(&Notification { id: "x".into(), title: "x".into(), content: "x".into(), service: "x".into(), service_name: "x".into(), notification_type: "x".into(), read: true, created_at: chrono::Utc::now(), link_url: None }); }
    #[test] fn roundtrip_dashboard_stats() { roundtrip(&DashboardStats { total_users: 0, active_users: 0, total_services: 0, healthy_services: 0, pending_tasks: 0, pending_approvals: 0, new_notifications: 0, production_orders: 0, wip_count: 0, system_uptime: 0 }); }
    #[test] fn roundtrip_quick_access() { roundtrip(&QuickAccess { id: "x".into(), name: "x".into(), icon: "x".into(), url: "x".into(), service: "x".into(), category: "x".into() }); }
    #[test] fn roundtrip_announcement() { roundtrip(&Announcement { id: "x".into(), title: "x".into(), content: "x".into(), announcement_type: "x".into(), priority: "x".into(), is_pinned: true, is_active: true, created_at: chrono::Utc::now(), expires_at: chrono::Utc::now(), author: "x".into() }); }
    #[test] fn roundtrip_new_announcement() { roundtrip(&NewAnnouncement { title: "x".into(), content: "x".into(), announcement_type: "x".into(), priority: "x".into(), expires_at: "x".into() }); }
    #[test] fn roundtrip_user_settings() { roundtrip(&UserSettings { id: "x".into(), user_id: "x".into(), theme: "x".into(), language: "x".into(), timezone: "x".into(), notification_enabled: true, notification_sound: true, auto_refresh: true, refresh_interval: 0, default_dashboard: "x".into() }); }
    #[test] fn roundtrip_update_user_settings() { roundtrip(&UpdateUserSettings { theme: None, language: None, timezone: None, notification_enabled: None, notification_sound: None, auto_refresh: None, refresh_interval: None }); }
    #[test] fn roundtrip_quick_action() { roundtrip(&QuickAction { id: "x".into(), name: "x".into(), description: "x".into(), icon: "x".into(), action_type: "x".into(), target_url: "x".into(), service: "x".into(), is_favorite: true, usage_count: 0 }); }
    #[test] fn roundtrip_navigation_menu() { roundtrip(&NavigationMenu { id: "x".into(), name: "x".into(), icon: "x".into(), url: "x".into(), service: "x".into(), parent_id: None, order: 0, is_visible: true, badge_count: None }); }
    #[test] fn roundtrip_pinned_app() { roundtrip(&PinnedApp { id: "x".into(), app_id: "x".into(), app_name: "x".into(), icon: "x".into(), url: "x".into(), order: 0 }); }
}
