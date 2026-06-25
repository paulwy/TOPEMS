//! User submodule - User management handlers

use axum::{extract::{Path, State}, Json};
use crate::AppState;
use topems_shared::Claims;
use axum::Extension;
use serde::Serialize;

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
) -> Json<serde_json::Value> {
    tracing::info!("IAM user list_users called");

    let result = sqlx::query_as::<_, UserRow>(
        "SELECT id, username, email, full_name, status, is_superuser, created_at FROM core_users ORDER BY created_at DESC"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(users) => {
            let user_responses: Vec<UserResponse> = users.into_iter().map(|u| {
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
                    role: if u.is_superuser { "admin".to_string() } else { "user".to_string() },
                    roles,
                    permissions,
                    is_active: u.status == "active",
                    is_superuser: u.is_superuser,
                    created_at: u.created_at.map(|t| t.to_string()),
                }
            }).collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取用户列表成功",
                "data": {
                    "users": user_responses,
                    "total": user_responses.len()
                }
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
    State(_state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user create_user called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_user success",
        "data": null
    }))
}

pub async fn get_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_user success",
        "data": null
    }))
}

pub async fn update_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user update_user called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "update_user success",
        "data": null
    }))
}

pub async fn delete_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user delete_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_user success",
        "data": null
    }))
}

pub async fn disable_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user disable_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "disable_user success",
        "data": null
    }))
}

pub async fn enable_user(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user enable_user called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "enable_user success",
        "data": null
    }))
}

pub async fn change_password(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user change_password called with id: {} and payload: {:?}", id, payload);
    Json(serde_json::json!({
        "success": true,
        "message": "change_password success",
        "data": null
    }))
}

pub async fn get_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user get_preferences called for user: {}", claims.sub);
    
    // 默认值
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
    
    // 查询用户的通知设置
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
    
    // 查询用户的快捷方式
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
    
    // 查询用户的语言设置
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
    
    // 查询用户的时区设置
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
        }
    }))
}

pub async fn update_preferences(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM user update_preferences called for user: {} with payload: {:?}", claims.sub, payload);
    
    // 保存快捷方式
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
    
    // 保存通知设置
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
    
    // 保存语言设置
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
    
    // 保存时区设置
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
    
    tracing::info!("User preferences updated successfully for user: {}", claims.sub);
    Json(serde_json::json!({
        "success": true,
        "message": "保存用户偏好设置成功",
        "data": payload
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
                role: if u.is_superuser { "admin".to_string() } else { "user".to_string() },
                roles,
                permissions,
                is_active: u.status == "active",
                is_superuser: u.is_superuser,
                created_at: u.created_at.map(|t| t.to_string()),
            };

            Json(serde_json::json!({
                "success": true,
                "message": "get_user success",
                "data": user_response
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

#[derive(Debug, Clone, sqlx::FromRow)]
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