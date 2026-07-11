use axum::{extract::Path, Json};
use topems_shared::ApiResponse;

use crate::services::navigation::NavigationService;

pub async fn get_navigation_menu() -> Json<ApiResponse<Vec<crate::models::NavigationMenu>>> {
    let service = NavigationService::new();
    let menu = service.get_navigation_menu();
    Json(ApiResponse::success(menu, "导航菜单获取成功"))
}

pub async fn get_pinned_apps() -> Json<ApiResponse<Vec<crate::models::PinnedApp>>> {
    let service = NavigationService::new();
    let apps = service.get_pinned_apps();
    Json(ApiResponse::success(apps, "固定应用列表获取成功"))
}

pub async fn add_pinned_app(
    Json(app): Json<crate::models::PinnedApp>,
) -> Json<ApiResponse<crate::models::PinnedApp>> {
    let service = NavigationService::new();
    let result = service.add_pinned_app(app);
    Json(ApiResponse::success(result, "应用已固定"))
}

pub async fn remove_pinned_app(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    let service = NavigationService::new();
    let result = service.remove_pinned_app(id);
    Json(ApiResponse::success(result, "应用已取消固定"))
}

pub async fn reorder_pinned_apps(
    Json(apps): Json<Vec<crate::models::PinnedApp>>,
) -> Json<ApiResponse<Vec<crate::models::PinnedApp>>> {
    let service = NavigationService::new();
    let result = service.reorder_pinned_apps(apps);
    Json(ApiResponse::success(result, "固定应用顺序已更新"))
}
