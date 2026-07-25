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
}
