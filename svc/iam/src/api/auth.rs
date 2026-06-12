#![allow(dead_code)]

use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::models::user::{
    ChangePasswordRequest, RegisterRequest, UpdateAvatarRequest, UpdatePreferencesRequest,
    UpdateUserRequest,
};
use crate::services::auth_service::AuthService;
use crate::services::user_service::UserService;
use crate::AppState;
use topems_shared::{ApiResponse, Claims};

pub async fn get_current_user(
    State(state): State<AppState>,
    claims: Claims,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let user = user_service.get_user_by_id(&user_id).await;
    match user {
        Some(user) => Json(ApiResponse::success(user.into(), "获取当前用户成功")),
        None => Json(ApiResponse::error(404, "用户不存在")),
    }
}

pub async fn update_current_user(
    State(state): State<AppState>,
    claims: Claims,
    Json(update_req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.update_user(&user_id, update_req).await;
    Json(result)
}

pub async fn change_password(
    State(state): State<AppState>,
    claims: Claims,
    Json(change_req): Json<ChangePasswordRequest>,
) -> Json<ApiResponse<()>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.change_password(&user_id, change_req).await;
    Json(result)
}

pub async fn update_avatar(
    State(state): State<AppState>,
    claims: Claims,
    Json(update_req): Json<UpdateAvatarRequest>,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.update_avatar(&user_id, update_req).await;
    Json(result)
}

pub async fn get_preferences(
    State(state): State<AppState>,
    claims: Claims,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.get_preferences(&user_id).await;
    Json(result)
}

pub async fn update_preferences(
    State(state): State<AppState>,
    claims: Claims,
    Json(update_req): Json<UpdatePreferencesRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.update_preferences(&user_id, update_req).await;
    Json(result)
}

pub async fn list_users(
    State(state): State<AppState>,
    claims: Claims,
) -> Json<ApiResponse<crate::models::user::ListUsersResponse>> {
    if !claims.is_superuser && !claims.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error(403, "仅管理员可访问"));
    }

    let user_service = UserService::new(state.db.clone());
    let result = user_service.list_users().await;
    Json(result)
}

pub async fn create_user(
    State(state): State<AppState>,
    claims: Claims,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    if !claims.is_superuser && !claims.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error(403, "仅管理员可创建用户"));
    }

    let auth_service = AuthService::new(state.db.clone());
    let result = auth_service.register(req).await;
    if result.success {
        if let Some(data) = result.data {
            Json(ApiResponse::success(data.user, "创建用户成功"))
        } else {
            Json(ApiResponse::error(500, "创建用户失败"))
        }
    } else {
        Json(ApiResponse::error(result.code, &result.message))
    }
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    claims: Claims,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问该用户"));
    }

    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let user = user_service.get_user_by_id(&user_id).await;
    match user {
        Some(user) => Json(ApiResponse::success(user.into(), "获取用户成功")),
        None => Json(ApiResponse::error(404, "用户不存在")),
    }
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    claims: Claims,
    Json(update_req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    if !claims.is_superuser && !claims.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error(403, "仅管理员可更新其他用户"));
    }

    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.update_user(&user_id, update_req).await;
    Json(result)
}

pub async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    claims: Claims,
) -> Json<ApiResponse<String>> {
    if !claims.is_superuser && !claims.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error(403, "仅管理员可删除用户"));
    }

    if claims.sub == user_id {
        return Json(ApiResponse::error(400, "不能删除自己"));
    }

    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let result = user_service.delete_user(&user_id).await;
    Json(result)
}
