use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Serialize)]
pub struct ServiceHealth {
    pub id: Uuid,
    pub service_name: String,
    pub status: String,
    pub uptime: String,
    pub response_time: f64,
    pub last_check: chrono::DateTime<chrono::Utc>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/api/v1/monitor/health", get(get_service_health))
}

async fn get_service_health(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<ServiceHealth>>> {
    let services = vec![
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-iam".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 5h 30m".to_string(),
            response_time: 12.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-crm".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 12h 15m".to_string(),
            response_time: 25.8,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-hrm".to_string(),
            status: "healthy".to_string(),
            uptime: "3d 8h 45m".to_string(),
            response_time: 18.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-pm".to_string(),
            status: "degraded".to_string(),
            uptime: "5h 30m".to_string(),
            response_time: 150.3,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-erp".to_string(),
            status: "healthy".to_string(),
            uptime: "4d 2h 10m".to_string(),
            response_time: 32.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-wms".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 18h 0m".to_string(),
            response_time: 28.7,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-scm".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 6h 30m".to_string(),
            response_time: 45.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-lims".to_string(),
            status: "healthy".to_string(),
            uptime: "6h 45m".to_string(),
            response_time: 35.8,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-qms".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 10h 0m".to_string(),
            response_time: 22.4,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-ehs".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 4h 20m".to_string(),
            response_time: 38.6,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-pdm".to_string(),
            status: "healthy".to_string(),
            uptime: "3d 15h 0m".to_string(),
            response_time: 42.1,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-rs".to_string(),
            status: "healthy".to_string(),
            uptime: "8h 10m".to_string(),
            response_time: 55.3,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-srm".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 3h 45m".to_string(),
            response_time: 30.9,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-mes".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 16h 30m".to_string(),
            response_time: 48.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-bi".to_string(),
            status: "healthy".to_string(),
            uptime: "5d 2h 0m".to_string(),
            response_time: 65.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-ai".to_string(),
            status: "healthy".to_string(),
            uptime: "4h 50m".to_string(),
            response_time: 120.5,
            last_check: chrono::Utc::now(),
        },
    ];

    Json(ApiResponse::success(services, "获取服务健康状态成功"))
}
