use topems_shared::health::{
    build_health_response, DependencyHealth, HealthCheckResponse, HealthStatus, ServiceHealth,
    ServiceMonitor, SystemMetrics,
};

#[test]
fn test_health_status_serialization_healthy() {
    let status = HealthStatus::Healthy;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"healthy\"");

    let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, HealthStatus::Healthy);
}

#[test]
fn test_health_status_serialization_degraded() {
    let status = HealthStatus::Degraded;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"degraded\"");

    let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, HealthStatus::Degraded);
}

#[test]
fn test_health_status_serialization_unhealthy() {
    let status = HealthStatus::Unhealthy;
    let json = serde_json::to_string(&status).unwrap();
    assert_eq!(json, "\"unhealthy\"");

    let deserialized: HealthStatus = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, HealthStatus::Unhealthy);
}

#[test]
fn test_service_health_healthy() {
    let health = ServiceHealth::healthy("test-service");

    assert_eq!(health.service_name, "test-service");
    assert_eq!(health.status, HealthStatus::Healthy);
    assert_eq!(health.message, "Service is running normally");
    assert!(!health.timestamp.is_empty());
    assert!(health.uptime.is_none());
    assert!(health.dependencies.is_none());
}

#[test]
fn test_service_health_healthy_with_message() {
    let health = ServiceHealth::healthy_with_message("test-service", "All good");

    assert_eq!(health.service_name, "test-service");
    assert_eq!(health.status, HealthStatus::Healthy);
    assert_eq!(health.message, "All good");
}

#[test]
fn test_service_health_degraded() {
    let health = ServiceHealth::degraded("test-service", "High latency");

    assert_eq!(health.service_name, "test-service");
    assert_eq!(health.status, HealthStatus::Degraded);
    assert_eq!(health.message, "High latency");
}

#[test]
fn test_service_health_unhealthy() {
    let health = ServiceHealth::unhealthy("test-service", "Connection failed");

    assert_eq!(health.service_name, "test-service");
    assert_eq!(health.status, HealthStatus::Unhealthy);
    assert_eq!(health.message, "Connection failed");
}

#[test]
fn test_service_health_with_uptime() {
    let health = ServiceHealth::healthy("test-service").with_uptime("1h 30m");

    assert_eq!(health.uptime, Some("1h 30m".to_string()));
}

#[test]
fn test_service_health_with_dependencies() {
    let deps = vec![DependencyHealth {
        name: "database".to_string(),
        status: HealthStatus::Healthy,
        message: "OK".to_string(),
    }];

    let health = ServiceHealth::healthy("test-service").with_dependencies(deps);

    assert!(health.dependencies.is_some());
    let deps = health.dependencies.unwrap();
    assert_eq!(deps.len(), 1);
    assert_eq!(deps[0].name, "database");
    assert_eq!(deps[0].status, HealthStatus::Healthy);
}

#[test]
fn test_service_health_with_response_time() {
    let health = ServiceHealth::healthy("test-service").with_response_time(50);

    assert_eq!(health.response_time_ms, Some(50));
}

#[test]
fn test_service_health_serialization() {
    let health = ServiceHealth::healthy("test-service")
        .with_uptime("10m")
        .with_response_time(25);

    let json = serde_json::to_string(&health).unwrap();
    let deserialized: ServiceHealth = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.service_name, "test-service");
    assert_eq!(deserialized.status, HealthStatus::Healthy);
    assert_eq!(deserialized.uptime, Some("10m".to_string()));
    assert_eq!(deserialized.response_time_ms, Some(25));
}

#[test]
fn test_dependency_health_serialization() {
    let dep = DependencyHealth {
        name: "redis".to_string(),
        status: HealthStatus::Degraded,
        message: "Slow response".to_string(),
    };

    let json = serde_json::to_string(&dep).unwrap();
    let deserialized: DependencyHealth = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.name, "redis");
    assert_eq!(deserialized.status, HealthStatus::Degraded);
    assert_eq!(deserialized.message, "Slow response");
}

#[test]
fn test_health_check_response_all_healthy() {
    let services = vec![
        ServiceHealth::healthy("service-a"),
        ServiceHealth::healthy("service-b"),
    ];

    let response = HealthCheckResponse::new(services);

    assert_eq!(response.overall_status, HealthStatus::Healthy);
    assert_eq!(response.total_services, 2);
    assert_eq!(response.healthy_count, 2);
    assert_eq!(response.degraded_count, 0);
    assert_eq!(response.unhealthy_count, 0);
}

#[test]
fn test_health_check_response_with_degraded() {
    let services = vec![
        ServiceHealth::healthy("service-a"),
        ServiceHealth::degraded("service-b", "slow"),
    ];

    let response = HealthCheckResponse::new(services);

    assert_eq!(response.overall_status, HealthStatus::Degraded);
    assert_eq!(response.healthy_count, 1);
    assert_eq!(response.degraded_count, 1);
    assert_eq!(response.unhealthy_count, 0);
}

#[test]
fn test_health_check_response_with_unhealthy() {
    let services = vec![
        ServiceHealth::healthy("service-a"),
        ServiceHealth::unhealthy("service-b", "down"),
        ServiceHealth::degraded("service-c", "slow"),
    ];

    let response = HealthCheckResponse::new(services);

    assert_eq!(response.overall_status, HealthStatus::Unhealthy);
    assert_eq!(response.healthy_count, 1);
    assert_eq!(response.degraded_count, 1);
    assert_eq!(response.unhealthy_count, 1);
}

#[test]
fn test_health_check_response_empty() {
    let response = HealthCheckResponse::new(vec![]);

    assert_eq!(response.overall_status, HealthStatus::Healthy);
    assert_eq!(response.total_services, 0);
    assert_eq!(response.healthy_count, 0);
}

#[test]
fn test_health_check_response_with_response_times() {
    let services = vec![
        ServiceHealth::healthy("service-a").with_response_time(10),
        ServiceHealth::healthy("service-b").with_response_time(30),
    ];

    let response = HealthCheckResponse::new(services);

    assert_eq!(response.avg_response_time_ms, Some(20));
}

#[test]
fn test_health_check_response_serialization() {
    let services = vec![
        ServiceHealth::healthy("service-a"),
        ServiceHealth::degraded("service-b", "slow"),
    ];

    let response = HealthCheckResponse::new(services);
    let json = serde_json::to_string(&response).unwrap();
    let deserialized: HealthCheckResponse = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.overall_status, HealthStatus::Degraded);
    assert_eq!(deserialized.total_services, 2);
    assert_eq!(deserialized.healthy_count, 1);
    assert_eq!(deserialized.degraded_count, 1);
}

#[test]
fn test_service_monitor_new() {
    let monitor = ServiceMonitor::new("test-service", "http://localhost:8080/health");

    assert_eq!(monitor.get_uptime().contains("s"), true);
    let metrics = monitor.get_metrics();
    assert_eq!(metrics.service_name, "test-service");
    assert_eq!(metrics.request_count, 0);
    assert_eq!(metrics.error_count, 0);
    assert_eq!(metrics.avg_response_time_ms, 0.0);
}

#[test]
fn test_system_metrics_new() {
    let metrics = SystemMetrics::new();

    assert_eq!(metrics.get_request_count(), 0);
    assert_eq!(metrics.get_error_count(), 0);
    assert_eq!(metrics.get_active_connections(), 0);
}

#[test]
fn test_system_metrics_record_request() {
    let metrics = SystemMetrics::new();

    metrics.record_request();
    metrics.record_request();

    assert_eq!(metrics.get_request_count(), 2);
    assert_eq!(metrics.get_error_count(), 0);
}

#[test]
fn test_system_metrics_record_error() {
    let metrics = SystemMetrics::new();

    metrics.record_error();

    assert_eq!(metrics.get_error_count(), 1);
}

#[test]
fn test_system_metrics_connections() {
    let metrics = SystemMetrics::new();

    metrics.increment_connections();
    metrics.increment_connections();
    metrics.decrement_connections();

    assert_eq!(metrics.get_active_connections(), 1);
}

#[test]
fn test_system_metrics_uptime() {
    let metrics = SystemMetrics::new();

    let uptime = metrics.get_uptime();
    assert!(!uptime.is_empty());
    assert!(uptime.contains("seconds"));

    let uptime_secs = metrics.get_uptime_seconds();
    assert!(uptime_secs >= 0);
}

#[test]
fn test_build_health_response_healthy() {
    let response = build_health_response("test-service", true);

    assert_eq!(response.service_name, "test-service");
    assert_eq!(response.status, HealthStatus::Healthy);
    assert_eq!(response.message, "test-service is running");
}

#[test]
fn test_build_health_response_unhealthy() {
    let response = build_health_response("test-service", false);

    assert_eq!(response.service_name, "test-service");
    assert_eq!(response.status, HealthStatus::Unhealthy);
    assert_eq!(response.message, "test-service is unhealthy");
}

#[test]
fn test_build_health_response_has_timestamp() {
    let response = build_health_response("test", true);
    assert!(!response.timestamp.is_empty());
    assert!(response.last_check.is_some());
}
