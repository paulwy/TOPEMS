use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// 告警级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum AlertSeverity {
    /// 信息
    Info,
    /// 警告
    Warning,
    /// 严重
    Critical,
    /// 紧急
    Emergency,
}

/// 告警状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertState {
    /// 触发中
    Firing,
    /// 已确认
    Acknowledged,
    /// 已解决
    Resolved,
    /// 已静默
    Silenced,
}

/// 告警规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub severity: AlertSeverity,
    /// 触发条件（PromQL 表达式）
    pub expression: String,
    /// 触发阈值
    pub threshold: f64,
    /// 持续时间（秒）
    pub for_seconds: u64,
    /// 标签
    pub labels: HashMap<String, String>,
    /// 注解（通知内容）
    pub annotations: HashMap<String, String>,
    /// 是否启用
    pub enabled: bool,
}

/// 告警事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    pub id: String,
    pub rule_id: String,
    pub rule_name: String,
    pub severity: AlertSeverity,
    pub state: AlertState,
    pub message: String,
    pub fired_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub labels: HashMap<String, String>,
    pub value: f64,
}

/// 告警管理器
pub struct AlertManager {
    rules: Arc<RwLock<HashMap<String, AlertRule>>>,
    active_alerts: Arc<RwLock<HashMap<String, AlertEvent>>>,
    history: Arc<RwLock<Vec<AlertEvent>>>,
}

impl AlertManager {
    pub fn new() -> Self {
        Self {
            rules: Arc::new(RwLock::new(HashMap::new())),
            active_alerts: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// 添加告警规则
    pub fn add_rule(&self, rule: AlertRule) {
        self.rules.write().insert(rule.id.clone(), rule);
    }

    /// 触发告警
    pub fn fire_alert(&self, rule_id: &str, value: f64, message: &str) {
        let rules = self.rules.read();
        let rule = match rules.get(rule_id) {
            Some(r) => r,
            None => return,
        };

        let alert = AlertEvent {
            id: uuid::Uuid::new_v4().to_string(),
            rule_id: rule_id.to_string(),
            rule_name: rule.name.clone(),
            severity: rule.severity,
            state: AlertState::Firing,
            message: message.to_string(),
            fired_at: Utc::now(),
            resolved_at: None,
            labels: rule.labels.clone(),
            value,
        };

        // 记录到活跃告警
        self.active_alerts
            .write()
            .insert(alert.id.clone(), alert.clone());

        // 记录到历史
        self.history.write().push(alert);

        // 根据级别决定通知方式
        let notifications = Self::notification_channels(rule.severity);
        for channel in notifications {
            tracing::warn!(
                severity = ?rule.severity,
                channel = %channel,
                rule = %rule.name,
                value = value,
                "Alert fired: {}",
                message
            );
        }
    }

    /// 确认告警
    pub fn acknowledge_alert(&self, alert_id: &str) -> bool {
        let mut alerts = self.active_alerts.write();
        if let Some(alert) = alerts.get_mut(alert_id) {
            alert.state = AlertState::Acknowledged;
            return true;
        }
        false
    }

    /// 解决告警
    pub fn resolve_alert(&self, alert_id: &str) -> bool {
        let mut alerts = self.active_alerts.write();
        if let Some(alert) = alerts.get_mut(alert_id) {
            alert.state = AlertState::Resolved;
            alert.resolved_at = Some(Utc::now());
            // 从活跃告警移到历史
            let resolved = alerts.remove(alert_id);
            drop(alerts);
            if let Some(resolved) = resolved {
                self.history.write().push(resolved);
            }
            return true;
        }
        false
    }

    /// 静默告警
    pub fn silence_alert(&self, alert_id: &str) -> bool {
        let mut alerts = self.active_alerts.write();
        if let Some(alert) = alerts.get_mut(alert_id) {
            alert.state = AlertState::Silenced;
            return true;
        }
        false
    }

    /// 获取活跃告警
    pub fn get_active_alerts(&self) -> Vec<AlertEvent> {
        self.active_alerts.read().values().cloned().collect()
    }

    /// 获取告警历史
    pub fn get_history(&self, limit: usize) -> Vec<AlertEvent> {
        let history = self.history.read();
        history.iter().rev().take(limit).cloned().collect()
    }

    /// 获取通知渠道
    fn notification_channels(severity: AlertSeverity) -> Vec<&'static str> {
        match severity {
            AlertSeverity::Info => vec!["log"],
            AlertSeverity::Warning => vec!["log", "websocket"],
            AlertSeverity::Critical => vec!["log", "websocket", "email"],
            AlertSeverity::Emergency => vec!["log", "websocket", "email", "sms", "phone"],
        }
    }

    /// 获取告警统计
    pub fn get_stats(&self) -> AlertStats {
        let alerts = self.active_alerts.read();
        let total = alerts.len();
        let mut stats = AlertStats::default();
        stats.total = total;
        for a in alerts.values() {
            match a.severity {
                AlertSeverity::Info => stats.info += 1,
                AlertSeverity::Warning => stats.warning += 1,
                AlertSeverity::Critical => stats.critical += 1,
                AlertSeverity::Emergency => stats.emergency += 1,
            }
        }
        stats
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AlertStats {
    pub total: usize,
    pub info: usize,
    pub warning: usize,
    pub critical: usize,
    pub emergency: usize,
}

impl Default for AlertManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_rule(id: &str, severity: AlertSeverity) -> AlertRule {
        AlertRule {
            id: id.to_string(),
            name: format!("rule-{}", id),
            description: "test rule".to_string(),
            severity,
            expression: "up == 0".to_string(),
            threshold: 1.0,
            for_seconds: 60,
            labels: HashMap::new(),
            annotations: HashMap::new(),
            enabled: true,
        }
    }

    #[test]
    fn test_alert_fire_and_resolve() {
        let manager = AlertManager::new();
        manager.add_rule(make_rule("r1", AlertSeverity::Critical));

        // 初始无活跃告警
        assert_eq!(manager.get_active_alerts().len(), 0);
        let initial_stats = manager.get_stats();
        assert_eq!(initial_stats.total, 0);

        // 触发告警
        manager.fire_alert("r1", 2.5, "service down");
        let active = manager.get_active_alerts();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].state, AlertState::Firing);
        assert_eq!(active[0].severity, AlertSeverity::Critical);
        assert_eq!(active[0].value, 2.5);
        assert!(active[0].resolved_at.is_none());

        // 统计应反映活跃告警
        let stats = manager.get_stats();
        assert_eq!(stats.total, 1);
        assert_eq!(stats.critical, 1);

        // 确认告警
        let alert_id = active[0].id.clone();
        assert!(manager.acknowledge_alert(&alert_id));
        let active = manager.get_active_alerts();
        assert_eq!(active[0].state, AlertState::Acknowledged);

        // 解决告警
        assert!(manager.resolve_alert(&alert_id));
        assert_eq!(manager.get_active_alerts().len(), 0);

        // 历史中应有两条记录（fire + resolve）
        let history = manager.get_history(10);
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].state, AlertState::Resolved);
        assert!(history[0].resolved_at.is_some());

        // 不存在的告警 ID 应返回 false
        assert!(!manager.acknowledge_alert("nonexistent"));
        assert!(!manager.resolve_alert("nonexistent"));
        assert!(!manager.silence_alert("nonexistent"));
    }

    #[test]
    fn test_alert_severity_ordering() {
        assert!(AlertSeverity::Info < AlertSeverity::Warning);
        assert!(AlertSeverity::Warning < AlertSeverity::Critical);
        assert!(AlertSeverity::Critical < AlertSeverity::Emergency);
        assert!((AlertSeverity::Emergency >= AlertSeverity::Info));

        // 通过 PartialOrd/Ord 排序
        let mut levels = vec![
            AlertSeverity::Critical,
            AlertSeverity::Info,
            AlertSeverity::Emergency,
            AlertSeverity::Warning,
        ];
        levels.sort();
        assert_eq!(
            levels,
            vec![
                AlertSeverity::Info,
                AlertSeverity::Warning,
                AlertSeverity::Critical,
                AlertSeverity::Emergency,
            ]
        );
    }

    #[test]
    fn test_alert_silence() {
        let manager = AlertManager::new();
        manager.add_rule(make_rule("r2", AlertSeverity::Warning));
        manager.fire_alert("r2", 1.5, "degraded");

        let active = manager.get_active_alerts();
        assert_eq!(active.len(), 1);
        let alert_id = active[0].id.clone();

        assert!(manager.silence_alert(&alert_id));
        let active = manager.get_active_alerts();
        assert_eq!(active[0].state, AlertState::Silenced);
    }

    #[test]
    fn test_alert_stats_by_severity() {
        let manager = AlertManager::new();
        manager.add_rule(make_rule("info", AlertSeverity::Info));
        manager.add_rule(make_rule("warn", AlertSeverity::Warning));
        manager.add_rule(make_rule("crit", AlertSeverity::Critical));
        manager.add_rule(make_rule("emerg", AlertSeverity::Emergency));

        manager.fire_alert("info", 1.0, "info msg");
        manager.fire_alert("warn", 1.0, "warn msg");
        manager.fire_alert("warn", 1.0, "warn msg 2");
        manager.fire_alert("crit", 1.0, "crit msg");
        manager.fire_alert("emerg", 1.0, "emerg msg");

        let stats = manager.get_stats();
        assert_eq!(stats.total, 5);
        assert_eq!(stats.info, 1);
        assert_eq!(stats.warning, 2);
        assert_eq!(stats.critical, 1);
        assert_eq!(stats.emergency, 1);
    }

    #[test]
    fn test_alert_manager_new_empty_state() {
        let manager = AlertManager::new();
        assert_eq!(manager.get_active_alerts().len(), 0);
        assert_eq!(manager.get_history(10).len(), 0);
        let stats = manager.get_stats();
        assert_eq!(stats.total, 0);
        assert_eq!(stats.info, 0);
        assert_eq!(stats.warning, 0);
        assert_eq!(stats.critical, 0);
        assert_eq!(stats.emergency, 0);
    }

    #[test]
    fn test_alert_fire_nonexistent_rule_creates_nothing() {
        let manager = AlertManager::new();
        manager.fire_alert("nonexistent-rule", 1.0, "should be ignored");
        assert_eq!(manager.get_active_alerts().len(), 0);
        assert_eq!(manager.get_history(10).len(), 0);
    }

    #[test]
    fn test_alert_history_reverse_order_and_limit() {
        let manager = AlertManager::new();
        manager.add_rule(make_rule("h1", AlertSeverity::Warning));
        for i in 0..5u64 {
            manager.fire_alert("h1", i as f64, &format!("alert {}", i));
        }
        // History should contain 5 entries from firing.
        let all = manager.get_history(100);
        assert_eq!(all.len(), 5);
        // Reverse order: most recent first.
        assert_eq!(all[0].message, "alert 4");
        assert_eq!(all[1].message, "alert 3");
        assert_eq!(all[2].message, "alert 2");
        // Limited.
        let limited = manager.get_history(2);
        assert_eq!(limited.len(), 2);
        assert_eq!(limited[0].message, "alert 4");
        assert_eq!(limited[1].message, "alert 3");
    }

    #[test]
    fn test_alert_severity_serde_roundtrip() {
        let variants = vec![
            AlertSeverity::Info,
            AlertSeverity::Warning,
            AlertSeverity::Critical,
            AlertSeverity::Emergency,
        ];
        for original in variants {
            let json = serde_json::to_string(&original).expect("serialize AlertSeverity");
            let back: AlertSeverity =
                serde_json::from_str(&json).expect("deserialize AlertSeverity");
            assert_eq!(original, back, "AlertSeverity serde roundtrip mismatch");
        }
    }

    #[test]
    fn test_alert_state_serde_roundtrip() {
        let variants = vec![
            AlertState::Firing,
            AlertState::Acknowledged,
            AlertState::Resolved,
            AlertState::Silenced,
        ];
        for original in variants {
            let json = serde_json::to_string(&original).expect("serialize AlertState");
            let back: AlertState = serde_json::from_str(&json).expect("deserialize AlertState");
            assert_eq!(original, back, "AlertState serde roundtrip mismatch");
        }
    }

    #[test]
    fn test_alert_rule_serde_roundtrip() {
        let original = make_rule("rule-serde", AlertSeverity::Critical);
        let json = serde_json::to_string(&original).expect("serialize AlertRule");
        let back: AlertRule = serde_json::from_str(&json).expect("deserialize AlertRule");
        let json_again = serde_json::to_string(&back).expect("serialize AlertRule again");
        assert_eq!(json, json_again, "AlertRule serde roundtrip mismatch");
    }

    #[test]
    fn test_alert_event_serde_roundtrip() {
        let original = AlertEvent {
            id: "evt-1".to_string(),
            rule_id: "r1".to_string(),
            rule_name: "rule-1".to_string(),
            severity: AlertSeverity::Critical,
            state: AlertState::Firing,
            message: "service down".to_string(),
            fired_at: Utc::now(),
            resolved_at: Some(Utc::now()),
            labels: HashMap::new(),
            value: 2.5,
        };
        let json = serde_json::to_string(&original).expect("serialize AlertEvent");
        let back: AlertEvent = serde_json::from_str(&json).expect("deserialize AlertEvent");
        let json_again = serde_json::to_string(&back).expect("serialize AlertEvent again");
        assert_eq!(json, json_again, "AlertEvent serde roundtrip mismatch");
    }

    #[test]
    fn test_notification_channels_via_fire_all_severities() {
        // Firing alerts with all severity levels should not panic and should
        // produce active alerts (exercises notification_channels internally).
        let manager = AlertManager::new();
        manager.add_rule(make_rule("info", AlertSeverity::Info));
        manager.add_rule(make_rule("warn", AlertSeverity::Warning));
        manager.add_rule(make_rule("crit", AlertSeverity::Critical));
        manager.add_rule(make_rule("emerg", AlertSeverity::Emergency));

        manager.fire_alert("info", 1.0, "info msg");
        manager.fire_alert("warn", 2.0, "warn msg");
        manager.fire_alert("crit", 3.0, "crit msg");
        manager.fire_alert("emerg", 4.0, "emerg msg");

        let active = manager.get_active_alerts();
        assert_eq!(active.len(), 4);
        let stats = manager.get_stats();
        assert_eq!(stats.info, 1);
        assert_eq!(stats.warning, 1);
        assert_eq!(stats.critical, 1);
        assert_eq!(stats.emergency, 1);
    }
}
