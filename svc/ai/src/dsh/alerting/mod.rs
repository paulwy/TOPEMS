//! DSH AI 监控告警模块
//!
//! 提供告警规则配置、告警级别、告警通知和告警历史记录，包括：
//! - 慢查询告警
//! - 高错误率告警
//! - 配额超限告警
//! - 缓存命中率低告警
//! - 告警通知（日志、Webhook）
//! - 告警历史记录和统计

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

// ============================================================================
// 类型定义
// ============================================================================

/// 告警级别
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum AlertLevel {
    /// 信息级别
    Info,
    /// 警告级别
    Warning,
    /// 严重级别
    Critical,
}

impl AlertLevel {
    /// 获取级别名称
    pub fn as_str(&self) -> &'static str {
        match self {
            AlertLevel::Info => "INFO",
            AlertLevel::Warning => "WARNING",
            AlertLevel::Critical => "CRITICAL",
        }
    }
}

impl std::fmt::Display for AlertLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// 告警类型
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AlertType {
    /// 慢查询
    SlowQuery,
    /// 高错误率
    HighErrorRate,
    /// 配额超限
    QuotaExceeded,
    /// 缓存命中率低
    LowCacheHitRate,
    /// 工具调用失败
    ToolCallFailure,
    /// LLM 调用失败
    LlmCallFailure,
    /// 自定义告警
    Custom(String),
}

impl AlertType {
    /// 获取类型名称
    pub fn as_str(&self) -> &str {
        match self {
            AlertType::SlowQuery => "slow_query",
            AlertType::HighErrorRate => "high_error_rate",
            AlertType::QuotaExceeded => "quota_exceeded",
            AlertType::LowCacheHitRate => "low_cache_hit_rate",
            AlertType::ToolCallFailure => "tool_call_failure",
            AlertType::LlmCallFailure => "llm_call_failure",
            AlertType::Custom(name) => name.as_str(),
        }
    }
}

/// 告警规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRule {
    /// 规则名称
    pub name: String,
    /// 告警类型
    pub alert_type: AlertType,
    /// 告警级别
    pub level: AlertLevel,
    /// 是否启用
    pub enabled: bool,
    /// 阈值配置
    pub thresholds: AlertThresholds,
    /// 评估窗口（秒）
    pub evaluation_window_secs: u64,
    /// 冷却时间（秒），避免重复告警
    pub cooldown_secs: u64,
    /// 描述
    pub description: String,
}

/// 告警阈值配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThresholds {
    /// 慢查询阈值（毫秒）
    pub slow_query_ms: Option<u64>,
    /// 高错误率阈值（0-1）
    pub high_error_rate: Option<f64>,
    /// 配额使用阈值（0-1）
    pub quota_usage: Option<f64>,
    /// 缓存命中率阈值（0-1）
    pub cache_hit_rate: Option<f64>,
    /// 工具调用失败次数阈值
    pub tool_call_failures: Option<u64>,
    /// LLM 调用失败次数阈值
    pub llm_call_failures: Option<u64>,
}

impl Default for AlertThresholds {
    fn default() -> Self {
        Self {
            slow_query_ms: Some(5000),
            high_error_rate: Some(0.1),
            quota_usage: Some(0.9),
            cache_hit_rate: Some(0.3),
            tool_call_failures: Some(10),
            llm_call_failures: Some(5),
        }
    }
}

/// 告警事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    /// 告警 ID
    pub id: String,
    /// 告警类型
    pub alert_type: AlertType,
    /// 告警级别
    pub level: AlertLevel,
    /// 告警标题
    pub title: String,
    /// 告警消息
    pub message: String,
    /// 告警时间（ISO 8601）
    pub timestamp: String,
    /// 告警来源
    pub source: String,
    /// 附加数据
    pub metadata: HashMap<String, String>,
    /// 是否已确认
    pub acknowledged: bool,
    /// 是否已解决
    pub resolved: bool,
}

/// 告警统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertStats {
    /// 总告警数
    pub total_alerts: u64,
    /// 信息级别告警数
    pub info_alerts: u64,
    /// 警告级别告警数
    pub warning_alerts: u64,
    /// 严重级别告警数
    pub critical_alerts: u64,
    /// 已确认告警数
    pub acknowledged_alerts: u64,
    /// 已解决告警数
    pub resolved_alerts: u64,
    /// 未解决告警数
    pub unresolved_alerts: u64,
    /// 按类型统计
    pub by_type: HashMap<String, u64>,
}

/// 告警管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertManagerConfig {
    /// 是否启用告警
    pub enabled: bool,
    /// 最大告警历史记录数
    pub max_history_size: usize,
    /// 默认评估窗口（秒）
    pub default_evaluation_window_secs: u64,
    /// 默认冷却时间（秒）
    pub default_cooldown_secs: u64,
    /// 是否启用 Webhook 通知
    pub webhook_enabled: bool,
    /// Webhook URL
    pub webhook_url: Option<String>,
}

impl Default for AlertManagerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_history_size: 10000,
            default_evaluation_window_secs: 300,
            default_cooldown_secs: 300,
            webhook_enabled: false,
            webhook_url: None,
        }
    }
}

// ============================================================================
// 告警管理器
// ============================================================================

/// 告警管理器
#[derive(Clone)]
pub struct AlertManager {
    /// 配置
    config: AlertManagerConfig,
    /// 告警规则
    rules: Arc<Mutex<Vec<AlertRule>>>,
    /// 告警历史
    history: Arc<Mutex<Vec<AlertEvent>>>,
    /// 最后告警时间（用于冷却）
    last_alert_times: Arc<Mutex<HashMap<String, Instant>>>,
    /// 告警统计
    stats: Arc<Mutex<AlertStats>>,
}

impl AlertManager {
    /// 创建新的告警管理器
    pub fn new(config: AlertManagerConfig) -> Self {
        let manager = Self {
            config,
            rules: Arc::new(Mutex::new(Vec::new())),
            history: Arc::new(Mutex::new(Vec::new())),
            last_alert_times: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(AlertStats {
                total_alerts: 0,
                info_alerts: 0,
                warning_alerts: 0,
                critical_alerts: 0,
                acknowledged_alerts: 0,
                resolved_alerts: 0,
                unresolved_alerts: 0,
                by_type: HashMap::new(),
            })),
        };

        // 注册默认告警规则
        manager.register_default_rules();

        manager
    }

    /// 使用默认配置创建
    pub fn with_defaults() -> Self {
        Self::new(AlertManagerConfig::default())
    }

    /// 注册默认告警规则
    fn register_default_rules(&self) {
        let default_rules = vec![
            AlertRule {
                name: "慢查询告警".to_string(),
                alert_type: AlertType::SlowQuery,
                level: AlertLevel::Warning,
                enabled: true,
                thresholds: AlertThresholds {
                    slow_query_ms: Some(5000),
                    ..Default::default()
                },
                evaluation_window_secs: 300,
                cooldown_secs: 300,
                description: "当 Agent 执行时间超过 5 秒时触发告警".to_string(),
            },
            AlertRule {
                name: "高错误率告警".to_string(),
                alert_type: AlertType::HighErrorRate,
                level: AlertLevel::Critical,
                enabled: true,
                thresholds: AlertThresholds {
                    high_error_rate: Some(0.1),
                    ..Default::default()
                },
                evaluation_window_secs: 300,
                cooldown_secs: 600,
                description: "当错误率超过 10% 时触发告警".to_string(),
            },
            AlertRule {
                name: "配额超限告警".to_string(),
                alert_type: AlertType::QuotaExceeded,
                level: AlertLevel::Critical,
                enabled: true,
                thresholds: AlertThresholds {
                    quota_usage: Some(0.9),
                    ..Default::default()
                },
                evaluation_window_secs: 60,
                cooldown_secs: 300,
                description: "当配额使用超过 90% 时触发告警".to_string(),
            },
            AlertRule {
                name: "缓存命中率低告警".to_string(),
                alert_type: AlertType::LowCacheHitRate,
                level: AlertLevel::Info,
                enabled: true,
                thresholds: AlertThresholds {
                    cache_hit_rate: Some(0.3),
                    ..Default::default()
                },
                evaluation_window_secs: 600,
                cooldown_secs: 1800,
                description: "当缓存命中率低于 30% 时触发告警".to_string(),
            },
        ];

        let mut rules = self.rules.lock();
        rules.extend(default_rules);
    }

    /// 注册告警规则
    pub fn register_rule(&self, rule: AlertRule) {
        let rule_name = rule.name.clone();
        let mut rules = self.rules.lock();
        rules.push(rule);
        info!(rule = %rule_name, "Alert rule registered");
    }

    /// 获取所有告警规则
    pub fn get_rules(&self) -> Vec<AlertRule> {
        self.rules.lock().clone()
    }

    /// 获取启用的告警规则
    pub fn get_enabled_rules(&self) -> Vec<AlertRule> {
        self.rules
            .lock()
            .iter()
            .filter(|r| r.enabled)
            .cloned()
            .collect()
    }

    /// 触发告警
    pub fn trigger_alert(
        &self,
        alert_type: AlertType,
        level: AlertLevel,
        title: &str,
        message: &str,
        source: &str,
        metadata: HashMap<String, String>,
    ) -> Option<AlertEvent> {
        if !self.config.enabled {
            return None;
        }

        // 检查冷却时间
        let alert_key = format!("{:?}_{}", alert_type, title);
        let mut last_alert_times = self.last_alert_times.lock();
        if let Some(last_time) = last_alert_times.get(&alert_key) {
            let cooldown = Duration::from_secs(self.config.default_cooldown_secs);
            if last_time.elapsed() < cooldown {
                debug!(alert = %title, "Alert suppressed due to cooldown");
                return None;
            }
        }
        last_alert_times.insert(alert_key, Instant::now());
        drop(last_alert_times);

        // 创建告警事件
        let event = AlertEvent {
            id: uuid::Uuid::new_v4().to_string(),
            alert_type: alert_type.clone(),
            level,
            title: title.to_string(),
            message: message.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            source: source.to_string(),
            metadata,
            acknowledged: false,
            resolved: false,
        };

        // 记录告警
        self.record_alert(event.clone());

        // 发送通知
        self.send_notification(&event);

        Some(event)
    }

    /// 记录告警
    fn record_alert(&self, event: AlertEvent) {
        let mut history = self.history.lock();
        history.push(event.clone());

        // 限制历史记录大小
        if history.len() > self.config.max_history_size {
            let remove_count = history.len() - self.config.max_history_size;
            history.drain(0..remove_count);
        }
        drop(history);

        // 更新统计
        let mut stats = self.stats.lock();
        stats.total_alerts += 1;
        match event.level {
            AlertLevel::Info => stats.info_alerts += 1,
            AlertLevel::Warning => stats.warning_alerts += 1,
            AlertLevel::Critical => stats.critical_alerts += 1,
        }
        stats.unresolved_alerts += 1;

        let type_key = event.alert_type.as_str().to_string();
        *stats.by_type.entry(type_key).or_insert(0) += 1;
        drop(stats);

        // 记录日志
        match event.level {
            AlertLevel::Info => info!(
                alert_id = %event.id,
                alert_type = %event.alert_type.as_str(),
                level = %event.level,
                title = %event.title,
                "Alert triggered"
            ),
            AlertLevel::Warning => warn!(
                alert_id = %event.id,
                alert_type = %event.alert_type.as_str(),
                level = %event.level,
                title = %event.title,
                "Alert triggered"
            ),
            AlertLevel::Critical => error!(
                alert_id = %event.id,
                alert_type = %event.alert_type.as_str(),
                level = %event.level,
                title = %event.title,
                message = %event.message,
                "Alert triggered"
            ),
        }
    }

    /// 发送告警通知
    fn send_notification(&self, event: &AlertEvent) {
        // Webhook 通知
        if self.config.webhook_enabled {
            if let Some(webhook_url) = &self.config.webhook_url {
                // 异步发送 Webhook（这里简化处理，实际应该使用 reqwest）
                info!(
                    webhook_url = %webhook_url,
                    alert_id = %event.id,
                    "Sending webhook notification"
                );
                // 实际实现中应该使用 reqwest::Client::new().post(webhook_url).json(event).send().await
            }
        }
    }

    /// 评估慢查询
    pub fn evaluate_slow_query(&self, duration_ms: u64, session_id: &str, query: &str) {
        let rules = self.get_enabled_rules();
        for rule in rules {
            if rule.alert_type != AlertType::SlowQuery {
                continue;
            }

            if let Some(threshold) = rule.thresholds.slow_query_ms {
                if duration_ms >= threshold {
                    let mut metadata = HashMap::new();
                    metadata.insert("session_id".to_string(), session_id.to_string());
                    metadata.insert("query".to_string(), query.to_string());
                    metadata.insert("duration_ms".to_string(), duration_ms.to_string());
                    metadata.insert("threshold_ms".to_string(), threshold.to_string());

                    self.trigger_alert(
                        AlertType::SlowQuery,
                        rule.level,
                        &format!("慢查询告警：{}ms", duration_ms),
                        &format!("Agent 执行耗时 {}ms，超过阈值 {}ms", duration_ms, threshold),
                        "agent_orchestrator",
                        metadata,
                    );
                }
            }
        }
    }

    /// 评估高错误率
    pub fn evaluate_high_error_rate(&self, error_rate: f64, total_executions: u64) {
        if total_executions < 10 {
            return; // 样本太少，不评估
        }

        let rules = self.get_enabled_rules();
        for rule in rules {
            if rule.alert_type != AlertType::HighErrorRate {
                continue;
            }

            if let Some(threshold) = rule.thresholds.high_error_rate {
                if error_rate >= threshold {
                    let mut metadata = HashMap::new();
                    metadata.insert(
                        "error_rate".to_string(),
                        format!("{:.2}%", error_rate * 100.0),
                    );
                    metadata.insert(
                        "threshold".to_string(),
                        format!("{:.2}%", threshold * 100.0),
                    );
                    metadata.insert("total_executions".to_string(), total_executions.to_string());

                    self.trigger_alert(
                        AlertType::HighErrorRate,
                        rule.level,
                        &format!("高错误率告警：{:.2}%", error_rate * 100.0),
                        &format!(
                            "Agent 错误率 {:.2}%，超过阈值 {:.2}%",
                            error_rate * 100.0,
                            threshold * 100.0
                        ),
                        "performance_monitor",
                        metadata,
                    );
                }
            }
        }
    }

    /// 评估配额使用
    pub fn evaluate_quota_usage(&self, usage_ratio: f64, quota_type: &str, used: u64, limit: u64) {
        let rules = self.get_enabled_rules();
        for rule in rules {
            if rule.alert_type != AlertType::QuotaExceeded {
                continue;
            }

            if let Some(threshold) = rule.thresholds.quota_usage {
                if usage_ratio >= threshold {
                    let mut metadata = HashMap::new();
                    metadata.insert("quota_type".to_string(), quota_type.to_string());
                    metadata.insert(
                        "usage_ratio".to_string(),
                        format!("{:.2}%", usage_ratio * 100.0),
                    );
                    metadata.insert("used".to_string(), used.to_string());
                    metadata.insert("limit".to_string(), limit.to_string());

                    self.trigger_alert(
                        AlertType::QuotaExceeded,
                        rule.level,
                        &format!("配额超限告警：{:.2}%", usage_ratio * 100.0),
                        &format!(
                            "{} 配额使用 {:.2}%（{}/{}），超过阈值 {:.2}%",
                            quota_type,
                            usage_ratio * 100.0,
                            used,
                            limit,
                            threshold * 100.0
                        ),
                        "cost_metering",
                        metadata,
                    );
                }
            }
        }
    }

    /// 评估缓存命中率
    pub fn evaluate_cache_hit_rate(&self, hit_rate: f64, cache_name: &str) {
        let rules = self.get_enabled_rules();
        for rule in rules {
            if rule.alert_type != AlertType::LowCacheHitRate {
                continue;
            }

            if let Some(threshold) = rule.thresholds.cache_hit_rate {
                if hit_rate < threshold {
                    let mut metadata = HashMap::new();
                    metadata.insert("cache_name".to_string(), cache_name.to_string());
                    metadata.insert("hit_rate".to_string(), format!("{:.2}%", hit_rate * 100.0));
                    metadata.insert(
                        "threshold".to_string(),
                        format!("{:.2}%", threshold * 100.0),
                    );

                    self.trigger_alert(
                        AlertType::LowCacheHitRate,
                        rule.level,
                        &format!("缓存命中率低告警：{:.2}%", hit_rate * 100.0),
                        &format!(
                            "{} 缓存命中率 {:.2}%，低于阈值 {:.2}%",
                            cache_name,
                            hit_rate * 100.0,
                            threshold * 100.0
                        ),
                        "cache_manager",
                        metadata,
                    );
                }
            }
        }
    }

    /// 获取告警历史
    pub fn get_history(&self, limit: Option<usize>) -> Vec<AlertEvent> {
        let history = self.history.lock();
        let events: Vec<AlertEvent> = history.iter().rev().cloned().collect();
        match limit {
            Some(n) => events.into_iter().take(n).collect(),
            None => events,
        }
    }

    /// 获取未解决的告警
    pub fn get_unresolved_alerts(&self) -> Vec<AlertEvent> {
        self.history
            .lock()
            .iter()
            .filter(|e| !e.resolved)
            .cloned()
            .collect()
    }

    /// 确认告警
    pub fn acknowledge_alert(&self, alert_id: &str) -> bool {
        let mut history = self.history.lock();
        if let Some(event) = history.iter_mut().find(|e| e.id == alert_id) {
            event.acknowledged = true;
            drop(history);
            self.stats.lock().acknowledged_alerts += 1;
            info!(alert_id = %alert_id, "Alert acknowledged");
            true
        } else {
            false
        }
    }

    /// 解决告警
    pub fn resolve_alert(&self, alert_id: &str) -> bool {
        let mut history = self.history.lock();
        if let Some(event) = history.iter_mut().find(|e| e.id == alert_id) {
            event.resolved = true;
            drop(history);
            let mut stats = self.stats.lock();
            stats.resolved_alerts += 1;
            if stats.unresolved_alerts > 0 {
                stats.unresolved_alerts -= 1;
            }
            drop(stats);
            info!(alert_id = %alert_id, "Alert resolved");
            true
        } else {
            false
        }
    }

    /// 获取告警统计
    pub fn get_stats(&self) -> AlertStats {
        self.stats.lock().clone()
    }

    /// 清空告警历史
    pub fn clear_history(&self) {
        let mut history = self.history.lock();
        let count = history.len();
        history.clear();
        drop(history);
        info!(cleared = count, "Alert history cleared");
    }

    /// 获取配置
    pub fn config(&self) -> &AlertManagerConfig {
        &self.config
    }
}

// ============================================================================
// 测试
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alert_manager_creation() {
        let manager = AlertManager::with_defaults();
        assert!(manager.config().enabled);
        assert_eq!(manager.get_rules().len(), 4); // 4 个默认规则
    }

    #[test]
    fn test_alert_level_ordering() {
        assert!(AlertLevel::Info < AlertLevel::Warning);
        assert!(AlertLevel::Warning < AlertLevel::Critical);
    }

    #[test]
    fn test_alert_level_display() {
        assert_eq!(AlertLevel::Info.as_str(), "INFO");
        assert_eq!(AlertLevel::Warning.as_str(), "WARNING");
        assert_eq!(AlertLevel::Critical.as_str(), "CRITICAL");
    }

    #[test]
    fn test_trigger_alert() {
        let manager = AlertManager::with_defaults();

        let metadata = HashMap::new();
        let event = manager.trigger_alert(
            AlertType::SlowQuery,
            AlertLevel::Warning,
            "Test Alert",
            "This is a test alert",
            "test_source",
            metadata,
        );

        assert!(event.is_some());
        let event = event.unwrap();
        assert_eq!(event.title, "Test Alert");
        assert_eq!(event.level, AlertLevel::Warning);
        assert!(!event.acknowledged);
        assert!(!event.resolved);

        let stats = manager.get_stats();
        assert_eq!(stats.total_alerts, 1);
        assert_eq!(stats.warning_alerts, 1);
        assert_eq!(stats.unresolved_alerts, 1);
    }

    #[test]
    fn test_alert_cooldown() {
        let manager = AlertManager::with_defaults();

        let metadata = HashMap::new();

        // 第一次触发应该成功
        let event1 = manager.trigger_alert(
            AlertType::SlowQuery,
            AlertLevel::Warning,
            "Test Alert",
            "First alert",
            "test",
            metadata.clone(),
        );
        assert!(event1.is_some());

        // 第二次触发相同告警应该被冷却抑制
        let event2 = manager.trigger_alert(
            AlertType::SlowQuery,
            AlertLevel::Warning,
            "Test Alert",
            "Second alert",
            "test",
            metadata,
        );
        assert!(event2.is_none());

        // 统计应该只有 1 个
        assert_eq!(manager.get_stats().total_alerts, 1);
    }

    #[test]
    fn test_acknowledge_alert() {
        let manager = AlertManager::with_defaults();

        let metadata = HashMap::new();
        let event = manager
            .trigger_alert(
                AlertType::SlowQuery,
                AlertLevel::Warning,
                "Test Alert",
                "Test",
                "test",
                metadata,
            )
            .unwrap();

        assert!(manager.acknowledge_alert(&event.id));
        assert_eq!(manager.get_stats().acknowledged_alerts, 1);

        // 确认不存在的告警应该失败
        assert!(!manager.acknowledge_alert("nonexistent-id"));
    }

    #[test]
    fn test_resolve_alert() {
        let manager = AlertManager::with_defaults();

        let metadata = HashMap::new();
        let event = manager
            .trigger_alert(
                AlertType::SlowQuery,
                AlertLevel::Warning,
                "Test Alert",
                "Test",
                "test",
                metadata,
            )
            .unwrap();

        assert_eq!(manager.get_stats().unresolved_alerts, 1);
        assert!(manager.resolve_alert(&event.id));
        assert_eq!(manager.get_stats().resolved_alerts, 1);
        assert_eq!(manager.get_stats().unresolved_alerts, 0);
    }

    #[test]
    fn test_evaluate_slow_query() {
        let manager = AlertManager::with_defaults();

        // 慢查询应该触发告警
        manager.evaluate_slow_query(6000, "session-1", "test query");
        assert_eq!(manager.get_stats().total_alerts, 1);

        // 正常查询不应该触发告警
        manager.evaluate_slow_query(1000, "session-2", "fast query");
        assert_eq!(manager.get_stats().total_alerts, 1); // 仍然是 1
    }

    #[test]
    fn test_evaluate_high_error_rate() {
        let manager = AlertManager::with_defaults();

        // 样本太少，不应该触发
        manager.evaluate_high_error_rate(0.5, 5);
        assert_eq!(manager.get_stats().total_alerts, 0);

        // 高错误率应该触发
        manager.evaluate_high_error_rate(0.15, 20);
        assert_eq!(manager.get_stats().total_alerts, 1);

        // 低错误率不应该触发
        manager.evaluate_high_error_rate(0.05, 20);
        assert_eq!(manager.get_stats().total_alerts, 1);
    }

    #[test]
    fn test_evaluate_quota_usage() {
        let manager = AlertManager::with_defaults();

        // 高配额使用应该触发
        manager.evaluate_quota_usage(0.95, "token", 950, 1000);
        assert_eq!(manager.get_stats().total_alerts, 1);

        // 低配额使用不应该触发
        manager.evaluate_quota_usage(0.5, "token", 500, 1000);
        assert_eq!(manager.get_stats().total_alerts, 1);
    }

    #[test]
    fn test_evaluate_cache_hit_rate() {
        let manager = AlertManager::with_defaults();

        // 低命中率应该触发
        manager.evaluate_cache_hit_rate(0.2, "tool_call");
        assert_eq!(manager.get_stats().total_alerts, 1);

        // 高命中率不应该触发
        manager.evaluate_cache_hit_rate(0.8, "tool_call");
        assert_eq!(manager.get_stats().total_alerts, 1);
    }

    #[test]
    fn test_get_history() {
        let manager = AlertManager::with_defaults();

        for i in 0..5 {
            let metadata = HashMap::new();
            manager.trigger_alert(
                AlertType::SlowQuery,
                AlertLevel::Warning,
                &format!("Alert {}", i),
                "Test",
                "test",
                metadata,
            );
        }

        let history = manager.get_history(None);
        assert_eq!(history.len(), 5);

        let limited = manager.get_history(Some(3));
        assert_eq!(limited.len(), 3);
    }

    #[test]
    fn test_clear_history() {
        let manager = AlertManager::with_defaults();

        let metadata = HashMap::new();
        manager.trigger_alert(
            AlertType::SlowQuery,
            AlertLevel::Warning,
            "Test",
            "Test",
            "test",
            metadata,
        );

        assert_eq!(manager.get_history(None).len(), 1);
        manager.clear_history();
        assert_eq!(manager.get_history(None).len(), 0);
    }

    #[test]
    fn test_register_custom_rule() {
        let manager = AlertManager::with_defaults();
        assert_eq!(manager.get_rules().len(), 4);

        let custom_rule = AlertRule {
            name: "自定义规则".to_string(),
            alert_type: AlertType::Custom("custom".to_string()),
            level: AlertLevel::Info,
            enabled: true,
            thresholds: AlertThresholds::default(),
            evaluation_window_secs: 60,
            cooldown_secs: 60,
            description: "自定义告警规则".to_string(),
        };

        manager.register_rule(custom_rule);
        assert_eq!(manager.get_rules().len(), 5);
    }

    #[test]
    fn test_alert_type_as_str() {
        assert_eq!(AlertType::SlowQuery.as_str(), "slow_query");
        assert_eq!(AlertType::HighErrorRate.as_str(), "high_error_rate");
        assert_eq!(AlertType::QuotaExceeded.as_str(), "quota_exceeded");
        assert_eq!(AlertType::LowCacheHitRate.as_str(), "low_cache_hit_rate");
        assert_eq!(AlertType::Custom("test".to_string()).as_str(), "test");
    }
}
