use chrono::{DateTime, Duration, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum AlertSeverity {
    P3,
    P2,
    P1,
    P0,
}

impl AlertSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            AlertSeverity::P0 => "P0",
            AlertSeverity::P1 => "P1",
            AlertSeverity::P2 => "P2",
            AlertSeverity::P3 => "P3",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            AlertSeverity::P0 => "紧急 - 立即处理，业务中断",
            AlertSeverity::P1 => "重要 - 尽快处理，业务受影响",
            AlertSeverity::P2 => "一般 - 正常处理，性能下降",
            AlertSeverity::P3 => "提示 - 关注即可，轻微异常",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "P0" | "CRITICAL" | "EMERGENCY" => Some(AlertSeverity::P0),
            "P1" | "HIGH" | "IMPORTANT" => Some(AlertSeverity::P1),
            "P2" | "WARNING" | "MEDIUM" => Some(AlertSeverity::P2),
            "P3" | "INFO" | "LOW" | "TIP" => Some(AlertSeverity::P3),
            _ => None,
        }
    }

    pub fn is_higher_than(&self, other: &AlertSeverity) -> bool {
        self > other
    }
}

impl std::fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertCondition {
    pub metric: String,
    pub operator: AlertOperator,
    pub threshold: f64,
    pub duration_seconds: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertOperator {
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    Equal,
    NotEqual,
}

impl AlertOperator {
    pub fn evaluate(&self, value: f64, threshold: f64) -> bool {
        match self {
            AlertOperator::GreaterThan => value > threshold,
            AlertOperator::LessThan => value < threshold,
            AlertOperator::GreaterThanOrEqual => value >= threshold,
            AlertOperator::LessThanOrEqual => value <= threshold,
            AlertOperator::Equal => (value - threshold).abs() < f64::EPSILON,
            AlertOperator::NotEqual => (value - threshold).abs() >= f64::EPSILON,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            AlertOperator::GreaterThan => ">",
            AlertOperator::LessThan => "<",
            AlertOperator::GreaterThanOrEqual => ">=",
            AlertOperator::LessThanOrEqual => "<=",
            AlertOperator::Equal => "==",
            AlertOperator::NotEqual => "!=",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub condition: AlertCondition,
    pub severity: AlertSeverity,
    pub category: AlertCategory,
    pub cooldown_seconds: u64,
    pub enabled: bool,
    pub escalation: bool,
    pub team: Option<String>,
    pub runbook_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertCategory {
    Service,
    Database,
    Cache,
    Messaging,
    System,
    Container,
    Backup,
    Security,
    Network,
    Business,
    Other,
}

impl AlertCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            AlertCategory::Service => "service",
            AlertCategory::Database => "database",
            AlertCategory::Cache => "cache",
            AlertCategory::Messaging => "messaging",
            AlertCategory::System => "system",
            AlertCategory::Container => "container",
            AlertCategory::Backup => "backup",
            AlertCategory::Security => "security",
            AlertCategory::Network => "network",
            AlertCategory::Business => "business",
            AlertCategory::Other => "other",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub rule_id: Option<String>,
    pub rule_name: String,
    pub severity: AlertSeverity,
    pub category: AlertCategory,
    pub message: String,
    pub description: Option<String>,
    pub service_name: Option<String>,
    pub instance: Option<String>,
    pub triggered_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub acknowledged: bool,
    pub acknowledged_at: Option<DateTime<Utc>>,
    pub acknowledged_by: Option<String>,
    pub escalation_level: u32,
    pub labels: HashMap<String, String>,
    pub annotations: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuppressionRule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub source_severity: AlertSeverity,
    pub target_severity: AlertSeverity,
    pub equal_labels: Vec<String>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SilenceRule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub matchers: Vec<SilenceMatcher>,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
    pub created_by: String,
    pub comment: Option<String>,
    pub enabled: bool,
    pub recurrence: Option<SilenceRecurrence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SilenceMatcher {
    pub name: String,
    pub value: String,
    pub is_regex: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SilenceRecurrence {
    pub pattern: RecurrencePattern,
    pub interval_days: Option<u32>,
    pub weekdays: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecurrencePattern {
    Daily,
    Weekly,
    Weekdays,
    Weekends,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertStatistics {
    pub total_alerts: u64,
    pub active_alerts: u64,
    pub resolved_alerts: u64,
    pub p0_count: u64,
    pub p1_count: u64,
    pub p2_count: u64,
    pub p3_count: u64,
    pub acknowledged_count: u64,
    pub avg_resolution_time_seconds: Option<f64>,
    pub top_services: Vec<ServiceAlertCount>,
    pub top_categories: Vec<CategoryAlertCount>,
    pub trend_last_24h: Vec<HourlyAlertCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceAlertCount {
    pub service_name: String,
    pub alert_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryAlertCount {
    pub category: AlertCategory,
    pub alert_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyAlertCount {
    pub hour: DateTime<Utc>,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConvergenceConfig {
    pub group_by: Vec<String>,
    pub group_wait_seconds: u64,
    pub group_interval_seconds: u64,
    pub repeat_interval_seconds: u64,
    pub max_alerts_per_group: u32,
}

impl Default for AlertConvergenceConfig {
    fn default() -> Self {
        Self {
            group_by: vec![
                "alertname".to_string(),
                "job".to_string(),
                "severity".to_string(),
            ],
            group_wait_seconds: 30,
            group_interval_seconds: 300,
            repeat_interval_seconds: 14400,
            max_alerts_per_group: 100,
        }
    }
}

pub struct MonitoringState {
    pub services: Arc<RwLock<HashMap<String, ServiceHealth>>>,
    pub metrics: Arc<RwLock<MonitoringMetrics>>,
    pub alerts: Arc<RwLock<Vec<Alert>>>,
    pub alert_rules: Arc<RwLock<Vec<AlertRule>>>,
    pub suppression_rules: Arc<RwLock<Vec<SuppressionRule>>>,
    pub silence_rules: Arc<RwLock<Vec<SilenceRule>>>,
    pub convergence_config: Arc<RwLock<AlertConvergenceConfig>>,
    pub request_count: AtomicU64,
    pub success_count: AtomicU64,
    pub failure_count: AtomicU64,
    pub response_times: Arc<RwLock<Vec<u64>>>,
    pub last_alert_triggered: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
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
            alert_rules: Arc::new(RwLock::new(Vec::new())),
            suppression_rules: Arc::new(RwLock::new(Vec::new())),
            silence_rules: Arc::new(RwLock::new(Vec::new())),
            convergence_config: Arc::new(RwLock::new(AlertConvergenceConfig::default())),
            request_count: AtomicU64::new(0),
            success_count: AtomicU64::new(0),
            failure_count: AtomicU64::new(0),
            response_times: Arc::new(RwLock::new(Vec::new())),
            last_alert_triggered: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl MonitoringState {
    pub fn new() -> Self {
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
            alert_rules: Arc::new(RwLock::new(default_alert_rules())),
            suppression_rules: Arc::new(RwLock::new(default_suppression_rules())),
            silence_rules: Arc::new(RwLock::new(Vec::new())),
            convergence_config: Arc::new(RwLock::new(AlertConvergenceConfig::default())),
            request_count: AtomicU64::new(0),
            success_count: AtomicU64::new(0),
            failure_count: AtomicU64::new(0),
            response_times: Arc::new(RwLock::new(Vec::new())),
            last_alert_triggered: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn record_request(&self, success: bool, response_time_ms: u64) {
        self.request_count.fetch_add(1, Ordering::Relaxed);

        if success {
            self.success_count.fetch_add(1, Ordering::Relaxed);
        } else {
            self.failure_count.fetch_add(1, Ordering::Relaxed);
        }

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

    pub async fn evaluate_alert_rule(&self, rule: &AlertRule, value: f64) -> Option<Alert> {
        if !rule.enabled {
            return None;
        }

        if !rule
            .condition
            .operator
            .evaluate(value, rule.condition.threshold)
        {
            return None;
        }

        {
            let last_triggered = self.last_alert_triggered.read().await;
            if let Some(last_time) = last_triggered.get(&rule.id) {
                let cooldown = Duration::seconds(rule.cooldown_seconds as i64);
                if Utc::now() - *last_time < cooldown {
                    return None;
                }
            }
        }

        if self.is_alert_silenced(rule).await {
            return None;
        }

        if self.is_alert_suppressed(rule).await {
            return None;
        }

        let mut last_triggered = self.last_alert_triggered.write().await;
        last_triggered.insert(rule.id.clone(), Utc::now());

        let alert = Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: Some(rule.id.clone()),
            rule_name: rule.name.clone(),
            severity: rule.severity,
            category: rule.category,
            message: format!("{} 触发阈值告警", rule.name),
            description: rule.description.clone(),
            service_name: None,
            instance: None,
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };

        let mut alerts = self.alerts.write().await;
        alerts.push(alert.clone());

        if alerts.len() > 1000 {
            let excess = alerts.len() - 1000;
            alerts.drain(0..excess);
        }

        Some(alert)
    }

    async fn is_alert_silenced(&self, rule: &AlertRule) -> bool {
        let silences = self.silence_rules.read().await;
        let now = Utc::now();

        for silence in silences.iter() {
            if !silence.enabled {
                continue;
            }

            if now < silence.starts_at || now > silence.ends_at {
                continue;
            }

            let mut matches = true;
            for matcher in &silence.matchers {
                let rule_value = match matcher.name.as_str() {
                    "severity" => rule.severity.as_str().to_string(),
                    "category" => rule.category.as_str().to_string(),
                    "team" => rule.team.clone().unwrap_or_default(),
                    _ => continue,
                };

                if matcher.is_regex {
                    if let Ok(re) = regex::Regex::new(&matcher.value) {
                        if !re.is_match(&rule_value) {
                            matches = false;
                            break;
                        }
                    }
                } else if rule_value != matcher.value {
                    matches = false;
                    break;
                }
            }

            if matches {
                return true;
            }
        }

        false
    }

    async fn is_alert_suppressed(&self, rule: &AlertRule) -> bool {
        let suppressions = self.suppression_rules.read().await;
        let alerts = self.alerts.read().await;
        let now = Utc::now();

        for suppression in suppressions.iter() {
            if !suppression.enabled {
                continue;
            }

            if rule.severity.is_higher_than(&suppression.source_severity) {
                continue;
            }

            for active_alert in alerts.iter() {
                if active_alert.resolved_at.is_some() {
                    continue;
                }

                if active_alert.severity != suppression.source_severity {
                    continue;
                }

                let mut labels_match = true;
                for label in &suppression.equal_labels {
                    let source_val = active_alert.labels.get(label);
                    let target_val = match label.as_str() {
                        "severity" => Some(rule.severity.as_str()),
                        "category" => Some(rule.category.as_str()),
                        _ => None,
                    };

                    match (source_val, target_val) {
                        (Some(s), Some(t)) if s == t => {}
                        _ => {
                            labels_match = false;
                            break;
                        }
                    }
                }

                if labels_match {
                    let age = now - active_alert.triggered_at;
                    if age < Duration::hours(24) {
                        return true;
                    }
                }
            }
        }

        false
    }

    pub async fn create_alert(&self, rule: &AlertRule, message: String) -> Alert {
        let alert = Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: Some(rule.id.clone()),
            rule_name: rule.name.clone(),
            severity: rule.severity,
            category: rule.category,
            message,
            description: rule.description.clone(),
            service_name: None,
            instance: None,
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };

        let mut alerts = self.alerts.write().await;
        alerts.push(alert.clone());

        if alerts.len() > 1000 {
            let excess = alerts.len() - 1000;
            alerts.drain(0..excess);
        }

        alert
    }

    pub async fn acknowledge_alert(&self, alert_id: &str, acknowledged_by: &str) -> bool {
        let mut alerts = self.alerts.write().await;
        if let Some(alert) = alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.acknowledged = true;
            alert.acknowledged_at = Some(Utc::now());
            alert.acknowledged_by = Some(acknowledged_by.to_string());
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
        alerts
            .iter()
            .filter(|a| a.resolved_at.is_none())
            .cloned()
            .collect()
    }

    pub async fn get_alerts_by_severity(&self, severity: AlertSeverity) -> Vec<Alert> {
        let alerts = self.alerts.read().await;
        alerts
            .iter()
            .filter(|a| a.severity == severity && a.resolved_at.is_none())
            .cloned()
            .collect()
    }

    pub async fn get_statistics(&self) -> Result<AlertStatistics, MonitoringError> {
        let alerts = self.alerts.read().await;
        let now = Utc::now();
        let twenty_four_hours_ago = now - Duration::hours(24);

        let mut p0_count = 0u64;
        let mut p1_count = 0u64;
        let mut p2_count = 0u64;
        let mut p3_count = 0u64;
        let mut active_count = 0u64;
        let mut resolved_count = 0u64;
        let mut acknowledged_count = 0u64;
        let mut total_resolution_time = 0f64;
        let mut resolved_with_time = 0u64;

        let mut service_counts: HashMap<String, u64> = HashMap::new();
        let mut category_counts: HashMap<AlertCategory, u64> = HashMap::new();
        let mut hourly_counts: HashMap<DateTime<Utc>, u64> = HashMap::new();

        for alert in alerts.iter() {
            match alert.severity {
                AlertSeverity::P0 => p0_count += 1,
                AlertSeverity::P1 => p1_count += 1,
                AlertSeverity::P2 => p2_count += 1,
                AlertSeverity::P3 => p3_count += 1,
            }

            if alert.resolved_at.is_some() {
                resolved_count += 1;
                if let (Some(resolved_at), _) = (alert.resolved_at, alert.triggered_at) {
                    let duration = resolved_at - alert.triggered_at;
                    total_resolution_time += duration.num_seconds() as f64;
                    resolved_with_time += 1;
                }
            } else {
                active_count += 1;
            }

            if alert.acknowledged {
                acknowledged_count += 1;
            }

            if let Some(service) = &alert.service_name {
                *service_counts.entry(service.clone()).or_insert(0) += 1;
            }

            *category_counts.entry(alert.category).or_insert(0) += 1;

            if alert.triggered_at >= twenty_four_hours_ago {
                let hour = alert
                    .triggered_at
                    .with_minute(0)
                    .ok_or(MonitoringError::DateTimeConstruction)?
                    .with_second(0)
                    .ok_or(MonitoringError::DateTimeConstruction)?;
                *hourly_counts.entry(hour).or_insert(0) += 1;
            }
        }

        let mut top_services: Vec<ServiceAlertCount> = service_counts
            .into_iter()
            .map(|(name, count)| ServiceAlertCount {
                service_name: name,
                alert_count: count,
            })
            .collect();
        top_services.sort_by_key(|b| std::cmp::Reverse(b.alert_count));
        top_services.truncate(10);

        let mut top_categories: Vec<CategoryAlertCount> = category_counts
            .into_iter()
            .map(|(cat, count)| CategoryAlertCount {
                category: cat,
                alert_count: count,
            })
            .collect();
        top_categories.sort_by_key(|b| std::cmp::Reverse(b.alert_count));

        let mut trend_last_24h: Vec<HourlyAlertCount> = Vec::new();
        for i in 0..24 {
            let hour = (twenty_four_hours_ago + Duration::hours(i))
                .with_minute(0)
                .ok_or(MonitoringError::DateTimeConstruction)?
                .with_second(0)
                .ok_or(MonitoringError::DateTimeConstruction)?;
            let count = hourly_counts.get(&hour).copied().unwrap_or(0);
            trend_last_24h.push(HourlyAlertCount { hour, count });
        }

        let avg_resolution_time = if resolved_with_time > 0 {
            Some(total_resolution_time / resolved_with_time as f64)
        } else {
            None
        };

        Ok(AlertStatistics {
            total_alerts: alerts.len() as u64,
            active_alerts: active_count,
            resolved_alerts: resolved_count,
            p0_count,
            p1_count,
            p2_count,
            p3_count,
            acknowledged_count,
            avg_resolution_time_seconds: avg_resolution_time,
            top_services,
            top_categories,
            trend_last_24h,
        })
    }

    pub async fn add_alert_rule(&self, rule: AlertRule) {
        let mut rules = self.alert_rules.write().await;
        rules.push(rule);
    }

    pub async fn remove_alert_rule(&self, rule_id: &str) -> bool {
        let mut rules = self.alert_rules.write().await;
        let initial_len = rules.len();
        rules.retain(|r| r.id != rule_id);
        rules.len() < initial_len
    }

    pub async fn add_silence_rule(&self, silence: SilenceRule) {
        let mut silences = self.silence_rules.write().await;
        silences.push(silence);
    }

    pub async fn remove_silence_rule(&self, silence_id: &str) -> bool {
        let mut silences = self.silence_rules.write().await;
        let initial_len = silences.len();
        silences.retain(|s| s.id != silence_id);
        silences.len() < initial_len
    }

    pub async fn get_night_silence_config() -> Result<SilenceRule, MonitoringError> {
        let now = Utc::now();
        let tonight = now
            .with_hour(22)
            .ok_or(MonitoringError::DateTimeConstruction)?
            .with_minute(0)
            .ok_or(MonitoringError::DateTimeConstruction)?
            .with_second(0)
            .ok_or(MonitoringError::DateTimeConstruction)?;
        let tomorrow_morning = tonight + Duration::hours(10);

        Ok(SilenceRule {
            id: "night-silence".to_string(),
            name: "夜间静默".to_string(),
            description: Some("夜间非工作时间降低告警敏感度".to_string()),
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P[23]".to_string(),
                is_regex: true,
            }],
            starts_at: tonight,
            ends_at: tomorrow_morning,
            created_by: "system".to_string(),
            comment: Some("自动夜间静默规则".to_string()),
            enabled: true,
            recurrence: Some(SilenceRecurrence {
                pattern: RecurrencePattern::Daily,
                interval_days: Some(1),
                weekdays: None,
            }),
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MonitoringError {
    #[error("Invalid datetime construction")]
    DateTimeConstruction,
    #[error("Unexpected none value")]
    UnexpectedNone,
}

pub fn default_alert_rules() -> Vec<AlertRule> {
    let now = Utc::now();
    vec![
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "CPU使用率过高-P2".to_string(),
            description: Some("CPU使用率超过70%".to_string()),
            condition: AlertCondition {
                metric: "cpu_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 70.0,
                duration_seconds: Some(600),
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::System,
            cooldown_seconds: 600,
            enabled: true,
            escalation: false,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/cpu-high".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "CPU使用率过高-P1".to_string(),
            description: Some("CPU使用率超过85%".to_string()),
            condition: AlertCondition {
                metric: "cpu_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 85.0,
                duration_seconds: Some(300),
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::System,
            cooldown_seconds: 300,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/cpu-high".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "CPU使用率严重过高-P0".to_string(),
            description: Some("CPU使用率超过95%".to_string()),
            condition: AlertCondition {
                metric: "cpu_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 95.0,
                duration_seconds: Some(120),
            },
            severity: AlertSeverity::P0,
            category: AlertCategory::System,
            cooldown_seconds: 120,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/cpu-critical".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "内存使用率过高-P2".to_string(),
            description: Some("内存使用率超过70%".to_string()),
            condition: AlertCondition {
                metric: "memory_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 70.0,
                duration_seconds: Some(600),
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::System,
            cooldown_seconds: 600,
            enabled: true,
            escalation: false,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/memory-high".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "内存使用率过高-P1".to_string(),
            description: Some("内存使用率超过85%".to_string()),
            condition: AlertCondition {
                metric: "memory_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 85.0,
                duration_seconds: Some(300),
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::System,
            cooldown_seconds: 300,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/memory-high".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "响应时间过长-P2".to_string(),
            description: Some("平均响应时间超过500ms".to_string()),
            condition: AlertCondition {
                metric: "avg_response_time_ms".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 500.0,
                duration_seconds: Some(180),
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::Service,
            cooldown_seconds: 300,
            enabled: true,
            escalation: false,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/high-latency".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "响应时间过长-P1".to_string(),
            description: Some("平均响应时间超过2000ms".to_string()),
            condition: AlertCondition {
                metric: "avg_response_time_ms".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 2000.0,
                duration_seconds: Some(120),
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::Service,
            cooldown_seconds: 180,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/high-latency".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "错误率过高-P2".to_string(),
            description: Some("错误率超过1%".to_string()),
            condition: AlertCondition {
                metric: "error_rate".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 1.0,
                duration_seconds: Some(300),
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::Service,
            cooldown_seconds: 300,
            enabled: true,
            escalation: false,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/high-error-rate".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "错误率过高-P1".to_string(),
            description: Some("错误率超过5%".to_string()),
            condition: AlertCondition {
                metric: "error_rate".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 5.0,
                duration_seconds: Some(120),
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::Service,
            cooldown_seconds: 180,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/high-error-rate".to_string()),
            created_at: now,
            updated_at: now,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "错误率严重-P0".to_string(),
            description: Some("错误率超过10%".to_string()),
            condition: AlertCondition {
                metric: "error_rate".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 10.0,
                duration_seconds: Some(60),
            },
            severity: AlertSeverity::P0,
            category: AlertCategory::Service,
            cooldown_seconds: 60,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: Some("https://docs.topems.com/runbooks/critical-error-rate".to_string()),
            created_at: now,
            updated_at: now,
        },
    ]
}

pub fn default_suppression_rules() -> Vec<SuppressionRule> {
    let now = Utc::now();
    vec![
        SuppressionRule {
            id: "p0-suppress-p1-p2-p3".to_string(),
            name: "P0抑制P1/P2/P3".to_string(),
            description: Some("当P0告警存在时，抑制同一类别的P1/P2/P3告警".to_string()),
            source_severity: AlertSeverity::P0,
            target_severity: AlertSeverity::P1,
            equal_labels: vec!["category".to_string()],
            enabled: true,
            created_at: now,
        },
        SuppressionRule {
            id: "p1-suppress-p2-p3".to_string(),
            name: "P1抑制P2/P3".to_string(),
            description: Some("当P1告警存在时，抑制同一类别的P2/P3告警".to_string()),
            source_severity: AlertSeverity::P1,
            target_severity: AlertSeverity::P2,
            equal_labels: vec!["category".to_string()],
            enabled: true,
            created_at: now,
        },
        SuppressionRule {
            id: "p2-suppress-p3".to_string(),
            name: "P2抑制P3".to_string(),
            description: Some("当P2告警存在时，抑制同一类别的P3告警".to_string()),
            source_severity: AlertSeverity::P2,
            target_severity: AlertSeverity::P3,
            equal_labels: vec!["category".to_string()],
            enabled: true,
            created_at: now,
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
    async fn test_alert_severity_ordering() {
        assert!(AlertSeverity::P0.is_higher_than(&AlertSeverity::P1));
        assert!(AlertSeverity::P1.is_higher_than(&AlertSeverity::P2));
        assert!(AlertSeverity::P2.is_higher_than(&AlertSeverity::P3));
        assert!(!AlertSeverity::P3.is_higher_than(&AlertSeverity::P0));
    }

    #[tokio::test]
    async fn test_alert_severity_from_str() {
        assert_eq!(AlertSeverity::from_str("P0"), Some(AlertSeverity::P0));
        assert_eq!(AlertSeverity::from_str("p1"), Some(AlertSeverity::P1));
        assert_eq!(AlertSeverity::from_str("CRITICAL"), Some(AlertSeverity::P0));
        assert_eq!(AlertSeverity::from_str("warning"), Some(AlertSeverity::P2));
        assert_eq!(AlertSeverity::from_str("info"), Some(AlertSeverity::P3));
        assert_eq!(AlertSeverity::from_str("unknown"), None);
    }

    #[tokio::test]
    async fn test_alert_operator() {
        assert!(AlertOperator::GreaterThan.evaluate(10.0, 5.0));
        assert!(!AlertOperator::GreaterThan.evaluate(5.0, 10.0));
        assert!(AlertOperator::LessThan.evaluate(5.0, 10.0));
        assert!(AlertOperator::GreaterThanOrEqual.evaluate(10.0, 10.0));
        assert!(AlertOperator::Equal.evaluate(10.0, 10.0));
        assert!(AlertOperator::NotEqual.evaluate(10.0, 5.0));
    }

    #[tokio::test]
    async fn test_alert_lifecycle() {
        let state = MonitoringState::new();
        let now = Utc::now();

        let rule = AlertRule {
            id: "test-rule".to_string(),
            name: "测试告警规则".to_string(),
            description: Some("测试用告警规则".to_string()),
            condition: AlertCondition {
                metric: "test_metric".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 10.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::Service,
            cooldown_seconds: 60,
            enabled: true,
            escalation: false,
            team: Some("test".to_string()),
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };

        let alert = state.create_alert(&rule, "Test alert".to_string()).await;
        assert!(!alert.acknowledged);
        assert!(alert.resolved_at.is_none());
        assert_eq!(alert.severity, AlertSeverity::P2);
        assert_eq!(alert.category, AlertCategory::Service);

        state.acknowledge_alert(&alert.id, "tester").await;
        let alerts = state.get_active_alerts().await;
        assert_eq!(alerts.len(), 1);
        assert!(alerts[0].acknowledged);
        assert_eq!(alerts[0].acknowledged_by.as_deref(), Some("tester"));

        state.resolve_alert(&alert.id).await;
        let active_alerts = state.get_active_alerts().await;
        assert_eq!(active_alerts.len(), 0);
    }

    #[tokio::test]
    async fn test_alert_statistics() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let now = Utc::now();

        let rule_p0 = AlertRule {
            id: "rule-p0".to_string(),
            name: "P0测试规则".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "test".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P0,
            category: AlertCategory::System,
            cooldown_seconds: 0,
            enabled: true,
            escalation: true,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };

        let rule_p1 = AlertRule {
            id: "rule-p1".to_string(),
            name: "P1测试规则".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "test".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::Service,
            cooldown_seconds: 0,
            enabled: true,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };

        state.create_alert(&rule_p0, "P0告警".to_string()).await;
        state.create_alert(&rule_p1, "P1告警".to_string()).await;

        let stats = state.get_statistics().await?;
        assert_eq!(stats.total_alerts, 2);
        assert_eq!(stats.active_alerts, 2);
        assert_eq!(stats.p0_count, 1);
        assert_eq!(stats.p1_count, 1);
        assert_eq!(stats.p2_count, 0);
        assert_eq!(stats.p3_count, 0);
        assert_eq!(stats.top_categories.len(), 2);
        Ok(())
    }

    #[tokio::test]
    async fn test_evaluate_alert_rule() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let now = Utc::now();

        let rule = AlertRule {
            id: "eval-test".to_string(),
            name: "评估测试规则".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "cpu_usage_percent".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 80.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::System,
            cooldown_seconds: 0,
            enabled: true,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };

        let result_low = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(result_low.is_none());

        let result_high = state.evaluate_alert_rule(&rule, 90.0).await;
        assert!(result_high.is_some());
        let alert = result_high.ok_or(MonitoringError::UnexpectedNone)?;
        assert_eq!(alert.severity, AlertSeverity::P1);
        assert_eq!(alert.category, AlertCategory::System);
        Ok(())
    }

    #[tokio::test]
    async fn test_disabled_alert_rule() {
        let state = MonitoringState::new();
        let now = Utc::now();

        let rule = AlertRule {
            id: "disabled-rule".to_string(),
            name: "禁用规则".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "test".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::Other,
            cooldown_seconds: 0,
            enabled: false,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };

        let result = state.evaluate_alert_rule(&rule, 100.0).await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_default_alert_rules() {
        let rules = default_alert_rules();
        assert!(!rules.is_empty());

        let p0_count = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P0)
            .count();
        let p1_count = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P1)
            .count();
        let p2_count = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P2)
            .count();

        assert!(p0_count > 0, "应该有P0级别的告警规则");
        assert!(p1_count > 0, "应该有P1级别的告警规则");
        assert!(p2_count > 0, "应该有P2级别的告警规则");
    }

    #[tokio::test]
    async fn test_default_suppression_rules() {
        let rules = default_suppression_rules();
        assert!(!rules.is_empty());
        assert_eq!(rules.len(), 3);
    }

    #[tokio::test]
    async fn test_alert_category() {
        assert_eq!(AlertCategory::Service.as_str(), "service");
        assert_eq!(AlertCategory::Database.as_str(), "database");
        assert_eq!(AlertCategory::System.as_str(), "system");
    }

    #[tokio::test]
    async fn test_alert_severity_display() {
        assert_eq!(AlertSeverity::P0.to_string(), "P0");
        assert_eq!(AlertSeverity::P1.to_string(), "P1");
        assert_eq!(AlertSeverity::P2.to_string(), "P2");
        assert_eq!(AlertSeverity::P3.to_string(), "P3");
    }

    #[tokio::test]
    async fn test_service_status_display_all_variants() {
        assert_eq!(ServiceStatus::Healthy.to_string(), "healthy");
        assert_eq!(ServiceStatus::Degraded.to_string(), "degraded");
        assert_eq!(ServiceStatus::Unhealthy.to_string(), "unhealthy");
        assert_eq!(ServiceStatus::Unknown.to_string(), "unknown");
    }

    #[tokio::test]
    async fn test_alert_severity_as_str_and_description() {
        assert_eq!(AlertSeverity::P0.as_str(), "P0");
        assert_eq!(AlertSeverity::P1.as_str(), "P1");
        assert_eq!(AlertSeverity::P2.as_str(), "P2");
        assert_eq!(AlertSeverity::P3.as_str(), "P3");
        assert!(AlertSeverity::P0.description().contains("紧急"));
        assert!(AlertSeverity::P1.description().contains("重要"));
        assert!(AlertSeverity::P2.description().contains("一般"));
        assert!(AlertSeverity::P3.description().contains("提示"));
    }

    #[tokio::test]
    async fn test_alert_operator_as_str_all_variants() {
        assert_eq!(AlertOperator::GreaterThan.as_str(), ">");
        assert_eq!(AlertOperator::LessThan.as_str(), "<");
        assert_eq!(AlertOperator::GreaterThanOrEqual.as_str(), ">=");
        assert_eq!(AlertOperator::LessThanOrEqual.as_str(), "<=");
        assert_eq!(AlertOperator::Equal.as_str(), "==");
        assert_eq!(AlertOperator::NotEqual.as_str(), "!=");
    }

    #[tokio::test]
    async fn test_alert_operator_equal_and_not_equal_edge_cases() {
        // Equal: exact equality (within EPSILON)
        assert!(AlertOperator::Equal.evaluate(10.0, 10.0));
        assert!(!AlertOperator::Equal.evaluate(10.0, 10.0001));
        // NotEqual: differs by more than EPSILON
        assert!(AlertOperator::NotEqual.evaluate(10.0, 5.0));
        assert!(!AlertOperator::NotEqual.evaluate(10.0, 10.0));
        // GreaterThanOrEqual / LessThanOrEqual boundary
        assert!(AlertOperator::GreaterThanOrEqual.evaluate(10.0, 10.0));
        assert!(AlertOperator::LessThanOrEqual.evaluate(10.0, 10.0));
        assert!(!AlertOperator::GreaterThan.evaluate(10.0, 10.0));
        assert!(!AlertOperator::LessThan.evaluate(10.0, 10.0));
    }

    #[tokio::test]
    async fn test_alert_category_all_variants_as_str() {
        assert_eq!(AlertCategory::Service.as_str(), "service");
        assert_eq!(AlertCategory::Database.as_str(), "database");
        assert_eq!(AlertCategory::Cache.as_str(), "cache");
        assert_eq!(AlertCategory::Messaging.as_str(), "messaging");
        assert_eq!(AlertCategory::System.as_str(), "system");
        assert_eq!(AlertCategory::Container.as_str(), "container");
        assert_eq!(AlertCategory::Backup.as_str(), "backup");
        assert_eq!(AlertCategory::Security.as_str(), "security");
        assert_eq!(AlertCategory::Network.as_str(), "network");
        assert_eq!(AlertCategory::Business.as_str(), "business");
        assert_eq!(AlertCategory::Other.as_str(), "other");
    }

    #[tokio::test]
    async fn test_service_health_serde_roundtrip() {
        let original = ServiceHealth {
            service_name: "svc-1".to_string(),
            status: ServiceStatus::Degraded,
            response_time_ms: 123,
            last_check: Utc::now(),
            message: Some("degraded".to_string()),
            details: HashMap::new(),
        };
        let json = serde_json::to_string(&original).expect("serialize ServiceHealth");
        let back: ServiceHealth = serde_json::from_str(&json).expect("deserialize ServiceHealth");
        let json_again = serde_json::to_string(&back).expect("serialize ServiceHealth again");
        assert_eq!(json, json_again);
        assert_eq!(back.status, ServiceStatus::Degraded);
    }

    #[tokio::test]
    async fn test_service_status_serde_roundtrip() {
        for original in [
            ServiceStatus::Healthy,
            ServiceStatus::Degraded,
            ServiceStatus::Unhealthy,
            ServiceStatus::Unknown,
        ] {
            let json = serde_json::to_string(&original).expect("serialize ServiceStatus");
            let back: ServiceStatus =
                serde_json::from_str(&json).expect("deserialize ServiceStatus");
            assert_eq!(original, back);
        }
        // serde rename_all = "lowercase"
        assert_eq!(
            serde_json::to_string(&ServiceStatus::Healthy).unwrap(),
            "\"healthy\""
        );
        assert_eq!(
            serde_json::to_string(&ServiceStatus::Unhealthy).unwrap(),
            "\"unhealthy\""
        );
    }

    #[tokio::test]
    async fn test_monitoring_metrics_serde_roundtrip() {
        let original = MonitoringMetrics {
            requests_total: 100,
            requests_success: 90,
            requests_failed: 10,
            avg_response_time_ms: 42,
            active_connections: 5,
            memory_usage_mb: 256,
            cpu_usage_percent: 33.5,
        };
        let json = serde_json::to_string(&original).expect("serialize MonitoringMetrics");
        let back: MonitoringMetrics =
            serde_json::from_str(&json).expect("deserialize MonitoringMetrics");
        let json_again = serde_json::to_string(&back).expect("serialize MonitoringMetrics again");
        assert_eq!(json, json_again);
        assert_eq!(back.cpu_usage_percent, 33.5);
    }

    #[tokio::test]
    async fn test_alert_rule_serde_roundtrip() {
        let now = Utc::now();
        let original = AlertRule {
            id: "rule-1".to_string(),
            name: "rule".to_string(),
            description: Some("desc".to_string()),
            condition: AlertCondition {
                metric: "cpu".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 80.0,
                duration_seconds: Some(60),
            },
            severity: AlertSeverity::P1,
            category: AlertCategory::System,
            cooldown_seconds: 120,
            enabled: true,
            escalation: true,
            team: Some("devops".to_string()),
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&original).expect("serialize AlertRule");
        let back: AlertRule = serde_json::from_str(&json).expect("deserialize AlertRule");
        let json_again = serde_json::to_string(&back).expect("serialize AlertRule again");
        assert_eq!(json, json_again);
        assert_eq!(back.severity, AlertSeverity::P1);
    }

    #[tokio::test]
    async fn test_alert_operator_serde_roundtrip() {
        for original in [
            AlertOperator::GreaterThan,
            AlertOperator::LessThan,
            AlertOperator::GreaterThanOrEqual,
            AlertOperator::LessThanOrEqual,
            AlertOperator::Equal,
            AlertOperator::NotEqual,
        ] {
            let json = serde_json::to_string(&original).expect("serialize AlertOperator");
            let back: AlertOperator =
                serde_json::from_str(&json).expect("deserialize AlertOperator");
            assert_eq!(original, back);
        }
        // serde rename_all = "lowercase"
        assert_eq!(
            serde_json::to_string(&AlertOperator::GreaterThan).unwrap(),
            "\"greaterthan\""
        );
    }

    #[tokio::test]
    async fn test_alert_serde_roundtrip() {
        let original = Alert {
            id: "a-1".to_string(),
            rule_id: Some("r-1".to_string()),
            rule_name: "rule".to_string(),
            severity: AlertSeverity::P0,
            category: AlertCategory::Database,
            message: "db down".to_string(),
            description: None,
            service_name: Some("svc".to_string()),
            instance: None,
            triggered_at: Utc::now(),
            resolved_at: Some(Utc::now()),
            acknowledged: true,
            acknowledged_at: Some(Utc::now()),
            acknowledged_by: Some("ops".to_string()),
            escalation_level: 2,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };
        let json = serde_json::to_string(&original).expect("serialize Alert");
        let back: Alert = serde_json::from_str(&json).expect("deserialize Alert");
        let json_again = serde_json::to_string(&back).expect("serialize Alert again");
        assert_eq!(json, json_again);
        assert_eq!(back.severity, AlertSeverity::P0);
    }

    #[tokio::test]
    async fn test_suppression_rule_serde_roundtrip() {
        let original = SuppressionRule {
            id: "sup-1".to_string(),
            name: "sup".to_string(),
            description: None,
            source_severity: AlertSeverity::P0,
            target_severity: AlertSeverity::P1,
            equal_labels: vec!["category".to_string()],
            enabled: true,
            created_at: Utc::now(),
        };
        let json = serde_json::to_string(&original).expect("serialize SuppressionRule");
        let back: SuppressionRule =
            serde_json::from_str(&json).expect("deserialize SuppressionRule");
        let json_again = serde_json::to_string(&back).expect("serialize SuppressionRule again");
        assert_eq!(json, json_again);
    }

    #[tokio::test]
    async fn test_silence_rule_and_recurrence_serde_roundtrip() {
        let original = SilenceRule {
            id: "sil-1".to_string(),
            name: "sil".to_string(),
            description: Some("d".to_string()),
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P0".to_string(),
                is_regex: false,
            }],
            starts_at: Utc::now(),
            ends_at: Utc::now() + Duration::hours(1),
            created_by: "ops".to_string(),
            comment: None,
            enabled: true,
            recurrence: Some(SilenceRecurrence {
                pattern: RecurrencePattern::Daily,
                interval_days: Some(1),
                weekdays: None,
            }),
        };
        let json = serde_json::to_string(&original).expect("serialize SilenceRule");
        let back: SilenceRule = serde_json::from_str(&json).expect("deserialize SilenceRule");
        let json_again = serde_json::to_string(&back).expect("serialize SilenceRule again");
        assert_eq!(json, json_again);
        // RecurrencePattern serde roundtrip
        for variant in [
            RecurrencePattern::Daily,
            RecurrencePattern::Weekly,
            RecurrencePattern::Weekdays,
            RecurrencePattern::Weekends,
            RecurrencePattern::Custom,
        ] {
            let j = serde_json::to_string(&variant).unwrap();
            let b: RecurrencePattern = serde_json::from_str(&j).unwrap();
            assert_eq!(variant, b);
        }
    }

    #[tokio::test]
    async fn test_alert_convergence_config_default() {
        let cfg = AlertConvergenceConfig::default();
        assert_eq!(cfg.group_wait_seconds, 30);
        assert_eq!(cfg.group_interval_seconds, 300);
        assert_eq!(cfg.repeat_interval_seconds, 14400);
        assert_eq!(cfg.max_alerts_per_group, 100);
        assert!(cfg.group_by.contains(&"severity".to_string()));
    }

    #[tokio::test]
    async fn test_monitoring_state_default_empty() {
        let state = MonitoringState::default();
        // Default has empty alert_rules / suppression_rules (unlike new())
        assert_eq!(state.get_active_alerts().await.len(), 0);
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.requests_total, 0);
        assert_eq!(metrics.requests_failed, 0);
        assert_eq!(state.get_all_services_health().await.len(), 0);
    }

    #[tokio::test]
    async fn test_get_alerts_by_severity() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let mk_rule = |id: &str, sev: AlertSeverity| AlertRule {
            id: id.to_string(),
            name: id.to_string(),
            description: None,
            condition: AlertCondition {
                metric: "m".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: sev,
            category: AlertCategory::Service,
            cooldown_seconds: 0,
            enabled: true,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };
        state
            .create_alert(&mk_rule("p0", AlertSeverity::P0), "p0".to_string())
            .await;
        state
            .create_alert(&mk_rule("p1a", AlertSeverity::P1), "p1a".to_string())
            .await;
        state
            .create_alert(&mk_rule("p1b", AlertSeverity::P1), "p1b".to_string())
            .await;
        assert_eq!(
            state.get_alerts_by_severity(AlertSeverity::P0).await.len(),
            1
        );
        assert_eq!(
            state.get_alerts_by_severity(AlertSeverity::P1).await.len(),
            2
        );
        assert_eq!(
            state.get_alerts_by_severity(AlertSeverity::P2).await.len(),
            0
        );
    }

    #[tokio::test]
    async fn test_add_remove_alert_and_silence_rules() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = AlertRule {
            id: "rm-1".to_string(),
            name: "rm".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "m".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P2,
            category: AlertCategory::Other,
            cooldown_seconds: 0,
            enabled: true,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };
        state.add_alert_rule(rule).await;
        assert!(state.remove_alert_rule("rm-1").await);
        assert!(!state.remove_alert_rule("rm-1").await);

        let silence = SilenceRule {
            id: "sil-rm".to_string(),
            name: "sil".to_string(),
            description: None,
            matchers: vec![],
            starts_at: now,
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.remove_silence_rule("sil-rm").await);
        assert!(!state.remove_silence_rule("sil-rm").await);
    }

    #[tokio::test]
    async fn test_get_night_silence_config() -> Result<(), MonitoringError> {
        let silence = MonitoringState::get_night_silence_config().await?;
        assert_eq!(silence.id, "night-silence");
        assert!(silence.enabled);
        assert_eq!(silence.matchers.len(), 1);
        assert!(silence.matchers[0].is_regex);
        assert!(silence.recurrence.is_some());
        Ok(())
    }

    #[tokio::test]
    async fn test_update_and_get_service_health() {
        let state = MonitoringState::new();
        let health = ServiceHealth {
            service_name: "svc-a".to_string(),
            status: ServiceStatus::Healthy,
            response_time_ms: 12,
            last_check: Utc::now(),
            message: None,
            details: HashMap::new(),
        };
        state
            .update_service_health("svc-a".to_string(), health)
            .await;
        let services = state.get_all_services_health().await;
        assert_eq!(services.len(), 1);
        assert_eq!(services[0].service_name, "svc-a");
        assert_eq!(services[0].status, ServiceStatus::Healthy);
    }

    #[tokio::test]
    async fn test_evaluate_alert_rule_cooldown_suppresses_second() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = AlertRule {
            id: "cd-rule".to_string(),
            name: "cd".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "m".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold: 10.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P3,
            category: AlertCategory::Other,
            cooldown_seconds: 3600,
            enabled: true,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };
        // First trigger: value exceeds threshold → Some
        let first = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(first.is_some());
        // Second trigger immediately: within cooldown → None
        let second = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(second.is_none());
    }

    // ===== Helpers =====

    fn make_test_rule(
        id: &str,
        severity: AlertSeverity,
        category: AlertCategory,
        threshold: f64,
        enabled: bool,
        cooldown_seconds: u64,
    ) -> AlertRule {
        let now = Utc::now();
        AlertRule {
            id: id.to_string(),
            name: format!("rule-{}", id),
            description: None,
            condition: AlertCondition {
                metric: "test_metric".to_string(),
                operator: AlertOperator::GreaterThan,
                threshold,
                duration_seconds: None,
            },
            severity,
            category,
            cooldown_seconds,
            enabled,
            escalation: false,
            team: Some("test-team".to_string()),
            runbook_url: None,
            created_at: now,
            updated_at: now,
        }
    }

    fn make_alert_with_labels(
        severity: AlertSeverity,
        category: AlertCategory,
        labels: HashMap<String, String>,
        triggered_at: DateTime<Utc>,
        resolved: bool,
    ) -> Alert {
        Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: None,
            rule_name: "manual".to_string(),
            severity,
            category,
            message: "manual alert".to_string(),
            description: None,
            service_name: None,
            instance: None,
            triggered_at,
            resolved_at: if resolved { Some(triggered_at) } else { None },
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels,
            annotations: HashMap::new(),
        }
    }

    // ===== serde roundtrips for previously uncovered types =====

    #[tokio::test]
    async fn test_alert_severity_serde_roundtrip_all_variants() {
        for original in [
            AlertSeverity::P0,
            AlertSeverity::P1,
            AlertSeverity::P2,
            AlertSeverity::P3,
        ] {
            let json = serde_json::to_string(&original).expect("serialize AlertSeverity");
            let back: AlertSeverity =
                serde_json::from_str(&json).expect("deserialize AlertSeverity");
            assert_eq!(original, back);
        }
        // serde rename_all = "UPPERCASE"
        assert_eq!(serde_json::to_string(&AlertSeverity::P0).unwrap(), "\"P0\"");
        assert_eq!(serde_json::to_string(&AlertSeverity::P3).unwrap(), "\"P3\"");
    }

    #[tokio::test]
    async fn test_alert_condition_serde_roundtrip() {
        let original = AlertCondition {
            metric: "cpu_usage".to_string(),
            operator: AlertOperator::GreaterThanOrEqual,
            threshold: 75.5,
            duration_seconds: Some(300),
        };
        let json = serde_json::to_string(&original).expect("serialize AlertCondition");
        let back: AlertCondition = serde_json::from_str(&json).expect("deserialize AlertCondition");
        let json_again = serde_json::to_string(&back).expect("serialize AlertCondition again");
        assert_eq!(json, json_again);
        assert_eq!(back.threshold, 75.5);
        assert_eq!(back.operator, AlertOperator::GreaterThanOrEqual);
    }

    #[tokio::test]
    async fn test_alert_condition_serde_duration_none() {
        let original = AlertCondition {
            metric: "m".to_string(),
            operator: AlertOperator::Equal,
            threshold: 0.0,
            duration_seconds: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: AlertCondition = serde_json::from_str(&json).unwrap();
        assert!(back.duration_seconds.is_none());
    }

    #[tokio::test]
    async fn test_alert_category_serde_roundtrip_all_variants() {
        let variants = [
            AlertCategory::Service,
            AlertCategory::Database,
            AlertCategory::Cache,
            AlertCategory::Messaging,
            AlertCategory::System,
            AlertCategory::Container,
            AlertCategory::Backup,
            AlertCategory::Security,
            AlertCategory::Network,
            AlertCategory::Business,
            AlertCategory::Other,
        ];
        for original in variants {
            let json = serde_json::to_string(&original).expect("serialize AlertCategory");
            let back: AlertCategory =
                serde_json::from_str(&json).expect("deserialize AlertCategory");
            assert_eq!(original, back);
        }
        // serde rename_all = "lowercase"
        assert_eq!(
            serde_json::to_string(&AlertCategory::Database).unwrap(),
            "\"database\""
        );
    }

    #[tokio::test]
    async fn test_alert_statistics_serde_roundtrip() {
        let original = AlertStatistics {
            total_alerts: 10,
            active_alerts: 4,
            resolved_alerts: 6,
            p0_count: 1,
            p1_count: 2,
            p2_count: 3,
            p3_count: 4,
            acknowledged_count: 5,
            avg_resolution_time_seconds: Some(42.5),
            top_services: vec![ServiceAlertCount {
                service_name: "svc".to_string(),
                alert_count: 3,
            }],
            top_categories: vec![CategoryAlertCount {
                category: AlertCategory::System,
                alert_count: 7,
            }],
            trend_last_24h: vec![HourlyAlertCount {
                hour: Utc::now(),
                count: 2,
            }],
        };
        let json = serde_json::to_string(&original).expect("serialize AlertStatistics");
        let back: AlertStatistics =
            serde_json::from_str(&json).expect("deserialize AlertStatistics");
        let json_again = serde_json::to_string(&back).expect("serialize AlertStatistics again");
        assert_eq!(json, json_again);
        assert_eq!(back.total_alerts, 10);
        assert_eq!(back.avg_resolution_time_seconds, Some(42.5));
    }

    #[tokio::test]
    async fn test_service_alert_count_serde_roundtrip() {
        let original = ServiceAlertCount {
            service_name: "api-svc".to_string(),
            alert_count: 99,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: ServiceAlertCount = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert_eq!(back.service_name, "api-svc");
        assert_eq!(back.alert_count, 99);
    }

    #[tokio::test]
    async fn test_category_alert_count_serde_roundtrip() {
        let original = CategoryAlertCount {
            category: AlertCategory::Network,
            alert_count: 7,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: CategoryAlertCount = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert_eq!(back.category, AlertCategory::Network);
        assert_eq!(back.alert_count, 7);
    }

    #[tokio::test]
    async fn test_hourly_alert_count_serde_roundtrip() {
        let now = Utc::now();
        let original = HourlyAlertCount {
            hour: now,
            count: 5,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: HourlyAlertCount = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert_eq!(back.hour, now);
        assert_eq!(back.count, 5);
    }

    #[tokio::test]
    async fn test_alert_convergence_config_serde_roundtrip() {
        let original = AlertConvergenceConfig {
            group_by: vec!["a".to_string(), "b".to_string()],
            group_wait_seconds: 10,
            group_interval_seconds: 100,
            repeat_interval_seconds: 1000,
            max_alerts_per_group: 50,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: AlertConvergenceConfig = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert_eq!(back.group_by.len(), 2);
        assert_eq!(back.max_alerts_per_group, 50);
    }

    #[tokio::test]
    async fn test_silence_matcher_serde_roundtrip() {
        let original = SilenceMatcher {
            name: "severity".to_string(),
            value: "P0".to_string(),
            is_regex: true,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: SilenceMatcher = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert!(back.is_regex);
    }

    #[tokio::test]
    async fn test_silence_recurrence_serde_all_patterns() {
        for original in [
            RecurrencePattern::Daily,
            RecurrencePattern::Weekly,
            RecurrencePattern::Weekdays,
            RecurrencePattern::Weekends,
            RecurrencePattern::Custom,
        ] {
            let json = serde_json::to_string(&original).unwrap();
            let back: RecurrencePattern = serde_json::from_str(&json).unwrap();
            assert_eq!(original, back);
        }
        // serde rename_all = "lowercase"
        assert_eq!(
            serde_json::to_string(&RecurrencePattern::Weekly).unwrap(),
            "\"weekly\""
        );
        assert_eq!(
            serde_json::to_string(&RecurrencePattern::Custom).unwrap(),
            "\"custom\""
        );
    }

    #[tokio::test]
    async fn test_silence_recurrence_full_struct_serde() {
        let original = SilenceRecurrence {
            pattern: RecurrencePattern::Weekly,
            interval_days: Some(7),
            weekdays: Some(vec![1, 2, 3, 4, 5]),
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: SilenceRecurrence = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert_eq!(back.interval_days, Some(7));
        assert_eq!(back.weekdays.as_deref(), Some(&[1u8, 2, 3, 4, 5][..]));
    }

    #[tokio::test]
    async fn test_monitoring_error_display() {
        assert_eq!(
            MonitoringError::DateTimeConstruction.to_string(),
            "Invalid datetime construction"
        );
        assert_eq!(
            MonitoringError::UnexpectedNone.to_string(),
            "Unexpected none value"
        );
    }

    // ===== record_request deep coverage =====

    #[tokio::test]
    async fn test_record_request_avg_calculation() {
        let state = MonitoringState::new();
        state.record_request(true, 100).await;
        state.record_request(true, 200).await;
        state.record_request(true, 300).await;
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.requests_total, 3);
        assert_eq!(metrics.requests_success, 3);
        assert_eq!(metrics.avg_response_time_ms, 200); // (100+200+300)/3
    }

    #[tokio::test]
    async fn test_record_request_all_failures() {
        let state = MonitoringState::new();
        state.record_request(false, 50).await;
        state.record_request(false, 150).await;
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.requests_success, 0);
        assert_eq!(metrics.requests_failed, 2);
        assert_eq!(metrics.requests_total, 2);
        assert_eq!(metrics.avg_response_time_ms, 100); // (50+150)/2
    }

    #[tokio::test]
    async fn test_record_request_zero_response_time() {
        let state = MonitoringState::new();
        state.record_request(true, 0).await;
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.avg_response_time_ms, 0);
        assert_eq!(metrics.requests_total, 1);
    }

    #[tokio::test]
    async fn test_record_request_mixed_updates_counts() {
        let state = MonitoringState::new();
        for _ in 0..7 {
            state.record_request(true, 10).await;
        }
        for _ in 0..3 {
            state.record_request(false, 20).await;
        }
        let metrics = state.get_metrics().await;
        assert_eq!(metrics.requests_total, 10);
        assert_eq!(metrics.requests_success, 7);
        assert_eq!(metrics.requests_failed, 3);
        // avg = (7*10 + 3*20)/10 = 130/10 = 13
        assert_eq!(metrics.avg_response_time_ms, 13);
    }

    #[tokio::test]
    async fn test_record_request_response_times_capped_at_1000() {
        let state = MonitoringState::new();
        for i in 0..1005u64 {
            state.record_request(true, i).await;
        }
        let times = state.response_times.read().await;
        assert_eq!(times.len(), 1000);
        // First 5 values (0..5) drained; oldest kept is value 5, newest is 1004.
        assert_eq!(times[0], 5);
        assert_eq!(times[999], 1004);
    }

    // ===== silence rule evaluation (via evaluate_alert_rule) =====

    #[tokio::test]
    async fn test_evaluate_alert_rule_silenced_by_severity() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-sev",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-1".to_string(),
            name: "silence p2".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P2".to_string(),
                is_regex: false,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(
            result.is_none(),
            "P2 rule should be silenced by severity matcher"
        );
    }

    #[tokio::test]
    async fn test_evaluate_alert_rule_silenced_by_category() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-cat",
            AlertSeverity::P2,
            AlertCategory::Database,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-cat".to_string(),
            name: "silence database".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "category".to_string(),
                value: "database".to_string(),
                is_regex: false,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.evaluate_alert_rule(&rule, 50.0).await.is_none());
    }

    #[tokio::test]
    async fn test_evaluate_alert_rule_silenced_by_regex() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-re",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-re".to_string(),
            name: "regex silence".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P[23]".to_string(),
                is_regex: true,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(
            state.evaluate_alert_rule(&rule, 50.0).await.is_none(),
            "P2 matches P[23] regex"
        );
    }

    #[tokio::test]
    async fn test_silence_regex_does_not_match_other_severity() {
        let state = MonitoringState::new();
        let now = Utc::now();
        // P0 rule: regex "P[23]" should NOT silence P0
        let rule = make_test_rule(
            "sil-re-p0",
            AlertSeverity::P0,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-re-p0".to_string(),
            name: "regex p23".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P[23]".to_string(),
                is_regex: true,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(
            state.evaluate_alert_rule(&rule, 50.0).await.is_some(),
            "P0 not silenced by P[23] regex"
        );
    }

    #[tokio::test]
    async fn test_silence_disabled_does_not_silence() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-dis",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-dis".to_string(),
            name: "disabled".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P2".to_string(),
                is_regex: false,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: false,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.evaluate_alert_rule(&rule, 50.0).await.is_some());
    }

    #[tokio::test]
    async fn test_silence_out_of_window_does_not_silence() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-out",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        // Window entirely in the future → now < starts_at → skipped
        let silence = SilenceRule {
            id: "sil-out".to_string(),
            name: "future".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "severity".to_string(),
                value: "P2".to_string(),
                is_regex: false,
            }],
            starts_at: now + Duration::hours(1),
            ends_at: now + Duration::hours(2),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.evaluate_alert_rule(&rule, 50.0).await.is_some());
    }

    #[tokio::test]
    async fn test_silence_team_matcher_matches() {
        let state = MonitoringState::new();
        let now = Utc::now();
        // make_test_rule sets team = Some("test-team")
        let rule = make_test_rule(
            "sil-team",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-team".to_string(),
            name: "team silence".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "team".to_string(),
                value: "test-team".to_string(),
                is_regex: false,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.evaluate_alert_rule(&rule, 50.0).await.is_none());
    }

    #[tokio::test]
    async fn test_silence_unknown_matcher_name_ignored() {
        // Matcher names other than severity/category/team are skipped (`continue`),
        // leaving matches=true → silences any rule within window.
        let state = MonitoringState::new();
        let now = Utc::now();
        let rule = make_test_rule(
            "sil-unk",
            AlertSeverity::P2,
            AlertCategory::Other,
            10.0,
            true,
            0,
        );
        let silence = SilenceRule {
            id: "sil-unk".to_string(),
            name: "unknown matcher".to_string(),
            description: None,
            matchers: vec![SilenceMatcher {
                name: "unknown_field".to_string(),
                value: "whatever".to_string(),
                is_regex: false,
            }],
            starts_at: now - Duration::hours(1),
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert!(state.evaluate_alert_rule(&rule, 50.0).await.is_none());
    }

    // ===== suppression rule evaluation (via evaluate_alert_rule) =====

    #[tokio::test]
    async fn test_suppression_p0_suppresses_p2_same_category() {
        let state = MonitoringState::new();
        // new() loads default suppression rules incl. p0-suppress-p1-p2-p3
        let mut labels = HashMap::new();
        labels.insert("category".to_string(), "system".to_string());
        let p0_alert = make_alert_with_labels(
            AlertSeverity::P0,
            AlertCategory::System,
            labels,
            Utc::now(),
            false,
        );
        state.alerts.write().await.push(p0_alert);

        let rule = make_test_rule(
            "sup-p2",
            AlertSeverity::P2,
            AlertCategory::System,
            10.0,
            true,
            0,
        );
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(
            result.is_none(),
            "P2 should be suppressed by active P0 with matching category"
        );
    }

    #[tokio::test]
    async fn test_suppression_resolved_alert_does_not_suppress() {
        let state = MonitoringState::new();
        let mut labels = HashMap::new();
        labels.insert("category".to_string(), "system".to_string());
        let p0_alert = make_alert_with_labels(
            AlertSeverity::P0,
            AlertCategory::System,
            labels,
            Utc::now(),
            true, // resolved → skipped
        );
        state.alerts.write().await.push(p0_alert);

        let rule = make_test_rule(
            "sup-resolved",
            AlertSeverity::P2,
            AlertCategory::System,
            10.0,
            true,
            0,
        );
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(result.is_some(), "Resolved P0 should not suppress");
    }

    #[tokio::test]
    async fn test_suppression_aged_out_does_not_suppress() {
        let state = MonitoringState::new();
        let mut labels = HashMap::new();
        labels.insert("category".to_string(), "system".to_string());
        let p0_alert = make_alert_with_labels(
            AlertSeverity::P0,
            AlertCategory::System,
            labels,
            Utc::now() - Duration::hours(25), // older than 24h
            false,
        );
        state.alerts.write().await.push(p0_alert);

        let rule = make_test_rule(
            "sup-aged",
            AlertSeverity::P2,
            AlertCategory::System,
            10.0,
            true,
            0,
        );
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(
            result.is_some(),
            "P0 alert older than 24h should not suppress"
        );
    }

    #[tokio::test]
    async fn test_suppression_different_category_does_not_suppress() {
        let state = MonitoringState::new();
        let mut labels = HashMap::new();
        labels.insert("category".to_string(), "database".to_string());
        let p0_alert = make_alert_with_labels(
            AlertSeverity::P0,
            AlertCategory::Database,
            labels,
            Utc::now(),
            false,
        );
        state.alerts.write().await.push(p0_alert);

        // P2 rule with System category; active P0 alert has Database category → labels mismatch
        let rule = make_test_rule(
            "sup-diff",
            AlertSeverity::P2,
            AlertCategory::System,
            10.0,
            true,
            0,
        );
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(result.is_some(), "Different category should not suppress");
    }

    #[tokio::test]
    async fn test_suppression_higher_severity_rule_not_suppressed() {
        // A P0 rule must not be suppressed by lower-severity (P1) source suppression rules
        // (rule.severity.is_higher_than(source) → skip).
        let state = MonitoringState::new();
        let mut labels = HashMap::new();
        labels.insert("category".to_string(), "system".to_string());
        let p1_alert = make_alert_with_labels(
            AlertSeverity::P1,
            AlertCategory::System,
            labels,
            Utc::now(),
            false,
        );
        state.alerts.write().await.push(p1_alert);

        let rule = make_test_rule(
            "sup-p0",
            AlertSeverity::P0,
            AlertCategory::System,
            10.0,
            true,
            0,
        );
        let result = state.evaluate_alert_rule(&rule, 50.0).await;
        assert!(
            result.is_some(),
            "P0 rule should not be suppressed by P1 source"
        );
    }

    // ===== create / acknowledge / resolve deep coverage =====

    #[tokio::test]
    async fn test_create_alert_generates_unique_ids() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "ca-1",
            AlertSeverity::P2,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let a1 = state.create_alert(&rule, "m1".to_string()).await;
        let a2 = state.create_alert(&rule, "m2".to_string()).await;
        assert_ne!(a1.id, a2.id);
        assert_eq!(a1.rule_id.as_deref(), Some("ca-1"));
        assert_eq!(a1.message, "m1");
        assert_eq!(a1.escalation_level, 0);
        assert!(a1.labels.is_empty());
        assert!(a1.annotations.is_empty());
        assert!(a1.resolved_at.is_none());
        assert!(!a1.acknowledged);
    }

    #[tokio::test]
    async fn test_acknowledge_alert_not_found_returns_false() {
        let state = MonitoringState::new();
        assert!(!state.acknowledge_alert("nonexistent", "ops").await);
    }

    #[tokio::test]
    async fn test_resolve_alert_not_found_returns_false() {
        let state = MonitoringState::new();
        assert!(!state.resolve_alert("nonexistent").await);
    }

    #[tokio::test]
    async fn test_acknowledge_alert_sets_all_fields() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "ack-1",
            AlertSeverity::P1,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let alert = state.create_alert(&rule, "msg".to_string()).await;
        assert!(state.acknowledge_alert(&alert.id, "oncall").await);
        let active = state.get_active_alerts().await;
        assert_eq!(active.len(), 1);
        let a = &active[0];
        assert!(a.acknowledged);
        assert!(a.acknowledged_at.is_some());
        assert_eq!(a.acknowledged_by.as_deref(), Some("oncall"));
    }

    #[tokio::test]
    async fn test_resolve_alert_sets_resolved_at() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "res-1",
            AlertSeverity::P1,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let alert = state.create_alert(&rule, "msg".to_string()).await;
        assert!(state.resolve_alert(&alert.id).await);
        assert_eq!(state.get_active_alerts().await.len(), 0);
    }

    #[tokio::test]
    async fn test_alerts_capped_at_1000() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "cap-1",
            AlertSeverity::P3,
            AlertCategory::Other,
            0.0,
            true,
            0,
        );
        for _ in 0..1005 {
            state.create_alert(&rule, "m".to_string()).await;
        }
        let alerts = state.alerts.read().await;
        assert_eq!(alerts.len(), 1000);
    }

    #[tokio::test]
    async fn test_get_active_alerts_excludes_resolved() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "act-1",
            AlertSeverity::P2,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let a1 = state.create_alert(&rule, "m1".to_string()).await;
        state.create_alert(&rule, "m2".to_string()).await;
        state.resolve_alert(&a1.id).await;
        let active = state.get_active_alerts().await;
        assert_eq!(active.len(), 1);
    }

    #[tokio::test]
    async fn test_get_alerts_by_severity_excludes_resolved() {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "sev-1",
            AlertSeverity::P1,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let a1 = state.create_alert(&rule, "m1".to_string()).await;
        state.create_alert(&rule, "m2".to_string()).await;
        state.resolve_alert(&a1.id).await;
        assert_eq!(
            state.get_alerts_by_severity(AlertSeverity::P1).await.len(),
            1
        );
    }

    // ===== get_statistics deep coverage =====

    #[tokio::test]
    async fn test_statistics_empty_state() -> Result<(), MonitoringError> {
        let state = MonitoringState::default();
        let stats = state.get_statistics().await?;
        assert_eq!(stats.total_alerts, 0);
        assert_eq!(stats.active_alerts, 0);
        assert_eq!(stats.resolved_alerts, 0);
        assert_eq!(stats.acknowledged_count, 0);
        assert!(stats.avg_resolution_time_seconds.is_none());
        assert!(stats.top_services.is_empty());
        assert!(stats.top_categories.is_empty());
        assert_eq!(stats.trend_last_24h.len(), 24);
        assert!(stats.trend_last_24h.iter().all(|h| h.count == 0));
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_resolved_and_active_counts() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "stat-1",
            AlertSeverity::P2,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let a1 = state.create_alert(&rule, "m1".to_string()).await;
        let a2 = state.create_alert(&rule, "m2".to_string()).await;
        state.create_alert(&rule, "m3".to_string()).await;
        state.resolve_alert(&a1.id).await;
        state.resolve_alert(&a2.id).await;
        let stats = state.get_statistics().await?;
        assert_eq!(stats.total_alerts, 3);
        assert_eq!(stats.active_alerts, 1);
        assert_eq!(stats.resolved_alerts, 2);
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_acknowledged_count() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let rule = make_test_rule(
            "stat-ack",
            AlertSeverity::P2,
            AlertCategory::Service,
            0.0,
            true,
            0,
        );
        let a1 = state.create_alert(&rule, "m1".to_string()).await;
        state.create_alert(&rule, "m2".to_string()).await;
        state.acknowledge_alert(&a1.id, "ops").await;
        let stats = state.get_statistics().await?;
        assert_eq!(stats.acknowledged_count, 1);
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_avg_resolution_time() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let triggered = Utc::now() - Duration::seconds(100);
        let alert = Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: None,
            rule_name: "manual".to_string(),
            severity: AlertSeverity::P2,
            category: AlertCategory::Service,
            message: "manual".to_string(),
            description: None,
            service_name: None,
            instance: None,
            triggered_at: triggered,
            resolved_at: Some(triggered + Duration::seconds(100)),
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };
        state.alerts.write().await.push(alert);
        let stats = state.get_statistics().await?;
        assert_eq!(stats.resolved_alerts, 1);
        assert_eq!(stats.avg_resolution_time_seconds, Some(100.0));
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_top_services() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let mk_alert = |svc: &str| Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: None,
            rule_name: "manual".to_string(),
            severity: AlertSeverity::P2,
            category: AlertCategory::Service,
            message: "m".to_string(),
            description: None,
            service_name: Some(svc.to_string()),
            instance: None,
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };
        {
            let mut alerts = state.alerts.write().await;
            alerts.push(mk_alert("svc-a"));
            alerts.push(mk_alert("svc-a"));
            alerts.push(mk_alert("svc-b"));
        }
        let stats = state.get_statistics().await?;
        assert_eq!(stats.top_services.len(), 2);
        // Sorted descending by count
        assert_eq!(stats.top_services[0].service_name, "svc-a");
        assert_eq!(stats.top_services[0].alert_count, 2);
        assert_eq!(stats.top_services[1].alert_count, 1);
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_top_categories_sorted() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let mk_alert = |cat: AlertCategory| Alert {
            id: Uuid::new_v4().to_string(),
            rule_id: None,
            rule_name: "manual".to_string(),
            severity: AlertSeverity::P2,
            category: cat,
            message: "m".to_string(),
            description: None,
            service_name: None,
            instance: None,
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels: HashMap::new(),
            annotations: HashMap::new(),
        };
        {
            let mut alerts = state.alerts.write().await;
            alerts.push(mk_alert(AlertCategory::System));
            alerts.push(mk_alert(AlertCategory::System));
            alerts.push(mk_alert(AlertCategory::Database));
        }
        let stats = state.get_statistics().await?;
        assert_eq!(stats.top_categories.len(), 2);
        assert_eq!(stats.top_categories[0].category, AlertCategory::System);
        assert_eq!(stats.top_categories[0].alert_count, 2);
        assert_eq!(stats.top_categories[1].alert_count, 1);
        Ok(())
    }

    #[tokio::test]
    async fn test_statistics_trend_24h_structure() -> Result<(), MonitoringError> {
        let state = MonitoringState::new();
        let stats = state.get_statistics().await?;
        assert_eq!(stats.trend_last_24h.len(), 24);
        // Buckets are monotonically increasing, exactly 1 hour apart.
        for i in 1..stats.trend_last_24h.len() {
            let prev = stats.trend_last_24h[i - 1].hour;
            let curr = stats.trend_last_24h[i].hour;
            assert_eq!(curr - prev, Duration::hours(1));
        }
        // The last bucket is at most 1 hour behind `now` (window ends at now-1h).
        let now = Utc::now();
        assert!(stats.trend_last_24h[23].hour <= now);
        Ok(())
    }

    // ===== default rules deep coverage =====

    #[tokio::test]
    async fn test_default_alert_rules_count_and_enabled() {
        let rules = default_alert_rules();
        assert_eq!(rules.len(), 10);
        assert!(
            rules.iter().all(|r| r.enabled),
            "all default rules should be enabled"
        );
    }

    #[tokio::test]
    async fn test_default_alert_rules_unique_ids() {
        let rules = default_alert_rules();
        let mut ids: Vec<&str> = rules.iter().map(|r| r.id.as_str()).collect();
        ids.sort();
        let initial_len = ids.len();
        ids.dedup();
        assert_eq!(
            ids.len(),
            initial_len,
            "default alert rule ids should be unique"
        );
    }

    #[tokio::test]
    async fn test_default_alert_rules_all_have_team() {
        let rules = default_alert_rules();
        assert!(rules.iter().all(|r| r.team.as_deref() == Some("devops")));
    }

    #[tokio::test]
    async fn test_default_alert_rules_severity_distribution() {
        let rules = default_alert_rules();
        let p0 = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P0)
            .count();
        let p1 = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P1)
            .count();
        let p2 = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P2)
            .count();
        let p3 = rules
            .iter()
            .filter(|r| r.severity == AlertSeverity::P3)
            .count();
        assert_eq!(p0, 2); // CPU-P0, error-rate-P0
        assert_eq!(p1, 4); // CPU-P1, mem-P1, latency-P1, error-rate-P1
        assert_eq!(p2, 4); // CPU-P2, mem-P2, latency-P2, error-rate-P2
        assert_eq!(p3, 0);
    }

    #[tokio::test]
    async fn test_default_suppression_rules_source_higher_than_target() {
        let rules = default_suppression_rules();
        for r in &rules {
            assert!(
                r.source_severity.is_higher_than(&r.target_severity),
                "suppression source severity must be higher than target"
            );
        }
    }

    #[tokio::test]
    async fn test_default_suppression_rules_all_enabled() {
        let rules = default_suppression_rules();
        assert!(rules.iter().all(|r| r.enabled));
    }

    // ===== get_night_silence_config deep coverage =====

    #[tokio::test]
    async fn test_night_silence_starts_at_22() -> Result<(), MonitoringError> {
        let silence = MonitoringState::get_night_silence_config().await?;
        assert_eq!(silence.starts_at.hour(), 22);
        assert_eq!(silence.starts_at.minute(), 0);
        assert_eq!(silence.starts_at.second(), 0);
        Ok(())
    }

    #[tokio::test]
    async fn test_night_silence_ends_10h_after_start() -> Result<(), MonitoringError> {
        let silence = MonitoringState::get_night_silence_config().await?;
        let diff = silence.ends_at - silence.starts_at;
        assert_eq!(diff.num_hours(), 10);
        Ok(())
    }

    #[tokio::test]
    async fn test_night_silence_matcher_value_regex() -> Result<(), MonitoringError> {
        let silence = MonitoringState::get_night_silence_config().await?;
        assert_eq!(silence.matchers.len(), 1);
        assert_eq!(silence.matchers[0].value, "P[23]");
        assert!(silence.matchers[0].is_regex);
        assert_eq!(silence.matchers[0].name, "severity");
        Ok(())
    }

    #[tokio::test]
    async fn test_night_silence_recurrence_daily() -> Result<(), MonitoringError> {
        let silence = MonitoringState::get_night_silence_config().await?;
        let rec = silence.recurrence.expect("recurrence should be set");
        assert_eq!(rec.pattern, RecurrencePattern::Daily);
        assert_eq!(rec.interval_days, Some(1));
        Ok(())
    }

    // ===== AlertSeverity deep coverage =====

    #[tokio::test]
    async fn test_alert_severity_from_str_all_aliases() {
        assert_eq!(AlertSeverity::from_str("CRITICAL"), Some(AlertSeverity::P0));
        assert_eq!(
            AlertSeverity::from_str("EMERGENCY"),
            Some(AlertSeverity::P0)
        );
        assert_eq!(AlertSeverity::from_str("HIGH"), Some(AlertSeverity::P1));
        assert_eq!(
            AlertSeverity::from_str("IMPORTANT"),
            Some(AlertSeverity::P1)
        );
        assert_eq!(AlertSeverity::from_str("WARNING"), Some(AlertSeverity::P2));
        assert_eq!(AlertSeverity::from_str("MEDIUM"), Some(AlertSeverity::P2));
        assert_eq!(AlertSeverity::from_str("INFO"), Some(AlertSeverity::P3));
        assert_eq!(AlertSeverity::from_str("LOW"), Some(AlertSeverity::P3));
        assert_eq!(AlertSeverity::from_str("TIP"), Some(AlertSeverity::P3));
    }

    #[tokio::test]
    async fn test_alert_severity_from_str_case_insensitive() {
        assert_eq!(AlertSeverity::from_str("p0"), Some(AlertSeverity::P0));
        assert_eq!(AlertSeverity::from_str("P0"), Some(AlertSeverity::P0));
        assert_eq!(AlertSeverity::from_str("Critical"), Some(AlertSeverity::P0));
        assert_eq!(AlertSeverity::from_str("Warning"), Some(AlertSeverity::P2));
        assert_eq!(AlertSeverity::from_str("mEdIuM"), Some(AlertSeverity::P2));
    }

    #[tokio::test]
    async fn test_alert_severity_from_str_empty_and_invalid() {
        assert_eq!(AlertSeverity::from_str(""), None);
        assert_eq!(AlertSeverity::from_str("P5"), None);
        assert_eq!(AlertSeverity::from_str("xyz"), None);
        // trailing space is not trimmed
        assert_eq!(AlertSeverity::from_str("critical "), None);
    }

    #[tokio::test]
    async fn test_alert_severity_is_higher_than_irreflexive_and_antisymmetric() {
        // Irreflexive: no severity is higher than itself
        for s in [
            AlertSeverity::P0,
            AlertSeverity::P1,
            AlertSeverity::P2,
            AlertSeverity::P3,
        ] {
            assert!(!s.is_higher_than(&s));
        }
        // Antisymmetric
        assert!(AlertSeverity::P0.is_higher_than(&AlertSeverity::P3));
        assert!(!AlertSeverity::P3.is_higher_than(&AlertSeverity::P0));
    }

    // ===== AlertOperator deep coverage =====

    #[tokio::test]
    async fn test_alert_operator_evaluate_negative_values() {
        assert!(AlertOperator::LessThan.evaluate(-10.0, 0.0));
        assert!(AlertOperator::GreaterThan.evaluate(-5.0, -10.0));
        assert!(AlertOperator::Equal.evaluate(-5.0, -5.0));
        assert!(AlertOperator::NotEqual.evaluate(-5.0, -6.0));
        assert!(!AlertOperator::LessThanOrEqual.evaluate(-1.0, -2.0));
    }

    #[tokio::test]
    async fn test_alert_operator_evaluate_zero_threshold() {
        assert!(AlertOperator::GreaterThan.evaluate(0.1, 0.0));
        assert!(!AlertOperator::GreaterThan.evaluate(0.0, 0.0));
        assert!(AlertOperator::Equal.evaluate(0.0, 0.0));
        assert!(AlertOperator::LessThanOrEqual.evaluate(0.0, 0.0));
        assert!(AlertOperator::NotEqual.evaluate(0.0001, 0.0));
    }

    // ===== MonitoringState new() vs default() =====

    #[tokio::test]
    async fn test_new_loads_default_alert_rules() {
        let state = MonitoringState::new();
        let rules = state.alert_rules.read().await;
        assert_eq!(rules.len(), 10, "new() should load 10 default alert rules");
    }

    #[tokio::test]
    async fn test_new_loads_default_suppression_rules() {
        let state = MonitoringState::new();
        let rules = state.suppression_rules.read().await;
        assert_eq!(
            rules.len(),
            3,
            "new() should load 3 default suppression rules"
        );
    }

    #[tokio::test]
    async fn test_new_has_empty_silence_rules() {
        let state = MonitoringState::new();
        let silences = state.silence_rules.read().await;
        assert!(
            silences.is_empty(),
            "new() should start with no silence rules"
        );
    }

    #[tokio::test]
    async fn test_new_has_default_convergence_config() {
        let state = MonitoringState::new();
        let cfg = state.convergence_config.read().await;
        assert_eq!(cfg.group_wait_seconds, 30);
        assert_eq!(cfg.max_alerts_per_group, 100);
    }

    // ===== add / remove rules =====

    #[tokio::test]
    async fn test_add_alert_rule_appends() {
        let state = MonitoringState::new();
        let initial = state.alert_rules.read().await.len();
        let rule = make_test_rule(
            "add-1",
            AlertSeverity::P3,
            AlertCategory::Other,
            5.0,
            true,
            10,
        );
        state.add_alert_rule(rule).await;
        assert_eq!(state.alert_rules.read().await.len(), initial + 1);
    }

    #[tokio::test]
    async fn test_remove_alert_rule_unknown_id_returns_false() {
        let state = MonitoringState::new();
        assert!(!state.remove_alert_rule("does-not-exist").await);
    }

    #[tokio::test]
    async fn test_add_silence_rule_appends() {
        let state = MonitoringState::new();
        let now = Utc::now();
        let silence = SilenceRule {
            id: "add-sil".to_string(),
            name: "s".to_string(),
            description: None,
            matchers: vec![],
            starts_at: now,
            ends_at: now + Duration::hours(1),
            created_by: "tester".to_string(),
            comment: None,
            enabled: true,
            recurrence: None,
        };
        state.add_silence_rule(silence).await;
        assert_eq!(state.silence_rules.read().await.len(), 1);
    }

    #[tokio::test]
    async fn test_remove_silence_rule_unknown_id_returns_false() {
        let state = MonitoringState::new();
        assert!(!state.remove_silence_rule("does-not-exist").await);
    }

    // ===== ServiceHealth serde edge cases =====

    #[tokio::test]
    async fn test_service_health_with_details_serde() {
        let mut details = HashMap::new();
        details.insert("region".to_string(), "us-east-1".to_string());
        details.insert("version".to_string(), "1.2.3".to_string());
        let original = ServiceHealth {
            service_name: "svc".to_string(),
            status: ServiceStatus::Healthy,
            response_time_ms: 42,
            last_check: Utc::now(),
            message: None,
            details,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: ServiceHealth = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        // HashMap key order is non-deterministic; compare semantically via Value.
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json_again).unwrap();
        assert_eq!(v1, v2);
        assert_eq!(back.details.len(), 2);
        assert_eq!(back.details.get("region").unwrap(), "us-east-1");
    }

    #[tokio::test]
    async fn test_service_health_details_default_when_missing() {
        // details has #[serde(default)], so omitting it yields an empty map.
        let json = r#"{"service_name":"svc","status":"healthy","response_time_ms":1,"last_check":"2024-01-01T00:00:00Z","message":null}"#;
        let back: ServiceHealth = serde_json::from_str(json).unwrap();
        assert!(back.details.is_empty());
        assert_eq!(back.status, ServiceStatus::Healthy);
        assert_eq!(back.response_time_ms, 1);
    }

    #[tokio::test]
    async fn test_service_health_message_none_serde() {
        let original = ServiceHealth {
            service_name: "svc".to_string(),
            status: ServiceStatus::Unknown,
            response_time_ms: 0,
            last_check: Utc::now(),
            message: None,
            details: HashMap::new(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: ServiceHealth = serde_json::from_str(&json).unwrap();
        assert!(back.message.is_none());
        assert_eq!(back.status, ServiceStatus::Unknown);
    }

    // ===== Alert / AlertRule serde edge cases =====

    #[tokio::test]
    async fn test_alert_with_populated_labels_serde() {
        let mut labels = HashMap::new();
        labels.insert("env".to_string(), "prod".to_string());
        labels.insert("region".to_string(), "ap".to_string());
        let mut annotations = HashMap::new();
        annotations.insert("summary".to_string(), "high cpu".to_string());
        let original = Alert {
            id: "a-2".to_string(),
            rule_id: None,
            rule_name: "r".to_string(),
            severity: AlertSeverity::P2,
            category: AlertCategory::System,
            message: "msg".to_string(),
            description: Some("d".to_string()),
            service_name: Some("svc".to_string()),
            instance: Some("i-1".to_string()),
            triggered_at: Utc::now(),
            resolved_at: None,
            acknowledged: false,
            acknowledged_at: None,
            acknowledged_by: None,
            escalation_level: 0,
            labels,
            annotations,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: Alert = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        // HashMap key order is non-deterministic; compare semantically via Value.
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json_again).unwrap();
        assert_eq!(v1, v2);
        assert_eq!(back.labels.len(), 2);
        assert_eq!(back.annotations.len(), 1);
        assert_eq!(back.instance.as_deref(), Some("i-1"));
    }

    #[tokio::test]
    async fn test_alert_rule_with_all_none_optionals_serde() {
        let now = Utc::now();
        let original = AlertRule {
            id: "rn-1".to_string(),
            name: "n".to_string(),
            description: None,
            condition: AlertCondition {
                metric: "m".to_string(),
                operator: AlertOperator::LessThan,
                threshold: 0.0,
                duration_seconds: None,
            },
            severity: AlertSeverity::P3,
            category: AlertCategory::Other,
            cooldown_seconds: 0,
            enabled: false,
            escalation: false,
            team: None,
            runbook_url: None,
            created_at: now,
            updated_at: now,
        };
        let json = serde_json::to_string(&original).unwrap();
        let back: AlertRule = serde_json::from_str(&json).unwrap();
        let json_again = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json_again);
        assert!(back.description.is_none());
        assert!(back.team.is_none());
        assert!(back.runbook_url.is_none());
        assert!(back.condition.duration_seconds.is_none());
        assert!(!back.enabled);
    }

    #[tokio::test]
    async fn test_alert_convergence_config_custom_values() {
        let cfg = AlertConvergenceConfig {
            group_by: vec!["alertname".to_string()],
            group_wait_seconds: 60,
            group_interval_seconds: 600,
            repeat_interval_seconds: 7200,
            max_alerts_per_group: 200,
        };
        assert_eq!(cfg.group_wait_seconds, 60);
        assert_eq!(cfg.repeat_interval_seconds, 7200);
        assert_eq!(cfg.max_alerts_per_group, 200);
        assert_eq!(cfg.group_by.len(), 1);
    }

    #[tokio::test]
    async fn test_update_service_health_overwrites_existing() {
        let state = MonitoringState::new();
        let h1 = ServiceHealth {
            service_name: "svc-a".to_string(),
            status: ServiceStatus::Healthy,
            response_time_ms: 10,
            last_check: Utc::now(),
            message: None,
            details: HashMap::new(),
        };
        state.update_service_health("svc-a".to_string(), h1).await;
        let h2 = ServiceHealth {
            service_name: "svc-a".to_string(),
            status: ServiceStatus::Degraded,
            response_time_ms: 500,
            last_check: Utc::now(),
            message: Some("slow".to_string()),
            details: HashMap::new(),
        };
        state.update_service_health("svc-a".to_string(), h2).await;
        let services = state.get_all_services_health().await;
        assert_eq!(services.len(), 1);
        assert_eq!(services[0].status, ServiceStatus::Degraded);
        assert_eq!(services[0].response_time_ms, 500);
    }
}
