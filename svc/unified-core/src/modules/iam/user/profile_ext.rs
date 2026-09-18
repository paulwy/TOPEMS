use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{extract::State, Json};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

use super::models::{is_valid_email, record_audit_log, UserResponse, UserRow};

/// GET /users/me/permissions — 返回当前用户权限（与已有 /permissions/my-permissions 不同路径）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions/my-permissions",
    tag = "IAM-Permissions",
    responses(
        (status = 200, description = "当前用户权限列表"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn get_my_permissions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user get_my_permissions called for user: {}",
        claims.sub
    );

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID format: {}", e);
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM public.core_users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    let u = match user {
        Some(u) => u,
        None => {
            tracing::warn!("User not found: {}", claims.sub);
            return Json(topems_shared_core::response::error_value(404, "用户不存在"));
        }
    };

    let role_names: Vec<String> = if u.is_superuser {
        vec!["admin".to_string(), "user".to_string()]
    } else {
        vec!["user".to_string()]
    };

    let permission_codes: Vec<String> = if u.is_superuser {
        topems_shared_auth::auth::get_permissions()
            .iter()
            .map(|p| p.id.clone())
            .collect()
    } else {
        vec![
            "iam:users_read".to_string(),
            "iam:roles_read".to_string(),
            "iam:permissions_read".to_string(),
            "iam:audit_read".to_string(),
            "iam:system_read".to_string(),
            "iam:dictionaries_read".to_string(),
            "iam:plugins_read".to_string(),
        ]
    };

    let user_response = UserResponse {
        id: u.id.to_string(),
        username: u.username.clone(),
        email: u.email,
        full_name: u.full_name,
        role: if u.is_superuser {
            "admin".to_string()
        } else {
            "user".to_string()
        },
        roles: role_names.clone(),
        permissions: permission_codes.clone(),
        is_active: u.status == "active",
        is_superuser: u.is_superuser,
        created_at: u.created_at.map(|t| t.to_string()),
    };

    let roles: Vec<serde_json::Value> = role_names
        .iter()
        .map(|name| {
            serde_json::json!({
                "id": name,
                "name": name,
                "description": null,
                "created_at": u.created_at.map(|t| t.to_string()),
            })
        })
        .collect();

    let permissions: Vec<serde_json::Value> = permission_codes
        .iter()
        .map(|code| {
            let category = code.split(':').next().unwrap_or("other");
            serde_json::json!({
                "id": code,
                "name": code,
                "code": code,
                "category": category,
                "description": null,
                "resource": category,
                "action": code.split(':').nth(1).unwrap_or(""),
            })
        })
        .collect();

    Json(serde_json::json!({
        "success": true,
        "message": "获取当前用户权限成功",
        "data": {
            "user": user_response,
            "roles": roles,
            "permissions": permissions
        },
        "code": 200
    }))
}

/// POST /users/me/permissions/check — 检查当前用户是否有指定权限
pub async fn check_my_permission(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user check_my_permission called for user: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let permission = match payload.get("permission").and_then(|v| v.as_str()) {
        Some(p) => p.to_string(),
        None => {
            tracing::warn!("check_my_permission failed: permission is required");
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "permission 是必填字段",
                )),
            );
        }
    };

    let allowed = claims.has_permission(&permission);

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": if allowed { "拥有该权限" } else { "无该权限" },
            "data": {
                "allowed": allowed,
                "permission": permission,
                "user_id": claims.sub,
                "username": claims.username
            },
            "code": 200
        })),
    )
}

/// PUT /users/me — 更新当前用户（full_name, email）
pub async fn update_current_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user update_current_user called for user: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    if let Some(email) = payload.get("email").and_then(|v| v.as_str()) {
        if !is_valid_email(email) {
            tracing::warn!("update_current_user failed: invalid email format");
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "邮箱格式不正确",
                )),
            );
        }

        let existing_email_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM public.core_users WHERE email = $1 AND id != $2",
        )
        .bind(email)
        .bind(user_id)
        .fetch_one(&state.pool)
        .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check email: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询邮箱失败: {}", e),
                    )),
                );
            }
        };

        if existing_email_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(topems_shared_core::response::error_value(409, "邮箱已存在")),
            );
        }
    }

    let update_result = sqlx::query(
        r#"
        UPDATE public.core_users
        SET
            email = COALESCE($1, email),
            full_name = COALESCE($2, full_name),
            updated_at = NOW()
        WHERE id = $3
        "#,
    )
    .bind(payload.get("email").and_then(|v| v.as_str()))
    .bind(payload.get("full_name").and_then(|v| v.as_str()))
    .bind(user_id)
    .execute(&state.pool)
    .await;

    match update_result {
        Ok(_) => {
            tracing::info!("Current user updated successfully: {}", claims.sub);

            let user: Option<UserRow> = sqlx::query_as(
                "SELECT id, username, email, full_name, status, is_superuser, created_at FROM public.core_users WHERE id = $1",
            )
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

            let data = match user {
                Some(u) => {
                    let roles = if u.is_superuser {
                        vec!["admin".to_string(), "user".to_string()]
                    } else {
                        vec!["user".to_string()]
                    };
                    let permissions = if u.is_superuser {
                        topems_shared_auth::auth::get_permissions()
                            .iter()
                            .map(|p| p.id.clone())
                            .collect()
                    } else {
                        vec!["iam:users_read".to_string()]
                    };
                    serde_json::json!(UserResponse {
                        id: u.id.to_string(),
                        username: u.username,
                        email: u.email,
                        full_name: u.full_name,
                        role: if u.is_superuser {
                            "admin".to_string()
                        } else {
                            "user".to_string()
                        },
                        roles,
                        permissions,
                        is_active: u.status == "active",
                        is_superuser: u.is_superuser,
                        created_at: u.created_at.map(|t| t.to_string()),
                    })
                }
                None => serde_json::Value::Null,
            };

            let response_body = serde_json::json!({
                "success": true,
                "message": "更新当前用户成功",
                "data": data,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &claims.sub,
                Some(payload),
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to update current user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("更新当前用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &claims.sub,
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

/// POST /users/me/password — 自助改密（需校验 current_password）
pub async fn change_my_password(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user change_my_password called for user: {}",
        claims.sub
    );

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let current_password = payload
        .get("current_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let new_password = payload
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if current_password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "当前密码不能为空",
            )),
        );
    }

    if new_password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "新密码不能为空",
            )),
        );
    }

    if new_password.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "新密码长度不能少于6位",
            )),
        );
    }

    let password_hash: Option<String> =
        sqlx::query_scalar("SELECT password_hash FROM public.core_users WHERE id = $1")
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or_else(|e| {
                tracing::error!("Failed to fetch password hash: {}", e);
                None
            });

    let stored_hash = match password_hash {
        Some(h) => h,
        None => {
            tracing::warn!("User not found: {}", claims.sub);
            return (
                StatusCode::NOT_FOUND,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            );
        }
    };

    let verified = match bcrypt::verify(current_password, &stored_hash) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("Password verification error: {}", e);
            false
        }
    };

    if !verified {
        tracing::warn!("change_my_password failed: current password incorrect");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "当前密码不正确",
            )),
        );
    }

    let hashed_password = match bcrypt::hash(new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Failed to hash password: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "密码加密失败",
                )),
            );
        }
    };

    let result =
        sqlx::query("UPDATE public.core_users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
            .bind(hashed_password)
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("Password changed successfully for user: {}", claims.sub);

            let response_body = serde_json::json!({
                "success": true,
                "message": "修改密码成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "change_password",
                "user",
                &claims.sub,
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to change password: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("修改密码失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "change_password",
                "user",
                &claims.sub,
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

/// POST /users/me/avatar — 更新头像
pub async fn update_my_avatar(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user update_my_avatar called for user: {}", claims.sub);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID",
                )),
            );
        }
    };

    let avatar_url = match payload.get("avatar_url").and_then(|v| v.as_str()) {
        Some(url) => url.to_string(),
        None => {
            tracing::warn!("update_my_avatar failed: avatar_url is required");
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "avatar_url 是必填字段",
                )),
            );
        }
    };

    let result =
        sqlx::query("UPDATE public.core_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2")
            .bind(&avatar_url)
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("Avatar updated successfully for user: {}", claims.sub);

            let user: Option<UserRow> = sqlx::query_as(
                "SELECT id, username, email, full_name, status, is_superuser, created_at FROM public.core_users WHERE id = $1",
            )
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

            let data = match user {
                Some(u) => {
                    let roles = if u.is_superuser {
                        vec!["admin".to_string(), "user".to_string()]
                    } else {
                        vec!["user".to_string()]
                    };
                    let permissions = if u.is_superuser {
                        topems_shared_auth::auth::get_permissions()
                            .iter()
                            .map(|p| p.id.clone())
                            .collect()
                    } else {
                        vec!["iam:users_read".to_string()]
                    };
                    serde_json::json!(UserResponse {
                        id: u.id.to_string(),
                        username: u.username,
                        email: u.email,
                        full_name: u.full_name,
                        role: if u.is_superuser {
                            "admin".to_string()
                        } else {
                            "user".to_string()
                        },
                        roles,
                        permissions,
                        is_active: u.status == "active",
                        is_superuser: u.is_superuser,
                        created_at: u.created_at.map(|t| t.to_string()),
                    })
                }
                None => serde_json::Value::Null,
            };

            let response_body = serde_json::json!({
                "success": true,
                "message": "更新头像成功",
                "data": data,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "update_avatar",
                "user",
                &claims.sub,
                Some(payload),
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to update avatar: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("更新头像失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "update_avatar",
                "user",
                &claims.sub,
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
