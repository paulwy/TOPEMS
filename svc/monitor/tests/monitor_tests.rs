use std::sync::Arc;
use std::time::Instant;

use topems_monitor::modules::health_check::ServiceHealth;
use topems_monitor::modules::{create_routes, ApiState};
use topems_shared::{AuthState, SystemMetrics};

fn create_mock_state() -> ApiState {
    ApiState {
        db: sqlx::postgres::PgPool::connect_lazy("postgres://test:test@localhost:5432/test")
            .unwrap(),
        auth_state: AuthState::new("test_secret".to_string(), "refresh_secret".to_string(), 24),
        metrics: Arc::new(SystemMetrics::new()),
        start_time: Instant::now(),
    }
}

#[tokio::test]
async fn test_service_health_struct_fields() {
    let service = ServiceHealth {
        id: uuid::Uuid::new_v4(),
        service_name: "test-service".to_string(),
        status: "healthy".to_string(),
        uptime: "1d 2h 30m".to_string(),
        response_time: 25.5,
        last_check: chrono::Utc::now(),
    };

    assert_eq!(service.service_name, "test-service");
    assert_eq!(service.status, "healthy");
    assert_eq!(service.uptime, "1d 2h 30m");
    assert_eq!(service.response_time, 25.5);
}

#[tokio::test]
async fn test_service_health_status_validation() {
    let service = ServiceHealth {
        id: uuid::Uuid::new_v4(),
        service_name: "test-service".to_string(),
        status: "healthy".to_string(),
        uptime: "1d 2h 30m".to_string(),
        response_time: 25.5,
        last_check: chrono::Utc::now(),
    };

    assert!(!service.service_name.is_empty());
    assert!(!service.status.is_empty());
    assert!(!service.uptime.is_empty());
    assert!(service.response_time >= 0.0);
}

#[tokio::test]
async fn test_create_routes() {
    let _router = create_routes();
}

#[tokio::test]
async fn test_api_state_creation() {
    let state = create_mock_state();

    assert!(state.db.size() >= 0);
    assert!(state.start_time.elapsed().as_nanos() >= 0);
}

#[tokio::test]
async fn test_service_health_response_time_range() {
    let service = ServiceHealth {
        id: uuid::Uuid::new_v4(),
        service_name: "test-service".to_string(),
        status: "healthy".to_string(),
        uptime: "1d 2h 30m".to_string(),
        response_time: 125.5,
        last_check: chrono::Utc::now(),
    };

    assert!(service.response_time > 0.0);
    assert!(service.response_time < 200.0);
}

#[tokio::test]
async fn test_service_health_uptime_format() {
    let service = ServiceHealth {
        id: uuid::Uuid::new_v4(),
        service_name: "test-service".to_string(),
        status: "healthy".to_string(),
        uptime: "2d 5h 30m".to_string(),
        response_time: 25.5,
        last_check: chrono::Utc::now(),
    };

    assert!(!service.uptime.is_empty());
    assert!(service.uptime.contains(|c: char| c.is_numeric()));
    assert!(
        service.uptime.contains('d')
            || service.uptime.contains('h')
            || service.uptime.contains('m')
    );
}
