//! 可观测性聚合模块
//!
//! 整合 SLO 管理、日志查询和告警分级，
//! 提供统一的可观测性接口。

pub mod alerting;
pub mod log_query;
pub mod presets;
pub mod slo;

pub use alerting::{AlertEvent, AlertManager, AlertRule, AlertSeverity, AlertState, AlertStats};
pub use log_query::{
    InMemoryLogStore, LogEntry, LogLevel, LogQuery, LogQueryError, LogQueryProvider,
    LogQueryResult, LogStats,
};
pub use slo::{SLODefinition, SLOManager, SLOMeasurement, SLOReport, SLOStatus, SLOType};

use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// 可观测性聚合器
///
/// 统一管理 SLO、日志和告警，提供一站式可观测性接口。
pub struct ObservabilityAggregator {
    pub slo_manager: Arc<SLOManager>,
    pub log_store: Arc<dyn LogQueryProvider>,
    pub alert_manager: Arc<AlertManager>,
}

impl ObservabilityAggregator {
    pub fn new(
        slo_manager: Arc<SLOManager>,
        log_store: Arc<dyn LogQueryProvider>,
        alert_manager: Arc<AlertManager>,
    ) -> Self {
        Self {
            slo_manager,
            log_store,
            alert_manager,
        }
    }

    /// 创建默认实例（开发环境用内存实现）
    pub fn with_defaults() -> Self {
        Self::new(
            Arc::new(SLOManager::new()),
            Arc::new(InMemoryLogStore::new()),
            Arc::new(AlertManager::new()),
        )
    }

    /// 生成可观测性仪表盘数据
    pub async fn generate_dashboard(&self) -> ObservabilityDashboard {
        let slo_report = self.slo_manager.generate_report();
        let alert_stats = self.alert_manager.get_stats();
        let active_alerts = self.alert_manager.get_active_alerts();

        ObservabilityDashboard {
            slo_report,
            alert_stats,
            active_alerts_count: active_alerts.len(),
            critical_alerts: active_alerts
                .iter()
                .filter(|a| {
                    a.severity == AlertSeverity::Critical || a.severity == AlertSeverity::Emergency
                })
                .count(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservabilityDashboard {
    pub slo_report: SLOReport,
    pub alert_stats: AlertStats,
    pub active_alerts_count: usize,
    pub critical_alerts: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_aggregator_with_defaults() {
        let agg = ObservabilityAggregator::with_defaults();

        // 默认空仪表盘
        let dashboard = agg.generate_dashboard().await;
        assert_eq!(dashboard.slo_report.total_slos, 0);
        assert_eq!(dashboard.alert_stats.total, 0);
        assert_eq!(dashboard.active_alerts_count, 0);
        assert_eq!(dashboard.critical_alerts, 0);
    }

    #[tokio::test]
    async fn test_aggregator_dashboard_with_data() {
        let agg = ObservabilityAggregator::with_defaults();

        // 注册一个 SLO
        let now = chrono::Utc::now();
        agg.slo_manager.register(SLODefinition {
            id: "test-slo".to_string(),
            name: "test".to_string(),
            service: "svc".to_string(),
            slo_type: SLOType::Availability,
            target: 99.9,
            window_seconds: 300,
            alert_threshold: 99.5,
            created_at: now,
            updated_at: now,
        });
        agg.slo_manager.record_measurement(SLOMeasurement {
            slo_id: "test-slo".to_string(),
            timestamp: now,
            current_value: 99.95,
            sample_count: 100,
            error_count: 0,
            is_breaching: false,
        });

        // 添加一个告警规则并触发
        agg.alert_manager.add_rule(AlertRule {
            id: "rule-1".to_string(),
            name: "rule-1".to_string(),
            description: String::new(),
            severity: AlertSeverity::Critical,
            expression: "up == 0".to_string(),
            threshold: 1.0,
            for_seconds: 60,
            labels: std::collections::HashMap::new(),
            annotations: std::collections::HashMap::new(),
            enabled: true,
        });
        agg.alert_manager.fire_alert("rule-1", 2.0, "service down");

        let dashboard = agg.generate_dashboard().await;
        assert_eq!(dashboard.slo_report.total_slos, 1);
        assert_eq!(dashboard.slo_report.healthy_count, 1);
        assert_eq!(dashboard.alert_stats.total, 1);
        assert_eq!(dashboard.alert_stats.critical, 1);
        assert_eq!(dashboard.active_alerts_count, 1);
        assert_eq!(dashboard.critical_alerts, 1);
    }
}
