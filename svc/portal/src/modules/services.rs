use axum::{extract::State, Json};
use topems_shared_core::response::ApiResponse;

use crate::{
    models::ServiceDto, services::service_registry::ServiceRegistryService, shared::AppState,
};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["portal:service:read"])),
    path = "/services",
    tag = "Portal",
    responses(
        (status = 200, description = "List of registered services", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_services(State(state): State<AppState>) -> Json<ApiResponse<Vec<ServiceDto>>> {
    let service = ServiceRegistryService::new(state.service_aggregator.clone());
    let services = service.list_all().await;
    Json(ApiResponse::success(services, "服务列表获取成功"))
}
