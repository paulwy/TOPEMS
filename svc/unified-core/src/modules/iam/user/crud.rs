use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared_auth::auth::Claims;
use utoipa::ToSchema;
use uuid::Uuid;

use super::models::{is_valid_email, record_audit_log, ListUsersParams, UserResponse, UserRow};

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified_core:read"])),
    path = "/users",
    tag = "IAM",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20"),
    ),
    responses(
        (status = 200, description = "查询成功"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<ListUsersParams>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user list_users called");

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let total_result =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL")
            .fetch_one(&state.pool)
            .await;

    let total = match total_result {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to count users: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("获取用户总数失败: {}", e),
            ));
        }
    };

    let result = sqlx::query_as::<_, UserRow>(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(users) => {
            let user_responses: Vec<UserResponse> = users
                .into_iter()
                .map(|u| {
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

                    UserResponse {
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
                    }
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取用户列表成功",
                "data": {
                    "users": user_responses,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) / page_size
                },
                "code": 200
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch users: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取用户列表失败: {}", e),
            ))
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
#[allow(dead_code)]
#[schema(as = CreateUserRequest)]
struct CreateUserRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified_core:write"])),
    path = "/users",
    tag = "IAM",
    request_body = serde_json::Value,
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "参数错误"),
        (status = 409, description = "用户名或邮箱已存在"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user create_user called with: {:?}", payload);

    let operator_id = &claims.sub;

    let username = payload
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let full_name = payload.get("full_name").and_then(|v| v.as_str());

    if username.is_empty() {
        tracing::warn!("Create user failed: username is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "用户名是必填字段",
            )),
        );
    }

    if email.is_empty() {
        tracing::warn!("Create user failed: email is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "邮箱是必填字段",
            )),
        );
    }

    if password.is_empty() {
        tracing::warn!("Create user failed: password is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "密码是必填字段",
            )),
        );
    }

    if password.len() < 6 {
        tracing::warn!("Create user failed: password too short");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "密码长度不能少于6位",
            )),
        );
    }

    if !is_valid_email(email) {
        tracing::warn!("Create user failed: invalid email format");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "邮箱格式不正确",
            )),
        );
    }

    let existing_user_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND username = $1",
    )
    .bind(username)
    .fetch_one(&state.pool)
    .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("Failed to check username: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    if existing_user_count > 0 {
        tracing::warn!("Create user failed: username already exists");
        return (
            StatusCode::CONFLICT,
            Json(topems_shared_core::response::error_value(
                409,
                "用户名已存在",
            )),
        );
    }

    let existing_email_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND email = $1",
    )
    .bind(email)
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
        tracing::warn!("Create user failed: email already exists");
        return (
            StatusCode::CONFLICT,
            Json(topems_shared_core::response::error_value(409, "邮箱已存在")),
        );
    }

    let user_id = Uuid::new_v4();
    let hashed_password = bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap_or_else(|_| {
        tracing::error!("Failed to hash password");
        "".to_string()
    });

    if hashed_password.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "密码加密失败",
            )),
        );
    }

    let result = sqlx::query(
        r#"
        INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, created_at)
        VALUES ($1, $2, $3, $4, $5, 'active', false, NOW())
        "#
    )
    .bind(user_id)
    .bind(username)
    .bind(email)
    .bind(hashed_password)
    .bind(full_name)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            tracing::info!("User created successfully: {}", username);

            let response_body = serde_json::json!({
                "success": true,
                "message": "创建用户成功",
                "data": {
                    "id": user_id.to_string(),
                    "username": username,
                    "email": email,
                    "full_name": full_name,
                },
                "code": 201
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "user",
                &user_id.to_string(),
                Some(payload),
                Some(response_body.clone()),
                201,
            )
            .await;

            (StatusCode::CREATED, Json(response_body))
        }
        Err(e) => {
            if let Some(db_error) = e.as_database_error() {
                if db_error.code().unwrap_or_default() == "23505" {
                    tracing::warn!("Create user failed: unique constraint violation");
                    let response_body = topems_shared_core::response::error_value(409, "数据重复");
                    record_audit_log(
                        &state.pool,
                        operator_id,
                        "create",
                        "user",
                        "-",
                        Some(payload),
                        Some(response_body.clone()),
                        409,
                    )
                    .await;
                    return (StatusCode::CONFLICT, Json(response_body));
                }
            }
            tracing::error!("Failed to create user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("创建用户失败: {}", e));
            record_audit_log(
                &state.pool,
                operator_id,
                "create",
                "user",
                "-",
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

pub async fn get_user(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user get_user called with id: {}", id);

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
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

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::error!("Database query failed: {}", e);
        None
    });

    match user {
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
                roles,
                permissions,
                is_active: u.status == "active",
                is_superuser: u.is_superuser,
                created_at: u.created_at.map(|t| t.to_string()),
            };

            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "message": "获取用户成功",
                    "data": user_response,
                    "code": 200
                })),
            )
        }
        None => {
            tracing::warn!("User not found: {}", id);
            (
                StatusCode::NOT_FOUND,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            )
        }
    }
}

pub async fn update_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user update_user called with id: {} and payload: {:?}",
        id,
        payload
    );

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
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

    let existing_user_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND id = $1::UUID",
    )
    .bind(&id)
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

    if let Some(username) = payload.get("username").and_then(|v| v.as_str()) {
        let existing_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND username = $1 AND id != $2",
        )
        .bind(username)
        .bind(user_id)
        .fetch_one(&state.pool)
        .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check username: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(500, &format!("查询用户失败: {}", e))),
                );
            }
        };

        if existing_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(topems_shared_core::response::error_value(
                    409,
                    "用户名已存在",
                )),
            );
        }
    }

    if let Some(email) = payload.get("email").and_then(|v| v.as_str()) {
        let existing_email_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND email = $1 AND id != $2",
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
        UPDATE core_users
        SET 
            username = COALESCE($1, username),
            email = COALESCE($2, email),
            full_name = COALESCE($3, full_name),
            updated_at = NOW()
        WHERE id = $4
        "#,
    )
    .bind(payload.get("username").and_then(|v| v.as_str()))
    .bind(payload.get("email").and_then(|v| v.as_str()))
    .bind(payload.get("full_name").and_then(|v| v.as_str()))
    .bind(user_id)
    .execute(&state.pool)
    .await;

    match update_result {
        Ok(_) => {
            tracing::info!("User updated successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "更新用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &id,
                Some(payload),
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to update user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("更新用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "update",
                "user",
                &id,
                Some(payload),
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

pub async fn delete_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user delete_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
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

    if claims.sub == id {
        tracing::warn!("Delete user failed: cannot delete yourself");
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "不能删除自己",
            )),
        );
    }

    let existing_user_count: i64 = match sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_users WHERE deleted_at IS NULL AND id = $1::UUID",
    )
    .bind(&id)
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

    let delete_result = sqlx::query("UPDATE core_users SET deleted_at = NOW() WHERE id = $1")
        .bind(user_id)
        .execute(&state.pool)
        .await;

    match delete_result {
        Ok(_) => {
            tracing::info!("User deleted successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "删除用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "delete",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to delete user: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("删除用户失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "delete",
                "user",
                &id,
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
