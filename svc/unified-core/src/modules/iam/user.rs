//! User submodule - User management handlers

use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use topems_shared::Claims;
use uuid::Uuid;

lazy_static! {
    static ref EMAIL_REGEX: Regex =
        Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
}

#[derive(Debug, Deserialize)]
pub struct ListUsersParams {
    page: Option<i64>,
    page_size: Option<i64>,
}

async fn record_audit_log(
    pool: &sqlx::PgPool,
    user_id: &str,
    action: &str,
    resource_type: &str,
    resource_id: &str,
    request_body: Option<serde_json::Value>,
    response_body: Option<serde_json::Value>,
    status: i16,
) {
    let result = sqlx::query(
        r#"
        INSERT INTO public.audit_logs (id, tenant_id, user_id, action, resource_type, resource_id, request_body, response_body, status, created_at)
        VALUES (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', $1, $2, $3, $4, $5, $6, $7, NOW())
        "#,
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .bind(request_body)
    .bind(response_body)
    .bind(status)
    .execute(pool)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record audit log: {}", e);
    }
}

fn is_valid_email(email: &str) -> bool {
    EMAIL_REGEX.is_match(email)
}

#[derive(Debug, Clone, Serialize)]
struct UserResponse {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    role: String,
    roles: Vec<String>,
    permissions: Vec<String>,
    is_active: bool,
    is_superuser: bool,
    created_at: Option<String>,
}

pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<ListUsersParams>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user list_users called");

    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let total_result = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM core_users")
        .fetch_one(&state.pool)
        .await;

    let total = match total_result {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to count users: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("获取用户总数失败: {}", e),
                "data": null,
                "code": 500
            }));
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
                        topems_shared::auth::get_permissions()
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
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取用户列表失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

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
            Json(serde_json::json!({
                "success": false,
                "message": "用户名是必填字段",
                "data": null,
                "code": 400
            })),
        );
    }

    if email.is_empty() {
        tracing::warn!("Create user failed: email is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "邮箱是必填字段",
                "data": null,
                "code": 400
            })),
        );
    }

    if password.is_empty() {
        tracing::warn!("Create user failed: password is required");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "密码是必填字段",
                "data": null,
                "code": 400
            })),
        );
    }

    if password.len() < 6 {
        tracing::warn!("Create user failed: password too short");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "密码长度不能少于6位",
                "data": null,
                "code": 400
            })),
        );
    }

    if !is_valid_email(email) {
        tracing::warn!("Create user failed: invalid email format");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "邮箱格式不正确",
                "data": null,
                "code": 400
            })),
        );
    }

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE username = $1")
            .bind(username)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check username: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count > 0 {
        tracing::warn!("Create user failed: username already exists");
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "success": false,
                "message": "用户名已存在",
                "data": null,
                "code": 409
            })),
        );
    }

    let existing_email_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE email = $1")
            .bind(email)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Failed to check email: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询邮箱失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_email_count > 0 {
        tracing::warn!("Create user failed: email already exists");
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({
                "success": false,
                "message": "邮箱已存在",
                "data": null,
                "code": 409
            })),
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
            Json(serde_json::json!({
                "success": false,
                "message": "密码加密失败",
                "data": null,
                "code": 500
            })),
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
                    let response_body = serde_json::json!({
                        "success": false,
                        "message": "数据重复",
                        "data": null,
                        "code": 409
                    });
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
            let response_body = serde_json::json!({
                "success": false,
                "message": format!("创建用户失败: {}", e),
                "data": null,
                "code": 500
            });
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
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users WHERE id = $1",
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
                topems_shared::auth::get_permissions()
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
                Json(serde_json::json!({
                    "success": false,
                    "message": "用户不存在",
                    "data": null,
                    "code": 404
                })),
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
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            })),
        );
    }

    if let Some(username) = payload.get("username").and_then(|v| v.as_str()) {
        let existing_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_users WHERE username = $1 AND id != $2",
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
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

        if existing_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(serde_json::json!({
                    "success": false,
                    "message": "用户名已存在",
                    "data": null,
                    "code": 409
                })),
            );
        }
    }

    if let Some(email) = payload.get("email").and_then(|v| v.as_str()) {
        let existing_email_count: i64 = match sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_users WHERE email = $1 AND id != $2",
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
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询邮箱失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

        if existing_email_count > 0 {
            return (
                StatusCode::CONFLICT,
                Json(serde_json::json!({
                    "success": false,
                    "message": "邮箱已存在",
                    "data": null,
                    "code": 409
                })),
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
            let response_body = serde_json::json!({
                "success": false,
                "message": format!("更新用户失败: {}", e),
                "data": null,
                "code": 500
            });

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
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    if claims.sub == id {
        tracing::warn!("Delete user failed: cannot delete yourself");
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "不能删除自己",
                "data": null,
                "code": 400
            })),
        );
    }

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            })),
        );
    }

    let delete_result = sqlx::query("DELETE FROM core_users WHERE id = $1")
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
            let response_body = serde_json::json!({
                "success": false,
                "message": format!("删除用户失败: {}", e),
                "data": null,
                "code": 500
            });

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

pub async fn disable_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user disable_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            })),
        );
    }

    let result =
        sqlx::query("UPDATE core_users SET status = 'inactive', updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("User disabled successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "禁用用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "disable",
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
            tracing::error!("Failed to disable user: {}", e);
            let response_body = serde_json::json!({
                "success": false,
                "message": format!("禁用用户失败: {}", e),
                "data": null,
                "code": 500
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "disable",
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

pub async fn enable_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user enable_user called with id: {}", id);

    let operator_id = &claims.sub;

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            })),
        );
    }

    let result =
        sqlx::query("UPDATE core_users SET status = 'active', updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("User enabled successfully: {}", id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "启用用户成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "enable",
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
            tracing::error!("Failed to enable user: {}", e);
            let response_body = serde_json::json!({
                "success": false,
                "message": format!("启用用户失败: {}", e),
                "data": null,
                "code": 500
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "enable",
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

pub async fn change_password(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user change_password called with id: {} and payload: {:?}",
        id,
        payload
    );

    let user_id = match Uuid::parse_str(&id) {
        Ok(uid) => uid,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "message": "无效的用户ID",
                    "data": null,
                    "code": 400
                })),
            );
        }
    };

    let existing_user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM core_users WHERE id = $1::UUID")
            .bind(&id)
            .fetch_one(&state.pool)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                tracing::error!("Database query failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "success": false,
                        "message": format!("查询用户失败: {}", e),
                        "data": null,
                        "code": 500
                    })),
                );
            }
        };

    if existing_user_count == 0 {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            })),
        );
    }

    let new_password = payload
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if new_password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "新密码不能为空",
                "data": null,
                "code": 400
            })),
        );
    }

    let hashed_password = bcrypt::hash(new_password, bcrypt::DEFAULT_COST).unwrap_or_else(|_| {
        tracing::error!("Failed to hash password");
        "".to_string()
    });

    if hashed_password.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "success": false,
                "message": "密码加密失败",
                "data": null,
                "code": 500
            })),
        );
    }

    let result =
        sqlx::query("UPDATE core_users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
            .bind(hashed_password)
            .bind(user_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(_) => {
            tracing::info!("Password changed successfully for user: {}", id);
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "message": "修改密码成功",
                    "data": null,
                    "code": 200
                })),
            )
        }
        Err(e) => {
            tracing::error!("Failed to change password: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": format!("修改密码失败: {}", e),
                    "data": null,
                    "code": 500
                })),
            )
        }
    }
}

pub async fn get_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_preferences called for user: {}", claims.sub);

    let mut notification_settings = serde_json::json!({
        "email_notifications": true,
        "push_notifications": true,
        "sms_notifications": false,
        "daily_digest": true
    });
    let mut shortcuts = serde_json::json!([
        {"id": "1", "title": "仪表盘", "icon": "Activity", "path": "/dashboard"},
        {"id": "2", "title": "文档中心", "icon": "FileText", "path": "/documents"}
    ]);
    let mut language = "zh-CN".to_string();
    let mut timezone = "Asia/Shanghai".to_string();

    let notification_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'notification_settings'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query notification_settings: {}", e);
        None
    });

    if let Some(row) = notification_row {
        if let Ok(value) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
            notification_settings = value;
        }
    }

    let shortcuts_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'shortcuts'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query shortcuts: {}", e);
        None
    });

    if let Some(row) = shortcuts_row {
        if let Ok(value) = serde_json::from_value::<serde_json::Value>(row.preference_value) {
            shortcuts = value;
        }
    }

    let language_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'language'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query language: {}", e);
        None
    });

    if let Some(row) = language_row {
        if let Ok(value) = serde_json::from_value::<String>(row.preference_value) {
            language = value;
        }
    }

    let timezone_row: Option<PreferenceRow> = sqlx::query_as(
        "SELECT preference_value FROM portal.user_preferences WHERE user_id = $1 AND preference_key = 'timezone'"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_else(|e| {
        tracing::warn!("Failed to query timezone: {}", e);
        None
    });

    if let Some(row) = timezone_row {
        if let Ok(value) = serde_json::from_value::<String>(row.preference_value) {
            timezone = value;
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": "获取用户偏好设置成功",
        "data": {
            "notification_settings": notification_settings,
            "shortcuts": shortcuts,
            "language": language,
            "timezone": timezone
        },
        "code": 200
    }))
}

pub async fn update_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user update_preferences called for user: {} with payload: {:?}",
        claims.sub,
        payload
    );

    if let Some(shortcuts) = payload.get("shortcuts") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'shortcuts', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(shortcuts)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save shortcuts: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存快捷方式失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(notification_settings) = payload.get("notification_settings") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'notification_settings', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(notification_settings)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save notification_settings: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存通知设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(language) = payload.get("language") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'language', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(language)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save language: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存语言设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    if let Some(timezone) = payload.get("timezone") {
        let result = sqlx::query(
            r#"
            INSERT INTO portal.user_preferences (user_id, preference_key, preference_value, updated_at)
            VALUES ($1, 'timezone', $2, NOW())
            ON CONFLICT (user_id, preference_key)
            DO UPDATE SET preference_value = $2, updated_at = NOW()
            "#
        )
        .bind(&claims.sub)
        .bind(timezone)
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to save timezone: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("保存时区设置失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    }

    tracing::info!(
        "User preferences updated successfully for user: {}",
        claims.sub
    );
    Json(serde_json::json!({
        "success": true,
        "message": "保存用户偏好设置成功",
        "data": payload,
        "code": 200
    }))
}

pub async fn get_current_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_current_user called for user: {}", claims.sub);

    let user_id = match sqlx::types::Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID format: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user: Option<UserRow> = sqlx::query_as(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users WHERE id = $1",
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
                topems_shared::auth::get_permissions()
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

            Json(serde_json::json!({
                "success": true,
                "message": "获取当前用户成功",
                "data": user_response,
                "code": 200
            }))
        }
        None => {
            tracing::warn!("User not found: {}", claims.sub);
            Json(serde_json::json!({
                "success": false,
                "message": "用户不存在",
                "data": null,
                "code": 404
            }))
        }
    }
}

#[derive(sqlx::FromRow)]
struct UserRow {
    id: uuid::Uuid,
    username: String,
    email: String,
    full_name: Option<String>,
    status: String,
    is_superuser: bool,
    created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct PreferenceRow {
    preference_value: serde_json::Value,
}
