use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub service_name: String,
    pub status: ServiceStatus,
    pub response_time_ms: u64,
    pub last_check: DateTime<Utc>,
    pub message: Option<String>,
    #[serde(default)]
    pub details: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

impl std::fmt::Display for ServiceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServiceStatus::Healthy => write!(f, "healthy"),
            ServiceStatus::Degraded => write!(f, "degraded"),
            ServiceStatus::Unhealthy => write!(f, "unhealthy"),
            ServiceStatus::Unknown => write!(f, "unknown"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringMetrics {
    pub requests_total: u64,
    pub requests_success: u64,
    pub requests_failed: u64,
    pub avg_response_time_ms: u64,
    pub active_connections: u64,
    pub memory_usage_mb: u64,
    pub cpu_usage_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub name: String,
    pub condition: AlertCondition,
    pub severity: AlertSeverity,
    pub cooldown_seconds: u64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertCondition {
    pub metric: String,
    pub operator: String,
    pub threshold: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub rule_name: String,
    pub severity: AlertSeverity,
    pub message: String,
    pub triggered_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub acknowledged: bool,
}

pub struct MonitoringState {
    pub services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
    pub metrics: Arc<RwLock<MonitoringMetrics>>,
    pub alerts: Arc<RwLock<Vec<Alert>>>,
    pub request_count: AtomicU64,
    pub success_count: AtomicU64,
    pub failure_count: AtomicU64,
    pub response_times: Arc<RwLock<Vec<u64>>>,
}

impl Default for MonitoringState {
    fn default() -> Self {
        Self {
            services: Arc::new(RwLock::new(HashMap::new())),
            metrics: Arc::new(RwLock::new(MonitoringMetrics {
                requests_total: 0,
                requests_success: 0,
                requests_failed: 0,
                avg_response_time_ms: 0,
                active_connections: 0,
                memory_usage_mb: 0,
                cpu_usage_percent: 0.0,
            })),
            alerts: Arc::new(RwLock::new(Vec::new())),
            request_count: AtomicU64::new(0),
            success_count: AtomicU64::new(0),
            failure_count: AtomicU64::new(0),
            response_times: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

impl MonitoringState {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn record_request(&self, success: bool, response_time_ms: u64) {
        self.request_count.fetch_add(1, Ordering::Relaxed);

        if success {
            self.success_count.fetch_add(1, Ordering::Relaxed);
        } else {
            self.failure_count.fetch_add(1, Ordering::Relaxed);
        }

        // 直接更新 metrics，不调用 update_metrics() 避免锁冲突
        let request_count = self.request_count.load(Ordering::Relaxed);
        let success_count = self.success_count.load(Ordering::Relaxed);
        let failure_count = self.failure_count.load(Ordering::Relaxed);

        let mut times = self.response_times.write().await;
        times.push(response_time_ms);
        if times.len() > 1000 {
            times.remove(0);
        }
        let avg_response = if times.is_empty() {
            0
        } else {
            times.iter().sum::<u64>() / times.len() as u64
        };

        let mut metrics = self.metrics.write().await;
        metrics.requests_total = request_count;
        metrics.requests_success = success_count;
        metrics.requests_failed = failure_count;
        metrics.avg_response_time_ms = avg_response;
    }

    async fn update_metrics(&self) {
        let request_count = self.request_count.load(Ordering::Relaxed);
        let success_count = self.success_count.load(Ordering::Relaxed);
        let failure_count = self.failure_count.load(Ordering::Relaxed);
        
        let times = self.response_times.read().await;
        let avg_response = if times.is_empty() {
            0
        } else {
            times.iter().sum::<u64>() / times.len() as u64
        };

        let mut metrics = self.metrics.write().await;
        metrics.requests_total = request_count;
        metrics.requests_success = success_count;
        metrics.requests_failed = failure_count;
        metrics.avg_response_time_ms = avg_response;
    }

    pub async fn update_service_health(&self, service_name: String, health: ServiceHealth) {
        let mut services = self.services.write().await;
        services.insert(service_name, health);
    }

    pub async fn get_all_services_health(&self) -> Vec<ServiceHealth> {
        let services = self.services.read().await;
        services.values().cloned().collect()
    }

    pub async fn get_metrics(&self) -> MonitoringMetrics {
        self.metrics.read().await.clone()
    }

    pub async fn create_alert(&self, rule: &AlertRule, message: String) -> Alert {
        let alert = Alert {
            id: uuid::Uuid::new_v4().to_string(),
            rule_name: rule.name.clone(),
            severity: rule.severity,
            message,
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
        };

        let mut alerts = self.alerts.write().await;
        alerts.push(alert.clone());
        
        // 保持最多100条告警记录
        if alerts.len() > 100 {
            alerts.remove(0);
        }

        alert
    }

    pub async fn acknowledge_alert(&self, alert_id: &str) -> bool {
        let mut alerts = self.alerts.write().await;
        if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.acknowledged = true;
            return true;
        }
        false
    }

    pub async fn resolve_alert(&self, alert_id: &str) -> bool {
        let mut alerts = self.alerts.write().await;
        if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.resolved_at = Some(Utc::now());
            return true;
        }
        false
    }

    pub async fn get_active_alerts(&self) -> Vec<Alert> {
        let alerts = self.alerts.read().await;
        alerts.iter()
            .filter(|a| a.resolved_at.is_none())
            .cloned()
            .collect()
    }
}

// 预定义的告警规则
pub fn default_alert_rules() -> Vec<AlertRule> {
    vec![
        AlertRule {
            name: "high_response_time".to_string(),
            condition: AlertCondition {
                metric: "avg_response_time_ms".to_string(),
                operator: ">".to_string(),
                threshold: 1000.0,
            },
            severity: AlertSeverity::Warning,
            cooldown_seconds: 300,
            enabled: true,
        },
        AlertRule {
            name: "high_error_rate".to_string(),
            condition: AlertCondition {
                metric: "error_rate".to_string(),
                operator: ">".to_string(),
                threshold: 5.0,
            },
            severity: AlertSeverity::Critical,
            cooldown_seconds: 60,
            enabled: true,
        },
        AlertRule {
            name: "service_down".to_string(),
            condition: AlertCondition {
                metric: "service_status".to_string(),
                operator: "==".to_string(),
                threshold: 0.0,
            },
            severity: AlertSeverity::Critical,
            cooldown_seconds: 30,
            enabled: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_monitoring_state() {
        let state = MonitoringState::new();
        
        state.record_request(true, 50).await;
        state.record_request(false, 100).await;
        
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.requests_total, 2);
        assert_eq!(metrics.requests_success, 1);
        assert_eq!(metrics.requests_failed, 1);
    }

    #[tokio::test]
    async fn test_alert_lifecycle() {
        let state = MonitoringState::new();
        
        let rule = AlertRule {
            name: "test_alert".to_string(),
            condition: AlertCondition {
                metric: "test".to_string(),
                operator: ">".to_string(),
                threshold: 10.0,
            },
            severity: AlertSeverity::Warning,
            cooldown_seconds: 60,
            enabled: true,
        };
        
        let alert = state.create_alert(&rule, "Test alert".to_string()).await;
        assert!(!alert.acknowledged);
        assert!(alert.resolved_at.is_none());
        
        state.acknowledge_alert(&alert.id).await;
        let alerts = state.get_active_alerts().await;
        assert_eq!(alerts.len(), 1);
        assert!(alerts[0].acknowledged);
    }
}
