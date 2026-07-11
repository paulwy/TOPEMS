use axum::Json;
use topems_shared::ApiResponse;

use crate::services::dashboard::DashboardService;

pub async fn get_dashboard_stats() -> Json<ApiResponse<crate::models::DashboardStats>> {
    let service = DashboardService::new();
    let stats = service.get_stats();
    Json(ApiResponse::success(stats, "仪表盘统计获取成功"))
}

pub async fn get_quick_access() -> Json<ApiResponse<Vec<crate::models::QuickAccess>>> {
    let service = DashboardService::new();
    let access_list = service.get_quick_access();
    Json(ApiResponse::success(access_list, "快捷访问列表获取成功"))
}

pub async fn add_quick_access(
    Json(access): Json<crate::models::QuickAccess>,
) -> Json<ApiResponse<crate::models::QuickAccess>> {
    let service = DashboardService::new();
    let result = service.add_quick_access(access);
    Json(ApiResponse::success(result, "快捷访问添加成功"))
}

pub async fn remove_quick_access(
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = DashboardService::new();
    let result = service.remove_quick_access(id);
    Json(ApiResponse::success(result, "快捷访问移除成功"))
}
