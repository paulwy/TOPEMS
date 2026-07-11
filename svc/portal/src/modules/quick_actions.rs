use axum::{extract::Path, Json};
use topems_shared::ApiResponse;

use crate::{models::QuickAction, services::quick_action::QuickActionService};

pub async fn get_quick_actions() -> Json<ApiResponse<Vec<QuickAction>>> {
    let service = QuickActionService::new();
    let actions = service.get_quick_actions();
    Json(ApiResponse::success(actions, "快捷操作列表获取成功"))
}

pub async fn get_favorite_actions() -> Json<ApiResponse<Vec<QuickAction>>> {
    let service = QuickActionService::new();
    let actions = service.get_favorite_actions();
    Json(ApiResponse::success(actions, "收藏的快捷操作获取成功"))
}

pub async fn toggle_favorite_action(Path(id): Path<String>) -> Json<ApiResponse<QuickAction>> {
    let service = QuickActionService::new();
    let action = service.toggle_favorite(id);
    Json(ApiResponse::success(action, "快捷操作收藏状态已更新"))
}

pub async fn execute_quick_action(Path(id): Path<String>) -> Json<ApiResponse<serde_json::Value>> {
    let service = QuickActionService::new();
    let result = service.execute_action(id);
    Json(ApiResponse::success(result, "快捷操作执行成功"))
}
