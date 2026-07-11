use axum::{extract::State, Json};
use topems_shared::ApiResponse;

use crate::{
    models::ServiceDto, services::service_registry::ServiceRegistryService, shared::AppState,
};

pub async fn list_services(State(state): State<AppState>) -> Json<ApiResponse<Vec<ServiceDto>>> {
    let service = ServiceRegistryService::new(state.service_aggregator.clone());
    let services = service.list_all().await;
    Json(ApiResponse::success(services, "服务列表获取成功"))
}
