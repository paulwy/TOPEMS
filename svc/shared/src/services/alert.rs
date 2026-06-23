//! Alert Service
//! 
//! Provides anomaly detection and alert notification for QMS-LIMS-EHS data linkage.

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
    Emergency,
}

/// Alert category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertCategory {
    Quality,
    Safety,
    Environment,
    Equipment,
    Process,
    Compliance,
}

/// Alert notification channel
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertChannel {
    Email,
    Sms,
    Push,
    Webhook,
    InApp,
}

/// Alert rule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: AlertCategory,
    pub severity: AlertSeverity,
    pub condition: AlertCondition,
    pub channels: Vec<AlertChannel>,
    pub recipients: Vec<String>,
    pub enabled: bool,
    pub cooldown_minutes: u32,
    pub auto_resolve: bool,
}

/// Alert condition types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertCondition {
    Threshold {
        metric: String,
        operator: ComparisonOperator,
        value: f64,
        duration_minutes: u32,
    },
    RateOfChange {
        metric: String,
        operator: ComparisonOperator,
        value: f64,
        window_minutes: u32,
    },
    Anomaly {
        metric: String,
        deviation_factor: f64,
    },
    Pattern {
        pattern: String,
        match_count: u32,
        window_minutes: u32,
    },
    Composite {
        rules: Vec<String>,
        operator: LogicalOperator,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ComparisonOperator {
    GreaterThan,
    LessThan,
    Equal,
    NotEqual,
    GreaterThanOrEqual,
    LessThanOrEqual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum LogicalOperator {
    And,
    Or,
    Not,
}

/// Alert instance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub rule_id: String,
    pub rule_name: String,
    pub category: AlertCategory,
    pub severity: AlertSeverity,
    pub message: String,
    pub details: HashMap<String, serde_json::Value>,
    pub status: AlertStatus,
    pub created_at: String,
    pub resolved_at: Option<String>,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertStatus {
    Active,
    Acknowledged,
    Resolved,
    Suppressed,
}

/// Alert service
pub struct AlertService {
    rules: Vec<AlertRule>,
    active_alerts: Vec<Alert>,
}

impl AlertService {
    pub fn new() -> Self {
        Self {
            rules: Vec::new(),
            active_alerts: Vec::new(),
        }
    }

    pub fn add_rule(&mut self, rule: AlertRule) {
        self.rules.push(rule);
    }

    pub fn remove_rule(&mut self, rule_id: &str) {
        self.rules.retain(|r| r.id != rule_id);
    }

    /// Evaluate all rules against current metrics
    pub async fn evaluate_rules(
        &mut self,
        metrics: &HashMap<String, f64>,
    ) -> Vec<Alert> {
        let mut new_alerts = Vec::new();

        for rule in &self.rules {
            if !rule.enabled {
                continue;
            }

            if let Some(alert) = self.evaluate_rule(rule, metrics).await {
                // Check cooldown
                let recent_alert = self.active_alerts.iter().any(|a| {
                    a.rule_id == rule.id && a.status == AlertStatus::Active
                });

                if !recent_alert {
                    new_alerts.push(alert.clone());
                    self.active_alerts.push(alert);
                }
            }
        }

        new_alerts
    }

    async fn evaluate_rule(
        &self,
        rule: &AlertRule,
        metrics: &HashMap<String, f64>,
    ) -> Option<Alert> {
        let triggered = match &rule.condition {
            AlertCondition::Threshold { metric, operator, value, .. } => {
                metrics.get(metric).map_or(false, |v| {
                    match operator {
                        ComparisonOperator::GreaterThan => v > value,
                        ComparisonOperator::LessThan => v < value,
                        ComparisonOperator::Equal => (v - value).abs() < f64::EPSILON,
                        ComparisonOperator::NotEqual => (v - value).abs() >= f64::EPSILON,
                        ComparisonOperator::GreaterThanOrEqual => v >= value,
                        ComparisonOperator::LessThanOrEqual => v <= value,
                    }
                })
            }
            AlertCondition::RateOfChange { .. } => {
                // Would need historical data
                false
            }
            AlertCondition::Anomaly { metric, deviation_factor } => {
                metrics.get(metric).map_or(false, |v| {
                    v.abs() > *deviation_factor
                })
            }
            AlertCondition::Pattern { .. } => {
                // Would need log analysis
                false
            }
            AlertCondition::Composite { .. } => {
                // Would evaluate composite rules
                false
            }
        };

        if triggered {
            Some(Alert {
                id: uuid::Uuid::new_v4().to_string(),
                rule_id: rule.id.clone(),
                rule_name: rule.name.clone(),
                category: rule.category.clone(),
                severity: rule.severity.clone(),
                message: format!("Alert: {} - {}", rule.name, rule.description),
                details: {
                    let mut map = HashMap::new();
                    map.insert("condition".to_string(), serde_json::json!(rule.condition));
                    map
                },
                status: AlertStatus::Active,
                created_at: chrono::Utc::now().to_rfc3339(),
                resolved_at: None,
                acknowledged_by: None,
                acknowledged_at: None,
            })
        } else {
            None
        }
    }

    pub fn acknowledge_alert(&mut self, alert_id: &str, user_id: &str) -> Option<&Alert> {
        if let Some(alert) = self.active_alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.status = AlertStatus::Acknowledged;
            alert.acknowledged_by = Some(user_id.to_string());
            alert.acknowledged_at = Some(chrono::Utc::now().to_rfc3339());
            Some(alert)
        } else {
            None
        }
    }

    pub fn resolve_alert(&mut self, alert_id: &str) -> Option<&Alert> {
        if let Some(alert) = self.active_alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.status = AlertStatus::Resolved;
            alert.resolved_at = Some(chrono::Utc::now().to_rfc3339());
            Some(alert)
        } else {
            None
        }
    }

    pub fn get_active_alerts(&self) -> Vec<&Alert> {
        self.active_alerts
            .iter()
            .filter(|a| a.status == AlertStatus::Active || a.status == AlertStatus::Acknowledged)
            .collect()
    }

    pub fn get_alerts_by_severity(&self, severity: &AlertSeverity) -> Vec<&Alert> {
        self.active_alerts
            .iter()
            .filter(|a| a.severity == *severity)
            .collect()
    }
}

impl Default for AlertService {
    fn default() -> Self {
        Self::new()
    }
}

/// Predefined alert rules for QMS-LIMS-EHS
pub fn get_default_qms_alert_rules() -> Vec<AlertRule> {
    vec![
        AlertRule {
            id: "qms_quality_score".to_string(),
            name: "质量评分过低".to_string(),
            description: "当质量评分低于 80 分时触发告警".to_string(),
            category: AlertCategory::Quality,
            severity: AlertSeverity::Warning,
            condition: AlertCondition::Threshold {
                metric: "quality_score".to_string(),
                operator: ComparisonOperator::LessThan,
                value: 80.0,
                duration_minutes: 5,
            },
            channels: vec![AlertChannel::Email, AlertChannel::InApp],
            recipients: vec!["quality_manager".to_string()],
            enabled: true,
            cooldown_minutes: 60,
            auto_resolve: true,
        },
        AlertRule {
            id: "lims_sample_failure".to_string(),
            name: "样品检测失败率过高".to_string(),
            description: "当样品检测失败率超过 5% 时触发告警".to_string(),
            category: AlertCategory::Quality,
            severity: AlertSeverity::Critical,
            condition: AlertCondition::Threshold {
                metric: "sample_failure_rate".to_string(),
                operator: ComparisonOperator::GreaterThan,
                value: 0.05,
                duration_minutes: 15,
            },
            channels: vec![AlertChannel::Email, AlertChannel::Sms, AlertChannel::InApp],
            recipients: vec!["lab_manager".to_string(), "quality_manager".to_string()],
            enabled: true,
            cooldown_minutes: 30,
            auto_resolve: true,
        },
        AlertRule {
            id: "ehs_incident_rate".to_string(),
            name: "安全事故率异常".to_string(),
            description: "当安全事故率超过阈值时触发告警".to_string(),
            category: AlertCategory::Safety,
            severity: AlertSeverity::Emergency,
            condition: AlertCondition::Threshold {
                metric: "incident_rate".to_string(),
                operator: ComparisonOperator::GreaterThan,
                value: 0.01,
                duration_minutes: 1,
            },
            channels: vec![AlertChannel::Email, AlertChannel::Sms, AlertChannel::Push, AlertChannel::InApp],
            recipients: vec!["safety_manager".to_string(), "ehs_director".to_string()],
            enabled: true,
            cooldown_minutes: 10,
            auto_resolve: false,
        },
        AlertRule {
            id: "equipment_downtime".to_string(),
            name: "设备停机时间过长".to_string(),
            description: "当设备停机时间超过预期时触发告警".to_string(),
            category: AlertCategory::Equipment,
            severity: AlertSeverity::Warning,
            condition: AlertCondition::Threshold {
                metric: "equipment_downtime_hours".to_string(),
                operator: ComparisonOperator::GreaterThan,
                value: 4.0,
                duration_minutes: 5,
            },
            channels: vec![AlertChannel::Email, AlertChannel::InApp],
            recipients: vec!["maintenance_manager".to_string()],
            enabled: true,
            cooldown_minutes: 120,
            auto_resolve: true,
        },
    ]
}
