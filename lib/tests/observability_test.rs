//! 可观测性模块集成测试
//!
//! 验证 SLO 管理、统一日志查询和告警分级模块的公开 API。

use topems_shared::observability::presets::{
    standard_slos_for_all_services, standard_slos_for_service,
};
use topems_shared::observability::{
    AlertManager, AlertRule, AlertSeverity, AlertState, InMemoryLogStore, LogLevel, LogQuery,
    LogQueryProvider, ObservabilityAggregator, SLODefinition, SLOMeasurement, SLOStatus, SLOType,
};

fn make_slo_definition(id: &str, target: f64, alert_threshold: f64) -> SLODefinition {
    let now = chrono::Utc::now();
    SLODefinition {
        id: id.to_string(),
        name: format!("test-{}", id),
        service: "test-service".to_string(),
        slo_type: SLOType::Availability,
        target,
        window_seconds: 300,
        alert_threshold,
        created_at: now,
        updated_at: now,
    }
}

fn make_slo_measurement(slo_id: &str, value: f64) -> SLOMeasurement {
    SLOMeasurement {
        slo_id: slo_id.to_string(),
        timestamp: chrono::Utc::now(),
        current_value: value,
        sample_count: 100,
        error_count: 0,
        is_breaching: value < 90.0,
    }
}

#[test]
fn test_slo_lifecycle_via_aggregator() {
    let agg = ObservabilityAggregator::with_defaults();

    let def = make_slo_definition("slo-1", 99.9, 99.5);
    agg.slo_manager.register(def);

    // 初始无数据
    assert_eq!(
        agg.slo_manager.get_status("slo-1"),
        SLOStatus::InsufficientData
    );

    // 健康状态
    agg.slo_manager
        .record_measurement(make_slo_measurement("slo-1", 99.95));
    assert_eq!(agg.slo_manager.get_status("slo-1"), SLOStatus::Healthy);

    // 警告状态
    agg.slo_manager
        .record_measurement(make_slo_measurement("slo-1", 99.6));
    assert_eq!(agg.slo_manager.get_status("slo-1"), SLOStatus::Warning);

    // 违反状态
    agg.slo_manager
        .record_measurement(make_slo_measurement("slo-1", 80.0));
    assert_eq!(agg.slo_manager.get_status("slo-1"), SLOStatus::Breaching);
}

#[test]
fn test_slo_report_via_aggregator() {
    let agg = ObservabilityAggregator::with_defaults();
    agg.slo_manager
        .register(make_slo_definition("a", 99.9, 99.5));
    agg.slo_manager
        .register(make_slo_definition("b", 99.9, 99.5));
    agg.slo_manager
        .register(make_slo_definition("c", 99.9, 99.5));

    agg.slo_manager
        .record_measurement(make_slo_measurement("a", 99.99));
    agg.slo_manager
        .record_measurement(make_slo_measurement("b", 99.7));
    agg.slo_manager
        .record_measurement(make_slo_measurement("c", 50.0));

    let report = agg.slo_manager.generate_report();
    assert_eq!(report.total_slos, 3);
    assert_eq!(report.healthy_count, 1);
    assert_eq!(report.warning_count, 1);
    assert_eq!(report.breaching_count, 1);
    assert_eq!(report.overall_health, SLOStatus::Breaching);
}

fn make_alert_rule(id: &str, severity: AlertSeverity) -> AlertRule {
    AlertRule {
        id: id.to_string(),
        name: format!("rule-{}", id),
        description: "test rule".to_string(),
        severity,
        expression: "up == 0".to_string(),
        threshold: 1.0,
        for_seconds: 60,
        labels: std::collections::HashMap::new(),
        annotations: std::collections::HashMap::new(),
        enabled: true,
    }
}

#[test]
fn test_alert_fire_and_resolve() {
    let manager = AlertManager::new();
    manager.add_rule(make_alert_rule("r1", AlertSeverity::Critical));

    assert_eq!(manager.get_active_alerts().len(), 0);
    manager.fire_alert("r1", 2.5, "service down");

    let active = manager.get_active_alerts();
    assert_eq!(active.len(), 1);
    assert_eq!(active[0].state, AlertState::Firing);
    assert_eq!(active[0].severity, AlertSeverity::Critical);
    assert_eq!(active[0].value, 2.5);

    let alert_id = active[0].id.clone();
    assert!(manager.acknowledge_alert(&alert_id));
    assert!(manager.resolve_alert(&alert_id));
    assert_eq!(manager.get_active_alerts().len(), 0);

    // 历史中应有两条记录（fire + resolve）
    let history = manager.get_history(10);
    assert_eq!(history.len(), 2);
}

#[test]
fn test_alert_severity_ordering() {
    assert!(AlertSeverity::Info < AlertSeverity::Warning);
    assert!(AlertSeverity::Warning < AlertSeverity::Critical);
    assert!(AlertSeverity::Critical < AlertSeverity::Emergency);
}

#[test]
fn test_alert_stats_by_severity() {
    let manager = AlertManager::new();
    manager.add_rule(make_alert_rule("info", AlertSeverity::Info));
    manager.add_rule(make_alert_rule("warn", AlertSeverity::Warning));
    manager.add_rule(make_alert_rule("crit", AlertSeverity::Critical));
    manager.add_rule(make_alert_rule("emerg", AlertSeverity::Emergency));

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

fn make_log_entry(
    id: &str,
    level: LogLevel,
    service: &str,
    message: &str,
    trace_id: Option<&str>,
) -> topems_shared::observability::LogEntry {
    topems_shared::observability::LogEntry {
        id: id.to_string(),
        timestamp: chrono::Utc::now(),
        level,
        service: service.to_string(),
        message: message.to_string(),
        trace_id: trace_id.map(str::to_string),
        span_id: None,
        labels: std::collections::HashMap::new(),
        payload: None,
    }
}

#[tokio::test]
async fn test_in_memory_log_query() {
    let store = InMemoryLogStore::new();
    store.append(make_log_entry("1", LogLevel::Info, "svc-a", "hello", None));
    store.append(make_log_entry("2", LogLevel::Error, "svc-b", "boom", None));
    store.append(make_log_entry(
        "3",
        LogLevel::Warn,
        "svc-a",
        "watch out",
        None,
    ));

    let mut query = LogQuery::default();
    query.service = Some("svc-a".to_string());
    let result = store.query(&query).await.unwrap();
    assert_eq!(result.total, 2);

    let mut query = LogQuery::default();
    query.min_level = Some(LogLevel::Error);
    let result = store.query(&query).await.unwrap();
    assert_eq!(result.total, 1);
    assert_eq!(result.entries[0].id, "2");
}

#[tokio::test]
async fn test_in_memory_trace_logs() {
    let store = InMemoryLogStore::new();
    store.append(make_log_entry(
        "1",
        LogLevel::Info,
        "svc-a",
        "a",
        Some("trace-1"),
    ));
    store.append(make_log_entry(
        "2",
        LogLevel::Info,
        "svc-b",
        "b",
        Some("trace-1"),
    ));
    store.append(make_log_entry(
        "3",
        LogLevel::Info,
        "svc-c",
        "c",
        Some("trace-2"),
    ));

    let logs = store.get_trace_logs("trace-1").await.unwrap();
    assert_eq!(logs.len(), 2);
}

#[tokio::test]
async fn test_aggregator_dashboard() {
    let agg = ObservabilityAggregator::with_defaults();

    // 默认空仪表盘
    let dashboard = agg.generate_dashboard().await;
    assert_eq!(dashboard.slo_report.total_slos, 0);
    assert_eq!(dashboard.alert_stats.total, 0);

    // 添加数据后
    agg.slo_manager
        .register(make_slo_definition("slo-1", 99.9, 99.5));
    agg.slo_manager
        .record_measurement(make_slo_measurement("slo-1", 99.95));

    agg.alert_manager
        .add_rule(make_alert_rule("r1", AlertSeverity::Critical));
    agg.alert_manager.fire_alert("r1", 2.0, "down");

    let dashboard = agg.generate_dashboard().await;
    assert_eq!(dashboard.slo_report.total_slos, 1);
    assert_eq!(dashboard.slo_report.healthy_count, 1);
    assert_eq!(dashboard.alert_stats.total, 1);
    assert_eq!(dashboard.critical_alerts, 1);
}

#[test]
fn test_presets_standard_slos_for_service() {
    let slos = standard_slos_for_service("test-svc");
    assert_eq!(slos.len(), 3);
    assert!(slos.iter().all(|s| s.service == "test-svc"));
}

#[test]
fn test_presets_standard_slos_for_all_services() {
    let slos = standard_slos_for_all_services();
    // 27 个服务，每个 3 个 SLO = 81 个
    assert_eq!(slos.len(), 81);

    let services: std::collections::HashSet<&str> =
        slos.iter().map(|s| s.service.as_str()).collect();
    assert_eq!(services.len(), 27);
}
