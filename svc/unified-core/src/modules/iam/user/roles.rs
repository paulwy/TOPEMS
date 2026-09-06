use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use topems_shared_auth::auth::Claims;
use utoipa::ToSchema;
use uuid::Uuid;

use super::models::{record_audit_log, UserResponse, UserRow};

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
#[schema(as = UserRoleRow)]
struct UserRoleRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
#[schema(as = UserPermissionRow)]
struct UserPermissionRow {
    permission_id: Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
}

/// GET /users/{userId}/permissions — 返回指定用户权限（与已有 /user-permissions/{user_id} 不同路径）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:user:read"])),
    path = "/iam/users/{user_id}/permissions",
    tag = "IAM-Permissions",
    params(("user_id" = String, Path, description = "用户 ID")),
    responses(
        (status = 200, description = "指定用户权限列表"),
        (status = 400, description = "无效的用户ID格式"),
        (status = 404, description = "用户不存在"),
    )
)]
pub async fn get_user_permissions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user get_user_permissions called with user_id: {}",
        user_id
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users WHERE id = $1",
    )
    .bind(user_uuid)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    let u = match user {
        Some(u) => u,
        None => {
            tracing::warn!("User not found: {}", user_id);
            return (
                StatusCode::NOT_FOUND,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            );
        }
    };

    let roles: Vec<UserRoleRow> = if u.is_superuser {
        sqlx::query_as::<_, UserRoleRow>(
            "SELECT id, name, description, created_at FROM core_roles ORDER BY name",
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, UserRoleRow>(
            r#"
            SELECT r.id, r.name, r.description, r.created_at
            FROM core_roles r
            INNER JOIN core_user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY r.name
            "#,
        )
        .bind(user_uuid)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    };

    let permissions: Vec<UserPermissionRow> = if u.is_superuser {
        sqlx::query_as::<_, UserPermissionRow>(
            "SELECT id as permission_id, code, name, description, resource, action FROM core_permissions ORDER BY code",
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, UserPermissionRow>(
            r#"
            SELECT DISTINCT p.id as permission_id, p.code, p.name, p.description, p.resource, p.action
            FROM core_permissions p
            INNER JOIN core_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN core_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY p.code
            "#,
        )
        .bind(user_uuid)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    };

    let role_names: Vec<String> = roles.iter().map(|r| r.name.clone()).collect();
    let permission_codes: Vec<String> = permissions.iter().map(|p| p.code.clone()).collect();

    let user_response = UserResponse {
        id: u.id.to_string(),
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        role: if u.is_superuser {
            "admin".to_string()
        } else {
            "user".to_string()
        },
        roles: role_names,
        permissions: permission_codes,
        is_active: u.status == "active",
        is_superuser: u.is_superuser,
        created_at: u.created_at.map(|t| t.to_string()),
    };

    let roles_json: Vec<serde_json::Value> = roles
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id.to_string(),
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at.map(|t| t.to_string()),
            })
        })
        .collect();

    let permissions_json: Vec<serde_json::Value> = permissions
        .iter()
        .map(|p| {
            let category = p.code.split(':').next().unwrap_or("other");
            serde_json::json!({
                "id": p.permission_id.to_string(),
                "name": p.name,
                "code": p.code,
                "category": category,
                "description": p.description,
                "resource": p.resource,
                "action": p.action,
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户权限成功",
            "data": {
                "user": user_response,
                "roles": roles_json,
                "permissions": permissions_json
            },
            "code": 200
        })),
    )
}

/// GET /users/{userId}/roles — 返回指定用户角色列表
pub async fn get_user_roles(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user get_user_roles called with user_id: {}", user_id);

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1")
            .bind(user_uuid)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询用户失败: {}", e),
                    )),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(topems_shared_core::response::error_value(404, "用户不存在")),
        );
    }

    let roles: Vec<UserRoleRow> = sqlx::query_as::<_, UserRoleRow>(
        r#"
        SELECT r.id, r.name, r.description, r.created_at
        FROM core_roles r
        INNER JOIN core_user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY r.name
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Failed to fetch user roles: {}", e);
        vec![]
    });

    let roles_json: Vec<serde_json::Value> = roles
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id.to_string(),
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at.map(|t| t.to_string()),
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户角色列表成功",
            "data": roles_json,
            "code": 200
        })),
    )
}

/// POST /users/{userId}/roles/{roleId} — 为用户分配角色
pub async fn assign_user_role(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((user_id, role_id)): Path<(String, String)>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user assign_user_role called with user_id: {}, role_id: {}",
        user_id,
        role_id
    );

    let operator_id = &claims.sub;

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid role ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的角色ID格式",
                )),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1")
            .bind(user_uuid)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询用户失败: {}", e),
                    )),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(topems_shared_core::response::error_value(404, "用户不存在")),
        );
    }

    let existing_role_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_roles WHERE id = $1")
            .bind(role_uuid)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询角色失败: {}", e),
                    )),
                );
            }
        };

    if existing_role_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(topems_shared_core::response::error_value(404, "角色不存在")),
        );
    }

    let result = sqlx::query(
        "INSERT INTO core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    )
    .bind(user_uuid)
    .bind(role_uuid)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Role {} assigned to user {} successfully", role_id, user_id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "分配角色成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "assign_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to assign role: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("分配角色失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "assign_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

/// DELETE /users/{userId}/roles/{roleId} — 移除用户角色
pub async fn remove_user_role(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((user_id, role_id)): Path<(String, String)>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user remove_user_role called with user_id: {}, role_id: {}",
        user_id,
        role_id
    );

    let operator_id = &claims.sub;

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid role ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的角色ID格式",
                )),
            );
        }
    };

    let result = sqlx::query("DELETE FROM core_user_roles WHERE user_id = $1 AND role_id = $2")
        .bind(user_uuid)
        .bind(role_uuid)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) => {
            if r.rows_affected() == 0 {
                tracing::warn!("User role not found: {}/{}", user_id, role_id);
                return (
                    StatusCode::NOT_FOUND,
                    Json(topems_shared_core::response::error_value(
                        404,
                        "用户角色关联不存在",
                    )),
                );
            }

            tracing::info!(
                "Role {} removed from user {} successfully",
                role_id,
                user_id
            );

            let response_body = serde_json::json!({
                "success": true,
                "message": "移除角色成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "remove_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to remove role: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("移除角色失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "remove_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
