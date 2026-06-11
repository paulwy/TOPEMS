use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::models::{Permission, Role};
use crate::AppState;
use topems_shared::ApiResponse;

// ============ 请求/响应模型 ============

#[derive(Debug, Serialize, Clone)]
pub struct PermissionInfo {
    pub id: String,
    pub name: String,
    pub code: String,
    pub category: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RoleInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct UserDirectPermissionsResponse {
    pub user_id: String,
    pub permissions: Vec<PermissionInfo>,
    pub total: u64,
}

#[derive(Debug, Deserialize)]
pub struct AssignDirectPermissionsRequest {
    pub permission_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct UserRolesResponse {
    pub user_id: String,
    pub roles: Vec<RoleInfo>,
    pub total: u64,
}

#[derive(Debug, Deserialize)]
pub struct AssignRolesRequest {
    pub role_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct EffectivePermissionsResponse {
    pub user_id: String,
    pub direct_permissions: Vec<PermissionInfo>,
    pub role_permissions: Vec<PermissionInfo>,
    pub all_permissions: Vec<PermissionInfo>,
    pub total: u64,
}

// ============ Handler 实现 ============

// 获取用户的直接权限
pub async fn get_user_direct_permissions(
    State(state): State<crate::AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<UserDirectPermissionsResponse>>, impl IntoResponse> {
    // 检查用户是否存在
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !user_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "用户不存在")),
        ));
    }

    // 查询用户的直接权限
    let result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT p.id, p.name, p.code, p.category, p.description
        FROM iam.permissions p
        INNER JOIN iam.user_direct_permissions udp ON p.id = udp.permission_id
        WHERE udp.user_id = $1
        ORDER BY p.category, p.code
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(permissions) => {
            let total = permissions.len() as u64;
            let perm_infos: Vec<PermissionInfo> = permissions
                .into_iter()
                .map(|p| PermissionInfo {
                    id: p.id.to_string(),
                    name: p.name,
                    code: p.code,
                    category: p.category,
                    description: p.description,
                })
                .collect();

            Ok(Json(ApiResponse::success(
                UserDirectPermissionsResponse {
                    user_id,
                    permissions: perm_infos,
                    total,
                },
                "获取用户直接权限成功",
            )))
        }
        Err(e) => {
            tracing::error!("查询用户直接权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

// 分配直接权限给用户
pub async fn assign_direct_permissions(
    State(state): State<crate::AppState>,
    Path(user_id): Path<String>,
    Json(req): Json<AssignDirectPermissionsRequest>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    // 检查用户是否存在
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !user_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "用户不存在")),
        ));
    }

    // 分配直接权限
    for permission_id in &req.permission_ids {
        let result = sqlx::query(
            r#"
            INSERT INTO iam.user_direct_permissions (user_id, permission_id, created_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, permission_id) DO NOTHING
            "#
        )
        .bind(&user_id)
        .bind(permission_id)
        .bind(chrono::Utc::now())
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::error!("分配直接权限失败: permission_id={}, error={}", permission_id, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "分配权限失败")),
            ));
        }
    }

    tracing::info!("为用户 {} 分配了 {} 个直接权限", user_id, req.permission_ids.len());
    Ok(Json(ApiResponse::success(String::new(), "分配直接权限成功")))
}

// 移除用户的直接权限
pub async fn remove_direct_permission(
    State(state): State<crate::AppState>,
    Path((user_id, permission_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    let result = sqlx::query(
        "DELETE FROM iam.user_direct_permissions WHERE user_id = $1 AND permission_id = $2"
    )
    .bind(&user_id)
    .bind(&permission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("从用户 {} 移除直接权限 {}", user_id, permission_id);
                Ok(Json(ApiResponse::success(String::new(), "移除直接权限成功")))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::<()>::error(404, "用户直接权限关联不存在")),
                ))
            }
        }
        Err(e) => {
            tracing::error!("移除直接权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

// 获取用户的角色
pub async fn get_user_roles(
    State(state): State<crate::AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<UserRolesResponse>>, impl IntoResponse> {
    // 检查用户是否存在
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !user_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "用户不存在")),
        ));
    }

    let result = sqlx::query_as::<_, Role>(
        r#"
        SELECT r.id, r.name, r.description, r.created_at
        FROM iam.roles r
        INNER JOIN iam.user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY r.created_at
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(roles) => {
            let total = roles.len() as u64;
            let role_infos: Vec<RoleInfo> = roles
                .into_iter()
                .map(|r| RoleInfo {
                    id: r.id.to_string(),
                    name: r.name,
                    description: r.description,
                    created_at: r.created_at.to_rfc3339(),
                })
                .collect();

            Ok(Json(ApiResponse::success(
                UserRolesResponse {
                    user_id,
                    roles: role_infos,
                    total,
                },
                "获取用户角色成功",
            )))
        }
        Err(e) => {
            tracing::error!("查询用户角色失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

// 分配角色给用户
pub async fn assign_roles_to_user(
    State(state): State<crate::AppState>,
    Path(user_id): Path<String>,
    Json(req): Json<AssignRolesRequest>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    // 检查用户是否存在
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !user_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "用户不存在")),
        ));
    }

    // 分配角色
    for role_id in &req.role_ids {
        let result = sqlx::query(
            r#"
            INSERT INTO iam.user_roles (user_id, role_id, created_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, role_id) DO NOTHING
            "#
        )
        .bind(&user_id)
        .bind(role_id)
        .bind(chrono::Utc::now())
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::error!("分配角色失败: role_id={}, error={}", role_id, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "分配角色失败")),
            ));
        }
    }

    tracing::info!("为用户 {} 分配了 {} 个角色", user_id, req.role_ids.len());
    Ok(Json(ApiResponse::success(String::new(), "分配角色成功")))
}

// 移除用户的角色
pub async fn remove_user_role(
    State(state): State<crate::AppState>,
    Path((user_id, role_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    let result = sqlx::query(
        "DELETE FROM iam.user_roles WHERE user_id = $1 AND role_id = $2"
    )
    .bind(&user_id)
    .bind(&role_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("从用户 {} 移除角色 {}", user_id, role_id);
                Ok(Json(ApiResponse::success(String::new(), "移除角色成功")))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::<()>::error(404, "用户角色关联不存在")),
                ))
            }
        }
        Err(e) => {
            tracing::error!("移除角色失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

// 获取用户的有效权限（角色权限 + 直接权限）
pub async fn get_effective_permissions(
    State(state): State<crate::AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<EffectivePermissionsResponse>>, impl IntoResponse> {
    // 检查用户是否存在
    let user_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.users WHERE id = $1)"
    )
    .bind(&user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !user_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "用户不存在")),
        ));
    }

    // 获取用户的直接权限
    let direct_permissions_result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT p.id, p.name, p.code, p.category, p.description
        FROM iam.permissions p
        INNER JOIN iam.user_direct_permissions udp ON p.id = udp.permission_id
        WHERE udp.user_id = $1
        ORDER BY p.category, p.code
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    let direct_permissions = match direct_permissions_result {
        Ok(perms) => perms
            .into_iter()
            .map(|p| PermissionInfo {
                id: p.id.to_string(),
                name: p.name,
                code: p.code,
                category: p.category,
                description: p.description,
            })
            .collect::<Vec<_>>(),
        Err(e) => {
            tracing::error!("查询用户直接权限失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    // 获取用户的角色权限
    let role_permissions_result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT DISTINCT p.id, p.name, p.code, p.category, p.description
        FROM iam.permissions p
        INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
        INNER JOIN iam.user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY p.category, p.code
        "#
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    let role_permissions = match role_permissions_result {
        Ok(perms) => perms
            .into_iter()
            .map(|p| PermissionInfo {
                id: p.id.to_string(),
                name: p.name,
                code: p.code,
                category: p.category,
                description: p.description,
            })
            .collect::<Vec<_>>(),
        Err(e) => {
            tracing::error!("查询用户角色权限失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    // 合并所有权限（去重）
    let mut all_permissions: Vec<PermissionInfo> = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    for perm in direct_permissions.iter().chain(role_permissions.iter()) {
        if seen_ids.insert(perm.id.clone()) {
            all_permissions.push(perm.clone());
        }
    }

    let total = all_permissions.len() as u64;

    Ok(Json(ApiResponse::success(
        EffectivePermissionsResponse {
            user_id,
            direct_permissions,
            role_permissions,
            all_permissions,
            total,
        },
        "获取用户有效权限成功",
    )))
}

pub fn create_user_permission_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/v1/users/{user_id}/permissions", get(get_user_direct_permissions))
        .route("/api/v1/users/{user_id}/permissions", post(assign_direct_permissions))
        .route("/api/v1/users/{user_id}/permissions/{permission_id}", delete(remove_direct_permission))
        .route("/api/v1/users/{user_id}/roles", get(get_user_roles))
        .route("/api/v1/users/{user_id}/roles", post(assign_roles_to_user))
        .route("/api/v1/users/{user_id}/roles/{role_id}", delete(remove_user_role))
        .route("/api/v1/users/{user_id}/effective-permissions", get(get_effective_permissions))
        .with_state(state)
}